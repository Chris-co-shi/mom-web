import type { UserAccessContext, UserType, WebClientId } from '@mom/access';
import { createAccessRuntime } from '@mom/access';
import { createApiClient } from '@mom/api-client';
import {
  createFirstPartyAuthRuntime,
  FirstPartyAuthError,
} from '@mom/first-party-auth';
import { createIamAdminClient } from '@mom/iam-admin';
import {
  createSystemRuntime,
  DEFAULT_SYSTEM_PREFERENCE,
  type SystemRuntimeSnapshot,
} from '@mom/system-client';
import { reactive, readonly, shallowRef } from 'vue';

import { $t } from './locales';

const clientId: WebClientId = 'mom-admin-web';
const expectedUserType: UserType = 'INTERNAL';
const gatewayBase = (import.meta.env.VITE_MOM_GATEWAY_URL ?? '').replace(/\/+$/u, '');

export const runtimeState = reactive<{
  phase:
    | 'starting'
    | 'anonymous'
    | 'password-change'
    | 'access-error'
    | 'ready'
    | 'error';
  user?: Readonly<UserAccessContext>;
  error?: string;
}>({ phase: 'starting' });

export const auth = createFirstPartyAuthRuntime({
  clientId,
  baseUrl: gatewayBase,
});

let accessRuntime: ReturnType<typeof createAccessRuntime> | undefined;
let systemRuntimeRef: ReturnType<typeof createSystemRuntime> | undefined;
export const api = createApiClient({
  baseUrl: gatewayBase,
  getContext: () => ({
    accessToken: auth.getAccessToken(),
    factoryId: accessRuntime?.currentFactoryId(),
  }),
  refreshAccessToken: () => auth.refresh(),
  refreshAuthorization: async () => {
    const { synchronizeAccess } = await import('./router/access');
    await synchronizeAccess({ reloadContext: true });
  },
  onAuthenticationRequired: async () => {
    auth.clear();
    accessRuntime?.clear();
    systemRuntimeRef?.clear();
    runtimeState.user = undefined;
    runtimeState.phase = 'anonymous';
  },
  onForbidden: async () => {
    const { router } = await import('./router');
    if (router.currentRoute.value.path !== '/403') {
      await router.replace({
        path: '/403',
        query: { from: router.currentRoute.value.fullPath },
      });
    }
  },
  onWriteAuthorizationChanged: async () => {
    const { message } = await import('ant-design-vue');
    message.warning($t('mom.messages.authorizationChanged'));
  },
});
export const iamAdmin = createIamAdminClient(api);

export const systemRuntime = createSystemRuntime({
  api,
  applicationCode: 'mom-admin',
  clientId,
  defaultPreference: DEFAULT_SYSTEM_PREFERENCE,
  onPreference: async (preference) => {
    const [{ applySystemPreference }, { applySystemLocale }] = await Promise.all([
      import('./app/theme'),
      import('./locales'),
    ]);
    applySystemPreference(preference);
    await applySystemLocale(preference.locale, {});
  },
  onI18n: async (locale, messages) => {
    const { applySystemLocale } = await import('./locales');
    await applySystemLocale(locale, messages);
  },
});
systemRuntimeRef = systemRuntime;
const systemSnapshot = shallowRef<Readonly<SystemRuntimeSnapshot>>(systemRuntime.snapshot());
systemRuntime.subscribe((snapshot) => {
  systemSnapshot.value = snapshot;
  document.documentElement.dataset.momSystemRuntime = snapshot.phase.toLowerCase();
  document.documentElement.dataset.momSystemPreferenceSource = snapshot.preferenceSource.toLowerCase();
  document.documentElement.dataset.momSystemI18nSource = snapshot.i18nSource.toLowerCase();
});
export const systemRuntimeState = readonly(systemSnapshot);

