<script setup lang="ts">
import { computed } from 'vue';
import { MomButton, MomCheckbox } from '../../../shared/ui';
import MomModal from '../../../shared/components/MomModal.vue';
import { useLocale } from '../../../shared/i18n/locale';
import type { useUserRoleAssignment } from '../model/use-user-role-assignment';
import './user-role-assignment-dialog.css';

const props = defineProps<{ assignment: ReturnType<typeof useUserRoleAssignment> }>();
const emit = defineEmits<{ saved: [] }>();
const { t } = useLocale();
const m = props.assignment;
const pages = computed(() => Math.max(1, Math.ceil(m.total.value / 50)));

async function confirm(): Promise<void> {
  await m.submit();
  if (!m.opened.value) emit('saved');
}
</script>

<template>
  <MomModal :open="m.opened.value" :title="t('iam.users.roleAssignment')" :close-label="t('iam.users.close')"
    :busy="m.saving.value" :busy-text="t('iam.users.saving')" :width="680" @close="m.close">
    <section class="iam-user-roles" :aria-busy="m.loading.value">
      <header v-if="m.target.value" class="iam-user-roles__target">
        <strong>{{ m.target.value.displayName }}</strong><code>{{ m.target.value.username }}</code>
      </header>
      <div v-if="m.error.value" class="iam-users__feedback" role="alert">
        <p>{{ t(m.error.value.key) }}</p>
        <small v-if="m.error.value.correlationId">{{ t('iam.users.correlation') }}: {{ m.error.value.correlationId }}</small>
        <MomButton v-if="m.stage.value === 'unknown' || m.loading.value" variant="outline" :disabled="m.loading.value || m.saving.value" @click="m.reloadLatest">{{ t('iam.users.reloadDetail') }}</MomButton>
        <MomButton v-else variant="outline" :disabled="m.loading.value" @click="m.retry">{{ t('iam.users.retry') }}</MomButton>
      </div>
      <p v-if="m.notice.value" role="status">{{ t(m.notice.value.key) }}</p>
      <p class="iam-user-roles__count" role="status">{{ t('iam.users.roleSelectionCount', { count: m.selectedIds.value.length }) }}</p>
      <p class="iam-users__warning">{{ t('iam.users.roleAssignmentHint') }}</p>
      <p v-if="m.removedDisabledRoles.value" class="iam-users__warning">{{ t('iam.users.roleDisabledHint') }}</p>
      <div class="iam-user-roles__list">
        <label v-for="role in m.roles.value" :key="role.id" class="iam-user-roles__item">
          <MomCheckbox :model-value="m.selectedIds.value.includes(role.id)"
            :disabled="m.loading.value || m.saving.value || (!role.enabled && !m.selectedIds.value.includes(role.id))"
            :aria-label="role.name" @change="m.toggle(role)" />
          <span><strong>{{ role.name }}</strong><code>{{ role.code }}</code></span>
          <small>{{ t(role.enabled ? 'iam.users.enabled' : 'iam.users.disabled') }}</small>
        </label>
        <p v-if="!m.loading.value && !m.error.value && !m.roles.value.length" class="iam-user-roles__empty">{{ t('iam.users.noRoles') }}</p>
        <p v-if="m.loading.value" role="status" class="iam-user-roles__empty">{{ t('iam.users.loading') }}</p>
      </div>
      <footer class="iam-user-roles__paging">
        <span>{{ t('iam.resources.pageCount', { current: m.pageNo.value, pages: pages }) }}</span>
        <div>
          <MomButton variant="outline" :disabled="m.loading.value || m.pageNo.value <= 1" @click="m.loadPage(m.pageNo.value - 1)">{{ t('iam.roles.previousPage') }}</MomButton>
          <MomButton variant="outline" :disabled="m.loading.value || m.pageNo.value >= pages" @click="m.loadPage(m.pageNo.value + 1)">{{ t('iam.roles.nextPage') }}</MomButton>
        </div>
      </footer>
    </section>
    <template #footer>
      <MomButton variant="outline" :disabled="m.saving.value" @click="m.close">{{ t('iam.users.cancel') }}</MomButton>
      <MomButton :disabled="!m.canSubmit.value" @click="confirm">{{ t('iam.users.confirm') }}</MomButton>
    </template>
  </MomModal>
</template>
