<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { hasAuthority } from '../../auth/model/auth-permissions';
import { searchMaterials, type Material } from '../../mdm/api/material-api';
import { searchCatalog, type MasterRow } from '../../mdm/api/catalog-api';
import MomManagementHeader from '../../../shared/components/MomManagementHeader.vue';
import MomListSurface from '../../../shared/components/MomListSurface.vue';
import MomDataTable, { type MomColumn } from '../../../shared/components/MomDataTable.vue';
import PageContainer from '../../../shared/components/PageContainer.vue';
import MomModal from '../../../shared/components/MomModal.vue';
import { MomButton, MomInput, MomSelect } from '../../../shared/ui';
import { isApiError } from '../../../shared/api/errors';
import { useLocale } from '../../../shared/i18n/locale';
import { ROUTE_NAMES } from '../../../router/route-names';
import { addOpeningLine, activateWarehouseInventory, deleteOpeningLine, editOpeningLine, getOpeningDocument, postOpeningDocument, type OpeningDetail, type OpeningLine, type OpeningLineInput } from '../api/opening-api';
import './inventory-pages.css';

const route = useRoute(), router = useRouter(), { t, tForOwner } = useLocale();
const id = String(route.params.id), detail = ref<OpeningDetail>(), materials = ref<Material[]>([]), locations = ref<MasterRow[]>([]);
const loading = ref(false), saving = ref(false), error = ref(''), notice = ref(''), deleting = ref<OpeningLine>();
const editingLineId = ref('');
const materialKeyword = ref(''), locationKeyword = ref('');
const confirmActivation = ref(false);
const form = reactive({ materialId: '', locationId: '', batchCode: '', snCode: '', quantity: '', qualityStatus: 'PENDING', warehouseStatus: 'NORMAL' });
const canWrite = computed(() => hasAuthority('wms:opening:write') && hasAuthority('mdm:material:read')
  && hasAuthority('mdm:location:read') && hasAuthority('mdm:warehouse:read') && detail.value?.document.status === 'DRAFT');
const canPost = computed(() => hasAuthority('wms:opening:post') && hasAuthority('mdm:material:read')
  && hasAuthority('mdm:location:read') && hasAuthority('mdm:warehouse:read') && detail.value?.document.status === 'DRAFT');
const canActivate = computed(() => hasAuthority('wms:opening:activate') && hasAuthority('mdm:warehouse:read')
  && detail.value?.document.warehouseState === 'PENDING_ACTIVATION');
const columns = computed<MomColumn[]>(() => [
  { key: 'materialCode', title: t('wms.opening.material'), minWidth: 150 }, { key: 'batchCode', title: t('wms.opening.batch'), minWidth: 120 },
  { key: 'snCode', title: t('wms.opening.sn'), minWidth: 120 }, { key: 'locationCode', title: t('wms.opening.location'), minWidth: 130 },
  { key: 'quantity', title: t('wms.opening.quantity'), minWidth: 120 }, { key: 'uomCode', title: t('wms.opening.uom'), minWidth: 80 },
  { key: 'qualityStatus', title: t('wms.opening.quality'), minWidth: 120 }, { key: 'warehouseStatus', title: t('wms.opening.warehouseStatus'), minWidth: 120 },
  { key: 'actions', title: tForOwner('system', 'system.common.actions'), width: 170, resizable: false },
]);
async function load(): Promise<void> {
  loading.value = true; error.value = '';
  try { detail.value = await getOpeningDocument(id); }
  catch (cause) { error.value = isApiError(cause) && cause.kind === 'forbidden' ? t('wms.opening.forbidden') : t('wms.opening.loadFailed'); }
  finally { loading.value = false; }
}
async function lookup(): Promise<void> {
  try {
    if (detail.value) {
      const areaPage = await searchCatalog('warehouse-areas', 1, 200, { warehouseId: detail.value.document.warehouseId, status: 'ENABLED' });
      const locationPages = await Promise.all(areaPage.records.map(area =>
        searchCatalog('locations', 1, 200, { warehouseAreaId: area.id }).then(page => page.records)));
      locations.value = locationPages.flat().filter(location => location.status === 'ENABLED');
    }
    await searchMaterialOptions();
  } catch { error.value = t('wms.opening.referenceLoadFailed'); }
}
async function searchMaterialOptions(): Promise<void> {
  try { materials.value = (await searchMaterials(1, 100, { keyword: materialKeyword.value || undefined, status: 'ENABLED' })).records; }
  catch { error.value = t('wms.opening.referenceLoadFailed'); }
}
const visibleLocations = computed(() => locations.value.filter(location =>
  `${location.code} ${location.name}`.toLowerCase().includes(locationKeyword.value.toLowerCase())));
