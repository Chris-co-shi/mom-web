<script setup lang="ts">
import { reactive, ref } from 'vue';

import App from './App.vue';
import {
  changeRequiredPassword,
  login,
  runtimeState,
} from './runtime';

const busy = ref(false);
const form = reactive({
  username: '',
  password: '',
  newPassword: '',
  confirmation: '',
});

async function submitLogin(): Promise<void> {
  busy.value = true;
  try {
    await login(form.username, form.password);
  }
  catch {
    // 运行时已映射为 anonymous 或 password-change，并保留稳定错误消息。
  }
  finally {
    busy.value = false;
  }
}

async function submitPasswordChange(): Promise<void> {
  busy.value = true;
  try {
    await changeRequiredPassword(
      form.username,
      form.password,
      form.newPassword,
      form.confirmation,
    );
    form.password = '';
    form.newPassword = '';
    form.confirmation = '';
  }
  catch {
    // 运行时保留在 password-change，用户可修正后重试。
  }
  finally {
    busy.value = false;
  }
}

function backToLogin(): void {
  runtimeState.phase = 'anonymous';
  runtimeState.error = undefined;
  form.password = '';
  form.newPassword = '';
  form.confirmation = '';
}
</script>

<template>
  <div v-if="runtimeState.phase === 'starting'" class="auth-loading">
    <a-spin size="large" tip="正在校验当前标签页会话" />
  </div>

  <main
    v-else-if="runtimeState.phase === 'anonymous' || runtimeState.phase === 'password-change'"
    class="auth-page"
  >
    <section class="auth-brand">
      <a-tag color="blue">MOM ADMIN</a-tag>
      <h1>制造运营管理平台</h1>
      <p>账号认证由 MOM IAM 提供，登录界面与交互归属 MOM Web。</p>
      <ul>
        <li>Token 只保存在当前标签页 sessionStorage</li>
        <li>页面刷新恢复，关闭标签页后清除</li>
        <li>权限与 Factory Scope 由服务端最终裁决</li>
      </ul>
    </section>

    <a-card class="auth-card" :bordered="false">
      <template v-if="runtimeState.phase === 'anonymous'">
        <h2>登录 MOM Admin</h2>
        <p class="auth-copy">仅 INTERNAL 账号可进入管理端。</p>
        <a-alert
          v-if="runtimeState.error"
          type="error"
          show-icon
          :message="runtimeState.error"
          class="auth-alert"
        />
        <a-form layout="vertical" @submit.prevent="submitLogin">
          <a-form-item label="用户名" required>
            <a-input v-model:value="form.username" autocomplete="username" maxlength="120" />
          </a-form-item>
          <a-form-item label="密码" required>
            <a-input-password
              v-model:value="form.password"
              autocomplete="current-password"
              maxlength="128"
            />
          </a-form-item>
          <a-button
            type="primary"
            html-type="submit"
            block
            :loading="busy"
            :disabled="!form.username.trim() || !form.password"
          >登录</a-button>
        </a-form>
      </template>

      <template v-else>
        <h2>首次修改密码</h2>
        <p class="auth-copy">临时密码验证成功。完成改密后才会创建 Session 并进入管理端。</p>
        <a-alert
          v-if="runtimeState.error"
          type="warning"
          show-icon
          :message="runtimeState.error"
          class="auth-alert"
        />
        <a-form layout="vertical" @submit.prevent="submitPasswordChange">
          <a-form-item label="账号">
            <a-input :value="form.username" disabled />
          </a-form-item>
          <a-form-item label="新密码" required>
            <a-input-password
              v-model:value="form.newPassword"
              autocomplete="new-password"
              maxlength="128"
            />
          </a-form-item>
          <a-form-item label="确认新密码" required>
            <a-input-password
              v-model:value="form.confirmation"
              autocomplete="new-password"
              maxlength="128"
            />
          </a-form-item>
          <a-space direction="vertical" style="width: 100%">
            <a-button
              type="primary"
              html-type="submit"
              block
              :loading="busy"
              :disabled="!form.newPassword || !form.confirmation"
            >修改并登录</a-button>
            <a-button block :disabled="busy" @click="backToLogin">返回登录</a-button>
          </a-space>
        </a-form>
      </template>
    </a-card>
  </main>

  <App v-else-if="runtimeState.phase === 'ready'" />

  <main v-else class="auth-page">
    <a-alert type="error" show-icon message="认证运行时异常" :description="runtimeState.error">
      <template #action><a-button danger @click="backToLogin">返回登录</a-button></template>
    </a-alert>
  </main>
</template>

<style scoped>
.auth-loading{min-height:100vh;display:grid;place-items:center;background:#f4f7fb}
.auth-page{min-height:100vh;display:grid;grid-template-columns:minmax(18rem,34rem) minmax(20rem,28rem);gap:5rem;align-items:center;justify-content:center;padding:3rem;background:radial-gradient(circle at top left,#e6f4ff 0,#f4f7fb 42%,#eef2f8 100%)}
.auth-brand h1{font-size:2.7rem;margin:.8rem 0}.auth-brand p,.auth-brand li{color:#526174;line-height:1.8}.auth-brand ul{padding-left:1.2rem}
.auth-card{width:100%;box-shadow:0 24px 70px rgba(15,40,80,.14);border-radius:16px}.auth-card h2{margin-bottom:.4rem}.auth-copy{color:#66758a}.auth-alert{margin:1rem 0}
@media(max-width:800px){.auth-page{grid-template-columns:1fr;gap:1.5rem;padding:1.25rem}.auth-brand h1{font-size:2rem}}
</style>
