<script setup lang="ts">
import { reactive, ref } from 'vue';

import App from './App.vue';
import { changeRequiredPassword, login, runtimeState } from './runtime';

const busy = ref(false);
const form = reactive({ username: '', password: '', newPassword: '', confirmation: '' });

async function submitLogin(): Promise<void> {
  busy.value = true;
  try { await login(form.username, form.password); }
  catch { /* 运行时已写入稳定错误和下一状态。 */ }
  finally { busy.value = false; }
}

async function submitPasswordChange(): Promise<void> {
  busy.value = true;
  try {
    await changeRequiredPassword(
      form.username, form.password, form.newPassword, form.confirmation,
    );
    form.password = ''; form.newPassword = ''; form.confirmation = '';
  }
  catch { /* 保持在首次改密页。 */ }
  finally { busy.value = false; }
}

function backToLogin(): void {
  runtimeState.phase = 'anonymous';
  runtimeState.authError = undefined;
  form.password = ''; form.newPassword = ''; form.confirmation = '';
}
</script>

<template>
  <div v-if="runtimeState.phase === 'starting'" class="auth-loading">
    <a-spin size="large" tip="正在校验供应商会话" />
  </div>
  <main v-else-if="runtimeState.phase === 'anonymous' || runtimeState.phase === 'password-change'" class="auth-page">
    <section class="auth-brand">
      <a-tag color="purple">SUPPLIER PORTAL</a-tag>
      <h1>供应商协同门户</h1>
      <p>使用供应商账号登录。账号只能访问 IAM 固定绑定的 Supplier 与 Factory Scope。</p>
    </section>
    <a-card class="auth-card" :bordered="false">
      <template v-if="runtimeState.phase === 'anonymous'">
        <h2>供应商登录</h2>
        <a-alert v-if="runtimeState.authError" type="error" show-icon :message="runtimeState.authError" class="auth-alert" />
        <a-form layout="vertical" @submit.prevent="submitLogin">
          <a-form-item label="用户名" required><a-input v-model:value="form.username" autocomplete="username" maxlength="120" /></a-form-item>
          <a-form-item label="密码" required><a-input-password v-model:value="form.password" autocomplete="current-password" maxlength="128" /></a-form-item>
          <a-button type="primary" html-type="submit" block :loading="busy" :disabled="!form.username.trim() || !form.password">登录</a-button>
        </a-form>
      </template>
      <template v-else>
        <h2>首次修改密码</h2>
        <p>完成改密后才会创建供应商 Portal Session。</p>
        <a-alert v-if="runtimeState.authError" type="warning" show-icon :message="runtimeState.authError" class="auth-alert" />
        <a-form layout="vertical" @submit.prevent="submitPasswordChange">
          <a-form-item label="账号"><a-input :value="form.username" disabled /></a-form-item>
          <a-form-item label="新密码" required><a-input-password v-model:value="form.newPassword" autocomplete="new-password" maxlength="128" /></a-form-item>
          <a-form-item label="确认新密码" required><a-input-password v-model:value="form.confirmation" autocomplete="new-password" maxlength="128" /></a-form-item>
          <a-space direction="vertical" style="width:100%"><a-button type="primary" html-type="submit" block :loading="busy">修改并登录</a-button><a-button block @click="backToLogin">返回登录</a-button></a-space>
        </a-form>
      </template>
    </a-card>
  </main>
  <App v-else-if="runtimeState.phase === 'ready' || runtimeState.phase === 'error'" />
</template>

<style scoped>
.auth-loading{min-height:100vh;display:grid;place-items:center;background:#f5f7fb}.auth-page{min-height:100vh;display:grid;grid-template-columns:minmax(18rem,32rem) minmax(20rem,27rem);gap:4rem;align-items:center;justify-content:center;padding:3rem;background:linear-gradient(135deg,#f3e8ff,#f7f8fc 48%,#eef2f8)}.auth-brand h1{font-size:2.5rem;margin:.8rem 0}.auth-brand p{color:#5f6d80;line-height:1.8}.auth-card{box-shadow:0 24px 70px rgba(50,25,90,.14);border-radius:16px}.auth-alert{margin:1rem 0}@media(max-width:800px){.auth-page{grid-template-columns:1fr;padding:1.25rem;gap:1rem}}
</style>
