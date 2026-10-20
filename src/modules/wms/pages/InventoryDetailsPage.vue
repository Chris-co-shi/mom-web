<script setup lang="ts">
import { computed, onMounted, onScopeDispose, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import MomManagementHeader from '../../../shared/components/MomManagementHeader.vue';
import MomListSurface from '../../../shared/components/MomListSurface.vue';
import MomDataTable, { type MomColumn } from '../../../shared/components/MomDataTable.vue';
import MomCrudPagination from '../../../shared/components/MomCrudPagination.vue';
import MomModal from '../../../shared/components/MomModal.vue';
import InventoryTransferModal from './InventoryTransferModal.vue';
import PageContainer from '../../../shared/components/PageContainer.vue';
import { hasAuthority } from '../../auth/model/auth-permissions';
import { MomButton, MomInput, MomQuantityInput, MomReferenceSelect, MomSelect, MomTextarea } from '../../../shared/ui';
import { catalogReference, materialReference } from '../../mdm/api/reference-api';
import { isApiError } from '../../../shared/api/errors';
import { useLocale } from '../../../shared/i18n/locale';
import { ROUTE_NAMES } from '../../../router/route-names';
import { freezeInventory, searchActiveFreezes, searchInventoryDetails, unfreezeInventory,
  type DetailFilter, type FreezeReason, type InventoryDetail, type InventoryFreeze } from '../api/inventory-api';
import './inventory-pages.css';

const route = useRoute(), router = useRouter();
const { t, tForOwner } = useLocale();
const rows = ref<InventoryDetail[]>([]);
const pageNo = ref(1), pageSize = ref(20), total = ref(0);
const loading = ref(false), saving = ref(false), error = ref(''), notice = ref('');
const selected = ref<InventoryDetail>();
const transferSelected = ref<InventoryDetail>();
const activeFreezes = ref<InventoryFreeze[]>([]);
const freezeQuantity = ref(''), freezeNote = ref(''), freezeReason = ref<FreezeReason>('WAREHOUSE_CHECK');
const releaseQuantities = ref<Record<string, string>>({}), releaseNotes = ref<Record<string, string>>({});
const unknownWrite = ref(false);
const filter = reactive({
  materialId: typeof route.query.materialId === 'string' ? route.query.materialId : '',
  warehouseId: typeof route.query.warehouseId === 'string' ? route.query.warehouseId : '',
  locationId: typeof route.query.locationId === 'string' ? route.query.locationId : '',
  batchCode: '', snCode: '', qualityStatus: '', warehouseStatus: '',
});
const warehouseReference = catalogReference('warehouses', () => ({}));
const locationReference = catalogReference('locations', () => ({ warehouseId: filter.warehouseId }));
watch(() => filter.warehouseId, (value, previous) => { if (value !== previous) filter.locationId = ''; });
function resetFilters(): void {
  Object.assign(filter, { materialId: '', warehouseId: '', locationId: '', batchCode: '', snCode: '',
    qualityStatus: '', warehouseStatus: '' });
  void load(1);
}
let controller: AbortController | undefined, sequence = 0;
const canFreeze = computed(() => hasAuthority('wms:inventory:freeze'));
const canUnfreeze = computed(() => hasAuthority('wms:inventory:unfreeze'));
const canTransfer = computed(() => hasAuthority('wms:inventory:transfer')
  && hasAuthority('mdm:location:read') && hasAuthority('mdm:warehouse:read'));
const reasonOptions = computed(() => (['PACKAGE_DAMAGE', 'STOCK_DISCREPANCY', 'WAREHOUSE_CHECK', 'SAFETY_HOLD', 'OTHER'] as const)
  .map(value => ({ value, label: reasonLabel(value) })));
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
  { key: 'actions', title: tForOwner('system', 'system.common.actions'), width: 150, resizable: false },
]);

