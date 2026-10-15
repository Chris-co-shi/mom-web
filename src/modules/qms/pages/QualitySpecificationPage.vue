<script setup lang="ts">
import { computed,onMounted,onScopeDispose,reactive,ref } from 'vue';
import { Plus,RefreshCw } from '@lucide/vue';
import { AuthorityGuard,hasAuthority } from '../../auth';
import { isApiError } from '../../../shared/api/errors';
import { MomButton,MomInput,MomSelect } from '../../../shared/ui';
import MomManagementHeader from '../../../shared/components/MomManagementHeader.vue';
import MomListSurface from '../../../shared/components/MomListSurface.vue';
import MomDataTable,{type MomColumn} from '../../../shared/components/MomDataTable.vue';
import MomCrudPagination from '../../../shared/components/MomCrudPagination.vue';
import MomModal from '../../../shared/components/MomModal.vue';
import PageContainer from '../../../shared/components/PageContainer.vue';
import { useLocale } from '../../../shared/i18n/locale';
import { searchPlants,type PlantView } from '../../mdm/api/factory-api';
import { searchMaterials,type Material } from '../../mdm/api/material-api';
import { searchUomCatalog,type UomRow } from '../../mdm/api/uom-api';
import { createSpecification,getSpecification,nextSpecificationRevision,obsoleteSpecificationRevision,
  releaseSpecificationRevision,searchCharacteristics,searchMethods,searchSpecifications,updateSpecificationDraft,
  type InspectionCharacteristic,type InspectionMethod,type QualitySpecification,type SpecificationDetail,type SpecificationItemInput } from '../api/quality-api';
import '../../mdm/pages/mdm-pages.css';

const {t}=useLocale();const rows=ref<QualitySpecification[]>([]),detail=ref<SpecificationDetail>();
type FormItem={sequenceNo:number;characteristicId:string;methodId:string;uomId:string;lowerLimit:string;targetValue:string;upperLimit:string;mandatory:string};
const plants=ref<PlantView[]>([]),materials=ref<Material[]>([]),uoms=ref<UomRow[]>([]),characteristics=ref<InspectionCharacteristic[]>([]),methods=ref<InspectionMethod[]>([]);
const pageNo=ref(1),pageSize=ref(20),total=ref(0),loading=ref(false),detailLoading=ref(false),refsLoading=ref(false),saving=ref(false);
const listError=ref(''),dialogError=ref(''),formError=ref(''),notice=ref('');const action=ref<'create'|'detail'|'edit'>();
const form=reactive({code:'',name:'',plantId:'',materialId:'',items:[] as FormItem[]});
let listController:AbortController|undefined,detailController:AbortController|undefined,listNo=0,detailNo=0,refsNo=0,disposed=false;
const columns=computed<MomColumn[]>(()=>[{key:'code',title:t('mdm.struct.code'),minWidth:160},{key:'name',title:t('mdm.struct.name'),minWidth:200},
  {key:'plantId',title:t('qms.spec.plant'),minWidth:160},{key:'materialId',title:t('qms.spec.material'),minWidth:180},
  {key:'latestRevisionNo',title:t('qms.spec.revision'),width:110},{key:'latestStatus',title:t('mdm.struct.status'),width:120},
  {key:'actions',title:t('mdm.struct.actions'),width:120,fixed:'right',resizable:false}]);
