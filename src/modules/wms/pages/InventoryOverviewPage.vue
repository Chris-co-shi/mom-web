<script setup lang="ts">
import { computed, onMounted, onScopeDispose, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { RefreshCw } from '@lucide/vue';
import MomManagementHeader from '../../../shared/components/MomManagementHeader.vue';
import MomListSurface from '../../../shared/components/MomListSurface.vue';
import MomDataTable, { type MomColumn } from '../../../shared/components/MomDataTable.vue';
import MomCrudPagination from '../../../shared/components/MomCrudPagination.vue';
import MomCrudSearch from '../../../shared/components/MomCrudSearch.vue';
import PageContainer from '../../../shared/components/PageContainer.vue';
import { MomButton } from '../../../shared/ui';
import { isApiError } from '../../../shared/api/errors';
import { useLocale } from '../../../shared/i18n/locale';
import { ROUTE_NAMES } from '../../../router/route-names';
import { searchInventoryOverview, type InventoryOverview, type OverviewFilter } from '../api/inventory-api';
import './inventory-pages.css';

const router = useRouter();
const { t, tForOwner } = useLocale();
const rows = ref<InventoryOverview[]>([]);
const pageNo = ref(1), pageSize = ref(20), total = ref(0);
const loading = ref(false), error = ref('');
const filter = reactive({ keyword: '', warehouseCode: '' });
let controller: AbortController | undefined, sequence = 0;
let searchTimer: ReturnType<typeof setTimeout> | undefined;
const columns = computed<MomColumn[]>(() => [
  { key: 'materialCode', title: t('wms.inventory.materialCode'), minWidth: 160 },
  { key: 'materialName', title: t('wms.inventory.materialName'), minWidth: 200 },
  { key: 'totalQuantity', title: t('wms.inventory.total'), minWidth: 140 },
  { key: 'availableQuantity', title: t('wms.inventory.available'), minWidth: 140 },
  { key: 'unavailableQuantity', title: t('wms.inventory.unavailable'), minWidth: 140 },
  { key: 'frozenQuantity', title: t('wms.inventory.frozen'), minWidth: 140 },
  { key: 'uomCode', title: t('wms.inventory.uom'), width: 110 },
  { key: 'actions', title: tForOwner('system', 'system.common.actions'), width: 120, resizable: false },
]);
function params(): OverviewFilter {
  return Object.fromEntries(Object.entries(filter).filter(([, value]) => value.trim())) as OverviewFilter;
}
async function load(next = pageNo.value, size = pageSize.value): Promise<void> {
  const current = ++sequence;
  controller?.abort(); controller = new AbortController();
  loading.value = true; error.value = '';
  pageNo.value = next; pageSize.value = size;
  try {
    const result = await searchInventoryOverview(next, size, params(), controller.signal);
    if (current !== sequence) return;
    rows.value = result.records; pageNo.value = result.pageNo; total.value = result.total;
  } catch (cause) {
    if (current === sequence && !controller.signal.aborted) {
      error.value = isApiError(cause) && cause.kind === 'forbidden'
        ? t('wms.inventory.forbidden') : t('wms.inventory.loadFailed');
      rows.value = [];
    }
  } finally { if (current === sequence) loading.value = false; }
}
watch(() => [filter.keyword, filter.warehouseCode], () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { searchTimer = undefined; void load(1); }, 300);
});
function detail(row: InventoryOverview): void {
  void router.push({ name: ROUTE_NAMES.wmsInventoryDetails, query: { materialId: row.materialId } });
}
onMounted(() => { void load(); });
onScopeDispose(() => { ++sequence; controller?.abort(); if (searchTimer) clearTimeout(searchTimer); });
</script>

<template>
  <PageContainer>
    <section class="inventory-page" aria-labelledby="wms-overview-title">
      <MomManagementHeader title-id="wms-overview-title" :title="t('wms.inventory.overview')"
        :description="t('wms.inventory.overviewHint')">
        <template #actions>
          <MomButton variant="outline" @click="router.push({ name: ROUTE_NAMES.wmsInventoryHistory })">{{ t('wms.inventory.history.open') }}</MomButton>
          <MomButton variant="outline" :disabled="loading" @click="load()"><RefreshCw :size="16" />{{ tForOwner('system', 'system.common.refresh') }}</MomButton>
        </template>
      </MomManagementHeader>
      <div v-if="error" role="alert" class="inventory-page__error">{{ error }} <MomButton variant="outline" @click="load()">{{ t('wms.inventory.retry') }}</MomButton></div>
      <MomListSurface :title="t('wms.inventory.overview')" :hint="t('wms.inventory.overviewHint')"
        :loading="loading" :loading-text="tForOwner('system', 'system.common.loading')">
        <template #toolbar>
          <div class="mom-management-tools inventory-page__overview-filters">
            <MomCrudSearch v-model="filter.keyword" :label="t('wms.inventory.materialSearch')" :disabled="loading" />
            <MomCrudSearch v-model="filter.warehouseCode" :label="t('wms.inventory.warehouseCodeSearch')" :disabled="loading" />
          </div>
        </template>
        <MomDataTable :rows="rows" :columns="columns" :empty-text="tForOwner('system', 'system.common.empty')">
          <template #cell-actions="{ row }"><MomButton mode="text" @click="detail(row)">{{ t('wms.inventory.viewDetails') }}</MomButton></template>
        </MomDataTable>
        <template #footer><MomCrudPagination :page-no="pageNo" :page-size="pageSize" :total="total"
          :summary="`${total}`" :page-size-label="tForOwner('system', 'system.common.pageSize')"
          :previous-label="tForOwner('system', 'system.common.previous')" :next-label="tForOwner('system', 'system.common.next')"
          :jump-label="tForOwner('system', 'system.common.jump')" :go-label="tForOwner('system', 'system.common.go')" :disabled="loading"
          @page="load($event)" @size="load(1, $event)" /></template>
      </MomListSurface>
    </section>
  </PageContainer>
</template>
