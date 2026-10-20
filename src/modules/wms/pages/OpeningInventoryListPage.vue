<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { hasAuthority } from '../../auth/model/auth-permissions';
import { catalogReference } from '../../mdm/api/reference-api';
import MomManagementHeader from '../../../shared/components/MomManagementHeader.vue';
import MomListSurface from '../../../shared/components/MomListSurface.vue';
import MomDataTable, { type MomColumn } from '../../../shared/components/MomDataTable.vue';
import MomCrudPagination from '../../../shared/components/MomCrudPagination.vue';
import MomModal from '../../../shared/components/MomModal.vue';
import PageContainer from '../../../shared/components/PageContainer.vue';
import { MomButton, MomReferenceSelect } from '../../../shared/ui';
import { classifyWriteFailure, isApiError } from '../../../shared/api/errors';
import { useLocale } from '../../../shared/i18n/locale';
import { ROUTE_NAMES } from '../../../router/route-names';
import { createOpeningDocument, deleteOpeningDocument, listOpeningDocuments, type OpeningDocument } from '../api/opening-api';
import './inventory-pages.css';

const router = useRouter(), { t, tForOwner } = useLocale();
const rows = ref<OpeningDocument[]>([]), warehouseId = ref('');
const warehouseReference = catalogReference('warehouses', () => ({ status: 'ENABLED' }));
const pageNo = ref(1), pageSize = ref(20), total = ref(0);
const loading = ref(false), saving = ref(false), error = ref(''), success = ref('');
const unknownWarehouseId = ref('');
const deleting = ref<OpeningDocument>();
const canCreate = computed(() => hasAuthority('wms:opening:write') && hasAuthority('mdm:warehouse:read'));
const columns = computed<MomColumn[]>(() => [
  { key: 'documentNo', title: t('wms.opening.documentNo'), minWidth: 180 },
  { key: 'warehouseCode', title: t('wms.opening.warehouse'), minWidth: 140 },
  { key: 'status', title: t('wms.opening.status'), minWidth: 130 },
  { key: 'warehouseState', title: t('wms.opening.warehouseStatus'), minWidth: 150 },
  { key: 'transactionId', title: t('wms.opening.transaction'), minWidth: 180 },
  { key: 'actions', title: tForOwner('system', 'system.common.actions'), width: 120, resizable: false },
]);
async function load(next = pageNo.value, size = pageSize.value): Promise<void> {
  loading.value = true; error.value = unknownWarehouseId.value ? t('wms.opening.createUnknown') : '';
  try {
    const documentPage = await listOpeningDocuments(next, size);
    rows.value = documentPage.records; pageNo.value = documentPage.pageNo; pageSize.value = documentPage.pageSize;
    total.value = documentPage.total;
  } catch (cause) {
    error.value = isApiError(cause) && cause.kind === 'forbidden' ? t('wms.opening.forbidden') : t('wms.opening.loadFailed');
  } finally { loading.value = false; }
}
async function create(): Promise<void> {
  if (!canCreate.value || saving.value || !warehouseId.value || unknownWarehouseId.value) return;
  saving.value = true; error.value = ''; success.value = '';
  try { const result = await createOpeningDocument(warehouseId.value); await router.push({ name: ROUTE_NAMES.wmsOpeningDetail, params: { id: result.document.id } }); }
  catch (cause) {
    if (classifyWriteFailure(cause) === 'unknown') unknownWarehouseId.value = warehouseId.value;
    error.value = unknownWarehouseId.value ? t('wms.opening.createUnknown')
      : isApiError(cause) && cause.kind === 'forbidden' ? t('wms.opening.forbidden')
      : isApiError(cause) && cause.code === 'wms.opening.reference_invalid' ? cause.message
        : t('wms.opening.writeFailed');
  }
  finally { saving.value = false; }
}
async function reconcile(): Promise<void> {
  if (!unknownWarehouseId.value || loading.value) return;
  loading.value = true;
  try {
    const page = await listOpeningDocuments(1, 20, unknownWarehouseId.value);
    // 仓库唯一约束不能区分已有草稿与本次提交，保持阻断，供人工核对。
    rows.value = page.records; error.value = t('wms.opening.createUnknown');
  } catch { error.value = t('wms.opening.createUnknown'); }
  finally { loading.value = false; }
}
function open(row: OpeningDocument): void { void router.push({ name: ROUTE_NAMES.wmsOpeningDetail, params: { id: row.id } }); }
async function remove(): Promise<void> {
  if (!deleting.value || saving.value || unknownWarehouseId.value) return;
  saving.value = true; error.value = '';
  try { await deleteOpeningDocument(deleting.value.id); deleting.value = undefined; await load(); if (!rows.value.length && pageNo.value > 1) await load(pageNo.value - 1); }
  catch (cause) { error.value = classifyWriteFailure(cause) === 'unknown' ? t('wms.opening.createUnknown')
    : isApiError(cause) && cause.kind === 'forbidden' ? t('wms.opening.forbidden') : t('wms.opening.writeFailed');
    if (classifyWriteFailure(cause) === 'unknown') unknownWarehouseId.value = deleting.value?.warehouseId ?? warehouseId.value; }
  finally { saving.value = false; }
}
onMounted(() => { void load(); });
</script>

