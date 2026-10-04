import { computed, readonly, ref } from 'vue';
import {
  getCurrentSession as requestCurrentSession,
  login as requestLogin,
  logout as requestLogout,
  updateOwnProfile as requestUpdateProfile,
  changeOwnPassword as requestChangePassword,
  type CurrentUser,
  type UpdateOwnProfileRequest,
  type ChangeOwnPasswordRequest,
  type LoginRequest,
  type LoginResponse,
} from '../api/auth-api';

export const AUTH_SESSION_STORAGE_KEY = 'mom.auth.session';

interface AuthSession {
  accessToken: string;
  tokenType: 'Bearer';
  expiresAt: string;
  user?: CurrentUser;
  authorities?: readonly string[];
}

const session = ref<AuthSession>();
const initialized = ref(false);
const serverValidated = ref(false);
let synchronization: Promise<void> | undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toSession(value: unknown): AuthSession | undefined {
  if (!isRecord(value)) return undefined;
  const expiresAt = typeof value.expiresAt === 'string' ? Date.parse(value.expiresAt) : Number.NaN;
  if (
    typeof value.accessToken !== 'string'
    || value.accessToken.length === 0
    || value.tokenType !== 'Bearer'
    || !Number.isFinite(expiresAt)
    || expiresAt <= Date.now()
  ) {
    return undefined;
  }
  // 本地存储只恢复凭证；用户名、版本和权限必须由服务端重新确认。
  return {
    accessToken: value.accessToken,
    tokenType: 'Bearer',
    expiresAt: value.expiresAt as string,
  };
}

function toCurrentSession(value: unknown): Pick<AuthSession, 'user' | 'authorities' | 'expiresAt'> | undefined {
  if (!isRecord(value) || !isRecord(value.user) || !isRecord(value.authorization) || !isRecord(value.session)) return undefined;
  const { user, authorization, session: metadata } = value;
  const expiresAt = typeof metadata.expiresAt === 'string' ? Date.parse(metadata.expiresAt) : Number.NaN;
  if (
    typeof user.userId !== 'string' || !user.userId
    || typeof user.username !== 'string' || !user.username.trim()
    || typeof user.displayName !== 'string'
    || typeof user.version !== 'number' || !Number.isSafeInteger(user.version) || user.version < 0
    || !Array.isArray(authorization.authorities)
    || !authorization.authorities.every((authority) => typeof authority === 'string' && authority.length > 0)
    || !Number.isFinite(expiresAt)
    || expiresAt <= Date.now()
  ) {
    return undefined;
  }
  return {
    user: { userId: user.userId, username: user.username, displayName: user.displayName, version: user.version },
    authorities: [...new Set(authorization.authorities as string[])],
    expiresAt: metadata.expiresAt as string,
  };
}

function clearStoredSession(): void {
  session.value = undefined;
  serverValidated.value = false;
  synchronization = undefined;
  try {
    window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  } catch {
    // 浏览器禁用存储时仍需清理内存中的认证状态。
  }
}

function persistSession(nextSession: AuthSession, validated = false): void {
  try {
    const { accessToken, tokenType, expiresAt } = nextSession;
    window.sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify({ accessToken, tokenType, expiresAt }));
  } catch {
    // sessionStorage 不可用时不保留仅存于内存的 Token，避免刷新后出现不可解释的半会话。
    throw new Error('auth.session_storage_unavailable');
  }
  session.value = nextSession;
  serverValidated.value = validated;
}

/**
 * 从当前浏览器标签页恢复认证状态。
 * Opaque Token 不解析，过期判断只使用 Auth 明确返回的 expiresAt。
 */
export function initializeAuthSession(): void {
  if (initialized.value) return;
  initialized.value = true;
  try {
    const stored = window.sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    const restored = stored ? toSession(JSON.parse(stored) as unknown) : undefined;
    if (restored) {
      session.value = restored;
      serverValidated.value = false;
      return;
    }
  } catch {
    // 损坏或不可读的会话不能继续作为认证凭证使用。
  }
  clearStoredSession();
}

