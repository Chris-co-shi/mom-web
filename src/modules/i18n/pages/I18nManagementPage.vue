<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { Plus, RefreshCw } from '@lucide/vue';
import { AuthorityGuard } from '../../auth';
import { hasAuthority } from '../../auth/model/auth-permissions';
import { MomButton, MomCheckbox, MomInput, MomLoading, MomSelect, MomTextarea } from '../../../shared/ui';
import MomManagementHeader from '../../../shared/components/MomManagementHeader.vue';
import MomListSurface from '../../../shared/components/MomListSurface.vue';
import MomDataTable, { type MomColumn } from '../../../shared/components/MomDataTable.vue';
import MomCrudSearch from '../../../shared/components/MomCrudSearch.vue';
import MomModal from '../../../shared/components/MomModal.vue';
import PageContainer from '../../../shared/components/PageContainer.vue';
import { useLocale } from '../../../shared/i18n/locale';
import { i18nManagementApi } from '../../../shared/i18n/i18n-management-api';
import type { I18nMessage } from '../../../shared/i18n/models';
import { i18nOwner, i18nOwners } from '../../../shared/i18n/i18n-owner-registry';
import { i18nRuntimeApi, type I18nOwner } from '../../../shared/i18n/runtime-api';
import { managementFeedback as systemFeedback, validDisplayText, type ManagementFeedback as SystemFeedback } from '../../../shared/management/management-feedback';
import { useManagementList as useSystemList } from '../../../shared/management/use-management-list';
import { placeholderSet, validMessageKey, validMessageText, validNamespace } from '../model/i18n-validation';
import '../../system/pages/system-pages.css';

type Action = 'create' | 'edit' | 'detail' | 'status' | 'translation';
interface TranslationRow { id: string; localeCode: string; displayName: string; messageText: string; version: number | null; }
const { t } = useLocale();
const activeOwner = ref<I18nOwner>('system');
const availableOwners = computed(() => i18nOwners.filter((item) => hasAuthority(item.readAuthority)));
const writeAuthority = computed(() => i18nOwner(activeOwner.value).writeAuthority);
const namespaceInput = ref('system.web'); const activeNamespace = ref('system.web');
const messages = useSystemList(signal => i18nManagementApi.listMessages(activeOwner.value, activeNamespace.value, signal));
const locales = useSystemList(i18nRuntimeApi.locales);
const selectedId = ref<string | null>(null);
const selected = computed(() => messages.rows.value.find(row => row.id === selectedId.value) ?? null);
const translations = useSystemList(signal => selectedId.value ? i18nManagementApi.listTranslations(activeOwner.value, selectedId.value, signal) : Promise.resolve([]));
const search = ref(''); const pageNo = ref(1); const pageSize = ref(20);
const filtered = computed(() => messages.rows.value.filter(row => `${row.messageKey} ${row.description ?? ''}`.toLowerCase().includes(search.value.trim().toLowerCase())));
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)));
const visible = computed(() => filtered.value.slice((pageNo.value - 1) * pageSize.value, pageNo.value * pageSize.value));
const translationRows = computed<TranslationRow[]>(() => locales.rows.value.map(row => {
  const translation = translations.rows.value.find(entry => entry.localeCode === row.localeCode);
  return { id: row.localeCode, localeCode: row.localeCode, displayName: row.displayName, messageText: translation?.messageText ?? '', version: translation?.version ?? null };
}));
const columns = computed<MomColumn[]>(() => [
  { key: 'localeCode', title: t('system.locales.code'), minWidth: 130 },
  { key: 'displayName', title: t('system.locales.displayName'), minWidth: 170 },
  { key: 'messageText', title: t('system.messages.text'), minWidth: 280 },
  { key: 'actions', title: t('system.common.actions'), width: 150, fixed: 'right', resizable: false },
]);
const action = ref<Action | null>(null); const target = ref<I18nMessage | null>(null); const targetTranslation = ref<TranslationRow | null>(null);
const form = reactive({ messageKey: '', description: '', messageText: '', enabled: true });
const saving = ref(false); const blocked = ref(false); const feedback = ref<SystemFeedback | null>(null); const notice = ref(false);
watch([search, pageSize], () => { pageNo.value = 1; });
watch(pages, value => { if (pageNo.value > value) pageNo.value = value; });
watch(selectedId, id => { translations.clear(); if (id) void translations.reload(); });