const option=<T extends{id:string;name:string;code:string}>(values:T[],selected:string)=>{const result=values.map(row=>({value:row.id,label:`${row.name} (${row.code})`}));if(selected&&!result.some(row=>row.value===selected))result.push({value:selected,label:selected});return[{value:'',label:t('mdm.struct.select')},...result];};
const plantOptions=computed(()=>option(plants.value.filter(row=>row.status==='ENABLED'),form.plantId));const materialOptions=computed(()=>option(materials.value.filter(row=>row.status==='ENABLED'),form.materialId));
const characteristicOptions=(selected:string)=>option(characteristics.value.filter(row=>row.enabled||row.id===selected),selected);
const methodOptions=(selected:string)=>option(methods.value.filter(row=>row.enabled||row.id===selected),selected);
const uomOptions=(selected:string)=>option(uoms.value.filter(row=>row.status==='ENABLED'||row.id===selected),selected);
const nameOf=<T extends{id:string;name:string}>(values:T[],id:string)=>values.find(row=>row.id===id)?.name??id;
function feedback(value:unknown,write=false):string{if(!isApiError(value))return t(write?'mdm.struct.unknownWrite':'mdm.struct.loadFailed');if(write&&(value.resultUnknown||['network','timeout','server','protocol'].includes(value.kind)))return t('mdm.struct.unknownWrite');if(value.kind==='conflict')return t('mdm.struct.conflict');if(value.kind==='forbidden')return t('mdm.struct.forbidden');if(value.kind==='not_found')return t('mdm.struct.notFound');return t('mdm.struct.validation');}
async function load(next=pageNo.value,size=pageSize.value):Promise<void>{const current=++listNo;listController?.abort();listController=new AbortController();loading.value=true;listError.value='';
  try{const page=await searchSpecifications(next,size,{},listController.signal);if(disposed||current!==listNo)return;rows.value=page.records;pageNo.value=page.pageNo;pageSize.value=page.pageSize;total.value=page.total;}catch(value){if(!disposed&&current===listNo)listError.value=feedback(value);}finally{if(current===listNo)loading.value=false;}}
async function loadReferences():Promise<void>{const current=++refsNo;refsLoading.value=true;try{const [p,m,u,c,method]=await Promise.all([searchPlants(1,100),searchMaterials(1,100,{status:'ENABLED'}),searchUomCatalog('uoms',1,100,{status:'ENABLED'}),searchCharacteristics(1,100,true),searchMethods(1,100,true)]);if(disposed||current!==refsNo)return;plants.value=p.records;materials.value=m.records;uoms.value=u.records;characteristics.value=c.records;methods.value=method.records;}catch{if(!disposed&&current===refsNo)dialogError.value=t('mdm.struct.referenceLoadFailed');}finally{if(current===refsNo)refsLoading.value=false;}}
function emptyItem(sequenceNo=10):FormItem{return{sequenceNo,characteristicId:'',methodId:'',uomId:'',lowerLimit:'',targetValue:'',upperLimit:'',mandatory:'true'};}
function reset(value?:SpecificationDetail):void{Object.assign(form,{code:value?.code??'',name:value?.name??'',plantId:value?.plantId??'',materialId:value?.materialId??'',items:value?.items.map(item=>({sequenceNo:item.sequenceNo,characteristicId:item.characteristicId,methodId:item.methodId,uomId:item.uomId,lowerLimit:item.lowerLimit??'',targetValue:item.targetValue??'',upperLimit:item.upperLimit??'',mandatory:String(item.mandatory)}))??[emptyItem()]});}
function openCreate():void{if(!hasAuthority('qms:quality-definition:write'))return;++detailNo;detail.value=undefined;action.value='create';dialogError.value='';formError.value='';reset();void loadReferences();}
async function openDetail(row:QualitySpecification):Promise<void>{const current=++detailNo;detailController?.abort();detailController=new AbortController();action.value='detail';detail.value=undefined;detailLoading.value=true;dialogError.value='';void loadReferences();try{const value=await getSpecification(row.id,detailController.signal);if(disposed||current!==detailNo)return;detail.value=value;reset(value);}catch(value){if(!disposed&&current===detailNo)dialogError.value=feedback(value);}finally{if(current===detailNo)detailLoading.value=false;}}
function close():void{if(saving.value)return;++detailNo;detailController?.abort();action.value=undefined;detail.value=undefined;}
function validDecimal(value:string):boolean{return value===''||/^-?(0|[1-9]\d{0,14})(\.\d{1,9})?$/.test(value);}
function valid():boolean{return form.items.length>0&&form.items.length<=200&&new Set(form.items.map(item=>item.sequenceNo)).size===form.items.length&&form.items.every(item=>item.sequenceNo>0&&item.characteristicId&&item.methodId&&item.uomId&&[item.lowerLimit,item.targetValue,item.upperLimit].some(value=>value!=='')&&validDecimal(item.lowerLimit)&&validDecimal(item.targetValue)&&validDecimal(item.upperLimit));}
function requestItems():SpecificationItemInput[]{return form.items.map(item=>({...item,lowerLimit:item.lowerLimit||null,targetValue:item.targetValue||null,upperLimit:item.upperLimit||null,mandatory:item.mandatory==='true'}));}
async function write(operation:'save'|'release'|'obsolete'|'next'):Promise<void>{if(saving.value||!hasAuthority('qms:quality-definition:write'))return;if(operation==='save'&&(!valid()||(action.value==='create'&&(!form.code.trim()||!form.name.trim()||!form.plantId||!form.materialId)))){formError.value=t('qms.spec.invalid');return;}if(operation!=='save'&&!detail.value)return;saving.value=true;formError.value='';try{let value:SpecificationDetail;
    if(operation==='save'&&action.value==='create')value=await createSpecification({code:form.code.trim(),name:form.name.trim(),plantId:form.plantId,materialId:form.materialId,items:requestItems()});
    else if(operation==='save'&&detail.value)value=await updateSpecificationDraft(detail.value.revisionId,detail.value.lockVersion,requestItems());
    else if(operation==='release'&&detail.value)value=await releaseSpecificationRevision(detail.value.revisionId,detail.value.lockVersion);
    else if(operation==='obsolete'&&detail.value)value=await obsoleteSpecificationRevision(detail.value.revisionId,detail.value.lockVersion);
    else if(operation==='next'&&detail.value)value=await nextSpecificationRevision(detail.value.id);else return;
    detail.value=value;reset(value);action.value='detail';notice.value=t('qms.spec.saved');void load(1);
  }catch(value){formError.value=feedback(value,true);}finally{saving.value=false;}}
