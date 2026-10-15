<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { ListFilter, Plus, RefreshCw } from '@lucide/vue';
import { MomButton } from '../../../shared/ui';
import MomDataTable, { type MomColumn } from '../../../shared/components/MomDataTable.vue';
import PageContainer from '../../../shared/components/PageContainer.vue';
import MomCrudPagination from '../../../shared/components/MomCrudPagination.vue';
import MomCrudRowMenu from '../../../shared/components/MomCrudRowMenu.vue';
import MomCrudSearch from '../../../shared/components/MomCrudSearch.vue';
import MomManagementHeader from '../../../shared/components/MomManagementHeader.vue';
import MomListSurface from '../../../shared/components/MomListSurface.vue';
import { formatInstant } from '../../../shared/formatters';
import { useLocale } from '../../../shared/i18n/locale';
import { AuthorityGuard, useAuthSession } from '../../auth';
import RoleActionDialog from '../components/RoleActionDialog.vue';
import RolePermissionDialog from '../components/RolePermissionDialog.vue';
import type { RoleResponse } from '../api/roles-api';
import { useRoleManagement } from '../model/use-role-management';
import { useRolePermissionAssignment } from '../model/use-role-permission-assignment';
import './role-management.css';

const { t, locale } = useLocale();
const { authorities } = useAuthSession();
const management = useRoleManagement();
const { rows, pageNo, pageSize, total, loading, listError, writeError, notice, saving, loadPage, open } = management;
const assignment = useRolePermissionAssignment();
const compact = ref(false);
const searchQuery = ref('');
// 当前后端没有角色筛选字段，此处只筛选已经加载的当前页。
const visibleRows = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase();
  return keyword ? rows.value.filter((row) => `${row.code} ${row.name} ${row.description ?? ''}`.toLowerCase().includes(keyword)) : rows.value;
});
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));
const columns = computed<MomColumn[]>(() => [
  { key: 'code', title: t('iam.roles.code'), minWidth: 190 },
  { key: 'name', title: t('iam.roles.name'), minWidth: 180 },
  { key: 'description', title: t('iam.roles.descriptionField'), minWidth: 240 },
  { key: 'enabled', title: t('iam.roles.status'), width: 126 },
  { key: 'updatedAt', title: t('iam.roles.updatedAt'), width: 220 },
  { key: 'actions', title: t('iam.roles.actions'), width: 190, fixed: 'right', resizable: false },
]);
const canAssign = computed(() => authorities.value.includes('auth:permission:read'));

function handleRowMore(action: string, row: RoleResponse): void {
  if (action === 'grant' && canAssign.value) void assignment.openFor(row);
  if (action === 'delete') void open('delete', row);
}

function handleGrantSaved(): void {
  notice.value = { key: 'iam.grants.saved' };
  void loadPage();
}

onMounted(() => loadPage());
onBeforeRouteLeave(() => !saving.value && !assignment.saving.value);
</script>

