<script setup lang="ts">
import { computed, onMounted, onScopeDispose, reactive, ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { Plus, RefreshCw } from '@lucide/vue';
import { submitWithFocus } from '../../../shared/ui/focus';
import { AuthorityGuard, hasAuthority } from '../../auth';
import { classifyWriteFailure, isApiError } from '../../../shared/api/errors';
import { MomButton, MomInput, MomSelect } from '../../../shared/ui';
import MomManagementHeader from '../../../shared/components/MomManagementHeader.vue';
import MomListSurface from '../../../shared/components/MomListSurface.vue';
import MomDataTable, { type MomColumn } from '../../../shared/components/MomDataTable.vue';
import MomCrudPagination from '../../../shared/components/MomCrudPagination.vue';
import MomModal from '../../../shared/components/MomModal.vue';
import PageContainer from '../../../shared/components/PageContainer.vue';
import { useLocale } from '../../../shared/i18n/locale';
import { searchPlants, type PlantView } from '../api/factory-api';
import { searchMaterials, type Material } from '../api/material-api';
import { searchFormulas, getFormula, type FormulaDetail } from '../api/formula-api';
import { searchRoutings, getRouting, type RoutingDetail } from '../api/routing-api';
import { searchProductionVersions, getProductionVersion, createProductionVersion,
  updateProductionVersion, releaseProductionVersion, obsoleteProductionVersion,
  type ProductionVersion, type ProductionVersionDraft } from '../api/production-version-api';
import './mdm-pages.css';

const { t, tForOwner } = useLocale();
const rows = ref<ProductionVersion[]>([]), target = ref<ProductionVersion>();
const plants = ref<PlantView[]>([]), materials = ref<Material[]>([]);
const formulas = ref<FormulaDetail[]>([]), routings = ref<RoutingDetail[]>([]);
const referenceLoading = ref(false), referenceError = ref(false);
const pageNo = ref(1), pageSize = ref(20), total = ref(0);
const loading = ref(false), detailLoading = ref(false), saving = ref(false), blocked = ref(false);
let conflictBlocked = false;
const listError = ref(''), dialogError = ref(''), formError = ref(''), notice = ref('');
const action = ref<'create' | 'detail' | 'edit'>();
const form = reactive({ code: '', name: '', businessVersion: '', plantId: '', outputMaterialId: '',
  formulaRevisionId: '', routingRevisionId: '', validFrom: '', validTo: '' });
let listController: AbortController | undefined, detailController: AbortController | undefined;
let listNo = 0, detailNo = 0, referenceNo = 0, disposed = false;
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));
const columns = computed<MomColumn[]>(() => [
  { key:'code', title:t('mdm.struct.code'), minWidth:160 },
  { key:'name', title:t('mdm.struct.name'), minWidth:190 },
  { key:'businessVersion', title:t('mdm.productionVersion.businessVersion'), minWidth:130 },
  { key:'plantId', title:t('mdm.productionVersion.plant'), minWidth:170 },
  { key:'outputMaterialId', title:t('mdm.productionVersion.output'), minWidth:180 },
  { key:'validFrom', title:t('mdm.productionVersion.validity'), minWidth:190 },
  { key:'status', title:t('mdm.struct.status'), width:120 },
  { key:'actions', title:t('mdm.struct.actions'), width:130, fixed:'right', resizable:false },
]);
const option = <T extends { id:string; code:string; name:string }>(values:T[], selected:string) => {
  const result = values.map(row => ({ value:row.id, label:`${row.name} (${row.code})` }));
  if (selected && !result.some(row => row.value === selected)) result.push({ value:selected, label:selected });
  return [{ value:'', label:t('mdm.struct.select') }, ...result];
};
const plantOptions = computed(() => option(plants.value.filter(row => row.status === 'ENABLED'), form.plantId));
const materialOptions = computed(() => option(materials.value.filter(row => row.status === 'ENABLED'), form.outputMaterialId));
const formulaOptions = computed(() => [{ value:'', label:t('mdm.struct.select') }, ...formulas.value
  .filter(row => row.revision.status === 'RELEASED' && (!form.plantId || row.formula.plantId === form.plantId)
    && (!form.outputMaterialId || row.formula.outputMaterialId === form.outputMaterialId))
  .map(row => ({ value:row.revision.id, label:`${row.formula.name} · R${row.revision.revisionNo}` }))]);
