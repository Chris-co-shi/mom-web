<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { ArrowLeft, Plus, RefreshCw } from '@lucide/vue';
import { AuthorityGuard, hasAuthority } from '../../auth';
import { MomButton, MomInput, MomSelect, MomTextarea } from '../../../shared/ui';
import MomManagementHeader from '../../../shared/components/MomManagementHeader.vue';
import MomListSurface from '../../../shared/components/MomListSurface.vue';
import MomDataTable, { type MomColumn } from '../../../shared/components/MomDataTable.vue';
import MomCrudSearch from '../../../shared/components/MomCrudSearch.vue';
import MomCrudPagination from '../../../shared/components/MomCrudPagination.vue';
import MomModal from '../../../shared/components/MomModal.vue';
import PageContainer from '../../../shared/components/PageContainer.vue';
import CodeRuleDefinitionView from './CodeRuleDefinitionView.vue';
import CodeRuleGenerationPanel from './CodeRuleGenerationPanel.vue';
import CodeRuleDesigner from '../../../shared/form-designer/CodeRuleDesigner.vue';
import { useLocale } from '../../../shared/i18n/locale';
import { formatInstant } from '../../../shared/formatters';
import { useCodeRuleManagement, type CodeRuleAction } from '../model/use-code-rule-management';
import type { CodeRuleStatus } from '../api/code-rule-api';
import type { MessageKey } from '../../../locales/zh-CN';
import './system-pages.css';
import './code-rule-management.css';

const { t, locale } = useLocale();
const state = useCodeRuleManagement();
const { owner, canRead, canWrite, catalog, catalogLoading, catalogError, catalogReady, rows, loading, listError,
  pageNo, pageSize, total, totalPages, filters, historyCode, editorOpen, detailLoading, target, ruleCode, usageScenario, description, definition,
  dirty, saving, writeBlocked, feedback, notice, discardPending, unsupported, editable } = state;
const confirmation = ref<CodeRuleAction | null>(null);
const generating = ref(false);
const statusKey: Record<CodeRuleStatus, MessageKey> = { DRAFT: 'system.coderules.draft', ENABLED: 'system.common.enabled', DISABLED: 'system.common.disabled' };
const actionKey: Record<CodeRuleAction, MessageKey> = { revise: 'system.coderules.revise', enable: 'system.coderules.publish', disable: 'system.common.disable' };
const columns = computed<MomColumn[]>(() => [
  { key: 'ruleCode', title: t('system.coderules.usagescenario'), minWidth: 240 },
  { key: 'revisionNo', title: t('system.coderules.revision'), width: 100 },
  { key: 'status', title: t('system.common.status'), width: 120 },
  { key: 'composition', title: t('system.coderules.composition'), minWidth: 320 },
  { key: 'updatedAt', title: t('system.common.updatedAt'), minWidth: 190 },
  { key: 'actions', title: t('system.common.actions'), width: 190, fixed: 'right', resizable: false },
]);
const statusOptions = computed(() => [{ value: '', label: t('system.coderules.allstatuses') },
  ...(['DRAFT', 'ENABLED', 'DISABLED'] as const).map(value => ({ value, label: t(statusKey[value]) }))]);
async function leaveHistory(): Promise<void> { historyCode.value = ''; pageNo.value = 1; await state.loadList(); }
const busy = computed(() => saving.value || detailLoading.value || generating.value);
async function confirmAction(): Promise<void> {
  const action = confirmation.value; if (!action) return;
  confirmation.value = null; await state.act(action);
}
function beforeUnload(event: BeforeUnloadEvent): void {
  if (dirty.value || busy.value) { event.preventDefault(); event.returnValue = ''; }
}
onMounted(() => { void state.reload(); window.addEventListener('beforeunload', beforeUnload); });
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload));
onBeforeRouteLeave(() => generating.value ? false : state.confirmDiscard());
</script>

