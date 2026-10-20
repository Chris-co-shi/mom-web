<script setup lang="ts">
import { computed, onScopeDispose, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import MomManagementHeader from '../../../shared/components/MomManagementHeader.vue';
import MomListSurface from '../../../shared/components/MomListSurface.vue';
import MomDataTable, { type MomColumn } from '../../../shared/components/MomDataTable.vue';
import MomCrudPagination from '../../../shared/components/MomCrudPagination.vue';
import MomModal from '../../../shared/components/MomModal.vue';
import PageContainer from '../../../shared/components/PageContainer.vue';
import { MomButton, MomInput, MomReferenceSelect, MomSelect } from '../../../shared/ui';
import { catalogReference, materialReference } from '../../mdm/api/reference-api';
import { isApiError } from '../../../shared/api/errors';
import { useLocale } from '../../../shared/i18n/locale';
import { ROUTE_NAMES } from '../../../router/route-names';
import { getInventoryHistoryTransaction, searchInventoryHistory,
  type InventoryHistoryEntry, type InventoryHistoryFilter, type InventoryHistoryTransaction } from '../api/inventory-history-api';
import './inventory-pages.css';

const route = useRoute(), router = useRouter(), { t, tForOwner } = useLocale();
const queryValue = (key: string) => typeof route.query[key] === 'string' ? route.query[key] as string : '';
const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const today = new Date(), monthAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29);
const defaultStart = localDate(monthAgo), defaultEnd = localDate(today);
const filter = reactive({ materialId: queryValue('materialId'), materialKeyword: queryValue('materialKeyword'),
  batchCode: queryValue('batchCode'), snCode: queryValue('snCode'),
  warehouseId: queryValue('warehouseId'), warehouseCode: queryValue('warehouseCode'),
  locationId: queryValue('locationId'), locationCode: queryValue('locationCode'),
  transactionType: queryValue('transactionType'), sourceType: queryValue('sourceType'),
  sourceId: queryValue('sourceId'), actor: queryValue('actor'),
  startDate: defaultStart, endDate: defaultEnd });
const warehouseReference = catalogReference('warehouses', () => ({}));
const locationReference = catalogReference('locations', () => ({ warehouseId: filter.warehouseId }));
watch(() => filter.warehouseId, (value, previous) => { if (value !== previous) filter.locationId = ''; });
const rows = ref<InventoryHistoryEntry[]>([]), pageNo = ref(1), pageSize = ref(20), total = ref(0);
const searched = ref(false), loading = ref(false), error = ref('');
const selected = ref<InventoryHistoryTransaction>(), detailLoading = ref(false), detailError = ref('');
const inheritedScope = computed(() => !!(filter.materialId || filter.warehouseId || filter.locationId));
let controller: AbortController | undefined, detailController: AbortController | undefined, sequence = 0, detailSequence = 0;
const text = (value: string | null | undefined) => value || t('wms.inventory.history.missing');
const tagText = (value: string | null, materialId: string | null) => value || (materialId ? '—' : text(value));
const signed = (value: string) => value.startsWith('-') ? value : `+${value}`;
const statusText = (kind: 'quality' | 'warehouse', value: string | null) => value
  ? t(`wms.inventory.${kind}.${value.toLowerCase()}` as Parameters<typeof t>[0]) : text(value);
