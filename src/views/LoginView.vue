<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { ApiError } from '../api/http';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const username = ref('');
const password = ref('');
const submitting = ref(false);
const errorMessage = ref('');

async function handleSubmit() {
  if (!username.value.trim() || !password.value) {
    errorMessage.value = '请输入用户名和密码';
    return;
  }

  submitting.value = true;
  errorMessage.value = '';

  try {
    await auth.login(username.value.trim(), password.value);

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/users';
    await router.replace(redirect);
  } catch (error) {
    errorMessage.value = error instanceof ApiError
      ? error.message
      : '无法连接到登录服务，请确认 Gateway 与 Auth 已启动';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-card">
      <div class="login-heading">
        <p class="eyebrow">GEO Manufacturing Platform</p>
        <h1>登录</h1>
        <p>使用平台账号进入制造运营管理端。</p>
      </div>

      <form class="login-form" @submit.prevent="handleSubmit">
        <label class="form-field">
          <span>用户名</span>
          <input
            v-model="username"
            autocomplete="username"
            name="username"
            placeholder="请输入用户名"
            type="text"
          />
        </label>

        <label class="form-field">
          <span>密码</span>
          <input
            v-model="password"
            autocomplete="current-password"
            name="password"
            placeholder="请输入密码"
            type="password"
          />
        </label>

        <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>

        <button class="button button-primary login-submit" type="submit" :disabled="submitting">
          {{ submitting ? '登录中…' : '登录' }}
        </button>
      </form>
    </section>
  </main>
</template>
