<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { hasAuthority } from '../../auth/model/auth-permissions';
import { getMaterial } from '../../mdm/api/material-api';
import { getCatalog } from '../../mdm/api/catalog-api';
import { getUomCatalog } from '../../mdm/api/uom-api';
import { activeMaterialReference, catalogReference } from '../../mdm/api/reference-api';
import MomManagementHeader from '../../../shared/components/MomManagementHeader.vue';
import MomListSurface from '../../../shared/components/MomListSurface.vue';
import MomDataTable, { type MomColumn } from '../../../shared/components/MomDataTable.vue';
import MomModal from '../../../shared/components/MomModal.vue';
import PageContainer from '../../../shared/components/PageContainer.vue';
import { MomButton, MomInput, MomQuantityInput, MomReferenceSelect, MomSelect } from '../../../shared/ui';
import { classifyWriteFailure, isApiError } from '../../../shared/api/errors';
import { useLocale } from '../../../shared/i18n/locale';
import { ROUTE_NAMES } from '../../../router/route-names';
import { addExtra, adjustCount, cancelCount, confirmCount, editCountScope, getCount, saveCount, startCount,
  type CountDetail, type CountLine, type ExtraInput, type QualityStatus, type WarehouseStatus } from '../api/inventory-count-api';
import './inventory-pages.css';
const route=useRoute(), router=useRouter(), {t,tForOwner}=useLocale(), id=String(route.params.id);
const detail=ref<CountDetail>();
const loading=ref(false),saving=ref(false),error=ref(''),notice=ref(''),blocked=ref(false),pending=ref('');
const scopeMaterial=ref(''),scopeLocation=ref('');
const referenceNames=reactive<Record<string,string>>({});
const extraUomCode=ref('');
const locationReference=catalogReference('locations',()=>({warehouseId:detail.value?.task.warehouseId??'',status:'ENABLED'}));
let uomSequence=0;
const scope=reactive({materialIds:[] as string[],locationIds:[] as string[]});
const quantities=reactive<Record<string,string>>({});
const extra=reactive({materialId:'',locationId:'',batchCode:'',snCode:'',qualityStatus:'PENDING',warehouseStatus:'NORMAL',quantity:''});
let detailRequest=0;
let conflictBlocked=false;
watch(()=>extra.materialId,async value=>{
  const current=++uomSequence;extraUomCode.value='';
  if(!value)return;
  try {const material=await getMaterial(value);const uom=await getUomCatalog('uoms',material.baseUomId);
    if(current===uomSequence)extraUomCode.value=uom.code;}
  catch {if(current===uomSequence)error.value=t('wms.inventory.count.referencefailed');}
});
const draft=computed(()=>detail.value?.task.status==='DRAFT');
const counting=computed(()=>detail.value?.task.status==='COUNTING');
const confirmed=computed(()=>detail.value?.task.status==='CONFIRMED');
const canScope=computed(()=>draft.value&&hasAuthority('wms:inventory-count:write')&&hasAuthority('mdm:material:read')&&hasAuthority('mdm:location:read'));
const canStart=computed(()=>draft.value&&hasAuthority('wms:inventory-count:start'));
const canCount=computed(()=>counting.value&&hasAuthority('wms:inventory-count:count'));
const canExtra=computed(()=>canCount.value&&hasAuthority('mdm:material:read')&&hasAuthority('mdm:location:read'));
const canConfirm=computed(()=>counting.value&&hasAuthority('wms:inventory-count:confirm'));
const canAdjust=computed(()=>confirmed.value&&hasAuthority('wms:inventory-count:adjust'));
const canCancel=computed(()=>(draft.value||counting.value)&&hasAuthority('wms:inventory-count:write'));
const columns=computed<MomColumn[]>(()=>[
  {key:'materialCode',title:t('wms.inventory.materialCode'),minWidth:150},
  {key:'batchCode',title:t('wms.inventory.batch'),minWidth:120},
  {key:'snCode',title:t('wms.inventory.sn'),minWidth:140},
  {key:'locationCode',title:t('wms.inventory.location'),minWidth:120},
  {key:'qualityStatus',title:t('wms.inventory.qualityStatus'),minWidth:120},
  {key:'warehouseStatus',title:t('wms.inventory.warehouseStatus'),minWidth:120},
  {key:'bookQuantity',title:t('wms.inventory.count.book'),minWidth:120},
  {key:'countedQuantity',title:t('wms.inventory.count.counted'),minWidth:145},
  {key:'differenceQuantity',title:t('wms.inventory.count.difference'),minWidth:120},
  {key:'actions',title:tForOwner('system','system.common.actions'),width:130,resizable:false},
]);
const scopedMaterialReference={
  async search(keyword:string,page:number,signal:AbortSignal){const result=await activeMaterialReference.search(keyword,page,signal);
    return {...result,records:result.records.filter(row=>!detail.value?.task.materialIds.length||detail.value.task.materialIds.includes(row.id))};},
  resolve:activeMaterialReference.resolve,
};
const scopedLocationReference={
  async search(keyword:string,page:number,signal:AbortSignal){const result=await locationReference.search(keyword,page,signal);
    return {...result,records:result.records.filter(row=>!detail.value?.task.locationIds.length||detail.value.task.locationIds.includes(row.id))};},
  resolve:locationReference.resolve,
};
const validQuantity=(value:string)=>/^(0|[1-9]\d{0,17})(\.\d{1,6})?$/.test(value);
async function load():Promise<void> {
  const current=++detailRequest;
  loading.value=true; error.value='';
  try {
    const result=await getCount(id);
    if(current!==detailRequest)return;
    detail.value=result;
    if(!blocked.value) {scope.materialIds=[...result.task.materialIds]; scope.locationIds=[...result.task.locationIds];}
    void resolveScopeNames();
    for(const line of result.lines) if(!(line.id in quantities)) quantities[line.id]=line.countedQuantity??'';
    if(blocked.value)error.value=t('wms.inventory.count.unknown');
  } catch(cause) { if(current===detailRequest)error.value=isApiError(cause)&&cause.kind==='forbidden'
    ? t('wms.inventory.forbidden'):t('wms.inventory.count.loadfailed'); }
  finally {if(current===detailRequest)loading.value=false;}
}
async function reconcile():Promise<void> {
  if(!blocked.value||saving.value||loading.value)return;
  loading.value=true;
  try {
    const result=await getCount(id);
    detail.value=result;
    if(conflictBlocked) {
      blocked.value=false;conflictBlocked=false;error.value='';
    } else error.value=t('wms.inventory.count.unknown');
  } catch {error.value=t('wms.inventory.count.unknown');}
  finally {loading.value=false;}
}
async function resolveScopeNames():Promise<void>{
  if(!detail.value)return;
  const materialIds=[...detail.value.task.materialIds],locationIds=[...detail.value.task.locationIds];
  await Promise.all([...materialIds.map(async value=>{try{const row=await getMaterial(value);referenceNames[value]=`${row.name} · ${row.code}`;}catch{referenceNames[value]=value;}}),
    ...locationIds.map(async value=>{try{const row=await getCatalog('locations',value);referenceNames[value]=`${row.name} · ${row.code}`;}catch{referenceNames[value]=value;}})]);
}
function addScope(kind:'material'|'location'):void {
  const id=kind==='material'?scopeMaterial.value:scopeLocation.value;
  const list=kind==='material'?scope.materialIds:scope.locationIds;
  if(id&&!list.includes(id))list.push(id);
  if(id)void (kind==='material'?getMaterial(id):getCatalog('locations',id))
    .then(row=>{referenceNames[id]=`${row.name} · ${row.code}`;}).catch(()=>{referenceNames[id]=id;});
}
async function write(action:()=>Promise<CountDetail>,success:string):Promise<void> {
  if(saving.value||blocked.value)return;
  saving.value=true;error.value='';notice.value='';
  try {detail.value=await action();notice.value=t(success as Parameters<typeof t>[0]);
  }
  catch(cause) {const classification=classifyWriteFailure(cause);
    blocked.value=classification!=='failed';
    conflictBlocked=classification==='conflict';
    error.value=classification==='unknown'?t('wms.inventory.count.unknown')
      :isApiError(cause)&&cause.kind==='forbidden'?t('wms.inventory.forbidden')
      :isApiError(cause)&&cause.message?cause.message:t('wms.inventory.count.writefailed'); }
  finally {saving.value=false;pending.value='';}
}
function runAction(name:'start'|'confirm'|'adjust'|'cancel'):void {
  if(!detail.value||saving.value||blocked.value)return;
  const actions={start:()=>startCount(id),confirm:()=>confirmCount(id),adjust:()=>adjustCount(id),cancel:()=>cancelCount(id)};
  void write(actions[name],`wms.inventory.count.${name}Success`);
}
function saveScope():void {if(canScope.value)void write(()=>editCountScope(id,{locationIds:scope.locationIds,materialIds:scope.materialIds}),'wms.inventory.count.scopesaved');}
function saveLine(line:CountLine):void {
  const value=quantities[line.id];
  if(!canCount.value||!validQuantity(value)) {error.value=t('wms.inventory.count.invalidquantity');return;}
  void write(()=>saveCount(id,line.id,value),'wms.inventory.count.countsaved');
}
function saveExtra():void {
  if(!canExtra.value||!extra.materialId||!extra.locationId||!extraUomCode.value||!validQuantity(extra.quantity)) {
    error.value=t('wms.inventory.count.invalidquantity');return;
  }
  const input:ExtraInput={materialId:extra.materialId,locationId:extra.locationId,batchCode:extra.batchCode||null,
    snCode:extra.snCode||null,qualityStatus:extra.qualityStatus as QualityStatus,
    warehouseStatus:extra.warehouseStatus as WarehouseStatus,quantity:extra.quantity};
  void write(()=>addExtra(id,input),'wms.inventory.count.extrasaved');
}
function history():void {
  if(!detail.value)return;
  void router.push({name:ROUTE_NAMES.wmsInventoryHistory,query:{sourceType:'INVENTORY_COUNT',sourceId:id,
    warehouseId:detail.value.task.warehouseId}});
}
onMounted(()=>{void load();});
</script>
<template>
  <PageContainer><section class="inventory-page">
    <MomManagementHeader title-id="wms-count-detail" :title="t('wms.inventory.count.detail')" :description="detail ? `${detail.task.taskNo} · ${detail.task.warehouseCode}` : ''">
      <template #actions>
        <MomButton variant="outline" :disabled="loading||saving" @click="load">{{ tForOwner('system','system.common.refresh') }}</MomButton>
        <MomButton v-if="blocked" variant="outline" :disabled="loading||saving" @click="reconcile">{{ tForOwner('system','system.common.refresh') }}</MomButton>
        <MomButton v-if="canStart" :disabled="saving||blocked" @click="pending='start'">{{ t('wms.inventory.count.start') }}</MomButton>
        <MomButton v-if="canConfirm" :disabled="saving||blocked" @click="pending='confirm'">{{ t('wms.inventory.count.confirm') }}</MomButton>
        <MomButton v-if="canAdjust" :disabled="saving||blocked" @click="pending='adjust'">{{ t('wms.inventory.count.adjust') }}</MomButton>
        <MomButton v-if="canCancel" variant="destructive" :disabled="saving||blocked" @click="pending='cancel'">{{ t('wms.inventory.count.cancel') }}</MomButton>
        <MomButton v-if="detail?.task.status==='COMPLETED'&&detail.task.transactionId" variant="outline" @click="history">{{ t('wms.inventory.count.history') }}</MomButton>
      </template>
    </MomManagementHeader>
    <p v-if="error" role="alert" class="inventory-page__error">{{ error }}</p><p v-if="notice" role="status">{{ notice }}</p>
    <dl v-if="detail" class="inventory-count__summary">
      <div><dt>{{ t('wms.inventory.count.status') }}</dt><dd>{{ t(`wms.inventory.count.${detail.task.status.toLowerCase()}` as Parameters<typeof t>[0]) }}</dd></div>
      <div><dt>{{ t('wms.opening.warehouse') }}</dt><dd>{{ detail.task.warehouseCode }}</dd></div>
      <div><dt>{{ t('wms.inventory.count.createdat') }}</dt><dd>{{ new Date(detail.task.createdAt).toLocaleString() }}</dd></div>
    </dl>
    <section v-if="canScope" class="inventory-count__scope">
      <h2>{{ t('wms.inventory.count.scope') }}</h2>
      <p>{{ t('wms.inventory.count.emptyscope') }}</p>
      <div class="inventory-count__scope-grid">
        <div class="inventory-count__scope-field"><label>{{ t('wms.inventory.count.material') }}<MomReferenceSelect v-model="scopeMaterial"
          :label="t('wms.inventory.count.material')" :search="activeMaterialReference.search" :resolve="activeMaterialReference.resolve" /></label>
          <MomButton variant="outline" @click="addScope('material')">{{ t('wms.inventory.count.addmaterial') }}</MomButton>
          <p v-for="value in scope.materialIds" :key="value">{{ referenceNames[value] || value }} <MomButton mode="text" @click="scope.materialIds=scope.materialIds.filter(id=>id!==value)">×</MomButton></p></div>
        <div class="inventory-count__scope-field"><label>{{ t('wms.inventory.count.location') }}<MomReferenceSelect v-model="scopeLocation"
          :label="t('wms.inventory.count.location')" :search="locationReference.search" :resolve="locationReference.resolve"
          :parent-key="detail?.task.warehouseId" /></label>
          <MomButton variant="outline" @click="addScope('location')">{{ t('wms.inventory.count.addlocation') }}</MomButton>
          <p v-for="value in scope.locationIds" :key="value">{{ referenceNames[value] || value }} <MomButton mode="text" @click="scope.locationIds=scope.locationIds.filter(id=>id!==value)">×</MomButton></p></div>
      </div>
      <div class="inventory-count__actions"><MomButton :disabled="saving||blocked" @click="saveScope">{{ t('wms.inventory.count.savescope') }}</MomButton></div>
    </section>
    <MomListSurface :title="t('wms.inventory.count.lines')" :hint="t('wms.inventory.count.linehint')" :loading="loading" :loading-text="tForOwner('system','system.common.loading')">
      <MomDataTable :rows="detail?.lines||[]" :columns="columns" :empty-text="tForOwner('system','system.common.empty')">
        <template #cell-materialCode="{row}">{{ row.dimension.materialCode }}</template>
        <template #cell-batchCode="{row}">{{ row.dimension.batchCode||'—' }}</template>
        <template #cell-snCode="{row}">{{ row.dimension.snCode||'—' }}</template>
        <template #cell-locationCode="{row}">{{ row.dimension.locationCode }}</template>
        <template #cell-qualityStatus="{row}">{{ t(`wms.inventory.quality.${row.dimension.qualityStatus.toLowerCase()}` as Parameters<typeof t>[0]) }}</template>
        <template #cell-warehouseStatus="{row}">{{ t(`wms.inventory.warehouse.${row.dimension.warehouseStatus.toLowerCase()}` as Parameters<typeof t>[0]) }}</template>
        <template #cell-countedQuantity="{row}"><MomQuantityInput v-if="canCount" v-model="quantities[row.id]"
          :unit-value="row.dimension.uomCode" :units="[{value:row.dimension.uomCode,label:row.dimension.uomCode}]"
          :label="t('wms.inventory.count.counted')" unit-disabled />
          <span v-else>{{ row.countedQuantity===null?t('wms.inventory.count.uncounted'):`${row.countedQuantity} ${row.dimension.uomCode}` }}</span></template>
        <template #cell-differenceQuantity="{row}">{{ row.differenceQuantity===null?'—':row.differenceQuantity==='0'||row.differenceQuantity.startsWith('-')?row.differenceQuantity:`+${row.differenceQuantity}` }}</template>
        <template #cell-actions="{row}"><MomButton v-if="canCount" mode="text" :disabled="saving||blocked" @click="saveLine(row)">{{ t('wms.inventory.count.savecount') }}</MomButton></template>
      </MomDataTable>
    </MomListSurface>
    <section v-if="canExtra" class="inventory-count__scope"><h2>{{ t('wms.inventory.count.extra') }}</h2>
      <div class="inventory-count__extra-grid"><label>{{ t('wms.inventory.count.material') }}<MomReferenceSelect v-model="extra.materialId"
        :label="t('wms.inventory.count.material')" :search="scopedMaterialReference.search" :resolve="scopedMaterialReference.resolve" /></label>
      <label>{{ t('wms.inventory.count.location') }}<MomReferenceSelect v-model="extra.locationId"
        :label="t('wms.inventory.count.location')" :search="scopedLocationReference.search" :resolve="scopedLocationReference.resolve"
        :parent-key="detail?.task.warehouseId" /></label>
      <label class="opening-detail__field">{{ t('wms.inventory.batch') }}<MomInput v-model="extra.batchCode" :maxlength="128" /></label>
      <label class="opening-detail__field">{{ t('wms.inventory.sn') }}<MomInput v-model="extra.snCode" :maxlength="128" /></label>
      <MomSelect v-model="extra.qualityStatus" :options="(['PENDING','QUALIFIED','RESTRICTED','REJECTED'] as const).map(v=>({value:v,label:t(`wms.inventory.quality.${v.toLowerCase()}` as Parameters<typeof t>[0])}))" />
      <MomSelect v-model="extra.warehouseStatus" :options="(['NORMAL','FROZEN'] as const).map(v=>({value:v,label:t(`wms.inventory.warehouse.${v.toLowerCase()}` as Parameters<typeof t>[0])}))" />
      <label>{{ t('wms.inventory.count.counted') }}<MomQuantityInput v-model="extra.quantity"
        :unit-value="extraUomCode" :units="extraUomCode?[{value:extraUomCode,label:extraUomCode}]:[]"
        :label="t('wms.inventory.count.counted')" unit-disabled /></label></div>
      <div class="inventory-count__actions"><MomButton :disabled="saving||blocked||!extraUomCode" @click="saveExtra">{{ t('wms.inventory.count.addextra') }}</MomButton></div>
    </section>
    <MomModal :open="!!pending" :title="t('wms.inventory.count.confirmaction')" :close-label="tForOwner('system','system.common.close')" :busy="saving" @close="pending=''">
      <p>{{ t('wms.inventory.count.confirmaction') }}</p>
      <template #footer><MomButton variant="outline" :disabled="saving" @click="pending=''">{{ tForOwner('system','system.common.cancel') }}</MomButton>
        <MomButton :disabled="saving||blocked" @click="runAction(pending as 'start'|'confirm'|'adjust'|'cancel')">{{ t('wms.inventory.count.proceed') }}</MomButton></template>
    </MomModal>
  </section></PageContainer>
</template>
