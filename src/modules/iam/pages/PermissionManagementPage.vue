<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { ListFilter, Plus, RefreshCw } from '@lucide/vue';
import { MomButton, MomInput, MomSelect } from '../../../shared/ui';
import MomDataTable, { type MomColumn } from '../../../shared/components/MomDataTable.vue';
import PageContainer from '../../../shared/components/PageContainer.vue';
import MomCrudPagination from '../../../shared/components/MomCrudPagination.vue';
import MomCrudRowMenu from '../../../shared/components/MomCrudRowMenu.vue';
import MomManagementHeader from '../../../shared/components/MomManagementHeader.vue';
import MomListSurface from '../../../shared/components/MomListSurface.vue';
import { formatInstant } from '../../../shared/formatters';
import { useLocale } from '../../../shared/i18n/locale';
import { AuthorityGuard } from '../../auth';
import PermissionActionDialog from '../components/PermissionActionDialog.vue';
import type { PermissionResponse } from '../api/permissions-api';
import type { PermissionResourceResponse } from '../api/permission-resources-api';
import { usePermissionManagement } from '../model/use-permission-management';
import './permission-management.css';

const props = defineProps<{ resource?: PermissionResourceResponse }>();
const { t, locale } = useLocale();
const management = usePermissionManagement(props.resource);
const { rows, pageNo, pageSize, total, loading, listError, writeError, notice, saving, filters, resources, resourceError, loadPage, loadResources, setFilters, open } = management;
const compact = ref(false);
const searchDraft = ref('');
const domainOptions = computed(() => [...new Set(resources.value.map((item) => item.domainCode))].map((value) => ({ value, label: value })));
const resourceOptions = computed(() => resources.value.filter((item) => !filters.domainCode || item.domainCode === filters.domainCode)
  .map((item) => ({ value: item.id, label: `${item.name} (${item.resourceCode})` })));
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));
const columns = computed<MomColumn[]>(() => [
  ...(!props.resource ? [
    { key: 'domainCode', title: t('iam.permissions.domain'), minWidth: 100 },
    { key: 'resourceName', title: t('iam.permissions.resource'), minWidth: 150 },
  ] : []),
  { key: 'code', title: t('iam.permissions.code'), minWidth: 190 },
  { key: 'actionCode', title: t('iam.permissions.action'), minWidth: 110 },
  { key: 'name', title: t('iam.permissions.name'), minWidth: 180 },
  { key: 'description', title: t('iam.permissions.descriptionField'), minWidth: 240 },
  { key: 'enabled', title: t('iam.permissions.status'), width: 126 },
  { key: 'updatedAt', title: t('iam.permissions.updatedAt'), width: 220 },
  { key: 'actions', title: t('iam.permissions.actions'), width: 190, fixed: 'right', resizable: false },
]);
let searchTimer: ReturnType<typeof setTimeout> | undefined;
function search(keyword: string): void {
  searchDraft.value = keyword;
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => setFilters({ keyword }), 300);
}
function handleRowMore(action: string, row: PermissionResponse): void {
  if (action === 'delete') void open('delete', row);
}

onMounted(() => { void loadPage(); if (!props.resource) void loadResources().catch(() => undefined); });
onBeforeRouteLeave(() => { if (searchTimer) clearTimeout(searchTimer); return !saving.value; });
</script>