const routingOptions = computed(() => [{ value:'', label:t('mdm.struct.select') }, ...routings.value
  .filter(row => row.revision.status === 'RELEASED' && (!form.plantId || row.routing.plantId === form.plantId))
  .map(row => ({ value:row.revision.id, label:`${row.routing.name} · R${row.revision.revisionNo}` }))]);
const nameOf = <T extends { id:string; name:string }>(values:T[], id:string) => values.find(row => row.id === id)?.name ?? id;
function feedback(error:unknown, writing=false):string {
  if (!isApiError(error)) return t(writing ? 'mdm.struct.unknownWrite' : 'mdm.struct.loadFailed');
  if (writing && (error.resultUnknown || ['network','timeout','server','protocol'].includes(error.kind))) return t('mdm.struct.unknownWrite');
  if (error.code === 'mdm.production_version_overlap') return t('mdm.productionVersion.overlap');
  if (error.kind === 'conflict') return t('mdm.struct.conflict');
  if (error.kind === 'forbidden') return t('mdm.struct.forbidden');
  if (error.kind === 'not_found') return t('mdm.struct.notFound');
  if (error.kind === 'validation') return t('mdm.struct.validation');
  return t('mdm.struct.loadFailed');
}
async function loadPage(next=pageNo.value,size=pageSize.value):Promise<void> {
  const current=++listNo; listController?.abort(); listController=new AbortController();
  loading.value=true; listError.value=''; rows.value=[]; pageNo.value=next; pageSize.value=size;
  try { const page=await searchProductionVersions(next,size,{},listController.signal);
    if (disposed || current!==listNo) return;
    if (next>1 && !page.records.length) { await loadPage(next-1,size); return; }
    rows.value=page.records; pageNo.value=page.pageNo; total.value=page.total;
  } catch(error) { if (!disposed && current===listNo) listError.value=feedback(error); }
  finally { if (current===listNo) loading.value=false; }
}
async function loadReferences():Promise<void> {
  const current=++referenceNo; referenceLoading.value=true;
  try {
    const [plantPage, materialPage, formulaPage, routingPage] = await Promise.all([
      searchPlants(1,100), searchMaterials(1,100,{status:'ENABLED'}),
      searchFormulas(1,100), searchRoutings(1,100),
    ]);
    const [formulaDetails,routingDetails] = await Promise.all([
      Promise.all(formulaPage.records.map(row => getFormula(row.id))),
      Promise.all(routingPage.records.map(row => getRouting(row.id))),
    ]);
    if (disposed || current!==referenceNo) return;
    plants.value=plantPage.records; materials.value=materialPage.records;
    formulas.value=formulaDetails; routings.value=routingDetails; referenceError.value=false;
  } catch { if (!disposed && current===referenceNo) referenceError.value=true; }
  finally { if (current===referenceNo) referenceLoading.value=false; }
}
function resetForm(row?:ProductionVersion):void { Object.assign(form,{ code:row?.code??'', name:row?.name??'',
  businessVersion:row?.businessVersion??'', plantId:row?.plantId??'', outputMaterialId:row?.outputMaterialId??'',
  formulaRevisionId:row?.formulaRevisionId??'', routingRevisionId:row?.routingRevisionId??'',
  validFrom:row?.validFrom??'', validTo:row?.validTo??'' }); }
function openCreate():void { if (blocked.value || !hasAuthority('mdm:manufacturing-definition:write')) return;
  ++detailNo; detailController?.abort(); target.value=undefined; action.value='create'; formError.value=''; resetForm(); void loadReferences(); }
async function openDetail(row:ProductionVersion):Promise<void> {
  if (blocked.value) return;
  const current=++detailNo; detailController?.abort(); detailController=new AbortController();
  action.value='detail'; target.value=undefined; detailLoading.value=true; dialogError.value=''; formError.value=''; void loadReferences();
  try { const value=await getProductionVersion(row.id,detailController.signal);
    if (disposed || current!==detailNo) return; target.value=value; resetForm(value);
  } catch(error) { if (!disposed && current===detailNo) dialogError.value=feedback(error); }
  finally { if (current===detailNo) detailLoading.value=false; }
}
function close():void { if(saving.value || blocked.value)return; ++detailNo; detailController?.abort(); action.value=undefined; target.value=undefined; }
function valid():boolean { return !!form.name.trim() && !!form.businessVersion.trim() && !!form.plantId && !!form.outputMaterialId
  && !!form.formulaRevisionId && !!form.routingRevisionId && /^\d{4}-\d{2}-\d{2}$/.test(form.validFrom)
  && (!form.validTo || /^\d{4}-\d{2}-\d{2}$/.test(form.validTo) && form.validTo>form.validFrom); }
