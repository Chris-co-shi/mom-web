<script setup lang="ts">
import { computed, onMounted, onScopeDispose, reactive, ref } from 'vue';
import { submitWithFocus } from '../../../shared/ui/focus';
import { onBeforeRouteLeave } from 'vue-router';
import { FolderTree, Plus, RefreshCw } from '@lucide/vue';
import { AuthorityGuard, hasAuthority } from '../../auth';
import { isApiError } from '../../../shared/api/errors';
import { MomButton, MomInput, MomSelect } from '../../../shared/ui';
import MomManagementHeader from '../../../shared/components/MomManagementHeader.vue';
import MomListSurface from '../../../shared/components/MomListSurface.vue';
import MomDataTable, { type MomColumn } from '../../../shared/components/MomDataTable.vue';
import MomCrudPagination from '../../../shared/components/MomCrudPagination.vue';
import MomCrudSearch from '../../../shared/components/MomCrudSearch.vue';
import MomCrudRowMenu from '../../../shared/components/MomCrudRowMenu.vue';
import MomModal from '../../../shared/components/MomModal.vue';
import PageContainer from '../../../shared/components/PageContainer.vue';
import { useLocale } from '../../../shared/i18n/locale';
import {
  searchMaterialCategories, getMaterialCategory, createMaterialCategory,
  updateMaterialCategory, setMaterialCategoryEnabled, type MaterialCategory,
} from '../api/material-api';
import './mdm-pages.css';

const { t, tForOwner } = useLocale();
const rows = ref<MaterialCategory[]>([]);
const pageNo = ref(1), pageSize = ref(20), total = ref(0);
const loading = ref(false), saving = ref(false), detailLoading = ref(false);
const listError = ref(''), dialogError = ref(''), formError = ref(''), notice = ref('');
const blocked = ref(false), optionError = ref(false), optionLoading = ref(false);
const search = ref(''), parentFilter = ref(''), statusFilter = ref('');
const options = ref<MaterialCategory[]>([]), optionPage = ref(1), optionTotal = ref(0);
const action = ref<'create' | 'detail' | 'edit' | 'status'>(), target = ref<MaterialCategory>();
const form = reactive({ code: '', name: '', parentId: '', sort: '0', defaultShelfLifeDays: '',
  defaultBatchTrackingPolicy: '', status: 'ENABLED' });
