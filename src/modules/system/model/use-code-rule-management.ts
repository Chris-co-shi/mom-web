import { computed, onBeforeUnmount, ref } from 'vue';
import { hasAuthority } from '../../auth';
import { codeRuleApi, codeRuleOwners, type CodeRuleFilters, type CodeRuleOwner, type CodeRuleView } from '../api/code-rule-api';
import { isApiError } from '../../../shared/api/errors';
import { managementFeedback, type ManagementFeedback } from '../../../shared/management/management-feedback';
import { validateFormSchema } from '../../../shared/form-designer/schema';
import type { CodeRuleDefinition, CodeSegmentCatalogEntry } from '../../../shared/form-designer/types';

const emptyDefinition = (): CodeRuleDefinition => ({ schemaVersion: 1, segments: [] });
/** 深拷贝规则定义，避免编辑态修改列表或详情响应中的嵌套对象。 */
const clone = (value: CodeRuleDefinition): CodeRuleDefinition => JSON.parse(JSON.stringify(value)) as CodeRuleDefinition;
/** 编码规则允许的管理动作。 */
export type CodeRuleAction = 'revise' | 'enable' | 'disable';

/** 管理页持有 Owner、分页和编辑上下文；读请求取消并防乱序，写请求只执行一次。 */
export function useCodeRuleManagement(owners = codeRuleOwners, allowed = hasAuthority) {
  const visibleOwners = owners.filter(item => allowed(item.readAuthority));
  const owner = ref<CodeRuleOwner>(visibleOwners[0] ?? owners[0]);
  const canRead = computed(() => allowed(owner.value.readAuthority));
  const canWrite = computed(() => canRead.value && allowed(owner.value.writeAuthority));
  const catalog = ref<CodeSegmentCatalogEntry[]>([]);
  const catalogLoading = ref(false);
  const catalogError = ref<ManagementFeedback | null>(null);
  const catalogReady = ref(false);
  const rows = ref<CodeRuleView[]>([]);
  const loading = ref(false);
  const listError = ref<ManagementFeedback | null>(null);
  const pageNo = ref(1); const pageSize = ref(20); const total = ref(0); const totalPages = ref(0);
  const filters = ref<CodeRuleFilters>({});
  const historyCode = ref('');
  const editorOpen = ref(false); const detailLoading = ref(false);
  const target = ref<CodeRuleView | null>(null);
  const ruleCode = ref(''); const usageScenario = ref(''); const description = ref(''); const definition = ref<CodeRuleDefinition>(emptyDefinition());
  const saved = ref('');
  const dirty = computed(() => editorOpen.value && saved.value !== JSON.stringify({ ruleCode: ruleCode.value, usageScenario: usageScenario.value, description: description.value, definition: definition.value }));
  const saving = ref(false); const writeBlocked = ref(false);
  const feedback = ref<ManagementFeedback | null>(null); const notice = ref(false);
  const discardPending = ref(false);
  let discardResolver: ((discard: boolean) => void) | undefined;
  let catalogId = 0; let listId = 0; let detailId = 0;
  let catalogRequest: AbortController | undefined; let listRequest: AbortController | undefined; let detailRequest: AbortController | undefined;
  let uncertain: { owner: CodeRuleOwner; revisionId?: string; ruleCode: string } | undefined;

  /** 当前 Owner 目录无法解释的段或参数；存在时禁止提交，保留原始定义供查看。 */
  const unsupported = computed(() => definition.value.segments.filter(segment => {
    const entry = catalog.value.find(item => item.type === segment.type);
    if (!entry) return true;
    return entry.parameterSchema.fields.some(field => field.type === 'SELECT'
      && segment.params[field.name] != null && segment.params[field.name] !== ''
      && !field.options?.some(option => option.value === segment.params[field.name]));
  }).map(segment => segment.id));
  /** 只有权限、目录、并发阻断和生命周期状态均满足时才允许编辑写入。 */
  const editable = computed(() => canWrite.value && catalogReady.value && !detailLoading.value
    && !saving.value && !writeBlocked.value && !unsupported.value.length && (!target.value || target.value.status === 'DRAFT'));
  /** 保存当前编辑快照，用于判断切换或关闭前是否存在未保存修改。 */
  function snapshot(): void { saved.value = JSON.stringify({ ruleCode: ruleCode.value, usageScenario: usageScenario.value, description: description.value, definition: definition.value }); }
  function apply(row: CodeRuleView): void {
    target.value = row; ruleCode.value = row.ruleCode; usageScenario.value = row.usageScenario ?? ''; description.value = row.description ?? ''; definition.value = clone(row.definition); snapshot();
  }
  function resetEditor(): void {
    detailRequest?.abort(); detailId++; detailLoading.value = false;
    target.value = null; editorOpen.value = false; ruleCode.value = ''; usageScenario.value = ''; description.value = ''; definition.value = emptyDefinition(); snapshot();
  }
  function confirmDiscard(): Promise<boolean> {
    if (saving.value) return Promise.resolve(false);
    if (!dirty.value) return Promise.resolve(true);
    if (discardResolver) return Promise.resolve(false);
    discardPending.value = true;
    return new Promise(resolve => { discardResolver = resolve; });
  }
  function resolveDiscard(discard: boolean): void {
    discardPending.value = false; discardResolver?.(discard); discardResolver = undefined;
  }
  /** 读取并校验 Owner 目录；目录版本或 Schema 不可接受时不开放编辑。 */
  async function loadCatalog(): Promise<void> {
    catalogRequest?.abort(); const current = ++catalogId; const selected = owner.value;
    catalogRequest = new AbortController(); catalog.value = []; catalogError.value = null; catalogReady.value = false;
    if (!canRead.value) return;
    catalogLoading.value = true;
    try {
      const result = await codeRuleApi.catalog(selected, catalogRequest.signal);
      if (current !== catalogId) return;
      if (!Array.isArray(result) || result.some(entry => entry.catalogVersion !== 1 || !entry.type || validateFormSchema(entry.parameterSchema).length)
          || new Set(result.map(entry => entry.type)).size !== result.length) {
        catalogError.value = { key: 'system.coderules.cataloginvalid' }; return;
      }
      catalog.value = result; catalogReady.value = result.length > 0;
    } catch (error) { if (current === catalogId) catalogError.value = managementFeedback(error); }
    finally { if (current === catalogId) catalogLoading.value = false; }
  }
  /** 读取当前 Owner 的规则列表，并在末页失效时回退到最后有效页。 */
  async function loadList(): Promise<void> {
    listRequest?.abort(); const current = ++listId; const selected = owner.value;
    listRequest = new AbortController(); listError.value = null; rows.value = []; total.value = 0; totalPages.value = 0;
    if (!canRead.value) return;
    loading.value = true;
    try {
      const result = await codeRuleApi.search(selected, { params: historyCode.value ? { ruleCode: historyCode.value } : { ...filters.value }, pageNo: pageNo.value, pageSize: pageSize.value }, listRequest.signal);
      if (current !== listId) return;
      rows.value = result.records; total.value = result.total; totalPages.value = result.totalPages;
      // 筛选或写入导致末页失效时，只重读最后一个有效页。
      if (result.totalPages > 0 && pageNo.value > result.totalPages) { pageNo.value = result.totalPages; await loadList(); }
    } catch (error) { if (current === listId) listError.value = managementFeedback(error); }
    finally { if (current === listId) loading.value = false; }
  }
  async function reload(): Promise<void> { await Promise.all([loadCatalog(), loadList()]); }
  async function changeOwner(id: string): Promise<void> {
    const next = visibleOwners.find(item => item.id === id);
    if (!next || next.id === owner.value.id || saving.value || !await confirmDiscard()) return;
    resetEditor(); owner.value = next; filters.value = {}; historyCode.value = ''; pageNo.value = 1;
    feedback.value = null; notice.value = false; writeBlocked.value = !!uncertain;
    await reload();
  }
  /** 打开新建或现有修订编辑态；切换前必须处理未保存草稿。 */
  async function open(row?: CodeRuleView): Promise<void> {
    if (saving.value || !canRead.value || !await confirmDiscard()) return;
    resetEditor(); feedback.value = null; notice.value = false;
    writeBlocked.value = !!uncertain; editorOpen.value = true;
    if (!row) { if (!canWrite.value) { resetEditor(); return; } snapshot(); return; }
    const current = ++detailId; detailRequest = new AbortController(); detailLoading.value = true;
    try {
      const result = await codeRuleApi.detail(owner.value, row.id, detailRequest.signal);
      if (current !== detailId) return;
      apply(result);
    } catch (error) { if (current === detailId) { feedback.value = managementFeedback(error); writeBlocked.value = true; } }
    finally { if (current === detailId) detailLoading.value = false; }
  }
  async function close(): Promise<void> { if (await confirmDiscard()) resetEditor(); }
  async function search(): Promise<void> { historyCode.value = ''; pageNo.value = 1; await loadList(); }
  async function page(value: number): Promise<void> { if (!saving.value) { pageNo.value = value; await loadList(); } }
  async function size(value: number): Promise<void> { if (!saving.value) { pageSize.value = value; pageNo.value = 1; await loadList(); } }
  async function showHistory(row: CodeRuleView): Promise<void> {
    if (saving.value || !await confirmDiscard()) return;
    resetEditor(); historyCode.value = row.ruleCode; pageNo.value = 1; await loadList();
  }
  function writeError(error: unknown): void {
    // 响应损坏或 5xx 不能证明事务未提交，按未知结果处理，禁止直接重放。
    const unknown = !isApiError(error) || error.resultUnknown || ['protocol', 'server', 'http'].includes(error.kind);
    feedback.value = unknown ? { key: 'system.feedback.unknown', correlationId: isApiError(error) ? error.correlationId : undefined }
      : managementFeedback(error, true);
    writeBlocked.value = unknown || isApiError(error) && ['conflict', 'not_found', 'forbidden', 'unauthenticated'].includes(error.kind);
    if (unknown) uncertain = { owner: { ...owner.value }, revisionId: target.value?.id, ruleCode: ruleCode.value };
  }
  /** 保存规则草稿；未知写入结果会阻断后续写操作，等待显式核对。 */
  async function save(): Promise<void> {
    if (!editorOpen.value || !editable.value || saving.value) return;
    if (!/^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(ruleCode.value)) { feedback.value = { key: 'system.coderules.invalidcode' }; return; }
    const scenario = usageScenario.value.trim(); const text = description.value.trim();
    if (!scenario || scenario.length > 120 || text.length > 1000) { feedback.value = { key: 'system.coderules.invalidmetadata' }; return; }
    const selected = owner.value; const current = target.value;
    const body = clone(definition.value);
    saving.value = true; feedback.value = null; notice.value = false;
    try {
      const result = current ? await codeRuleApi.update(selected, current.id, { usageScenario: scenario, description: text, definition: body, ruleVersion: current.ruleVersion })
        : await codeRuleApi.create(selected, { ruleCode: ruleCode.value, usageScenario: scenario, description: text, definition: body });
      apply(result); notice.value = true;
      if (!current) pageNo.value = 1;
      await loadList();
    } catch (error) { writeError(error); }
    finally { saving.value = false; }
  }
  /** 执行修订、发布或停用，并携带读取到的 ruleVersion。 */
  async function act(action: CodeRuleAction): Promise<void> {
    const current = target.value;
    if (!canWrite.value || !current || saving.value || writeBlocked.value || dirty.value || detailLoading.value) return;
    if (action === 'revise' && current.status === 'DRAFT' || action === 'enable' && current.status === 'ENABLED'
      || action === 'disable' && current.status !== 'ENABLED') return;
    // 发布必须由后端按当前 Handler/Provider 最终重验，不能由样例预览推断有效性。
    saving.value = true; feedback.value = null; notice.value = false;
    try { apply(await codeRuleApi[action](owner.value, current.id, current.ruleVersion)); notice.value = true; await loadList(); }
    catch (error) { writeError(error); }
    finally { saving.value = false; }
  }
  /** 用户显式核对结果，放弃本地编辑后才用服务端事实解除写入阻断。 */
  async function reconcile(): Promise<void> {
    if (saving.value || !await confirmDiscard()) return;
    detailRequest?.abort(); const current = ++detailId; detailRequest = new AbortController(); detailLoading.value = true;
    try {
      let result: CodeRuleView;
      if (uncertain) {
        if (owner.value.id !== uncertain.owner.id) { feedback.value = { key: 'system.feedback.unknown' }; return; }
        if (uncertain.revisionId) result = await codeRuleApi.detail(uncertain.owner, uncertain.revisionId, detailRequest.signal);
        else {
          const found = await codeRuleApi.search(uncertain.owner, { params: { ruleCode: uncertain.ruleCode }, pageNo: 1, pageSize: 20 }, detailRequest.signal);
          if (!found.records.length) { feedback.value = { key: 'system.feedback.unknown' }; return; }
          result = await codeRuleApi.detail(uncertain.owner, found.records[0].id, detailRequest.signal);
        }
      } else if (target.value) result = await codeRuleApi.detail(owner.value, target.value.id, detailRequest.signal);
      else { resetEditor(); await reload(); return; }
      if (current !== detailId) return;
      apply(result); editorOpen.value = true; uncertain = undefined; writeBlocked.value = false; feedback.value = null;
      await reload();
    } catch (error) { if (current === detailId) feedback.value = managementFeedback(error); }
    finally { if (current === detailId) detailLoading.value = false; }
  }
  onBeforeUnmount(() => { catalogRequest?.abort(); listRequest?.abort(); detailRequest?.abort(); catalogId++; listId++; detailId++; resolveDiscard(false); });
  return { owners: visibleOwners, owner, canRead, canWrite, catalog, catalogLoading, catalogError, catalogReady, rows, loading, listError,
    pageNo, pageSize, total, totalPages, filters, historyCode, editorOpen, detailLoading, target, ruleCode, usageScenario, description, definition,
    dirty, saving, writeBlocked, feedback, notice, discardPending, unsupported, editable,
    reload, loadList, loadCatalog, changeOwner, open, close, search, page, size, showHistory, save, act, reconcile, confirmDiscard, resolveDiscard };
}
