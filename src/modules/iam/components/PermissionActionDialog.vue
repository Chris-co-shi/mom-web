<script setup lang="ts">
import { computed } from 'vue';
import { MomButton, MomInput, MomSelect, MomTextarea } from '../../../shared/ui';
import type { MessageKey } from '../../../locales/zh-CN';
import MomModal from '../../../shared/components/MomModal.vue';
import { formatInstant } from '../../../shared/formatters';
import { useLocale } from '../../../shared/i18n/locale';
import type { PermissionAction, usePermissionManagement } from '../model/use-permission-management';
import type { PermissionResourceResponse } from '../api/permission-resources-api';

const props = defineProps<{ management: ReturnType<typeof usePermissionManagement>; fixedResource?: PermissionResourceResponse }>();
const { action, target, form, resources, fieldErrors, dialogError, detailLoading, saving, blocked, canSubmit,
  close, submit, reloadTarget } = props.management;
const { t, locale } = useLocale();
const titles: Record<PermissionAction, MessageKey> = {
  detail: 'iam.permissions.detail', create: 'iam.permissions.create', edit: 'iam.permissions.edit',
  status: 'iam.permissions.changeStatus', delete: 'iam.permissions.delete',
};
const title = computed(() => action.value ? t(titles[action.value]) : '');
const writableForm = computed(() => action.value === 'create' || action.value === 'edit');
</script>

<template>
  <MomModal :open="!!action" :title="title" :close-label="t('iam.permissions.close')" :busy="saving"
    :busy-text="t('iam.permissions.saving')" :width="640" @close="close">
    <div class="iam-permission-dialog__body">
      <div v-if="detailLoading" role="status" class="iam-permission-feedback">{{ t('iam.permissions.loading') }}</div>
      <div v-if="dialogError" role="alert" class="iam-permission-feedback">
        <p>{{ t(dialogError.key) }}</p>
        <small v-if="dialogError.correlationId">{{ t('iam.permissions.correlation') }}: {{ dialogError.correlationId }}</small>
        <MomButton v-if="target && !saving" class="iam-permission-button iam-permission-button--secondary" type="button" round :disabled="detailLoading" @click="reloadTarget">{{ t('iam.permissions.reloadDetail') }}</MomButton>
      </div>
      <dl v-if="target && !detailLoading" class="iam-permission-summary">
        <div><dt>{{ t('iam.permissions.domain') }}</dt><dd>{{ target.domainCode }}</dd></div>
        <div><dt>{{ t('iam.permissions.resource') }}</dt><dd>{{ target.resourceName }}</dd></div>
        <div><dt>{{ t('iam.permissions.action') }}</dt><dd>{{ target.actionCode }}</dd></div>
        <div><dt>{{ t('iam.permissions.code') }}</dt><dd>{{ target.code }}</dd></div>
        <div><dt>{{ t('iam.permissions.name') }}</dt><dd>{{ target.name }}</dd></div>
        <div><dt>{{ t('iam.permissions.status') }}</dt><dd><span class="iam-permission-status" :class="target.enabled ? 'iam-permission-status--enabled' : 'iam-permission-status--disabled'"><span class="iam-permission-status__dot" aria-hidden="true"></span>{{ t(target.enabled ? 'iam.permissions.enabled' : 'iam.permissions.disabled') }}</span></dd></div>
        <div><dt>{{ t('iam.permissions.version') }}</dt><dd>{{ target.version }}</dd></div>
        <template v-if="action === 'detail'">
          <div><dt>{{ t('iam.permissions.descriptionField') }}</dt><dd>{{ target.description || '—' }}</dd></div>
          <div><dt>{{ t('iam.permissions.createdAt') }}</dt><dd>{{ formatInstant(target.createdAt, { locale }) }}</dd></div>
          <div><dt>{{ t('iam.permissions.updatedAt') }}</dt><dd>{{ formatInstant(target.updatedAt, { locale }) }}</dd></div>
        </template>
      </dl>
      <form v-if="action && action !== 'detail'" class="iam-permission-form" @submit.prevent="submit">
        <template v-if="writableForm">
          <label v-if="action === 'create'">
            <span>{{ t('iam.permissions.resource') }} *</span>
            <span v-if="fixedResource" class="iam-permission-form__fixed-resource">{{ fixedResource.domainCode }} / {{ fixedResource.name }}</span>
            <MomSelect v-else v-model="form.resourceId" :options="resources.filter((item) => item.enabled).map((item) => ({ value: item.id, label: `${item.domainCode} / ${item.name}` }))" :disabled="saving" />
            <span v-if="fieldErrors.resourceId" class="iam-permission-field-error">{{ t(fieldErrors.resourceId) }}</span>
          </label>
          <label v-if="action === 'create'">
            <span>{{ t('iam.permissions.action') }} *</span>
            <MomInput v-model="form.actionCode" class="iam-permission-input" :aria-invalid="!!fieldErrors.actionCode" :disabled="saving" :max-length="60" auto-complete="off" />
            <small>{{ t('iam.permissions.actionHint') }}</small>
            <span v-if="fieldErrors.actionCode" class="iam-permission-field-error">{{ t(fieldErrors.actionCode) }}</span>
          </label>
          <label>
            <span>{{ t('iam.permissions.name') }} *</span>
            <MomInput v-model="form.name" class="iam-permission-input" :aria-invalid="!!fieldErrors.name" :disabled="saving || detailLoading" :max-length="200" />
            <span v-if="fieldErrors.name" class="iam-permission-field-error">{{ t(fieldErrors.name) }}</span>
          </label>
          <label>
            <span>{{ t('iam.permissions.descriptionField') }}</span>
            <MomTextarea v-model="form.description" class="iam-permission-textarea" :aria-invalid="!!fieldErrors.description" :disabled="saving || detailLoading" :maxlength="1000" />
            <span v-if="fieldErrors.description" class="iam-permission-field-error">{{ t(fieldErrors.description) }}</span>
          </label>
        </template>
        <p v-if="action === 'status'" class="iam-permission-warning">{{ t('iam.permissions.statusHint') }}</p>
        <p v-if="action === 'delete'" class="iam-permission-warning">{{ t('iam.permissions.deleteHint') }}</p>
        <div class="iam-permission-footer">
          <MomButton class="iam-permission-button iam-permission-button--secondary" type="button" round :disabled="saving" @click="close">{{ t('iam.permissions.cancel') }}</MomButton>
          <MomButton class="iam-permission-button" :class="action === 'delete' || (action === 'status' && target?.enabled) ? 'iam-permission-button--danger' : 'iam-permission-button--primary'"
            type="submit" round :disabled="!canSubmit || blocked">{{ action === 'status' ? t(target?.enabled ? 'iam.permissions.disable' : 'iam.permissions.enable') : t('iam.permissions.confirm') }}</MomButton>
        </div>
      </form>
      <div v-else class="iam-permission-footer"><MomButton class="iam-permission-button iam-permission-button--secondary" type="button" round @click="close">{{ t('iam.permissions.close') }}</MomButton></div>
    </div>
  </MomModal>
</template>
