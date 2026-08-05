<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  Button as AButton,
  Card as ACard,
  Form as AForm,
  FormItem as AFormItem,
  Input as AInput,
  InputPassword as AInputPassword,
  message,
} from 'ant-design-vue';

import { $t } from '../../locales';
import { changeRequiredPassword, runtimeState } from '../../runtime';
import {
  resolveAuthorizedRedirect,
  synchronizeAccess,
} from '../../router/access';
import { synchronizeCatalog } from '../../router/catalog';

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
    await synchronizeCatalog();
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
    if (runtimeState.phase === 'ready') {
      await router.replace({
        path: '/catalog-error',
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
      <a-form-item
        html-for="mom-admin-change-username"
        :label="$t('mom.auth.username')"
        required
      >
        <a-input
          id="mom-admin-change-username"
          v-model:value="form.username"
          autocomplete="username"
          size="large"
        />
      </a-form-item>
      <a-form-item
        html-for="mom-admin-current-password"
        :label="$t('mom.auth.currentPassword')"
        required
      >
        <a-input-password
          id="mom-admin-current-password"
          v-model:value="form.currentPassword"
          autocomplete="current-password"
          size="large"
        />
      </a-form-item>
      <a-form-item
        html-for="mom-admin-new-password"
        :label="$t('mom.auth.newPassword')"
        required
      >
        <a-input-password
          id="mom-admin-new-password"
          v-model:value="form.newPassword"
          autocomplete="new-password"
          size="large"
        />
      </a-form-item>
      <a-form-item
        html-for="mom-admin-confirm-password"
        :label="$t('mom.auth.confirmation')"
        required
      >
        <a-input-password
          id="mom-admin-confirm-password"
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
