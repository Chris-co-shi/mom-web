<script setup lang="ts">
import { computed, reactive, ref } from 'vue';

import App from './App.vue';
import {
  changeRequiredPassword,
  login,
  runtimeState,
} from './runtime';

const busy = ref(false);
const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 128;
const form = reactive({
  username: '',
  password: '',
  newPassword: '',
  confirmation: '',
});
const passwordLengthValid = computed(() => form.newPassword.length >= PASSWORD_MIN_LENGTH
  && form.newPassword.length <= PASSWORD_MAX_LENGTH);
const passwordsMatch = computed(() => Boolean(form.confirmation)
  && form.newPassword === form.confirmation);
const canSubmitPasswordChange = computed(() => passwordLengthValid.value && passwordsMatch.value);

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
      <span class="auth-eyebrow">MOM · MANUFACTURING OPERATIONS</span>
      <h1>制造运营管理平台</h1>
      <p>连接生产、质量、仓储与设备，让现场状态清晰可见，让每一次协同都有据可循。</p>
      <div class="auth-brand-meta" aria-label="平台能力">
        <span>生产协同</span><span>质量闭环</span><span>实时追溯</span>
      </div>
    </section>

    <a-card class="auth-card" :bordered="false">
      <template v-if="runtimeState.phase === 'anonymous'">
        <span class="auth-card-kicker">欢迎回来</span>
        <h2>登录 MOM</h2>
        <p class="auth-copy">使用组织账号继续访问制造运营平台。</p>
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
        <span class="auth-card-kicker">账号安全</span>
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
              :minlength="PASSWORD_MIN_LENGTH"
              :maxlength="PASSWORD_MAX_LENGTH"
            />
          </a-form-item>
          <a-form-item label="确认新密码" required>
            <a-input-password
              v-model:value="form.confirmation"
              autocomplete="new-password"
              :minlength="PASSWORD_MIN_LENGTH"
              :maxlength="PASSWORD_MAX_LENGTH"
            />
          </a-form-item>
          <div class="password-rules" role="status" aria-live="polite">
            <strong>密码要求</strong>
            <span :class="{ valid: passwordLengthValid }">
              <i aria-hidden="true" />长度为 12–128 位
            </span>
            <span :class="{ valid: passwordsMatch }">
              <i aria-hidden="true" />两次输入保持一致
            </span>
            <span><i aria-hidden="true" />不能与当前临时密码相同</span>
          </div>
          <a-space direction="vertical" style="width: 100%">
            <a-button
              type="primary"
              html-type="submit"
              block
              :loading="busy"
              :disabled="!canSubmitPasswordChange"
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
.auth-loading{min-height:100vh;display:grid;place-items:center;background:#07172e;color:#fff}
.auth-page{position:relative;isolation:isolate;min-height:100vh;display:grid;grid-template-columns:minmax(22rem,38rem) minmax(22rem,28rem);gap:clamp(3rem,8vw,9rem);align-items:center;justify-content:center;padding:clamp(2rem,6vw,6rem);overflow:hidden;background:#07172e url('./assets/mom-auth-background.svg') center/cover no-repeat}
.auth-page::before{position:absolute;z-index:-1;inset:0;content:"";background:linear-gradient(90deg,rgba(3,15,31,.22),rgba(3,15,31,.06) 46%,rgba(3,15,31,.42))}
.auth-brand{color:#fff;text-shadow:0 2px 24px rgba(0,0,0,.22)}
.auth-eyebrow,.auth-card-kicker{display:block;font-size:.74rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase}
.auth-eyebrow{color:#88dce9}.auth-card-kicker{margin-bottom:.55rem;color:#1677ff}
.auth-brand h1{max-width:13ch;margin:1rem 0;font-size:clamp(2.6rem,4.5vw,4.1rem);line-height:1.05;letter-spacing:-.045em}
.auth-brand>p{max-width:34rem;margin:0;color:rgba(236,250,255,.78);font-size:1.05rem;line-height:1.9}
.auth-brand-meta{display:flex;flex-wrap:wrap;gap:.65rem;margin-top:2rem}
.auth-brand-meta span{padding:.46rem .8rem;border:1px solid rgba(153,226,238,.28);border-radius:999px;background:rgba(5,35,57,.34);color:#d9f7fb;font-size:.8rem;backdrop-filter:blur(6px)}
.auth-card{width:100%;border:1px solid rgba(255,255,255,.62);border-radius:22px;background:rgba(255,255,255,.96);box-shadow:0 32px 90px rgba(0,10,28,.38);backdrop-filter:blur(18px)}
.auth-card :deep(.ant-card-body){padding:clamp(1.6rem,4vw,2.5rem)}
.auth-card h2{margin:0 0 .45rem;color:#10233d;font-size:1.85rem;letter-spacing:-.025em}.auth-copy{margin-bottom:1.4rem;color:#66758a;line-height:1.65}.auth-alert{margin:1rem 0}
.password-rules{display:grid;gap:.48rem;margin:-.25rem 0 1.25rem;padding:.9rem 1rem;border:1px solid #dce6f1;border-radius:10px;background:#f7fafe;color:#66758a;font-size:.82rem}
.password-rules strong{color:#344054}.password-rules span{display:flex;align-items:center;gap:.55rem}.password-rules i{width:.48rem;height:.48rem;flex:0 0 auto;border-radius:50%;background:#aab6c5;box-shadow:0 0 0 3px rgba(170,182,197,.13)}
.password-rules span.valid{color:#237804}.password-rules span.valid i{background:#52c41a;box-shadow:0 0 0 3px rgba(82,196,26,.14)}
@media(max-width:800px){.auth-page{grid-template-columns:1fr;gap:2rem;padding:1.25rem;background-position:38% center}.auth-brand h1{font-size:2.45rem}.auth-brand>p{font-size:.95rem}.auth-brand-meta{margin-top:1.25rem}.auth-card{max-width:32rem;margin:0 auto}}
@media(prefers-reduced-motion:reduce){.auth-page *{scroll-behavior:auto!important;transition:none!important}}
</style>
