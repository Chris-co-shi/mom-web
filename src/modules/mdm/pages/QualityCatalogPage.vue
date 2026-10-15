<script setup lang="ts">
import { computed, onMounted, onScopeDispose, reactive, ref, watch } from 'vue';
import { Plus, RefreshCw } from '@lucide/vue';
import { AuthorityGuard, hasAuthority } from '../../auth';
import { isApiError } from '../../../shared/api/errors';
import { MomButton, MomInput, MomSelect } from '../../../shared/ui';
import MomManagementHeader from '../../../shared/components/MomManagementHeader.vue';
import MomListSurface from '../../../shared/components/MomListSurface.vue';
import MomDataTable, { type MomColumn } from '../../../shared/components/MomDataTable.vue';
import MomCrudPagination from '../../../shared/components/MomCrudPagination.vue';
import MomModal from '../../../shared/components/MomModal.vue';
import PageContainer from '../../../shared/components/PageContainer.vue';
import { useLocale } from '../../../shared/i18n/locale';
import { searchUomCatalog, type UomRow } from '../api/uom-api';
import { createCharacteristic, createMethod, searchCharacteristics, searchMethods, updateCharacteristic, updateMethod,
  type InspectionCharacteristic, type InspectionMethod } from '../api/quality-api';
import './mdm-pages.css';

const props=defineProps<{kind:'characteristics'|'methods'}>();
type Row=InspectionCharacteristic|InspectionMethod;
const {t}=useLocale(); const rows=ref<Row[]>([]),target=ref<Row>(); const uoms=ref<UomRow[]>([]);
const pageNo=ref(1),pageSize=ref(20),total=ref(0),loading=ref(false),saving=ref(false),refsLoading=ref(false);
const error=ref(''),formError=ref(''),notice=ref(''); const action=ref<'create'|'edit'>();
const form=reactive({code:'',name:'',defaultUomId:'',description:'',enabled:'true',version:0});
let controller:AbortController|undefined,requestNo=0,disposed=false;
const isCharacteristic=computed(()=>props.kind==='characteristics');
const title=computed(()=>t(isCharacteristic.value?'navigation.mdmInspectionCharacteristics':'navigation.mdmInspectionMethods'));
const columns=computed<MomColumn[]>(()=>[
  {key:'code',title:t('mdm.struct.code'),minWidth:170},{key:'name',title:t('mdm.struct.name'),minWidth:200},
  ...(isCharacteristic.value?[{key:'defaultUomId',title:t('mdm.quality.common.defaultUom'),minWidth:150} as MomColumn]:[{key:'description',title:t('mdm.quality.common.methodDescription'),minWidth:220} as MomColumn]),
  {key:'enabled',title:t('mdm.struct.status'),width:120},{key:'actions',title:t('mdm.struct.actions'),width:120,fixed:'right',resizable:false},
]);
const uomOptions=computed(()=>[{value:'',label:t('mdm.struct.select')},...uoms.value.filter(row=>row.status==='ENABLED'||row.id===form.defaultUomId).map(row=>({value:row.id,label:`${row.name} (${row.symbol})`}))]);
function feedback(value:unknown,write=false):string { if(!isApiError(value))return t(write?'mdm.struct.unknownWrite':'mdm.struct.loadFailed');
  if(write&&value.resultUnknown)return t('mdm.struct.unknownWrite'); if(value.kind==='conflict')return t('mdm.struct.conflict');
  if(value.kind==='forbidden')return t('mdm.struct.forbidden'); return t('mdm.struct.validation'); }
async function load(next=pageNo.value,size=pageSize.value):Promise<void>{const current=++requestNo;controller?.abort();controller=new AbortController();loading.value=true;error.value='';
  try{const page=isCharacteristic.value?await searchCharacteristics(next,size,undefined,controller.signal):await searchMethods(next,size,undefined,controller.signal);
    if(disposed||current!==requestNo)return;rows.value=page.records;pageNo.value=page.pageNo;pageSize.value=page.pageSize;total.value=page.total;
  }catch(value){if(!disposed&&current===requestNo)error.value=feedback(value);}finally{if(current===requestNo)loading.value=false;}}
