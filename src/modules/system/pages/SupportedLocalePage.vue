<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { Plus, RefreshCw } from '@lucide/vue';
import { AuthorityGuard } from '../../auth';
import { MomButton, MomCheckbox, MomInput, MomNumberInput } from '../../../shared/ui';
import MomManagementHeader from '../../../shared/components/MomManagementHeader.vue';
import MomListSurface from '../../../shared/components/MomListSurface.vue';
import MomDataTable, { type MomColumn } from '../../../shared/components/MomDataTable.vue';
import MomCrudSearch from '../../../shared/components/MomCrudSearch.vue';
import MomCrudPagination from '../../../shared/components/MomCrudPagination.vue';
import MomCrudRowMenu from '../../../shared/components/MomCrudRowMenu.vue';
import MomModal from '../../../shared/components/MomModal.vue';
import PageContainer from '../../../shared/components/PageContainer.vue';
import { useLocale } from '../../../shared/i18n/locale';
import { formatInstant } from '../../../shared/formatters';
import { systemApi, type SupportedLocale } from '../api/system-api';
import { systemFeedback, validDisplayText, validLocaleCode, validSortOrder, type SystemFeedback } from '../model/system-feedback';
import { useSystemList } from '../model/use-system-list';
import './system-pages.css';

type Action = 'create' | 'edit' | 'detail' | 'status' | 'default';
const { t, locale } = useLocale();
const list = useSystemList(systemApi.listLocales);
const action = ref<Action | null>(null);
const target = ref<SupportedLocale | null>(null);
const saving = ref(false);
const blocked = ref(false);
const feedback = ref<SystemFeedback | null>(null);
const notice = ref(false);
const search = ref('');
const pageNo = ref(1);
const pageSize = ref(20);
const form = reactive({ localeCode: '', displayName: '', nativeName: '', sortOrder: 0, enabled: true });
const filtered = computed(() => list.rows.value.filter(row => `${row.localeCode} ${row.displayName} ${row.nativeName}`.toLowerCase().includes(search.value.trim().toLowerCase())));
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)));
const visible = computed(() => filtered.value.slice((pageNo.value - 1) * pageSize.value, pageNo.value * pageSize.value));
const columns = computed<MomColumn[]>(() => [
  { key: 'localeCode', title: t('system.locales.code'), minWidth: 130 },
  { key: 'displayName', title: t('system.locales.displayName'), minWidth: 170 },
  { key: 'nativeName', title: t('system.locales.nativeName'), minWidth: 170 },
  { key: 'sortOrder', title: t('system.common.sort'), width: 100 },
  { key: 'enabled', title: t('system.common.status'), width: 110 },
  { key: 'defaultLocale', title: t('system.locales.default'), width: 110 },
  { key: 'updatedAt', title: t('system.common.updatedAt'), minWidth: 190 },
  { key: 'actions', title: t('system.common.actions'), width: 210, fixed: 'right', resizable: false },
]);
watch([search, pageSize], () => { pageNo.value = 1; });
watch(pages, value => { if (pageNo.value > value) pageNo.value = value; });

