import { computed, onScopeDispose, reactive, ref } from 'vue';
import { hasAuthority } from '../../auth';
import { classifyWriteFailure, isApiError } from '../../../shared/api/errors';
import { useLocale } from '../../../shared/i18n/locale';
import {
  createDimension, createUomCategory, createUom, getUomCatalog, searchUomCatalog,
  updateUomCatalog, setUomCatalogEnabled, getCurrentUomRule, searchRules, publishUomRule,
  type UomRow, type UnitCatalogKind, type UomRule, type CreateDimensionRequest,
} from '../api/uom-api';

/** 计量单位页的目录、引用和换算规则流程；状态仅属于当前页面实例。 */
export function useUomManagement() {
  const { t } = useLocale();

  const active = ref<UnitCatalogKind>('dimensions');
  const tabs: { kind: UnitCatalogKind; key: 'mdm.uom.dimensions' | 'mdm.uom.categories' | 'mdm.uom.units' }[] = [
    { kind: 'dimensions', key: 'mdm.uom.dimensions' },
    { kind: 'uom-categories', key: 'mdm.uom.categories' },
    { kind: 'uoms', key: 'mdm.uom.units' },
  ];
  const exponentFields = [
    ['timeExponent', 'mdm.uom.expT'], ['lengthExponent', 'mdm.uom.expL'],
    ['massExponent', 'mdm.uom.expM'], ['electricCurrentExponent', 'mdm.uom.expI'],
    ['temperatureExponent', 'mdm.uom.expTheta'], ['amountExponent', 'mdm.uom.expN'],
    ['luminousIntensityExponent', 'mdm.uom.expJ'],
  ] as const;
  const rows = ref<UomRow[]>([]);
  const pageNo = ref(1), pageSize = ref(20), total = ref(0), loading = ref(false);
  const saving = ref(false), detailLoading = ref(false), blocked = ref(false), unknownWrite = ref(false);
  const action = ref<'create' | 'edit' | 'detail' | 'status'>();
  const target = ref<UomRow>();
  const listError = ref(''), dialogError = ref(''), notice = ref(''), formError = ref('');
  const search = ref('');
  const dimensions = ref<UomRow[]>([]), categories = ref<UomRow[]>([]);
  const resolvedNames = reactive<Record<string, UomRow>>({});
  function referenceName(kind: UnitCatalogKind, id: string): string {
    const row = resolvedNames[`${kind}:${id}`]
      ?? (kind === 'dimensions' ? dimensions.value : kind === 'uom-categories' ? categories.value : []).find(item => item.id === id);
    return row ? `${row.name} (${row.code})` : id;
  }
  const dimensionPage = ref(1), categoryPage = ref(1);
  const dimensionTotal = ref(0), categoryTotal = ref(0);
  const referencePending = reactive<Record<string, boolean>>({});
  const referenceFailures = reactive<Record<string, boolean>>({});
  const referenceVersions: Record<string, number> = {};
  const referencesError = computed(() => Object.values(referenceFailures).some(Boolean));
  const referencesLoading = computed(() => Object.values(referencePending).some(Boolean));
  let ruleSequence = 0;
  const form = reactive<Record<string, string>>({});
  const ruleOpen = ref(false), ruleTarget = ref<UomRow>();
  const ruleCurrent = ref<UomRule>(), ruleRows = ref<UomRule[]>([]);
  const rulePage = ref(1), ruleTotal = ref(0), ruleLoading = ref(false), ruleSaving = ref(false);
  const ruleError = ref(''), ruleBlocked = ref(false), ruleUnknown = ref(false);
  const ruleForm = reactive({ multiplier: '1', offset: '0', calculationPrecision: '18', roundingMode: 'HALF_UP' });
  let listController: AbortController | undefined, detailController: AbortController | undefined;
  let listSequence = 0, detailSequence = 0, disposed = false;

  const decimal = /^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?$/;
  /** 十进制校验不经过 Number，避免把很大/很小但合法的 BigDecimal 拒绝或舍入。 */
  const decimalsValid = (a: string, b: string): boolean => {
    const multiplier = a.trim();
    const mantissa = multiplier.split(/[Ee]/)[0] ?? '';
    return decimal.test(multiplier) && !multiplier.startsWith('-') && /[1-9]/.test(mantissa)
      && decimal.test(b.trim());
  };
  const precisionValid = (raw: string): boolean =>
    /^\d+$/.test(raw.trim()) && Number(raw) >= 1 && Number(raw) <= 34;
  function errorText(err: unknown, writing = false): string {
    if (!isApiError(err)) return t(writing ? 'mdm.struct.unknownWrite' : 'mdm.struct.loadFailed');
    if (writing && classifyWriteFailure(err) === 'unknown')
      return t('mdm.struct.unknownWrite');
    if (err.kind === 'conflict') return t('mdm.struct.conflict');
    if (err.kind === 'validation') return t('mdm.struct.validation');
    if (err.kind === 'forbidden') return t('mdm.struct.forbidden');
    return t('mdm.struct.loadFailed');
  }
  async function loadList(next = pageNo.value, size = pageSize.value): Promise<void> {
    const seq = ++listSequence;
    listController?.abort();
    listController = new AbortController();
    loading.value = true;
    listError.value = '';
    rows.value = [];
    pageNo.value = next; pageSize.value = size;
    try {
      const page = await searchUomCatalog(active.value, next, size, {}, listController.signal);
      if (disposed || seq !== listSequence) return;
      if (next > 1 && page.records.length === 0) { await loadList(next - 1, size); return; }
      rows.value = page.records;
      total.value = page.total; pageNo.value = page.pageNo;
    } catch (error) {
      if (!disposed && seq === listSequence) listError.value = errorText(error);
    } finally {
      if (seq === listSequence) loading.value = false;
    }
  }
  async function loadReferences(kind: 'dimensions' | 'uom-categories', pageNo = 1): Promise<void> {
    const current = referenceVersions[kind] = (referenceVersions[kind] ?? 0) + 1;
    referencePending[kind] = true;
    try {
      const result = await searchUomCatalog(kind, pageNo, 50, { status: 'ENABLED' });
      if (disposed || current !== referenceVersions[kind]) return;
      const refList = kind === 'dimensions' ? dimensions : categories;
      refList.value = pageNo === 1 ? result.records : [...refList.value, ...result.records];
      if (kind === 'dimensions') { dimensionPage.value = pageNo; dimensionTotal.value = result.total; }
      else { categoryPage.value = pageNo; categoryTotal.value = result.total; }
      referenceFailures[kind] = false;
    } catch { if (current === referenceVersions[kind]) referenceFailures[kind] = true; }
    finally { if (current === referenceVersions[kind]) referencePending[kind] = false; }
  }
  function changeTab(kind: UnitCatalogKind): void {
    if (saving.value || ruleSaving.value || unknownWrite.value || ruleUnknown.value || action.value || ruleOpen.value) return;
    active.value = kind; search.value = ''; notice.value = ''; pageNo.value = 1;
    void loadList(1);
  }
  function resetForm(): void {
    for (const key of Object.keys(form)) delete form[key];
    Object.assign(form, { code: '', name: '', status: 'ENABLED',
      dimensionId: '', categoryId: '', symbol: '',
      referenceCode: '', referenceName: '', referenceSymbol: '',
      referenceUcumNotApplicableReason: '', ucumNotApplicableReason: '',
      multiplier: '1', offset: '0', calculationPrecision: '18', roundingMode: 'HALF_UP' });
    for (const [key] of exponentFields) form[key] = '0';
  }
  async function open(next: 'create' | 'edit' | 'detail' | 'status', row?: UomRow): Promise<void> {
    if (saving.value || unknownWrite.value || (next !== 'detail' && !hasAuthority('mdm:uom:write'))) return;
    ++detailSequence;
    detailController?.abort();
    action.value = next; target.value = row;
    blocked.value = false; dialogError.value = ''; formError.value = ''; notice.value = '';
    resetForm();
    if (row) {
      const seq = ++detailSequence;
      detailController = new AbortController();
      detailLoading.value = true;
      blocked.value = true;
      try {
        const detail = await getUomCatalog(active.value, row.id, detailController.signal);
        if (disposed || seq !== detailSequence) return;
        target.value = detail;
        form.name = detail.name;
        form.code = detail.code;
        blocked.value = false;
        // 仅补齐当前详情引用，不扫描引用目录；辅助读取失败保留真实 ID，不阻断状态操作。
        const references: [UnitCatalogKind, string | undefined][] = [
          ['dimensions', detail.dimensionId], ['uom-categories', detail.categoryId], ['uoms', detail.referenceUomId],
        ];
        await Promise.allSettled(references.map(async ([kind, id]) => {
          if (!id) return;
          const row = await getUomCatalog(kind, id, detailController?.signal);
          if (!disposed && seq === detailSequence) resolvedNames[`${kind}:${id}`] = row;
        }));
      } catch (error) {
        if (!disposed && seq === detailSequence) dialogError.value = errorText(error);
      } finally {
        if (seq === detailSequence) detailLoading.value = false;
      }
    }
  }
  function close(): void {
    if (saving.value || unknownWrite.value) return;
    ++detailSequence; detailController?.abort();
    action.value = undefined; target.value = undefined;
  }
  function validate(): boolean {
    if (action.value === 'status') return true;
    if (!form.name?.trim() || form.name.length > 200) { formError.value = t('mdm.struct.validation'); return false; }
    if (action.value !== 'create') return true;
    if (!form.code?.trim() || form.code.length > 64) { formError.value = t('mdm.struct.validation'); return false; }
    if (active.value === 'dimensions') {
      if (exponentFields.some(([key]) => !/^-?\d+$/.test(form[key] ?? ''))) {
        formError.value = t('mdm.uom.invalidExponent'); return false;
      }
    }
    if (active.value === 'uom-categories' && (
      !form.dimensionId || !form.referenceCode?.trim() || !form.referenceName?.trim() ||
      !form.referenceSymbol?.trim() || form.referenceCode.length > 64 ||
      form.referenceName.length > 200 || form.referenceSymbol.length > 32
    )) { formError.value = t('mdm.struct.validation'); return false; }
    if (active.value === 'uoms') {
      if (!form.categoryId || !form.symbol?.trim() || form.symbol.length > 32 || !decimalsValid(form.multiplier ?? '', form.offset ?? '')) {
        formError.value = t('mdm.uom.invalidDecimal'); return false;
      }
      if (!precisionValid(form.calculationPrecision ?? '')) {
        formError.value = t('mdm.uom.invalidPrecision'); return false;
      }
    }
    return true;
  }
  async function submit(): Promise<void> {
    if (!action.value || action.value === 'detail' || saving.value || blocked.value ||
        !hasAuthority('mdm:uom:write') || referencesError.value) return;
    formError.value = ''; if (!validate()) return;
    saving.value = true; dialogError.value = '';
    const next = action.value;
    try {
      if (next === 'create') {
        if (active.value === 'dimensions') {
          const exps = Object.fromEntries(exponentFields.map(([key]) => [key, Number(form[key])])) as
            Pick<CreateDimensionRequest, (typeof exponentFields)[number][0]>;
          await createDimension({ code: form.code!, name: form.name!, status: form.status === 'DISABLED' ? 'DISABLED' : 'ENABLED', ...exps });
        } else if (active.value === 'uom-categories') {
          await createUomCategory({
            code: form.code!, name: form.name!, dimensionId: form.dimensionId!,
            status: form.status === 'DISABLED' ? 'DISABLED' : 'ENABLED',
            referenceCode: form.referenceCode!, referenceName: form.referenceName!,
            referenceSymbol: form.referenceSymbol!, referenceUcumNotApplicableReason: form.referenceUcumNotApplicableReason || null,
          });
        } else {
          await createUom({
            code: form.code!, name: form.name!, symbol: form.symbol!, categoryId: form.categoryId!,
            status: form.status === 'DISABLED' ? 'DISABLED' : 'ENABLED',
            ucumNotApplicableReason: form.ucumNotApplicableReason || null,
            multiplier: form.multiplier!, offset: form.offset!,
            calculationPrecision: Number(form.calculationPrecision), roundingMode: form.roundingMode!,
          });
        }
      } else if (target.value) {
        if (next === 'edit') await updateUomCatalog(active.value, target.value.id, form.name!, target.value.version);
        if (next === 'status') await setUomCatalogEnabled(active.value, target.value.id, target.value.status !== 'ENABLED', target.value.version);
      }
      if (disposed) return;
      action.value = undefined; target.value = undefined;
      notice.value = t('mdm.struct.saved');
      await loadList(next === 'create' ? 1 : pageNo.value);
      await Promise.all([loadReferences('dimensions'), loadReferences('uom-categories')]);
    } catch (error) {
      if (disposed) return;
      dialogError.value = errorText(error, true);
      const classification = classifyWriteFailure(error);
      unknownWrite.value = classification === 'unknown';
      blocked.value = classification !== 'failed' || isApiError(error) && error.kind === 'not_found';
    } finally { saving.value = false; }
  }
  async function loadRule(row: UomRow, nextPage = 1): Promise<void> {
    if (row.referenceUnit || ruleSaving.value || ruleUnknown.value) return;
    const request = ++ruleSequence;
    ruleCurrent.value = undefined; ruleRows.value = [];
    ruleOpen.value = true; ruleTarget.value = row; ruleLoading.value = true;
    ruleBlocked.value = false; ruleError.value = '';
    try {
      const [current, history] = await Promise.all([
        getCurrentUomRule(row.id), searchRules(row.id, nextPage, 20),
      ]);
      if (disposed || request !== ruleSequence || !ruleOpen.value) return;
      ruleCurrent.value = current;
      ruleRows.value = history.records;
      rulePage.value = history.pageNo; ruleTotal.value = history.total;
      Object.assign(ruleForm, {
        multiplier: '', offset: '', // 强制手动输入精确 decimal，避免浏览器解析 JSON Number 时丢失 BigDecimal 精度
        calculationPrecision: String(current.calculationPrecision), roundingMode: current.roundingMode,
      });
    } catch (error) { if (!disposed && request === ruleSequence && ruleOpen.value) ruleError.value = errorText(error); }
    finally { if (request === ruleSequence) ruleLoading.value = false; }
  }
  async function publish(): Promise<void> {
    if (!ruleTarget.value || !ruleCurrent.value || ruleSaving.value || ruleBlocked.value ||
        !hasAuthority('mdm:uom:write')) return;
    if (!decimalsValid(ruleForm.multiplier, ruleForm.offset)) {
      ruleError.value = t('mdm.uom.invalidDecimal'); return;
    }
    if (!precisionValid(ruleForm.calculationPrecision)) {
      ruleError.value = t('mdm.uom.invalidPrecision'); return;
    }
    ruleSaving.value = true; ruleError.value = '';
    try {
      await publishUomRule(ruleTarget.value.id, {
        expectedCurrentVersion: ruleCurrent.value.versionNo,
        multiplier: ruleForm.multiplier, offset: ruleForm.offset,
        calculationPrecision: Number(ruleForm.calculationPrecision), roundingMode: ruleForm.roundingMode,
      });
      if (disposed) return;
      ruleOpen.value = false; notice.value = t('mdm.struct.saved');
    } catch (error) {
      if (disposed) return;
      ruleError.value = errorText(error, true);
      ruleUnknown.value = classifyWriteFailure(error) === 'unknown';
      ruleBlocked.value = true; // 当前规则版本不能证明原发布请求的提交结果。
    } finally { ruleSaving.value = false; }
  }
  function closeRule(): void {
    if (ruleSaving.value || ruleUnknown.value) return;
    ruleOpen.value = false;
    ++ruleSequence;
  }
  onScopeDispose(() => { disposed = true; listController?.abort(); detailController?.abort(); });
  return {
    active, tabs, exponentFields, rows, pageNo, pageSize, total, loading, saving, detailLoading,
    blocked, unknownWrite, action, target, listError, dialogError, notice, formError, search, dimensions, categories,
    referenceName, dimensionPage, categoryPage, dimensionTotal, categoryTotal, referencesError,
    referencesLoading, form, ruleOpen, ruleTarget, ruleCurrent, ruleRows, rulePage, ruleTotal,
    ruleLoading, ruleSaving, ruleError, ruleBlocked, ruleUnknown, ruleForm, decimal, decimalsValid, precisionValid, loadList,
    loadReferences, changeTab, open, close, submit, loadRule, publish, closeRule,
  };
}