export const access = createAccessRuntime({
  expectedClientId: clientId,
  expectedUserType,
  loadMe: (requestedFactoryId) => api.get<UserAccessContext>('/api/iam/me', {
    headers: requestedFactoryId ? { 'X-Factory-Id': requestedFactoryId } : undefined,
    retryAuthorization: false,
  }),
});
accessRuntime = access;
access.subscribe((context) => { runtimeState.user = context; });

export async function bootstrapRuntime(): Promise<boolean> {
  runtimeState.phase = 'starting';
  runtimeState.error = undefined;
  if (!auth.restore()) {
    runtimeState.phase = 'anonymous';
    return true;
  }
  try {
    if (!auth.hasUsableAccessToken()) await auth.refresh();
  }
  catch (error) {
    auth.clear();
    access.clear();
    runtimeState.user = undefined;
    runtimeState.error = messageOf(error);
    runtimeState.phase = 'anonymous';
    return true;
  }
  try {
    const context = await access.initialize();
    await systemRuntime.activate({ userId: context.userId });
    runtimeState.phase = 'ready';
  }
  catch (error) {
    if (!auth.getAccessToken()) {
      auth.clear();
      access.clear();
      runtimeState.user = undefined;
      runtimeState.phase = 'anonymous';
    }
    else {
      runtimeState.error = messageOf(error);
      runtimeState.phase = 'access-error';
    }
  }
  return true;
}

export async function login(username?: string, password?: string): Promise<void> {
  runtimeState.error = undefined;
  auth.clear();
  access.clear();
  systemRuntime.clear();
  runtimeState.user = undefined;
  if (!username || !password) {
    runtimeState.phase = 'anonymous';
    return;
  }
  runtimeState.phase = 'starting';
  try {
    await auth.login({ username, password });
  }
  catch (error) {
    runtimeState.error = messageOf(error);
    runtimeState.phase = error instanceof FirstPartyAuthError
      && error.code === 'password_change_required'
      ? 'password-change'
      : 'anonymous';
    throw error;
  }
  try {
    const context = await access.initialize();
    await systemRuntime.activate({ userId: context.userId });
    runtimeState.phase = 'ready';
  }
  catch (error) {
    runtimeState.error = messageOf(error);
    runtimeState.phase = 'access-error';
    throw error;
  }
}

export async function changeRequiredPassword(
  username: string,
  currentPassword: string,
  newPassword: string,
  confirmation: string,
): Promise<void> {
  runtimeState.error = undefined;
  runtimeState.phase = 'starting';
  try {
    await auth.changeRequiredPassword({
      username,
      currentPassword,
      newPassword,
      confirmation,
    });
  }
  catch (error) {
    runtimeState.error = messageOf(error);
    runtimeState.phase = 'password-change';
    throw error;
  }
  try {
    const context = await access.initialize();
    await systemRuntime.activate({ userId: context.userId });
    runtimeState.phase = 'ready';
  }
  catch (error) {
    runtimeState.error = messageOf(error);
    runtimeState.phase = 'access-error';
    throw error;
  }
}

export async function retryAccessInitialization(): Promise<void> {
  runtimeState.error = undefined;
  runtimeState.phase = 'starting';
  try {
    const context = await access.initialize();
    await systemRuntime.activate({ userId: context.userId });
    runtimeState.phase = 'ready';
  }
  catch (error) {
    runtimeState.error = messageOf(error);
    runtimeState.phase = auth.getAccessToken() ? 'access-error' : 'anonymous';
    throw error;
  }
}

export async function logout(): Promise<void> {
  systemRuntime.clear();
  access.clear();
  runtimeState.user = undefined;
  try {
    await auth.logout();
  }
  catch {
    // 客户端已在 finally 中清理；服务端撤销失败由短期 Access Token 到期和运维审计兜底。
  }
  runtimeState.phase = 'anonymous';
  runtimeState.error = undefined;
}

export function selectFactory(factoryId: string): void {
  access.setCurrentFactory(factoryId);
  runtimeState.user = access.snapshot();
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : $t('mom.messages.authenticationFailed');
}
