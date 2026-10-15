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
import MomCrudPagination from '../../../shared/components/MomCrudPagination.vue';
import MomCrudRowMenu from '../../../shared/components/MomCrudRowMenu.vue';
import MomModal from '../../../shared/components/MomModal.vue';
import PageContainer from '../../../shared/components/PageContainer.vue';
import { useLocale } from '../../../shared/i18n/locale';
import {
  searchMaterials, getMaterial, createMaterial, updateMaterial, setMaterialEnabled,
  searchMaterialCategories, getMaterialCategory, type Material, type MaterialCategory, type MaterialFilter,
  type CreateMaterialRequest, type BatchTrackingPolicy, type MaterialType,
} from '../api/material-api';
import { getUomCatalog, searchUomCatalog, type UomRow } from '../api/uom-api';
import './mdm-pages.css';

const { t } = useLocale();
const rows = ref<Material[]>([]);
const categories = ref<MaterialCategory[]>([]), uoms = ref<UomRow[]>([]);
const categoryPage = ref(1), categoryTotal = ref(0), uomPage = ref(1), uomTotal = ref(0);
const referencePending = reactive({ categories: false, uoms: false });
const referenceFailures = reactive({ categories: false, uoms: false });
const referenceVersions = { categories: 0, uoms: 0 };
const referencesLoading = computed(() => Object.values(referencePending).some(Boolean));
const referencesError = computed(() => Object.values(referenceFailures).some(Boolean));
const resolvedCategories = ref<MaterialCategory[]>([]), resolvedUoms = ref<UomRow[]>([]);
const knownCategories = computed(() => [...new Map([...categories.value, ...resolvedCategories.value].map(row => [row.id, row])).values()]);
const knownUoms = computed(() => [...new Map([...uoms.value, ...resolvedUoms.value].map(row => [row.id, row])).values()]);
const pageNo = ref(1), pageSize = ref(20), total = ref(0), loading = ref(false);
const saving = ref(false), detailLoading = ref(false), blocked = ref(false);
const action = ref<'create' | 'detail' | 'edit' | 'status'>(), target = ref<Material>();
const listError = ref(''), dialogError = ref(''), notice = ref(''), formError = ref('');
const filter = reactive({ keyword:'', categoryId:'', baseUomId:'', status:'' });
const form = reactive({
  code:'', name:'', categoryId:'', baseUomId:'', status:'ENABLED',
  materialType:'' as MaterialType | '',
  batchTrackingSource:'' as CreateMaterialRequest['batchTrackingSource'] | '',
  batchTrackingPolicy:'' as BatchTrackingPolicy | '',
  shelfLifeSource:'CATEGORY_DEFAULT', shelfLifeDays:'',
});
let controller: AbortController | undefined, detailController: AbortController | undefined;
let seq = 0, detailSeq = 0, disposed = false;
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));
const modalTitle = computed(() => !action.value ? '' : `${t('mdm.material.materials')} · ${t(({
  create: 'mdm.struct.create', detail: 'mdm.struct.detail', edit: 'mdm.struct.edit', status: 'mdm.struct.changeStatus',
} as const)[action.value])}`);
const columns = computed<MomColumn[]>(() => [
  { key:'code', title:t('mdm.material.materialCode'), minWidth:170 },
  { key:'name', title:t('mdm.struct.name'), minWidth:200 },
  { key:'categoryId', title:t('mdm.material.category'), minWidth:180 },
  { key:'baseUomId', title:t('mdm.material.baseUom'), minWidth:160 },
  { key:'materialType', title:t('mdm.material.type'), minWidth:150 },
  { key:'batchTrackingPolicy', title:t('mdm.material.batchPolicy'), minWidth:150 },
  { key:'revisionNo', title:t('mdm.material.revision'), width:110 },
  { key:'shelfLifeDays', title:t('mdm.material.shelfLife'), minWidth:120 },
  { key:'status', title:t('mdm.struct.status'), width:120 },
  { key:'actions', title:t('mdm.struct.actions'), width:180, fixed:'right', resizable:false },
]);
const categoryOptions = computed(() => [
  { value:'', label:t('mdm.struct.all') },
  ...knownCategories.value.map(x => ({ value:x.id, label:`${x.name} (${x.code})` })),
]);
const activeCategoryOptions = computed(() => [
  { value:'', label:t('mdm.struct.select') },
  ...knownCategories.value.filter(x => x.status === 'ENABLED' || x.id === form.categoryId).map(x => ({ value:x.id, label:`${x.name} (${x.code})` })),
]);
const uomOptions = computed(() => [
  { value:'', label:t('mdm.struct.all') },
  ...knownUoms.value.map(x => ({value:x.id,label:`${x.name} (${x.code})` })),
]);
const formUomOptions = computed(() => [
  { value: '', label: t('mdm.struct.select') }, ...uomOptions.value.slice(1),
]);
const dayValue = (raw: string): number | null => raw === '' ? null : Number(raw);
const isDays = (raw: string): boolean => raw === '' || /^\d+$/.test(raw) && Number.isSafeInteger(Number(raw));
function feedback(error: unknown, writing = false): string {
  if (!isApiError(error)) return t(writing ? 'mdm.struct.unknownWrite' : 'mdm.struct.loadFailed');
  if (writing && (error.resultUnknown || ['network','timeout','server','protocol'].includes(error.kind)))
    return t('mdm.struct.unknownWrite');
  if (error.code === 'mdm.material_category_not_leaf') return t('mdm.material.notLeaf');
  if (error.kind === 'conflict') return t('mdm.struct.conflict');
  if (error.kind === 'forbidden') return t('mdm.struct.forbidden');
  if (error.kind === 'not_found') return t('mdm.struct.notFound');
  if (error.kind === 'validation') return t('mdm.struct.validation');
  return t('mdm.struct.loadFailed');
}
function filters(): MaterialFilter {
  return Object.fromEntries(Object.entries(filter).filter(([,value]) => value.trim())) as MaterialFilter;
}
async function loadPage(next = pageNo.value, size = pageSize.value): Promise<void> {
  const current = ++seq; controller?.abort(); controller = new AbortController();
  loading.value = true; rows.value = []; listError.value = '';
  pageNo.value = next; pageSize.value = size;
  try {
    const result = await searchMaterials(next, size, filters(), controller.signal);
    if (disposed || current !== seq) return;
    if (next > 1 && !result.records.length) { await loadPage(next - 1, size); return; }
    rows.value = result.records; pageNo.value = result.pageNo; total.value = result.total;
  } catch (error) { if (!disposed && current === seq) listError.value = feedback(error); }
  finally { if (current === seq) loading.value = false; }
}
async function loadReferences(kind: 'categories' | 'uoms', next = 1): Promise<void> {
  const requestVersion = ++referenceVersions[kind];
  referencePending[kind] = true;
  try {
    if (kind === 'categories') {
      const result = await searchMaterialCategories(next, 50, {status:'ENABLED'});
      if (disposed || requestVersion !== referenceVersions[kind]) return;
      categories.value = next === 1 ? result.records : [...categories.value, ...result.records];
      categoryPage.value = next; categoryTotal.value = result.total;
    } else {
      const result = await searchUomCatalog('uoms', next, 50, {status:'ENABLED'});
      if (disposed || requestVersion !== referenceVersions[kind]) return;
      uoms.value = next === 1 ? result.records : [...uoms.value, ...result.records];
      uomPage.value = next; uomTotal.value = result.total;
    }
    referenceFailures[kind] = false;
  } catch { if (!disposed && requestVersion === referenceVersions[kind]) referenceFailures[kind] = true; }
  finally { if (requestVersion === referenceVersions[kind]) referencePending[kind] = false; }
}
function reloadReferences(): void {
  void Promise.all([loadReferences('categories'),loadReferences('uoms')]);
}
function resetForm(value?: Material): void {
  Object.assign(form, {
    code:value?.code ?? '', name:value?.name ?? '',
    categoryId:value?.categoryId ?? '', baseUomId:value?.baseUomId ?? '',
    materialType:value?.materialType ?? '',
    batchTrackingSource:'', batchTrackingPolicy:value?.batchTrackingPolicy ?? '',
    status:value?.status ?? 'ENABLED', shelfLifeSource:'CATEGORY_DEFAULT',
    shelfLifeDays:value?.shelfLifeDays == null ? '' : String(value.shelfLifeDays),
  });
}
async function open(next: 'create'|'detail'|'edit'|'status', row?: Material): Promise<void> {
  if (saving.value || (next !== 'detail' && !hasAuthority('mdm:material:write'))) return;
  ++detailSeq; detailController?.abort();
  action.value = next; target.value = row; blocked.value = false; detailLoading.value = false;
  dialogError.value = ''; formError.value = ''; resetForm(row);
  if (!row) return;
  const current = ++detailSeq; detailController = new AbortController();
  detailLoading.value = true; blocked.value = true;
  try {
    const detail = await getMaterial(row.id, detailController.signal);
    if (disposed || current !== detailSeq) return;
    target.value = detail; resetForm(detail); blocked.value = false;
    // 名称补齐不扩大物料操作的权限依赖；失败时保留真实 ID，编辑仍遵守引用校验。
    const [category, uom] = await Promise.allSettled([
      getMaterialCategory(detail.categoryId, detailController.signal),
      getUomCatalog('uoms', detail.baseUomId, detailController.signal),
    ]);
    if (disposed || current !== detailSeq) return;
    if (category.status === 'fulfilled') resolvedCategories.value = [category.value];
    else referenceFailures.categories = true;
    if (uom.status === 'fulfilled') resolvedUoms.value = [uom.value];
    else referenceFailures.uoms = true;
  } catch (error) { if (!disposed && current === detailSeq) dialogError.value = feedback(error); }
  finally { if (current === detailSeq) detailLoading.value = false; }
}
function close(): void {
  if (saving.value) return;
  ++detailSeq; detailController?.abort(); action.value = undefined; target.value = undefined;
}
async function ensureLeafCategory(id: string): Promise<boolean> {
  // 提供更早的前端反馈；最终无竞争保证仍依赖后端事务校验。
  const children = await searchMaterialCategories(1, 1, {parentId:id});
  return children.total === 0;
}
async function submit(): Promise<void> {
  if (!action.value || action.value === 'detail' || saving.value || blocked.value ||
      !hasAuthority('mdm:material:write')) return;
  const next = action.value;
  formError.value = ''; dialogError.value = '';
  if (next === 'create' || next === 'edit') {
    if (!form.name.trim() || form.name.length > 200 || !form.categoryId ||
        next === 'create' && (!form.code.trim() || form.code.length > 64 || !form.baseUomId ||
          !form.materialType || form.materialType === 'UNSPECIFIED' || !form.batchTrackingSource) ||
        next === 'edit' && (!form.batchTrackingPolicy || form.batchTrackingPolicy === 'UNSPECIFIED')) {
      formError.value = t('mdm.struct.validation'); return;
    }
    if (next === 'create' && (form.batchTrackingSource === 'EXPLICIT'
      ? !form.batchTrackingPolicy || form.batchTrackingPolicy === 'UNSPECIFIED'
      : !knownCategories.value.find(row => row.id === form.categoryId)?.defaultBatchTrackingPolicy)) {
      formError.value = t('mdm.material.batchRequired'); return;
    }
    if (!isDays(form.shelfLifeDays)) { formError.value = t('mdm.material.invalidDays'); return; }
    if (referencesError.value) { formError.value = t('mdm.material.referencesError'); return; }
  }
  saving.value = true;
  try {
    if (next === 'create' || next === 'edit') {
      if (!(await ensureLeafCategory(form.categoryId))) {
        formError.value = t('mdm.material.notLeaf'); return;
      }
    }
    if (next === 'create') {
      const source = form.shelfLifeSource === 'EXPLICIT' ? 'EXPLICIT' : 'CATEGORY_DEFAULT';
      await createMaterial({
        code:form.code, name:form.name, categoryId:form.categoryId, baseUomId:form.baseUomId,
        materialType:form.materialType as CreateMaterialRequest['materialType'],
        batchTrackingSource:form.batchTrackingSource as CreateMaterialRequest['batchTrackingSource'],
        batchTrackingPolicy:form.batchTrackingSource === 'CATEGORY_DEFAULT' ? null
          : form.batchTrackingPolicy as CreateMaterialRequest['batchTrackingPolicy'],
        shelfLifeSource:source, shelfLifeDays:source === 'CATEGORY_DEFAULT' ? null : dayValue(form.shelfLifeDays),
        status:form.status === 'DISABLED' ? 'DISABLED' : 'ENABLED',
      });
    } else if (target.value) {
      if (next === 'edit') {
        await updateMaterial(target.value.id, {
          name:form.name, categoryId:form.categoryId,
          batchTrackingPolicy:form.batchTrackingPolicy as 'NONE' | 'REQUIRED',
          shelfLifeDays:dayValue(form.shelfLifeDays), version:target.value.version,
        });
      } else {
        await setMaterialEnabled(target.value.id, target.value.status !== 'ENABLED', target.value.version);
      }
    }
    if (disposed) return;
    action.value = undefined; target.value = undefined; notice.value = t('mdm.struct.saved');
    await loadPage(next === 'create' ? 1 : pageNo.value);
  } catch (error) {
    if (disposed) return;
    dialogError.value = feedback(error, true);
    blocked.value = isApiError(error)
      ? error.resultUnknown || ['conflict','not_found','network','timeout','server','protocol'].includes(error.kind)
      : true;
  } finally { saving.value = false; }
}
function displayCategory(id: string): string { return knownCategories.value.find(r=>r.id===id)?.name ?? id; }
function displayUom(id: string): string { return knownUoms.value.find(r=>r.id===id)?.name ?? id; }
function displayType(type: MaterialType): string {
  return t(({
    RAW_MATERIAL:'mdm.material.rawMaterial', SEMI_FINISHED:'mdm.material.semiFinished',
    FINISHED_PRODUCT:'mdm.material.finishedProduct', UNSPECIFIED:'mdm.material.unspecified',
  } as const)[type]);
}
function displayBatchPolicy(policy: BatchTrackingPolicy): string {
  return t(({
    NONE:'mdm.material.batchNone', REQUIRED:'mdm.material.batchRequiredLabel',
    UNSPECIFIED:'mdm.material.unspecified',
  } as const)[policy]);
}
function clearFilters(): void {
  Object.assign(filter, {keyword:'',categoryId:'',baseUomId:'',status:''});
  void loadPage(1);
}
function handleMore(key: string, row: Material): void {
  if (key === 'status') void open('status', row);
}
onMounted(() => { void loadPage(); reloadReferences(); });
onBeforeRouteLeave(() => !saving.value);
onScopeDispose(() => { disposed = true; controller?.abort(); detailController?.abort(); });
</script>

