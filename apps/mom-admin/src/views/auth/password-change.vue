<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { $t } from '@vben/locales';

import { message } from 'ant-design-vue';

import { changeRequiredPassword, runtimeState } from '../../runtime';
import {
  resolveAuthorizedRedirect,
  synchronizeAccess,
} from '../../router/access';

const route = useRoute();
const router = useRouter();
const submitting = ref(false);
const form = reactive({
  confirmation: '',
  currentPassword: '',
  newPassword: '',
  username: typeof route.query.username === 'string'
    ? route.query.username
    : '',
});

async function submit(): Promise<void> {
  if (
    !form.username.trim()
    || !form.currentPassword
    || !form.newPassword
    || !form.confirmation
  ) {
    message.warning($t('mom.auth.required'));
    return;
  }
  if (form.newPassword !== form.confirmation) {
    message.warning($t('mom.auth.passwordMismatch'));
    return;
  }
  submitting.value = true;
  try {
    await changeRequiredPassword(
      form.username.trim(),
      form.currentPassword,
      form.newPassword,
      form.confirmation,
    );
    await synchronizeAccess();
    await router.replace(resolveAuthorizedRedirect(route.query.redirect));
  }
  catch (error) {
    if (runtimeState.phase === 'access-error') {
      await router.replace({
        path: '/menu-error',
        query: { redirect: route.query.redirect },
      });
      return;
    }
    message.error(runtimeState.error ?? String(error));
  }
  finally {
    submitting.value = false;
  }
}
</script>

<template>
  <a-card :bordered="false" class="mom-auth-card">
    <h1>{{ $t('mom.auth.changeTitle') }}</h1>
    <a-form :model="form" layout="vertical" @finish="submit">
      <a-form-item :label="$t('mom.auth.username')" required>
        <a-input
          v-model:value="form.username"
          autocomplete="username"
          size="large"
        />
      </a-form-item>
      <a-form-item :label="$t('mom.auth.currentPassword')" required>
        <a-input-password
          v-model:value="form.currentPassword"
          autocomplete="current-password"
          size="large"
        />
      </a-form-item>
      <a-form-item :label="$t('mom.auth.newPassword')" required>
        <a-input-password
          v-model:value="form.newPassword"
          autocomplete="new-password"
          size="large"
        />
      </a-form-item>
      <a-form-item :label="$t('mom.auth.confirmation')" required>
        <a-input-password
          v-model:value="form.confirmation"
          autocomplete="new-password"
          size="large"
        />
      </a-form-item>
      <a-button
        block
        html-type="submit"
        :loading="submitting"
        size="large"
        type="primary"
      >
        {{ $t('mom.auth.changeSubmit') }}
      </a-button>
    </a-form>
  </a-card>
</template>
