<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { hasAuthority } from '../../auth/model/auth-permissions';
import { useAuthSession } from '../../auth/model/auth-session';
import { catalogReference } from '../../mdm/api/reference-api';
import MomManagementHeader from '../../../shared/components/MomManagementHeader.vue';
import MomListSurface from '../../../shared/components/MomListSurface.vue';
import MomDataTable, { type MomColumn } from '../../../shared/components/MomDataTable.vue';
import MomCrudPagination from '../../../shared/components/MomCrudPagination.vue';
import PageContainer from '../../../shared/components/PageContainer.vue';
import { MomButton, MomReferenceSelect } from '../../../shared/ui';
import { classifyWriteFailure, isApiError } from '../../../shared/api/errors';
import { useLocale } from '../../../shared/i18n/locale';
import { ROUTE_NAMES } from '../../../router/route-names';
import { createCount, findCountByRequestKey, listCounts, type CountSummary, type CountStatus } from '../api/inventory-count-api';
import './inventory-pages.css';
const router = useRouter(), { t, tForOwner } = useLocale();
const { userId } = useAuthSession();
const rows=ref<CountSummary[]>([]), warehouseId=ref('');
const warehouseReference=catalogReference('warehouses',()=>({status:'ENABLED'}));
const pageNo=ref(1), pageSize=ref(20), total=ref(0);
const loading=ref(false), saving=ref(false), error=ref(''), unknown=ref(false);
const pendingStorageKey='mom.wms.inventory-count.pending-create';
interface PendingCreate { userId:string; requestKey:string; warehouseId:string; locationIds:string[]; materialIds:string[] }
const pending=ref<PendingCreate|null>(null);
function clearPending():void {
  pending.value=null;
  try { window.sessionStorage.removeItem(pendingStorageKey); } catch { /* 存储不可用时仍清理内存。 */ }
}
function restorePending():void {
  try {
    const raw=window.sessionStorage.getItem(pendingStorageKey);
    if(!raw)return;
    const value:unknown=JSON.parse(raw);
    if(!value || typeof value!=='object') { clearPending();return; }
    const record=value as Record<string,unknown>;
    if(typeof record.userId!=='string'||record.userId!==userId.value) { clearPending();return; }
    if(typeof record.requestKey!=='string'||!record.requestKey||typeof record.warehouseId!=='string'||!record.warehouseId
      ||!Array.isArray(record.locationIds)||!record.locationIds.every(id=>typeof id==='string')
      ||!Array.isArray(record.materialIds)||!record.materialIds.every(id=>typeof id==='string')) { clearPending();return; }
    pending.value=record as unknown as PendingCreate;
    warehouseId.value=pending.value.warehouseId;
    unknown.value=true;
    error.value=t('wms.inventory.count.unknown');
    void reconcile();
  } catch { clearPending();error.value=t('wms.inventory.count.writefailed'); }
}
watch(userId,current=>{ if(pending.value && current!==pending.value.userId) {
  clearPending();unknown.value=false;error.value='';
} });
const canCreate=computed(()=>hasAuthority('wms:inventory-count:create') && hasAuthority('mdm:warehouse:read'));
const columns=computed<MomColumn[]>(()=>[
  { key:'taskNo',title:t('wms.inventory.count.number'),minWidth:160 },
  { key:'warehouseCode',title:t('wms.inventory.warehouse'),minWidth:150 },
  { key:'status',title:t('wms.inventory.count.status'),minWidth:130 },
  { key:'createdAt',title:t('wms.inventory.count.createdat'),minWidth:190 },
  { key:'actions',title:tForOwner('system','system.common.actions'),width:120,resizable:false },
]);
function status(value:CountStatus):string { return t(`wms.inventory.count.${value.toLowerCase()}` as Parameters<typeof t>[0]); }
async function load(next=pageNo.value,size=pageSize.value):Promise<void> {
  loading.value=true; error.value=unknown.value?t('wms.inventory.count.unknown'):'';
  try {
    const page=await listCounts(next,size);
    rows.value=page.records; pageNo.value=page.pageNo; pageSize.value=page.pageSize; total.value=page.total;
  } catch(cause) { error.value=isApiError(cause)&&cause.kind==='forbidden'
    ? t('wms.inventory.forbidden') : t('wms.inventory.count.loadfailed'); }
  finally { loading.value=false; }
}
async function create():Promise<void> {
  if(!canCreate.value||!warehouseId.value||!userId.value||saving.value||unknown.value||pending.value)return;
  const request:PendingCreate={userId:userId.value,requestKey:crypto.randomUUID(),warehouseId:warehouseId.value,
    locationIds:[],materialIds:[]};
  try { window.sessionStorage.setItem(pendingStorageKey,JSON.stringify(request)); }
  catch { error.value=t('wms.inventory.count.writefailed');return; }
  pending.value=request;saving.value=true; error.value='';
  let createdId:string|undefined;
  try { const detail=await createCount(request.requestKey,request.warehouseId,
    {locationIds:request.locationIds,materialIds:request.materialIds});
    if(userId.value!==request.userId)return;
    createdId=detail.task.id;clearPending(); }
  catch(cause) { if(userId.value!==request.userId)return;
    unknown.value=classifyWriteFailure(cause)==='unknown';
    if(!unknown.value)clearPending();
    error.value=unknown.value?t('wms.inventory.count.unknown')
      :isApiError(cause)&&cause.message?cause.message:t('wms.inventory.count.writefailed'); }
  finally { saving.value=false; }
  if(createdId)await router.push({name:ROUTE_NAMES.wmsInventoryCountDetail,params:{id:createdId}});
}
async function reconcile():Promise<void> {
  const request=pending.value;
  if(!unknown.value||!request||saving.value||request.userId!==userId.value)return;
  saving.value=true;
  let createdId:string|undefined;
  try {
    const detail=await findCountByRequestKey(request.requestKey);
    if(request.userId!==userId.value)return;
    if(!detail || detail.task.requestKey!==request.requestKey || detail.task.warehouseId!==request.warehouseId) {
      error.value=t('wms.inventory.count.unknown');return;
    }
    createdId=detail.task.id;unknown.value=false;clearPending();error.value='';
  } catch {if(request.userId===userId.value)error.value=t('wms.inventory.count.unknown');}
  finally {saving.value=false;}
  if(createdId)await router.push({name:ROUTE_NAMES.wmsInventoryCountDetail,params:{id:createdId}});
}
function open(row:CountSummary):void { void router.push({name:ROUTE_NAMES.wmsInventoryCountDetail,params:{id:row.id}}); }
onMounted(()=>{restorePending();void load();});
</script>
<template>
  <PageContainer><section class="inventory-page">
    <MomManagementHeader title-id="wms-count-title" :title="t('wms.inventory.count.title')" :description="t('wms.inventory.count.hint')">
      <template #actions>
        <MomReferenceSelect v-if="canCreate" v-model="warehouseId" class="inventory-page__header-reference"
          :label="t('wms.inventory.count.selectwarehouse')" :search="warehouseReference.search"
          :resolve="warehouseReference.resolve" :disabled="saving||loading||unknown" />
        <MomButton v-if="canCreate" :disabled="saving||loading||!warehouseId||unknown" @click="create">{{ t('wms.inventory.count.create') }}</MomButton>
        <MomButton variant="outline" :disabled="loading" @click="load()">{{ tForOwner('system','system.common.refresh') }}</MomButton>
      </template>
    </MomManagementHeader>
    <p v-if="error" role="alert" class="inventory-page__error">{{ error }}
      <MomButton v-if="unknown" variant="outline" :disabled="saving" @click="reconcile">{{ tForOwner('system','system.common.refresh') }}</MomButton>
    </p>
    <MomListSurface :title="t('wms.inventory.count.title')" :hint="t('wms.inventory.count.hint')" :loading="loading" :loading-text="tForOwner('system','system.common.loading')">
      <MomDataTable :rows="rows" :columns="columns" :empty-text="tForOwner('system','system.common.empty')">
        <template #cell-status="{row}">{{ status(row.status) }}</template>
        <template #cell-createdAt="{row}">{{ new Date(row.createdAt).toLocaleString() }}</template>
        <template #cell-actions="{row}"><MomButton mode="text" @click="open(row)">{{ t('wms.inventory.count.open') }}</MomButton></template>
      </MomDataTable>
      <template #footer><MomCrudPagination :page-no="pageNo" :page-size="pageSize" :total="total" :summary="`${total}`"
        :page-size-label="tForOwner('system','system.common.pageSize')" :previous-label="tForOwner('system','system.common.previous')"
        :next-label="tForOwner('system','system.common.next')" :jump-label="tForOwner('system','system.common.jump')"
        :go-label="tForOwner('system','system.common.go')" :disabled="loading" @page="load($event)" @size="load(1,$event)" /></template>
    </MomListSurface>
  </section></PageContainer>
</template>
