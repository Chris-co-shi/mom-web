<script setup lang="ts">
import { submitWithFocus } from '../../../shared/ui/focus';
import { computed, onMounted, onScopeDispose, reactive, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, RouterLink } from 'vue-router';
import { FolderTree, Plus, RefreshCw } from '@lucide/vue';
import { AuthorityGuard, hasAuthority } from '../../auth';
import { isApiError } from '../../../shared/api/errors';
import { MomButton, MomInput, MomSelect } from '../../../shared/ui';
import MomManagementHeader from '../../../shared/components/MomManagementHeader.vue';
import MomListSurface from '../../../shared/components/MomListSurface.vue';
import MomDataTable, { type MomColumn } from '../../../shared/components/MomDataTable.vue';
import MomCrudSearch from '../../../shared/components/MomCrudSearch.vue';
import MomCrudPagination from '../../../shared/components/MomCrudPagination.vue';
import MomCrudRowMenu from '../../../shared/components/MomCrudRowMenu.vue';
import MomModal from '../../../shared/components/MomModal.vue';
import PageContainer from '../../../shared/components/PageContainer.vue';
import { formatInstant } from '../../../shared/formatters';
import { useLocale } from '../../../shared/i18n/locale';
import type { MessageKey } from '../../../locales/zh-CN';
import {
  createCatalog, getCatalog, searchCatalog, setCatalogEnabled, updateCatalog,
  type CatalogKind, type CreateCatalogRequest, type MasterRow,
} from '../api/catalog-api';
import { structureCatalogs, type StructureCatalog } from '../model/structure-catalogs';
import './mdm-pages.css';

const props = defineProps<{ kind: Exclude<CatalogKind, 'plants'> }>();
const route = useRoute();
const { t, tForOwner, locale } = useLocale();
const meta = computed<StructureCatalog>(() => structureCatalogs[props.kind]);
const rows = ref<MasterRow[]>([]);
const pageNo = ref(1);
const pageSize = ref(20);
const total = ref(0);
const loading = ref(false);
const saving = ref(false);
const detailLoading = ref(false);
const listError = ref<MessageKey>();
const dialogError = ref<MessageKey>();
const notice = ref<MessageKey>();
const blocked = ref(false);
const referencePending = reactive<Record<string, boolean>>({});
const referenceFailures = reactive<Record<string, boolean>>({});
const referenceVersions: Record<string, number> = {};
const refError = computed(() => meta.value.references.some(field => referenceFailures[field.catalog]));
const referenceLoading = computed(() => Object.values(referencePending).some(Boolean));
const resolvedReferences = reactive<Record<string, MasterRow[]>>({});
const references = reactive<Record<string, MasterRow[]>>({});
const referencePages = reactive<Record<string, number>>({});
const referenceTotals = reactive<Record<string, number>>({});
const filters = reactive<Record<string, string>>({});
const form = reactive<Record<string, string>>({ code: '', name: '', status: 'ENABLED' });
const fieldError = ref(false);
const search = ref('');
const action = ref<'detail' | 'create' | 'edit' | 'status'>();
const target = ref<MasterRow>();
let listRequest: AbortController | undefined;
let detailRequest: AbortController | undefined;
let listSequence = 0;
let detailSequence = 0;
let disposed = false;
const canWrite = computed(() => hasAuthority(`${meta.value.permission}:write`));
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));
const visibleRows = computed(() => {
  const query = search.value.trim().toLowerCase();
  return query ? rows.value.filter(row => `${row.code} ${row.name}`.toLowerCase().includes(query)) : rows.value;
});
const columns = computed<MomColumn[]>(() => [
  { key: 'code', title: t('mdm.struct.code'), minWidth: 170 },
  { key: 'name', title: t('mdm.struct.name'), minWidth: 200 },
  ...meta.value.references.slice(0, 2).map(refField => ({
    key: refField.field, title: t(refField.labelKey), minWidth: 160,
  })),
  { key: 'status', title: t('mdm.struct.status'), width: 110 },
  { key: 'updatedAt', title: t('mdm.struct.updatedAt'), minWidth: 180 },
  { key: 'actions', title: t('mdm.struct.actions'), width: 210, fixed: 'right' as const, resizable: false },
]);
const modalTitle = computed(() => !action.value ? '' : t((
  { detail: 'mdm.struct.detail', create: 'mdm.struct.create', edit: 'mdm.struct.edit',
    status: 'mdm.struct.changeStatus' } as const
)[action.value]));
const activeContext = computed(() => meta.value.references
  .filter(field => field.filterable && filters[field.field])
  .map(field => ({ label: t(field.labelKey), value: referenceText(field.catalog, filters[field.field]) })));