<template>
  <PageContainer>
    <section class="iam-roles" aria-labelledby="roles-title">
      <MomManagementHeader title-id="roles-title" :title="t('iam.roles.title')" :description="t('iam.roles.description')">
        <template #actions>
          <MomButton class="mom-management-button mom-management-button--secondary" type="button" round :disabled="loading || saving" @click="loadPage()"><RefreshCw :size="16" aria-hidden="true" />{{ t('iam.roles.refresh') }}</MomButton>
          <AuthorityGuard :authorities="['auth:role:write']">
            <MomButton class="mom-management-button mom-management-button--primary" type="button" round :aria-label="t('iam.roles.create')" :disabled="saving || !!writeError" @click="open('create')"><Plus :size="17" aria-hidden="true" />{{ t('iam.roles.create') }}</MomButton>
          </AuthorityGuard>
        </template>
      </MomManagementHeader>
      <p v-if="notice" role="status" class="iam-roles__notice">{{ t(notice.key) }}</p>
      <div v-if="writeError" role="alert" class="iam-role-feedback">
        <p>{{ t(writeError.key) }}</p>
        <small v-if="writeError.correlationId">{{ t('iam.roles.correlation') }}: {{ writeError.correlationId }}</small>
        <MomButton class="iam-role-button iam-role-button--secondary" type="button" round :disabled="loading || saving" @click="loadPage()">{{ t('iam.roles.retry') }}</MomButton>
      </div>
      <div v-if="listError" role="alert" class="iam-role-feedback">
        <p>{{ t(listError.key) }}</p>
        <small v-if="listError.correlationId">{{ t('iam.roles.correlation') }}: {{ listError.correlationId }}</small>
        <MomButton class="iam-role-button iam-role-button--secondary" type="button" round :disabled="loading" @click="loadPage()">{{ t('iam.roles.retry') }}</MomButton>
      </div>
      <MomListSurface v-else :title="t('iam.roles.directory')" :hint="t('iam.roles.listHint')" :loading="loading" :loading-text="t('iam.roles.loadingList')">
        <template #toolbar>
          <div class="mom-management-tools">
            <MomCrudSearch v-model="searchQuery" class="iam-roles__search" :label="t('iam.roles.searchCurrentPage')" :disabled="loading" />
            <span class="mom-management-scope">{{ t('iam.roles.searchScope') }}</span>
            <span class="mom-management-count" role="status">{{ t('iam.roles.total', { total, visible: visibleRows.length }) }}</span>
            <MomButton class="mom-management-density" type="button" :aria-pressed="compact" :disabled="loading" @click="compact = !compact"><ListFilter :size="15" aria-hidden="true" />{{ t(compact ? 'iam.roles.comfortable' : 'iam.roles.compact') }}</MomButton>
          </div>
        </template>
          <MomDataTable class="iam-roles__table" :rows="visibleRows" :columns="columns" :compact="compact"
            :empty-text="t(loading ? 'iam.roles.loadingList' : searchQuery.trim() ? 'iam.roles.noPageMatches' : 'iam.roles.empty')">
            <template #cell-code="{ row }"><span class="iam-roles__code">{{ row.code }}</span></template>
            <template #cell-enabled="{ row }">
                <AuthorityGuard :authorities="['auth:role:write']">
                  <MomButton class="mom-management-status mom-management-status--button" :class="row.enabled ? 'mom-management-status--enabled' : 'mom-management-status--disabled'"
                    type="button" round :disabled="saving || loading || !!writeError" :aria-pressed="row.enabled"
                    :aria-label="t('iam.roles.statusToggleLabel', { code: row.code })" :title="t('iam.roles.statusHint')" @click="open('status', row)">
                    <span class="mom-management-status__dot" aria-hidden="true"></span>{{ t(row.enabled ? 'iam.roles.enabled' : 'iam.roles.disabled') }}
                  </MomButton>
                  <template #fallback><span class="mom-management-status" :class="row.enabled ? 'mom-management-status--enabled' : 'mom-management-status--disabled'"><span class="mom-management-status__dot" aria-hidden="true"></span>{{ t(row.enabled ? 'iam.roles.enabled' : 'iam.roles.disabled') }}</span></template>
                </AuthorityGuard>
            </template>
            <template #cell-updatedAt="{ row }">{{ formatInstant(row.updatedAt, { locale, dateStyle: 'short', timeStyle: 'short' }) }}</template>
            <template #cell-actions="{ row }">
                <div class="mom-management-row-actions">
                  <MomButton class="mom-crud-row-action" mode="text" type="button" :disabled="saving || loading" @click="open('detail', row)">{{ t('iam.roles.detail') }}</MomButton>
                  <AuthorityGuard :authorities="['auth:role:write']">
                    <MomButton class="mom-crud-row-action" mode="text" type="button" :disabled="saving || loading || assignment.saving.value || !!writeError" @click="open('edit', row)">{{ t('iam.roles.edit') }}</MomButton>
                    <MomCrudRowMenu :label="t('iam.roles.moreActions')" :disabled="saving || loading || assignment.saving.value || !!writeError"
                      :actions="[...(canAssign ? [{ key: 'grant', label: t('iam.grants.action') }] : []), { key: 'delete', label: t('iam.roles.delete'), danger: true }]"
                      @select="handleRowMore($event, row)" />
                  </AuthorityGuard>
                </div>
            </template>
          </MomDataTable>
        <template #footer>
          <MomCrudPagination :page-no="pageNo" :page-size="pageSize" :total="total"
          :summary="t('iam.roles.pageSummary', { current: pageNo, pages: pageCount })" :page-size-label="t('iam.roles.pageSize')"
          :previous-label="t('iam.roles.previousPage')" :next-label="t('iam.roles.nextPage')"
          :jump-label="t('iam.roles.jumpPage')" :go-label="t('iam.roles.go')" :disabled="loading || saving"
          @page="loadPage($event)" @size="loadPage(1, $event)" />
        </template>
      </MomListSurface>
      <RoleActionDialog :management="management" />
      <RolePermissionDialog :assignment="assignment" @saved="handleGrantSaved" />
    </section>
  </PageContainer>
</template>
