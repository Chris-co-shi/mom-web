<script setup lang="ts">
import { computed } from 'vue';
import { MomButton, MomInput } from '../../../shared/ui';
import type { MessageKey } from '../../../locales/zh-CN';
import { formatInstant } from '../../../shared/formatters';
import { useLocale } from '../../../shared/i18n/locale';
import MomModal from '../../../shared/components/MomModal.vue';
import { useAuthSession } from '../../auth';
import type { UserAction, useUserManagement } from '../model/use-user-management';

const props = defineProps<{ management: ReturnType<typeof useUserManagement> }>();
const { action, target, form, fieldErrors, dialogError, detailLoading, saving, blocked, canSubmit,
  close, submit, reloadTarget } = props.management;
const { t, locale } = useLocale();
const { userId } = useAuthSession();
const titles: Record<UserAction, MessageKey> = {
  detail: 'iam.users.detail', create: 'iam.users.create', edit: 'iam.users.edit', password: 'iam.users.resetPassword',
  delete: 'iam.users.delete',
};
const title = computed(() => action.value ? t(titles[action.value]) : '');
const writableForm = computed(() => action.value === 'create' || action.value === 'edit');
const passwordForm = computed(() => action.value === 'create' || action.value === 'password');
</script>

<template>
  <MomModal :open="!!action" :title="title" :close-label="t('iam.users.close')" :busy="saving"
    :busy-text="t('iam.users.saving')" :width="640" @close="close">
    <div class="iam-user-dialog__body">
    <div v-if="detailLoading" role="status" class="iam-users__feedback">{{ t('iam.users.loading') }}</div>
    <div v-if="dialogError" role="alert" class="iam-users__feedback">
      <p>{{ t(dialogError.key) }}</p>
      <small v-if="dialogError.correlationId">{{ t('iam.users.correlation') }}: {{ dialogError.correlationId }}</small>
      <MomButton v-if="target && !saving" class="iam-button iam-button--secondary" type="button" :disabled="detailLoading" @click="reloadTarget">{{ t('iam.users.reloadDetail') }}</MomButton>
    </div>
    <p v-if="target && target.id === userId && (action === 'password' || action === 'delete')" class="iam-users__warning">{{ t('iam.users.selfWarning') }}</p>
    <dl v-if="target && !detailLoading" class="iam-user-summary">
      <div><dt>{{ t('iam.users.username') }}</dt><dd>{{ target.username }}</dd></div>
      <div><dt>{{ t('iam.users.currentName') }}</dt><dd>{{ target.displayName }}</dd></div>
      <div><dt>{{ t('iam.users.status') }}</dt><dd><span class="iam-user-status" :class="target.enabled ? 'iam-user-status--enabled' : 'iam-user-status--disabled'"><span class="iam-user-status__dot" aria-hidden="true"></span>{{ t(target.enabled ? 'iam.users.enabled' : 'iam.users.disabled') }}</span></dd></div>
      <div><dt>{{ t('iam.users.version') }}</dt><dd>{{ target.version }}</dd></div>
      <template v-if="action === 'detail'">
        <div><dt>{{ t('iam.users.createdAt') }}</dt><dd>{{ formatInstant(target.createdAt, { locale }) }}</dd></div>
        <div><dt>{{ t('iam.users.updatedAt') }}</dt><dd>{{ formatInstant(target.updatedAt, { locale }) }}</dd></div>
      </template>
    </dl>
    <form v-if="action && action !== 'detail'" class="iam-user-form" @submit.prevent="submit">
      <label v-if="action === 'create'">
        <span>{{ t('iam.users.username') }} *</span>
        <MomInput v-model="form.username" class="iam-user-input" :aria-invalid="!!fieldErrors.username" :disabled="saving" :max-length="120" auto-complete="off" />
        <small>{{ t('iam.users.usernameHint') }}</small>
        <span v-if="fieldErrors.username" class="iam-users__field-error">{{ t(fieldErrors.username) }}</span>
      </label>
      <template v-if="writableForm">
        <label>
          <span>{{ t('iam.users.displayName') }} *</span>
          <MomInput v-model="form.displayName" class="iam-user-input" :aria-invalid="!!fieldErrors.displayName" :disabled="saving || detailLoading" :max-length="200" />
          <span v-if="fieldErrors.displayName" class="iam-users__field-error">{{ t(fieldErrors.displayName) }}</span>
        </label>
      </template>
      <template v-if="passwordForm">
        <label>
          <span>{{ t(action === 'create' ? 'iam.users.initialPassword' : 'iam.users.newPassword') }} *</span>
          <MomInput v-model="form.password" class="iam-user-input" type="password" :aria-invalid="!!fieldErrors.password" :disabled="saving || detailLoading" :max-length="128" auto-complete="new-password" />
          <span v-if="fieldErrors.password" class="iam-users__field-error">{{ t(fieldErrors.password) }}</span>
        </label>
        <label>
          <span>{{ t('iam.users.confirmPassword') }} *</span>
          <MomInput v-model="form.confirmation" class="iam-user-input" type="password" :aria-invalid="!!fieldErrors.confirmation" :disabled="saving || detailLoading" :max-length="128" auto-complete="new-password" />
          <span v-if="fieldErrors.confirmation" class="iam-users__field-error">{{ t(fieldErrors.confirmation) }}</span>
        </label>
      </template>
      <p v-if="action === 'delete'" class="iam-users__warning">{{ t('iam.users.deleteHint') }}</p>
      <p v-if="action === 'password'" class="iam-users__warning">{{ t('iam.users.tokenHint') }}</p>
      <div class="iam-user-footer">
        <MomButton class="iam-button iam-button--secondary" type="button" :disabled="saving" @click="close">{{ t('iam.users.cancel') }}</MomButton>
        <MomButton class="iam-button" :class="action === 'delete' ? 'iam-button--danger' : 'iam-button--primary'" type="submit" :disabled="!canSubmit || blocked">{{ t('iam.users.confirm') }}</MomButton>
      </div>
    </form>
    <div v-else class="iam-user-footer">
      <MomButton class="iam-button iam-button--secondary" type="button" @click="close">{{ t('iam.users.close') }}</MomButton>
    </div>
    </div>
  </MomModal>
</template>