function reasonLabel(reason: FreezeReason): string {
  const keys: Record<FreezeReason, Parameters<typeof t>[0]> = {
    PACKAGE_DAMAGE: 'wms.inventory.reason.package_damage',
    STOCK_DISCREPANCY: 'wms.inventory.reason.stock_discrepancy',
    WAREHOUSE_CHECK: 'wms.inventory.reason.warehouse_check',
    SAFETY_HOLD: 'wms.inventory.reason.safety_hold',
    OTHER: 'wms.inventory.reason.other',
  };
  return t(keys[reason]);
}

function params(): DetailFilter {
  return Object.fromEntries(Object.entries(filter).filter(([, value]) => value.trim())) as DetailFilter;
}

function decimalUnits(value: string): bigint | undefined {
  if (!/^\d+(?:\.\d{1,6})?$/.test(value.trim())) return undefined;
  const [whole, fraction = ''] = value.trim().split('.');
  return BigInt(whole!) * 1_000_000n + BigInt(fraction.padEnd(6, '0'));
}

function validQuantity(value: string, maximum: string): boolean {
  const quantity = decimalUnits(value), max = decimalUnits(maximum);
  return quantity !== undefined && max !== undefined && quantity > 0n && quantity <= max;
}

async function load(next = pageNo.value, size = pageSize.value): Promise<boolean> {
  const current = ++sequence;
  controller?.abort(); controller = new AbortController();
  loading.value = true; error.value = '';
  pageNo.value = next; pageSize.value = size;
  try {
    const result = await searchInventoryDetails(next, size, params(), controller.signal);
    if (current !== sequence) return false;
    rows.value = result.records; pageNo.value = result.pageNo; total.value = result.total;
    if (selected.value) {
      const refreshed = rows.value.find(row => row.id === selected.value?.id);
      selected.value = refreshed ?? (selected.value.warehouseStatus === 'NORMAL'
        ? { ...selected.value, quantity: '0' } : selected.value);
    }
    return true;
  } catch (cause) {
    if (current === sequence && !controller.signal.aborted) {
      error.value = isApiError(cause) && cause.kind === 'forbidden'
        ? t('wms.inventory.forbidden') : t('wms.inventory.loadFailed');
      rows.value = [];
    }
    return false;
  } finally { if (current === sequence) loading.value = false; }
}

async function loadActive(balanceId: string): Promise<boolean> {
  try {
    activeFreezes.value = await searchActiveFreezes(balanceId);
    releaseQuantities.value = Object.fromEntries(activeFreezes.value.map(freeze => [freeze.id, freeze.remainingQuantity]));
    releaseNotes.value = Object.fromEntries(activeFreezes.value.map(freeze => [freeze.id, '']));
    return true;
  } catch (cause) {
    activeFreezes.value = [];
    error.value = isApiError(cause) && cause.kind === 'forbidden'
      ? t('wms.inventory.forbidden') : t('wms.inventory.loadFailed');
    return false;
  }
}

async function openManagement(row: InventoryDetail): Promise<void> {
  selected.value = row; error.value = ''; notice.value = '';
  freezeQuantity.value = row.warehouseStatus === 'NORMAL' ? row.quantity : '';
  freezeNote.value = ''; freezeReason.value = 'WAREHOUSE_CHECK'; activeFreezes.value = [];
  await loadActive(row.id);
}

function search(): void { void load(1); }
function back(): void { void router.push({ name: ROUTE_NAMES.wmsInventoryOverview }); }
function writeFailure(cause: unknown): void {
  if (isApiError(cause) && cause.resultUnknown) {
    unknownWrite.value = true;
    error.value = t('wms.inventory.freeze.unknown');
  } else if (isApiError(cause) && cause.kind === 'forbidden') error.value = t('wms.inventory.forbidden');
  else if (isApiError(cause) && cause.kind === 'conflict') error.value = t('wms.inventory.freeze.conflict');
  else error.value = t('wms.inventory.freeze.failed');
}