<template>
  <PageContainer><section class="system-page" aria-labelledby="code-rules-title">
    <MomManagementHeader title-id="code-rules-title" :title="t('system.coderules.title')" :description="t('system.coderules.description')">
      <template #actions>
        <MomButton variant="outline" round :disabled="loading || catalogLoading || saving" @click="state.reload"><RefreshCw :size="16" aria-hidden="true" />{{ t('system.common.refresh') }}</MomButton>
        <AuthorityGuard :authorities="[owner.readAuthority, owner.writeAuthority]"><MomButton round :disabled="saving || writeBlocked || !catalogReady" @click="state.open()"><Plus :size="16" aria-hidden="true" />{{ t('system.coderules.create') }}</MomButton></AuthorityGuard>
      </template>
    </MomManagementHeader>
    <label class="code-rule-management__owner">{{ t('system.coderules.owner') }}<MomSelect :model-value="owner.id" :options="state.owners.map(item => ({ label: item.label, value: item.id }))" :disabled="saving" @update:model-value="state.changeOwner" /></label>
    <p class="system-page__hint">{{ t('system.coderules.ownerhint') }}</p>
    <p v-if="!canRead" class="system-page__error" role="alert">{{ t('system.feedback.forbidden') }}</p>
    <template v-else>
      <p v-if="notice && !editorOpen" class="system-page__notice" role="status">{{ t('system.common.saved') }}</p>
      <div v-if="feedback && !editorOpen" class="system-page__error" role="alert"><p>{{ t(feedback.key) }}</p><small v-if="feedback.correlationId">{{ feedback.correlationId }}</small><MomButton v-if="writeBlocked" variant="outline" @click="state.reconcile">{{ t('system.coderules.reconcile') }}</MomButton></div>
      <div v-if="catalogError" class="system-page__error" role="alert"><p>{{ t('system.coderules.catalogfailed') }} {{ t(catalogError.key) }}</p><MomButton variant="outline" :disabled="catalogLoading" @click="state.loadCatalog">{{ t('system.common.refresh') }}</MomButton></div>
      <p v-else-if="!catalogLoading && !catalog.length" class="system-page__hint" role="status">{{ t('system.coderules.catalogempty') }}</p>
      <div v-if="listError" class="system-page__error" role="alert"><p>{{ t(listError.key) }}</p><small v-if="listError.correlationId">{{ listError.correlationId }}</small><MomButton variant="outline" @click="state.loadList">{{ t('system.common.refresh') }}</MomButton></div>
      <MomListSurface class="code-rule-management__list" :title="historyCode ? `${t('system.coderules.history')} · ${historyCode}` : t('system.coderules.directory')" :hint="t(historyCode ? 'system.coderules.historyhint' : 'system.coderules.listhint')" :loading="loading" :loading-text="t('system.common.loading')">
        <template #toolbar>
          <div v-if="historyCode" class="code-rule-management__history-tools">
            <MomButton variant="outline" :disabled="loading || saving" @click="leaveHistory"><ArrowLeft :size="16" aria-hidden="true" />{{ t('system.coderules.backtolist') }}</MomButton>
            <span class="mom-management-count">{{ t('system.common.count', { total, visible: rows.length }) }}</span>
          </div>
          <form v-else class="code-rule-management__filters" @submit.prevent="state.search">
            <div class="code-rule-management__field"><span>{{ t('system.coderules.rulecode') }}</span>
              <MomCrudSearch :model-value="filters.ruleCode ?? ''" @update:model-value="filters.ruleCode = $event" :label="t('system.coderules.rulecode')" :disabled="loading || saving" />
            </div>
            <label class="code-rule-management__field">{{ t('system.common.status') }}
              <MomSelect :key="locale" v-model="filters.status" :placeholder="t('system.common.status')" :options="statusOptions" :disabled="loading || saving" />
            </label>
            <MomButton type="submit" :disabled="loading || saving">{{ t('system.coderules.search') }}</MomButton>
            <span class="mom-management-count">{{ t('system.common.count', { total, visible: rows.length }) }}</span>
          </form>
        </template>
        <MomDataTable :rows="rows" :columns="columns" :empty-text="t('system.common.empty')">
          <template #cell-ruleCode="{ row }"><div class="code-rule-management__identity"><strong>{{ row.usageScenario || t('system.coderules.missingscenario') }}</strong><code>{{ row.ruleCode }}</code><span v-if="row.description">{{ row.description }}</span></div></template>
          <template #cell-composition="{ row }"><CodeRuleDefinitionView compact :definition="row.definition" :catalog="catalog" /></template>
          <template #cell-status="{ row }"><span class="mom-management-status" :class="row.status === 'ENABLED' ? 'mom-management-status--enabled' : 'mom-management-status--disabled'">{{ t(statusKey[row.status]) }}</span></template>
          <template #cell-updatedAt="{ row }">{{ formatInstant(row.updatedAt, { locale }) }}</template>
          <template #cell-actions="{ row }"><div class="system-page__row-actions"><MomButton mode="text" :disabled="saving" @click="state.open(row)">{{ t('system.common.detail') }}</MomButton><MomButton v-if="!historyCode" mode="text" :disabled="saving" @click="state.showHistory(row)">{{ t('system.coderules.history') }}</MomButton></div></template>
        </MomDataTable>
        <template #footer><MomCrudPagination :page-no="pageNo" :page-size="pageSize" :total="total" :summary="t('system.common.page', { current: pageNo, pages: Math.max(1, totalPages) })" :page-size-label="t('system.common.pageSize')" :previous-label="t('system.common.previous')" :next-label="t('system.common.next')" :jump-label="t('system.common.jump')" :go-label="t('system.common.go')" :disabled="loading || saving" @page="state.page" @size="state.size" /></template>
      </MomListSurface>
    </template>
    <MomModal :open="editorOpen" :title="target ? `${target.usageScenario || target.ruleCode} · ${t('system.coderules.revision')} ${target.revisionNo}` : t('system.coderules.create')" :close-label="t('system.common.close')" :width="target && target.status !== 'DRAFT' ? 'min(880px, 94vw)' : 'min(1440px, 96vw)'" :busy="busy" :busy-text="t(saving ? 'system.common.saving' : 'system.common.loading')" @close="state.close">
      <div v-if="feedback" class="system-page__error" role="alert"><p>{{ t(feedback.key) }}</p><small v-if="feedback.correlationId">{{ feedback.correlationId }}</small></div>
      <p v-if="notice" class="system-page__notice" role="status">{{ t('system.common.saved') }}</p>
      <div class="code-rule-management__context">
        <span>{{ owner.label }}</span>
        <template v-if="target"><span class="mom-management-status" :class="target.status === 'ENABLED' ? 'mom-management-status--enabled' : 'mom-management-status--disabled'">{{ t(statusKey[target.status]) }}</span><span>{{ t('system.common.updatedAt') }} {{ formatInstant(target.updatedAt, { locale }) }}</span></template>
        <span v-if="target" class="code-rule-management__code">{{ t('system.coderules.rulecode') }} · {{ target.ruleCode }}</span>
        <span v-if="dirty" role="status">{{ t('system.coderules.unsaved') }}</span>
      </div>
      <div v-if="!detailLoading && editable" class="code-rule-management__metadata">
        <label v-if="!target" class="code-rule-management__field">{{ t('system.coderules.rulecode') }}<MomInput v-model="ruleCode" :disabled="busy || writeBlocked" :max-length="64" /></label>
        <label class="code-rule-management__field">{{ t('system.coderules.usagescenario') }}<MomInput v-model="usageScenario" required aria-required="true" :disabled="busy || writeBlocked" :max-length="120" /></label>
        <label class="code-rule-management__field code-rule-management__description">{{ t('system.common.description') }}<MomTextarea v-model="description" :disabled="busy || writeBlocked" :maxlength="1000" :rows="3" /></label>
      </div>
      <dl v-else-if="!detailLoading && target" class="code-rule-management__metadata-readonly"><div><dt>{{ t('system.coderules.usagescenario') }}</dt><dd>{{ usageScenario || t('system.coderules.missingscenario') }}</dd></div><div><dt>{{ t('system.common.description') }}</dt><dd>{{ description || '—' }}</dd></div></dl>
      <p class="system-page__hint">{{ t('system.coderules.previewhint') }}</p>
      <p v-if="unsupported.length" class="system-page__error" role="alert">{{ t('system.coderules.unsupported') }} {{ unsupported.join(', ') }}</p>
      <p v-if="!catalogReady" class="system-page__hint">{{ t(catalogLoading ? 'system.common.loading' : 'system.coderules.catalogunavailable') }}</p>
      <CodeRuleDesigner v-if="editorOpen && editable" :key="`${owner.id}:${target?.id ?? 'new'}`" v-model="definition" :catalog="catalog" />
      <template v-else-if="!detailLoading">
        <p v-if="target && target.status !== 'DRAFT'" class="system-page__hint">{{ t('system.coderules.immutable') }}</p>
        <section class="code-rule-management__overview" :aria-label="t('system.coderules.composition')">
          <h3>{{ t('system.coderules.composition') }}</h3><p class="system-page__hint">{{ t('system.coderules.compositionhint') }}</p>
          <CodeRuleDefinitionView :definition="definition" :catalog="catalog" />
        </section>
        <CodeRuleGenerationPanel v-if="target?.status === 'ENABLED' && hasAuthority(owner.generateAuthority)"
          :key="`${owner.id}:${target.id}`" :owner="owner" :rule="target" @busy="generating = $event" />
        <details class="code-rule-management__technical"><summary>{{ t('system.coderules.technical') }}</summary>
          <dl class="code-rule-management__technical-meta" v-if="target"><div><dt>{{ t('system.common.version') }}</dt><dd>{{ target.ruleVersion }}</dd></div><div><dt>ruleId</dt><dd>{{ target.ruleId }}</dd></div><div><dt>revisionId</dt><dd>{{ target.id }}</dd></div></dl>
          <pre class="code-rule-management__json">{{ JSON.stringify(definition, null, 2) }}</pre>
        </details>
      </template>
      <template #footer>
        <MomButton variant="outline" :disabled="busy" @click="state.close">{{ t('system.common.close') }}</MomButton>
        <MomButton v-if="writeBlocked" variant="outline" :disabled="busy" @click="state.reconcile">{{ t('system.coderules.reconcile') }}</MomButton>
        <AuthorityGuard :authorities="[owner.readAuthority, owner.writeAuthority]">
          <MomButton v-if="!target || target.status === 'DRAFT'" :disabled="!editable || busy" @click="state.save">{{ t('system.common.save') }}</MomButton>
          <template v-if="target && canWrite">
            <MomButton v-if="target.status !== 'DRAFT'" variant="outline" :disabled="busy || writeBlocked || dirty" @click="confirmation = 'revise'">{{ t('system.coderules.revise') }}</MomButton>
            <MomButton v-if="target.status !== 'ENABLED'" :disabled="busy || writeBlocked || dirty || !catalogReady || !!unsupported.length" @click="confirmation = 'enable'">{{ t('system.coderules.publish') }}</MomButton>
            <MomButton v-else variant="outline" :disabled="busy || writeBlocked" @click="confirmation = 'disable'">{{ t('system.common.disable') }}</MomButton>
          </template>
        </AuthorityGuard>
      </template>
    </MomModal>
    <MomModal :open="!!confirmation" :title="confirmation ? t(actionKey[confirmation]) : ''" :close-label="t('system.common.close')" @close="confirmation = null">
      <p>{{ t(confirmation === 'enable' ? 'system.coderules.publishhint' : confirmation === 'disable' ? 'system.coderules.disablehint' : 'system.coderules.revisehint') }}</p>
      <template #footer><MomButton variant="outline" @click="confirmation = null">{{ t('system.common.cancel') }}</MomButton><MomButton @click="confirmAction">{{ t('system.common.confirm') }}</MomButton></template>
    </MomModal>
    <MomModal :open="discardPending" :title="t('system.coderules.unsaved')" :close-label="t('system.common.close')" @close="state.resolveDiscard(false)">
      <p>{{ t('system.coderules.discardhint') }}</p>
      <template #footer><MomButton variant="outline" @click="state.resolveDiscard(false)">{{ t('system.common.cancel') }}</MomButton><MomButton @click="state.resolveDiscard(true)">{{ t('system.coderules.discard') }}</MomButton></template>
    </MomModal>
  </section></PageContainer>
</template>
