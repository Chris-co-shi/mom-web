<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { ListFilter, Plus, RefreshCw } from '@lucide/vue';
import { AuthorityGuard } from '../../auth';
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
import type { PlantView } from '../api/factory-api';
import { usePlantManagement, type PlantAction } from '../model/use-plant-management';
import './mdm-pages.css';

const { t, locale } = useLocale();
const management = usePlantManagement();
const { rows, pageNo, pageSize, total, loading, saving, detailLoading, listError, dialogError,
  notice, blocked, action, target, form, fieldError, canSubmit, loadPage, open, close, reloadTarget, submit } = management;
const search = ref('');
const compact = ref(false);
const visibleRows = computed(() => {
  const query = search.value.trim().toLocaleLowerCase();
  return query ? rows.value.filter(row => `${row.code} ${row.name}`.toLocaleLowerCase().includes(query)) : rows.value;
});
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));
const pageSummary = computed(() => `${pageNo.value} / ${pageCount.value}`);
const columns = computed<MomColumn[]>(() => [
  { key: 'code', title: t('mdm.plants.code'), minWidth: 180 },
  { key: 'name', title: t('mdm.plants.name'), minWidth: 200 },
  { key: 'status', title: t('mdm.plants.status'), width: 122 },
  { key: 'updatedAt', title: t('mdm.plants.updatedAt'), minWidth: 200 },
  { key: 'actions', title: t('mdm.plants.actions'), width: 190, fixed: 'right', resizable: false },
]);
const titles: Record<PlantAction, MessageKey> = {
  detail: 'mdm.plants.detail', create: 'mdm.plants.create',
  edit: 'mdm.plants.edit', status: 'mdm.plants.changeStatus',
};
const modalTitle = computed(() => action.value ? t(titles[action.value]) : '');
function handleMore(key: string, row: PlantView): void {
  if (key === 'status') void open('status', row);
}
onMounted(() => { void loadPage(); });
onBeforeRouteLeave(() => !saving.value);
</script>