async function submitFreeze(): Promise<void> {
  const row = selected.value;
  if (!row || !canFreeze.value || saving.value || unknownWrite.value || row.warehouseStatus !== 'NORMAL') return;
  if (!validQuantity(freezeQuantity.value, row.quantity)) {
    error.value = t('wms.inventory.freeze.failed'); return;
  }
  if (freezeReason.value === 'OTHER' && !freezeNote.value.trim()) {
    error.value = t('wms.inventory.freeze.otherNoteRequired'); return;
  }
  saving.value = true; error.value = ''; notice.value = '';
  try {
    await freezeInventory({ requestKey: crypto.randomUUID(), balanceId: row.id, quantity: freezeQuantity.value,
      reason: freezeReason.value, note: freezeNote.value.trim() || undefined });
    notice.value = t('wms.inventory.freeze.success');
    await load();
    await loadActive(row.id);
    freezeQuantity.value = selected.value?.warehouseStatus === 'NORMAL' ? selected.value.quantity : '';
  } catch (cause) { writeFailure(cause); }
  finally { saving.value = false; }
}

async function submitUnfreeze(freeze: InventoryFreeze): Promise<void> {
  if (!selected.value || !canUnfreeze.value || saving.value || unknownWrite.value) return;
  const quantity = releaseQuantities.value[freeze.id] ?? '';
  if (!validQuantity(quantity, freeze.remainingQuantity)) {
    error.value = t('wms.inventory.freeze.failed'); return;
  }
  if (!releaseNotes.value[freeze.id]?.trim()) {
    error.value = t('wms.inventory.freeze.failed'); return;
  }
  saving.value = true; error.value = ''; notice.value = '';
  try {
    await unfreezeInventory(freeze.id, { requestKey: crypto.randomUUID(), quantity,
      note: releaseNotes.value[freeze.id]?.trim() || undefined });
    notice.value = t('wms.inventory.freeze.success');
    await load();
    await loadActive(selected.value.id);
  } catch (cause) { writeFailure(cause); }
  finally { saving.value = false; }
}

async function refreshUnknown(): Promise<void> {
  if (loading.value || saving.value) return;
  const row = selected.value;
  const inventoryLoaded = await load();
  const holdsLoaded = row ? await loadActive(row.id) : true;
  if (inventoryLoaded && holdsLoaded) {
    unknownWrite.value = false;
    error.value = '';
    freezeQuantity.value = selected.value?.warehouseStatus === 'NORMAL' ? selected.value.quantity : '';
  }
}

onMounted(() => { void load(); });
onScopeDispose(() => { ++sequence; controller?.abort(); });
</script>

