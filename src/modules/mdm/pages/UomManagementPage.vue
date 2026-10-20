<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { submitWithFocus } from '../../../shared/ui/focus';
import { onBeforeRouteLeave } from 'vue-router';
import { Plus, RefreshCw } from '@lucide/vue';
import { AuthorityGuard, hasAuthority } from '../../auth';
import { MomButton, MomInput, MomSelect } from '../../../shared/ui';
import MomManagementHeader from '../../../shared/components/MomManagementHeader.vue';
import MomListSurface from '../../../shared/components/MomListSurface.vue';
import MomDataTable, { type MomColumn } from '../../../shared/components/MomDataTable.vue';
import MomCrudSearch from '../../../shared/components/MomCrudSearch.vue';
import MomCrudPagination from '../../../shared/components/MomCrudPagination.vue';
import MdmSectionTabs from '../components/MdmSectionTabs.vue';
import { decimalRuleExpression } from '../model/mdm-display';
import { useUomManagement } from '../model/use-uom-management';
import MomCrudRowMenu from '../../../shared/components/MomCrudRowMenu.vue';
import MomModal from '../../../shared/components/MomModal.vue';
import PageContainer from '../../../shared/components/PageContainer.vue';
import { useLocale } from '../../../shared/i18n/locale';
import type { UnitCatalogKind, UomRow } from '../api/uom-api';
import './mdm-pages.css';

const { t, tForOwner } = useLocale();
const management = useUomManagement();
const {
  active, tabs, exponentFields, rows, pageNo, pageSize, total, loading, saving, detailLoading,
  blocked, unknownWrite, action, target, listError, dialogError, notice, formError, search, dimensions, categories,
  referenceName, dimensionPage, categoryPage, dimensionTotal, categoryTotal, referencesError,
  referencesLoading, form, ruleOpen, ruleTarget, ruleCurrent, ruleRows, rulePage, ruleTotal,
  ruleLoading, ruleSaving, ruleError, ruleBlocked, ruleUnknown, ruleForm, decimal, decimalsValid, precisionValid, loadList,
  loadReferences, changeTab, open, close, submit, loadRule, publish, closeRule,
} = management;
const visibleRows = computed(() => {
  const q = search.value.trim().toLowerCase();
  return q ? rows.value.filter(r => `${r.code} ${r.name} ${r.symbol ?? ''}`.toLowerCase().includes(q)) : rows.value;
});
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));
const currentLabel = computed(() => t(tabs.find(x => x.kind === active.value)!.key));
const columns = computed<MomColumn[]>(() => [
  { key: 'code', title: t('mdm.struct.code'), minWidth: 160 },
  { key: 'name', title: t('mdm.struct.name'), minWidth: 180 },
  ...(active.value === 'uoms' ? [
    { key: 'symbol', title: t('mdm.uom.symbol'), minWidth: 100 },
    { key: 'referenceUnit', title: t('mdm.uom.reference'), width: 115 },
  ] : []),
  ...(active.value === 'uom-categories' ? [
    { key: 'referenceUomId', title: t('mdm.uom.reference'), minWidth: 155 },
  ] : []),
  { key: 'status', title: t('mdm.struct.status'), width: 110 },
  { key: 'actions', title: t('mdm.struct.actions'), width: 280, fixed: 'right', resizable: false },
]);
const options = (data: UomRow[], empty = false) => [
  ...(empty ? [{ value: '', label: t('mdm.struct.all') }] : []),
  ...data.map(item => ({ value: item.id, label: `${item.name} (${item.code})` })),
];
function codeFor(row: UomRow): string { return row.symbol ? `${row.code} · ${row.symbol}` : row.code; }
onMounted(() => { void loadList(); void Promise.all([loadReferences('dimensions'), loadReferences('uom-categories')]); });
onBeforeRouteLeave(() => !saving.value && !ruleSaving.value && !unknownWrite.value && !ruleUnknown.value);
</script>

