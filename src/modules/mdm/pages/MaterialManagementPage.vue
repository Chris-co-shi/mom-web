<script setup lang="ts">
import { computed, onMounted, onScopeDispose, reactive, ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { Plus, RefreshCw } from '@lucide/vue';
import { AuthorityGuard, hasAuthority } from '../../auth';
import { isApiError } from '../../../shared/api/errors';
import { MomButton, MomInput, MomSelect } from '../../../shared/ui';
import MomManagementHeader from '../../../shared/components/MomManagementHeader.vue';
import MomListSurface from '../../../shared/components/MomListSurface.vue';
import MomDataTable, { type MomColumn } from '../../../shared/components/MomDataTable.vue';
import MomCrudPagination from '../../../shared/components/MomCrudPagination.vue';
import MomModal from '../../../shared/components/MomModal.vue';
import PageContainer from '../../../shared/components/PageContainer.vue';
import { useLocale } from '../../../shared/i18n/locale';
import {
  searchMaterials, getMaterial, createMaterial, updateMaterial, setMaterialEnabled,
  searchMaterialCategories, type Material, type MaterialCategory, type MaterialFilter,
} from '../api/material-api';
import { searchUomCatalog, type UomRow } from '../api/uom-api';
import './mdm-pages.css';

const { t } = useLocale();
const rows = ref<Material[]>([]);
const categories = ref<MaterialCategory[]>([]), uoms = ref<UomRow[]>([]);
const categoryPage = ref(1), categoryTotal = ref(0), uomPage = ref(1), uomTotal = ref(0);
const referencesLoading = ref(false), referencesError = ref(false);
const pageNo = ref(1), pageSize = ref(20), total = ref(0), loading = ref(false);
const saving = ref(false), detailLoading = ref(false), blocked = ref(false);
const action = ref<'create' | 'detail' | 'edit' | 'status'>(), target = ref<Material>();
const listError = ref(''), dialogError = ref(''), notice = ref(''), formError = ref('');
const filter = reactive({ keyword:'', categoryId:'', baseUomId:'', status:'' });
const form = reactive({
  code:'', name:'', categoryId:'', baseUomId:'', status:'ENABLED',
  shelfLifeSource:'CATEGORY_DEFAULT', shelfLifeDays:'',
});
let controller: AbortController | undefined, detailController: AbortController | undefined;
let seq = 0, detailSeq = 0, disposed = false;
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));
const columns = computed<MomColumn[]>(() => [
  { key:'code', title:t('mdm.material.materialCode'), minWidth:170 },
  { key:'name', title:t('mdm.struct.name'), minWidth:200 },
  { key:'categoryId', title:t('mdm.material.category'), minWidth:180 },
  { key:'baseUomId', title:t('mdm.material.baseUom'), minWidth:160 },
  { key:'shelfLifeDays', title:t('mdm.material.shelfLife'), minWidth:120 },
  { key:'status', title:t('mdm.struct.status'), width:120 },
  { key:'actions', title:t('mdm.struct.actions'), width:180, fixed:'right', resizable:false },
]);
const categoryOptions = computed(() => [
  { value:'', label:t('mdm.struct.all') },
  ...categories.value.map(x => ({ value:x.id, label:`${x.name} (${x.code})` })),
]);
const activeCategoryOptions = computed(() => [
  { value:'', label:t('mdm.struct.select') },
  ...categories.value.filter(x => x.status === 'ENABLED').map(x => ({ value:x.id, label:`${x.name} (${x.code})` })),
]);
const uomOptions = computed(() => [
  { value:'', label:t('mdm.struct.all') },
  ...uoms.value.map(x => ({value:x.id,label:`${x.name} (${x.code})` })),
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
  referencesLoading.value = true;
  try {
    if (kind === 'categories') {
      const result = await searchMaterialCategories(next, 50, {status:'ENABLED'});
      if (disposed) return;
      categories.value = next === 1 ? result.records : [...categories.value, ...result.records];
      categoryPage.value = next; categoryTotal.value = result.total;
    } else {
      const result = await searchUomCatalog('uoms', next, 50, {status:'ENABLED'});
      if (disposed) return;
      uoms.value = next === 1 ? result.records : [...uoms.value, ...result.records];
      uomPage.value = next; uomTotal.value = result.total;
    }
    referencesError.value = false;
  } catch { referencesError.value = true; }
  finally { referencesLoading.value = false; }
}
function reloadReferences(): void {
  void Promise.all([loadReferences('categories'),loadReferences('uoms')]);
}
function resetForm(value?: Material): void {
  Object.assign(form, {
    code:value?.code ?? '', name:value?.name ?? '',
    categoryId:value?.categoryId ?? '', baseUomId:value?.baseUomId ?? '',
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
    if (!form.name.trim() || form.name.length > 200 || !form.categoryId || !form.baseUomId ||
        next === 'create' && (!form.code.trim() || form.code.length > 64)) {
      formError.value = t('mdm.struct.validation'); return;
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
        shelfLifeSource:source, shelfLifeDays:source === 'CATEGORY_DEFAULT' ? null : dayValue(form.shelfLifeDays),
        status:form.status === 'DISABLED' ? 'DISABLED' : 'ENABLED',
      });
    } else if (target.value) {
      if (next === 'edit') {
        await updateMaterial(target.value.id, {
          name:form.name, categoryId:form.categoryId, baseUomId:form.baseUomId,
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
function displayCategory(id: string): string { return categories.value.find(r=>r.id===id)?.name ?? id; }
function displayUom(id: string): string { return uoms.value.find(r=>r.id===id)?.code ?? id; }
function clearFilters(): void {
  Object.assign(filter, {keyword:'',categoryId:'',baseUomId:'',status:''});
  void loadPage(1);
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
        <p>{{ referencesError ? t('mdm.material.referencesError') : listError }}</p>
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
                <MomButton mode="text" @click="open('status',row)">
                  {{ t(row.status === 'ENABLED' ? 'mdm.struct.disable' : 'mdm.struct.enable') }}
                </MomButton>
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
      <MomModal :open="!!action" :title="t('mdm.material.materials')" :close-label="t('mdm.struct.close')"
        :busy="saving" :busy-text="t('mdm.struct.saving')" @close="close">
        <div class="mdm-plants__dialog">
          <p v-if="detailLoading" role="status">{{ t('mdm.struct.loading') }}</p>
          <div v-if="dialogError" class="mdm-plants__error" role="alert">
            <p>{{ dialogError }}</p>
            <MomButton v-if="target" variant="outline" @click="open(action || 'detail', target)">{{ t('mdm.struct.retry') }}</MomButton>
          </div>
          <dl v-if="target && !detailLoading" class="mdm-plants__summary">
            <div><dt>{{ t('mdm.material.materialCode') }}</dt><dd>{{ target.code }}</dd></div>
            <div><dt>{{ t('mdm.material.category') }}</dt><dd>{{ displayCategory(target.categoryId) }}</dd></div>
            <div><dt>{{ t('mdm.material.baseUom') }}</dt><dd>{{ displayUom(target.baseUomId) }}</dd></div>
            <div><dt>{{ t('mdm.struct.version') }}</dt><dd>{{ target.version }}</dd></div>
          </dl>
          <form v-if="action && action !== 'detail'" class="mdm-plants__form" @submit.prevent="submit">
            <template v-if="action !== 'status'">
              <label v-if="action === 'create'"><span>{{ t('mdm.material.materialCode') }} *</span>
                <MomInput v-model="form.code" :max-length="64" /></label>
              <label><span>{{ t('mdm.struct.name') }} *</span><MomInput v-model="form.name" :max-length="200" /></label>
              <label><span>{{ t('mdm.material.category') }} *</span>
                <MomSelect v-model="form.categoryId" :options="activeCategoryOptions" :disabled="referencesError" />
                <small>{{ t('mdm.material.leafOnly') }}</small>
              </label>
              <label><span>{{ t('mdm.material.baseUom') }} *</span>
                <MomSelect v-model="form.baseUomId" :options="uomOptions" :disabled="referencesError" />
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
            <p v-if="formError" class="mdm-plants__field-error" role="alert">{{ formError }}</p>
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