async function reload(): Promise<void> {
  const ok = await list.reload();
  if (ok) {
    blocked.value = false;
    feedback.value = null;
    if (target.value) target.value = list.rows.value.find(row => row.id === target.value?.id) ?? null;
  }
}
function open(next: Action, row?: SupportedLocale): void {
  if (saving.value || blocked.value) return;
  if (next === 'status' && row?.defaultLocale && row.enabled) {
    feedback.value = { key: 'system.locales.cannotDisableDefault' }; return;
  }
  notice.value = false; action.value = next;
  target.value = row ?? null;
  feedback.value = null;
  Object.assign(form, { localeCode: row?.localeCode ?? '', displayName: row?.displayName ?? '',
    nativeName: row?.nativeName ?? '', sortOrder: row?.sortOrder ?? 0, enabled: row?.enabled ?? true });
}
function close(): void { if (!saving.value) { action.value = null; feedback.value = null; } }
async function submit(): Promise<void> {
  if (!action.value || saving.value || blocked.value || action.value === 'detail') return;
  if (action.value !== 'create' && !target.value) { feedback.value = { key: 'system.feedback.notFound' }; blocked.value = true; return; }
  if ((action.value === 'create' || action.value === 'edit') &&
    (!validDisplayText(form.displayName, 100) || !validDisplayText(form.nativeName, 100) || !validSortOrder(Number(form.sortOrder)) ||
      (action.value === 'create' && !validLocaleCode(form.localeCode)))) {
    feedback.value = { key: 'system.common.required' }; return;
  }
  saving.value = true; feedback.value = null;
  try {
    if (action.value === 'create') await systemApi.createLocale({ localeCode: form.localeCode.trim(), displayName: form.displayName.trim(), nativeName: form.nativeName.trim(), enabled: form.enabled, sortOrder: Number(form.sortOrder) });
    else if (action.value === 'edit' && target.value) await systemApi.updateLocale(target.value.id, { displayName: form.displayName.trim(), nativeName: form.nativeName.trim(), sortOrder: Number(form.sortOrder), version: target.value.version });
    else if (action.value === 'status' && target.value) await systemApi.setLocaleStatus(target.value, !target.value.enabled);
    else if (action.value === 'default' && target.value) await systemApi.makeDefaultLocale(target.value);
    action.value = null; notice.value = true;
    if (await list.reload()) { pageNo.value = 1; blocked.value = false; }
  } catch (cause) {
    feedback.value = systemFeedback(cause, true);
    blocked.value = feedback.value.key === 'system.feedback.conflict' || feedback.value.key === 'system.feedback.unknown';
  } finally { saving.value = false; }
}
onMounted(reload);
onBeforeRouteLeave(() => !saving.value);
</script>