<template>
  <component :is="resource ? 'div' : PageContainer" :class="resource ? 'iam-permissions__nested-container' : undefined">
    <section class="iam-permissions" :class="{ 'iam-permissions--embedded': !!resource }" aria-labelledby="permissions-title">
      <MomManagementHeader v-if="!resource" title-id="permissions-title" :title="t('iam.permissions.title')" :description="t('iam.permissions.description')">
        <template #actions>
          <MomButton class="mom-management-button mom-management-button--secondary" type="button" round :disabled="loading || saving" @click="loadPage()"><RefreshCw :size="16" aria-hidden="true" />{{ t('iam.permissions.refresh') }}</MomButton>
          <AuthorityGuard :authorities="['auth:permission:write']">
            <MomButton class="mom-management-button mom-management-button--primary" type="button" round :aria-label="t('iam.permissions.create')" :disabled="saving || !!writeError" @click="open('create')"><Plus :size="17" aria-hidden="true" />{{ t('iam.permissions.create') }}</MomButton>
          </AuthorityGuard>
        </template>
      </MomManagementHeader>
      <div v-else class="iam-permissions__embedded-heading">
        <div class="iam-permissions__resource-identity">
          <span class="iam-permissions__resource-code">{{ resource.domainCode }} / {{ resource.resourceCode }}</span>
          <h2 id="permissions-title" tabindex="-1">{{ resource.name }}</h2>
          <p>{{ resource.description || t('iam.resources.childHint') }}</p>
        </div>
        <div class="iam-permissions__resource-actions">
          <span class="mom-management-status" :class="resource.enabled ? 'mom-management-status--enabled' : 'mom-management-status--disabled'"><span class="mom-management-status__dot" aria-hidden="true"></span>{{ t(resource.enabled ? 'iam.permissions.enabled' : 'iam.permissions.disabled') }}</span>
          <slot name="resourceActions" />
        </div>
      </div>
      <p v-if="notice" role="status" class="iam-permissions__notice">{{ t(notice.key) }}</p>
      <div v-if="writeError" role="alert" class="iam-permission-feedback">
        <p>{{ t(writeError.key) }}</p>
        <small v-if="writeError.correlationId">{{ t('iam.permissions.correlation') }}: {{ writeError.correlationId }}</small>
        <MomButton class="iam-permission-button iam-permission-button--secondary" type="button" round :disabled="loading || saving" @click="loadPage()">{{ t('iam.permissions.retry') }}</MomButton>
      </div>
      <div v-if="listError" role="alert" class="iam-permission-feedback">
        <p>{{ t(listError.key) }}</p>
        <small v-if="listError.correlationId">{{ t('iam.permissions.correlation') }}: {{ listError.correlationId }}</small>
        <MomButton class="iam-permission-button iam-permission-button--secondary" type="button" round :disabled="loading" @click="loadPage()">{{ t('iam.permissions.retry') }}</MomButton>
      </div>
      <div v-if="resourceError" role="alert" class="iam-permission-feedback">
        <p>{{ t(resourceError.key) }}</p>
        <MomButton type="button" round @click="loadResources().catch(() => undefined)">{{ t('iam.permissions.retry') }}</MomButton>
      </div>
      <MomListSurface v-else :title="t(resource ? 'iam.resources.permissionActions' : 'iam.permissions.directory')" :hint="t(resource ? 'iam.resources.childHint' : 'iam.permissions.listHint')" :loading="loading" :loading-text="t('iam.permissions.loadingList')" :embedded="!!resource">
        <template #toolbar>
          <div v-if="resource" class="iam-permissions__actions">
            <MomButton class="mom-management-button mom-management-button--secondary" type="button" round :disabled="loading || saving" @click="loadPage()"><RefreshCw :size="16" aria-hidden="true" />{{ t('iam.permissions.refresh') }}</MomButton>
            <AuthorityGuard :authorities="['auth:permission:write']">
              <MomButton class="mom-management-button mom-management-button--primary" type="button" round :disabled="saving || !!writeError || !resource.enabled" @click="open('create')"><Plus :size="17" aria-hidden="true" />{{ t('iam.permissions.create') }}</MomButton>
            </AuthorityGuard>
          </div>
          <div class="mom-management-tools iam-permissions__tools">
            <MomSelect v-if="!resource" :model-value="filters.domainCode" :options="[{ value: '', label: t('iam.permissions.allDomains') }, ...domainOptions]" :placeholder="t('iam.permissions.domain')" :disabled="loading" @update:model-value="setFilters({ domainCode: String($event) })" />
            <MomSelect v-if="!resource" :model-value="filters.resourceId" :options="[{ value: '', label: t('iam.permissions.allResources') }, ...resourceOptions]" :placeholder="t('iam.permissions.resource')" :disabled="loading" @update:model-value="setFilters({ resourceId: String($event) })" />
            <MomSelect :model-value="filters.enabled" :options="[{ value: '', label: t('iam.permissions.allStatuses') }, { value: 'true', label: t('iam.permissions.enabled') }, { value: 'false', label: t('iam.permissions.disabled') }]" :disabled="loading" @update:model-value="setFilters({ enabled: String($event) })" />
            <MomInput class="iam-permissions__search" type="search" :model-value="searchDraft" :placeholder="t('iam.permissions.searchAll')" :disabled="loading" @update:model-value="search(String($event))" />
            <span class="mom-management-count" role="status">{{ t('iam.permissions.total', { total, visible: rows.length }) }}</span>
            <MomButton class="mom-management-density" type="button" :aria-pressed="compact" :disabled="loading" @click="compact = !compact"><ListFilter :size="15" aria-hidden="true" />{{ t(compact ? 'iam.permissions.comfortable' : 'iam.permissions.compact') }}</MomButton>
          </div>
        </template>
          <MomDataTable class="iam-permissions__table" :rows="rows" :columns="columns" :compact="compact"
            :empty-text="t(loading ? 'iam.permissions.loadingList' : filters.keyword.trim() ? 'iam.permissions.noPageMatches' : 'iam.permissions.empty')">
            <template #cell-code="{ row }"><span class="iam-permissions__code">{{ row.code }}</span></template>
            <template #cell-enabled="{ row }">
                <AuthorityGuard :authorities="['auth:permission:write']">
                  <MomButton class="mom-management-status mom-management-status--button" :class="row.enabled ? 'mom-management-status--enabled' : 'mom-management-status--disabled'"
                    type="button" round :disabled="saving || loading || !!writeError" :aria-pressed="row.enabled"
                    :aria-label="t('iam.permissions.statusToggleLabel', { code: row.code })" :title="t('iam.permissions.statusHint')" @click="open('status', row)">
                    <span class="mom-management-status__dot" aria-hidden="true"></span>{{ t(row.enabled ? 'iam.permissions.enabled' : 'iam.permissions.disabled') }}
                  </MomButton>
                  <template #fallback><span class="mom-management-status" :class="row.enabled ? 'mom-management-status--enabled' : 'mom-management-status--disabled'"><span class="mom-management-status__dot" aria-hidden="true"></span>{{ t(row.enabled ? 'iam.permissions.enabled' : 'iam.permissions.disabled') }}</span></template>
                </AuthorityGuard>
            </template>
            <template #cell-updatedAt="{ row }">{{ formatInstant(row.updatedAt, { locale, dateStyle: 'short', timeStyle: 'short' }) }}</template>
            <template #cell-actions="{ row }">
                <div class="mom-management-row-actions iam-permissions__row-actions">
                  <MomButton class="mom-crud-row-action" mode="text" type="button" :disabled="saving || loading" @click="open('detail', row)">{{ t('iam.permissions.detail') }}</MomButton>
                  <AuthorityGuard :authorities="['auth:permission:write']">
                    <MomButton class="mom-crud-row-action" mode="text" type="button" :disabled="saving || loading || !!writeError" @click="open('edit', row)">{{ t('iam.permissions.edit') }}</MomButton>
                    <MomCrudRowMenu :label="t('iam.permissions.moreActions')" :disabled="saving || loading || !!writeError"
                      :actions="[{ key: 'delete', label: t('iam.permissions.delete'), danger: true }]"
                      @select="handleRowMore($event, row)" />
                  </AuthorityGuard>
                </div>
            </template>
          </MomDataTable>
        <template #footer>
          <MomCrudPagination :page-no="pageNo" :page-size="pageSize" :total="total"
          :summary="t('iam.permissions.pageSummary', { current: pageNo, pages: pageCount })" :page-size-label="t('iam.permissions.pageSize')"
          :previous-label="t('iam.permissions.previousPage')" :next-label="t('iam.permissions.nextPage')"
          :jump-label="t('iam.permissions.jumpPage')" :go-label="t('iam.permissions.go')" :disabled="loading || saving"
          @page="loadPage($event)" @size="loadPage(1, $event)" />
        </template>
      </MomListSurface>
      <PermissionActionDialog :management="management" :fixed-resource="resource" />
    </section>
  </component>
</template>
