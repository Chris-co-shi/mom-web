import type { UserAccessContext, UserType, WebClientId } from '@mom/access';
import { createAccessRuntime } from '@mom/access';
import { createApiClient } from '@mom/api-client';
import {
  createFirstPartyAuthRuntime,
  FirstPartyAuthError,
} from '@mom/first-party-auth';
import { createIamAdminClient } from '@mom/iam-admin';
import { reactive } from 'vue';

const clientId: WebClientId = 'mom-admin-web';
const expectedUserType: UserType = 'INTERNAL';
const gatewayBase = (import.meta.env.VITE_MOM_GATEWAY_URL ?? '').replace(/\/+$/u, '');

export const runtimeState = reactive<{
  phase: 'starting' | 'anonymous' | 'password-change' | 'ready' | 'error';
  user?: Readonly<UserAccessContext>;
  error?: string;
}>({ phase: 'starting' });

export const auth = createFirstPartyAuthRuntime({
  clientId,
  baseUrl: gatewayBase,
});

let accessRuntime: ReturnType<typeof createAccessRuntime> | undefined;
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
    runtimeState.user = undefined;
    runtimeState.phase = 'anonymous';
  },
});
export const iamAdmin = createIamAdminClient(api);

export const access = createAccessRuntime({
  expectedClientId: clientId,
  expectedUserType,
  loadMe: (requestedFactoryId) => api.get<UserAccessContext>('/api/iam/me', {
    headers: requestedFactoryId ? { 'X-Factory-Id': requestedFactoryId } : undefined,
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
    await access.initialize();
    runtimeState.phase = 'ready';
  }
  catch (error) {
    auth.clear();
    access.clear();
    runtimeState.user = undefined;
    runtimeState.error = messageOf(error);
    runtimeState.phase = 'anonymous';
  }
  return true;
}

export async function login(username: string, password: string): Promise<void> {
  runtimeState.error = undefined;
  runtimeState.phase = 'starting';
  auth.clear();
  access.clear();
  try {
    await auth.login({ username, password });
    await access.initialize();
    runtimeState.phase = 'ready';
  }
  catch (error) {
    runtimeState.error = messageOf(error);
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
  runtimeState.error = undefined;
  runtimeState.phase = 'starting';
  try {
    await auth.changeRequiredPassword({
      username,
      currentPassword,
      newPassword,
      confirmation,
    });
    await access.initialize();
    runtimeState.phase = 'ready';
  }
  catch (error) {
    runtimeState.error = messageOf(error);
    runtimeState.phase = 'password-change';
    throw error;
  }
}

export async function logout(): Promise<void> {
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

private function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : '认证请求失败';
}