<template>
  <PageContainer>
    <section class="mdm-plants" aria-labelledby="mdm-uom-title">
      <MomManagementHeader title-id="mdm-uom-title" :title="t('mdm.uom.title')" :description="t('mdm.uom.description')">
        <template #actions>
          <MomButton variant="outline" :disabled="loading || saving" @click="loadList()">
            <RefreshCw :size="16" aria-hidden="true" />{{ t('mdm.struct.refresh') }}
          </MomButton>
          <AuthorityGuard :authorities="['mdm:uom:write']">
            <MomButton :disabled="saving || referencesError" @click="open('create')">
              <Plus :size="16" aria-hidden="true" />{{ t('mdm.struct.create') }}
            </MomButton>
          </AuthorityGuard>
        </template>
      </MomManagementHeader>
<MdmSectionTabs :model-value="active" :items="tabs.map(tab => ({ value: tab.kind, label: t(tab.key) }))" :label="t('mdm.uom.title')" :disabled="loading || saving || !!action || ruleOpen" @update:model-value="changeTab($event as UnitCatalogKind)">
      <p v-if="notice" class="mdm-plants__notice" role="status">{{ notice }}</p>
      <div v-if="referencesError" class="mdm-plants__error" role="alert">
        <p>{{ t('mdm.struct.referenceLoadFailed') }}</p>
        <MomButton variant="outline" :disabled="referencesLoading" @click="loadReferences('dimensions'); loadReferences('uom-categories')">{{ t('mdm.struct.retry') }}</MomButton>
      </div>
      <div v-if="listError" class="mdm-plants__error" role="alert">
        <p>{{ listError }}</p>
        <MomButton variant="outline" @click="loadList()">{{ t('mdm.struct.retry') }}</MomButton>
      </div>
      <MomListSurface v-if="!listError" :title="currentLabel" :hint="t('mdm.struct.listHint')" :loading="loading" :loading-text="t('mdm.struct.loading')">
        <template #toolbar><MomCrudSearch v-model="search" :label="t('mdm.struct.search')" /></template>
        <MomDataTable :rows="visibleRows" :columns="columns" :empty-text="t('mdm.struct.empty')">
          <template #cell-code="{ row }"><span class="mdm-plants__code">{{ codeFor(row) }}</span></template>
          <template #cell-referenceUnit="{ row }">{{ row.referenceUnit ? t('mdm.uom.reference') : '—' }}</template>
          <template #cell-status="{ row }">
            <span class="mom-management-status" :class="row.status === 'ENABLED' ? 'mom-management-status--enabled' : 'mom-management-status--disabled'">
              <span class="mom-management-status__dot" aria-hidden="true"></span>
              {{ t(row.status === 'ENABLED' ? 'mdm.struct.enabled' : 'mdm.struct.disabled') }}
            </span>
          </template>
          <template #cell-actions="{ row }">
            <div class="mom-management-row-actions">
              <MomButton mode="text" :disabled="loading || saving" @click="open('detail', row)">{{ t('mdm.struct.detail') }}</MomButton>
              <AuthorityGuard :authorities="['mdm:uom:write']">
                <MomButton mode="text" :disabled="loading || saving" @click="open('edit', row)">{{ t('mdm.struct.edit') }}</MomButton>

              </AuthorityGuard>
<MomCrudRowMenu :label="t('mdm.struct.actions')" :disabled="loading || saving"
                :actions="[...(hasAuthority('mdm:uom:write') ? [{key:'status',label:t(row.status === 'ENABLED' ? 'mdm.struct.disable' : 'mdm.struct.enable')}] : []), ...(active === 'uoms' && !row.referenceUnit ? [{key:'rules',label:t('mdm.uom.rules')}] : [])]"
                @select="$event === 'rules' ? loadRule(row) : open('status', row)" />
            </div>
          </template>
        </MomDataTable>
        <template #footer>
          <MomCrudPagination :page-no="pageNo" :page-size="pageSize" :total="total"
            :summary="`${pageNo} / ${pageCount}`" :page-size-label="t('mdm.struct.pageSize')"
            :previous-label="t('mdm.struct.previous')" :next-label="t('mdm.struct.next')"
            :jump-label="t('mdm.struct.jump')" :go-label="t('mdm.struct.go')"
            :disabled="loading || saving" @page="loadList($event)" @size="loadList(1, $event)" />
        </template>
      </MomListSurface>
