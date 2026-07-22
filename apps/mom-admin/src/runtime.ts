import type { UserAccessContext, UserType, WebClientId } from '@mom/access';
import { createAccessRuntime } from '@mom/access';
import { createApiClient } from '@mom/api-client';
import { createAuthRuntime } from '@mom/auth';
import { createIamAdminClient } from '@mom/iam-admin';
import { reactive } from 'vue';

const clientId: WebClientId = 'mom-admin-web';
const expectedUserType: UserType = 'INTERNAL';
const issuer = import.meta.env.VITE_MOM_IAM_ISSUER ?? 'http://127.0.0.1:20100';
const iamBrowserBase = new URL(
  import.meta.env.VITE_MOM_IAM_BASE_URL ?? '/iam',
  window.location.origin,
).toString().replace(/\/+$/u, '');
const gatewayBase = (import.meta.env.VITE_MOM_GATEWAY_URL ?? '').replace(/\/+$/u, '');

export const runtimeState = reactive<{
  phase: 'starting' | 'ready' | 'error';
  user?: Readonly<UserAccessContext>;
  error?: string;
}>({ phase: 'starting' });

export const auth = createAuthRuntime({
  issuer,
  clientId,
  redirectUri: import.meta.env.VITE_MOM_AUTH_REDIRECT_URI ?? `${window.location.origin}/auth/callback`,
  postLogoutRedirectUri: import.meta.env.VITE_MOM_POST_LOGOUT_REDIRECT_URI ?? `${window.location.origin}/`,
  authorizationEndpoint: `${iamBrowserBase}/oauth2/authorize`,
  tokenEndpoint: `${iamBrowserBase}/oauth2/token`,
  jwksUri: `${iamBrowserBase}/oauth2/jwks`,
  endSessionEndpoint: `${iamBrowserBase}/connect/logout`,
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
    await auth.beginLogin(currentRelativeUrl());
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
  try {
    if (auth.isAuthorizationCallback()) {
      const callback = await auth.handleAuthorizationCallback();
      await access.initialize();
      window.history.replaceState(null, '', callback.returnUrl);
      runtimeState.phase = 'ready';
      return true;
    }
    if (!auth.hasUsableAccessToken()) {
      await auth.beginLogin(currentRelativeUrl());
      return false;
    }
    await access.initialize();
    runtimeState.phase = 'ready';
    return true;
  }
  catch (error) {
    runtimeState.phase = 'error';
    runtimeState.error = error instanceof Error ? error.message : '认证初始化失败';
    return true;
  }
}

export async function login(): Promise<void> {
  runtimeState.error = undefined;
  auth.clear();
  access.clear();
  await auth.beginLogin(currentRelativeUrl());
}

export function logout(): void {
  access.clear();
  auth.logout();
}

export function selectFactory(factoryId: string): void {
  access.setCurrentFactory(factoryId);
  runtimeState.user = access.snapshot();
}

function currentRelativeUrl(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}
