import type { UserAccessContext, UserType, WebClientId } from '@mom/access';
import { createAccessRuntime } from '@mom/access';
import { createApiClient } from '@mom/api-client';
import {
  createFirstPartyAuthRuntime,
  FirstPartyAuthError,
} from '@mom/first-party-auth';
import {
  assertPortalBoundary,
  describePortalError,
  supplierPortal,
  type PortalErrorView,
} from '@mom/portal-access';
import {
  createSystemRuntime,
  DEFAULT_SYSTEM_PREFERENCE,
  type SystemRuntimeSnapshot,
} from '@mom/system-client';
import { reactive, readonly, shallowRef } from 'vue';

const clientId: WebClientId = 'mom-supplier-web';
const expectedUserType: UserType = 'SUPPLIER';
const gatewayBase = (import.meta.env.VITE_MOM_GATEWAY_URL ?? '').replace(/\/+$/u, '');

export const runtimeState = reactive<{
  phase: 'starting' | 'anonymous' | 'password-change' | 'ready' | 'error';
  user?: Readonly<UserAccessContext>;
  error?: PortalErrorView;
  authError?: string;
}>({ phase: 'starting' });

export const auth = createFirstPartyAuthRuntime({ clientId, baseUrl: gatewayBase });

let accessRuntime: ReturnType<typeof createAccessRuntime> | undefined;
let systemRuntimeRef: ReturnType<typeof createSystemRuntime> | undefined;
export const api = createApiClient({
  baseUrl: gatewayBase,
  getContext: () => ({
    accessToken: auth.getAccessToken(),
    factoryId: accessRuntime?.currentFactoryId(),
  }),
  refreshAccessToken: () => auth.refresh(),
  onAuthenticationRequired: async () => {
    auth.clear();
    accessRuntime?.clear();
    systemRuntimeRef?.clear();
    runtimeState.user = undefined;
    runtimeState.phase = 'anonymous';
  },
});
export const systemRuntime = createSystemRuntime({
  api,
  applicationCode: 'supplier-portal',
  clientId,
  defaultPreference: DEFAULT_SYSTEM_PREFERENCE,
  onPreference: async (preference) => {
    const { applySystemPreference } = await import('./app/theme');
    applySystemPreference(preference);
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
  }),
});
accessRuntime = access;
access.subscribe((context) => {
  if (context) assertPortalBoundary(context, supplierPortal);
  runtimeState.user = context;
});

export async function bootstrapRuntime(): Promise<boolean> {
  runtimeState.phase = 'starting';
  runtimeState.error = undefined;
  runtimeState.authError = undefined;
  if (!auth.restore()) {
    runtimeState.phase = 'anonymous';
    return true;
  }
  try {
    if (!auth.hasUsableAccessToken()) await auth.refresh();
    const context = await access.initialize();
    await systemRuntime.activate({ userId: context.userId });
    runtimeState.phase = 'ready';
  }
  catch (error) {
    auth.clear();
    access.clear();
    runtimeState.user = undefined;
    runtimeState.authError = messageOf(error);
    runtimeState.phase = 'anonymous';
  }
  return true;
}

export async function login(username?: string, password?: string): Promise<void> {
  runtimeState.error = undefined;
  runtimeState.authError = undefined;
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
    const context = await access.initialize();
    await systemRuntime.activate({ userId: context.userId });
    runtimeState.phase = 'ready';
  }
  catch (error) {
    runtimeState.authError = messageOf(error);
    runtimeState.phase = error instanceof FirstPartyAuthError
      && error.code === 'password_change_required'
      ? 'password-change'
      : 'anonymous';
    throw error;
  }
}

export async function changeRequiredPassword(
  username: string,
  currentPassword: string,
  newPassword: string,
  confirmation: string,
): Promise<void> {
  runtimeState.authError = undefined;
  runtimeState.phase = 'starting';
  try {
    await auth.changeRequiredPassword({
      username,
      currentPassword,
      newPassword,
      confirmation,
    });
    const context = await access.initialize();
    await systemRuntime.activate({ userId: context.userId });
    runtimeState.phase = 'ready';
  }
  catch (error) {
    runtimeState.authError = messageOf(error);
    runtimeState.phase = 'password-change';
    throw error;
  }
}

export async function refreshAccess(): Promise<void> {
  runtimeState.phase = 'starting';
  runtimeState.error = undefined;
  try {
    await access.initialize();
    runtimeState.phase = 'ready';
  }
  catch (error) {
    runtimeState.phase = 'error';
    runtimeState.error = describePortalError(error);
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
    // 本地会话已清理；服务端失败不允许阻止用户退出当前页面。
  }
  runtimeState.phase = 'anonymous';
  runtimeState.error = undefined;
  runtimeState.authError = undefined;
}

export function selectFactory(factoryId: string): void {
  access.setCurrentFactory(factoryId);
  runtimeState.user = access.snapshot();
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : '认证请求失败';
}