const columns = computed<MomColumn[]>(() => [
  { key: 'occurredAt', title: t('wms.inventory.history.occurred'), minWidth: 190 },
  { key: 'transactionType', title: t('wms.inventory.history.type'), minWidth: 160 },
  { key: 'materialCode', title: t('wms.inventory.materialCode'), minWidth: 150 },
  { key: 'materialName', title: t('wms.inventory.materialName'), minWidth: 180 },
  { key: 'batchCode', title: t('wms.inventory.batch'), minWidth: 130 },
  { key: 'snCode', title: t('wms.inventory.sn'), minWidth: 150 },
  { key: 'warehouseCode', title: t('wms.inventory.warehouse'), minWidth: 130 },
  { key: 'locationCode', title: t('wms.inventory.location'), minWidth: 130 },
  { key: 'qualityStatus', title: t('wms.inventory.qualityStatus'), minWidth: 140 },
  { key: 'warehouseStatus', title: t('wms.inventory.warehouseStatus'), minWidth: 140 },
  { key: 'deltaQuantity', title: t('wms.inventory.history.delta'), minWidth: 130 },
  { key: 'beforeQuantity', title: t('wms.inventory.history.before'), minWidth: 130 },
  { key: 'afterQuantity', title: t('wms.inventory.history.after'), minWidth: 130 },
  { key: 'sourceType', title: t('wms.inventory.history.source'), minWidth: 140 },
  { key: 'sourceId', title: t('wms.inventory.history.sourceid'), minWidth: 160 },
  { key: 'operatorId', title: t('wms.inventory.history.actor'), minWidth: 150 },
  { key: 'actions', title: tForOwner('system', 'system.common.actions'), width: 150, resizable: false },
]);
function params(): InventoryHistoryFilter | undefined {
  const start = new Date(`${filter.startDate}T00:00:00`);
  const end = new Date(`${filter.endDate}T00:00:00`);
  end.setDate(end.getDate() + 1);
  if (!filter.startDate || !filter.endDate || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())
    || start >= end || end.getTime() - start.getTime() > 366 * 86400000) return undefined;
  return { ...Object.fromEntries(Object.entries(filter).filter(([key, value]) => !key.endsWith('Date') && value.trim())),
    startTime: start.toISOString(), endTime: end.toISOString() } as InventoryHistoryFilter;
}
async function load(next = 1, size = pageSize.value): Promise<void> {
  const values = params();
  if (!values) {
    ++sequence; controller?.abort(); loading.value = false;
    error.value = t('wms.inventory.history.invalidrange');
    rows.value = []; total.value = 0;
    return;
  }
  const current = ++sequence;
  controller?.abort(); controller = new AbortController();
  loading.value = true; searched.value = true; error.value = '';
  try {
    const result = await searchInventoryHistory(next, size, values, controller.signal);
    if (current !== sequence) return;
    rows.value = result.records; pageNo.value = result.pageNo; pageSize.value = result.pageSize; total.value = result.total;
  } catch (cause) {
    if (current === sequence && !controller.signal.aborted) {
      rows.value = []; total.value = 0;
      error.value = isApiError(cause) && cause.kind === 'forbidden'
        ? t('wms.inventory.forbidden') : t('wms.inventory.loadFailed');
    }
  } finally { if (current === sequence) loading.value = false; }
}
function reset(): void {
  ++sequence; controller?.abort(); loading.value = false; searched.value = false; error.value = '';
  for (const key of Object.keys(filter) as (keyof typeof filter)[]) filter[key] = '';
  filter.startDate = defaultStart; filter.endDate = defaultEnd;
  rows.value = []; total.value = 0; pageNo.value = 1;
}
async function openTransaction(id: string): Promise<void> {
  const current = ++detailSequence;
  detailController?.abort(); detailController = new AbortController();
  selected.value = undefined; detailLoading.value = true; detailError.value = '';
  try {
    const result = await getInventoryHistoryTransaction(id, detailController.signal);
    if (current === detailSequence) selected.value = result;
  } catch (cause) {
    if (current === detailSequence && !detailController.signal.aborted) detailError.value =
      isApiError(cause) && cause.kind === 'forbidden' ? t('wms.inventory.forbidden') : t('wms.inventory.history.detailfailed');
  } finally { if (current === detailSequence) detailLoading.value = false; }
}
function closeTransaction(): void { ++detailSequence; detailController?.abort(); selected.value = undefined; detailError.value = ''; }
onScopeDispose(() => { ++sequence; ++detailSequence; controller?.abort(); detailController?.abort(); });
</script>

