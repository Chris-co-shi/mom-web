<script setup lang="ts">
import { computed, onMounted, onScopeDispose, reactive, ref } from 'vue';
import { Plus, RefreshCw } from '@lucide/vue';
import { onBeforeRouteLeave } from 'vue-router';
import { submitWithFocus } from '../../../shared/ui/focus';
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
import { searchPlants, type PlantView } from '../api/factory-api';
import { searchCatalog, type MasterRow } from '../api/catalog-api';
import { searchRoutings, getRouting, createRouting, updateRoutingDraft, nextRoutingRevision,
  releaseRoutingRevision, obsoleteRoutingRevision, type RoutingIdentity, type RoutingDetail,
  type RoutingStepInput } from '../api/routing-api';
import './mdm-pages.css';

const { t } = useLocale();
const rows = ref<RoutingIdentity[]>([]), detail = ref<RoutingDetail>();
const plants = ref<PlantView[]>([]), lines = ref<MasterRow[]>([]), stations = ref<MasterRow[]>([]);
const optionPage = reactive({ plants: 1, lines: 1, stations: 1 });
const optionTotal = reactive({ plants: 0, lines: 0, stations: 0 });
const optionPending = reactive({ plants: false, lines: false, stations: false });
const optionFailed = reactive({ plants: false, lines: false, stations: false });
const optionLoading = computed(() => Object.values(optionPending).some(Boolean));
const optionError = computed(() => Object.values(optionFailed).some(Boolean));
const optionRequest = { plants: 0, lines: 0, stations: 0 };
const pageNo = ref(1), pageSize = ref(20), total = ref(0);
const loading = ref(false), detailLoading = ref(false), saving = ref(false);
const listError = ref(''), dialogError = ref(''), formError = ref(''), notice = ref('');
const action = ref<'create' | 'detail' | 'edit'>();
const form = reactive({ code: '', name: '', plantId: '',
  steps: [{ sequenceNo: 10, operationCode: '', name: '', resourceType: 'PRODUCTION_LINE', resourceId: '' }] as RoutingStepInput[] });
let listController: AbortController | undefined, detailController: AbortController | undefined;
let listNo = 0, detailNo = 0, disposed = false;
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));
const columns = computed<MomColumn[]>(() => [
  { key: 'code', title: t('mdm.struct.code'), minWidth: 170 },
  { key: 'name', title: t('mdm.struct.name'), minWidth: 210 },
  { key: 'plantId', title: t('mdm.routing.plant'), minWidth: 190 },
  { key: 'actions', title: t('mdm.struct.actions'), width: 150, fixed: 'right', resizable: false },
]);
function options<T extends { id: string; code: string; name: string; status: string }>(rows: T[], selected: string) {
  const values = rows.filter(row => row.status === 'ENABLED' || row.id === selected)
    .map(row => ({ value: row.id, label: `${row.name} (${row.code})` }));
  if (selected && !values.some(value => value.value === selected)) values.push({ value: selected, label: selected });
  return [{ value: '', label: t('mdm.struct.select') }, ...values];
}
const plantOptions = computed(() => options(plants.value, form.plantId));
const resourceOptions = (type: RoutingStepInput['resourceType'], selected: string) =>
  options(type === 'WORKSTATION' ? stations.value : lines.value, selected);
const resourceLabel = (type: RoutingStepInput['resourceType'], id: string) =>
  (type === 'WORKSTATION' ? stations.value : lines.value).find(row => row.id === id)?.name ?? id;
