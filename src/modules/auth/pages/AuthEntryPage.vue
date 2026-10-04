<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import type { Directive } from 'vue';
import Button from 'tdesign-vue-next/es/button';
import Input from 'tdesign-vue-next/es/input';
import { useRoute, useRouter } from 'vue-router';
import { resolveLoginRedirect } from '../../../router/auth-guard';
import { ApiError, isApiError } from '../../../shared/api/errors';
import { useLocale } from '../../../shared/i18n/locale';
import { login } from '../model/auth-session';
import './auth-entry.css';

interface NativeInputBinding {
  id: string;
  describedBy?: string;
}

const route = useRoute();
const router = useRouter();
const { t } = useLocale();
const submitting = ref(false);
const submitError = ref('');
const form = reactive({ username: '', password: '' });
const fieldErrors = reactive({ username: '', password: '' });

const logoutIncomplete = computed(() => route.query.reason === 'logout-incomplete');

function bindNativeInput(element: HTMLElement, binding: NativeInputBinding): void {
  const input = element.querySelector('input');
  input?.setAttribute('id', binding.id);
  if (binding.describedBy) input?.setAttribute('aria-describedby', binding.describedBy);
  else input?.removeAttribute('aria-describedby');
}

/** TDesign Input 当前不稳定透传原生 id，因此在模块内补齐 label 和错误提示关联。 */
const vNativeInput: Directive<HTMLElement, NativeInputBinding> = {
  mounted: (element, binding) => bindNativeInput(element, binding.value),
  updated: (element, binding) => bindNativeInput(element, binding.value),
};

function validate(): boolean {
  fieldErrors.username = '';
  fieldErrors.password = '';
  if (!form.username.trim()) fieldErrors.username = t('auth.login.usernameRequired');
  else if (form.username.length > 120) fieldErrors.username = t('auth.login.usernameTooLong');
  if (!form.password) fieldErrors.password = t('auth.login.passwordRequired');
  else if (form.password.length > 128) fieldErrors.password = t('auth.login.passwordTooLong');
  return !fieldErrors.username && !fieldErrors.password;
}

function messageFor(error: unknown): string {
  if (error instanceof Error && error.message === 'auth.session_storage_unavailable') {
    return t('auth.login.storageUnavailable');
  }
  if (error instanceof Error && error.message === 'auth.invalid_login_response') {
    return t('auth.login.invalidResponse');
  }
  if (!isApiError(error)) return t('auth.login.unknownError');
  const messages: Partial<Record<ApiError['code'], string>> = {
    'auth.invalid_credentials': t('auth.login.invalidCredentials'),
    'auth.account_disabled': t('auth.login.accountDisabled'),
    'auth.authentication_service_unavailable': t('auth.login.serviceUnavailable'),
    'auth.token_store_unavailable': t('auth.login.serviceUnavailable'),
  };
  return messages[error.code] ?? (
    error.kind === 'rate_limited'
      ? t('auth.login.rateLimited')
      : error.kind === 'network' || error.kind === 'timeout' || error.kind === 'server'
        ? t('auth.login.serviceUnavailable')
        : error.message
  );
}

async function handleSubmit(): Promise<void> {
  submitError.value = '';
  if (!validate()) return;
  submitting.value = true;
  try {
    await login({ username: form.username, password: form.password });
    form.password = '';
    await router.replace(resolveLoginRedirect(route.query.redirect));
  } catch (error) {
    submitError.value = messageFor(error);
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <article class="auth-entry" aria-labelledby="auth-entry-title">
    <header class="auth-entry__header">
      <div class="auth-entry__heading">
        <span class="auth-entry__index">{{ t('auth.login.eyebrow') }}</span>
        <h2 id="auth-entry-title">{{ t('auth.login.welcome') }}</h2>
        <p>{{ t('auth.login.description') }}</p>
      </div>
      <span class="auth-entry__secure" :aria-label="t('auth.login.secureAria')">
        <span aria-hidden="true"></span>{{ t('auth.login.secure') }}
      </span>
    </header>

    <div v-if="logoutIncomplete" class="auth-entry__notice" role="status">
      {{ t('auth.login.logoutIncomplete') }}
    </div>

    <div v-if="submitError" id="login-submit-error" class="auth-entry__error" role="alert">
      <span aria-hidden="true">!</span>
      <p>{{ submitError }}</p>
    </div>

    <form class="auth-entry__form" aria-describedby="login-form-note" novalidate @submit.prevent="handleSubmit">
      <div class="auth-field" :class="{ 'auth-field--error': fieldErrors.username }">
        <label for="login-username">{{ t('auth.login.username') }}</label>
        <Input
          v-model="form.username"
          v-native-input="{ id: 'login-username', describedBy: fieldErrors.username ? 'login-username-error' : undefined }"
          name="username"
          autocomplete="username"
          :placeholder="t('auth.login.usernamePlaceholder')"
          :disabled="submitting"
          size="large"
          @input="fieldErrors.username = ''"
        />
        <span v-if="fieldErrors.username" id="login-username-error" class="auth-field__error">
          {{ fieldErrors.username }}
        </span>
      </div>

      <div class="auth-field" :class="{ 'auth-field--error': fieldErrors.password }">
        <div class="auth-field__label-row">
          <label for="login-password">{{ t('auth.login.password') }}</label>
          <span>{{ t('auth.login.passwordCaseSensitive') }}</span>
        </div>
        <Input
          v-model="form.password"
          v-native-input="{ id: 'login-password', describedBy: fieldErrors.password ? 'login-password-error' : undefined }"
          name="password"
          type="password"
          autocomplete="current-password"
          :placeholder="t('auth.login.passwordPlaceholder')"
          :disabled="submitting"
          size="large"
          @input="fieldErrors.password = ''"
        />
        <span v-if="fieldErrors.password" id="login-password-error" class="auth-field__error">
          {{ fieldErrors.password }}
        </span>
      </div>

      <Button class="auth-entry__submit" theme="primary" type="submit" size="large" block :loading="submitting">
        {{ submitting ? t('auth.login.submitting') : t('auth.login.submit') }}
      </Button>
    </form>

    <footer id="login-form-note" class="auth-entry__footer">
      <span class="auth-entry__pulse" aria-hidden="true"></span>
      <p>
        <strong>{{ t('auth.login.sessionTitle') }}</strong>
        {{ t('auth.login.sessionDescription') }}
      </p>
    </footer>
  </article>
</template>
