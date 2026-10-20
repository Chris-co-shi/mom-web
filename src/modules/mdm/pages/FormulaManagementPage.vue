<script setup lang="ts">
import { computed, onMounted, onScopeDispose, reactive, ref } from 'vue';
import { Plus, RefreshCw } from '@lucide/vue';
import { onBeforeRouteLeave } from 'vue-router';
import { submitWithFocus } from '../../../shared/ui/focus';
import { AuthorityGuard, hasAuthority } from '../../auth';
import { isApiError } from '../../../shared/api/errors';
import { MomButton, MomInput, MomReferenceSelect, MomSelect } from '../../../shared/ui';
import { activeMaterialReference } from '../api/reference-api';
import MomManagementHeader from '../../../shared/components/MomManagementHeader.vue';
import MomListSurface from '../../../shared/components/MomListSurface.vue';
import MomDataTable, { type MomColumn } from '../../../shared/components/MomDataTable.vue';
import MomCrudPagination from '../../../shared/components/MomCrudPagination.vue';
import MomModal from '../../../shared/components/MomModal.vue';
import PageContainer from '../../../shared/components/PageContainer.vue';
import { useLocale } from '../../../shared/i18n/locale';
import { searchPlants, type PlantView } from '../api/factory-api';
import { searchMaterials, type Material } from '../api/material-api';
import { searchUomCatalog, type UomRow } from '../api/uom-api';
import {
  searchFormulas, getFormula, createFormula, updateFormulaDraft, nextFormulaRevision,
  releaseFormulaRevision, obsoleteFormulaRevision,
  type FormulaIdentity, type FormulaDetail, type FormulaItemInput,
} from '../api/formula-api';
import './mdm-pages.css';

const { t, tForOwner } = useLocale();
const rows = ref<FormulaIdentity[]>([]), detail = ref<FormulaDetail>();
const plants = ref<PlantView[]>([]), materials = ref<Material[]>([]), uoms = ref<UomRow[]>([]);
const optionPage = reactive({ plants: 1, materials: 1, uoms: 1 });
const optionTotal = reactive({ plants: 0, materials: 0, uoms: 0 });
const optionPending = reactive({ plants: false, materials: false, uoms: false });
const optionFailed = reactive({ plants: false, materials: false, uoms: false });
const optionLoading = computed(() => Object.values(optionPending).some(Boolean));
const optionError = computed(() => Object.values(optionFailed).some(Boolean));
const optionRequest = { plants: 0, materials: 0, uoms: 0 };
const pageNo = ref(1), pageSize = ref(20), total = ref(0);
const loading = ref(false), detailLoading = ref(false), saving = ref(false);
const listError = ref(''), dialogError = ref(''), formError = ref(''), notice = ref('');
const action = ref<'create' | 'detail' | 'edit'>();
const form = reactive({ code: '', name: '', plantId: '', outputMaterialId: '', baseBatchQuantity: '', baseUomId: '',
  items: [{ sequenceNo: 10, materialId: '', quantity: '', uomId: '' }] as FormulaItemInput[] });
let listController: AbortController | undefined, detailController: AbortController | undefined;
let requestNo = 0, detailNo = 0, disposed = false;
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));
const columns = computed<MomColumn[]>(() => [
  { key: 'code', title: t('mdm.struct.code'), minWidth: 170 },
  { key: 'name', title: t('mdm.struct.name'), minWidth: 200 },
  { key: 'plantId', title: t('mdm.formula.plant'), minWidth: 180 },
  { key: 'outputMaterialId', title: t('mdm.formula.output'), minWidth: 190 },
  { key: 'baseBatchQuantity', title: t('mdm.formula.batchQuantity'), minWidth: 160 },
  { key: 'actions', title: t('mdm.struct.actions'), width: 130, fixed: 'right', resizable: false },
]);
const selectOptions = <T extends { id: string; code: string; name: string; status: string }>(
  values: T[], selected: string,
) => {
  const options = values.filter(row => row.status === 'ENABLED' || row.id === selected)
    .map(row => ({ value: row.id, label: `${row.name} (${row.code})` }));
  if (selected && !options.some(row => row.value === selected)) options.push({ value: selected, label: selected });
  return [{ value: '', label: t('mdm.struct.select') }, ...options];
};
const plantOptions = computed(() => selectOptions(plants.value, form.plantId));
const uomOptions = (selected: string) => selectOptions(uoms.value, selected);
const label = <T extends { id: string; code: string; name: string }>(values: T[], id: string) =>
  values.find(row => row.id === id)?.name ?? id;

