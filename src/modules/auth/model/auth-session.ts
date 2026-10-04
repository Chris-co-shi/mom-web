import { computed, readonly, ref } from 'vue';
import { login as requestLogin, logout as requestLogout, type LoginRequest, type LoginResponse } from '../api/auth-api';

export const AUTH_SESSION_STORAGE_KEY = 'mom.auth.session';

interface AuthSession {
  accessToken: string;
  tokenType: 'Bearer';
  expiresAt: string;
}

const session = ref<AuthSession>();
const initialized = ref(false);

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
  return {
    accessToken: value.accessToken,
    tokenType: 'Bearer',
    expiresAt: value.expiresAt as string,
  };
}

function clearStoredSession(): void {
  session.value = undefined;
  try {
    window.sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
  } catch {
    // 浏览器禁用存储时仍需清理内存中的认证状态。
  }
}

function persistSession(nextSession: AuthSession): void {
  try {
    window.sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(nextSession));
  } catch {
    // sessionStorage 不可用时不保留仅存于内存的 Token，避免刷新后出现不可解释的半会话。
    throw new Error('auth.session_storage_unavailable');
  }
  session.value = nextSession;
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

/** 使用真实 Auth 接口登录，并在当前标签页保存成功签发的 Token。 */
export async function login(request: LoginRequest): Promise<void> {
  const response: LoginResponse = await requestLogin(request);
  const nextSession = toSession(response);
  if (!nextSession) {
    throw new Error('auth.invalid_login_response');
  }
  persistSession(nextSession);
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
    expiresAt: computed(() => session.value?.expiresAt),
    initialized: readonly(initialized),
  };
}