function draft():ProductionVersionDraft { return { name:form.name.trim(), businessVersion:form.businessVersion.trim(), plantId:form.plantId,
  outputMaterialId:form.outputMaterialId, formulaRevisionId:form.formulaRevisionId, routingRevisionId:form.routingRevisionId,
  validFrom:form.validFrom, validTo:form.validTo||null }; }
async function write(operation:'save'|'release'|'obsolete'):Promise<void> {
  if(saving.value || blocked.value || !hasAuthority('mdm:manufacturing-definition:write'))return;
  if(operation==='save' && (!valid() || action.value==='create' && !form.code.trim())) { formError.value=t('mdm.productionVersion.invalid'); return; }
  if(operation!=='save' && !target.value)return;
  saving.value=true; formError.value='';
  try { let value:ProductionVersion;
    if(operation==='save' && action.value==='create') value=await createProductionVersion({code:form.code.trim(),...draft()});
    else if(operation==='save' && target.value) value=await updateProductionVersion(target.value.id,{...draft(),lockVersion:target.value.lockVersion});
    else if(operation==='release' && target.value) value=await releaseProductionVersion(target.value.id,target.value.lockVersion);
    else if(operation==='obsolete' && target.value) value=await obsoleteProductionVersion(target.value.id,target.value.lockVersion);
    else return;
    target.value=value; resetForm(value); action.value='detail'; notice.value=t('mdm.productionVersion.saved'); void loadPage(1);
  } catch(error) {const classification=classifyWriteFailure(error);
    blocked.value=classification!=='failed';conflictBlocked=classification==='conflict';
    formError.value=feedback(error,true);}
  finally { saving.value=false; }
}
async function reconcile():Promise<void> {
  if(!blocked.value||saving.value||detailLoading.value||!target.value)return;
  const current=++detailNo;detailLoading.value=true;
  try {const latest=await getProductionVersion(target.value.id);
    if(current!==detailNo)return;target.value=latest;
    if(conflictBlocked) {
      blocked.value=false;conflictBlocked=false;formError.value='';
    } else formError.value=t('mdm.struct.unknownWrite');
  } catch {formError.value=t('mdm.struct.unknownWrite');}
  finally {if(current===detailNo)detailLoading.value=false;}
}
onMounted(()=>{void loadPage();}); onBeforeRouteLeave(()=>!saving.value);
onScopeDispose(()=>{disposed=true;++listNo;++detailNo;++referenceNo;listController?.abort();detailController?.abort();});
</script>

