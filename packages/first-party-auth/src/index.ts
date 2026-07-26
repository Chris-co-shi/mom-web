export type FirstPartyWebClientId =
  | 'mom-admin-web'
  | 'mom-supplier-web'
  | 'mom-customer-web';

export interface BrowserSessionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface FirstPartyTokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  sessionId: string;
  accessExpiresAt: string;
  sessionExpiresAt: string;
}

interface StoredTokenSet {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  sessionId: string;
  accessExpiresAt: number;
  sessionExpiresAt: number;
}

export interface FirstPartyAuthSnapshot {
  status: 'anonymous' | 'authenticated' | 'refreshing' | 'error';
  accessExpiresAt?: number;
  sessionExpiresAt?: number;
  error?: string;
}

export interface LoginCommand {
  username: string;
  password: string;
  deviceName?: string;
}

export interface RequiredPasswordChangeCommand {
  username: string;
  currentPassword: string;
  newPassword: string;
  confirmation: string;
  deviceName?: string;
}

export interface FirstPartyAuthRuntimeConfig {
  clientId: FirstPartyWebClientId;
  baseUrl?: string;
  storage?: BrowserSessionStorage;
  fetcher?: typeof fetch;
  now?: () => number;
}

export interface FirstPartyAuthRuntime {
  snapshot(): Readonly<FirstPartyAuthSnapshot>;
  subscribe(listener: (snapshot: Readonly<FirstPartyAuthSnapshot>) => void): () => void;
  restore(): boolean;
  hasUsableAccessToken(): boolean;
  getAccessToken(): string | undefined;
  login(command: LoginCommand): Promise<string>;
  changeRequiredPassword(command: RequiredPasswordChangeCommand): Promise<string>;
  refresh(): Promise<string>;
  logout(): Promise<void>;
  clear(): void;
}

const ACCESS_EXPIRY_SKEW_MS = 30_000;

/**
 * 创建 MOM Web 第一方认证运行时。
 *
 * Token 仅写入当前标签页的 sessionStorage，不进入 localStorage、Cookie、URL、日志或 Pinia。
 * 这满足当前“不引入 BFF”的产品边界，但仍要求应用保持严格 CSP、依赖治理和 XSS 防护。
 */