async function reloadMessages(): Promise<void> {
  if (!(await messages.reload())) return;
  blocked.value = false; feedback.value = null;
  if (!messages.rows.value.some(row => row.id === selectedId.value)) selectedId.value = messages.rows.value[0]?.id ?? null;
  else if (selectedId.value) await translations.reload();
  if (target.value) target.value = messages.rows.value.find(row => row.id === target.value?.id) ?? null;
}
async function reloadTranslations(): Promise<void> {
  if (!selectedId.value || !(await translations.reload())) return;
  blocked.value = false; feedback.value = null;
  if (targetTranslation.value) targetTranslation.value = translationRows.value.find(row => row.localeCode === targetTranslation.value?.localeCode) ?? null;
}
async function queryNamespace(): Promise<void> {
  const value = namespaceInput.value.trim();
  if (!validNamespace(value, activeOwner.value)) { feedback.value = { key: 'system.feedback.invalid' }; return; }
  activeNamespace.value = value; selectedId.value = null; messages.clear(); translations.clear(); pageNo.value = 1;
  await reloadMessages();
}
async function switchOwner(value: string | number): Promise<void> {
  const next = i18nOwners.find((item) => item.owner === value && hasAuthority(item.readAuthority));
  if (!next || next.owner === activeOwner.value || saving.value) return;
  activeOwner.value = next.owner;
  activeNamespace.value = next.initialNamespace;
  namespaceInput.value = next.initialNamespace;
  selectedId.value = null; messages.clear(); translations.clear(); pageNo.value = 1;
  await reloadMessages();
}
function open(next: Action, row?: I18nMessage, translation?: TranslationRow): void {
  if (saving.value || blocked.value) return;
  notice.value = false; action.value = next; target.value = row ?? selected.value; targetTranslation.value = translation ?? null;
  feedback.value = null;
  Object.assign(form, { messageKey: row?.messageKey ?? '', description: row?.description ?? '', enabled: row?.enabled ?? true, messageText: translation?.messageText ?? '' });
}
function close(): void { if (!saving.value) { action.value = null; feedback.value = null; } }
async function submit(): Promise<void> {
  if (!action.value || action.value === 'detail' || saving.value || blocked.value) return;
  if (action.value !== 'create' && (!target.value || (action.value === 'translation' && !targetTranslation.value))) {
    feedback.value = { key: 'system.feedback.notFound' }; blocked.value = true; return;
  }
  if ((action.value === 'create' && !validMessageKey(form.messageKey.trim())) || !validDisplayText(form.description, 1000, false) ||
      (action.value === 'translation' && !validMessageText(form.messageText))) {
    feedback.value = { key: 'system.common.required' }; return;
  }
  if (action.value === 'translation') {
    const other = translations.rows.value.find(row => row.localeCode !== targetTranslation.value?.localeCode);
    if (other && placeholderSet(other.messageText) !== placeholderSet(form.messageText)) {
      feedback.value = { key: 'system.messages.placeholdersMismatch' }; return;
    }
  }
  saving.value = true; feedback.value = null;
  try {
    if (action.value === 'create') await i18nManagementApi.createMessage(activeOwner.value, { namespace: activeNamespace.value, messageKey: form.messageKey.trim(), description: form.description.trim() || null, enabled: form.enabled });
    else if (action.value === 'edit' && target.value) await i18nManagementApi.updateMessage(activeOwner.value, target.value, { description: form.description.trim() || null, enabled: target.value.enabled, version: target.value.version });
    else if (action.value === 'status' && target.value) await i18nManagementApi.updateMessage(activeOwner.value, target.value, { description: target.value.description, enabled: !target.value.enabled, version: target.value.version });
    else if (action.value === 'translation' && target.value && targetTranslation.value) await i18nManagementApi.saveTranslation(activeOwner.value, target.value.id, targetTranslation.value.localeCode, form.messageText, targetTranslation.value.version);
    const wasTranslation = action.value === 'translation'; action.value = null; notice.value = true;
    if (wasTranslation) await reloadTranslations(); else await reloadMessages();
  } catch (cause) {
    feedback.value = systemFeedback(cause, true);
    blocked.value = feedback.value.key === 'system.feedback.conflict' || feedback.value.key === 'system.feedback.unknown';
  } finally { saving.value = false; }
}
onMounted(async () => {
  const first = availableOwners.value[0];
  if (first && first.owner !== activeOwner.value) {
    activeOwner.value = first.owner;
    activeNamespace.value = first.initialNamespace;
    namespaceInput.value = first.initialNamespace;
  }
  await Promise.all([reloadMessages(), locales.reload()]);
});
onBeforeRouteLeave(() => !saving.value);
</script>

