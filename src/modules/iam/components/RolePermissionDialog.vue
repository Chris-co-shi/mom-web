<script setup lang="ts">
import { ref, watch } from 'vue';
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Folder, Search } from '@lucide/vue';
import { MomButton, MomCheckbox, MomInput, MomLoading, MomSelect } from '../../../shared/ui';
import MomModal from '../../../shared/components/MomModal.vue';
import { focusAfterRender } from '../../../shared/ui/focus';
import { useLocale } from '../../../shared/i18n/locale';
import type { useRolePermissionAssignment } from '../model/use-role-permission-assignment';
import './role-permission-dialog.css';

const props = defineProps<{ assignment: ReturnType<typeof useRolePermissionAssignment> }>();
const emit = defineEmits<{ saved: [] }>();
const { t } = useLocale();
const m = props.assignment;
const detailVisible = ref(false);
const searchMode = ref(false);
const root = ref<HTMLElement | null>(null);
const discardOpen = ref(false);
watch(m.opened, () => { detailVisible.value = false; discardOpen.value = false; searchMode.value = false; });
function close(): void {
  if (m.saving.value) return;
  if (m.stage.value !== 'unknown' && (m.added.value.length || m.removed.value.length)) discardOpen.value = true;
  else m.close();
}
function selectResource(id: string): void {
  searchMode.value = false;
  detailVisible.value = true;
  void m.setResource(id);
  void focusAfterRender(root.value, '.iam-grants__detail-title');
}
function searchAcrossResources(): void {
  searchMode.value = true;
  detailVisible.value = true;
  void m.setResource('');
  void focusAfterRender(root.value, '.iam-grants__permission-search');
}
function backToDirectory(): void {
  detailVisible.value = false;
  const selected = '.iam-grants__resource[aria-pressed="true"]';
  void focusAfterRender(root.value, root.value?.querySelector(selected) ? selected : '.iam-grants__resource-search');
}
function selectedCount(id: string): number { return m.selected.value.filter(item => item.resourceId === id).length; }
function changed(id: string): boolean { return [...m.added.value, ...m.removed.value].some(item => item.resourceId === id); }
async function confirm(): Promise<void> { if (await m.submit()) emit('saved'); }
</script>

