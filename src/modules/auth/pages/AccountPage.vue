<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { MomButton as Button, MomInput as Input } from '../../../shared/ui';
import type { MessageKey } from '../../../locales/zh-CN';
import { isApiError } from '../../../shared/api/errors';
import PageContainer from '../../../shared/components/PageContainer.vue';
import { useLocale } from '../../../shared/i18n/locale';
import { changeOwnPassword, synchronizeAuthSession, updateOwnProfile, useAuthSession } from '../model/auth-session';
import './account.css';

const { t } = useLocale();
const { user } = useAuthSession();
const busy = ref(false);
const ready = ref(false);
const needsRefresh = ref(false);
const displayName = ref('');
const passwords = reactive({ currentPassword: '', newPassword: '', confirmation: '' });
const feedback = ref<MessageKey>();
const success = ref(false);
const disabled = computed(() => busy.value || !ready.value || needsRefresh.value);

function clearPasswords(): void {
  passwords.currentPassword = '';
  passwords.newPassword = '';
  passwords.confirmation = '';
}

function showError(error: unknown): void {
  success.value = false;
  if (isApiError(error)) {
    if (error.code === 'auth.current_password_invalid') {
      feedback.value = 'account.wrongPassword';
      return;
    }
    if (error.kind === 'conflict' || error.resultUnknown) {
      needsRefresh.value = true;
      feedback.value = error.resultUnknown ? 'account.resultUnknown' : 'account.conflict';
      return;
    }
    if (error.kind === 'not_found') {
      ready.value = false;
      feedback.value = 'account.unavailable';
      return;
    }
    if (error.kind === 'unauthenticated') {
      feedback.value = 'account.sessionExpired';
      return;
    }
    if (error.kind === 'validation') {
      feedback.value = 'account.invalidFields';
      return;
    }
  }
  feedback.value = 'account.failed';
}

/** 主动刷新只更新并发版本，已有显示名草稿保留；初次进入才填入服务器名称。 */
async function refresh(initial = false): Promise<void> {
  if (busy.value) return;
  busy.value = true;
  feedback.value = undefined;
  try {
    await synchronizeAuthSession(true);
    if (!user.value) throw new Error('auth.session_expired');
    if (initial) displayName.value = user.value.displayName;
    ready.value = true;
    needsRefresh.value = false;
  } catch (error) {
    ready.value = false;
    showError(error);
  } finally {
    busy.value = false;
  }
}

async function saveProfile(): Promise<void> {
  if (disabled.value || !user.value) return;
  success.value = false;
  if (!displayName.value.trim() || displayName.value.length > 200) {
    feedback.value = 'account.invalidName';
    return;
  }
  busy.value = true;
  feedback.value = undefined;
  try {
    await updateOwnProfile({ displayName: displayName.value, version: user.value.version });
    displayName.value = user.value?.displayName ?? displayName.value;
    success.value = true;
    feedback.value = 'account.profileSaved';
  } catch (error) {
    showError(error);
  } finally {
    busy.value = false;
  }
}

async function savePassword(): Promise<void> {
  if (disabled.value || !user.value) return;
  success.value = false;
  if (!passwords.currentPassword || passwords.currentPassword.length > 128
    || !passwords.newPassword.trim() || passwords.newPassword.length < 8 || passwords.newPassword.length > 128) {
    feedback.value = 'account.invalidPassword';
    return;
  }
  if (passwords.newPassword !== passwords.confirmation) {
    feedback.value = 'account.passwordMismatch';
    return;
  }
  busy.value = true;
  feedback.value = undefined;
  try {
    await changeOwnPassword({
      currentPassword: passwords.currentPassword,
      newPassword: passwords.newPassword,
      version: user.value.version,
    });
    success.value = true;
    feedback.value = 'account.passwordSaved';
  } catch (error) {
    showError(error);
  } finally {
    // 凭据不进入路由、存储或日志；每次已发送请求结束后清空。
    clearPasswords();
    busy.value = false;
  }
}

onMounted(() => refresh(true));
</script>

<template>
  <PageContainer>
    <section class="account-page" :aria-busy="busy" aria-labelledby="account-title">
      <header class="account-heading">
        <div>
          <span class="account-eyebrow">ACCOUNT / SECURITY</span>
          <h1 id="account-title">{{ t('account.title') }}</h1>
          <p>{{ t('account.description') }}</p>
        </div>
        <Button variant="outline" :disabled="busy" @click="refresh()">{{ t('account.refresh') }}</Button>
      </header>

      <p v-if="feedback" class="account-feedback" :class="{ 'account-feedback--success': success }" :role="success ? 'status' : 'alert'">
        {{ t(feedback) }}
      </p>
      <p v-if="busy && !ready" role="status">{{ t('account.loading') }}</p>

      <div class="account-surface">
        <section class="account-section" aria-labelledby="account-profile-title">
          <div class="account-section__heading">
            <span class="account-section__index" aria-hidden="true">01</span>
            <h2 id="account-profile-title">{{ t('account.profile') }}</h2>
            <p>{{ t('account.profileHint') }}</p>
          </div>
          <form class="account-form" @submit.prevent="saveProfile">
            <label>
              <span>{{ t('account.username') }}</span>
              <Input :value="user?.username ?? ''" readonly autocomplete="username" />
              <small>{{ t('account.usernameHint') }}</small>
            </label>
            <label>
              <span>{{ t('account.displayName') }}</span>
              <Input v-model="displayName" :disabled="disabled" :maxlength="200" autocomplete="nickname" />
            </label>
            <div><Button type="submit" :disabled="disabled" :loading="busy && ready">{{ t('account.saveProfile') }}</Button></div>
          </form>
        </section>

        <section class="account-section" aria-labelledby="account-password-title">
          <div class="account-section__heading">
            <span class="account-section__index" aria-hidden="true">02</span>
            <h2 id="account-password-title">{{ t('account.password') }}</h2>
            <p>{{ t('account.passwordHint') }}</p>
          </div>
          <form class="account-form" @submit.prevent="savePassword">
            <label>
              <span>{{ t('account.currentPassword') }}</span>
              <Input v-model="passwords.currentPassword" type="password" :disabled="disabled" :maxlength="128" autocomplete="current-password" />
            </label>
            <label>
              <span>{{ t('account.newPassword') }}</span>
              <Input v-model="passwords.newPassword" type="password" :disabled="disabled" :maxlength="128" autocomplete="new-password" />
            </label>
            <label>
              <span>{{ t('account.confirmPassword') }}</span>
              <Input v-model="passwords.confirmation" type="password" :disabled="disabled" :maxlength="128" autocomplete="new-password" />
            </label>
            <p class="account-session-note">{{ t('account.tokenPolicy') }}</p>
            <div><Button type="submit" variant="outline" :disabled="disabled">{{ t('account.savePassword') }}</Button></div>
          </form>
        </section>
      </div>
    </section>
  </PageContainer>
</template>