function edit(line: OpeningLine): void {
  form.materialId = line.materialId; form.locationId = line.locationId; form.batchCode = line.batchCode ?? '';
  form.snCode = line.snCode ?? ''; form.quantity = line.quantity; form.qualityStatus = line.qualityStatus; form.warehouseStatus = line.warehouseStatus; editingLineId.value = line.id;
}
function clear(): void { Object.assign(form, { materialId: '', locationId: '', batchCode: '', snCode: '', quantity: '', qualityStatus: 'PENDING', warehouseStatus: 'NORMAL' }); editingLineId.value = ''; }
async function saveLine(lineId?: string): Promise<void> {
  if (!canWrite.value || saving.value || !form.materialId || !form.locationId || Number(form.quantity) <= 0) return;
  saving.value = true; error.value = ''; notice.value = '';
  const payload: OpeningLineInput = { materialId: form.materialId, locationId: form.locationId,
    batchCode: form.batchCode || null, snCode: form.snCode || null, quantity: form.quantity,
    qualityStatus: form.qualityStatus as OpeningLineInput['qualityStatus'], warehouseStatus: form.warehouseStatus as OpeningLineInput['warehouseStatus'] };
  try { const targetLineId = lineId || editingLineId.value; detail.value = targetLineId ? await editOpeningLine(id, targetLineId, payload) : await addOpeningLine(id, payload); clear(); notice.value = t('wms.opening.lineSaved'); }
  catch (cause) { error.value = isApiError(cause) && cause.kind === 'forbidden' ? t('wms.opening.forbidden') : t('wms.opening.writeFailed'); }
  finally { saving.value = false; }
}
async function removeLine(): Promise<void> {
  if (!deleting.value || saving.value) return;
  saving.value = true;
  try { detail.value = await deleteOpeningLine(id, deleting.value.id); deleting.value = undefined; }
  catch { error.value = t('wms.opening.writeFailed'); }
  finally { saving.value = false; }
}
async function post(): Promise<void> {
  if (!canPost.value || saving.value || !detail.value?.lines.length) return;
  saving.value = true; error.value = ''; notice.value = '';
  try { const result = await postOpeningDocument(id); detail.value = result.detail; notice.value = `${t('wms.opening.postedResult')}: ${result.transactionId}`; }
  catch (cause) { error.value = isApiError(cause) && cause.kind === 'forbidden' ? t('wms.opening.forbidden') : t('wms.opening.postFailed'); }
  finally { saving.value = false; }
}
async function activate(): Promise<void> {
  if (!detail.value || !hasAuthority('wms:opening:activate') || saving.value) return;
  saving.value = true; error.value = '';
  try { await activateWarehouseInventory(detail.value.document.warehouseId); confirmActivation.value = false; notice.value = t('wms.opening.activated'); await load(); }
  catch { error.value = t('wms.opening.activateFailed'); }
  finally { saving.value = false; }
}
function verifyInventory(): void { void router.push({ name: ROUTE_NAMES.wmsInventoryDetails, query: { warehouseId: detail.value?.document.warehouseId } }); }
onMounted(async () => { await load(); if (canWrite.value) await lookup(); });
</script>