let controller: AbortController | undefined, detailController: AbortController | undefined;
let seq = 0, detailSeq = 0, disposed = false;
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));
const visible = computed(() => {
  const q = search.value.trim().toLowerCase();
  return q ? rows.value.filter(r => `${r.code} ${r.name}`.toLowerCase().includes(q)) : rows.value;
});
const columns = computed<MomColumn[]>(() => [
  { key: 'code', title: t('mdm.struct.code'), minWidth: 170 },
  { key: 'name', title: t('mdm.struct.name'), minWidth: 180 },
  { key: 'parentId', title: t('mdm.material.parent'), minWidth: 155 },
  { key: 'sort', title: t('mdm.material.sort'), width: 90 },
  { key: 'defaultShelfLifeDays', title: t('mdm.material.defaultShelfLife'), minWidth: 180 },
  { key: 'defaultBatchTrackingPolicy', title: t('mdm.material.defaultBatchPolicy'), minWidth: 180 },
  { key: 'status', title: t('mdm.struct.status'), width: 110 },
  { key: 'actions', title: t('mdm.struct.actions'), width: 270, fixed: 'right', resizable: false },
]);
const resolvedParent = ref<MaterialCategory>();
const knownOptions = computed(() => [...new Map([...options.value, ...(resolvedParent.value ? [resolvedParent.value] : [])].map(row => [row.id, row])).values()]);
const parentOptions = computed(() => [
  { label: t('mdm.material.root'), value: '' },
  ...knownOptions.value.filter(r => (r.status === 'ENABLED' || r.id === form.parentId) && r.id !== target.value?.id)
    .map(r => ({ value: r.id, label: `${r.name} (${r.code})` })),
]);
const parentName = (id: string | null) => id ? (knownOptions.value.find(x => x.id === id)?.name ?? id) : t('mdm.material.root');
const modalTitle = computed(() => !action.value ? '' : `${t('mdm.material.categories')} · ${t(({
  create: 'mdm.struct.create', detail: 'mdm.struct.detail', edit: 'mdm.struct.edit', status: 'mdm.struct.changeStatus',
} as const)[action.value])}`);
const directoryHistory = ref<{ parent: string; page: number; search: string }[]>([]);
function enterCategory(row: MaterialCategory): void {
  directoryHistory.value.push({ parent: parentFilter.value, page: pageNo.value, search: search.value });
  parentFilter.value = row.id; search.value = ''; void loadPage(1);
}
function backDirectory(): void {
  const previous = directoryHistory.value.pop();
  parentFilter.value = previous?.parent ?? ''; search.value = previous?.search ?? ''; void loadPage(previous?.page ?? 1);
}
const currentParent = computed(() => parentFilter.value ? parentName(parentFilter.value) : t('mdm.material.allCategories'));
const feedback = (error: unknown, writing = false): string => {
  if (!isApiError(error)) return t(writing ? 'mdm.struct.unknownWrite' : 'mdm.struct.loadFailed');
  if (writing && (error.resultUnknown || ['network','timeout','server','protocol'].includes(error.kind)))
    return t('mdm.struct.unknownWrite');
  if (error.kind === 'forbidden') return t('mdm.struct.forbidden');
  if (error.kind === 'not_found') return t('mdm.struct.notFound');
  if (error.kind === 'conflict') return t('mdm.struct.conflict');
  if (error.kind === 'validation') return t('mdm.struct.validation');
  return t('mdm.struct.loadFailed');
};
async function loadPage(next = pageNo.value, size = pageSize.value): Promise<void> {
  const current = ++seq; controller?.abort(); controller = new AbortController();
  loading.value = true; listError.value = ''; rows.value = [];
  pageNo.value = next; pageSize.value = size;
  try {
    const params = { ...(parentFilter.value ? { parentId: parentFilter.value } : {}),
      ...(statusFilter.value ? { status: statusFilter.value } : {}) };
    const page = await searchMaterialCategories(next, size, params, controller.signal);
    if (disposed || current !== seq) return;
    if (next > 1 && !page.records.length) { await loadPage(next - 1, size); return; }
    rows.value = page.records; pageNo.value = page.pageNo; total.value = page.total;
  } catch (error) {
    if (!disposed && current === seq) listError.value = feedback(error);
  } finally { if (current === seq) loading.value = false; }
}
async function loadOptions(next = 1): Promise<void> {
  optionLoading.value = true;
  try {
    const page = await searchMaterialCategories(next, 50);
    if (disposed) return;
    options.value = next === 1 ? page.records : [...options.value, ...page.records];
    optionPage.value = next; optionTotal.value = page.total; optionError.value = false;
  } catch { optionError.value = true; }
  finally { optionLoading.value = false; }
}
function resetForm(row?: MaterialCategory): void {
  Object.assign(form, { code: row?.code ?? '', name: row?.name ?? '',
    parentId: row?.parentId ?? '', sort: String(row?.sort ?? 0),
    defaultShelfLifeDays: row?.defaultShelfLifeDays == null ? '' : String(row.defaultShelfLifeDays),
    defaultBatchTrackingPolicy: row?.defaultBatchTrackingPolicy ?? '',
    status: row?.status ?? 'ENABLED' });
}
async function open(next: 'create' | 'detail' | 'edit' | 'status', row?: MaterialCategory): Promise<void> {
  if (saving.value || (next !== 'detail' && !hasAuthority('mdm:material:write'))) return;
  ++detailSeq; detailController?.abort();
  action.value = next; target.value = row; blocked.value = false; dialogError.value = ''; formError.value = '';
  resetForm(row);
  if (!row) return;
  const current = ++detailSeq; detailLoading.value = true; blocked.value = true;
  detailController = new AbortController();
  try {
    const detail = await getMaterialCategory(row.id, detailController.signal);
    if (disposed || current !== detailSeq) return;
    const parent = detail.parentId ? await getMaterialCategory(detail.parentId, detailController.signal) : undefined;
    if (disposed || current !== detailSeq) return;
    resolvedParent.value = parent;
    target.value = detail; resetForm(detail); blocked.value = false;
  } catch (error) { if (!disposed && current === detailSeq) dialogError.value = feedback(error); }
  finally { if (current === detailSeq) detailLoading.value = false; }
}
function close(): void {
  if (saving.value) return;
  ++detailSeq; detailController?.abort(); action.value = undefined; target.value = undefined;
}
function handleMore(key: string, row: MaterialCategory): void {
  if (key === 'edit' || key === 'status') void open(key, row);
}
function validate(): boolean {
  if (action.value === 'status') return true;
  if (!form.name.trim() || form.name.length > 200 ||
      (action.value === 'create' && (!form.code.trim() || form.code.length > 64))) {
    formError.value = t('mdm.struct.validation'); return false;
  }
  if (!/^-?\d+$/.test(form.sort)) { formError.value = t('mdm.material.invalidSort'); return false; }
  if (form.defaultShelfLifeDays && (!/^\d+$/.test(form.defaultShelfLifeDays) ||
      !Number.isSafeInteger(Number(form.defaultShelfLifeDays)))) {
    formError.value = t('mdm.material.invalidDays'); return false;
  }
  return true;
}
async function submit(): Promise<void> {
  if (!action.value || action.value === 'detail' || saving.value || blocked.value ||
      (optionError.value && action.value !== 'status') || !hasAuthority('mdm:material:write')) return;
  formError.value = ''; if (!validate()) return;
  saving.value = true; dialogError.value = '';
  const currentAction = action.value;
  const days = form.defaultShelfLifeDays === '' ? null : Number(form.defaultShelfLifeDays);
  try {
    if (currentAction === 'create') {
      await createMaterialCategory({ code: form.code, name: form.name, parentId: form.parentId || null,
        sort: Number(form.sort), defaultShelfLifeDays: days,
        defaultBatchTrackingPolicy: form.defaultBatchTrackingPolicy === '' ? null
          : form.defaultBatchTrackingPolicy as 'NONE' | 'REQUIRED',
        status: form.status === 'DISABLED' ? 'DISABLED' : 'ENABLED' });
    } else if (target.value) {
      if (currentAction === 'edit') {
        await updateMaterialCategory(target.value.id, { name: form.name, parentId: form.parentId || null,
          sort: Number(form.sort), defaultShelfLifeDays: days,
          defaultBatchTrackingPolicy: form.defaultBatchTrackingPolicy === '' ? null
            : form.defaultBatchTrackingPolicy as 'NONE' | 'REQUIRED', version: target.value.version });
      } else {
        await setMaterialCategoryEnabled(target.value.id, target.value.status !== 'ENABLED', target.value.version);
      }
    }
    if (disposed) return;
    action.value = undefined; target.value = undefined; notice.value = t('mdm.struct.saved');
    await loadPage(currentAction === 'create' ? 1 : pageNo.value);
    await loadOptions();
  } catch (error) {
    if (disposed) return;
    dialogError.value = feedback(error, true);
    blocked.value = isApiError(error)
      ? error.resultUnknown || ['conflict','not_found','network','timeout','server','protocol'].includes(error.kind)
      : true;
  } finally { saving.value = false; }
}
onMounted(() => { void loadPage(); void loadOptions(); });
onBeforeRouteLeave(() => !saving.value);
onScopeDispose(() => { disposed = true; controller?.abort(); detailController?.abort(); });
</script>

