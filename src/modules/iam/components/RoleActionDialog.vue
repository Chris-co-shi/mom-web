<script setup lang="ts">
import { computed } from 'vue';
import { MomButton, MomInput, MomTextarea } from '../../../shared/ui';
import type { MessageKey } from '../../../locales/zh-CN';
import MomModal from '../../../shared/components/MomModal.vue';
import { formatInstant } from '../../../shared/formatters';
import { useLocale } from '../../../shared/i18n/locale';
import type { RoleAction, useRoleManagement } from '../model/use-role-management';

const props = defineProps<{ management: ReturnType<typeof useRoleManagement> }>();
const { action, target, form, fieldErrors, dialogError, detailLoading, saving, blocked, canSubmit,
  close, submit, reloadTarget } = props.management;
const { t, locale } = useLocale();
const titles: Record<RoleAction, MessageKey> = {
  detail: 'iam.roles.detail', create: 'iam.roles.create', edit: 'iam.roles.edit',
  status: 'iam.roles.changeStatus', delete: 'iam.roles.delete',
};
const title = computed(() => action.value ? t(titles[action.value]) : '');
const writableForm = computed(() => action.value === 'create' || action.value === 'edit');
</script>

<template>
  <MomModal :open="!!action" :title="title" :close-label="t('iam.roles.close')" :busy="saving"
    :busy-text="t('iam.roles.saving')" :width="640" @close="close">
    <div class="iam-role-dialog__body">
      <div v-if="detailLoading" role="status" class="iam-role-feedback">{{ t('iam.roles.loading') }}</div>
      <div v-if="dialogError" role="alert" class="iam-role-feedback">
        <p>{{ t(dialogError.key) }}</p>
        <small v-if="dialogError.correlationId">{{ t('iam.roles.correlation') }}: {{ dialogError.correlationId }}</small>
        <MomButton v-if="target && !saving" class="iam-role-button iam-role-button--secondary" type="button" round :disabled="detailLoading" @click="reloadTarget">{{ t('iam.roles.reloadDetail') }}</MomButton>
      </div>
      <dl v-if="target && !detailLoading" class="iam-role-summary">
        <div><dt>{{ t('iam.roles.code') }}</dt><dd>{{ target.code }}</dd></div>
        <div><dt>{{ t('iam.roles.name') }}</dt><dd>{{ target.name }}</dd></div>
        <div><dt>{{ t('iam.roles.status') }}</dt><dd><span class="iam-role-status" :class="target.enabled ? 'iam-role-status--enabled' : 'iam-role-status--disabled'"><span class="iam-role-status__dot" aria-hidden="true"></span>{{ t(target.enabled ? 'iam.roles.enabled' : 'iam.roles.disabled') }}</span></dd></div>
        <div><dt>{{ t('iam.roles.version') }}</dt><dd>{{ target.version }}</dd></div>
        <template v-if="action === 'detail'">
          <div><dt>{{ t('iam.roles.descriptionField') }}</dt><dd>{{ target.description || '—' }}</dd></div>
          <div><dt>{{ t('iam.roles.createdAt') }}</dt><dd>{{ formatInstant(target.createdAt, { locale }) }}</dd></div>
          <div><dt>{{ t('iam.roles.updatedAt') }}</dt><dd>{{ formatInstant(target.updatedAt, { locale }) }}</dd></div>
        </template>
      </dl>
      <form v-if="action && action !== 'detail'" class="iam-role-form" @submit.prevent="submit">
        <template v-if="writableForm">
          <label v-if="action === 'create'">
            <span>{{ t('iam.roles.code') }} *</span>
            <MomInput v-model="form.code" class="iam-role-input" :aria-invalid="!!fieldErrors.code" :disabled="saving" :max-length="100" auto-complete="off" />
            <small>{{ t('iam.roles.codeHint') }}</small>
            <span v-if="fieldErrors.code" class="iam-role-field-error">{{ t(fieldErrors.code) }}</span>
          </label>
          <label>
            <span>{{ t('iam.roles.name') }} *</span>
            <MomInput v-model="form.name" class="iam-role-input" :aria-invalid="!!fieldErrors.name" :disabled="saving || detailLoading" :max-length="200" />
            <span v-if="fieldErrors.name" class="iam-role-field-error">{{ t(fieldErrors.name) }}</span>
          </label>
          <label>
            <span>{{ t('iam.roles.descriptionField') }}</span>
            <MomTextarea v-model="form.description" class="iam-role-textarea" :aria-invalid="!!fieldErrors.description" :disabled="saving || detailLoading" :maxlength="1000" />
            <span v-if="fieldErrors.description" class="iam-role-field-error">{{ t(fieldErrors.description) }}</span>
          </label>
        </template>
        <p v-if="action === 'status'" class="iam-role-warning">{{ t('iam.roles.statusHint') }}</p>
        <p v-if="action === 'delete'" class="iam-role-warning">{{ t('iam.roles.deleteHint') }}</p>
        <div class="iam-role-footer">
          <MomButton class="iam-role-button iam-role-button--secondary" type="button" round :disabled="saving" @click="close">{{ t('iam.roles.cancel') }}</MomButton>
          <MomButton class="iam-role-button" :class="action === 'delete' || (action === 'status' && target?.enabled) ? 'iam-role-button--danger' : 'iam-role-button--primary'"
            type="submit" round :disabled="!canSubmit || blocked">{{ action === 'status' ? t(target?.enabled ? 'iam.roles.disable' : 'iam.roles.enable') : t('iam.roles.confirm') }}</MomButton>
        </div>
      </form>
      <div v-else class="iam-role-footer"><MomButton class="iam-role-button iam-role-button--secondary" type="button" round @click="close">{{ t('iam.roles.close') }}</MomButton></div>
    </div>
  </MomModal>
</template>
