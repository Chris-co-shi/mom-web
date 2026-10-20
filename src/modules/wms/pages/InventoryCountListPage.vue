<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { hasAuthority } from '../../auth/model/auth-permissions';
import { catalogReference } from '../../mdm/api/reference-api';
import MomManagementHeader from '../../../shared/components/MomManagementHeader.vue';
import MomListSurface from '../../../shared/components/MomListSurface.vue';
import MomDataTable, { type MomColumn } from '../../../shared/components/MomDataTable.vue';
import MomCrudPagination from '../../../shared/components/MomCrudPagination.vue';
import PageContainer from '../../../shared/components/PageContainer.vue';
import { MomButton, MomReferenceSelect } from '../../../shared/ui';
import { isApiError } from '../../../shared/api/errors';
import { useLocale } from '../../../shared/i18n/locale';
import { ROUTE_NAMES } from '../../../router/route-names';
import { createCount, listCounts, type CountSummary, type CountStatus } from '../api/inventory-count-api';
import './inventory-pages.css';
const router = useRouter(), { t, tForOwner } = useLocale();
const rows=ref<CountSummary[]>([]), warehouseId=ref('');
const warehouseReference=catalogReference('warehouses',()=>({status:'ENABLED'}));
const pageNo=ref(1), pageSize=ref(20), total=ref(0);
const loading=ref(false), saving=ref(false), error=ref(''), unknown=ref(false);
const requestKey=ref('');
watch(warehouseId,()=>{requestKey.value='';unknown.value=false;});
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
  if(!canCreate.value||!warehouseId.value||saving.value||unknown.value)return;
  saving.value=true; error.value='';
  if(!requestKey.value)requestKey.value=crypto.randomUUID();
  try { const detail=await createCount(requestKey.value,warehouseId.value,{locationIds:[],materialIds:[]});
    requestKey.value='';
    await router.push({name:ROUTE_NAMES.wmsInventoryCountDetail,params:{id:detail.task.id}}); }
  catch(cause) { unknown.value=isApiError(cause)&&cause.resultUnknown;
    error.value=unknown.value?t('wms.inventory.count.unknown')
      :isApiError(cause)&&cause.message?cause.message:t('wms.inventory.count.writefailed'); }
  finally { saving.value=false; }
}
function open(row:CountSummary):void { void router.push({name:ROUTE_NAMES.wmsInventoryCountDetail,params:{id:row.id}}); }
onMounted(()=>{void load();});
</script>
<template>
  <PageContainer><section class="inventory-page">
    <MomManagementHeader title-id="wms-count-title" :title="t('wms.inventory.count.title')" :description="t('wms.inventory.count.hint')">
      <template #actions>
        <MomReferenceSelect v-if="canCreate" v-model="warehouseId" class="inventory-page__header-reference"
          :label="t('wms.inventory.count.selectwarehouse')" :search="warehouseReference.search"
          :resolve="warehouseReference.resolve" :disabled="saving||loading" />
        <MomButton v-if="canCreate" :disabled="saving||loading||!warehouseId||unknown" @click="create">{{ t('wms.inventory.count.create') }}</MomButton>
        <MomButton variant="outline" :disabled="loading" @click="unknown=false;load()">{{ tForOwner('system','system.common.refresh') }}</MomButton>
      </template>
    </MomManagementHeader>
    <p v-if="error" role="alert" class="inventory-page__error">{{ error }}</p>
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