onMounted(()=>{void load();void loadReferences();});onScopeDispose(()=>{disposed=true;++listNo;++detailNo;++refsNo;listController?.abort();detailController?.abort();});
</script>

<template><PageContainer><section class="mdm-plants" aria-labelledby="qms-spec-title"><MomManagementHeader title-id="qms-spec-title" :title="t('qms.spec.title')" :description="t('qms.spec.description')"><template #actions>
  <MomButton variant="outline" :disabled="loading" @click="load()"><RefreshCw :size="16"/>{{t('mdm.struct.refresh')}}</MomButton><AuthorityGuard :authorities="['qms:quality-definition:write']"><MomButton @click="openCreate"><Plus :size="16"/>{{t('mdm.struct.create')}}</MomButton></AuthorityGuard>
  </template></MomManagementHeader><p v-if="notice" role="status">{{notice}}</p><div v-if="listError" class="mdm-plants__error" role="alert">{{listError}} <MomButton variant="outline" @click="load()">{{t('mdm.struct.retry')}}</MomButton></div>
  <MomListSurface v-else :title="t('qms.spec.title')" :hint="t('qms.spec.description')" :loading="loading" :loading-text="t('mdm.struct.loading')"><MomDataTable :rows="rows" :columns="columns" :empty-text="t('qms.spec.noData')">
    <template #cell-plantId="{row}">{{nameOf(plants,row.plantId)}}</template><template #cell-materialId="{row}">{{nameOf(materials,row.materialId)}}</template><template #cell-actions="{row}"><MomButton mode="text" @click="openDetail(row)">{{t('mdm.struct.detail')}}</MomButton></template>
  </MomDataTable><template #footer><MomCrudPagination :page-no="pageNo" :page-size="pageSize" :total="total" :summary="`${pageNo} / ${Math.max(1,Math.ceil(total/pageSize))}`" :page-size-label="t('mdm.struct.pageSize')" :previous-label="t('mdm.struct.previous')" :next-label="t('mdm.struct.next')" :jump-label="t('mdm.struct.jump')" :go-label="t('mdm.struct.go')" :disabled="loading||saving" @page="load($event)" @size="load(1,$event)"/></template></MomListSurface>
  <MomModal :open="!!action" :title="t('qms.spec.title')" :close-label="t('mdm.struct.close')" :busy="saving" :busy-text="t('mdm.struct.saving')" :width="860" @close="close"><div class="mdm-plants__dialog">
    <p v-if="detailLoading||refsLoading" role="status">{{t('mdm.struct.loading')}}</p><div v-if="dialogError" class="mdm-plants__error" role="alert">{{dialogError}} <MomButton variant="outline" @click="loadReferences">{{t('mdm.struct.retry')}}</MomButton></div>
    <dl v-if="detail" class="mdm-plants__summary"><div><dt>{{t('mdm.struct.code')}}</dt><dd>{{detail.code}}</dd></div><div><dt>{{t('qms.spec.revision')}}</dt><dd>{{detail.revisionNo}}</dd></div><div><dt>{{t('mdm.struct.status')}}</dt><dd>{{detail.status}}</dd></div><div><dt>{{t('mdm.struct.version')}}</dt><dd>{{detail.lockVersion}}</dd></div></dl>
    <div v-if="action==='detail'&&detail" class="mdm-plants__form"><p v-for="item in detail.items" :key="item.id">{{item.sequenceNo}} · {{nameOf(characteristics,item.characteristicId)}} · {{item.lowerLimit??'—'}} / {{item.targetValue??'—'}} / {{item.upperLimit??'—'}} {{nameOf(uoms,item.uomId)}}</p><div class="mdm-plants__footer"><AuthorityGuard :authorities="['qms:quality-definition:write']">
      <MomButton v-if="detail.status==='DRAFT'" variant="outline" @click="action='edit'">{{t('mdm.struct.edit')}}</MomButton><MomButton v-if="detail.status==='DRAFT'" @click="write('release')">{{t('qms.spec.release')}}</MomButton><MomButton v-if="detail.status==='RELEASED'" variant="outline" @click="write('obsolete')">{{t('qms.spec.obsolete')}}</MomButton><MomButton v-if="detail.status!=='DRAFT'" @click="write('next')">{{t('qms.spec.nextRevision')}}</MomButton>
    </AuthorityGuard></div></div>
    <form v-if="action==='create'||action==='edit'" class="mdm-plants__form" @submit.prevent="write('save')"><template v-if="action==='create'"><label><span>{{t('mdm.struct.code')}} *</span><MomInput v-model="form.code" :max-length="64"/></label><label><span>{{t('mdm.struct.name')}} *</span><MomInput v-model="form.name" :max-length="200"/></label><label><span>{{t('qms.spec.plant')}} *</span><MomSelect v-model="form.plantId" :options="plantOptions"/></label><label><span>{{t('qms.spec.material')}} *</span><MomSelect v-model="form.materialId" :options="materialOptions"/></label></template>
      <div v-for="(item,index) in form.items" :key="index" class="mdm-struct__form-grid"><label><span>{{t('qms.spec.sequence')}} *</span><MomInput :model-value="String(item.sequenceNo)" type="number" @update:model-value="item.sequenceNo=Number($event)"/></label><label><span>{{t('qms.spec.characteristic')}} *</span><MomSelect v-model="item.characteristicId" :options="characteristicOptions(item.characteristicId)"/></label><label><span>{{t('qms.spec.method')}} *</span><MomSelect v-model="item.methodId" :options="methodOptions(item.methodId)"/></label><label><span>{{t('qms.spec.uom')}} *</span><MomSelect v-model="item.uomId" :options="uomOptions(item.uomId)"/></label><label><span>{{t('qms.spec.lower')}}</span><MomInput v-model="item.lowerLimit" inputmode="decimal"/></label><label><span>{{t('qms.spec.target')}}</span><MomInput v-model="item.targetValue" inputmode="decimal"/></label><label><span>{{t('qms.spec.upper')}}</span><MomInput v-model="item.upperLimit" inputmode="decimal"/></label><label><span>{{t('qms.spec.mandatory')}}</span><MomSelect v-model="item.mandatory" :options="[{value:'true',label:t('mdm.struct.enabled')},{value:'false',label:t('mdm.struct.disabled')}]"/></label><MomButton variant="outline" :disabled="form.items.length===1" @click="form.items.splice(index,1)">{{t('qms.spec.removeItem')}}</MomButton></div>
      <MomButton variant="outline" @click="form.items.push(emptyItem(Math.max(0,...form.items.map(item=>item.sequenceNo))+10))">{{t('qms.spec.addItem')}}</MomButton><p v-if="formError" class="mdm-plants__field-error" role="alert">{{formError}}</p><div class="mdm-plants__footer"><MomButton variant="outline" @click="close">{{t('mdm.struct.cancel')}}</MomButton><MomButton type="submit" :disabled="saving||refsLoading||!!dialogError">{{t('mdm.struct.confirm')}}</MomButton></div>
    </form></div></MomModal>
</section></PageContainer></template>