</MdmSectionTabs>
      <MomModal :open="!!action" :title="`${currentLabel} · ${t(action === 'create' ? 'mdm.struct.create' : action === 'edit' ? 'mdm.struct.edit' : action === 'status' ? 'mdm.struct.changeStatus' : 'mdm.struct.detail')}`" :close-label="tForOwner('system', 'system.common.close')"
        :busy="saving" :busy-text="t('mdm.struct.saving')" @close="close">
        <div class="mdm-plants__dialog">
          <p v-if="detailLoading" role="status">{{ t('mdm.struct.loading') }}</p>
          <div v-if="dialogError" class="mdm-plants__error" role="alert">{{ dialogError }}</div>
          <dl v-if="target && !detailLoading" class="mdm-plants__summary">
            <div><dt>{{ t('mdm.struct.code') }}</dt><dd>{{ target.code }}</dd></div>
            <div><dt>{{ t('mdm.struct.name') }}</dt><dd>{{ target.name }}</dd></div>
            <div><dt>{{ t('mdm.struct.status') }}</dt><dd>{{ t(target.status === 'ENABLED' ? 'mdm.struct.enabled' : 'mdm.struct.disabled') }}</dd></div>
            <div v-if="target.symbol"><dt>{{ t('mdm.uom.symbol') }}</dt><dd>{{ target.symbol }}</dd></div>
            <div v-if="target.dimensionId"><dt>{{ t('mdm.uom.dimensions') }}</dt><dd>{{ referenceName('dimensions', target.dimensionId) }}</dd></div>
            <div v-if="target.categoryId"><dt>{{ t('mdm.uom.categories') }}</dt><dd>{{ referenceName('uom-categories', target.categoryId) }}</dd></div>
            <div v-if="target.referenceUomId"><dt>{{ t('mdm.uom.reference') }}</dt><dd>{{ referenceName('uoms', target.referenceUomId) }}</dd></div>
            <div v-if="target.ucumNotApplicableReason"><dt>{{ t('mdm.uom.referenceReason') }}</dt><dd>{{ target.ucumNotApplicableReason }}</dd></div>
            <template v-if="active === 'dimensions'"><div v-for="[field, label] in exponentFields" :key="field"><dt>{{ t(label) }}</dt><dd>{{ target[field] }}</dd></div></template>
            <div><dt>{{ t('mdm.struct.version') }}</dt><dd>{{ target.version }}</dd></div>
          </dl>
          <form v-if="action && action !== 'detail'" class="mdm-plants__form" @submit.prevent="submitWithFocus($event, submit)">
            <template v-if="action !== 'status'">
              <label v-if="action === 'create'">
                <span>{{ t('mdm.struct.code') }} *</span><MomInput v-model="form.code" :max-length="64" :aria-invalid="!!formError && !form.code?.trim()" :aria-describedby="formError ? 'mdm-uom-form-error' : undefined" />
              </label>
              <label><span>{{ t('mdm.struct.name') }} *</span><MomInput v-model="form.name" :max-length="200" :aria-invalid="!!formError && !form.name?.trim()" :aria-describedby="formError ? 'mdm-uom-form-error' : undefined" /></label>
              <template v-if="action === 'create'">
                <div v-if="active === 'dimensions'" class="mdm-struct__form-grid">
                  <label v-for="[key, label] in exponentFields" :key="key">
                    <span>{{ t(label) }}</span><MomInput v-model="form[key]" type="number" />
                  </label>
                </div>
                <template v-else-if="active === 'uom-categories'">
                  <label><span>{{ t('mdm.uom.dimension') }} *</span>
                    <MomSelect v-model="form.dimensionId" :options="options(dimensions)" :disabled="referencesError" />
                    <MomButton v-if="dimensions.length < dimensionTotal" variant="outline" :disabled="referencesLoading"
                      @click="loadReferences('dimensions', dimensionPage + 1)">{{ t('mdm.struct.loadMore') }}</MomButton>
                  </label>
                  <p>{{ t('mdm.uom.createCategoryHint') }}</p>
                  <label><span>{{ t('mdm.uom.referenceCode') }} *</span><MomInput v-model="form.referenceCode" :max-length="64" /></label>
                  <label><span>{{ t('mdm.uom.referenceName') }} *</span><MomInput v-model="form.referenceName" :max-length="200" /></label>
                  <label><span>{{ t('mdm.uom.referenceSymbol') }} *</span><MomInput v-model="form.referenceSymbol" :max-length="32" /></label>
                  <label><span>{{ t('mdm.uom.referenceReason') }}</span><MomInput v-model="form.referenceUcumNotApplicableReason" :max-length="500" /></label>
                </template>
                <template v-else>
                  <p>{{ t('mdm.uom.createUnitHint') }}</p>
                  <label><span>{{ t('mdm.uom.category') }} *</span>
                    <MomSelect v-model="form.categoryId" :options="options(categories)" :disabled="referencesError" />
                    <MomButton v-if="categories.length < categoryTotal" variant="outline" :disabled="referencesLoading"
                      @click="loadReferences('uom-categories', categoryPage + 1)">{{ t('mdm.struct.loadMore') }}</MomButton>
                  </label>
                  <label><span>{{ t('mdm.uom.symbol') }} *</span><MomInput v-model="form.symbol" :max-length="32" /></label>
                  <label><span>{{ t('mdm.uom.referenceReason') }}</span><MomInput v-model="form.ucumNotApplicableReason" :max-length="500" /></label>
                  <div class="mdm-struct__form-grid">
                    <label><span>{{ t('mdm.uom.multiplier') }}</span><MomInput v-model="form.multiplier" /></label>
                    <label><span>{{ t('mdm.uom.offset') }}</span><MomInput v-model="form.offset" /></label>
                    <label><span>{{ t('mdm.uom.precision') }}</span><MomInput v-model="form.calculationPrecision" type="number" /></label>
                    <label><span>{{ t('mdm.uom.rounding') }}</span>
                      <MomSelect v-model="form.roundingMode" :options="['UP','DOWN','CEILING','FLOOR','HALF_UP','HALF_DOWN','HALF_EVEN','UNNECESSARY'].map(v => ({ value: v, label: v }))" />
                    </label>
                  </div>
                </template>
                <label><span>{{ t('mdm.struct.status') }}</span>
                  <MomSelect v-model="form.status" :options="[{ value: 'ENABLED', label: t('mdm.struct.enabled') }, { value: 'DISABLED', label: t('mdm.struct.disabled') }]" />
                </label>
              </template>
            </template>
            <p v-else class="mdm-plants__warning">{{ t('mdm.uom.referenceGuard') }}</p>
            <p v-if="formError" id="mdm-uom-form-error" class="mdm-plants__field-error" role="alert" tabindex="-1">{{ formError }}</p>
            <div class="mdm-plants__footer">
              <MomButton variant="outline" @click="close">{{ tForOwner('system', 'system.common.cancel') }}</MomButton>
              <MomButton type="submit" :disabled="saving || blocked || detailLoading || referencesError">{{ t('mdm.struct.confirm') }}</MomButton>
            </div>
          </form>
          <div v-else class="mdm-plants__footer"><MomButton variant="outline" @click="close">{{ tForOwner('system', 'system.common.close') }}</MomButton></div>
        </div>
      </MomModal>

      <MomModal :open="ruleOpen" :title="t('mdm.uom.rules')" :close-label="tForOwner('system', 'system.common.close')"
        :busy="ruleSaving" :busy-text="t('mdm.struct.saving')"
        @close="closeRule">
        <div class="mdm-plants__dialog">
          <p v-if="ruleLoading" role="status">{{ t('mdm.struct.loading') }}</p>
          <div v-if="ruleError && (!ruleCurrent || !hasAuthority('mdm:uom:write'))" class="mdm-plants__error" role="alert">{{ ruleError }}</div>
          <dl v-if="ruleCurrent" class="mdm-plants__summary">
            <div><dt>{{ t('mdm.struct.code') }}</dt><dd>{{ ruleTarget?.code }}</dd></div>
            <div><dt>{{ t('mdm.uom.currentVersion') }}</dt><dd>{{ ruleCurrent.versionNo }}</dd></div>
          </dl>
          <div class="mdm-struct__history">
            <strong>{{ t('mdm.uom.versionHistory') }}</strong>
            <div v-for="rule in ruleRows" :key="rule.id">
              <strong>#{{ rule.versionNo }} · {{ rule.status }}</strong>
              <p>{{ decimalRuleExpression(rule.multiplier, rule.offset) }}</p>
              <small>{{ t('mdm.uom.precision') }}: {{ rule.calculationPrecision }} · {{ t('mdm.uom.rounding') }}: {{ rule.roundingMode }}</small>
            </div>
            <div class="mdm-plants__footer">
              <MomButton variant="outline" :disabled="rulePage <= 1 || ruleLoading"
                @click="ruleTarget && loadRule(ruleTarget, rulePage - 1)">{{ t('mdm.struct.previous') }}</MomButton>
              <MomButton variant="outline" :disabled="ruleLoading || rulePage * 20 >= ruleTotal"
                @click="ruleTarget && loadRule(ruleTarget, rulePage + 1)">{{ t('mdm.struct.next') }}</MomButton>
            </div>
          </div>
          <form v-if="ruleCurrent && hasAuthority('mdm:uom:write')" class="mdm-plants__form" @submit.prevent="submitWithFocus($event, publish)">
            <p>{{ t('mdm.uom.publishHint') }}</p>
            <p v-if="ruleError" id="mdm-rule-error" class="mdm-plants__field-error" role="alert" tabindex="-1">{{ ruleError }}</p>
            <div class="mdm-struct__form-grid">
              <label><span>{{ t('mdm.uom.multiplier') }}</span><MomInput v-model="ruleForm.multiplier" :aria-invalid="!!ruleError && !decimalsValid(ruleForm.multiplier, '0')" :aria-describedby="ruleError ? 'mdm-rule-error' : undefined" /></label>
              <label><span>{{ t('mdm.uom.offset') }}</span><MomInput v-model="ruleForm.offset" :aria-invalid="!!ruleError && !decimal.test(ruleForm.offset)" :aria-describedby="ruleError ? 'mdm-rule-error' : undefined" /></label>
              <label><span>{{ t('mdm.uom.precision') }}</span><MomInput v-model="ruleForm.calculationPrecision" type="number" :aria-invalid="!!ruleError && !precisionValid(ruleForm.calculationPrecision)" :aria-describedby="ruleError ? 'mdm-rule-error' : undefined" /></label>
              <label><span>{{ t('mdm.uom.rounding') }}</span>
                <MomSelect v-model="ruleForm.roundingMode" :options="['UP','DOWN','CEILING','FLOOR','HALF_UP','HALF_DOWN','HALF_EVEN','UNNECESSARY'].map(v => ({ value: v, label: v }))" />
              </label>
            </div>
            <div class="mdm-plants__footer">
              <MomButton variant="outline" type="button" :disabled="ruleSaving" @click="ruleTarget && loadRule(ruleTarget)">{{ t('mdm.struct.refresh') }}</MomButton>
              <MomButton type="submit" :disabled="ruleLoading || ruleSaving || ruleBlocked">{{ t('mdm.uom.publish') }}</MomButton>
            </div>
          </form>
        </div>
      </MomModal>
    </section>
  </PageContainer>
</template>