export function createFirstPartyAuthRuntime(
  config: FirstPartyAuthRuntimeConfig,
): FirstPartyAuthRuntime {
  const fetcher = config.fetcher ?? globalThis.fetch.bind(globalThis);
  const storage = config.storage ?? globalThis.sessionStorage;
  const now = config.now ?? Date.now;
  const baseUrl = trimTrailingSlash(config.baseUrl ?? '');
  const storageKey = `mom.auth.session.${config.clientId}`;
  const listeners = new Set<(snapshot: Readonly<FirstPartyAuthSnapshot>) => void>();
  let tokens: StoredTokenSet | undefined;
  let refreshFlight: Promise<string> | undefined;
  let state: FirstPartyAuthSnapshot = Object.freeze({ status: 'anonymous' });

  const publish = (next: FirstPartyAuthSnapshot): void => {
    state = Object.freeze({ ...next });
    for (const listener of listeners) listener(state);
  };

  const persist = (next: StoredTokenSet): void => {
    tokens = Object.freeze({ ...next });
    storage.setItem(storageKey, JSON.stringify(tokens));
    publish({
      status: 'authenticated',
      accessExpiresAt: tokens.accessExpiresAt,
      sessionExpiresAt: tokens.sessionExpiresAt,
    });
  };

  const clear = (): void => {
    tokens = undefined;
    refreshFlight = undefined;
    storage.removeItem(storageKey);
    publish({ status: 'anonymous' });
  };

  const restore = (): boolean => {
    const raw = storage.getItem(storageKey);
    if (!raw) {
      clear();
      return false;
    }
    try {
      const parsed = JSON.parse(raw) as Partial<StoredTokenSet>;
      if (!isStoredTokenSet(parsed) || parsed.sessionExpiresAt <= now()) {
        clear();
        return false;
      }
      tokens = Object.freeze(parsed as StoredTokenSet);
      publish({
        status: 'authenticated',
        accessExpiresAt: tokens.accessExpiresAt,
        sessionExpiresAt: tokens.sessionExpiresAt,
      });
      return true;
    }
    catch {
      clear();
      return false;
    }
  };

  const accept = (response: FirstPartyTokenResponse): string => {
    const accessExpiresAt = Date.parse(response.accessExpiresAt);
    const sessionExpiresAt = Date.parse(response.sessionExpiresAt);
    if (
      !response.accessToken
      || !response.refreshToken
      || response.tokenType !== 'Bearer'
      || !response.sessionId
      || !Number.isFinite(accessExpiresAt)
      || !Number.isFinite(sessionExpiresAt)
      || accessExpiresAt <= now()
      || sessionExpiresAt <= accessExpiresAt
    ) {
      throw new FirstPartyAuthError(
        'IAM 返回的 Token 数据不完整',
        'invalid_token_response',
        502,
      );
    }
    persist({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      tokenType: 'Bearer',
      sessionId: response.sessionId,
      accessExpiresAt,
      sessionExpiresAt,
    });
    return response.accessToken;
  };

  const login = async (command: LoginCommand): Promise<string> => {
    requireText(command.username, 'username');
    requireText(command.password, 'password');
    try {
      const response = await post<FirstPartyTokenResponse>(
        fetcher,
        `${baseUrl}/api/iam/auth/login`,
        {
          username: command.username,
          password: command.password,
          clientId: config.clientId,
          deviceName: command.deviceName ?? browserDeviceName(),
        },
      );
      return accept(response);
    }
    catch (error) {
      const normalized = normalizeError(error);
      publish({ status: 'error', error: normalized.message });
      throw normalized;
    }
  };

  const changeRequiredPassword = async (
    command: RequiredPasswordChangeCommand,
  ): Promise<string> => {
    requireText(command.username, 'username');
    requireText(command.currentPassword, 'currentPassword');
    requireText(command.newPassword, 'newPassword');
    requireText(command.confirmation, 'confirmation');
    try {
      const response = await post<FirstPartyTokenResponse>(
        fetcher,
        `${baseUrl}/api/iam/auth/password/change-required`,
        {
          username: command.username,
          currentPassword: command.currentPassword,
          newPassword: command.newPassword,
          confirmation: command.confirmation,
          clientId: config.clientId,
          deviceName: command.deviceName ?? browserDeviceName(),
        },
      );
      return accept(response);
    }
    catch (error) {
      const normalized = normalizeError(error);
      publish({ status: 'error', error: normalized.message });
      throw normalized;
    }
  };

  const refresh = async (): Promise<string> => {
    if (refreshFlight) return refreshFlight;
    if (!tokens?.refreshToken || tokens.sessionExpiresAt <= now()) {
      clear();
      throw new FirstPartyAuthError('当前会话已结束', 'missing_refresh_token', 401);
    }
    const refreshToken = tokens.refreshToken;
    refreshFlight = (async () => {
      publish({
        status: 'refreshing',
        accessExpiresAt: tokens?.accessExpiresAt,
        sessionExpiresAt: tokens?.sessionExpiresAt,
      });
      try {
        const response = await post<FirstPartyTokenResponse>(
          fetcher,
          `${baseUrl}/api/iam/auth/refresh`,
          { clientId: config.clientId, refreshToken },
        );
        return accept(response);
      }
      catch (error) {
        const normalized = normalizeError(error);
        clear();
        publish({ status: 'error', error: normalized.message });
        throw normalized;
      }
      finally {
        refreshFlight = undefined;
      }
    })();
    return refreshFlight;
  };

  const logout = async (): Promise<void> => {
    const accessToken = tokens?.accessToken;
    try {
      if (accessToken) {
        await post<Record<string, unknown>>(
          fetcher,
          `${baseUrl}/api/iam/auth/logout`,
          {},
          { Authorization: `Bearer ${accessToken}` },
        );
      }
    }
    finally {
      clear();
    }
  };

  restore();

  return {
    snapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
    },
    restore,
    hasUsableAccessToken: () => Boolean(
      tokens
      && tokens.sessionExpiresAt > now()
      && tokens.accessExpiresAt - ACCESS_EXPIRY_SKEW_MS > now(),
    ),
    getAccessToken: () => (
      tokens
      && tokens.sessionExpiresAt > now()
      && tokens.accessExpiresAt - ACCESS_EXPIRY_SKEW_MS > now()
        ? tokens.accessToken
        : undefined
    ),
    login,
    changeRequiredPassword,
    refresh,
    logout,
    clear,
  };
}

export class FirstPartyAuthError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'FirstPartyAuthError';
  }
}

async function post<T>(
  fetcher: typeof fetch,
  url: string,
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
): Promise<T> {
  const response = await fetcher(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json;charset=UTF-8',
      ...headers,
    },
    body: JSON.stringify(body),
    credentials: 'omit',
    cache: 'no-store',
  });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new FirstPartyAuthError(
      stringField(payload, 'message') ?? '认证请求失败',
      stringField(payload, 'error') ?? `auth_http_${response.status}`,
      response.status,
    );
  }
  return payload as T;
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    const payload = await response.json();
    return payload && typeof payload === 'object'
      ? payload as Record<string, unknown>
      : {};
  }
  catch {
    return {};
  }
}

function isStoredTokenSet(value: Partial<StoredTokenSet>): value is StoredTokenSet {
  return typeof value.accessToken === 'string'
    && typeof value.refreshToken === 'string'
    && value.tokenType === 'Bearer'
    && typeof value.sessionId === 'string'
    && typeof value.accessExpiresAt === 'number'
    && Number.isFinite(value.accessExpiresAt)
    && typeof value.sessionExpiresAt === 'number'
    && Number.isFinite(value.sessionExpiresAt);
}

function requireText(value: string, field: string): void {
  if (!value?.trim()) {
    throw new FirstPartyAuthError(`${field} 不能为空`, 'invalid_authentication_request', 400);
  }
}

function browserDeviceName(): string | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const value = navigator.userAgent?.trim();
  return value ? value.slice(0, 120) : undefined;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/u, '');
}

function stringField(payload: Record<string, unknown>, name: string): string | undefined {
  const value = payload[name];
  return typeof value === 'string' && value ? value : undefined;
}

function normalizeError(error: unknown): FirstPartyAuthError {
  return error instanceof FirstPartyAuthError
    ? error
    : new FirstPartyAuthError(
      error instanceof Error ? error.message : '认证请求失败',
      'authentication_failed',
      500,
    );
}
