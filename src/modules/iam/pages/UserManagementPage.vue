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
import UserActionDialog from '../components/UserActionDialog.vue';
import type { UserResponse } from '../api/users-api';
import { useUserManagement } from '../model/use-user-management';
import './user-management.css';

const { t, locale } = useLocale();
const { userId } = useAuthSession();
const management = useUserManagement();
const { rows, pageNo, pageSize, total, loading, listError, statusError, statusBlocked, notice, saving,
  loadPage, open, toggleEnabled } = management;
const compact = ref(false);
const searchQuery = ref('');
// 后端尚无搜索参数，仅筛选当前已加载页，不能暗示跨页搜索。
const visibleRows = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase();
  return keyword ? rows.value.filter((row) => `${row.username} ${row.displayName}`.toLowerCase().includes(keyword)) : rows.value;
});
const visibleCount = computed(() => visibleRows.value.length);
const columns = computed<MomColumn[]>(() => [
  { key: 'username', title: t('iam.users.username'), minWidth: 210 },
  { key: 'displayName', title: t('iam.users.displayName'), minWidth: 180 },
  { key: 'enabled', title: t('iam.users.status'), width: 126 },
  { key: 'updatedAt', title: t('iam.users.updatedAt'), width: 230 },
  { key: 'actions', title: t('iam.users.actions'), width: 190, fixed: 'right', resizable: false },
]);
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));
function handleRowMore(action: string, row: UserResponse): void {
  if (action === 'password' || action === 'delete') void open(action, row);
}

onMounted(() => loadPage());
onBeforeRouteLeave(() => !saving.value);
</script>

<template>
  <PageContainer>
    <section class="iam-users" aria-labelledby="users-title">
      <MomManagementHeader title-id="users-title" :title="t('iam.users.title')" :description="t('iam.users.description')">
        <template #actions>
          <MomButton class="mom-management-button mom-management-button--secondary" type="button" round :disabled="loading || saving" @click="loadPage()"><RefreshCw :size="16" aria-hidden="true" />{{ t('iam.users.refresh') }}</MomButton>
          <AuthorityGuard :authorities="['auth:user:write']">
            <MomButton class="mom-management-button mom-management-button--primary" type="button" round :aria-label="t('iam.users.create')" :disabled="saving" @click="open('create')"><Plus :size="17" aria-hidden="true" />{{ t('iam.users.create') }}</MomButton>
          </AuthorityGuard>
        </template>
      </MomManagementHeader>
      <p v-if="notice" role="status" class="iam-users__notice">{{ t(notice.key) }}</p>
      <div v-if="statusError" class="iam-users__feedback" role="alert">
        <p>{{ t(statusError.key) }}</p>
        <small v-if="statusError.correlationId">{{ t('iam.users.correlation') }}: {{ statusError.correlationId }}</small>
        <MomButton v-if="statusBlocked" class="iam-button iam-button--secondary" type="button" :disabled="loading || saving" @click="loadPage()">{{ t('iam.users.retry') }}</MomButton>
      </div>
      <div v-if="listError" class="iam-users__feedback" role="alert">
        <p>{{ t(listError.key) }}</p>
        <small v-if="listError.correlationId">{{ t('iam.users.correlation') }}: {{ listError.correlationId }}</small>
        <MomButton class="iam-button iam-button--secondary" type="button" round :disabled="loading" @click="loadPage()">{{ t('iam.users.retry') }}</MomButton>
      </div>
      <MomListSurface v-else :title="t('iam.users.directory')" :hint="t('iam.users.listHint')" :loading="loading" :loading-text="t('iam.users.loadingList')">
        <template #toolbar>
          <div class="mom-management-tools">
            <MomCrudSearch v-model="searchQuery" class="iam-users__search" :label="t('iam.users.searchCurrentPage')" :disabled="loading" />
            <span class="mom-management-scope">{{ t('iam.users.searchScope') }}</span>
            <span class="mom-management-count" role="status">{{ t('iam.users.total', { total, visible: visibleCount }) }}</span>
            <MomButton class="mom-management-density" type="button" :aria-pressed="compact" :disabled="loading" @click="compact = !compact"><ListFilter :size="15" aria-hidden="true" />{{ t(compact ? 'iam.users.comfortable' : 'iam.users.compact') }}</MomButton>
          </div>
        </template>
          <MomDataTable class="iam-users__table" :rows="visibleRows" :columns="columns" :compact="compact"
            :empty-text="t(loading ? 'iam.users.loading' : searchQuery.trim() ? 'iam.users.noPageMatches' : 'iam.users.empty')">
              <template #cell-username="{ row }">
                <span class="iam-users__login">{{ row.username }}</span>
                <span v-if="row.id === userId" class="iam-users__self">{{ t('iam.users.self') }}</span>
              </template>
              <template #cell-enabled="{ row }">
                <AuthorityGuard :authorities="['auth:user:write']">
                  <MomButton class="mom-management-status mom-management-status--button" :class="row.enabled ? 'mom-management-status--enabled' : 'mom-management-status--disabled'"
                    type="button" :disabled="saving || loading || statusBlocked" :aria-pressed="row.enabled"
                    :aria-label="t('iam.users.statusToggleLabel', { username: row.username, action: t(row.enabled ? 'iam.users.disable' : 'iam.users.enable') })"
                    :title="t('iam.users.statusInstantHint')" @click="toggleEnabled(row)">
                    <span class="mom-management-status__dot" aria-hidden="true"></span>{{ t(row.enabled ? 'iam.users.enabled' : 'iam.users.disabled') }}
                  </MomButton>
                  <template #fallback><span class="mom-management-status" :class="row.enabled ? 'mom-management-status--enabled' : 'mom-management-status--disabled'"><span class="mom-management-status__dot" aria-hidden="true"></span>{{ t(row.enabled ? 'iam.users.enabled' : 'iam.users.disabled') }}</span></template>
                </AuthorityGuard>
              </template>
              <template #cell-updatedAt="{ row }">{{ formatInstant(row.updatedAt, { locale, dateStyle: 'short', timeStyle: 'short' }) }}</template>
              <template #cell-actions="{ row }">
                <div class="mom-management-row-actions">
                  <MomButton class="mom-crud-row-action" mode="text" type="button" :disabled="saving || loading" @click="open('detail', row)">{{ t('iam.users.detail') }}</MomButton>
                  <AuthorityGuard :authorities="['auth:user:write']">
                    <MomButton class="mom-crud-row-action" mode="text" type="button" :disabled="saving || loading" @click="open('edit', row)">{{ t('iam.users.edit') }}</MomButton>
                    <MomCrudRowMenu :label="t('iam.users.moreActions')" :disabled="saving || loading"
                      :actions="[{ key: 'password', label: t('iam.users.resetPassword') }, { key: 'delete', label: t('iam.users.delete'), danger: true }]"
                      @select="handleRowMore($event, row)" />
                  </AuthorityGuard>
                </div>
              </template>
          </MomDataTable>
        <template #footer>
          <MomCrudPagination :page-no="pageNo" :page-size="pageSize" :total="total"
          :summary="t('iam.users.pageSummary', { current: pageNo, pages: pageCount })" :page-size-label="t('iam.users.pageSize')"
          :previous-label="t('iam.users.previousPage')" :next-label="t('iam.users.nextPage')"
          :jump-label="t('iam.users.jumpPage')" :go-label="t('iam.users.go')" :disabled="loading || saving"
          @page="loadPage($event)" @size="loadPage(1, $event)" />
        </template>
      </MomListSurface>
      <UserActionDialog :management="management" />
    </section>
  </PageContainer>
</template>