<template>
  <PageContainer><section class="system-page" aria-labelledby="system-messages-title">
    <MomManagementHeader title-id="system-messages-title" :title="t('system.messages.title')" :description="t('system.messages.description')"><template #actions><MomButton variant="outline" class="mom-management-button--secondary" round :disabled="messages.loading.value || saving" @click="reloadMessages"><RefreshCw :size="16" aria-hidden="true" />{{ t('system.common.refresh') }}</MomButton><AuthorityGuard :authorities="[writeAuthority]"><MomButton round :disabled="saving || blocked" @click="open('create')"><Plus :size="16" aria-hidden="true" />{{ t('system.messages.create') }}</MomButton></AuthorityGuard></template></MomManagementHeader>
    <div class="system-page__namespace"><label>{{ t('system.messages.owner') }}<MomSelect :model-value="activeOwner" :options="availableOwners.map(item => ({ value: item.owner, label: item.label }))" :disabled="messages.loading.value || saving" @update:model-value="switchOwner" /></label><label>{{ t('system.messages.namespace') }}<MomInput v-model="namespaceInput" :max-length="128" :disabled="messages.loading.value || saving" /></label><MomButton :disabled="messages.loading.value || saving" @click="queryNamespace">{{ t('system.messages.query') }}</MomButton><small>{{ t('system.messages.namespaceHint') }}</small></div>
    <p v-if="notice" class="system-page__notice" role="status">{{ t('system.common.saved') }}</p>
    <div v-if="feedback && !action" class="system-page__error" role="alert"><p>{{ t(feedback.key) }}</p><MomButton variant="outline" @click="reloadMessages">{{ t('system.common.refresh') }}</MomButton></div>
    <div v-if="messages.error.value" class="system-page__error" role="alert"><p>{{ t(messages.error.value.key) }}</p><small v-if="messages.error.value.correlationId">{{ messages.error.value.correlationId }}</small><MomButton variant="outline" @click="reloadMessages">{{ t('system.common.refresh') }}</MomButton></div>
    <div class="system-page__workspace"><aside class="system-page__rail" :aria-label="t('system.messages.directory')" :aria-busy="messages.loading.value"><div class="system-page__rail-header"><strong>{{ t('system.messages.directory') }}</strong><span class="system-page__count">{{ activeNamespace }}</span></div><MomCrudSearch v-model="search" :label="t('system.common.search')" :disabled="messages.loading.value" /><small class="system-page__count">{{ t('system.common.scope') }}</small><div class="system-page__rail-list"><MomButton v-for="row in visible" :key="row.id" class="system-page__rail-item" :class="{ 'system-page__rail-item--active': selectedId === row.id }" :aria-pressed="selectedId === row.id" :disabled="messages.loading.value || saving" @click="selectedId = row.id"><strong>{{ row.messageKey }}</strong><small>{{ t(row.enabled ? 'system.common.enabled' : 'system.common.disabled') }}</small></MomButton><p v-if="!messages.loading.value && !visible.length" class="system-page__count">{{ t('system.common.empty') }}</p></div><div class="system-page__rail-footer"><span>{{ t('system.common.page', { current: pageNo, pages }) }}</span><div><MomButton variant="outline" size="icon" :aria-label="t('system.common.previous')" :disabled="pageNo <= 1" @click="pageNo--">‹</MomButton><MomButton variant="outline" size="icon" :aria-label="t('system.common.next')" :disabled="pageNo >= pages" @click="pageNo++">›</MomButton></div></div><MomLoading :model-value="messages.loading.value" :text="t('system.common.loading')" /></aside>
      <div class="system-page__detail"><template v-if="selected"><div class="system-page__detail-heading"><div><h2>{{ selected.messageKey }}</h2><p>{{ selected.namespace }} · {{ selected.description || '—' }}</p></div><div class="system-page__detail-actions"><MomButton variant="outline" @click="open('detail', selected)">{{ t('system.common.detail') }}</MomButton><AuthorityGuard :authorities="[writeAuthority]"><MomButton variant="outline" :disabled="saving || blocked" @click="open('edit', selected)">{{ t('system.common.edit') }}</MomButton><MomButton variant="outline" :disabled="saving || blocked" @click="open('status', selected)">{{ t(selected.enabled ? 'system.common.disable' : 'system.common.enable') }}</MomButton></AuthorityGuard></div></div>
        <div v-if="translations.error.value || locales.error.value" class="system-page__error" role="alert"><p>{{ t((translations.error.value || locales.error.value)!.key) }}</p><MomButton variant="outline" @click="reloadTranslations(); locales.reload()">{{ t('system.common.refresh') }}</MomButton></div>
        <MomListSurface embedded :title="t('system.messages.translations')" :hint="t('system.messages.textHint')" :loading="translations.loading.value || locales.loading.value" :loading-text="t('system.common.loading')"><template #toolbar><span class="mom-management-count">{{ t('system.common.count', { total: translationRows.length, visible: translationRows.length }) }}</span></template><MomDataTable class="system-page__table" :rows="translationRows" :columns="columns" :empty-text="t(locales.rows.value.length ? 'system.common.empty' : 'system.messages.noLocales')"><template #cell-localeCode="{ row }"><span class="system-page__code">{{ row.localeCode }}</span></template><template #cell-messageText="{ row }">{{ row.messageText || '—' }}</template><template #cell-actions="{ row }"><AuthorityGuard :authorities="[writeAuthority]"><MomButton mode="text" :disabled="saving || blocked" @click="open('translation', selected, row)">{{ t('system.messages.editTranslation') }}</MomButton></AuthorityGuard></template></MomDataTable></MomListSurface>
      </template><div v-else class="system-page__empty">{{ t('system.messages.select') }}</div></div></div>
    <MomModal :open="!!action" :title="t(action === 'translation' ? 'system.messages.editTranslation' : action === 'create' ? 'system.messages.create' : action === 'edit' ? 'system.common.edit' : action === 'detail' ? 'system.common.detail' : 'system.common.confirm')" :close-label="t('system.common.close')" :busy="saving" :busy-text="t('system.common.saving')" @close="close">
      <div v-if="feedback" class="system-page__error" role="alert"><p>{{ t(feedback.key) }}</p><small v-if="feedback.correlationId">{{ feedback.correlationId }}</small><MomButton v-if="blocked" variant="outline" @click="action === 'translation' ? reloadTranslations() : reloadMessages()">{{ t('system.common.refresh') }}</MomButton></div>
      <dl v-if="target" class="system-page__summary"><div><dt>{{ t('system.messages.namespace') }}</dt><dd>{{ target.namespace }}</dd></div><div><dt>{{ t('system.messages.key') }}</dt><dd>{{ target.messageKey }}</dd></div><div><dt>{{ t('system.common.version') }}</dt><dd>{{ action === 'translation' ? targetTranslation?.version ?? '—' : target.version }}</dd></div></dl>
      <form v-if="action && action !== 'detail'" class="system-page__form" @submit.prevent="submit"><template v-if="action === 'create' || action === 'edit'"><label v-if="action === 'create'">{{ t('system.messages.key') }} *<MomInput v-model="form.messageKey" :max-length="160" :disabled="saving" /><small>{{ t('system.messages.keyHint') }}</small></label><label>{{ t('system.common.description') }}<MomTextarea v-model="form.description" :maxlength="1000" :disabled="saving" /></label><label v-if="action === 'create'" class="system-page__check"><MomCheckbox v-model="form.enabled" :disabled="saving" />{{ t('system.common.enabled') }}</label></template><label v-else-if="action === 'translation'">{{ targetTranslation?.localeCode }} · {{ t('system.messages.text') }} *<MomTextarea v-model="form.messageText" class="system-page__textarea" :maxlength="4096" :disabled="saving" /><small>{{ t('system.messages.textHint') }}</small></label><p v-else>{{ t('system.common.statusHint') }}</p><div class="system-page__footer"><MomButton variant="outline" :disabled="saving" @click="close">{{ t('system.common.cancel') }}</MomButton><MomButton type="submit" :disabled="saving || blocked">{{ t('system.common.save') }}</MomButton></div></form><div v-else class="system-page__footer"><MomButton variant="outline" @click="close">{{ t('system.common.close') }}</MomButton></div>
    </MomModal>
  </section></PageContainer>
</template>