/** 返回仍在客户端有效期内的原始 Token，仅供统一 HTTP Client 组装 Bearer Header。 */
export function getAccessToken(): string | undefined {
  initializeAuthSession();
  const current = session.value;
  if (!current || Date.parse(current.expiresAt) <= Date.now()) {
    if (current) clearStoredSession();
    return undefined;
  }
  return current.accessToken;
}

/** 返回当前 Token 的权限快照；空数组表示尚未同步或该 Token 没有任何 authority。 */
export function getAuthorities(): readonly string[] {
  return getAccessToken() && serverValidated.value ? session.value?.authorities ?? [] : [];
}

/**
 * 使用真实 `/auth/me` 校验并补全当前标签页会话。
 * 同一时刻只发送一次请求；临时网络故障保留 Token，401 则由统一请求层清除会话。
 */
export function synchronizeAuthSession(force = false): Promise<void> {
  initializeAuthSession();
  const token = getAccessToken();
  if (!token || (!force && serverValidated.value && session.value?.user && session.value.authorities)) {
    return Promise.resolve();
  }
  if (synchronization) return synchronization;

  const pending = (async () => {
      const response = await requestCurrentSession();
      const current = toCurrentSession(response);
      if (!current) throw new Error('auth.invalid_current_session_response');
      const existing = session.value;
      if (!existing || existing.accessToken !== token) return;
      // 延迟 GET 不覆盖已经由写响应推进的版本。
      if (existing.user && current.user && existing.user.version > current.user.version) return;
      persistSession({ ...existing, ...current }, true);
  })().finally(() => {
    if (synchronization === pending) synchronization = undefined;
  });
  synchronization = pending;
  return synchronization;
}

/** 使用真实 Auth 接口登录，并在当前标签页保存成功签发的 Token。 */
export async function login(request: LoginRequest): Promise<void> {
  initializeAuthSession();
  const response: LoginResponse = await requestLogin(request);
  const nextSession = toSession(response);
  if (!nextSession) {
    throw new Error('auth.invalid_login_response');
  }
  persistSession(nextSession);
  try {
    await synchronizeAuthSession();
  } catch (error) {
    clearStoredSession();
    throw error;
  }
}

/** 将当前 Token 的写响应合并到内存；退出后到达的旧响应不能恢复会话。 */
async function updateCurrentUser(operation: () => Promise<unknown>): Promise<void> {
  const token = getAccessToken();
  if (!token) throw new Error('auth.session_expired');
  const response = await operation();
  const current = toCurrentSession(response);
  if (!current) throw new Error('auth.invalid_current_session_response');
  const existing = session.value;
  if (!existing || existing.accessToken !== token) return;
  if (existing.user && current.user && existing.user.version > current.user.version) return;
  persistSession({ ...existing, ...current }, true);
}

export function updateOwnProfile(request: UpdateOwnProfileRequest): Promise<void> {
  return updateCurrentUser(() => requestUpdateProfile(request));
}

export function changeOwnPassword(request: ChangeOwnPasswordRequest): Promise<void> {
  return updateCurrentUser(() => requestChangePassword(request));
}

/**
 * 注销当前 Token，并无条件清理浏览器凭证。
 * 即使远端注销失败，也不能让当前页面继续复用用户已经要求退出的 Token。
 */
export async function logout(): Promise<void> {
  const token = getAccessToken();
  if (!token) {
    clearStoredSession();
    return;
  }
  try {
    await requestLogout();
  } finally {
    clearStoredSession();
  }
}

/** 清除本地失效会话；由统一 401 处理和测试使用，不调用远端注销。 */
export function clearAuthSession(): void {
  clearStoredSession();
}

/** 获取认证状态；它只表示客户端持有未过期凭证，不等价于服务端最终认证成功。 */
export function useAuthSession() {
  initializeAuthSession();
  return {
    authenticated: computed(() => getAccessToken() !== undefined),
    userId: computed(() => session.value?.user?.userId),
    user: computed(() => session.value?.user),
    authorities: computed(() => getAuthorities()),
    expiresAt: computed(() => session.value?.expiresAt),
    initialized: readonly(initialized),
  };
}