function feedback(error: unknown, writing = false): string {
  if (!isApiError(error)) return t(writing ? 'mdm.struct.unknownWrite' : 'mdm.struct.loadFailed');
  if (writing && (error.resultUnknown || ['network', 'timeout', 'server', 'protocol'].includes(error.kind)))
    return t('mdm.struct.unknownWrite');
  if (error.kind === 'conflict') return t('mdm.struct.conflict');
  if (error.kind === 'forbidden') return t('mdm.struct.forbidden');
  if (error.kind === 'not_found') return t('mdm.struct.notFound');
  if (error.kind === 'validation') return t('mdm.struct.validation');
  return t('mdm.struct.loadFailed');
}
async function loadPage(next = pageNo.value, size = pageSize.value): Promise<void> {
  const current = ++requestNo; listController?.abort(); listController = new AbortController();
  loading.value = true; listError.value = ''; rows.value = []; pageNo.value = next; pageSize.value = size;
  try {
    const result = await searchFormulas(next, size, {}, listController.signal);
    if (disposed || current !== requestNo) return;
    if (next > 1 && !result.records.length) { await loadPage(next - 1, size); return; }
    rows.value = result.records; pageNo.value = result.pageNo; total.value = result.total;
  } catch (error) { if (!disposed && current === requestNo) listError.value = feedback(error); }
  finally { if (current === requestNo) loading.value = false; }
}
async function loadOptions(kind: 'plants' | 'materials' | 'uoms', next = 1): Promise<void> {
  const current = ++optionRequest[kind]; optionPending[kind] = true;
  try {
    if (kind === 'plants') {
      const page = await searchPlants(next, 100);
      if (disposed || current !== optionRequest[kind]) return;
      plants.value = next === 1 ? page.records : [...plants.value, ...page.records]; optionTotal.plants = page.total;
    } else if (kind === 'materials') {
      const page = await searchMaterials(next, 100, { status: 'ENABLED' });
      if (disposed || current !== optionRequest[kind]) return;
      materials.value = next === 1 ? page.records : [...materials.value, ...page.records]; optionTotal.materials = page.total;
    } else {
      const page = await searchUomCatalog('uoms', next, 100, { status: 'ENABLED' });
      if (disposed || current !== optionRequest[kind]) return;
      uoms.value = next === 1 ? page.records : [...uoms.value, ...page.records]; optionTotal.uoms = page.total;
    }
    optionPage[kind] = next; optionFailed[kind] = false;
  } catch { if (!disposed && current === optionRequest[kind]) optionFailed[kind] = true; }
  finally { if (current === optionRequest[kind]) optionPending[kind] = false; }
}
function refreshOptions(): void { void Promise.all(['plants', 'materials', 'uoms'].map(kind =>
  loadOptions(kind as 'plants' | 'materials' | 'uoms'))); }
