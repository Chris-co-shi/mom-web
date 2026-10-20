<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { hasAuthority } from '../../auth/model/auth-permissions';
import { searchMaterials, type Material } from '../../mdm/api/material-api';
import { searchCatalog, type MasterRow } from '../../mdm/api/catalog-api';
import MomManagementHeader from '../../../shared/components/MomManagementHeader.vue';
import MomListSurface from '../../../shared/components/MomListSurface.vue';
import MomDataTable, { type MomColumn } from '../../../shared/components/MomDataTable.vue';
import MomModal from '../../../shared/components/MomModal.vue';
import PageContainer from '../../../shared/components/PageContainer.vue';
import { MomButton, MomInput, MomSelect } from '../../../shared/ui';
import { isApiError } from '../../../shared/api/errors';
import { useLocale } from '../../../shared/i18n/locale';
import { ROUTE_NAMES } from '../../../router/route-names';
import { addExtra, adjustCount, cancelCount, confirmCount, editCountScope, getCount, saveCount, startCount,
  type CountDetail, type CountLine, type ExtraInput, type QualityStatus, type WarehouseStatus } from '../api/inventory-count-api';
import './inventory-pages.css';
const route=useRoute(), router=useRouter(), {t,tForOwner}=useLocale(), id=String(route.params.id);
const detail=ref<CountDetail>(), materials=ref<Material[]>([]), locations=ref<MasterRow[]>([]);
const loading=ref(false),saving=ref(false),error=ref(''),notice=ref(''),blocked=ref(false),pending=ref('');
const materialKeyword=ref(''),locationKeyword=ref(''),scopeMaterial=ref(''),scopeLocation=ref('');
const scope=reactive({materialIds:[] as string[],locationIds:[] as string[]});
const quantities=reactive<Record<string,string>>({});
const extra=reactive({materialId:'',locationId:'',batchCode:'',snCode:'',qualityStatus:'PENDING',warehouseStatus:'NORMAL',quantity:''});
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
const visibleLocations=computed(()=>locations.value.filter(v=>`${v.code} ${v.name}`.toLowerCase().includes(locationKeyword.value.toLowerCase())));
const countMaterials=computed(()=>materials.value.filter(value=>!detail.value?.task.materialIds.length||detail.value.task.materialIds.includes(value.id)));
const countLocations=computed(()=>locations.value.filter(value=>!detail.value?.task.locationIds.length||detail.value.task.locationIds.includes(value.id)));
const validQuantity=(value:string)=>/^(0|[1-9]\d{0,17})(\.\d{1,6})?$/.test(value);
async function load():Promise<void> {
  loading.value=true; error.value='';
  try {
    detail.value=await getCount(id);
    scope.materialIds=[...detail.value.task.materialIds]; scope.locationIds=[...detail.value.task.locationIds];
    for(const line of detail.value.lines) quantities[line.id]=line.countedQuantity??'';
    blocked.value=false;
  } catch(cause) { error.value=isApiError(cause)&&cause.kind==='forbidden'
    ? t('wms.inventory.forbidden'):t('wms.inventory.count.loadfailed'); }
  finally { loading.value=false; }
}
async function lookup():Promise<void> {
  if(!detail.value)return;
  try {
    const areas=await searchCatalog('warehouse-areas',1,200,{warehouseId:detail.value.task.warehouseId,status:'ENABLED'});
    const pages=await Promise.all(areas.records.map(area=>searchCatalog('locations',1,200,{warehouseAreaId:area.id})));
    locations.value=pages.flatMap(page=>page.records).filter(row=>row.status==='ENABLED');
    await searchMaterialOptions();
  } catch { error.value=t('wms.inventory.count.referencefailed'); }
}
async function searchMaterialOptions():Promise<void> {
  try { materials.value=(await searchMaterials(1,100,{keyword:materialKeyword.value||undefined,status:'ENABLED'})).records; }
  catch { error.value=t('wms.inventory.count.referencefailed'); }
}
function addScope(kind:'material'|'location'):void {
  const id=kind==='material'?scopeMaterial.value:scopeLocation.value;
  const list=kind==='material'?scope.materialIds:scope.locationIds;
  if(id&&!list.includes(id))list.push(id);
}
async function write(action:()=>Promise<CountDetail>,success:string):Promise<void> {
  if(saving.value||blocked.value)return;
  saving.value=true;error.value='';notice.value='';
  try {detail.value=await action();notice.value=t(success as Parameters<typeof t>[0]);
    if(canExtra.value&&(!materials.value.length||!locations.value.length))await lookup();}
  catch(cause) { blocked.value=isApiError(cause)&&cause.resultUnknown;
    error.value=blocked.value?t('wms.inventory.count.unknown')
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
  if(!canExtra.value||!extra.materialId||!extra.locationId||!validQuantity(extra.quantity)) {
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
onMounted(async()=>{await load();if(detail.value&&(canScope.value||canExtra.value))await lookup();});
</script>
<template>
  <PageContainer><section class="inventory-page">
    <MomManagementHeader title-id="wms-count-detail" :title="t('wms.inventory.count.detail')" :description="detail ? `${detail.task.taskNo} · ${detail.task.warehouseCode}` : ''">
      <template #actions>
        <MomButton variant="outline" :disabled="loading" @click="load">{{ tForOwner('system','system.common.refresh') }}</MomButton>
        <MomButton v-if="canStart" :disabled="saving||blocked" @click="pending='start'">{{ t('wms.inventory.count.start') }}</MomButton>
        <MomButton v-if="canConfirm" :disabled="saving||blocked" @click="pending='confirm'">{{ t('wms.inventory.count.confirm') }}</MomButton>
        <MomButton v-if="canAdjust" :disabled="saving||blocked" @click="pending='adjust'">{{ t('wms.inventory.count.adjust') }}</MomButton>
        <MomButton v-if="canCancel" variant="destructive" :disabled="saving||blocked" @click="pending='cancel'">{{ t('wms.inventory.count.cancel') }}</MomButton>
        <MomButton v-if="detail?.task.status==='COMPLETED'&&detail.task.transactionId" variant="outline" @click="history">{{ t('wms.inventory.count.history') }}</MomButton>
      </template>
    </MomManagementHeader>
    <p v-if="error" role="alert" class="inventory-page__error">{{ error }}</p><p v-if="notice" role="status">{{ notice }}</p>
    <p v-if="detail">{{ t('wms.inventory.count.status') }}: {{ t(`wms.inventory.count.${detail.task.status.toLowerCase()}` as Parameters<typeof t>[0]) }}
      · {{ t('wms.inventory.count.createdat') }}: {{ new Date(detail.task.createdAt).toLocaleString() }}</p>
    <div v-if="canScope" class="opening-detail__form">
      <h2>{{ t('wms.inventory.count.scope') }}</h2>
      <p>{{ t('wms.inventory.count.emptyscope') }}</p>
      <label class="opening-detail__field">{{ t('wms.opening.materialSearch') }}<MomInput v-model="materialKeyword" /><MomButton variant="outline" @click="searchMaterialOptions">{{ tForOwner('system','system.common.search') }}</MomButton></label>
      <MomSelect v-model="scopeMaterial" :options="materials.map(m=>({value:m.id,label:`${m.code} · ${m.name}`}))" :placeholder="t('wms.inventory.count.material')" />
      <MomButton variant="outline" @click="addScope('material')">{{ t('wms.inventory.count.addmaterial') }}</MomButton>
      <p v-for="value in scope.materialIds" :key="value">{{ materials.find(m=>m.id===value)?.code||value }} <MomButton mode="text" @click="scope.materialIds=scope.materialIds.filter(id=>id!==value)">×</MomButton></p>
      <label class="opening-detail__field">{{ t('wms.opening.locationSearch') }}<MomInput v-model="locationKeyword" /></label>
      <MomSelect v-model="scopeLocation" :options="visibleLocations.map(v=>({value:v.id,label:`${v.code} · ${v.name}`}))" :placeholder="t('wms.inventory.count.location')" />
      <MomButton variant="outline" @click="addScope('location')">{{ t('wms.inventory.count.addlocation') }}</MomButton>
      <p v-for="value in scope.locationIds" :key="value">{{ locations.find(v=>v.id===value)?.code||value }} <MomButton mode="text" @click="scope.locationIds=scope.locationIds.filter(id=>id!==value)">×</MomButton></p>
      <MomButton :disabled="saving||blocked" @click="saveScope">{{ t('wms.inventory.count.savescope') }}</MomButton>
    </div>
    <MomListSurface :title="t('wms.inventory.count.lines')" :hint="t('wms.inventory.count.linehint')" :loading="loading" :loading-text="tForOwner('system','system.common.loading')">
      <MomDataTable :rows="detail?.lines||[]" :columns="columns" :empty-text="tForOwner('system','system.common.empty')">
        <template #cell-materialCode="{row}">{{ row.dimension.materialCode }}</template>
        <template #cell-batchCode="{row}">{{ row.dimension.batchCode||'—' }}</template>
        <template #cell-snCode="{row}">{{ row.dimension.snCode||'—' }}</template>
        <template #cell-locationCode="{row}">{{ row.dimension.locationCode }}</template>
        <template #cell-qualityStatus="{row}">{{ t(`wms.inventory.quality.${row.dimension.qualityStatus.toLowerCase()}` as Parameters<typeof t>[0]) }}</template>
        <template #cell-warehouseStatus="{row}">{{ t(`wms.inventory.warehouse.${row.dimension.warehouseStatus.toLowerCase()}` as Parameters<typeof t>[0]) }}</template>
        <template #cell-countedQuantity="{row}"><MomInput v-if="canCount" v-model="quantities[row.id]" type="number" min="0" step="0.000001" :aria-label="t('wms.inventory.count.counted')" />
          <span v-else>{{ row.countedQuantity===null?t('wms.inventory.count.uncounted'):row.countedQuantity }}</span></template>
        <template #cell-differenceQuantity="{row}">{{ row.differenceQuantity===null?'—':row.differenceQuantity==='0'||row.differenceQuantity.startsWith('-')?row.differenceQuantity:`+${row.differenceQuantity}` }}</template>
        <template #cell-actions="{row}"><MomButton v-if="canCount" mode="text" :disabled="saving||blocked" @click="saveLine(row)">{{ t('wms.inventory.count.savecount') }}</MomButton></template>
      </MomDataTable>
    </MomListSurface>
    <div v-if="canExtra" class="opening-detail__form"><h2>{{ t('wms.inventory.count.extra') }}</h2>
      <label class="opening-detail__field">{{ t('wms.opening.materialSearch') }}<MomInput v-model="materialKeyword" /><MomButton variant="outline" @click="searchMaterialOptions">{{ tForOwner('system','system.common.search') }}</MomButton></label>
      <MomSelect v-model="extra.materialId" :options="countMaterials.map(m=>({value:m.id,label:`${m.code} · ${m.name}`}))" :placeholder="t('wms.inventory.count.material')" />
      <MomSelect v-model="extra.locationId" :options="countLocations.map(v=>({value:v.id,label:`${v.code} · ${v.name}`}))" :placeholder="t('wms.inventory.count.location')" />
      <label class="opening-detail__field">{{ t('wms.inventory.batch') }}<MomInput v-model="extra.batchCode" :maxlength="128" /></label>
      <label class="opening-detail__field">{{ t('wms.inventory.sn') }}<MomInput v-model="extra.snCode" :maxlength="128" /></label>
      <MomSelect v-model="extra.qualityStatus" :options="(['PENDING','QUALIFIED','RESTRICTED','REJECTED'] as const).map(v=>({value:v,label:t(`wms.inventory.quality.${v.toLowerCase()}` as Parameters<typeof t>[0])}))" />
      <MomSelect v-model="extra.warehouseStatus" :options="(['NORMAL','FROZEN'] as const).map(v=>({value:v,label:t(`wms.inventory.warehouse.${v.toLowerCase()}` as Parameters<typeof t>[0])}))" />
      <label class="opening-detail__field">{{ t('wms.inventory.count.counted') }}<MomInput v-model="extra.quantity" type="number" min="0" step="0.000001" /></label>
      <MomButton :disabled="saving||blocked" @click="saveExtra">{{ t('wms.inventory.count.addextra') }}</MomButton>
    </div>
    <MomModal :open="!!pending" :title="t('wms.inventory.count.confirmaction')" :close-label="tForOwner('system','system.common.close')" :busy="saving" @close="pending=''">
      <p>{{ t('wms.inventory.count.confirmaction') }}</p>
      <template #footer><MomButton variant="outline" :disabled="saving" @click="pending=''">{{ tForOwner('system','system.common.cancel') }}</MomButton>
        <MomButton :disabled="saving" @click="runAction(pending as 'start'|'confirm'|'adjust'|'cancel')">{{ t('wms.inventory.count.proceed') }}</MomButton></template>
    </MomModal>
  </section></PageContainer>
</template>