<template>
  <PageContainer>
    <section class="inventory-page inventory-page--history" aria-labelledby="wms-history-title">
      <MomManagementHeader title-id="wms-history-title" :title="t('wms.inventory.history.title')"
        :description="t('wms.inventory.history.hint')">
        <template #actions><MomButton variant="outline" @click="router.push({ name: ROUTE_NAMES.wmsInventoryOverview })">{{ t('wms.inventory.back') }}</MomButton></template>
      </MomManagementHeader>
      <p v-if="error" role="alert" class="inventory-page__error">{{ error }}</p>
      <MomListSurface :title="t('wms.inventory.history.title')" :hint="t('wms.inventory.history.hint')"
        :loading="loading" :loading-text="tForOwner('system', 'system.common.loading')">
        <template #toolbar>
          <form class="inventory-history__filters" @submit.prevent="load(1)">
            <div class="inventory-history__primary">
              <label>{{ t('wms.inventory.material') }}<MomReferenceSelect v-model="filter.materialId"
                :label="t('wms.inventory.material')" :search="materialReference.search" :resolve="materialReference.resolve"
                @update:model-value="filter.materialKeyword = ''" /></label>
              <label>{{ t('wms.inventory.warehouse') }}<MomReferenceSelect v-model="filter.warehouseId"
                :label="t('wms.inventory.warehouse')" :search="warehouseReference.search" :resolve="warehouseReference.resolve"
                @update:model-value="filter.warehouseCode = ''" /></label>
              <label>{{ t('wms.inventory.batch') }}<MomInput v-model="filter.batchCode" /></label>
              <label>{{ t('wms.inventory.sn') }}<MomInput v-model="filter.snCode" /></label>
              <label>{{ t('wms.inventory.history.start') }}<MomInput v-model="filter.startDate" type="date" required /></label>
              <label>{{ t('wms.inventory.history.end') }}<MomInput v-model="filter.endDate" type="date" required /></label>
            </div>
            <details class="inventory-history__advanced">
              <summary>{{ t('wms.inventory.history.morefilters') }}</summary>
              <div class="inventory-history__advanced-fields">
                <label>{{ t('wms.inventory.location') }}<MomReferenceSelect v-model="filter.locationId"
                  :label="t('wms.inventory.location')" :search="locationReference.search" :resolve="locationReference.resolve"
                  :parent-key="filter.warehouseId" :disabled="!filter.warehouseId"
                  @update:model-value="filter.locationCode = ''" /></label>
                <label>{{ t('wms.inventory.history.type') }}<MomSelect v-model="filter.transactionType" :options="[
                  { value: '', label: t('wms.inventory.history.alltypes') },
                  ...['OPENING','FREEZE','UNFREEZE','LOCATION_TRANSFER','RECEIPT'].map(value => ({ value, label: value }))]" /></label>
                <label>{{ t('wms.inventory.history.source') }}<MomInput v-model="filter.sourceType" /></label>
                <label>{{ t('wms.inventory.history.sourceid') }}<MomInput v-model="filter.sourceId" /></label>
                <label>{{ t('wms.inventory.history.actor') }}<MomInput v-model="filter.actor" /></label>
              </div>
            </details>
            <div class="inventory-history__actions">
              <span v-if="inheritedScope" class="inventory-history__scope">{{ t('wms.inventory.history.inherited') }}</span>
              <MomButton type="button" variant="outline" @click="reset">{{ t('wms.inventory.history.reset') }}</MomButton>
              <MomButton type="submit" :disabled="loading">{{ tForOwner('system', 'system.common.search') }}</MomButton>
            </div>
          </form>
        </template>
        <p v-if="!searched" role="status" class="inventory-history__empty">{{ t('wms.inventory.history.queryfirst') }}</p>
        <MomDataTable v-else-if="!error" :rows="rows" :columns="columns" :empty-text="tForOwner('system', 'system.common.empty')">
          <template #cell-transactionType="{ row }">{{ text(row.transactionType) }}</template>
          <template #cell-materialCode="{ row }">{{ text(row.materialCode) }}</template>
          <template #cell-materialName="{ row }">{{ text(row.materialName) }}</template>
          <template #cell-batchCode="{ row }">{{ tagText(row.batchCode, row.materialId) }}</template>
          <template #cell-snCode="{ row }">{{ tagText(row.snCode, row.materialId) }}</template>
          <template #cell-warehouseCode="{ row }">{{ text(row.warehouseCode) }}</template>
          <template #cell-locationCode="{ row }">{{ text(row.locationCode) }}</template>
          <template #cell-qualityStatus="{ row }">{{ statusText('quality', row.qualityStatus) }}</template>
          <template #cell-warehouseStatus="{ row }">{{ statusText('warehouse', row.warehouseStatus) }}</template>
          <template #cell-deltaQuantity="{ row }"><span :class="row.deltaQuantity.startsWith('-') ? 'inventory-history__decrease' : 'inventory-history__increase'">{{ signed(row.deltaQuantity) }}</span></template>
          <template #cell-beforeQuantity="{ row }">{{ text(row.beforeQuantity) }}</template>
          <template #cell-afterQuantity="{ row }">{{ text(row.afterQuantity) }}</template>
          <template #cell-sourceType="{ row }">{{ text(row.sourceType) }}</template>
          <template #cell-sourceId="{ row }">{{ text(row.sourceId) }}</template>
          <template #cell-operatorId="{ row }">{{ text(row.operatorId) }}</template>
          <template #cell-actions="{ row }"><MomButton mode="text" @click="openTransaction(row.transactionId)">{{ t('wms.inventory.history.transaction') }}</MomButton></template>
        </MomDataTable>
        <template v-if="searched && !error" #footer><MomCrudPagination :page-no="pageNo" :page-size="pageSize" :total="total"
          :summary="`${total}`" :page-size-label="tForOwner('system', 'system.common.pageSize')"
          :previous-label="tForOwner('system', 'system.common.previous')" :next-label="tForOwner('system', 'system.common.next')"
          :jump-label="tForOwner('system', 'system.common.jump')" :go-label="tForOwner('system', 'system.common.go')"
          :disabled="loading" @page="load($event)" @size="load(1, $event)" /></template>
      </MomListSurface>
      <p v-if="detailError" role="alert" class="inventory-page__error">{{ detailError }}</p>
      <p v-if="detailLoading" role="status">{{ tForOwner('system', 'system.common.loading') }}</p>
      <MomModal :open="!!selected" :title="t('wms.inventory.history.transaction')"
        :close-label="tForOwner('system', 'system.common.close')" @close="closeTransaction">
        <div v-if="selected" class="inventory-history__detail">
          <p><code>{{ selected.id }}</code> · {{ text(selected.transactionType) }} · {{ selected.occurredAt }}</p>
          <p>{{ t('wms.inventory.history.source') }}：{{ text(selected.sourceType) }} / {{ text(selected.sourceId) }}</p>
          <p>{{ t('wms.inventory.history.actor') }}：{{ text(selected.operatorId) }}</p>
          <p>{{ t('wms.inventory.history.reason') }}：{{ selected.reasonCode ? t(`wms.inventory.reason.${selected.reasonCode.toLowerCase()}` as Parameters<typeof t>[0]) : text(null) }}</p>
          <p>{{ t('wms.inventory.history.note') }}：{{ text(selected.note) }}</p>
          <ol class="inventory-history__entries">
            <li v-for="entry in selected.entries" :key="entry.id">
              <strong>{{ t('wms.inventory.history.lineno') }} {{ entry.lineNo }} · {{ text(entry.materialCode) }} · {{ text(entry.locationCode) }}</strong>
              <span>{{ tagText(entry.batchCode, entry.materialId) }} / {{ tagText(entry.snCode, entry.materialId) }} · {{ statusText('quality', entry.qualityStatus) }} / {{ statusText('warehouse', entry.warehouseStatus) }}</span>
              <span :class="entry.deltaQuantity.startsWith('-') ? 'inventory-history__decrease' : 'inventory-history__increase'">{{ signed(entry.deltaQuantity) }} {{ text(entry.uomCode) }}</span>
              <span>{{ t('wms.inventory.history.before') }} {{ text(entry.beforeQuantity) }} → {{ t('wms.inventory.history.after') }} {{ text(entry.afterQuantity) }}</span>
            </li>
          </ol>
        </div>
        <template #footer><MomButton variant="outline" @click="closeTransaction">{{ tForOwner('system', 'system.common.close') }}</MomButton></template>
      </MomModal>
    </section>
  </PageContainer>
</template>

<style scoped>
.inventory-history__detail { display: grid; gap: .75rem; }
.inventory-history__detail p { margin: 0; }
.inventory-history__entries { display: grid; gap: .75rem; padding-left: 1.5rem; }
.inventory-history__entries li { display: grid; gap: .25rem; border-bottom: 1px solid var(--mom-border); padding-bottom: .75rem; }
.inventory-history__decrease { color: var(--mom-danger-text, #a33434); font-weight: 650; font-variant-numeric: tabular-nums; }
.inventory-history__increase { color: var(--mom-success-text, #216c51); font-weight: 650; font-variant-numeric: tabular-nums; }
</style>