<template>
  <PageContainer>
    <section class="inventory-page" aria-labelledby="wms-details-title">
      <MomManagementHeader title-id="wms-details-title" :title="t('wms.inventory.details')"
        :description="t('wms.inventory.detailsHint')">
        <template #actions>
          <MomButton variant="outline" @click="router.push({ name: ROUTE_NAMES.wmsInventoryHistory,
            query: { materialId: filter.materialId || undefined, batchCode: filter.batchCode || undefined,
              snCode: filter.snCode || undefined, warehouseId: filter.warehouseId || undefined,
              locationId: filter.locationId || undefined } })">{{ t('wms.inventory.history.open') }}</MomButton>
          <MomButton variant="outline" @click="back">{{ t('wms.inventory.back') }}</MomButton>
        </template>
      </MomManagementHeader>
      <form class="inventory-page__filters" @submit.prevent="search">
        <label>{{ t('wms.inventory.material') }}<MomReferenceSelect v-model="filter.materialId"
          :label="t('wms.inventory.material')" :search="materialReference.search" :resolve="materialReference.resolve" /></label>
        <label>{{ t('wms.inventory.warehouse') }}<MomReferenceSelect v-model="filter.warehouseId"
          :label="t('wms.inventory.warehouse')" :search="warehouseReference.search" :resolve="warehouseReference.resolve" /></label>
        <label>{{ t('wms.inventory.location') }}<MomReferenceSelect v-model="filter.locationId"
          :label="t('wms.inventory.location')" :search="locationReference.search" :resolve="locationReference.resolve"
          :parent-key="filter.warehouseId" :disabled="!filter.warehouseId" /></label>
        <label>{{ t('wms.inventory.batch') }}<MomInput v-model="filter.batchCode" /></label>
        <label>{{ t('wms.inventory.sn') }}<MomInput v-model="filter.snCode" /></label>
        <label>{{ t('wms.inventory.qualityStatus') }}<MomSelect v-model="filter.qualityStatus" :options="[
          { value: '', label: t('wms.inventory.all') }, ...(['PENDING','QUALIFIED','RESTRICTED','REJECTED'] as const).map(value => ({ value, label: t(`wms.inventory.quality.${value.toLowerCase()}` as Parameters<typeof t>[0]) }))]" /></label>
        <label>{{ t('wms.inventory.warehouseStatus') }}<MomSelect v-model="filter.warehouseStatus" :options="[
          { value: '', label: t('wms.inventory.all') }, { value: 'NORMAL', label: t('wms.inventory.warehouse.normal') },
          { value: 'FROZEN', label: t('wms.inventory.warehouse.frozen') }]" /></label>
        <div class="inventory-page__filter-actions">
          <MomButton type="submit" :disabled="loading">{{ tForOwner('system', 'system.common.search') }}</MomButton>
          <MomButton type="button" variant="outline" :disabled="loading" @click="resetFilters">{{ tForOwner('system', 'system.common.reset') }}</MomButton>
        </div>
      </form>
      <div v-if="error" role="alert" class="inventory-page__error">
        {{ error }}
        <MomButton v-if="unknownWrite" variant="outline" :disabled="loading || saving" @click="refreshUnknown">{{ t('wms.inventory.retry') }}</MomButton>
        <MomButton v-else variant="outline" :disabled="loading" @click="load()">{{ t('wms.inventory.retry') }}</MomButton>
      </div>
      <p v-if="notice" role="status">{{ notice }}</p>
      <MomListSurface :title="t('wms.inventory.details')" :hint="t('wms.inventory.detailsHint')"
        :loading="loading" :loading-text="tForOwner('system', 'system.common.loading')">
        <MomDataTable :rows="rows" :columns="columns" :empty-text="tForOwner('system', 'system.common.empty')">
          <template #cell-qualityStatus="{ row }">{{ t(`wms.inventory.quality.${row.qualityStatus.toLowerCase()}` as Parameters<typeof t>[0]) }}</template>
          <template #cell-warehouseStatus="{ row }">{{ t(`wms.inventory.warehouse.${row.warehouseStatus.toLowerCase()}` as Parameters<typeof t>[0]) }}</template>
          <template #cell-actions="{ row }">
            <MomButton mode="text" @click="router.push({ name: ROUTE_NAMES.wmsInventoryHistory,
              query: { materialId: row.materialId, batchCode: row.batchCode || undefined,
                snCode: row.snCode || undefined, warehouseId: row.warehouseId, locationId: row.locationId } })">{{ t('wms.inventory.history.open') }}</MomButton>
            <MomButton mode="text" @click="openManagement(row)">{{ t('wms.inventory.freeze.action') }}</MomButton>
            <MomButton v-if="canTransfer && row.warehouseStatus === 'NORMAL'" mode="text"
              @click="transferSelected = row">{{ t('wms.inventory.transfer.action') }}</MomButton>
          </template>
        </MomDataTable>
        <template #footer><MomCrudPagination :page-no="pageNo" :page-size="pageSize" :total="total"
          :summary="`${total}`" :page-size-label="tForOwner('system', 'system.common.pageSize')"
          :previous-label="tForOwner('system', 'system.common.previous')" :next-label="tForOwner('system', 'system.common.next')"
          :jump-label="tForOwner('system', 'system.common.jump')" :go-label="tForOwner('system', 'system.common.go')" :disabled="loading"
          @page="load($event)" @size="load(1, $event)" /></template>
      </MomListSurface>

      <MomModal :open="!!selected" :title="t('wms.inventory.freeze.active')"
        :close-label="tForOwner('system', 'system.common.close')" :busy="saving" @close="selected = undefined">
        <div v-if="selected" class="inventory-freeze">
          <p>{{ selected.materialCode }} · {{ selected.warehouseCode }} · {{ selected.locationCode }} · {{ selected.snCode || selected.batchCode || '' }}</p>
          <p>{{ t('wms.inventory.freeze.available') }}：{{ selected.warehouseStatus === 'NORMAL' ? selected.quantity : '0' }} {{ selected.uomCode }}</p>
          <form v-if="canFreeze && selected.warehouseStatus === 'NORMAL'" class="inventory-freeze__form" @submit.prevent="submitFreeze">
            <label>{{ t('wms.inventory.freeze.quantity') }}<MomQuantityInput v-model="freezeQuantity"
              :unit-value="selected.uomCode" :units="[{ value: selected.uomCode, label: selected.uomCode }]"
              :label="t('wms.inventory.freeze.quantity')" unit-disabled :disabled="saving || unknownWrite" /></label>
            <label>{{ t('wms.inventory.freeze.reason') }}<MomSelect v-model="freezeReason" :options="reasonOptions" :disabled="saving || unknownWrite" /></label>
            <label>{{ t('wms.inventory.freeze.note') }}<MomTextarea v-model="freezeNote" :maxlength="500" :disabled="saving || unknownWrite" /></label>
            <MomButton type="submit" :disabled="saving || unknownWrite">{{ t('wms.inventory.freeze.submit') }}</MomButton>
          </form>
          <h3>{{ t('wms.inventory.freeze.active') }}</h3>
          <p v-if="!activeFreezes.length">{{ t('wms.inventory.freeze.empty') }}</p>
          <article v-for="freeze in activeFreezes" :key="freeze.id" class="inventory-freeze__item">
            <p><strong>{{ reasonLabel(freeze.reasonCode) }}</strong> · {{ freeze.remainingQuantity }} / {{ freeze.originalQuantity }} {{ freeze.uomCode }}</p>
            <p v-if="freeze.note">{{ freeze.note }}</p>
            <small>{{ freeze.operatorId }} · {{ freeze.frozenAt }}</small>
            <form v-if="canUnfreeze" class="inventory-freeze__form" @submit.prevent="submitUnfreeze(freeze)">
              <label>{{ t('wms.inventory.freeze.quantity') }}<MomQuantityInput v-model="releaseQuantities[freeze.id]"
                :unit-value="freeze.uomCode" :units="[{ value: freeze.uomCode, label: freeze.uomCode }]"
                :label="t('wms.inventory.freeze.quantity')" unit-disabled :disabled="saving || unknownWrite" /></label>
              <label>{{ t('wms.inventory.freeze.unfreezeNote') }}<MomInput v-model="releaseNotes[freeze.id]" required :maxlength="500" :disabled="saving || unknownWrite" /></label>
              <MomButton type="submit" variant="outline" :disabled="saving || unknownWrite">{{ t('wms.inventory.freeze.unfreeze') }}</MomButton>
            </form>
          </article>
        </div>
        <template #footer><MomButton variant="outline" :disabled="saving" @click="selected = undefined">{{ tForOwner('system', 'system.common.close') }}</MomButton></template>
      </MomModal>
      <InventoryTransferModal v-if="transferSelected" :balance="transferSelected"
        @close="transferSelected = undefined"
        @done="transferSelected = undefined; notice = t('wms.inventory.transfer.success'); load()"
        @refresh="transferSelected = undefined; load()" />
    </section>
  </PageContainer>
</template>