async function loadUoms():Promise<void>{if(!isCharacteristic.value)return;refsLoading.value=true;try{uoms.value=(await searchUomCatalog('uoms',1,100,{status:'ENABLED'})).records;}catch{formError.value=t('mdm.struct.referenceLoadFailed');}finally{refsLoading.value=false;}}
function openCreate():void{if(!hasAuthority('mdm:quality-definition:write'))return;target.value=undefined;Object.assign(form,{code:'',name:'',defaultUomId:'',description:'',enabled:'true',version:0});formError.value='';action.value='create';void loadUoms();}
function openEdit(row:Row):void{if(!hasAuthority('mdm:quality-definition:write'))return;target.value=row;Object.assign(form,{code:row.code,name:row.name,defaultUomId:'defaultUomId'in row?row.defaultUomId:'',description:'description'in row?row.description??'':'',enabled:String(row.enabled),version:row.version});formError.value='';action.value='edit';void loadUoms();}
function uomLabel(row:Row):string { return 'defaultUomId' in row ? uoms.value.find(unit=>unit.id===row.defaultUomId)?.symbol??row.defaultUomId : ''; }
function close():void{if(!saving.value)action.value=undefined;}
async function save():Promise<void>{if(saving.value||!hasAuthority('mdm:quality-definition:write'))return;
  if(!form.name.trim()||(action.value==='create'&&!form.code.trim())||(isCharacteristic.value&&!form.defaultUomId)){formError.value=t('mdm.quality.common.invalid');return;}
  saving.value=true;formError.value='';try{if(isCharacteristic.value){if(action.value==='create')await createCharacteristic({code:form.code.trim(),name:form.name.trim(),defaultUomId:form.defaultUomId});
      else await updateCharacteristic(target.value!.id,{name:form.name.trim(),defaultUomId:form.defaultUomId,enabled:form.enabled==='true',version:form.version});
    }else if(action.value==='create')await createMethod({code:form.code.trim(),name:form.name.trim(),description:form.description.trim()||null});
    else await updateMethod(target.value!.id,{name:form.name.trim(),description:form.description.trim()||null,enabled:form.enabled==='true',version:form.version});
    action.value=undefined;notice.value=t('mdm.struct.saved');await load(1);
  }catch(value){formError.value=feedback(value,true);}finally{saving.value=false;}}
watch(()=>props.kind,()=>{action.value=undefined;void load(1);});onMounted(()=>void load());onScopeDispose(()=>{disposed=true;++requestNo;controller?.abort();});
</script>

<template><PageContainer><section class="mdm-plants" :aria-labelledby="`mdm-quality-${kind}-title`">
  <MomManagementHeader :title-id="`mdm-quality-${kind}-title`" :title="title" :description="t('mdm.quality.common.description')"><template #actions>
    <MomButton variant="outline" :disabled="loading" @click="load()"><RefreshCw :size="16"/>{{t('mdm.struct.refresh')}}</MomButton>
    <AuthorityGuard :authorities="['mdm:quality-definition:write']"><MomButton @click="openCreate"><Plus :size="16"/>{{t('mdm.struct.create')}}</MomButton></AuthorityGuard>
  </template></MomManagementHeader><p v-if="notice" role="status">{{notice}}</p>
  <div v-if="error" class="mdm-plants__error" role="alert">{{error}} <MomButton variant="outline" @click="load()">{{t('mdm.struct.retry')}}</MomButton></div>
  <MomListSurface v-else :title="title" :hint="t('mdm.quality.common.description')" :loading="loading" :loading-text="t('mdm.struct.loading')">
    <MomDataTable :rows="rows" :columns="columns" :empty-text="t('mdm.quality.common.noData')">
      <template #cell-defaultUomId="{row}">{{uomLabel(row)}}</template>
      <template #cell-enabled="{row}">{{t(row.enabled?'mdm.struct.enabled':'mdm.struct.disabled')}}</template>
      <template #cell-actions="{row}"><AuthorityGuard :authorities="['mdm:quality-definition:write']"><MomButton mode="text" @click="openEdit(row)">{{t('mdm.struct.edit')}}</MomButton></AuthorityGuard></template>
    </MomDataTable><template #footer><MomCrudPagination :page-no="pageNo" :page-size="pageSize" :total="total" :summary="`${pageNo} / ${Math.max(1,Math.ceil(total/pageSize))}`"
      :page-size-label="t('mdm.struct.pageSize')" :previous-label="t('mdm.struct.previous')" :next-label="t('mdm.struct.next')" :jump-label="t('mdm.struct.jump')" :go-label="t('mdm.struct.go')"
      :disabled="loading||saving" @page="load($event)" @size="load(1,$event)"/></template>
  </MomListSurface>
  <MomModal :open="!!action" :title="title" :close-label="t('mdm.struct.close')" :busy="saving" :busy-text="t('mdm.struct.saving')" @close="close">
    <form class="mdm-plants__form" @submit.prevent="save"><label v-if="action==='create'"><span>{{t('mdm.struct.code')}} *</span><MomInput v-model="form.code" :max-length="64"/></label>
      <label><span>{{t('mdm.struct.name')}} *</span><MomInput v-model="form.name" :max-length="200"/></label>
      <label v-if="isCharacteristic"><span>{{t('mdm.quality.common.defaultUom')}} *</span><MomSelect v-model="form.defaultUomId" :options="uomOptions"/></label>
      <label v-else><span>{{t('mdm.quality.common.methodDescription')}}</span><MomInput v-model="form.description" :max-length="1000"/></label>
      <label v-if="action==='edit'"><span>{{t('mdm.struct.status')}}</span><MomSelect v-model="form.enabled" :options="[{value:'true',label:t('mdm.struct.enabled')},{value:'false',label:t('mdm.struct.disabled')}]"/></label>
      <p v-if="refsLoading" role="status">{{t('mdm.struct.loading')}}</p><p v-if="formError" class="mdm-plants__field-error" role="alert">{{formError}}</p>
      <div class="mdm-plants__footer"><MomButton variant="outline" @click="close">{{t('mdm.struct.cancel')}}</MomButton><MomButton type="submit" :disabled="saving||refsLoading">{{t('mdm.struct.confirm')}}</MomButton></div>
    </form>
  </MomModal>
</section></PageContainer></template>