<template>
  <MomModal :open="m.opened.value" :title="t('iam.grants.title')" :close-label="t('iam.grants.close')"
    :busy="m.saving.value" :busy-text="t('iam.grants.saving')" :width="1120" @close="close">
    <div ref="root" class="iam-grants" :aria-busy="m.loading.value">
      <div v-if="m.target.value" class="iam-grants__role">
        <div><strong>{{ m.target.value.name }}</strong><code>{{ m.target.value.code }}</code></div>
        <MomButton v-if="m.stage.value === 'select'" variant="ghost" :disabled="m.loading.value" @click="searchAcrossResources"><Search :size="16" aria-hidden="true" />{{ t('iam.grants.allResources') }}</MomButton>
      </div>
      <div v-if="m.error.value" class="iam-role-feedback" role="alert">
        <p>{{ t(m.error.value.key) }}</p><small>{{ m.error.value.correlationId }}</small>
        <MomButton variant="outline" :disabled="m.loading.value" @click="m.reconcile()">{{ t('iam.grants.readLatest') }}</MomButton>
      </div>
      <p v-if="m.notice.value" role="status">{{ t(m.notice.value.key) }}</p>
      <template v-if="m.stage.value === 'select'">
        <div class="iam-grants__workspace" :class="{ 'iam-grants__workspace--detail': detailVisible }">
          <section class="iam-grants__directory" :aria-label="t('iam.resources.directory')">
            <div class="iam-grants__section-head"><strong>{{ t('iam.resources.directory') }}</strong><small>{{ t('iam.resources.count', { total: m.resourceTotal.value }) }}</small></div>
            <form class="iam-grants__directory-query" @submit.prevent="m.loadResources(1)">
              <div class="iam-grants__search-field"><Search :size="16" aria-hidden="true" /><MomInput v-model="m.resourceQuery.value" class="iam-grants__resource-search" type="search" :placeholder="t('iam.resources.search')" :aria-label="t('iam.resources.search')" :disabled="m.loading.value" /></div>
              <div class="iam-grants__filter-row">
                <MomInput v-model="m.resourceDomain.value" :placeholder="t('iam.permissions.domain')" :aria-label="t('iam.permissions.domain')" :disabled="m.loading.value || m.resourceLoading.value" />
                <MomButton type="submit" variant="outline" :disabled="m.loading.value || m.resourceLoading.value">{{ t('iam.grants.queryResources') }}</MomButton>
              </div>
            </form>
            <p v-if="m.resourceError.value" class="iam-grants__error" role="alert">{{ t(m.resourceError.value.key) }}<MomButton variant="outline" :disabled="m.resourceLoading.value" @click="m.loadResources(m.resourcePage.value)">{{ t('iam.grants.readLatest') }}</MomButton></p>
            <div class="iam-grants__resource-list" :aria-busy="m.resourceLoading.value">
              <MomButton v-for="resource in m.resources.value" :key="resource.id" variant="ghost"
                class="iam-grants__resource" :aria-pressed="m.resourceId.value === resource.id"
                :disabled="m.loading.value || m.resourceLoading.value" @click="selectResource(resource.id)">
                <span class="iam-grants__resource-icon" aria-hidden="true"><Folder :size="18" /></span>
                <span class="iam-grants__resource-copy"><strong>{{ resource.name }}</strong><small>{{ resource.domainCode }} · {{ resource.resourceCode }}</small></span>
                <span class="iam-grants__resource-meta"><small>{{ t('iam.grants.selected') }} {{ selectedCount(resource.id) }}</small><small v-if="changed(resource.id)" class="iam-grants__changed">{{ t('iam.grants.changed') }}</small></span>
                <ChevronRight :size="14" aria-hidden="true" />
              </MomButton>
              <p v-if="!m.resourceLoading.value && !m.resourceError.value && !m.resources.value.length">{{ t('iam.resources.empty') }}</p>
              <MomLoading :model-value="m.resourceLoading.value" :text="t('iam.grants.loadingCatalog')" />
            </div>
            <div class="iam-grants__paging">
              <label class="iam-grants__page-size">{{ t('iam.roles.pageSize') }}<MomSelect :model-value="m.resourcePageSize.value" :options="[8, 16, 24].map(value => ({ label: String(value), value }))" :aria-label="t('iam.roles.pageSize')" :disabled="m.loading.value || m.resourceLoading.value" @change="m.setResourcePageSize(Number($event.value))" /></label>
              <div class="iam-grants__page-controls">
                <span :aria-label="t('iam.resources.pageCount', { current: m.resourcePage.value, pages: m.resourcePages.value })">{{ m.resourcePage.value }} / {{ m.resourcePages.value }}</span>
                <MomButton variant="outline" size="icon" :aria-label="t('iam.roles.previousPage')" :disabled="m.loading.value || m.resourceLoading.value || m.resourcePage.value <= 1" @click="m.loadResources(m.resourcePage.value - 1)"><ChevronLeft :size="16" aria-hidden="true" /></MomButton>
                <MomButton variant="outline" size="icon" :aria-label="t('iam.roles.nextPage')" :disabled="m.loading.value || m.resourceLoading.value || m.resourcePage.value >= m.resourcePages.value" @click="m.loadResources(m.resourcePage.value + 1)"><ChevronRight :size="16" aria-hidden="true" /></MomButton>
              </div>
            </div>
          </section>
          <section class="iam-grants__actions" :aria-label="t('iam.grants.catalog')">
            <MomButton class="iam-grants__back" variant="outline" @click="backToDirectory"><ArrowLeft :size="16" aria-hidden="true" />{{ t('iam.grants.backDirectory') }}</MomButton>
            <header class="iam-grants__detail-heading">
              <h3 class="iam-grants__detail-title" tabindex="-1">{{ searchMode ? t('iam.grants.allResources') : m.currentResource.value?.name || t('iam.grants.catalog') }}</h3>
              <code v-if="m.currentResource.value">{{ m.currentResource.value.domainCode }} · {{ m.currentResource.value.resourceCode }}</code>
              <p v-if="m.currentResource.value?.description" class="iam-grants__hint">{{ m.currentResource.value.description }}</p>
            </header>
            <MomInput v-if="searchMode" v-model="m.searchQuery.value" class="iam-grants__permission-search" type="search" :placeholder="t('iam.grants.searchCurrentPage')" :aria-label="t('iam.grants.searchCurrentPage')" :disabled="m.loading.value" />
            <p v-if="m.catalogError.value" role="alert">{{ t(m.catalogError.value.key) }}<MomButton variant="outline" @click="m.loadCatalog(m.pageNo.value)">{{ t('iam.grants.readLatest') }}</MomButton></p>
            <div class="iam-grants__catalog" :aria-busy="m.catalogLoading.value">
              <p v-if="!m.hasCatalogScope.value" class="iam-grants__empty">{{ t('iam.grants.chooseScope') }}</p>
              <p v-else-if="!m.catalogLoading.value && !m.catalogError.value && !m.catalog.value.length" class="iam-grants__empty">{{ t('iam.grants.emptyPage') }}</p>
              <div v-for="domain in m.groupedCatalog.value" :key="domain.domain">
                <div v-for="resource in domain.resources" :key="resource.id" class="iam-grants__resource-group">
                  <h4 v-if="searchMode">{{ domain.domain }} · {{ resource.name }}</h4>
                  <label v-for="item in resource.permissions" :key="item.id" class="iam-grants__option">
                    <MomCheckbox :model-value="m.selectedIds.value.includes(item.id)"
                      :disabled="m.loading.value || m.catalogLoading.value || (!item.enabled && !m.selectedIds.value.includes(item.id))"
                      :aria-label="t('iam.grants.selectLabel', { code: item.name })" @change="m.toggle(item)" />
                    <span><strong>{{ item.name }}</strong><small>{{ item.description || item.actionCode }}</small><code>{{ item.code }}</code><small v-if="!item.enabled">{{ t('iam.grants.disabledItem') }}</small></span>
                  </label>
                </div>
              </div>
              <MomLoading :model-value="m.catalogLoading.value" :text="t('iam.grants.loadingCatalog')" />
            </div>
            <div v-if="m.hasCatalogScope.value && !m.catalogError.value && m.pageCount.value > 1" class="iam-grants__paging">
              <span>{{ t('iam.grants.pageCount', { current: m.pageNo.value, pages: m.pageCount.value, total: m.total.value }) }}</span>
              <MomButton variant="outline" :disabled="m.catalogLoading.value || m.pageNo.value <= 1" @click="m.loadCatalog(m.pageNo.value - 1)">{{ t('iam.roles.previousPage') }}</MomButton>
              <MomButton variant="outline" :disabled="m.catalogLoading.value || m.pageNo.value >= m.pageCount.value" @click="m.loadCatalog(m.pageNo.value + 1)">{{ t('iam.roles.nextPage') }}</MomButton>
            </div>
            <p class="iam-grants__retention"><Check :size="16" aria-hidden="true" />{{ t('iam.grants.replaceHint') }}</p>
          </section>
        </div>
        <details v-if="m.invalidSelection.value"><summary>{{ t('iam.grants.disabledSelected') }}</summary>
          <div v-for="item in m.selected.value.filter(item => !item.enabled)" :key="item.id">{{ item.name }}
            <MomButton variant="ghost" @click="m.toggle(item)">{{ t('iam.grants.remove') }}</MomButton>
          </div>
        </details>
      </template>
      <div v-else-if="m.stage.value === 'review'" class="iam-grants__diff">
        <section><h3>{{ t('iam.grants.added', { count: m.added.value.length }) }}</h3><div v-for="item in m.added.value" :key="item.id"><strong>{{ item.name }}</strong><span>{{ item.resourceName }} · {{ item.code }}</span></div></section>
        <section><h3>{{ t('iam.grants.removed', { count: m.removed.value.length }) }}</h3><div v-for="item in m.removed.value" :key="item.id"><strong>{{ item.name }}</strong><span>{{ item.resourceName }} · {{ item.code }}</span></div></section>
        <p class="iam-grants__warning">{{ t('iam.grants.confirmHint') }}</p>
      </div>
      <MomLoading :model-value="m.loading.value" :text="t('iam.grants.loading')" />
    </div>
    <template #footer>
      <div class="iam-grants__summary" role="status"><strong>{{ t('iam.grants.selected') }} <span>{{ m.selectedIds.value.length }}</span> / 200</strong><small>{{ t('iam.grants.added', { count: m.added.value.length }) }} · {{ t('iam.grants.removed', { count: m.removed.value.length }) }}</small></div>
      <MomButton variant="outline" :disabled="m.saving.value" @click="close">{{ t('iam.roles.cancel') }}</MomButton>
      <MomButton v-if="m.stage.value === 'select'" :disabled="!m.canReview.value" @click="m.review">{{ t('iam.grants.review') }}<ArrowRight :size="16" aria-hidden="true" /></MomButton>
      <template v-else-if="m.stage.value === 'review'">
        <MomButton variant="outline" :disabled="m.saving.value || m.loading.value" @click="m.back">{{ t('iam.grants.back') }}</MomButton>
        <MomButton :disabled="m.saving.value || m.loading.value" @click="confirm">{{ t('iam.grants.confirm') }}</MomButton>
      </template>
    </template>
  </MomModal>
  <MomModal :open="discardOpen" :title="t('iam.grants.discardTitle')" :close-label="t('iam.roles.cancel')" @close="discardOpen = false">
    <p>{{ t('iam.grants.discardHint') }}</p>
    <template #footer><MomButton variant="outline" @click="discardOpen = false">{{ t('iam.roles.cancel') }}</MomButton>
      <MomButton variant="destructive" @click="discardOpen = false; m.close()">{{ t('iam.grants.discard') }}</MomButton></template>
  </MomModal>
</template>