const plantLabel = (id: string) => plants.value.find(row => row.id === id)?.name ?? id;
function feedback(error: unknown, writing = false): string {
  if (!isApiError(error)) return t(writing ? 'mdm.struct.unknownWrite' : 'mdm.struct.loadFailed');
  if (writing && (error.resultUnknown || ['network','timeout','server','protocol'].includes(error.kind)))
    return t('mdm.struct.unknownWrite');
  if (error.kind === 'conflict') return t('mdm.struct.conflict');
  if (error.kind === 'forbidden') return t('mdm.struct.forbidden');
  if (error.kind === 'not_found') return t('mdm.struct.notFound');
  if (error.kind === 'validation') return t('mdm.struct.validation');
  return t('mdm.struct.loadFailed');
}
async function loadPage(next = pageNo.value, size = pageSize.value): Promise<void> {
  const current = ++listNo; listController?.abort(); listController = new AbortController();
  loading.value = true; listError.value = ''; rows.value = []; pageNo.value = next; pageSize.value = size;
  try {
    const page = await searchRoutings(next, size, {}, listController.signal);
    if (disposed || current !== listNo) return;
    if (next > 1 && !page.records.length) { await loadPage(next - 1, size); return; }
    rows.value = page.records; pageNo.value = page.pageNo; total.value = page.total;
  } catch (error) { if (!disposed && current === listNo) listError.value = feedback(error); }
  finally { if (current === listNo) loading.value = false; }
}
async function loadOptions(kind: 'plants' | 'lines' | 'stations', next = 1): Promise<void> {
  const current = ++optionRequest[kind]; optionPending[kind] = true;
  try {
    if (kind === 'plants') {
      const page = await searchPlants(next, 100);
      if (disposed || current !== optionRequest[kind]) return;
      plants.value = next === 1 ? page.records : [...plants.value, ...page.records]; optionTotal.plants = page.total;
    } else {
      const page = await searchCatalog(kind === 'lines' ? 'production-lines' : 'workstations', next, 100);
      if (disposed || current !== optionRequest[kind]) return;
      if (kind === 'lines') { lines.value = next === 1 ? page.records : [...lines.value, ...page.records]; optionTotal.lines = page.total; }
      else { stations.value = next === 1 ? page.records : [...stations.value, ...page.records]; optionTotal.stations = page.total; }
    }
    optionPage[kind] = next; optionFailed[kind] = false;
  } catch { if (!disposed && current === optionRequest[kind]) optionFailed[kind] = true; }
  finally { if (current === optionRequest[kind]) optionPending[kind] = false; }
}
function refreshOptions(): void { void Promise.all(['plants','lines','stations'].map(kind =>
  loadOptions(kind as 'plants' | 'lines' | 'stations'))); }
function resetForm(value?: RoutingDetail): void {
  Object.assign(form, { code: value?.routing.code ?? '', name: value?.routing.name ?? '',
    plantId: value?.routing.plantId ?? '', steps: value?.steps.map(step => ({ sequenceNo: step.sequenceNo,
      operationCode: step.operationCode, name: step.name, resourceType: step.resourceType,
      resourceId: step.resourceId })) ?? [{ sequenceNo: 10, operationCode: '', name: '',
        resourceType: 'PRODUCTION_LINE', resourceId: '' }] });
}
function openCreate(): void {
  if (!hasAuthority('mdm:manufacturing-definition:write')) return;
  ++detailNo; detailController?.abort(); detail.value = undefined;
  action.value = 'create'; formError.value = ''; dialogError.value = ''; resetForm(); refreshOptions();
}
async function openDetail(row: RoutingIdentity): Promise<void> {
  const current = ++detailNo; detailController?.abort(); detailController = new AbortController();
  action.value = 'detail'; detailLoading.value = true; detail.value = undefined;
  formError.value = ''; dialogError.value = ''; refreshOptions();
  try {
    const value = await getRouting(row.id, detailController.signal);
    if (disposed || current !== detailNo) return;
    detail.value = value; resetForm(value);
  } catch (error) { if (!disposed && current === detailNo) dialogError.value = feedback(error); }
  finally { if (current === detailNo) detailLoading.value = false; }
}
function close(): void { if (saving.value) return; ++detailNo; detailController?.abort(); action.value = undefined; detail.value = undefined; }
function addStep(): void { form.steps.push({ sequenceNo: Math.max(0, ...form.steps.map(step => step.sequenceNo)) + 10,
  operationCode: '', name: '', resourceType: 'PRODUCTION_LINE', resourceId: '' }); }
function valid(): boolean {
  if (action.value === 'create' && (!form.code.trim() || !form.name.trim() || !form.plantId)) return false;
  return form.steps.length > 0 && form.steps.length <= 500 &&
    new Set(form.steps.map(step => step.sequenceNo)).size === form.steps.length &&
    form.steps.every(step => Number.isSafeInteger(step.sequenceNo) && step.sequenceNo > 0 &&
      !!step.operationCode.trim() && !!step.name.trim() && !!step.resourceId);
}
async function write(operation: 'save' | 'next' | 'release' | 'obsolete'): Promise<void> {
  if (saving.value || !hasAuthority('mdm:manufacturing-definition:write')) return;
  if (operation === 'save' && !valid()) { formError.value = t('mdm.routing.invalid'); return; }
  const current = detail.value;
  if (operation !== 'save' && !current) return;
  saving.value = true; formError.value = ''; dialogError.value = '';
  try {
    let result: RoutingDetail;
    if (operation === 'save' && action.value === 'create') {
      result = await createRouting({ code: form.code.trim(), name: form.name.trim(), plantId: form.plantId, steps: form.steps });
    } else if (operation === 'save' && current) {
      result = await updateRoutingDraft(current.revision.id, current.revision.lockVersion, form.steps);
    } else if (operation === 'next' && current) {
      result = await nextRoutingRevision(current.routing.id);
    } else if (operation === 'release' && current) {
      result = await releaseRoutingRevision(current.revision.id, current.revision.lockVersion);
    } else if (operation === 'obsolete' && current) {
      result = await obsoleteRoutingRevision(current.revision.id, current.revision.lockVersion);
    } else return;
    detail.value = result; resetForm(result); action.value = 'detail'; notice.value = t('mdm.routing.saved'); void loadPage(1);
  } catch (error) { formError.value = feedback(error, true); }
  finally { saving.value = false; }
}
onMounted(() => { void loadPage(); });
onBeforeRouteLeave(() => !saving.value);
onScopeDispose(() => { disposed = true; ++listNo; ++detailNo;
  Object.keys(optionRequest).forEach(kind => { ++optionRequest[kind as keyof typeof optionRequest]; });
  listController?.abort(); detailController?.abort(); });