<template>
  <PageContainer><section class="system-page" aria-labelledby="system-locales-title">
    <MomManagementHeader title-id="system-locales-title" :title="t('system.locales.title')" :description="t('system.locales.description')">
      <template #actions>
        <MomButton class="mom-management-button--secondary" variant="outline" round :disabled="list.loading.value || saving" @click="reload"><RefreshCw :size="16" aria-hidden="true" />{{ t('system.common.refresh') }}</MomButton>
        <AuthorityGuard :authorities="['system:i18n:write']"><MomButton round :disabled="saving || blocked" @click="open('create')"><Plus :size="16" aria-hidden="true" />{{ t('system.common.create') }}</MomButton></AuthorityGuard>
      </template>
    </MomManagementHeader>
    <p class="system-page__hint">{{ t('system.locales.defaultHint') }}</p>
    <p v-if="notice" class="system-page__notice" role="status">{{ t('system.common.saved') }}</p>
    <div v-if="feedback && !action" class="system-page__error" role="alert"><p>{{ t(feedback.key) }}</p><small v-if="feedback.correlationId">{{ feedback.correlationId }}</small><MomButton variant="outline" @click="reload">{{ t('system.common.refresh') }}</MomButton></div>
    <div v-if="list.error.value" class="system-page__error" role="alert"><p>{{ t(list.error.value.key) }}</p><small v-if="list.error.value.correlationId">{{ list.error.value.correlationId }}</small><MomButton variant="outline" @click="reload">{{ t('system.common.refresh') }}</MomButton></div>
    <MomListSurface :title="t('system.locales.directory')" :hint="t('system.common.scope')" :loading="list.loading.value" :loading-text="t('system.common.loading')">
      <template #toolbar><div class="mom-management-tools"><MomCrudSearch v-model="search" :label="t('system.common.search')" :disabled="list.loading.value" /><span class="mom-management-count">{{ t('system.common.count', { total: list.rows.value.length, visible: filtered.length }) }}</span></div></template>
      <MomDataTable class="system-page__table--wide" :rows="visible" :columns="columns" :empty-text="t('system.common.empty')">
        <template #cell-localeCode="{ row }"><span class="system-page__code">{{ row.localeCode }}</span></template>
        <template #cell-enabled="{ row }"><span class="mom-management-status" :class="row.enabled ? 'mom-management-status--enabled' : 'mom-management-status--disabled'"><span class="mom-management-status__dot" aria-hidden="true"></span>{{ t(row.enabled ? 'system.common.enabled' : 'system.common.disabled') }}</span></template>
        <template #cell-defaultLocale="{ row }">{{ row.defaultLocale ? t('system.locales.default') : '—' }}</template>
        <template #cell-updatedAt="{ row }">{{ formatInstant(row.updatedAt, { locale }) }}</template>
        <template #cell-actions="{ row }"><div class="system-page__row-actions"><MomButton mode="text" :disabled="saving" @click="open('detail', row)">{{ t('system.common.detail') }}</MomButton><AuthorityGuard :authorities="['system:i18n:write']"><MomButton mode="text" :disabled="saving || blocked" @click="open('edit', row)">{{ t('system.common.edit') }}</MomButton><MomCrudRowMenu v-if="!row.defaultLocale" :label="t('system.common.more')" :disabled="saving || blocked" :actions="row.enabled ? [{ key: 'default', label: t('system.locales.makeDefault') }, { key: 'status', label: t('system.common.disable'), danger: true }] : [{ key: 'status', label: t('system.common.enable') }]" @select="open($event === 'default' ? 'default' : 'status', row)" /></AuthorityGuard></div></template>
      </MomDataTable>
      <template #footer><MomCrudPagination :page-no="pageNo" :page-size="pageSize" :total="filtered.length" :summary="t('system.common.page', { current: pageNo, pages })" :page-size-label="t('system.common.pageSize')" :previous-label="t('system.common.previous')" :next-label="t('system.common.next')" :jump-label="t('system.common.jump')" :go-label="t('system.common.go')" :disabled="list.loading.value || saving" @page="pageNo = $event" @size="pageSize = $event" /></template>
    </MomListSurface>
    <MomModal :open="!!action" :title="t(action === 'create' ? 'system.common.create' : action === 'edit' ? 'system.common.edit' : action === 'detail' ? 'system.common.detail' : 'system.common.confirm')" :close-label="t('system.common.close')" :busy="saving" :busy-text="t('system.common.saving')" @close="close">
      <div v-if="feedback" class="system-page__error" role="alert"><p>{{ t(feedback.key) }}</p><small v-if="feedback.correlationId">{{ feedback.correlationId }}</small><MomButton v-if="blocked" variant="outline" :disabled="saving" @click="reload">{{ t('system.common.refresh') }}</MomButton></div>
      <dl v-if="target" class="system-page__summary"><div><dt>{{ t('system.locales.code') }}</dt><dd>{{ target.localeCode }}</dd></div><div><dt>{{ t('system.common.status') }}</dt><dd>{{ t(target.enabled ? 'system.common.enabled' : 'system.common.disabled') }}</dd></div><div><dt>{{ t('system.common.version') }}</dt><dd>{{ target.version }}</dd></div></dl>
      <form v-if="action && action !== 'detail'" class="system-page__form" @submit.prevent="submit">
        <template v-if="action === 'create' || action === 'edit'"><label v-if="action === 'create'">{{ t('system.locales.code') }} *<MomInput v-model="form.localeCode" :disabled="saving" :max-length="35" /></label><label>{{ t('system.locales.displayName') }} *<MomInput v-model="form.displayName" :disabled="saving" :max-length="100" /></label><label>{{ t('system.locales.nativeName') }} *<MomInput v-model="form.nativeName" :disabled="saving" :max-length="100" /></label><label>{{ t('system.common.sort') }}<MomNumberInput v-model="form.sortOrder" :min="0" :max="1000000" :disabled="saving" /></label><label v-if="action === 'create'" class="system-page__check"><MomCheckbox v-model="form.enabled" :disabled="saving" />{{ t('system.common.enabled') }}</label></template>
        <p v-else>{{ t(action === 'default' ? 'system.locales.defaultWarning' : 'system.common.statusHint') }}</p>
        <div class="system-page__footer"><MomButton variant="outline" :disabled="saving" @click="close">{{ t('system.common.cancel') }}</MomButton><MomButton type="submit" :disabled="saving || blocked || !target && action !== 'create'">{{ t('system.common.save') }}</MomButton></div>
      </form><div v-else class="system-page__footer"><MomButton variant="outline" @click="close">{{ t('system.common.close') }}</MomButton></div>
    </MomModal>
  </section></PageContainer>
</template>