function errorKey(error: unknown, writing = false): MessageKey {
  if (!isApiError(error)) return writing ? 'mdm.struct.unknownWrite' : 'mdm.struct.loadFailed';
  if (writing && (error.resultUnknown || ['network', 'timeout', 'server', 'protocol'].includes(error.kind)))
    return 'mdm.struct.unknownWrite';
  if (error.kind === 'forbidden') return 'mdm.struct.forbidden';
  if (error.kind === 'not_found') return 'mdm.struct.notFound';
  if (error.kind === 'conflict') return 'mdm.struct.conflict';
  if (error.kind === 'validation') return 'mdm.struct.validation';
  return 'mdm.struct.loadFailed';
}

function referenceText(catalog: CatalogKind, value: string | number | undefined | null): string {
  if (!value) return '—';
  const row = [...(references[catalog] ?? []), ...(resolvedReferences[catalog] ?? [])].find(item => item.id === value);
  return row ? `${row.name} (${row.code})` : String(value);
}
function queryParams(): Record<string, string> {
  const result: Record<string, string> = {};
  for (const field of meta.value.references) {
    if (field.filterable && filters[field.field]) result[field.field] = filters[field.field]!;
  }
  return result;
}
async function loadPage(next = pageNo.value, size = pageSize.value): Promise<void> {
  const sequence = ++listSequence;
  listRequest?.abort();
  listRequest = new AbortController();
  loading.value = true;
  rows.value = [];
  listError.value = undefined;
  pageNo.value = next;
  pageSize.value = size;
  try {
    const page = await searchCatalog(props.kind, next, size, queryParams(), listRequest.signal);
    if (disposed || sequence !== listSequence) return;
    if (next > 1 && page.records.length === 0) { await loadPage(next - 1, size); return; }
    rows.value = page.records;
    total.value = page.total;
    pageNo.value = page.pageNo;
  } catch (error) {
    if (!disposed && sequence === listSequence) listError.value = errorKey(error);
  } finally {
    if (sequence === listSequence) loading.value = false;
  }
}

