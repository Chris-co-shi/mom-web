<script setup lang="ts">
import { computed, onMounted, onScopeDispose, reactive, ref } from 'vue';
import { submitWithFocus } from '../../../shared/ui/focus';
import { onBeforeRouteLeave } from 'vue-router';
import { Plus, RefreshCw } from '@lucide/vue';
import { AuthorityGuard, hasAuthority } from '../../auth';
import { isApiError } from '../../../shared/api/errors';
import { MomButton, MomInput, MomSelect } from '../../../shared/ui';
import MomManagementHeader from '../../../shared/components/MomManagementHeader.vue';
import MomListSurface from '../../../shared/components/MomListSurface.vue';
import MomDataTable, { type MomColumn } from '../../../shared/components/MomDataTable.vue';
import MomCrudSearch from '../../../shared/components/MomCrudSearch.vue';
import MomCrudPagination from '../../../shared/components/MomCrudPagination.vue';
import MdmSectionTabs from '../components/MdmSectionTabs.vue';
import { decimalRuleExpression } from '../model/mdm-display';
import MomCrudRowMenu from '../../../shared/components/MomCrudRowMenu.vue';
import MomModal from '../../../shared/components/MomModal.vue';
import PageContainer from '../../../shared/components/PageContainer.vue';
import { useLocale } from '../../../shared/i18n/locale';
import {
  createDimension, createUomCategory, createUom, getUomCatalog, searchUomCatalog,
  updateUomCatalog, setUomCatalogEnabled, getCurrentUomRule, searchRules, publishUomRule,
  type UomRow, type UnitCatalogKind, type UomRule, type CreateDimensionRequest,
} from '../api/uom-api';
import './mdm-pages.css';

const { t, tForOwner } = useLocale();
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
const saving = ref(false), detailLoading = ref(false), blocked = ref(false);
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
const ruleError = ref(''), ruleBlocked = ref(false);
const ruleForm = reactive({ multiplier: '1', offset: '0', calculationPrecision: '18', roundingMode: 'HALF_UP' });
let listController: AbortController | undefined, detailController: AbortController | undefined;
let listSequence = 0, detailSequence = 0, disposed = false;

const visibleRows = computed(() => {
  const q = search.value.trim().toLowerCase();
  return q ? rows.value.filter(r => `${r.code} ${r.name} ${r.symbol ?? ''}`.toLowerCase().includes(q)) : rows.value;
});
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));
const currentLabel = computed(() => t(tabs.find(x => x.kind === active.value)!.key));
const columns = computed<MomColumn[]>(() => [
  { key: 'code', title: t('mdm.struct.code'), minWidth: 160 },
  { key: 'name', title: t('mdm.struct.name'), minWidth: 180 },
  ...(active.value === 'uoms' ? [
    { key: 'symbol', title: t('mdm.uom.symbol'), minWidth: 100 },
    { key: 'referenceUnit', title: t('mdm.uom.reference'), width: 115 },
  ] : []),
  ...(active.value === 'uom-categories' ? [
    { key: 'referenceUomId', title: t('mdm.uom.reference'), minWidth: 155 },
  ] : []),
  { key: 'status', title: t('mdm.struct.status'), width: 110 },
  { key: 'actions', title: t('mdm.struct.actions'), width: 280, fixed: 'right', resizable: false },
]);
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
const options = (data: UomRow[], empty = false) => [
  ...(empty ? [{ value: '', label: t('mdm.struct.all') }] : []),
  ...data.map(item => ({ value: item.id, label: `${item.name} (${item.code})` })),
];
function codeFor(row: UomRow): string { return row.symbol ? `${row.code} · ${row.symbol}` : row.code; }
function errorText(err: unknown, writing = false): string {
  if (!isApiError(err)) return t(writing ? 'mdm.struct.unknownWrite' : 'mdm.struct.loadFailed');
  if (writing && (err.resultUnknown || ['network','timeout','server','protocol'].includes(err.kind)))
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
  if (saving.value || ruleSaving.value || action.value || ruleOpen.value) return;
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
  if (saving.value || (next !== 'detail' && !hasAuthority('mdm:uom:write'))) return;
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
  if (saving.value) return;
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
    blocked.value = isApiError(error) ? error.resultUnknown ||
      ['conflict','not_found','network','timeout','server','protocol'].includes(error.kind) : true;
  } finally { saving.value = false; }
}
async function loadRule(row: UomRow, nextPage = 1): Promise<void> {
  if (row.referenceUnit || ruleSaving.value) return;
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
    ruleBlocked.value = true; // 无法证明首次操作未提交，刷新当前规则后才能再次发布
  } finally { ruleSaving.value = false; }
}
onMounted(() => { void loadList(); void Promise.all([loadReferences('dimensions'), loadReferences('uom-categories')]); });
onBeforeRouteLeave(() => !saving.value && !ruleSaving.value);
onScopeDispose(() => { disposed = true; listController?.abort(); detailController?.abort(); });
</script>