<template>
  <PageContainer>
    <section aria-labelledby="mdm-plants-title" class="mdm-plants">
      <MomManagementHeader title-id="mdm-plants-title" :title="t('mdm.plants.title')"
        :description="t('mdm.plants.description')">
        <template #actions>
          <MomButton type="button" variant="outline" :disabled="loading || saving" @click="loadPage()">
            <RefreshCw :size="16" aria-hidden="true" />{{ t('mdm.plants.refresh') }}
          </MomButton>
          <AuthorityGuard :authorities="['mdm:factory:write']">
            <MomButton type="button" :disabled="saving" @click="open('create')">
              <Plus :size="16" aria-hidden="true" />{{ t('mdm.plants.create') }}
            </MomButton>
          </AuthorityGuard>
        </template>
      </MomManagementHeader>

      <p v-if="notice" class="mdm-plants__notice" role="status">{{ t(notice.key) }}</p>
      <div v-if="listError" class="mdm-plants__error" role="alert">
        <p>{{ t(listError.key) }}</p>
        <small v-if="listError.correlationId">{{ t('mdm.plants.correlation') }}: {{ listError.correlationId }}</small>
        <MomButton type="button" variant="outline" :disabled="loading || saving" @click="loadPage()">{{ t('mdm.plants.retry') }}</MomButton>
      </div>

      <MomListSurface v-else :title="t('mdm.plants.directory')" :hint="t('mdm.plants.listHint')"
        :loading="loading" :loading-text="t('mdm.plants.loading')">
        <template #toolbar>
          <div class="mom-management-tools">
            <MomCrudSearch v-model="search" :label="t('mdm.plants.search')" :disabled="loading" />
            <span class="mom-management-scope">{{ t('mdm.plants.searchScope') }}</span>
            <span class="mom-management-count" role="status">
              {{ t('mdm.plants.total') }}: {{ total }} · {{ t('mdm.plants.visible') }}: {{ visibleRows.length }}
            </span>
            <MomButton class="mom-management-density" type="button" :aria-pressed="compact"
              :disabled="loading" @click="compact = !compact">
              <ListFilter :size="15" aria-hidden="true" />{{ t(compact ? 'mdm.plants.comfortable' : 'mdm.plants.compact') }}
            </MomButton>
          </div>
        </template>

        <MomDataTable :rows="visibleRows" :columns="columns" :compact="compact"
          :empty-text="t(loading ? 'mdm.plants.loading' : search.trim() ? 'mdm.plants.noMatches' : 'mdm.plants.empty')">
          <template #cell-code="{ row }"><span class="mdm-plants__code">{{ row.code }}</span></template>
          <template #cell-status="{ row }">
            <span class="mom-management-status" :class="row.status === 'ENABLED' ? 'mom-management-status--enabled' : 'mom-management-status--disabled'">
              <span class="mom-management-status__dot" aria-hidden="true"></span>
              {{ t(row.status === 'ENABLED' ? 'mdm.plants.enabled' : 'mdm.plants.disabled') }}
            </span>
          </template>
          <template #cell-updatedAt="{ row }">{{ formatInstant(row.updatedAt, { locale, dateStyle: 'short', timeStyle: 'short' }) }}</template>
          <template #cell-actions="{ row }">
            <div class="mom-management-row-actions">
              <MomButton type="button" mode="text" :disabled="loading || saving" @click="open('detail', row)">{{ t('mdm.plants.detail') }}</MomButton>
              <AuthorityGuard :authorities="['mdm:factory:write']">
                <MomButton type="button" mode="text" :disabled="loading || saving" @click="open('edit', row)">{{ t('mdm.plants.edit') }}</MomButton>
                <MomCrudRowMenu :label="t('mdm.plants.moreActions')" :disabled="loading || saving"
                  :actions="[{ key: 'status', label: t(row.status === 'ENABLED' ? 'mdm.plants.disable' : 'mdm.plants.enable'), danger: row.status === 'ENABLED' }]"
                  @select="handleMore($event, row)" />
              </AuthorityGuard>
            </div>
          </template>
        </MomDataTable>
        <template #footer>
          <MomCrudPagination :page-no="pageNo" :page-size="pageSize" :total="total"
            :summary="pageSummary" :page-size-label="t('mdm.plants.pageSize')"
            :previous-label="t('mdm.plants.previous')" :next-label="t('mdm.plants.next')"
            :jump-label="t('mdm.plants.jump')" :go-label="t('mdm.plants.go')" :disabled="loading || saving"
            @page="loadPage($event)" @size="loadPage(1, $event)" />
        </template>
      </MomListSurface>

      <MomModal :open="!!action" :title="modalTitle" :close-label="t('mdm.plants.close')"
        :busy="saving" :busy-text="t('mdm.plants.saving')" @close="close">
        <div class="mdm-plants__dialog">
          <p v-if="detailLoading" role="status">{{ t('mdm.plants.loading') }}</p>
          <div v-if="dialogError" role="alert" class="mdm-plants__error">
            <p>{{ t(dialogError.key) }}</p>
            <small v-if="dialogError.correlationId">{{ t('mdm.plants.correlation') }}: {{ dialogError.correlationId }}</small>
            <MomButton v-if="target && !saving" type="button" variant="outline" :disabled="detailLoading"
              @click="reloadTarget">{{ t('mdm.plants.retry') }}</MomButton>
          </div>
          <dl v-if="target && !detailLoading" class="mdm-plants__summary">
            <div><dt>{{ t('mdm.plants.code') }}</dt><dd class="mdm-plants__code">{{ target.code }}</dd></div>
            <div><dt>{{ t('mdm.plants.name') }}</dt><dd>{{ target.name }}</dd></div>
            <div><dt>{{ t('mdm.plants.version') }}</dt><dd>{{ target.version }}</dd></div>
            <div v-if="action === 'detail'"><dt>{{ t('mdm.plants.createdAt') }}</dt><dd>{{ formatInstant(target.createdAt, { locale }) }}</dd></div>
          </dl>
          <form v-if="action && action !== 'detail'" class="mdm-plants__form" @submit.prevent="submit">
            <template v-if="action !== 'status'">
              <label v-if="action === 'create'">
                <span>{{ t('mdm.plants.code') }} *</span>
                <MomInput v-model="form.code" :disabled="saving" :max-length="64" />
              </label>
              <label>
                <span>{{ t('mdm.plants.name') }} *</span>
                <MomInput v-model="form.name" :disabled="saving || detailLoading" :max-length="200" />
              </label>
              <label v-if="action === 'create'">
                <span>{{ t('mdm.plants.status') }}</span>
                <MomSelect :model-value="form.status"
                  :options="[{ value: 'ENABLED', label: t('mdm.plants.enabled') }, { value: 'DISABLED', label: t('mdm.plants.disabled') }]"
                  :disabled="saving" @update:model-value="form.status = $event === 'DISABLED' ? 'DISABLED' : 'ENABLED'" />
              </label>
              <p v-if="fieldError" class="mdm-plants__field-error" role="alert">{{ t('mdm.plants.validation') }}</p>
            </template>
            <p v-else class="mdm-plants__warning">
              {{ t(target?.status === 'ENABLED' ? 'mdm.plants.disableHint' : 'mdm.plants.enableHint') }}
            </p>
            <div class="mdm-plants__footer">
              <MomButton type="button" variant="outline" :disabled="saving" @click="close">{{ t('mdm.plants.cancel') }}</MomButton>
              <MomButton type="submit" :disabled="!canSubmit || blocked">{{ t('mdm.plants.confirm') }}</MomButton>
            </div>
          </form>
          <div v-else class="mdm-plants__footer">
            <MomButton type="button" variant="outline" @click="close">{{ t('mdm.plants.close') }}</MomButton>
          </div>
        </div>
      </MomModal>
    </section>
  </PageContainer>
</template>