<template><PageContainer><section class="mdm-plants" aria-labelledby="mdm-pv-title">
  <MomManagementHeader title-id="mdm-pv-title" :title="t('mdm.productionVersion.title')" :description="t('mdm.productionVersion.description')"><template #actions>
    <MomButton variant="outline" :disabled="loading" @click="loadPage()"><RefreshCw :size="16" />{{t('mdm.struct.refresh')}}</MomButton>
    <AuthorityGuard :authorities="['mdm:manufacturing-definition:write']"><MomButton :disabled="blocked" @click="openCreate"><Plus :size="16" />{{t('mdm.struct.create')}}</MomButton></AuthorityGuard>
  </template></MomManagementHeader>
  <p v-if="notice" role="status">{{notice}}</p>
  <p v-if="blocked" class="mdm-plants__error" role="alert">{{formError}} <MomButton v-if="target" variant="outline" :disabled="detailLoading" @click="reconcile">{{t('mdm.struct.refresh')}}</MomButton></p>
  <div v-if="listError" class="mdm-plants__error" role="alert">{{listError}} <MomButton variant="outline" @click="loadPage()">{{t('mdm.struct.retry')}}</MomButton></div>
  <MomListSurface v-else :title="t('mdm.productionVersion.title')" :hint="t('mdm.productionVersion.listHint')" :loading="loading" :loading-text="t('mdm.struct.loading')">
    <MomDataTable :rows="rows" :columns="columns" :empty-text="t('mdm.productionVersion.noData')">
      <template #cell-plantId="{row}">{{nameOf(plants,row.plantId)}}</template><template #cell-outputMaterialId="{row}">{{nameOf(materials,row.outputMaterialId)}}</template>
      <template #cell-validFrom="{row}">{{row.validFrom}} — {{row.validTo??'∞'}}</template>
      <template #cell-actions="{row}"><MomButton mode="text" @click="openDetail(row)">{{t('mdm.struct.detail')}}</MomButton></template>
    </MomDataTable><template #footer><MomCrudPagination :page-no="pageNo" :page-size="pageSize" :total="total" :summary="`${pageNo} / ${pageCount}`"
      :page-size-label="t('mdm.struct.pageSize')" :previous-label="t('mdm.struct.previous')" :next-label="t('mdm.struct.next')" :jump-label="t('mdm.struct.jump')" :go-label="t('mdm.struct.go')"
      :disabled="loading||saving" @page="loadPage($event)" @size="loadPage(1,$event)" /></template>
  </MomListSurface>
  <MomModal :open="!!action" :title="t('mdm.productionVersion.title')" :close-label="tForOwner('system', 'system.common.close')" :busy="saving" :busy-text="t('mdm.struct.saving')" :width="720" @close="close">
    <div class="mdm-plants__dialog"><p v-if="detailLoading||referenceLoading" role="status">{{t('mdm.struct.loading')}}</p>
      <div v-if="dialogError||referenceError" class="mdm-plants__error" role="alert">{{dialogError||t('mdm.material.referencesError')}} <MomButton variant="outline" @click="loadReferences">{{t('mdm.struct.retry')}}</MomButton></div>
      <dl v-if="target" class="mdm-plants__summary"><div><dt>{{t('mdm.struct.code')}}</dt><dd>{{target.code}}</dd></div><div><dt>{{t('mdm.productionVersion.businessVersion')}}</dt><dd>{{target.businessVersion}}</dd></div>
        <div><dt>{{t('mdm.struct.status')}}</dt><dd>{{target.status}}</dd></div><div><dt>{{t('mdm.struct.version')}}</dt><dd>{{target.lockVersion}}</dd></div></dl>
      <div v-if="action==='detail'&&target" class="mdm-plants__form"><p>{{target.validFrom}} — {{target.validTo??'∞'}}</p><p>{{target.formulaRevisionId}}</p><p>{{target.routingRevisionId}}</p>
        <div class="mdm-plants__footer"><AuthorityGuard :authorities="['mdm:manufacturing-definition:write']">
          <MomButton v-if="target.status==='DRAFT'" variant="outline" :disabled="blocked" @click="action='edit'">{{t('mdm.struct.edit')}}</MomButton><MomButton v-if="target.status==='DRAFT'" :disabled="saving||blocked" @click="write('release')">{{t('mdm.productionVersion.release')}}</MomButton>
          <MomButton v-if="target.status==='RELEASED'" variant="outline" :disabled="saving||blocked" @click="write('obsolete')">{{t('mdm.productionVersion.obsolete')}}</MomButton>
        </AuthorityGuard></div></div>
      <form v-if="action==='create'||action==='edit'" class="mdm-plants__form" @submit.prevent="submitWithFocus($event,()=>write('save'))">
        <label v-if="action==='create'"><span>{{t('mdm.struct.code')}} *</span><MomInput v-model="form.code" :max-length="64" /></label><label><span>{{t('mdm.struct.name')}} *</span><MomInput v-model="form.name" :max-length="200" /></label>
        <label><span>{{t('mdm.productionVersion.businessVersion')}} *</span><MomInput v-model="form.businessVersion" :max-length="64" /></label><label><span>{{t('mdm.productionVersion.plant')}} *</span><MomSelect v-model="form.plantId" :options="plantOptions" /></label>
        <label><span>{{t('mdm.productionVersion.output')}} *</span><MomSelect v-model="form.outputMaterialId" :options="materialOptions" /></label><label><span>{{t('mdm.productionVersion.formulaRevision')}} *</span><MomSelect v-model="form.formulaRevisionId" :options="formulaOptions" /></label>
        <label><span>{{t('mdm.productionVersion.routingRevision')}} *</span><MomSelect v-model="form.routingRevisionId" :options="routingOptions" /></label><div class="mdm-struct__form-grid"><label><span>{{t('mdm.productionVersion.validFrom')}} *</span><MomInput v-model="form.validFrom" type="date" /></label><label><span>{{t('mdm.productionVersion.validTo')}}</span><MomInput v-model="form.validTo" type="date" /></label></div>
        <p v-if="formError" class="mdm-plants__field-error" role="alert" tabindex="-1">{{formError}}</p><div class="mdm-plants__footer"><MomButton variant="outline" @click="close">{{tForOwner('system', 'system.common.cancel')}}</MomButton><MomButton type="submit" :disabled="saving||blocked||referenceLoading||referenceError">{{t('mdm.struct.confirm')}}</MomButton></div>
      </form></div>
  </MomModal>
</section></PageContainer></template>