/** 仅请求首个分页；用户可按需继续加载，避免用第一页假装全量引用目录。 */
async function loadReference(kind: CatalogKind, nextPage = 1): Promise<void> {
  const current = referenceVersions[kind] = (referenceVersions[kind] ?? 0) + 1;
  referencePending[kind] = true;
  try {
    const page = await searchCatalog(kind, nextPage, 50);
    if (disposed || current !== referenceVersions[kind]) return;
    references[kind] = nextPage === 1 ? page.records : [...(references[kind] ?? []), ...page.records];
    referencePages[kind] = nextPage;
    referenceTotals[kind] = page.total;
    referenceFailures[kind] = false;
  } catch {
    if (current === referenceVersions[kind]) referenceFailures[kind] = true;
  } finally {
    if (current === referenceVersions[kind]) referencePending[kind] = false;
  }
}
let contextSequence = 0;
async function loadReferences(): Promise<void> {
  const sequence = ++contextSequence;
  const selected = meta.value.references.filter(field => field.filterable && filters[field.field])
    .map(field => ({ kind: field.catalog, id: filters[field.field]! }));
  const kinds = [...new Set(meta.value.references.map(r => r.catalog))];
  await Promise.all(kinds.map(kind => loadReference(kind)));
  await Promise.allSettled(selected.map(async ({ kind, id }) => {
    if (references[kind]?.some(row => row.id === id)) return;
    const row = await getCatalog(kind, id);
    if (!disposed && sequence === contextSequence) {
      resolvedReferences[kind] = [...(resolvedReferences[kind] ?? []).filter(item => item.id !== id), row];
    }
  }));
}
function options(kind: CatalogKind, includeEmpty: boolean): { label: string; value: string }[] {
  const all = [...new Map([...(references[kind] ?? []), ...(resolvedReferences[kind] ?? [])].map(row => [row.id, row])).values()].map(item => ({
    value: item.id, label: `${item.name} (${item.code})`,
  }));
  return includeEmpty ? [{ label: t('mdm.struct.all'), value: '' }, ...all] : all;
}
function initializeFilters(): void {
  for (const key of Object.keys(filters)) delete filters[key];
  for (const f of meta.value.references) {
    if (f.filterable) { const raw = route.query[f.field]; filters[f.field] = typeof raw === 'string' ? raw : ''; }
  }
}
async function readTarget(id: string): Promise<void> {
  const seq = ++detailSequence;
  detailRequest?.abort();
  detailRequest = new AbortController();
  detailLoading.value = true;
  blocked.value = true;
  dialogError.value = undefined;
  try {
    const detail = await getCatalog(props.kind, id, detailRequest.signal);
    if (disposed || seq !== detailSequence) return;
    target.value = detail;
    Object.assign(form, { code: detail.code, name: detail.name, status: detail.status });
    blocked.value = false;
    await Promise.allSettled(meta.value.references.map(async field => {
      const id = detail[field.field as keyof MasterRow];
      if (typeof id !== 'string' || !id) return;
      const resolved = await getCatalog(field.catalog, id, detailRequest?.signal);
      if (!disposed && seq === detailSequence) resolvedReferences[field.catalog] = [resolved];
    }));
    if (disposed || seq !== detailSequence) return;
  } catch (error) {
    if (!disposed && seq === detailSequence) dialogError.value = errorKey(error);
  } finally {
    if (seq === detailSequence) detailLoading.value = false;
  }
}
async function open(next: 'detail' | 'create' | 'edit' | 'status', row?: MasterRow): Promise<void> {
  if (saving.value || (next !== 'detail' && !canWrite.value)) return;
  detailRequest?.abort();
  ++detailSequence;
  action.value = next;
  target.value = row;
  detailLoading.value = false;
  dialogError.value = undefined;
  fieldError.value = false;
  blocked.value = false;
  notice.value = undefined;
  Object.assign(form, { code: row?.code ?? '', name: row?.name ?? '', status: row?.status ?? 'ENABLED' });
  if (next === 'create') {
    for (const refField of meta.value.references) form[refField.field] = filters[refField.field] ?? '';
  } else if (row) {
    await readTarget(row.id);
  }
}
function close(): void {
  if (saving.value) return;
  ++detailSequence;
  detailRequest?.abort();
  action.value = undefined;
  target.value = undefined;
}
function handleMore(key: string, row: MasterRow): void {
  if (key === 'edit' || key === 'status') void open(key, row);
}
function valid(): boolean {
  if (action.value !== 'create' && action.value !== 'edit') return true;
  if (!form.name?.trim() || form.name.length > 200) return false;
  if (action.value === 'create') {
    if (!form.code?.trim() || form.code.length > 64 || refError.value) return false;
    for (const field of meta.value.references) {
      const value = form[field.field] ?? '';
      if (field.required && (!value || value.length > 19)) return false;
      if (!field.required && value.length > 19) return false;
    }
  }
  return true;
}
async function submit(): Promise<void> {
  if (!action.value || action.value === 'detail' || saving.value || blocked.value || !canWrite.value) return;
  fieldError.value = !valid();
  if (fieldError.value) return;
  saving.value = true;
  dialogError.value = undefined;
  const currentAction = action.value;
  try {
    if (currentAction === 'create') {
      const request: CreateCatalogRequest = {
        code: form.code!, name: form.name!, status: form.status === 'DISABLED' ? 'DISABLED' : 'ENABLED',
      };
      for (const field of meta.value.references) {
        // Location.warehouseAreaId 为可选引用；显式 null，禁止将空串存成 ID。
        Object.assign(request, { [field.field]: form[field.field] || (field.required ? undefined : null) });
      }
      await createCatalog(props.kind, request);
    } else if (target.value) {
      if (currentAction === 'edit')
        await updateCatalog(props.kind, target.value.id, { name: form.name!, version: target.value.version });
      else if (currentAction === 'status')
        await setCatalogEnabled(props.kind, target.value.id, target.value.status !== 'ENABLED', target.value.version);
    }
    if (disposed) return;
    action.value = undefined;
    target.value = undefined;
    notice.value = 'mdm.struct.saved';
    await loadPage(currentAction === 'create' ? 1 : pageNo.value);
  } catch (error) {
    if (disposed) return;
    dialogError.value = errorKey(error, true);
    blocked.value = isApiError(error)
      ? error.resultUnknown || ['conflict', 'not_found', 'network', 'timeout', 'server', 'protocol'].includes(error.kind)
      : true;
  } finally {
    saving.value = false;
  }
}
watch(() => [props.kind, route.query] as const, () => {
  ++detailSequence;
  detailRequest?.abort();
  action.value = undefined;
  search.value = '';
  initializeFilters();
  void loadReferences();
  void loadPage(1);
});
onMounted(() => {
  initializeFilters();
  void loadReferences();
  void loadPage();
});
onBeforeRouteLeave(() => !saving.value);
onScopeDispose(() => {
  disposed = true;
  listRequest?.abort();
  detailRequest?.abort();
});
</script>