<template>
  <PageContainer>
    <section class="mdm-plants" aria-labelledby="mdm-uom-title">
      <MomManagementHeader title-id="mdm-uom-title" :title="t('mdm.uom.title')" :description="t('mdm.uom.description')">
        <template #actions>
          <MomButton variant="outline" :disabled="loading || saving" @click="loadList()">
            <RefreshCw :size="16" aria-hidden="true" />{{ t('mdm.struct.refresh') }}
          </MomButton>
          <AuthorityGuard :authorities="['mdm:uom:write']">
            <MomButton :disabled="saving || referencesError" @click="open('create')">
              <Plus :size="16" aria-hidden="true" />{{ t('mdm.struct.create') }}
            </MomButton>
          </AuthorityGuard>
        </template>
      </MomManagementHeader>
<MdmSectionTabs :model-value="active" :items="tabs.map(tab => ({ value: tab.kind, label: t(tab.key) }))" :label="t('mdm.uom.title')" :disabled="loading || saving || !!action || ruleOpen" @update:model-value="changeTab($event as UnitCatalogKind)">
      <p v-if="notice" class="mdm-plants__notice" role="status">{{ notice }}</p>
      <div v-if="referencesError" class="mdm-plants__error" role="alert">
        <p>{{ t('mdm.struct.referenceLoadFailed') }}</p>
        <MomButton variant="outline" :disabled="referencesLoading" @click="loadReferences('dimensions'); loadReferences('uom-categories')">{{ t('mdm.struct.retry') }}</MomButton>
      </div>
      <div v-if="listError" class="mdm-plants__error" role="alert">
        <p>{{ listError }}</p>
        <MomButton variant="outline" @click="loadList()">{{ t('mdm.struct.retry') }}</MomButton>
      </div>
      <MomListSurface v-if="!listError" :title="currentLabel" :hint="t('mdm.struct.listHint')" :loading="loading" :loading-text="t('mdm.struct.loading')">
        <template #toolbar><MomCrudSearch v-model="search" :label="t('mdm.struct.search')" /></template>
        <MomDataTable :rows="visibleRows" :columns="columns" :empty-text="t('mdm.struct.empty')">
          <template #cell-code="{ row }"><span class="mdm-plants__code">{{ codeFor(row) }}</span></template>
          <template #cell-referenceUnit="{ row }">{{ row.referenceUnit ? t('mdm.uom.reference') : '—' }}</template>
          <template #cell-status="{ row }">
            <span class="mom-management-status" :class="row.status === 'ENABLED' ? 'mom-management-status--enabled' : 'mom-management-status--disabled'">
              <span class="mom-management-status__dot" aria-hidden="true"></span>
              {{ t(row.status === 'ENABLED' ? 'mdm.struct.enabled' : 'mdm.struct.disabled') }}
            </span>
          </template>
          <template #cell-actions="{ row }">
            <div class="mom-management-row-actions">
              <MomButton mode="text" :disabled="loading || saving" @click="open('detail', row)">{{ t('mdm.struct.detail') }}</MomButton>
              <AuthorityGuard :authorities="['mdm:uom:write']">
                <MomButton mode="text" :disabled="loading || saving" @click="open('edit', row)">{{ t('mdm.struct.edit') }}</MomButton>

              </AuthorityGuard>
