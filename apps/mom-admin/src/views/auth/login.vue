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

import { FirstPartyAuthError } from '@mom/first-party-auth';

import { $t } from '../../locales';
import { login, runtimeState } from '../../runtime';
import {
  resolveAuthorizedRedirect,
  synchronizeAccess,
} from '../../router/access';

const route = useRoute();
const router = useRouter();
const submitting = ref(false);
const form = reactive({
  password: '',
  username: '',
});

async function submit(): Promise<void> {
  if (!form.username.trim() || !form.password) {
    message.warning($t('mom.auth.required'));
    return;
  }
  submitting.value = true;
  try {
    await login(form.username.trim(), form.password);
    await synchronizeAccess();
    await router.replace(resolveAuthorizedRedirect(route.query.redirect));
  }
  catch (error) {
    if (
      error instanceof FirstPartyAuthError
      && error.code === 'password_change_required'
    ) {
      await router.replace({
        path: '/auth/change-password',
        query: {
          redirect: route.query.redirect,
          username: form.username.trim(),
        },
      });
      return;
    }
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
    <h1>{{ $t('mom.auth.loginTitle') }}</h1>
    <p>{{ $t('mom.auth.loginDescription') }}</p>
    <a-form :model="form" layout="vertical" @finish="submit">
      <a-form-item
        html-for="mom-admin-login-username"
        :label="$t('mom.auth.username')"
        required
      >
        <a-input
          id="mom-admin-login-username"
          v-model:value="form.username"
          autocomplete="username"
          :placeholder="$t('mom.auth.usernamePlaceholder')"
          size="large"
        />
      </a-form-item>
      <a-form-item
        html-for="mom-admin-login-password"
        :label="$t('mom.auth.password')"
        required
      >
        <a-input-password
          id="mom-admin-login-password"
          v-model:value="form.password"
          autocomplete="current-password"
          :placeholder="$t('mom.auth.passwordPlaceholder')"
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
        {{ submitting
          ? $t('mom.auth.submitting')
          : $t('mom.auth.submit') }}
      </a-button>
    </a-form>
  </a-card>
</template>
