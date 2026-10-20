<script setup lang="ts">
import { computed, ref } from 'vue';
import MomModal from '../../../shared/components/MomModal.vue';
import { MomButton, MomQuantityInput, MomReferenceSelect } from '../../../shared/ui';
import { getCatalog, searchCatalog } from '../../mdm/api/catalog-api';
import { isApiError } from '../../../shared/api/errors';
import { useLocale } from '../../../shared/i18n/locale';
import { transferInventory, type InventoryDetail } from '../api/inventory-api';

const props = defineProps<{ balance: InventoryDetail }>();
const emit = defineEmits<{ close: []; done: []; refresh: [] }>();
const { t, tForOwner } = useLocale();
const targetId = ref(''), quantity = ref(props.balance.quantity);
const saving = ref(false), resultUnknown = ref(false), error = ref('');
const targetReference = {
  async search(keyword: string, page: number, signal: AbortSignal) {
    const result = await searchCatalog('locations', page, 20,
      { warehouseId: props.balance.warehouseId, keyword, status: 'ENABLED' }, signal);
    return { records: result.records.filter(row => row.id !== props.balance.locationId), totalPages: result.totalPages };
  },
  resolve: (id: string, signal: AbortSignal) => getCatalog('locations', id, signal),
};

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

</script>

<template>
  <MomModal :open="true" :title="t('wms.inventory.transfer.action')"
    :close-label="tForOwner('system', 'system.common.close')" :busy="saving" @close="emit('close')">
    <div class="inventory-transfer">
      <dl class="inventory-transfer__summary">
        <div><dt>{{ t('wms.inventory.material') }}</dt><dd><strong>{{ balance.materialName }}</strong> · {{ balance.materialCode }}<br>{{ balance.batchCode || '—' }} · {{ balance.snCode || '—' }}</dd></div>
        <div><dt>{{ t('wms.inventory.warehouse') }} / {{ t('wms.inventory.location') }}</dt><dd>{{ balance.warehouseCode }} / {{ balance.locationCode }}</dd></div>
        <div><dt>{{ t('wms.inventory.transfer.available') }}</dt><dd>{{ balance.quantity }} {{ balance.uomCode }}</dd></div>
        <div><dt>{{ t('wms.inventory.qualityStatus') }} / {{ t('wms.inventory.warehouseStatus') }}</dt><dd>{{ t(`wms.inventory.quality.${balance.qualityStatus.toLowerCase()}` as Parameters<typeof t>[0]) }} / {{ t(`wms.inventory.warehouse.${balance.warehouseStatus.toLowerCase()}` as Parameters<typeof t>[0]) }}</dd></div>
      </dl>
      <p v-if="balance.snCode">{{ t('wms.inventory.transfer.snfull') }}</p>
      <p v-if="error" role="alert">{{ error }}</p>
      <form id="inventory-transfer-form" class="inventory-transfer__form" @submit.prevent="submit">
        <label>{{ t('wms.inventory.transfer.target') }}
          <MomReferenceSelect v-model="targetId" :label="t('wms.inventory.transfer.target')"
            :search="targetReference.search" :resolve="targetReference.resolve"
            :disabled="saving || resultUnknown" />
        </label>
        <label>{{ t('wms.inventory.transfer.moveQuantity') }}
          <MomQuantityInput v-model="quantity" :unit-value="balance.uomCode"
            :units="[{ value: balance.uomCode, label: balance.uomCode }]" :label="t('wms.inventory.transfer.moveQuantity')"
            unit-disabled :disabled="saving || resultUnknown" />
        </label>
      </form>
    </div>
    <template #footer>
      <MomButton v-if="resultUnknown" variant="outline" @click="emit('refresh')">{{ t('wms.inventory.retry') }}</MomButton>
      <MomButton variant="outline" :disabled="saving" @click="emit('close')">{{ tForOwner('system', 'system.common.close') }}</MomButton>
      <MomButton type="submit" form="inventory-transfer-form" :disabled="saving || resultUnknown || !targetId || !validQuantity">
        {{ t('wms.inventory.transfer.submit') }}
      </MomButton>
    </template>
  </MomModal>
</template>

<style scoped>
.inventory-transfer { display: grid; gap: var(--mom-space-4); }
.inventory-transfer p { margin: 0; }
.inventory-transfer__summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--mom-space-3) var(--mom-space-4); margin: 0; padding-bottom: var(--mom-space-4); border-bottom: 1px solid var(--mom-color-border); }
.inventory-transfer__summary > div { min-width: 0; }
.inventory-transfer__summary dt { color: var(--mom-color-text-secondary); font-size: var(--mom-font-size-xs); }
.inventory-transfer__summary dd { margin: var(--mom-space-1) 0 0; overflow-wrap: anywhere; }
.inventory-transfer__form { display: grid; gap: 1rem; }
.inventory-transfer__form label { display: grid; gap: 0.35rem; }
@media (max-width: 600px) { .inventory-transfer__summary { grid-template-columns: minmax(0, 1fr); } }
</style>