<template>
  <PageContainer>
    <section class="mdm-plants" :aria-label="t(meta.labelKey)">
      <MomManagementHeader :title-id="`mdm-${kind}-title`" :title="t(meta.labelKey)" :description="t(meta.descriptionKey)">
        <template #actions>
          <MomButton type="button" variant="outline" :disabled="loading || saving" @click="loadPage()">
            <RefreshCw :size="16" aria-hidden="true" />{{ t('mdm.struct.refresh') }}
          </MomButton>
          <AuthorityGuard :authorities="[`${meta.permission}:write`]">
            <MomButton type="button" :disabled="saving || refError" @click="open('create')">
              <Plus :size="16" aria-hidden="true" />{{ t('mdm.struct.create') }}
            </MomButton>
          </AuthorityGuard>
        </template>
      </MomManagementHeader>
      <p v-if="notice" class="mdm-plants__notice" role="status">{{ t(notice) }}</p>
      <div v-if="refError" class="mdm-plants__error" role="alert">
        <p>{{ t('mdm.struct.referenceLoadFailed') }}</p>
        <MomButton type="button" variant="outline" :disabled="referenceLoading" @click="loadReferences()">{{ t('mdm.struct.retry') }}</MomButton>
      </div>
      <div v-if="listError" class="mdm-plants__error" role="alert">
        <p>{{ t(listError) }}</p>
        <MomButton type="button" variant="outline" :disabled="loading" @click="loadPage()">{{ t('mdm.struct.retry') }}</MomButton>
      </div>
      <aside v-if="activeContext.length" class="mdm-context" :aria-label="t('mdm.struct.filterTitle')">
        <FolderTree :size="18" aria-hidden="true" />
        <div class="mdm-context__copy">
          <span>{{ t('mdm.struct.filterTitle') }}</span>
          <strong v-for="item in activeContext" :key="item.label">{{ item.label }} · {{ item.value }}</strong>
        </div>
      </aside>
      <div v-if="meta.references.some(f => f.filterable)" class="mdm-struct__filters" :aria-label="t('mdm.struct.filterTitle')">
        <label v-for="field in meta.references.filter(f => f.filterable)" :key="field.field">
          <span>{{ t(field.labelKey) }}</span>
          <MomSelect :model-value="filters[field.field] ?? ''"
            :options="options(field.catalog, true)" :placeholder="t('mdm.struct.all')"
            :disabled="loading || referenceLoading"
            @update:model-value="filters[field.field] = $event; loadPage(1)" />
        </label>
      </div>
      <MomListSurface v-if="!listError" :title="t(meta.labelKey)" :hint="t('mdm.struct.listHint')"
        :loading="loading" :loading-text="t('mdm.struct.loading')">
        <template #toolbar>
          <div class="mom-management-tools">
            <MomCrudSearch v-model="search" :label="t('mdm.struct.search')" :disabled="loading" />
            <span class="mom-management-scope">{{ t('mdm.struct.searchScope') }}</span>
            <span class="mom-management-count">{{ total }}</span>
          </div>
        </template>
        <MomDataTable :rows="visibleRows" :columns="columns"
          :empty-text="t(loading ? 'mdm.struct.loading' : search ? 'mdm.struct.noMatches' : 'mdm.struct.empty')">
          <template #cell-code="{ row }"><span class="mdm-plants__code">{{ row.code }}</span></template>
          <template v-for="field in meta.references.slice(0, 2)" :key="field.field"
            #[`cell-${field.field}`]="{ row }">
            {{ referenceText(field.catalog, row[field.field]) }}
          </template>
          <template #cell-status="{ row }">
            <span class="mom-management-status" :class="row.status === 'ENABLED' ? 'mom-management-status--enabled' : 'mom-management-status--disabled'">
              <span class="mom-management-status__dot" aria-hidden="true"></span>
              {{ t(row.status === 'ENABLED' ? 'mdm.struct.enabled' : 'mdm.struct.disabled') }}
            </span>
          </template>
          <template #cell-updatedAt="{ row }">{{ formatInstant(row.updatedAt, { locale, dateStyle: 'short', timeStyle: 'short' }) }}</template>
          <template #cell-actions="{ row }">
            <div class="mom-management-row-actions">
              <MomButton type="button" mode="text" :disabled="loading || saving" @click="open('detail', row)">{{ t('mdm.struct.detail') }}</MomButton>
              <RouterLink v-if="meta.childRoute" class="mdm-struct__link"
                :to="{ name: meta.childRoute.name, query: { [meta.childRoute.queryParam]: row.id } }">
                {{ t('mdm.struct.children') }}
              </RouterLink>
              <AuthorityGuard :authorities="[`${meta.permission}:write`]">
                <MomButton v-if="!meta.childRoute" type="button" mode="text" :disabled="loading || saving"
                  @click="open('edit', row)">{{ t('mdm.struct.edit') }}</MomButton>
                <MomCrudRowMenu :label="t('mdm.struct.actions')" :disabled="loading || saving"
                  :actions="[
                    ...(meta.childRoute ? [{ key: 'edit', label: t('mdm.struct.edit') }] : []),
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
            :disabled="loading || saving" @page="loadPage($event)" @size="loadPage(1, $event)" />
        </template>
      </MomListSurface>
      <MomModal :open="!!action" :title="modalTitle" :close-label="tForOwner('system', 'system.common.close')"
        :busy="saving" :busy-text="t('mdm.struct.saving')" @close="close">
        <div class="mdm-plants__dialog">
          <p v-if="detailLoading" role="status">{{ t('mdm.struct.loading') }}</p>
          <div v-if="dialogError" role="alert" class="mdm-plants__error">
            <p>{{ t(dialogError) }}</p>
            <MomButton v-if="target && !saving" type="button" variant="outline" :disabled="detailLoading"
              @click="readTarget(target.id)">{{ t('mdm.struct.retry') }}</MomButton>
          </div>
          <dl v-if="target && !detailLoading" class="mdm-plants__summary">
            <div><dt>{{ t('mdm.struct.code') }}</dt><dd class="mdm-plants__code">{{ target.code }}</dd></div>
            <div><dt>{{ t('mdm.struct.name') }}</dt><dd>{{ target.name }}</dd></div>
            <div v-for="field in meta.references" :key="field.field">
              <dt>{{ t(field.labelKey) }}</dt><dd>{{ referenceText(field.catalog, target[field.field]) }}</dd>
            </div>
            <div><dt>{{ t('mdm.struct.version') }}</dt><dd>{{ target.version }}</dd></div>
            <div><dt>{{ t('mdm.struct.status') }}</dt><dd>{{ t(target.status === 'ENABLED' ? 'mdm.struct.enabled' : 'mdm.struct.disabled') }}</dd></div>
            <div><dt>{{ t('mdm.struct.updatedAt') }}</dt><dd>{{ formatInstant(target.updatedAt, { locale }) }}</dd></div>
            <div v-if="action === 'detail'"><dt>{{ t('mdm.struct.createdAt') }}</dt><dd>{{ formatInstant(target.createdAt, { locale }) }}</dd></div>
          </dl>
          <form v-if="action && action !== 'detail'" class="mdm-plants__form" @submit.prevent="submitWithFocus($event, submit)">
            <template v-if="action !== 'status'">
              <label v-if="action === 'create'">
                <span>{{ t('mdm.struct.code') }} *</span>
                <MomInput id="mdm-structure-code" v-model="form.code" :max-length="64" :disabled="saving"
                  :aria-invalid="fieldError && !form.code.trim()" aria-describedby="mdm-structure-form-error" />
              </label>
              <label>
                <span>{{ t('mdm.struct.name') }} *</span>
                <MomInput id="mdm-structure-name" v-model="form.name" :max-length="200" :disabled="saving || detailLoading"
                  :aria-invalid="fieldError && !form.name.trim()" aria-describedby="mdm-structure-form-error" />
              </label>
              <template v-if="action === 'create'">
                <label v-for="field in meta.references" :key="field.field">
                  <span>{{ t(field.labelKey) }} {{ field.required ? '*' : '' }}</span>
                  <MomSelect :model-value="form[field.field] ?? ''" :options="options(field.catalog, !field.required)"
                    :placeholder="t('mdm.struct.select')" :disabled="saving || referenceLoading || refError"
                    @update:model-value="form[field.field] = $event" />
                  <MomButton v-if="(references[field.catalog]?.length ?? 0) < (referenceTotals[field.catalog] ?? 0)"
                    type="button" variant="outline" :disabled="referenceLoading"
                    @click="loadReference(field.catalog, (referencePages[field.catalog] ?? 1) + 1)">
                    {{ t('mdm.struct.loadMore') }}
                  </MomButton>
                </label>
                <label>
                  <span>{{ t('mdm.struct.status') }}</span>
                  <MomSelect :model-value="form.status ?? 'ENABLED'"
                    :options="[{ value: 'ENABLED', label: t('mdm.struct.enabled') }, { value: 'DISABLED', label: t('mdm.struct.disabled') }]"
                    :disabled="saving" @update:model-value="form.status = $event" />
                </label>
              </template>
              <p v-if="fieldError" id="mdm-structure-form-error" class="mdm-plants__field-error" role="alert" tabindex="-1">{{ t('mdm.struct.validation') }}</p>
            </template>
            <p v-else class="mdm-plants__warning">
              {{ t(kind === 'location-types' ? 'mdm.struct.typeStatusHint' : 'mdm.struct.statusHint') }}
            </p>
            <div class="mdm-plants__footer">
              <MomButton type="button" variant="outline" :disabled="saving" @click="close">{{ tForOwner('system', 'system.common.cancel') }}</MomButton>
              <MomButton type="submit" :disabled="saving || detailLoading || blocked || (action === 'create' && refError)">
                {{ t('mdm.struct.confirm') }}
              </MomButton>
            </div>
          </form>
          <div v-else class="mdm-plants__footer">
            <MomButton type="button" variant="outline" @click="close">{{ tForOwner('system', 'system.common.close') }}</MomButton>
          </div>
        </div>
      </MomModal>
    </section>
  </PageContainer>
</template>