<template>
  <PageContainer>
    <section class="mdm-plants" aria-labelledby="mdm-materials-title">
      <MomManagementHeader title-id="mdm-materials-title" :title="t('mdm.material.materials')"
        :description="t('mdm.material.description')">
        <template #actions>
          <MomButton variant="outline" :disabled="loading || saving" @click="loadPage()">
            <RefreshCw :size="16" aria-hidden="true" />{{ t('mdm.struct.refresh') }}
          </MomButton>
          <AuthorityGuard :authorities="['mdm:material:write']">
            <MomButton :disabled="saving || referencesError" @click="open('create')">
              <Plus :size="16" aria-hidden="true" />{{ t('mdm.struct.create') }}
            </MomButton>
          </AuthorityGuard>
        </template>
      </MomManagementHeader>
      <p v-if="notice" role="status" class="mdm-plants__notice">{{ notice }}</p>
      <div v-if="listError || referencesError" class="mdm-plants__error" role="alert">
        <p v-if="listError">{{ listError }}</p>
        <p v-if="referencesError">{{ t('mdm.material.referencesError') }}</p>
        <MomButton variant="outline" @click="loadPage(); reloadReferences()">{{ t('mdm.struct.retry') }}</MomButton>
      </div>
      <form class="mdm-struct__filters" role="search" @submit.prevent="loadPage(1)">
        <label><span>{{ t('mdm.material.keyword') }}</span><MomInput v-model="filter.keyword" /></label>
        <label><span>{{ t('mdm.material.category') }}</span>
          <MomSelect v-model="filter.categoryId" :options="categoryOptions" />
        </label>
        <label><span>{{ t('mdm.material.baseUom') }}</span>
          <MomSelect v-model="filter.baseUomId" :options="uomOptions" />
        </label>
        <label><span>{{ t('mdm.material.statusFilter') }}</span>
          <MomSelect v-model="filter.status" :options="[{label:t('mdm.struct.all'),value:''},
            {label:t('mdm.struct.enabled'),value:'ENABLED'},{label:t('mdm.struct.disabled'),value:'DISABLED'}]" />
        </label>
        <MomButton type="submit" :disabled="loading">{{ t('mdm.material.search') }}</MomButton>
        <MomButton variant="outline" type="button" :disabled="loading" @click="clearFilters">{{ t('mdm.material.clear') }}</MomButton>
      </form>
      <MomListSurface v-if="!listError" :title="t('mdm.material.materials')" :hint="t('mdm.material.leafOnly')"
        :loading="loading" :loading-text="t('mdm.struct.loading')">
        <MomDataTable :rows="rows" :columns="columns" :empty-text="t('mdm.material.noData')">
          <template #cell-code="{row}"><span class="mdm-plants__code">{{ row.code }}</span></template>
          <template #cell-categoryId="{row}">{{ displayCategory(row.categoryId) }}</template>
          <template #cell-baseUomId="{row}">{{ displayUom(row.baseUomId) }}</template>
          <template #cell-materialType="{row}">{{ displayType(row.materialType) }}</template>
          <template #cell-batchTrackingPolicy="{row}">{{ displayBatchPolicy(row.batchTrackingPolicy) }}</template>
          <template #cell-shelfLifeDays="{row}">{{ row.shelfLifeDays ?? '—' }}</template>
          <template #cell-status="{row}">
            <span class="mom-management-status" :class="row.status === 'ENABLED' ? 'mom-management-status--enabled' : 'mom-management-status--disabled'">
              <span class="mom-management-status__dot" aria-hidden="true"></span>
              {{ t(row.status === 'ENABLED' ? 'mdm.struct.enabled' : 'mdm.struct.disabled') }}
            </span>
          </template>
          <template #cell-actions="{row}">
            <div class="mom-management-row-actions">
              <MomButton mode="text" @click="open('detail',row)">{{ t('mdm.struct.detail') }}</MomButton>
              <AuthorityGuard :authorities="['mdm:material:write']">
                <MomButton mode="text" @click="open('edit',row)">{{ t('mdm.struct.edit') }}</MomButton>
                <MomCrudRowMenu :label="t('mdm.struct.actions')" :actions="[
                  { key: 'status', label: t(row.status === 'ENABLED' ? 'mdm.struct.disable' : 'mdm.struct.enable'), danger: row.status === 'ENABLED' },
                ]" @select="handleMore($event, row)" />
              </AuthorityGuard>
            </div>
          </template>
        </MomDataTable>
        <template #footer>
          <MomCrudPagination :page-no="pageNo" :page-size="pageSize" :total="total"
            :summary="`${pageNo} / ${pageCount}`" :page-size-label="t('mdm.struct.pageSize')"
            :previous-label="t('mdm.struct.previous')" :next-label="t('mdm.struct.next')"
            :jump-label="t('mdm.struct.jump')" :go-label="t('mdm.struct.go')" :disabled="loading || saving"
            @page="loadPage($event)" @size="loadPage(1,$event)" />
        </template>
      </MomListSurface>
      <div v-if="categories.length < categoryTotal || uoms.length < uomTotal" class="mdm-plants__footer">
        <MomButton v-if="categories.length < categoryTotal" variant="outline" :disabled="referencesLoading"
          @click="loadReferences('categories', categoryPage + 1)">{{ t('mdm.struct.loadMore') }} · {{ t('mdm.material.category') }}</MomButton>
        <MomButton v-if="uoms.length < uomTotal" variant="outline" :disabled="referencesLoading"
          @click="loadReferences('uoms', uomPage + 1)">{{ t('mdm.struct.loadMore') }} · {{ t('mdm.material.baseUom') }}</MomButton>
      </div>
      <MomModal :open="!!action" :title="modalTitle" :close-label="t('mdm.struct.close')"
        :busy="saving" :busy-text="t('mdm.struct.saving')" @close="close">
        <div class="mdm-plants__dialog">
          <p v-if="detailLoading" role="status">{{ t('mdm.struct.loading') }}</p>
          <div v-if="dialogError" class="mdm-plants__error" role="alert">
            <p>{{ dialogError }}</p>
            <MomButton v-if="target" variant="outline" @click="open(action || 'detail', target)">{{ t('mdm.struct.retry') }}</MomButton>
          </div>
          <dl v-if="target && !detailLoading" class="mdm-plants__summary">
            <div><dt>{{ t('mdm.material.materialCode') }}</dt><dd>{{ target.code }}</dd></div>
            <div><dt>{{ t('mdm.struct.name') }}</dt><dd>{{ target.name }}</dd></div>
            <div><dt>{{ t('mdm.material.category') }}</dt><dd>{{ displayCategory(target.categoryId) }}</dd></div>
            <div><dt>{{ t('mdm.material.baseUom') }}</dt><dd>{{ displayUom(target.baseUomId) }}</dd></div>
            <div><dt>{{ t('mdm.material.type') }}</dt><dd>{{ displayType(target.materialType) }}</dd></div>
            <div><dt>{{ t('mdm.material.batchPolicy') }}</dt><dd>{{ displayBatchPolicy(target.batchTrackingPolicy) }}</dd></div>
            <div><dt>{{ t('mdm.material.revision') }}</dt><dd>{{ target.revisionNo }}</dd></div>
            <div><dt>{{ t('mdm.material.shelfLife') }}</dt><dd>{{ target.shelfLifeDays ?? '—' }}</dd></div>
            <div><dt>{{ t('mdm.struct.status') }}</dt><dd>{{ t(target.status === 'ENABLED' ? 'mdm.struct.enabled' : 'mdm.struct.disabled') }}</dd></div>
            <div><dt>{{ t('mdm.struct.version') }}</dt><dd>{{ target.version }}</dd></div>
          </dl>
          <form v-if="action && action !== 'detail'" class="mdm-plants__form" @submit.prevent="submitWithFocus($event, submit)">
            <template v-if="action !== 'status'">
              <label v-if="action === 'create'"><span>{{ t('mdm.material.materialCode') }} *</span>
                <MomInput id="mdm-material-code" v-model="form.code" :max-length="64"
                  :aria-invalid="!!formError && !form.code.trim()" aria-describedby="mdm-material-form-error" /></label>
              <label><span>{{ t('mdm.struct.name') }} *</span><MomInput id="mdm-material-name" v-model="form.name" :max-length="200"
                :aria-invalid="!!formError && !form.name.trim()" aria-describedby="mdm-material-form-error" /></label>
              <label><span>{{ t('mdm.material.category') }} *</span>
                <MomSelect v-model="form.categoryId" :options="activeCategoryOptions" :disabled="referencesError" :aria-invalid="!!formError && !form.categoryId" :aria-describedby="formError ? 'mdm-material-form-error' : undefined" />
                <small>{{ t('mdm.material.leafOnly') }}</small>
              </label>
              <label v-if="action === 'create'"><span>{{ t('mdm.material.baseUom') }} *</span>
                <MomSelect v-model="form.baseUomId" :options="formUomOptions" :disabled="referencesError" :aria-invalid="!!formError && !form.baseUomId" :aria-describedby="formError ? 'mdm-material-form-error' : undefined" />
              </label>
              <label v-if="action === 'create'"><span>{{ t('mdm.material.type') }} *</span>
                <MomSelect v-model="form.materialType" :options="[
                  {label:t('mdm.struct.select'),value:''},
                  {label:t('mdm.material.rawMaterial'),value:'RAW_MATERIAL'},
                  {label:t('mdm.material.semiFinished'),value:'SEMI_FINISHED'},
                  {label:t('mdm.material.finishedProduct'),value:'FINISHED_PRODUCT'}]" />
              </label>
              <label v-if="action === 'create'"><span>{{ t('mdm.material.batchSource') }} *</span>
                <MomSelect v-model="form.batchTrackingSource" :options="[
                  {label:t('mdm.struct.select'),value:''},
                  {label:t('mdm.material.categoryDefault'),value:'CATEGORY_DEFAULT'},
                  {label:t('mdm.material.explicit'),value:'EXPLICIT'}]" />
              </label>
              <p v-if="action === 'create' && form.batchTrackingSource === 'CATEGORY_DEFAULT'">{{ t('mdm.material.batchDefaultHint') }}</p>
              <label v-if="action === 'edit' || form.batchTrackingSource === 'EXPLICIT'"><span>{{ t('mdm.material.batchPolicy') }} *</span>
                <MomSelect v-model="form.batchTrackingPolicy" :options="[
                  {label:t('mdm.struct.select'),value:''},
                  {label:t('mdm.material.batchNone'),value:'NONE'},
                  {label:t('mdm.material.batchRequiredLabel'),value:'REQUIRED'}]" />
              </label>
              <template v-if="action === 'create'">
                <label><span>{{ t('mdm.material.shelfSource') }}</span>
                  <MomSelect v-model="form.shelfLifeSource" :options="[
                    {label:t('mdm.material.categoryDefault'),value:'CATEGORY_DEFAULT'},
                    {label:t('mdm.material.explicit'),value:'EXPLICIT'}]" />
                </label>
                <p v-if="form.shelfLifeSource === 'CATEGORY_DEFAULT'">{{ t('mdm.material.shelfHint') }}</p>
              </template>
              <label v-if="action === 'edit' || form.shelfLifeSource === 'EXPLICIT'">
                <span>{{ t('mdm.material.shelfLife') }}</span>
                <MomInput v-model="form.shelfLifeDays" type="number" />
              </label>
              <label v-if="action === 'create'"><span>{{ t('mdm.struct.status') }}</span>
                <MomSelect v-model="form.status" :options="[
                  {label:t('mdm.struct.enabled'),value:'ENABLED'},
                  {label:t('mdm.struct.disabled'),value:'DISABLED'}]" />
              </label>
            </template>
            <p v-else class="mdm-plants__warning">{{ t('mdm.material.statusWarning') }}</p>
            <p v-if="formError" id="mdm-material-form-error" class="mdm-plants__field-error" role="alert" tabindex="-1">{{ formError }}</p>
            <div class="mdm-plants__footer">
              <MomButton variant="outline" @click="close">{{ t('mdm.struct.cancel') }}</MomButton>
              <MomButton type="submit" :disabled="saving || blocked || detailLoading || (action !== 'status' && referencesError)">
                {{ t('mdm.struct.confirm') }}
              </MomButton>
            </div>
          </form>
          <div v-else class="mdm-plants__footer"><MomButton variant="outline" @click="close">{{ t('mdm.struct.close') }}</MomButton></div>
        </div>
      </MomModal>
    </section>
  </PageContainer>
</template>
