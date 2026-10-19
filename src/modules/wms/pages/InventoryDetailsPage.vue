<script setup lang="ts">
import { computed, onMounted, onScopeDispose, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import MomManagementHeader from '../../../shared/components/MomManagementHeader.vue';
import MomListSurface from '../../../shared/components/MomListSurface.vue';
import MomDataTable, { type MomColumn } from '../../../shared/components/MomDataTable.vue';
import MomCrudPagination from '../../../shared/components/MomCrudPagination.vue';
import PageContainer from '../../../shared/components/PageContainer.vue';
import { MomButton, MomInput, MomSelect } from '../../../shared/ui';
import { isApiError } from '../../../shared/api/errors';
import { useLocale } from '../../../shared/i18n/locale';
import { ROUTE_NAMES } from '../../../router/route-names';
import { searchInventoryDetails, type DetailFilter, type InventoryDetail } from '../api/inventory-api';
import './inventory-pages.css';

const route = useRoute(), router = useRouter();
const { t, tForOwner } = useLocale();
const rows = ref<InventoryDetail[]>([]);
const pageNo = ref(1), pageSize = ref(20), total = ref(0);
const loading = ref(false), error = ref('');
const filter = reactive({
  materialId: typeof route.query.materialId === 'string' ? route.query.materialId : '',
  warehouseId: '', locationId: '', batchCode: '', snCode: '',
  qualityStatus: '', warehouseStatus: '',
});
let controller: AbortController | undefined, sequence = 0;
const qualityOptions = computed(() => [
  { value: '', label: t('wms.inventory.all') },
  ...(['PENDING', 'QUALIFIED', 'RESTRICTED', 'REJECTED'] as const).map(value => ({
    value, label: t(`wms.inventory.quality.${value.toLowerCase()}` as Parameters<typeof t>[0]),
  })),
]);
const warehouseOptions = computed(() => [
  { value: '', label: t('wms.inventory.all') },
  { value: 'NORMAL', label: t('wms.inventory.warehouse.normal') },
  { value: 'FROZEN', label: t('wms.inventory.warehouse.frozen') },
]);
const columns = computed<MomColumn[]>(() => [
  { key: 'materialCode', title: t('wms.inventory.materialCode'), minWidth: 150 },
  { key: 'materialName', title: t('wms.inventory.materialName'), minWidth: 180 },
  { key: 'batchCode', title: t('wms.inventory.batch'), minWidth: 130 },
  { key: 'snCode', title: t('wms.inventory.sn'), minWidth: 160 },
  { key: 'warehouseCode', title: t('wms.inventory.warehouse'), minWidth: 130 },
  { key: 'locationCode', title: t('wms.inventory.location'), minWidth: 130 },
  { key: 'qualityStatus', title: t('wms.inventory.qualityStatus'), minWidth: 130 },
  { key: 'warehouseStatus', title: t('wms.inventory.warehouseStatus'), minWidth: 130 },
  { key: 'quantity', title: t('wms.inventory.quantity'), minWidth: 130 },
  { key: 'uomCode', title: t('wms.inventory.uom'), width: 100 },
]);
function params(): DetailFilter {
  return Object.fromEntries(Object.entries(filter).filter(([, value]) => value.trim())) as DetailFilter;
}
async function load(next = pageNo.value, size = pageSize.value): Promise<void> {
  const current = ++sequence;
  controller?.abort(); controller = new AbortController();
  loading.value = true; error.value = '';
  pageNo.value = next; pageSize.value = size;
  try {
    const result = await searchInventoryDetails(next, size, params(), controller.signal);
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
function search(): void { void load(1); }
function back(): void { void router.push({ name: ROUTE_NAMES.wmsInventoryOverview }); }
onMounted(() => { void load(); });
onScopeDispose(() => { ++sequence; controller?.abort(); });
</script>

<template>
  <PageContainer>
    <section class="inventory-page" aria-labelledby="wms-details-title">
      <MomManagementHeader title-id="wms-details-title" :title="t('wms.inventory.details')"
        :description="t('wms.inventory.detailsHint')">
        <template #actions><MomButton variant="outline" @click="back">{{ t('wms.inventory.back') }}</MomButton></template>
      </MomManagementHeader>
      <form class="inventory-page__filters" @submit.prevent="search">
        <label>{{ t('wms.inventory.materialId') }}<MomInput v-model="filter.materialId" /></label>
        <label>{{ t('wms.inventory.warehouseId') }}<MomInput v-model="filter.warehouseId" /></label>
        <label>{{ t('wms.inventory.locationId') }}<MomInput v-model="filter.locationId" /></label>
        <label>{{ t('wms.inventory.batch') }}<MomInput v-model="filter.batchCode" /></label>
        <label>{{ t('wms.inventory.sn') }}<MomInput v-model="filter.snCode" /></label>
        <label>{{ t('wms.inventory.qualityStatus') }}<MomSelect v-model="filter.qualityStatus" :options="qualityOptions" /></label>
        <label>{{ t('wms.inventory.warehouseStatus') }}<MomSelect v-model="filter.warehouseStatus" :options="warehouseOptions" /></label>
        <MomButton type="submit" :disabled="loading">{{ tForOwner('system', 'system.common.search') }}</MomButton>
      </form>
      <div v-if="error" role="alert" class="inventory-page__error">{{ error }} <MomButton variant="outline" @click="load()">{{ t('wms.inventory.retry') }}</MomButton></div>
      <MomListSurface :title="t('wms.inventory.details')" :hint="t('wms.inventory.detailsHint')"
        :loading="loading" :loading-text="tForOwner('system', 'system.common.loading')">
        <MomDataTable :rows="rows" :columns="columns" :empty-text="tForOwner('system', 'system.common.empty')">
          <template #cell-qualityStatus="{ row }">{{ t(`wms.inventory.quality.${row.qualityStatus.toLowerCase()}` as Parameters<typeof t>[0]) }}</template>
          <template #cell-warehouseStatus="{ row }">{{ t(`wms.inventory.warehouse.${row.warehouseStatus.toLowerCase()}` as Parameters<typeof t>[0]) }}</template>
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