<MomCrudRowMenu :label="t('mdm.struct.actions')" :disabled="loading || saving"
                :actions="[...(hasAuthority('mdm:uom:write') ? [{key:'status',label:t(row.status === 'ENABLED' ? 'mdm.struct.disable' : 'mdm.struct.enable')}] : []), ...(active === 'uoms' && !row.referenceUnit ? [{key:'rules',label:t('mdm.uom.rules')}] : [])]"
                @select="$event === 'rules' ? loadRule(row) : open('status', row)" />
            </div>
          </template>
        </MomDataTable>
        <template #footer>
          <MomCrudPagination :page-no="pageNo" :page-size="pageSize" :total="total"
            :summary="`${pageNo} / ${pageCount}`" :page-size-label="t('mdm.struct.pageSize')"
            :previous-label="t('mdm.struct.previous')" :next-label="t('mdm.struct.next')"
            :jump-label="t('mdm.struct.jump')" :go-label="t('mdm.struct.go')"
            :disabled="loading || saving" @page="loadList($event)" @size="loadList(1, $event)" />
        </template>
      </MomListSurface>
</MdmSectionTabs>
      <MomModal :open="!!action" :title="`${currentLabel} · ${t(action === 'create' ? 'mdm.struct.create' : action === 'edit' ? 'mdm.struct.edit' : action === 'status' ? 'mdm.struct.changeStatus' : 'mdm.struct.detail')}`" :close-label="tForOwner('system', 'system.common.close')"
        :busy="saving" :busy-text="t('mdm.struct.saving')" @close="close">
        <div class="mdm-plants__dialog">
          <p v-if="detailLoading" role="status">{{ t('mdm.struct.loading') }}</p>
          <div v-if="dialogError" class="mdm-plants__error" role="alert">{{ dialogError }}</div>
          <dl v-if="target && !detailLoading" class="mdm-plants__summary">
            <div><dt>{{ t('mdm.struct.code') }}</dt><dd>{{ target.code }}</dd></div>
            <div><dt>{{ t('mdm.struct.name') }}</dt><dd>{{ target.name }}</dd></div>
            <div><dt>{{ t('mdm.struct.status') }}</dt><dd>{{ t(target.status === 'ENABLED' ? 'mdm.struct.enabled' : 'mdm.struct.disabled') }}</dd></div>
            <div v-if="target.symbol"><dt>{{ t('mdm.uom.symbol') }}</dt><dd>{{ target.symbol }}</dd></div>
            <div v-if="target.dimensionId"><dt>{{ t('mdm.uom.dimensions') }}</dt><dd>{{ referenceName('dimensions', target.dimensionId) }}</dd></div>
            <div v-if="target.categoryId"><dt>{{ t('mdm.uom.categories') }}</dt><dd>{{ referenceName('uom-categories', target.categoryId) }}</dd></div>
            <div v-if="target.referenceUomId"><dt>{{ t('mdm.uom.reference') }}</dt><dd>{{ referenceName('uoms', target.referenceUomId) }}</dd></div>
            <div v-if="target.ucumNotApplicableReason"><dt>{{ t('mdm.uom.referenceReason') }}</dt><dd>{{ target.ucumNotApplicableReason }}</dd></div>
            <template v-if="active === 'dimensions'"><div v-for="[field, label] in exponentFields" :key="field"><dt>{{ t(label) }}</dt><dd>{{ target[field] }}</dd></div></template>
            <div><dt>{{ t('mdm.struct.version') }}</dt><dd>{{ target.version }}</dd></div>
          </dl>
          <form v-if="action && action !== 'detail'" class="mdm-plants__form" @submit.prevent="submitWithFocus($event, submit)">
            <template v-if="action !== 'status'">
              <label v-if="action === 'create'">
                <span>{{ t('mdm.struct.code') }} *</span><MomInput v-model="form.code" :max-length="64" :aria-invalid="!!formError && !form.code?.trim()" :aria-describedby="formError ? 'mdm-uom-form-error' : undefined" />
              </label>
              <label><span>{{ t('mdm.struct.name') }} *</span><MomInput v-model="form.name" :max-length="200" :aria-invalid="!!formError && !form.name?.trim()" :aria-describedby="formError ? 'mdm-uom-form-error' : undefined" /></label>
              <template v-if="action === 'create'">
                <div v-if="active === 'dimensions'" class="mdm-struct__form-grid">
                  <label v-for="[key, label] in exponentFields" :key="key">
                    <span>{{ t(label) }}</span><MomInput v-model="form[key]" type="number" />
                  </label>
                </div>
                <template v-else-if="active === 'uom-categories'">
                  <label><span>{{ t('mdm.uom.dimension') }} *</span>
                    <MomSelect v-model="form.dimensionId" :options="options(dimensions)" :disabled="referencesError" />
                    <MomButton v-if="dimensions.length < dimensionTotal" variant="outline" :disabled="referencesLoading"
                      @click="loadReferences('dimensions', dimensionPage + 1)">{{ t('mdm.struct.loadMore') }}</MomButton>
                  </label>
                  <p>{{ t('mdm.uom.createCategoryHint') }}</p>
                  <label><span>{{ t('mdm.uom.referenceCode') }} *</span><MomInput v-model="form.referenceCode" :max-length="64" /></label>
                  <label><span>{{ t('mdm.uom.referenceName') }} *</span><MomInput v-model="form.referenceName" :max-length="200" /></label>
                  <label><span>{{ t('mdm.uom.referenceSymbol') }} *</span><MomInput v-model="form.referenceSymbol" :max-length="32" /></label>
                  <label><span>{{ t('mdm.uom.referenceReason') }}</span><MomInput v-model="form.referenceUcumNotApplicableReason" :max-length="500" /></label>
                </template>
                <template v-else>
                  <p>{{ t('mdm.uom.createUnitHint') }}</p>
                  <label><span>{{ t('mdm.uom.category') }} *</span>
                    <MomSelect v-model="form.categoryId" :options="options(categories)" :disabled="referencesError" />
                    <MomButton v-if="categories.length < categoryTotal" variant="outline" :disabled="referencesLoading"
                      @click="loadReferences('uom-categories', categoryPage + 1)">{{ t('mdm.struct.loadMore') }}</MomButton>
                  </label>
                  <label><span>{{ t('mdm.uom.symbol') }} *</span><MomInput v-model="form.symbol" :max-length="32" /></label>
                  <label><span>{{ t('mdm.uom.referenceReason') }}</span><MomInput v-model="form.ucumNotApplicableReason" :max-length="500" /></label>
                  <div class="mdm-struct__form-grid">
                    <label><span>{{ t('mdm.uom.multiplier') }}</span><MomInput v-model="form.multiplier" /></label>
                    <label><span>{{ t('mdm.uom.offset') }}</span><MomInput v-model="form.offset" /></label>
                    <label><span>{{ t('mdm.uom.precision') }}</span><MomInput v-model="form.calculationPrecision" type="number" /></label>
                    <label><span>{{ t('mdm.uom.rounding') }}</span>
                      <MomSelect v-model="form.roundingMode" :options="['UP','DOWN','CEILING','FLOOR','HALF_UP','HALF_DOWN','HALF_EVEN','UNNECESSARY'].map(v => ({ value: v, label: v }))" />
                    </label>
                  </div>
                </template>
                <label><span>{{ t('mdm.struct.status') }}</span>
                  <MomSelect v-model="form.status" :options="[{ value: 'ENABLED', label: t('mdm.struct.enabled') }, { value: 'DISABLED', label: t('mdm.struct.disabled') }]" />
                </label>
              </template>
            </template>
            <p v-else class="mdm-plants__warning">{{ t('mdm.uom.referenceGuard') }}</p>
            <p v-if="formError" id="mdm-uom-form-error" class="mdm-plants__field-error" role="alert" tabindex="-1">{{ formError }}</p>
            <div class="mdm-plants__footer">
              <MomButton variant="outline" @click="close">{{ tForOwner('system', 'system.common.cancel') }}</MomButton>
              <MomButton type="submit" :disabled="saving || blocked || detailLoading || referencesError">{{ t('mdm.struct.confirm') }}</MomButton>
            </div>
          </form>
          <div v-else class="mdm-plants__footer"><MomButton variant="outline" @click="close">{{ tForOwner('system', 'system.common.close') }}</MomButton></div>
        </div>
      </MomModal>

      <MomModal :open="ruleOpen" :title="t('mdm.uom.rules')" :close-label="tForOwner('system', 'system.common.close')"
        :busy="ruleSaving" :busy-text="t('mdm.struct.saving')"
        @close="ruleOpen = false; ruleSequence++">
        <div class="mdm-plants__dialog">
          <p v-if="ruleLoading" role="status">{{ t('mdm.struct.loading') }}</p>
          <div v-if="ruleError && (!ruleCurrent || !hasAuthority('mdm:uom:write'))" class="mdm-plants__error" role="alert">{{ ruleError }}</div>
          <dl v-if="ruleCurrent" class="mdm-plants__summary">
            <div><dt>{{ t('mdm.struct.code') }}</dt><dd>{{ ruleTarget?.code }}</dd></div>
            <div><dt>{{ t('mdm.uom.currentVersion') }}</dt><dd>{{ ruleCurrent.versionNo }}</dd></div>
          </dl>
          <div class="mdm-struct__history">
            <strong>{{ t('mdm.uom.versionHistory') }}</strong>
            <div v-for="rule in ruleRows" :key="rule.id">
              <strong>#{{ rule.versionNo }} · {{ rule.status }}</strong>
              <p>{{ decimalRuleExpression(rule.multiplier, rule.offset) }}</p>
              <small>{{ t('mdm.uom.precision') }}: {{ rule.calculationPrecision }} · {{ t('mdm.uom.rounding') }}: {{ rule.roundingMode }}</small>
            </div>
            <div class="mdm-plants__footer">
              <MomButton variant="outline" :disabled="rulePage <= 1 || ruleLoading"
                @click="ruleTarget && loadRule(ruleTarget, rulePage - 1)">{{ t('mdm.struct.previous') }}</MomButton>
              <MomButton variant="outline" :disabled="ruleLoading || rulePage * 20 >= ruleTotal"
                @click="ruleTarget && loadRule(ruleTarget, rulePage + 1)">{{ t('mdm.struct.next') }}</MomButton>
            </div>
          </div>
          <form v-if="ruleCurrent && hasAuthority('mdm:uom:write')" class="mdm-plants__form" @submit.prevent="submitWithFocus($event, publish)">
            <p>{{ t('mdm.uom.publishHint') }}</p>
            <p v-if="ruleError" id="mdm-rule-error" class="mdm-plants__field-error" role="alert" tabindex="-1">{{ ruleError }}</p>
            <div class="mdm-struct__form-grid">
              <label><span>{{ t('mdm.uom.multiplier') }}</span><MomInput v-model="ruleForm.multiplier" :aria-invalid="!!ruleError && !decimalsValid(ruleForm.multiplier, '0')" :aria-describedby="ruleError ? 'mdm-rule-error' : undefined" /></label>
              <label><span>{{ t('mdm.uom.offset') }}</span><MomInput v-model="ruleForm.offset" :aria-invalid="!!ruleError && !decimal.test(ruleForm.offset)" :aria-describedby="ruleError ? 'mdm-rule-error' : undefined" /></label>
              <label><span>{{ t('mdm.uom.precision') }}</span><MomInput v-model="ruleForm.calculationPrecision" type="number" :aria-invalid="!!ruleError && !precisionValid(ruleForm.calculationPrecision)" :aria-describedby="ruleError ? 'mdm-rule-error' : undefined" /></label>
              <label><span>{{ t('mdm.uom.rounding') }}</span>
                <MomSelect v-model="ruleForm.roundingMode" :options="['UP','DOWN','CEILING','FLOOR','HALF_UP','HALF_DOWN','HALF_EVEN','UNNECESSARY'].map(v => ({ value: v, label: v }))" />
              </label>
            </div>
            <div class="mdm-plants__footer">
              <MomButton variant="outline" type="button" :disabled="ruleSaving" @click="ruleTarget && loadRule(ruleTarget)">{{ t('mdm.struct.refresh') }}</MomButton>
              <MomButton type="submit" :disabled="ruleLoading || ruleSaving || ruleBlocked">{{ t('mdm.uom.publish') }}</MomButton>
            </div>
          </form>
        </div>
      </MomModal>
    </section>
  </PageContainer>
</template>