function resetForm(value?: FormulaDetail): void {
  const formula = value?.formula;
  Object.assign(form, {
    code: formula?.code ?? '', name: formula?.name ?? '', plantId: formula?.plantId ?? '',
    outputMaterialId: formula?.outputMaterialId ?? '', baseBatchQuantity: formula?.baseBatchQuantity ?? '',
    baseUomId: formula?.baseUomId ?? '',
    items: value?.items.map(item => ({ sequenceNo: item.sequenceNo, materialId: item.materialId,
      quantity: item.quantity, uomId: item.uomId })) ?? [{ sequenceNo: 10, materialId: '', quantity: '', uomId: '' }],
  });
}
function openCreate(): void {
  if (!hasAuthority('mdm:manufacturing-definition:write')) return;
  ++detailNo; detailController?.abort(); detail.value = undefined;
  action.value = 'create'; formError.value = ''; dialogError.value = ''; resetForm(); refreshOptions();
}
async function openDetail(row: FormulaIdentity): Promise<void> {
  const current = ++detailNo; detailController?.abort(); detailController = new AbortController();
  action.value = 'detail'; detailLoading.value = true; detail.value = undefined;
  dialogError.value = ''; formError.value = ''; refreshOptions();
  try {
    const value = await getFormula(row.id, detailController.signal);
    if (disposed || current !== detailNo) return;
    detail.value = value; resetForm(value);
  } catch (error) { if (!disposed && current === detailNo) dialogError.value = feedback(error); }
  finally { if (current === detailNo) detailLoading.value = false; }
}
function close(): void {
  if (saving.value) return;
  ++detailNo; detailController?.abort(); action.value = undefined; detail.value = undefined;
}
function addItem(): void { form.items.push({ sequenceNo: (Math.max(0, ...form.items.map(x => x.sequenceNo)) + 10),
  materialId: '', quantity: '', uomId: '' }); }
function validDecimal(value: string): boolean { return /^(0|[1-9]\d{0,14})(\.\d{1,9})?$/.test(value) && Number(value) > 0; }
function validate(): boolean {
  if (action.value === 'create' && (!form.code.trim() || !form.name.trim() || !form.plantId || !form.outputMaterialId ||
    !form.baseUomId || !validDecimal(form.baseBatchQuantity))) return false;
  return form.items.length > 0 && form.items.length <= 500 &&
    new Set(form.items.map(item => item.sequenceNo)).size === form.items.length &&
    form.items.every(item => Number.isSafeInteger(item.sequenceNo) && item.sequenceNo > 0 &&
      !!item.materialId && !!item.uomId && validDecimal(item.quantity));
}
async function write(operation: 'save' | 'next' | 'release' | 'obsolete'): Promise<void> {
  if (saving.value || !hasAuthority('mdm:manufacturing-definition:write')) return;
  if (operation === 'save' && !validate()) { formError.value = t('mdm.formula.invalid'); return; }
  const current = detail.value;
  if (operation !== 'save' && !current) return;
  saving.value = true; formError.value = ''; dialogError.value = '';
  try {
    let result: FormulaDetail;
    if (operation === 'save' && action.value === 'create') {
      result = await createFormula({ code: form.code.trim(), name: form.name.trim(), plantId: form.plantId,
        outputMaterialId: form.outputMaterialId, baseBatchQuantity: form.baseBatchQuantity,
        baseUomId: form.baseUomId, items: form.items });
    } else if (operation === 'save' && current) {
      result = await updateFormulaDraft(current.revision.id, current.revision.lockVersion, form.items);
    } else if (operation === 'next' && current) {
      result = await nextFormulaRevision(current.formula.id);
    } else if (operation === 'release' && current) {
      result = await releaseFormulaRevision(current.revision.id, current.revision.lockVersion);
    } else if (operation === 'obsolete' && current) {
      result = await obsoleteFormulaRevision(current.revision.id, current.revision.lockVersion);
    } else return;
    detail.value = result; resetForm(result); action.value = 'detail';
    notice.value = t('mdm.formula.saved'); void loadPage(1);
  } catch (error) { formError.value = feedback(error, true); }
  finally { saving.value = false; }
}
onMounted(() => { void loadPage(); });
onBeforeRouteLeave(() => !saving.value);
onScopeDispose(() => { disposed = true; ++requestNo; ++detailNo;
  Object.keys(optionRequest).forEach(kind => { ++optionRequest[kind as keyof typeof optionRequest]; });
  listController?.abort(); detailController?.abort(); });
</script>

