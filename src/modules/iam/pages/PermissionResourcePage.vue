<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { MomButton, MomInput, MomLoading, MomNumberInput, MomTextarea } from '../../../shared/ui';
import { ChevronLeft, ChevronRight, RefreshCw } from '@lucide/vue';
import PageContainer from '../../../shared/components/PageContainer.vue';
import MomCrudRowMenu from '../../../shared/components/MomCrudRowMenu.vue';
import MomModal from '../../../shared/components/MomModal.vue';
import MomManagementHeader from '../../../shared/components/MomManagementHeader.vue';
import { useLocale } from '../../../shared/i18n/locale';
import { AuthorityGuard } from '../../auth';
import * as api from '../api/permission-resources-api';
import { permissionFeedback, type PermissionFeedback } from '../model/permission-feedback';
import PermissionManagementPage from './PermissionManagementPage.vue';
import './permission-management.css';

type Action = 'detail' | 'create' | 'edit' | 'status' | 'delete';
const { t } = useLocale();
const rows = ref<api.PermissionResourceResponse[]>([]);
const pageNo = ref(1);
const pageSize = ref(20);
const total = ref(0);
const loading = ref(false);
const saving = ref(false);
const error = ref<PermissionFeedback>();
const dialogError = ref<PermissionFeedback>();
const action = ref<Action>();
const target = ref<api.PermissionResourceResponse>();
const selectedResource = ref<api.PermissionResourceResponse>();
const resourceSearchDraft = ref('');
const resourceKeyword = ref('');
const blocked = ref(false);
const form = reactive({ domainCode: '', resourceCode: '', name: '', description: '', sortOrder: 0 });
let controller: AbortController | undefined;
let sequence = 0;
let searchTimer: ReturnType<typeof setTimeout> | undefined;
const pages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));
const selectedOutsidePage = computed(() => !!selectedResource.value && !rows.value.some((item) => item.id === selectedResource.value?.id));
const title = computed(() => t(`iam.resources.${action.value ?? 'title'}` as 'iam.resources.title'));

async function loadPage(nextPage = pageNo.value, nextSize = pageSize.value): Promise<void> {
  const current = ++sequence;
  controller?.abort();
  controller = new AbortController();
  loading.value = true;
  error.value = undefined;
  try {
    const result = await api.searchResources(nextPage, nextSize,
      { keyword: resourceKeyword.value || undefined }, controller.signal);
    if (current !== sequence) return;
    if (nextPage > 1 && result.records.length === 0) { await loadPage(Math.max(1, nextPage - 1), nextSize); return; }
    rows.value = result.records;
    const refreshedSelection = result.records.find((item) => item.id === selectedResource.value?.id);
    if (refreshedSelection) selectedResource.value = refreshedSelection;
    else if (!selectedResource.value) selectedResource.value = result.records[0];
    pageNo.value = result.pageNo;
    pageSize.value = nextSize;
    total.value = result.total;
    blocked.value = false;
  } catch (cause) {
    if (current === sequence) error.value = permissionFeedback(cause);
  } finally {
    if (current === sequence) loading.value = false;
  }
}

async function open(next: Action, row?: api.PermissionResourceResponse): Promise<void> {
  if (saving.value || blocked.value) return;
  action.value = next;
  target.value = row;
  dialogError.value = undefined;
  Object.assign(form, { domainCode: row?.domainCode ?? '', resourceCode: row?.resourceCode ?? '',
    name: row?.name ?? '', description: row?.description ?? '', sortOrder: row?.sortOrder ?? 0 });
  if (row) {
    try { target.value = await api.getResource(row.id); }
    catch (cause) { dialogError.value = permissionFeedback(cause); }
  }
}

function close(): void { if (!saving.value) action.value = undefined; }

function openPermissions(row: api.PermissionResourceResponse): void {
  selectedResource.value = row;
}

function searchResources(keyword: string): void {
  resourceSearchDraft.value = keyword;
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { resourceKeyword.value = keyword.trim(); void loadPage(1); }, 300);
}

