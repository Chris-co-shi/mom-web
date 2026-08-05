<script setup lang="ts">
import { defineAsyncComponent, reactive, ref } from 'vue';

import {
  Alert,
  Button,
  Card,
  Form,
  FormItem,
  Input,
  InputPassword,
  Space,
  Tag,
} from 'ant-design-vue';

import { AuthShell, DataState } from '@mom/common-ui';

import { changeRequiredPassword, login, runtimeState } from './runtime';

const PortalApplication = defineAsyncComponent(() => import('./App.vue'));
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
  <DataState
    v-if="runtimeState.phase === 'starting'"
    description="正在确认账号及其可访问的协同范围。"
    kind="LOADING"
    title="正在校验客户会话"
  />
  <AuthShell
    v-else-if="runtimeState.phase === 'anonymous' || runtimeState.phase === 'password-change'"
    channel="PORTAL"
    description="登录后仅可访问与贵司及授权工厂相关的协同信息。"
    title="客户协同门户"
  >
    <template #brand>
      <Tag color="cyan">CUSTOMER PORTAL</Tag>
      <div class="mom-auth-shell__brand-title">客户协同门户</div>
      <p>登录后仅可访问与贵司及授权工厂相关的协同信息。</p>
    </template>
    <template #form>
      <Card class="auth-card" :bordered="false">
        <template v-if="runtimeState.phase === 'anonymous'">
          <h1>客户登录</h1>
          <Alert
            v-if="runtimeState.authError"
            class="auth-alert"
            :message="runtimeState.authError"
            show-icon
            type="error"
          />
          <Form layout="vertical" @finish="submitLogin">
            <FormItem html-for="customer-login-username" label="用户名" required>
              <Input id="customer-login-username" v-model:value="form.username" autocomplete="username" :maxlength="120" />
            </FormItem>
            <FormItem html-for="customer-login-password" label="密码" required>
              <InputPassword id="customer-login-password" v-model:value="form.password" autocomplete="current-password" :maxlength="128" />
            </FormItem>
            <Button
              block
              :disabled="!form.username.trim() || !form.password"
              html-type="submit"
              :loading="busy"
              type="primary"
            >
              登录
            </Button>
          </Form>
        </template>
        <template v-else>
          <h1>首次修改密码</h1>
          <p>完成改密后即可进入客户协同门户。</p>
          <Alert
            v-if="runtimeState.authError"
            class="auth-alert"
            :message="runtimeState.authError"
            show-icon
            type="warning"
          />
          <Form layout="vertical" @finish="submitPasswordChange">
            <FormItem html-for="customer-change-username" label="账号">
              <Input id="customer-change-username" :value="form.username" disabled />
            </FormItem>
            <FormItem html-for="customer-new-password" label="新密码" required>
              <InputPassword id="customer-new-password" v-model:value="form.newPassword" autocomplete="new-password" :maxlength="128" />
            </FormItem>
            <FormItem html-for="customer-confirm-password" label="确认新密码" required>
              <InputPassword id="customer-confirm-password" v-model:value="form.confirmation" autocomplete="new-password" :maxlength="128" />
            </FormItem>
            <Space class="auth-actions" direction="vertical">
              <Button block html-type="submit" :loading="busy" type="primary">修改并登录</Button>
              <Button block @click="backToLogin">返回登录</Button>
            </Space>
          </Form>
        </template>
      </Card>
    </template>
  </AuthShell>
  <PortalApplication v-else-if="runtimeState.phase === 'ready' || runtimeState.phase === 'error'" />
</template>