<template>
  <PageContainer>
    <section class="mdm-plants" aria-labelledby="mdm-formula-title">
      <MomManagementHeader id="mdm-formula-title" title-id="mdm-formula-title"
        :title="t('mdm.formula.title')" :description="t('mdm.formula.description')">
        <template #actions>
          <MomButton variant="outline" :disabled="loading" @click="loadPage()"><RefreshCw :size="16" />{{ t('mdm.struct.refresh') }}</MomButton>
          <AuthorityGuard :authorities="['mdm:manufacturing-definition:write']">
            <MomButton @click="openCreate"><Plus :size="16" />{{ t('mdm.struct.create') }}</MomButton>
          </AuthorityGuard>
        </template>
      </MomManagementHeader>
      <p v-if="notice" role="status">{{ notice }}</p>
      <div v-if="listError" class="mdm-plants__error" role="alert">
        {{ listError }} <MomButton variant="outline" @click="loadPage()">{{ t('mdm.struct.retry') }}</MomButton>
      </div>
      <MomListSurface v-else :title="t('mdm.formula.title')" :hint="t('mdm.formula.listHint')"
        :loading="loading" :loading-text="t('mdm.struct.loading')">
        <MomDataTable :rows="rows" :columns="columns" :empty-text="t('mdm.formula.noData')">
          <template #cell-plantId="{ row }">{{ label(plants, row.plantId) }}</template>
          <template #cell-outputMaterialId="{ row }">{{ label(materials, row.outputMaterialId) }}</template>
          <template #cell-actions="{ row }"><MomButton mode="text" @click="openDetail(row)">{{ t('mdm.struct.detail') }}</MomButton></template>
        </MomDataTable>
        <template #footer>
          <MomCrudPagination :page-no="pageNo" :page-size="pageSize" :total="total"
            :summary="`${pageNo} / ${pageCount}`" :page-size-label="t('mdm.struct.pageSize')"
            :previous-label="t('mdm.struct.previous')" :next-label="t('mdm.struct.next')"
            :jump-label="t('mdm.struct.jump')" :go-label="t('mdm.struct.go')"
            :disabled="loading || saving" @page="loadPage($event)" @size="loadPage(1, $event)" />
        </template>
      </MomListSurface>
      <MomModal :open="!!action" :title="t('mdm.formula.title')" :close-label="tForOwner('system', 'system.common.close')"
        :busy="saving" :busy-text="t('mdm.struct.saving')" :width="760" @close="close">
        <div class="mdm-plants__dialog">
          <p v-if="detailLoading" role="status">{{ t('mdm.struct.loading') }}</p>
          <div v-if="dialogError" class="mdm-plants__error" role="alert">
            {{ dialogError }} <MomButton v-if="detail" variant="outline" @click="openDetail(detail.formula)">{{ t('mdm.struct.retry') }}</MomButton>
          </div>
          <div v-if="optionError" class="mdm-plants__error" role="alert">
            {{ t('mdm.material.referencesError') }} <MomButton variant="outline" @click="refreshOptions">{{ t('mdm.struct.retry') }}</MomButton>
          </div>
          <dl v-if="detail" class="mdm-plants__summary">
            <div><dt>{{ t('mdm.struct.code') }}</dt><dd>{{ detail.formula.code }}</dd></div>
            <div><dt>{{ t('mdm.formula.revision') }}</dt><dd>{{ detail.revision.revisionNo }}</dd></div>
            <div><dt>{{ t('mdm.struct.status') }}</dt><dd>{{ detail.revision.status }}</dd></div>
            <div><dt>{{ t('mdm.struct.version') }}</dt><dd>{{ detail.revision.lockVersion }}</dd></div>
          </dl>
          <div v-if="action === 'detail' && detail" class="mdm-plants__form">
            <p>{{ t('mdm.formula.batchQuantity') }}: {{ detail.formula.baseBatchQuantity }} · {{ label(uoms, detail.formula.baseUomId) }}</p>
            <p v-for="item in detail.items" :key="item.id">{{ item.sequenceNo }} · {{ label(materials, item.materialId) }} · {{ item.quantity }} {{ label(uoms, item.uomId) }}</p>
            <div class="mdm-plants__footer">
              <AuthorityGuard :authorities="['mdm:manufacturing-definition:write']">
                <MomButton v-if="detail.revision.status === 'DRAFT'" variant="outline" @click="action = 'edit'">{{ t('mdm.struct.edit') }}</MomButton>
                <MomButton v-if="detail.revision.status === 'DRAFT'" :disabled="saving" @click="write('release')">{{ t('mdm.formula.release') }}</MomButton>
                <MomButton v-if="detail.revision.status === 'RELEASED'" variant="outline" :disabled="saving" @click="write('obsolete')">{{ t('mdm.formula.obsolete') }}</MomButton>
                <MomButton v-if="detail.revision.status !== 'DRAFT'" :disabled="saving" @click="write('next')">{{ t('mdm.formula.nextRevision') }}</MomButton>
              </AuthorityGuard>
            </div>
          </div>
          <form v-if="action === 'create' || action === 'edit'" class="mdm-plants__form"
            @submit.prevent="submitWithFocus($event, () => write('save'))">
            <template v-if="action === 'create'">
              <label><span>{{ t('mdm.struct.code') }} *</span><MomInput v-model="form.code" :max-length="64" /></label>
              <label><span>{{ t('mdm.struct.name') }} *</span><MomInput v-model="form.name" :max-length="200" /></label>
              <label><span>{{ t('mdm.formula.plant') }} *</span><MomSelect v-model="form.plantId" :options="plantOptions" /></label>
              <label><span>{{ t('mdm.formula.output') }} *</span><MomReferenceSelect v-model="form.outputMaterialId"
                :label="t('mdm.formula.output')" :search="activeMaterialReference.search" :resolve="activeMaterialReference.resolve" /></label>
              <label><span>{{ t('mdm.formula.batchQuantity') }} *</span><MomInput v-model="form.baseBatchQuantity" inputmode="decimal" /></label>
              <label><span>{{ t('mdm.formula.baseUom') }} *</span><MomSelect v-model="form.baseUomId" :options="uomOptions(form.baseUomId)" /></label>
            </template>
            <div v-for="(item, index) in form.items" :key="index" class="mdm-struct__form-grid">
              <label><span>{{ t('mdm.formula.sequence') }} *</span><MomInput :model-value="String(item.sequenceNo)" type="number"
                @update:model-value="item.sequenceNo = Number($event)" /></label>
              <label><span>{{ t('mdm.formula.material') }} *</span><MomReferenceSelect v-model="item.materialId"
                :label="t('mdm.formula.material')" :search="activeMaterialReference.search" :resolve="activeMaterialReference.resolve" /></label>
              <label><span>{{ t('mdm.formula.quantity') }} *</span><MomInput v-model="item.quantity" inputmode="decimal" /></label>
              <label><span>{{ t('mdm.formula.uom') }} *</span><MomSelect v-model="item.uomId" :options="uomOptions(item.uomId)" /></label>
              <MomButton variant="outline" :disabled="form.items.length === 1" @click="form.items.splice(index, 1)">{{ t('mdm.formula.removeItem') }}</MomButton>
            </div>
            <MomButton variant="outline" @click="addItem">{{ t('mdm.formula.addItem') }}</MomButton>
            <div class="mdm-plants__footer" v-if="plants.length < optionTotal.plants || materials.length < optionTotal.materials || uoms.length < optionTotal.uoms">
              <MomButton v-if="plants.length < optionTotal.plants" variant="outline" :disabled="optionLoading" @click="loadOptions('plants', optionPage.plants + 1)">{{ t('mdm.struct.loadMore') }} · {{ t('mdm.formula.plant') }}</MomButton>
              <MomButton v-if="materials.length < optionTotal.materials" variant="outline" :disabled="optionLoading" @click="loadOptions('materials', optionPage.materials + 1)">{{ t('mdm.struct.loadMore') }} · {{ t('mdm.formula.material') }}</MomButton>
              <MomButton v-if="uoms.length < optionTotal.uoms" variant="outline" :disabled="optionLoading" @click="loadOptions('uoms', optionPage.uoms + 1)">{{ t('mdm.struct.loadMore') }} · {{ t('mdm.formula.uom') }}</MomButton>
            </div>
            <p v-if="formError" class="mdm-plants__field-error" role="alert" tabindex="-1">{{ formError }}</p>
            <div class="mdm-plants__footer">
              <MomButton variant="outline" @click="close">{{ tForOwner('system', 'system.common.cancel') }}</MomButton>
              <MomButton type="submit" :disabled="saving || optionLoading || optionError">{{ t('mdm.struct.confirm') }}</MomButton>
            </div>
          </form>
        </div>
      </MomModal>
    </section>
  </PageContainer>
</template>