<template>
  <PageContainer>
    <section class="mdm-plants" aria-labelledby="mdm-category-title">
      <MomManagementHeader title-id="mdm-category-title" :title="t('mdm.material.categories')"
        :description="t('mdm.material.categoryDescription')">
        <template #actions>
          <MomButton variant="outline" :disabled="loading || saving" @click="loadPage()">
            <RefreshCw :size="16" aria-hidden="true" />{{ t('mdm.struct.refresh') }}
          </MomButton>
          <AuthorityGuard :authorities="['mdm:material:write']">
            <MomButton :disabled="saving || optionError" @click="open('create')">
              <Plus :size="16" aria-hidden="true" />{{ t('mdm.struct.create') }}
            </MomButton>
          </AuthorityGuard>
        </template>
      </MomManagementHeader>
      <p v-if="notice" class="mdm-plants__notice" role="status">{{ notice }}</p>
      <div v-if="optionError || listError" class="mdm-plants__error" role="alert">
        <p v-if="listError">{{ listError }}</p>
        <p v-if="optionError">{{ t('mdm.material.referencesError') }}</p>
        <MomButton variant="outline" @click="loadOptions(); loadPage()">{{ t('mdm.struct.retry') }}</MomButton>
      </div>
      <aside class="mdm-context" :aria-label="t('mdm.material.parent')">
        <FolderTree :size="18" aria-hidden="true" />
        <div class="mdm-context__copy">
          <span>{{ t('mdm.material.parent') }}</span>
          <strong>{{ currentParent }}</strong>
        </div>
        <MomButton v-if="parentFilter" variant="outline" @click="backDirectory">{{ t('mdm.struct.back') }}</MomButton>
      </aside>
      <div class="mdm-struct__filters">
        <label><span>{{ t('mdm.material.parent') }}</span>
          <MomSelect v-model="parentFilter" :options="[{label: t('mdm.struct.all'), value:''},...options.map(r => ({label:r.name,value:r.id}))]"
            @update:model-value="directoryHistory = []; loadPage(1)" />
        </label>
        <label><span>{{ t('mdm.material.statusFilter') }}</span>
          <MomSelect v-model="statusFilter" :options="[{label:t('mdm.struct.all'),value:''},
            {label:t('mdm.struct.enabled'),value:'ENABLED'},{label:t('mdm.struct.disabled'),value:'DISABLED'}]"
            @update:model-value="loadPage(1)" />
        </label>
        <MomButton v-if="options.length < optionTotal" variant="outline" :disabled="optionLoading"
          @click="loadOptions(optionPage+1)">{{ t('mdm.struct.loadMore') }}</MomButton>
      </div>
      <MomListSurface v-if="!listError" :title="t('mdm.material.categories')" :hint="t('mdm.struct.listHint')"
        :loading="loading" :loading-text="t('mdm.struct.loading')">
        <template #toolbar><MomCrudSearch v-model="search" :label="t('mdm.struct.search')" /></template>
        <MomDataTable :rows="visible" :columns="columns" :empty-text="t('mdm.material.noData')">
          <template #cell-code="{ row }"><span class="mdm-plants__code">{{ row.code }}</span></template>
          <template #cell-parentId="{ row }">{{ parentName(row.parentId) }}</template>
          <template #cell-defaultShelfLifeDays="{ row }">{{ row.defaultShelfLifeDays ?? '—' }}</template>
          <template #cell-defaultBatchTrackingPolicy="{ row }">{{ row.defaultBatchTrackingPolicy === 'REQUIRED'
            ? t('mdm.material.batchRequiredLabel') : row.defaultBatchTrackingPolicy === 'NONE'
              ? t('mdm.material.batchNone') : '—' }}</template>
          <template #cell-status="{ row }">
            <span class="mom-management-status" :class="row.status === 'ENABLED' ? 'mom-management-status--enabled' : 'mom-management-status--disabled'">
              <span class="mom-management-status__dot" aria-hidden="true"></span>
              {{ t(row.status === 'ENABLED' ? 'mdm.struct.enabled' : 'mdm.struct.disabled') }}
            </span>
          </template>
          <template #cell-actions="{ row }">
            <div class="mom-management-row-actions">
              <MomButton mode="text" @click="open('detail', row)">{{ t('mdm.struct.detail') }}</MomButton>
              <MomButton mode="text" @click="enterCategory(row)">{{ t('mdm.struct.children') }}</MomButton>
              <AuthorityGuard :authorities="['mdm:material:write']">
                <MomCrudRowMenu :label="t('mdm.struct.actions')" :actions="[
                  { key: 'edit', label: t('mdm.struct.edit') },
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
            :jump-label="t('mdm.struct.jump')" :go-label="t('mdm.struct.go')"
            :disabled="loading || saving" @page="loadPage($event)" @size="loadPage(1,$event)" />
        </template>
      </MomListSurface>
      <MomModal :open="!!action" :title="modalTitle" :close-label="tForOwner('system', 'system.common.close')"
        :busy="saving" :busy-text="t('mdm.struct.saving')" @close="close">
        <div class="mdm-plants__dialog">
          <p v-if="detailLoading" role="status">{{ t('mdm.struct.loading') }}</p>
          <div v-if="dialogError" class="mdm-plants__error" role="alert">
            <p>{{ dialogError }}</p>
            <MomButton v-if="target" variant="outline" @click="open(action || 'detail', target)">{{ t('mdm.struct.retry') }}</MomButton>
          </div>
          <dl v-if="target && !detailLoading" class="mdm-plants__summary">
            <div><dt>{{ t('mdm.struct.code') }}</dt><dd>{{ target.code }}</dd></div>
            <div><dt>{{ t('mdm.struct.name') }}</dt><dd>{{ target.name }}</dd></div>
            <div><dt>{{ t('mdm.material.parent') }}</dt><dd>{{ parentName(target.parentId) }}</dd></div>
            <div><dt>{{ t('mdm.material.sort') }}</dt><dd>{{ target.sort }}</dd></div>
            <div><dt>{{ t('mdm.material.defaultShelfLife') }}</dt><dd>{{ target.defaultShelfLifeDays ?? '—' }}</dd></div>
            <div><dt>{{ t('mdm.material.defaultBatchPolicy') }}</dt><dd>{{ target.defaultBatchTrackingPolicy === 'REQUIRED'
              ? t('mdm.material.batchRequiredLabel') : target.defaultBatchTrackingPolicy === 'NONE'
                ? t('mdm.material.batchNone') : '—' }}</dd></div>
            <div><dt>{{ t('mdm.struct.status') }}</dt><dd>{{ t(target.status === 'ENABLED' ? 'mdm.struct.enabled' : 'mdm.struct.disabled') }}</dd></div>
            <div><dt>{{ t('mdm.struct.version') }}</dt><dd>{{ target.version }}</dd></div>
          </dl>
          <form v-if="action && action !== 'detail'" class="mdm-plants__form" @submit.prevent="submitWithFocus($event, submit)">
            <template v-if="action !== 'status'">
              <label v-if="action === 'create'"><span>{{ t('mdm.struct.code') }} *</span>
                <MomInput id="mdm-category-code" v-model="form.code" :max-length="64"
                  :aria-invalid="!!formError && !form.code.trim()" aria-describedby="mdm-category-form-error" />
              </label>
              <label><span>{{ t('mdm.struct.name') }} *</span><MomInput id="mdm-category-name" v-model="form.name" :max-length="200"
                :aria-invalid="!!formError && !form.name.trim()" aria-describedby="mdm-category-form-error" /></label>
              <label><span>{{ t('mdm.material.parent') }}</span>
                <MomSelect v-model="form.parentId" :options="parentOptions" :disabled="optionError || optionLoading" />
                <MomButton v-if="options.length < optionTotal" variant="outline" :disabled="optionLoading"
                  @click="loadOptions(optionPage+1)">{{ t('mdm.struct.loadMore') }}</MomButton>
              </label>
              <div class="mdm-struct__form-grid">
                <label><span>{{ t('mdm.material.sort') }} *</span><MomInput v-model="form.sort" type="number" /></label>
                <label><span>{{ t('mdm.material.defaultShelfLife') }}</span>
                  <MomInput v-model="form.defaultShelfLifeDays" type="number" />
                </label>
              </div>
              <label><span>{{ t('mdm.material.defaultBatchPolicy') }}</span>
                <MomSelect v-model="form.defaultBatchTrackingPolicy" :options="[
                  {label:t('mdm.material.noDefault'),value:''},
                  {label:t('mdm.material.batchNone'),value:'NONE'},
                  {label:t('mdm.material.batchRequiredLabel'),value:'REQUIRED'}]" />
              </label>
              <label v-if="action === 'create'"><span>{{ t('mdm.struct.status') }}</span>
                <MomSelect v-model="form.status" :options="[{label:t('mdm.struct.enabled'),value:'ENABLED'},
                  {label:t('mdm.struct.disabled'),value:'DISABLED'}]" />
              </label>
            </template>
            <p v-else class="mdm-plants__warning">{{ t(target?.status === 'ENABLED' ? 'mdm.material.cascadeWarning' : 'mdm.struct.statusHint') }}</p>
            <p v-if="formError" id="mdm-category-form-error" class="mdm-plants__field-error" role="alert" tabindex="-1">{{ formError }}</p>
            <div class="mdm-plants__footer">
              <MomButton variant="outline" @click="close">{{ tForOwner('system', 'system.common.cancel') }}</MomButton>
              <MomButton type="submit" :disabled="saving || blocked || detailLoading || (action !== 'status' && optionError)">
                {{ t('mdm.struct.confirm') }}
              </MomButton>
            </div>
          </form>
          <div v-else class="mdm-plants__footer">
            <MomButton variant="outline" @click="close">{{ tForOwner('system', 'system.common.close') }}</MomButton>
          </div>
        </div>
      </MomModal>
    </section>
  </PageContainer>
</template>