<template>
  <PageContainer><section class="inventory-page opening-detail">
    <MomManagementHeader title-id="wms-opening-detail-title" :title="t('wms.opening.title')" :description="`${t('wms.opening.warehouse')}: ${detail?.document.warehouseCode || ''}`">
      <template #actions>
        <MomButton variant="outline" @click="router.push({ name: ROUTE_NAMES.wmsOpeningDocuments })">{{ t('wms.opening.back') }}</MomButton>
        <MomButton v-if="canPost" :disabled="saving || !detail?.lines.length" @click="post">{{ t('wms.opening.confirmPost') }}</MomButton>
        <MomButton v-if="canActivate" :disabled="saving" @click="confirmActivation = true">{{ t('wms.opening.activate') }}</MomButton>
        <MomButton v-if="detail?.document.status === 'POSTED'" variant="outline" @click="verifyInventory">{{ t('wms.opening.verifyInventory') }}</MomButton>
      </template>
    </MomManagementHeader>
    <section v-if="detail" class="opening-detail__summary" :aria-label="t('wms.opening.detail')">
      <div class="opening-detail__document">
        <span>{{ t('wms.opening.documentNo') }}</span>
        <code>{{ detail.document.documentNo }}</code>
      </div>
      <dl class="opening-detail__states">
        <div>
          <dt>{{ t('wms.opening.status') }}</dt>
          <dd><span class="opening-detail__status" :class="`opening-detail__status--${detail.document.status.toLowerCase()}`">{{ t(detail.document.status === 'DRAFT' ? 'wms.opening.draft' : 'wms.opening.posted') }}</span></dd>
        </div>
        <div>
          <dt>{{ t('wms.opening.warehouseStatus') }}</dt>
          <dd><span class="opening-detail__status" :class="`opening-detail__status--${detail.document.warehouseState.toLowerCase()}`">{{ t(detail.document.warehouseState === 'INITIALIZING' ? 'wms.opening.initializing' : detail.document.warehouseState === 'PENDING_ACTIVATION' ? 'wms.opening.pendingActivation' : 'wms.opening.active') }}</span></dd>
        </div>
        <div v-if="detail.document.transactionId" class="opening-detail__transaction">
          <dt>{{ t('wms.opening.transaction') }}</dt>
          <dd><code>{{ detail.document.transactionId }}</code></dd>
          <dd><MomButton v-if="hasAuthority('wms:inventory:read')" variant="outline" @click="router.push({ name: ROUTE_NAMES.wmsInventoryHistory,
            query: { transactionType: 'OPENING', sourceType: 'OPENING_DOCUMENT', sourceId: id } })">{{ t('wms.inventory.history.open') }}</MomButton></dd>
        </div>
      </dl>
    </section>
    <p v-if="error" role="alert" class="inventory-page__error">{{ error }}</p><p v-if="notice" role="status">{{ notice }}</p>
    <MomListSurface :title="t('wms.opening.lines')" :hint="t('wms.opening.hint')" :loading="loading" :loading-text="tForOwner('system', 'system.common.loading')">
      <form v-if="canWrite" class="opening-detail__editor" @submit.prevent="saveLine()">
        <div class="opening-detail__fields opening-detail__fields--reference">
          <label class="opening-detail__field opening-detail__field--wide">{{ t('wms.opening.material') }}<MomSelect v-model="form.materialId" :options="materials.map(m => ({ value: m.id, label: `${m.code} · ${m.name}` }))" :placeholder="t('wms.opening.selectMaterial')" /></label>
          <label class="opening-detail__field opening-detail__search-field">{{ t('wms.opening.materialSearch') }}<span class="opening-detail__search-control"><MomInput v-model="materialKeyword" :maxlength="200" /><MomButton type="button" variant="outline" :disabled="loading" @click="searchMaterialOptions">{{ tForOwner('system', 'system.common.search') }}</MomButton></span></label>
          <label class="opening-detail__field">{{ t('wms.opening.location') }}<MomSelect v-model="form.locationId" :options="visibleLocations.map(l => ({ value: l.id, label: `${l.code} · ${l.name}` }))" :placeholder="t('wms.opening.selectLocation')" /></label>
          <label class="opening-detail__field">{{ t('wms.opening.locationSearch') }}<MomInput v-model="locationKeyword" :maxlength="200" /></label>
        </div>
        <div class="opening-detail__fields opening-detail__fields--inventory">
          <label class="opening-detail__field">{{ t('wms.opening.batch') }}<MomInput v-model="form.batchCode" :maxlength="128" /></label>
          <label class="opening-detail__field">{{ t('wms.opening.sn') }}<MomInput v-model="form.snCode" :maxlength="128" /></label>
          <label class="opening-detail__field">{{ t('wms.opening.quantity') }}<MomInput v-model="form.quantity" type="number" min="0.000001" step="0.000001" /></label>
          <label class="opening-detail__field">{{ t('wms.opening.quality') }}<MomSelect v-model="form.qualityStatus" :options="['PENDING','QUALIFIED','RESTRICTED','REJECTED'].map(value => ({ value, label: t(`wms.inventory.quality.${value.toLowerCase()}` as Parameters<typeof t>[0]) }))" /></label>
          <label class="opening-detail__field">{{ t('wms.opening.warehouseStatus') }}<MomSelect v-model="form.warehouseStatus" :options="[{ value:'NORMAL',label:t('wms.inventory.warehouse.normal') },{ value:'FROZEN',label:t('wms.inventory.warehouse.frozen') }]" /></label>
        </div>
        <div class="opening-detail__form-actions">
          <MomButton type="submit" :disabled="saving">{{ editingLineId ? tForOwner('system', 'system.common.save') : t('wms.opening.addLine') }}</MomButton>
          <MomButton v-if="editingLineId" type="button" variant="outline" :disabled="saving" @click="clear">{{ tForOwner('system', 'system.common.cancel') }}</MomButton>
        </div>
      </form>
      <p v-if="canPost && !detail?.lines.length" class="opening-detail__post-hint" role="status">{{ t('wms.opening.postRequiresLines') }}</p>
      <MomDataTable v-if="detail" :rows="detail.lines" :columns="columns" :empty-text="detail.lines.length ? tForOwner('system', 'system.common.empty') : t('wms.opening.emptyLines')">
        <template #cell-qualityStatus="{ row }">{{ t(`wms.inventory.quality.${row.qualityStatus.toLowerCase()}` as Parameters<typeof t>[0]) }}</template>
        <template #cell-warehouseStatus="{ row }">{{ t(`wms.inventory.warehouse.${row.warehouseStatus.toLowerCase()}` as Parameters<typeof t>[0]) }}</template>
        <template #cell-actions="{ row }"><template v-if="canWrite"><MomButton mode="text" :disabled="saving" @click="edit(row)">{{ tForOwner('system', 'system.common.edit') }}</MomButton><MomButton mode="text" :disabled="saving" @click="deleting = row">{{ tForOwner('system', 'system.common.delete') }}</MomButton></template></template>
      </MomDataTable>
    </MomListSurface>
    <MomModal :open="!!deleting" :title="t('wms.opening.deleteConfirm')" :close-label="tForOwner('system', 'system.common.close')" :busy="saving" @close="deleting = undefined">
      <p>{{ t('wms.opening.deleteConfirm') }}</p><template #footer><MomButton variant="outline" :disabled="saving" @click="deleting = undefined">{{ tForOwner('system', 'system.common.cancel') }}</MomButton><MomButton variant="destructive" :disabled="saving" @click="removeLine">{{ tForOwner('system', 'system.common.delete') }}</MomButton></template>
    </MomModal>
    <MomModal :open="confirmActivation" :title="t('wms.opening.activationConfirm')" :close-label="tForOwner('system', 'system.common.close')" :busy="saving" @close="confirmActivation = false">
      <p>{{ t('wms.opening.activationHint') }}</p><template #footer><MomButton variant="outline" :disabled="saving" @click="confirmActivation = false">{{ tForOwner('system', 'system.common.cancel') }}</MomButton><MomButton :disabled="saving" @click="activate">{{ t('wms.opening.activate') }}</MomButton></template>
    </MomModal>
  </section></PageContainer>
</template>