<template>
  <PageContainer><section class="inventory-page">
    <MomManagementHeader title-id="wms-opening-title" :title="t('wms.opening.title')" :description="t('wms.opening.hint')">
      <template #actions>
        <MomReferenceSelect v-if="canCreate" v-model="warehouseId" class="inventory-page__header-reference"
          :label="t('wms.opening.selectWarehouse')" :search="warehouseReference.search"
          :resolve="warehouseReference.resolve" :disabled="saving || loading" />
        <MomButton v-if="canCreate" :disabled="saving || loading || !warehouseId || !!unknownWarehouseId" @click="create">{{ t('wms.opening.create') }}</MomButton>
        <MomButton variant="outline" :disabled="loading" @click="load()">{{ tForOwner('system', 'system.common.refresh') }}</MomButton>
      </template>
    </MomManagementHeader>
    <p v-if="error" role="alert" class="inventory-page__error">{{ error }} <MomButton v-if="unknownWarehouseId" variant="outline" :disabled="loading" @click="reconcile">{{ tForOwner('system', 'system.common.refresh') }}</MomButton></p><p v-if="success" role="status">{{ success }}</p>
    <MomListSurface :title="t('wms.opening.title')" :hint="t('wms.opening.hint')" :loading="loading" :loading-text="tForOwner('system', 'system.common.loading')">
      <MomDataTable :rows="rows" :columns="columns" :empty-text="tForOwner('system', 'system.common.empty')">
        <template #cell-status="{ row }">{{ t(row.status === 'DRAFT' ? 'wms.opening.draft' : 'wms.opening.posted') }}</template>
        <template #cell-warehouseState="{ row }">{{ t(row.warehouseState === 'INITIALIZING' ? 'wms.opening.initializing' : row.warehouseState === 'PENDING_ACTIVATION' ? 'wms.opening.pendingActivation' : 'wms.opening.active') }}</template>
        <template #cell-transactionId="{ row }">{{ row.transactionId || '—' }}</template>
        <template #cell-actions="{ row }"><MomButton mode="text" @click="open(row)">{{ t('wms.opening.open') }}</MomButton><MomButton v-if="canCreate && row.status === 'DRAFT'" mode="text" :disabled="saving || !!unknownWarehouseId" @click="deleting = row">{{ tForOwner('system', 'system.common.delete') }}</MomButton></template>
      </MomDataTable>
      <template #footer><MomCrudPagination :page-no="pageNo" :page-size="pageSize" :total="total"
        :summary="`${total}`" :page-size-label="tForOwner('system', 'system.common.pageSize')"
        :previous-label="tForOwner('system', 'system.common.previous')" :next-label="tForOwner('system', 'system.common.next')"
        :jump-label="tForOwner('system', 'system.common.jump')" :go-label="tForOwner('system', 'system.common.go')" :disabled="loading"
        @page="load($event)" @size="load(1, $event)" /></template>
    </MomListSurface>
    <MomModal :open="!!deleting" :title="t('wms.opening.deleteDocumentConfirm')" :close-label="tForOwner('system', 'system.common.close')" :busy="saving" @close="deleting = undefined">
      <p>{{ t('wms.opening.deleteDocumentConfirm') }}</p><template #footer><MomButton variant="outline" :disabled="saving" @click="deleting = undefined">{{ tForOwner('system', 'system.common.cancel') }}</MomButton><MomButton variant="destructive" :disabled="saving" @click="remove">{{ tForOwner('system', 'system.common.delete') }}</MomButton></template>
    </MomModal>
  </section></PageContainer>
</template>
