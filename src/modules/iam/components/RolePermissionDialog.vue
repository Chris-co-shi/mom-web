<script setup lang="ts">
import { MomButton, MomCheckbox, MomInput, MomLoading, MomSelect } from '../../../shared/ui';
import MomModal from '../../../shared/components/MomModal.vue';
import { useLocale } from '../../../shared/i18n/locale';
import type { useRolePermissionAssignment } from '../model/use-role-permission-assignment';
import './role-permission-dialog.css';

const props = defineProps<{ assignment: ReturnType<typeof useRolePermissionAssignment> }>();
const emit = defineEmits<{ saved: [] }>();
const { t } = useLocale();
const m = props.assignment;

async function confirm(): Promise<void> {
  if (await m.submit()) emit('saved');
}
</script>

<template>
  <MomModal :open="m.opened.value" :title="t('iam.grants.title')" :close-label="t('iam.grants.close')"
    :busy="m.saving.value" :busy-text="t('iam.grants.saving')" :width="780" @close="m.close">
    <div class="iam-grants" :aria-busy="m.loading.value || m.saving.value">
      <div v-if="m.target.value" class="iam-grants__role">
        <div><small>{{ t('iam.grants.target') }}</small><strong>{{ m.target.value.name }}</strong></div>
        <code>{{ m.target.value.code }}</code>
      </div>

      <div v-if="m.error.value" class="iam-role-feedback" role="alert">
        <p>{{ t(m.error.value.key) }}</p>
        <small v-if="m.error.value.correlationId">{{ t('iam.roles.correlation') }}: {{ m.error.value.correlationId }}</small>
        <MomButton v-if="m.stage.value === 'stale' || m.stage.value === 'unknown' || !m.assigned.value.length && m.loading.value === false"
          class="iam-role-button iam-role-button--secondary" type="button" round :disabled="m.loading.value || m.saving.value" @click="m.reconcile()">{{ t('iam.grants.readLatest') }}</MomButton>
      </div>
      <p v-if="m.notice.value" class="iam-grants__notice" role="status">{{ t(m.notice.value.key) }}</p>

      <template v-if="m.stage.value === 'select'">
        <p class="iam-grants__hint">{{ t('iam.grants.replaceHint') }}</p>
        <section class="iam-grants__section" :aria-label="t('iam.grants.selected')">
          <div class="iam-grants__section-head"><strong>{{ t('iam.grants.selected') }}</strong><span>{{ m.selectedIds.value.length }} / 200</span></div>
          <p v-if="!m.selected.value.length" class="iam-grants__empty">{{ t('iam.grants.noneSelected') }}</p>
          <div v-else class="iam-grants__chips">
            <div v-for="item in m.selected.value" :key="item.id" class="iam-grants__chip">
              <div><strong>{{ item.name }}</strong><small>{{ item.resourceName }} · {{ item.code }}<span v-if="!item.enabled"> · {{ t('iam.grants.disabledItem') }}</span></small></div>
              <MomButton mode="text" type="button" :aria-label="t('iam.grants.removeLabel', { code: item.name })" :disabled="m.loading.value || m.saving.value" @click="m.toggle(item)">{{ t('iam.grants.remove') }}</MomButton>
            </div>
          </div>
        </section>

        <section class="iam-grants__section" :aria-label="t('iam.grants.catalog')">
          <div class="iam-grants__section-head"><strong>{{ t('iam.grants.catalog') }}</strong><span>{{ t('iam.grants.pageScope') }}</span></div>
          <div class="iam-grants__filters">
            <MomSelect :model-value="m.domainCode.value" :options="[{ value: '', label: t('iam.grants.allDomains') }, ...m.domainOptions.value]"
              :placeholder="t('iam.grants.domain')" :aria-label="t('iam.grants.domain')" :disabled="m.loading.value" @update:model-value="m.setDomain(String($event))" />
            <MomSelect :model-value="m.resourceId.value" :options="[{ value: '', label: t('iam.grants.selectResource') }, ...m.resourceOptions.value]"
              :placeholder="t('iam.grants.resource')" :aria-label="t('iam.grants.resource')" :disabled="m.loading.value || !m.domainCode.value" @update:model-value="m.setResource(String($event))" />
          </div>
          <MomInput v-model="m.searchQuery.value" class="iam-grants__search" type="search" :placeholder="t('iam.grants.searchCurrentPage')"
            :aria-label="t('iam.grants.searchCurrentPage')" :disabled="m.loading.value" />
          <p v-if="m.catalogError.value" class="iam-role-feedback" role="alert">{{ t(m.catalogError.value.key) }}</p>
          <div class="iam-grants__catalog" :aria-busy="m.catalogLoading.value">
            <p v-if="!m.hasCatalogScope.value" class="iam-grants__empty">{{ t('iam.grants.chooseScope') }}</p>
            <p v-else-if="!m.visibleCatalog.value.length && !m.catalogLoading.value" class="iam-grants__empty">{{ t('iam.grants.emptyPage') }}</p>
            <div v-for="domain in m.groupedCatalog.value" :key="domain.domain" class="iam-grants__domain-group">
              <h3>{{ t('iam.grants.domainGroup', { domain: domain.domain }) }}</h3>
              <div v-for="resource in domain.resources" :key="resource.id" class="iam-grants__resource-group">
                <h4>{{ t('iam.grants.resourceGroup', { resource: resource.name }) }}</h4>
                <div v-for="item in resource.permissions" :key="item.id" class="iam-grants__option">
                  <MomCheckbox :model-value="m.selectedIds.value.includes(item.id)" :disabled="m.loading.value || m.saving.value || (!item.enabled && !m.selectedIds.value.includes(item.id))"
                    :aria-label="t('iam.grants.selectLabel', { code: item.name })" @change="m.toggle(item)" />
                  <div><strong>{{ item.name }}</strong><small>{{ item.description || item.actionCode }} · {{ item.code }}<span v-if="!item.enabled"> · {{ t('iam.grants.disabledItem') }}</span></small></div>
                </div>
              </div>
            </div>
            <MomLoading class="iam-grants__catalog-loading" :model-value="m.catalogLoading.value" :text="t('iam.grants.loadingCatalog')" role="status" />
          </div>
          <div class="iam-grants__paging">
            <span>{{ t('iam.grants.pageCount', { current: m.pageNo.value, pages: m.pageCount.value, total: m.total.value }) }}</span>
            <div><MomButton type="button" :disabled="m.pageNo.value <= 1 || m.catalogLoading.value || m.loading.value" @click="m.loadCatalog(m.pageNo.value - 1)">{{ t('iam.roles.previousPage') }}</MomButton>
              <MomButton type="button" :disabled="m.pageNo.value >= m.pageCount.value || m.catalogLoading.value || m.loading.value" @click="m.loadCatalog(m.pageNo.value + 1)">{{ t('iam.roles.nextPage') }}</MomButton></div>
          </div>
        </section>
        <p v-if="m.invalidSelection.value" class="iam-grants__warning" role="alert">{{ t('iam.grants.disabledSelected') }}</p>
        <div class="iam-grants__footer">
          <MomButton class="iam-role-button iam-role-button--secondary" type="button" round :disabled="m.saving.value" @click="m.close">{{ t('iam.grants.close') }}</MomButton>
          <MomButton class="iam-role-button iam-role-button--primary" type="button" round :disabled="!m.canReview.value" @click="m.review">{{ t('iam.grants.review') }}</MomButton>
        </div>
      </template>

      <template v-else-if="m.stage.value === 'review'">
        <p class="iam-grants__warning">{{ t('iam.grants.confirmHint') }}</p>
        <div class="iam-grants__diff">
          <section><h3>{{ t('iam.grants.added', { count: m.added.value.length }) }}</h3><p v-if="!m.added.value.length">{{ t('iam.grants.noChanges') }}</p><div v-for="item in m.added.value" :key="item.id"><strong>{{ item.name }}</strong><span>{{ item.resourceName }} · {{ item.code }}</span></div></section>
          <section><h3>{{ t('iam.grants.removed', { count: m.removed.value.length }) }}</h3><p v-if="!m.removed.value.length">{{ t('iam.grants.noChanges') }}</p><div v-for="item in m.removed.value" :key="item.id"><strong>{{ item.name }}</strong><span>{{ item.resourceName }} · {{ item.code }}</span></div></section>
        </div>
        <div class="iam-grants__footer">
          <MomButton class="iam-role-button iam-role-button--secondary" type="button" round :disabled="m.saving.value || m.loading.value" @click="m.back">{{ t('iam.grants.back') }}</MomButton>
          <MomButton class="iam-role-button iam-role-button--primary" type="button" round :disabled="m.saving.value || m.loading.value" @click="confirm">{{ t('iam.grants.confirm') }}</MomButton>
        </div>
      </template>
      <div v-else class="iam-grants__footer">
        <MomButton class="iam-role-button iam-role-button--secondary" type="button" round :disabled="m.loading.value" @click="m.close">{{ t('iam.grants.close') }}</MomButton>
        <MomButton class="iam-role-button iam-role-button--primary" type="button" round :disabled="m.loading.value" @click="m.reconcile()">{{ t('iam.grants.readLatest') }}</MomButton>
      </div>
      <MomLoading class="iam-grants__loading" :model-value="m.loading.value" :text="t('iam.grants.loading')" role="status" />
    </div>
  </MomModal>
</template>