async function submit(): Promise<void> {
  if (!action.value || action.value === 'detail' || saving.value || dialogError.value) return;
  if (['create', 'edit'].includes(action.value) && (!form.name.trim() || form.name.length > 200 || form.description.length > 1000 || form.sortOrder < 0)) {
    dialogError.value = { key: 'iam.permissions.invalidFields' }; return;
  }
  if (action.value === 'create' && (!/^[A-Z][A-Z0-9_-]{0,31}$/.test(form.domainCode) || !/^[A-Z][A-Z0-9_-]{0,63}$/.test(form.resourceCode))) {
    dialogError.value = { key: 'iam.permissions.invalidCode' }; return;
  }
  saving.value = true;
  const currentAction = action.value;
  let changedResource: api.PermissionResourceResponse | undefined;
  try {
    if (currentAction === 'create') changedResource = await api.createResource({ ...form, description: form.description || null, enabled: true });
    else if (target.value) {
      if (currentAction === 'edit') changedResource = await api.updateResource(target.value.id, { name: form.name, description: form.description || null,
        sortOrder: form.sortOrder, enabled: target.value.enabled, version: target.value.version });
      if (currentAction === 'status') changedResource = await api.setResourceEnabled(target.value.id, !target.value.enabled, target.value.version);
      if (currentAction === 'delete') {
        await api.deleteResource(target.value.id);
        if (selectedResource.value?.id === target.value.id) selectedResource.value = undefined;
      }
    }
    action.value = undefined;
    if (changedResource && currentAction === 'create') {
      resourceKeyword.value = changedResource.resourceCode;
      resourceSearchDraft.value = changedResource.resourceCode;
    }
    if (changedResource && selectedResource.value?.id === changedResource.id) selectedResource.value = changedResource;
    await loadPage(currentAction === 'create' ? 1 : pageNo.value);
    if (changedResource && currentAction === 'create') selectedResource.value = changedResource;
  } catch (cause) {
    dialogError.value = permissionFeedback(cause, true);
    if (dialogError.value.key === 'iam.permissions.unknownWrite') blocked.value = true;
  } finally { saving.value = false; }
}

onMounted(() => void loadPage());
onBeforeRouteLeave(() => !saving.value);
onUnmounted(() => { controller?.abort(); if (searchTimer) clearTimeout(searchTimer); });
</script>