</script>

<template>
  <PageContainer>
    <section class="mdm-plants" aria-labelledby="mdm-routing-title">
      <MomManagementHeader title-id="mdm-routing-title" :title="t('mdm.routing.title')" :description="t('mdm.routing.description')">
        <template #actions>
          <MomButton variant="outline" :disabled="loading" @click="loadPage()"><RefreshCw :size="16" />{{ t('mdm.struct.refresh') }}</MomButton>
          <AuthorityGuard :authorities="['mdm:manufacturing-definition:write']">
            <MomButton @click="openCreate"><Plus :size="16" />{{ t('mdm.struct.create') }}</MomButton>
          </AuthorityGuard>
        </template>
      </MomManagementHeader>
      <p v-if="notice" role="status">{{ notice }}</p>
      <div v-if="listError" class="mdm-plants__error" role="alert">{{ listError }}
        <MomButton variant="outline" @click="loadPage()">{{ t('mdm.struct.retry') }}</MomButton></div>
      <MomListSurface v-else :title="t('mdm.routing.title')" :hint="t('mdm.routing.listHint')"
        :loading="loading" :loading-text="t('mdm.struct.loading')">
        <MomDataTable :rows="rows" :columns="columns" :empty-text="t('mdm.routing.noData')">
          <template #cell-plantId="{ row }">{{ plantLabel(row.plantId) }}</template>
          <template #cell-actions="{ row }"><MomButton mode="text" @click="openDetail(row)">{{ t('mdm.struct.detail') }}</MomButton></template>
        </MomDataTable>
        <template #footer><MomCrudPagination :page-no="pageNo" :page-size="pageSize" :total="total"
          :summary="`${pageNo} / ${pageCount}`" :page-size-label="t('mdm.struct.pageSize')"
          :previous-label="t('mdm.struct.previous')" :next-label="t('mdm.struct.next')"
          :jump-label="t('mdm.struct.jump')" :go-label="t('mdm.struct.go')"
          :disabled="loading || saving" @page="loadPage($event)" @size="loadPage(1, $event)" /></template>
      </MomListSurface>
      <MomModal :open="!!action" :title="t('mdm.routing.title')" :close-label="t('mdm.struct.close')"
        :busy="saving" :busy-text="t('mdm.struct.saving')" :width="760" @close="close">
        <div class="mdm-plants__dialog">
          <p v-if="detailLoading" role="status">{{ t('mdm.struct.loading') }}</p>
          <div v-if="dialogError" class="mdm-plants__error" role="alert">{{ dialogError }}
            <MomButton v-if="detail" variant="outline" @click="openDetail(detail.routing)">{{ t('mdm.struct.retry') }}</MomButton></div>
          <div v-if="optionError" class="mdm-plants__error" role="alert">{{ t('mdm.material.referencesError') }}
            <MomButton variant="outline" @click="refreshOptions">{{ t('mdm.struct.retry') }}</MomButton></div>
          <dl v-if="detail" class="mdm-plants__summary">
            <div><dt>{{ t('mdm.struct.code') }}</dt><dd>{{ detail.routing.code }}</dd></div>
            <div><dt>{{ t('mdm.routing.plant') }}</dt><dd>{{ plantLabel(detail.routing.plantId) }}</dd></div>
            <div><dt>{{ t('mdm.routing.revision') }}</dt><dd>{{ detail.revision.revisionNo }}</dd></div>
            <div><dt>{{ t('mdm.struct.status') }}</dt><dd>{{ detail.revision.status }}</dd></div>
            <div><dt>{{ t('mdm.struct.version') }}</dt><dd>{{ detail.revision.lockVersion }}</dd></div>
          </dl>
          <div v-if="action === 'detail' && detail" class="mdm-plants__form">
            <p v-for="step in detail.steps" :key="step.id">{{ step.sequenceNo }} · {{ step.operationCode }} · {{ step.name }}
              · {{ resourceLabel(step.resourceType, step.resourceId) }}</p>
            <div class="mdm-plants__footer">
              <AuthorityGuard :authorities="['mdm:manufacturing-definition:write']">
                <MomButton v-if="detail.revision.status === 'DRAFT'" variant="outline" @click="action = 'edit'">{{ t('mdm.struct.edit') }}</MomButton>
                <MomButton v-if="detail.revision.status === 'DRAFT'" :disabled="saving" @click="write('release')">{{ t('mdm.routing.release') }}</MomButton>
                <MomButton v-if="detail.revision.status === 'RELEASED'" variant="outline" :disabled="saving" @click="write('obsolete')">{{ t('mdm.routing.obsolete') }}</MomButton>
                <MomButton v-if="detail.revision.status !== 'DRAFT'" :disabled="saving" @click="write('next')">{{ t('mdm.routing.nextRevision') }}</MomButton>
              </AuthorityGuard>
            </div>
          </div>
          <form v-if="action === 'create' || action === 'edit'" class="mdm-plants__form"
            @submit.prevent="submitWithFocus($event, () => write('save'))">
            <template v-if="action === 'create'">
              <label><span>{{ t('mdm.struct.code') }} *</span><MomInput v-model="form.code" :max-length="64" /></label>
              <label><span>{{ t('mdm.struct.name') }} *</span><MomInput v-model="form.name" :max-length="200" /></label>
              <label><span>{{ t('mdm.routing.plant') }} *</span><MomSelect v-model="form.plantId" :options="plantOptions" /></label>
            </template>
            <div v-for="(step, index) in form.steps" :key="index" class="mdm-struct__form-grid">
              <label><span>{{ t('mdm.routing.sequence') }} *</span><MomInput type="number" :model-value="String(step.sequenceNo)"
                @update:model-value="step.sequenceNo = Number($event)" /></label>
              <label><span>{{ t('mdm.routing.operationCode') }} *</span><MomInput v-model="step.operationCode" :max-length="64" /></label>
              <label><span>{{ t('mdm.struct.name') }} *</span><MomInput v-model="step.name" :max-length="200" /></label>
              <label><span>{{ t('mdm.routing.resourceType') }} *</span><MomSelect v-model="step.resourceType" :options="[
                { value:'PRODUCTION_LINE', label:t('mdm.routing.line') },
                { value:'WORKSTATION', label:t('mdm.routing.station') }]" @update:model-value="step.resourceId = ''" /></label>
              <label><span>{{ t('mdm.routing.resource') }} *</span><MomSelect v-model="step.resourceId" :options="resourceOptions(step.resourceType, step.resourceId)" /></label>
              <MomButton variant="outline" :disabled="form.steps.length === 1" @click="form.steps.splice(index, 1)">{{ t('mdm.routing.removeStep') }}</MomButton>
            </div>
            <MomButton variant="outline" @click="addStep">{{ t('mdm.routing.addStep') }}</MomButton>
            <div class="mdm-plants__footer" v-if="plants.length < optionTotal.plants || lines.length < optionTotal.lines || stations.length < optionTotal.stations">
              <MomButton v-if="plants.length < optionTotal.plants" variant="outline" :disabled="optionLoading" @click="loadOptions('plants', optionPage.plants+1)">{{ t('mdm.struct.loadMore') }} · {{ t('mdm.routing.plant') }}</MomButton>
              <MomButton v-if="lines.length < optionTotal.lines" variant="outline" :disabled="optionLoading" @click="loadOptions('lines', optionPage.lines+1)">{{ t('mdm.struct.loadMore') }} · {{ t('mdm.routing.line') }}</MomButton>
              <MomButton v-if="stations.length < optionTotal.stations" variant="outline" :disabled="optionLoading" @click="loadOptions('stations', optionPage.stations+1)">{{ t('mdm.struct.loadMore') }} · {{ t('mdm.routing.station') }}</MomButton>
            </div>
            <p v-if="formError" class="mdm-plants__field-error" role="alert" tabindex="-1">{{ formError }}</p>
            <div class="mdm-plants__footer"><MomButton variant="outline" @click="close">{{ t('mdm.struct.cancel') }}</MomButton>
              <MomButton type="submit" :disabled="saving || optionLoading || optionError">{{ t('mdm.struct.confirm') }}</MomButton></div>
          </form>
        </div>
      </MomModal>
    </section>
  </PageContainer>
</template>
