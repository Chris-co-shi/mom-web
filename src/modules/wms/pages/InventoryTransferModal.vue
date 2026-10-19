<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import MomModal from '../../../shared/components/MomModal.vue';
import { MomButton, MomInput, MomSelect } from '../../../shared/ui';
import { searchCatalog, type MasterRow } from '../../mdm/api/catalog-api';
import { isApiError } from '../../../shared/api/errors';
import { useLocale } from '../../../shared/i18n/locale';
import { transferInventory, type InventoryDetail } from '../api/inventory-api';

const props = defineProps<{ balance: InventoryDetail }>();
const emit = defineEmits<{ close: []; done: []; refresh: [] }>();
const { t, tForOwner } = useLocale();
const locations = ref<MasterRow[]>([]), targetId = ref(''), quantity = ref(props.balance.quantity);
const loading = ref(false), saving = ref(false), resultUnknown = ref(false), error = ref('');
const targets = computed(() => locations.value.filter(row => row.id !== props.balance.locationId));

function decimalUnits(value: string): bigint | undefined {
  if (!/^\d+(?:\.\d{1,6})?$/.test(value.trim())) return undefined;
  const [whole, fraction = ''] = value.trim().split('.');
  return BigInt(whole!) * 1_000_000n + BigInt(fraction.padEnd(6, '0'));
}

const validQuantity = computed(() => {
  const amount = decimalUnits(quantity.value), maximum = decimalUnits(props.balance.quantity);
  return amount !== undefined && maximum !== undefined && amount > 0n && amount <= maximum
    && (!props.balance.snCode || amount === maximum);
});

async function allCatalog(kind: 'warehouse-areas' | 'locations', params: Record<string, string>): Promise<MasterRow[]> {
  const rows: MasterRow[] = [];
  let pageNo = 1;
  while (true) {
    const page = await searchCatalog(kind, pageNo, 200, params);
    rows.push(...page.records);
    if (pageNo >= page.totalPages) return rows;
    pageNo++;
  }
}

async function loadLocations(): Promise<void> {
  loading.value = true; error.value = '';
  try {
    const areas = await allCatalog('warehouse-areas', { warehouseId: props.balance.warehouseId, status: 'ENABLED' });
    const pages = await Promise.all(areas.map(area => allCatalog('locations',
      { warehouseAreaId: area.id, status: 'ENABLED' })));
    locations.value = pages.flat().filter(row => row.status === 'ENABLED');
  } catch (cause) {
    error.value = isApiError(cause) && cause.kind === 'forbidden'
      ? t('wms.inventory.forbidden') : t('wms.inventory.transfer.locationsfailed');
  } finally { loading.value = false; }
}

async function submit(): Promise<void> {
  if (saving.value || resultUnknown.value || !targetId.value || !validQuantity.value) return;
  saving.value = true; error.value = '';
  try {
    await transferInventory({ requestKey: crypto.randomUUID(), balanceId: props.balance.id,
      targetLocationId: targetId.value, quantity: quantity.value });
    emit('done');
  } catch (cause) {
    if (isApiError(cause) && cause.resultUnknown) {
      resultUnknown.value = true; error.value = t('wms.inventory.transfer.unknown');
    } else if (isApiError(cause) && cause.kind === 'forbidden') error.value = t('wms.inventory.forbidden');
    else if (isApiError(cause) && cause.kind === 'conflict') error.value = t('wms.inventory.transfer.conflict');
    else error.value = t('wms.inventory.transfer.failed');
  } finally { saving.value = false; }
}

onMounted(() => { void loadLocations(); });
</script>

<template>
  <MomModal :open="true" :title="t('wms.inventory.transfer.action')"
    :close-label="tForOwner('system', 'system.common.close')" :busy="saving" @close="emit('close')">
    <div class="inventory-transfer">
      <p>{{ balance.materialCode }} · {{ balance.materialName }} · {{ balance.batchCode || '—' }} · {{ balance.snCode || '—' }}</p>
      <p>{{ t('wms.inventory.qualityStatus') }}：{{ t(`wms.inventory.quality.${balance.qualityStatus.toLowerCase()}` as Parameters<typeof t>[0]) }}
        · {{ t('wms.inventory.warehouseStatus') }}：{{ t(`wms.inventory.warehouse.${balance.warehouseStatus.toLowerCase()}` as Parameters<typeof t>[0]) }}</p>
      <p>{{ t('wms.inventory.warehouse') }}：{{ balance.warehouseCode }}
        · {{ t('wms.inventory.location') }}：{{ balance.locationCode }}</p>
      <p>{{ t('wms.inventory.transfer.available') }}：{{ balance.quantity }} {{ balance.uomCode }}</p>
      <p v-if="balance.snCode">{{ t('wms.inventory.transfer.snfull') }}</p>
      <p v-if="error" role="alert">{{ error }}</p>
      <form class="inventory-transfer__form" @submit.prevent="submit">
        <label>{{ t('wms.inventory.transfer.target') }}
          <MomSelect v-model="targetId" :options="targets.map(row => ({ value: row.id, label: `${row.code} · ${row.name}` }))"
            :disabled="loading || saving || resultUnknown" />
        </label>
        <label>{{ t('wms.inventory.quantity') }}
          <MomInput v-model="quantity" :disabled="saving || resultUnknown" />
        </label>
        <MomButton type="submit" :disabled="loading || saving || resultUnknown || !targetId || !validQuantity">
          {{ t('wms.inventory.transfer.submit') }}
        </MomButton>
      </form>
    </div>
    <template #footer>
      <MomButton v-if="resultUnknown" variant="outline" @click="emit('refresh')">{{ t('wms.inventory.retry') }}</MomButton>
      <MomButton variant="outline" :disabled="saving" @click="emit('close')">{{ tForOwner('system', 'system.common.close') }}</MomButton>
    </template>
  </MomModal>
</template>

<style scoped>
.inventory-transfer { display: grid; gap: 0.75rem; }
.inventory-transfer p { margin: 0; }
.inventory-transfer__form { display: grid; gap: 1rem; }
.inventory-transfer__form label { display: grid; gap: 0.35rem; }
</style>