<template>
  <PageContainer>
    <section class="iam-permissions" aria-labelledby="resources-title">
      <MomManagementHeader title-id="resources-title" :title="t('iam.permissions.title')" :description="t('iam.resources.description')">
        <template #actions>
          <MomButton class="mom-management-button mom-management-button--secondary" type="button" round :disabled="loading || saving" @click="loadPage()">{{ t('iam.permissions.refresh') }}</MomButton>
          <AuthorityGuard :authorities="['auth:permission:write']"><MomButton class="mom-management-button mom-management-button--primary" type="button" round :disabled="saving || blocked" @click="open('create')">{{ t('iam.resources.create') }}</MomButton></AuthorityGuard>
        </template>
      </MomManagementHeader>
      <div class="iam-permission-workspace">
        <aside class="iam-permission-workspace__rail" :aria-label="t('iam.resources.directory')" :aria-busy="loading">
          <div class="iam-permission-workspace__rail-head">
            <div><strong>{{ t('iam.resources.directory') }}</strong><small>{{ t('iam.resources.count', { total }) }}</small></div>
            <MomButton class="iam-permission-workspace__refresh" type="button" :aria-label="t('iam.permissions.refresh')" :disabled="loading || saving" @click="loadPage()"><RefreshCw :size="16" aria-hidden="true" /></MomButton>
          </div>
          <MomInput class="iam-permission-workspace__search" type="search" :model-value="resourceSearchDraft"
            :placeholder="t('iam.resources.search')" :aria-label="t('iam.resources.search')" :disabled="loading" @update:model-value="searchResources(String($event))" />
          <p v-if="selectedOutsidePage" class="iam-permission-workspace__current" role="status">{{ t('iam.resources.currentOutsidePage', { name: selectedResource?.name ?? '' }) }}</p>
          <p v-if="error" class="iam-permission-feedback" role="alert">{{ t(error.key) }}</p>
          <div v-else class="iam-permission-workspace__resource-list">
            <p v-if="!rows.length && !loading" class="iam-permission-workspace__empty">{{ t(resourceKeyword ? 'iam.resources.noMatches' : 'iam.resources.empty') }}</p>
            <MomButton v-for="row in rows" :key="row.id" class="iam-permission-workspace__resource"
              :class="{ 'iam-permission-workspace__resource--active': selectedResource?.id === row.id }"
              type="button" :title="`${row.name} · ${row.domainCode} / ${row.resourceCode}`" :aria-pressed="selectedResource?.id === row.id" :disabled="loading" @click="openPermissions(row)">
              <span class="iam-permission-workspace__resource-name">{{ row.name }}</span>
              <span class="iam-permission-workspace__resource-code">{{ row.domainCode }} / {{ row.resourceCode }}</span>
              <span class="iam-permission-workspace__resource-state" :class="{ 'iam-permission-workspace__resource-state--disabled': !row.enabled }">
                <span class="iam-permission-status__dot" aria-hidden="true"></span>{{ t(row.enabled ? 'iam.permissions.enabled' : 'iam.permissions.disabled') }}
              </span>
            </MomButton>
          </div>
          <div class="iam-permission-workspace__rail-footer">
            <span>{{ t('iam.resources.pageCount', { current: pageNo, pages }) }}</span>
            <div>
              <MomButton type="button" :aria-label="t('iam.permissions.previousPage')" :disabled="loading || pageNo <= 1" @click="loadPage(pageNo - 1)"><ChevronLeft :size="16" aria-hidden="true" /></MomButton>
              <MomButton type="button" :aria-label="t('iam.permissions.nextPage')" :disabled="loading || pageNo >= pages" @click="loadPage(pageNo + 1)"><ChevronRight :size="16" aria-hidden="true" /></MomButton>
            </div>
          </div>
          <MomLoading class="iam-permissions__loading" :model-value="loading" :text="t('iam.permissions.loadingList')" />
        </aside>
        <div class="iam-permission-workspace__detail">
          <PermissionManagementPage v-if="selectedResource" :key="selectedResource.id" :resource="selectedResource">
            <template #resourceActions>
              <MomButton class="iam-permission-button iam-permission-button--secondary" type="button" round @click="open('detail', selectedResource)">{{ t('iam.resources.detail') }}</MomButton>
              <AuthorityGuard :authorities="['auth:permission:write']">
                <MomButton class="iam-permission-button iam-permission-button--secondary" type="button" round :disabled="blocked" @click="open('edit', selectedResource)">{{ t('iam.resources.edit') }}</MomButton>
                <MomCrudRowMenu :label="t('iam.permissions.moreActions')" :disabled="blocked"
                  :actions="[{ key: 'status', label: t(selectedResource.enabled ? 'iam.permissions.disable' : 'iam.permissions.enable') }, { key: 'delete', label: t('iam.resources.delete'), danger: true }]"
                  @select="open($event === 'delete' ? 'delete' : 'status', selectedResource)" />
              </AuthorityGuard>
            </template>
          </PermissionManagementPage>
          <div v-else class="iam-permission-workspace__welcome">
            <strong>{{ t('iam.resources.selectTitle') }}</strong>
            <p>{{ t('iam.resources.selectHint') }}</p>
          </div>
        </div>
      </div>
      <MomModal :open="!!action" :title="title" :close-label="t('iam.permissions.close')" :busy="saving" :busy-text="t('iam.permissions.saving')" :width="640" @close="close">
        <div class="iam-permission-dialog__body">
          <p v-if="dialogError" class="iam-permission-feedback" role="alert">{{ t(dialogError.key) }}</p>
          <dl v-if="target" class="iam-permission-summary">
            <div><dt>{{ t('iam.permissions.domain') }}</dt><dd>{{ target.domainCode }}</dd></div>
            <div><dt>{{ t('iam.resources.code') }}</dt><dd>{{ target.resourceCode }}</dd></div>
            <div><dt>{{ t('iam.permissions.name') }}</dt><dd>{{ target.name }}</dd></div>
            <div><dt>{{ t('iam.permissions.status') }}</dt><dd>{{ t(target.enabled ? 'iam.permissions.enabled' : 'iam.permissions.disabled') }}</dd></div>
          </dl>
          <form v-if="action && action !== 'detail'" class="iam-permission-form" @submit.prevent="submit">
            <template v-if="action === 'create' || action === 'edit'">
              <label v-if="action === 'create'"><span>{{ t('iam.permissions.domain') }} *</span><MomInput v-model="form.domainCode" class="iam-permission-input" :disabled="saving" :max-length="32" /></label>
              <label v-if="action === 'create'"><span>{{ t('iam.resources.code') }} *</span><MomInput v-model="form.resourceCode" class="iam-permission-input" :disabled="saving" :max-length="64" /></label>
              <label><span>{{ t('iam.permissions.name') }} *</span><MomInput v-model="form.name" class="iam-permission-input" :disabled="saving" :max-length="200" /></label>
              <label><span>{{ t('iam.permissions.descriptionField') }}</span><MomTextarea v-model="form.description" class="iam-permission-textarea" :disabled="saving" :maxlength="1000" /></label>
              <label><span>{{ t('iam.resources.sort') }}</span><MomNumberInput v-model="form.sortOrder" :min="0" :disabled="saving" /></label>
            </template>
            <p v-if="action === 'delete'" class="iam-permission-warning">{{ t('iam.resources.deleteHint') }}</p>
            <p v-if="action === 'status'" class="iam-permission-warning">{{ t('iam.resources.statusHint') }}</p>
            <div class="iam-permission-footer">
              <MomButton class="iam-permission-button iam-permission-button--secondary" type="button" round :disabled="saving" @click="close">{{ t('iam.permissions.cancel') }}</MomButton>
              <MomButton class="iam-permission-button iam-permission-button--primary" type="submit" round :disabled="saving || !!dialogError">{{ t('iam.permissions.confirm') }}</MomButton>
            </div>
          </form>
          <div v-else class="iam-permission-footer"><MomButton class="iam-permission-button iam-permission-button--secondary" type="button" round @click="close">{{ t('iam.permissions.close') }}</MomButton></div>
        </div>
      </MomModal>
    </section>
  </PageContainer>
</template>
