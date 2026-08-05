export interface RequestContext {
  accessToken?: string;
  correlationId?: string;
  factoryId?: string;
}

export interface ApiClientOptions {
  baseUrl: string;
  getContext?: () => RequestContext;
  refreshAccessToken?: () => Promise<string>;
  refreshAuthorization?: () => Promise<void>;
  onAuthenticationRequired?: (error: unknown) => void | Promise<void>;
  onForbidden?: (error: MomApiError) => void | Promise<void>;
  onWriteAuthorizationChanged?: (error: MomApiError) => void | Promise<void>;
  fetcher?: typeof fetch;
  timeoutMs?: number;
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: BodyInit | object | null;
  idempotencyKey?: string;
  notifyForbidden?: boolean;
  timeoutMs?: number;
  retryAuthorization?: boolean;
  retryAuthentication?: boolean;
}

export interface ApiResponse<T> {
  status: number;
  headers: Readonly<Record<string, string>>;
  data?: T;
}

export interface ApiErrorPayload {
  code?: string;
  message?: string;
  error?: string;
  [key: string]: unknown;
}

export class MomApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly correlationId?: string,
    readonly retryAfterSeconds?: number,
    readonly payload?: ApiErrorPayload,
  ) {
    super(message);
    this.name = 'MomApiError';
  }
}

export class MomNetworkError extends Error {
  constructor(
    message: string,
    readonly correlationId: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'MomNetworkError';
  }
}

export interface ApiClient {
  request<T>(path: string, options?: ApiRequestOptions): Promise<T>;
  conditionalGet<T>(path: string, options?: ApiRequestOptions): Promise<ApiResponse<T>>;
  get<T>(path: string, options?: ApiRequestOptions): Promise<T>;
  post<T>(path: string, body?: ApiRequestOptions['body'], options?: ApiRequestOptions): Promise<T>;
  put<T>(path: string, body?: ApiRequestOptions['body'], options?: ApiRequestOptions): Promise<T>;
  delete<T>(path: string, options?: ApiRequestOptions): Promise<T>;
  download(path: string, options?: ApiRequestOptions): Promise<Blob>;
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
  const baseUrl = options.baseUrl.replace(/\/+$/u, '');
  let refreshFlight: Promise<string> | undefined;
  let authorizationFlight: Promise<void> | undefined;

  async function refreshOnce(): Promise<string> {
    if (!options.refreshAccessToken) {
      throw new MomApiError('Authentication refresh is unavailable', 401, 'authentication_required');
    }
    refreshFlight ??= options.refreshAccessToken().finally(() => {
      refreshFlight = undefined;
    });
    return refreshFlight;
  }

  async function request<T>(path: string, requestOptions: ApiRequestOptions = {}): Promise<T> {
    const response = await execute(path, requestOptions, false, false, false);
    return readSuccess<T>(response);
  }

  async function conditionalGet<T>(
    path: string,
    requestOptions: ApiRequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const response = await execute(
      path,
      { ...requestOptions, method: 'GET' },
      false,
      false,
      true,
    );
    return Object.freeze({
      status: response.status,
      headers: responseHeaders(response),
      ...(response.status === 304 ? {} : { data: await readSuccess<T>(response) }),
    });
  }

  async function execute(
    path: string,
    requestOptions: ApiRequestOptions,
    authenticationRetried: boolean,
    authorizationRetried: boolean,
    acceptNotModified: boolean,
  ): Promise<Response> {
    const context = options.getContext?.() ?? {};
    const correlationId = context.correlationId?.trim() || crypto.randomUUID();
    const headers = new Headers(requestOptions.headers);
    headers.set('Accept', headers.get('Accept') ?? 'application/json');
    headers.set('X-Correlation-Id', correlationId);
    if (context.accessToken) headers.set('Authorization', `Bearer ${context.accessToken}`);
    if (context.factoryId) headers.set('X-Factory-Id', context.factoryId);
    if (requestOptions.idempotencyKey) headers.set('Idempotency-Key', requestOptions.idempotencyKey);

    let body = requestOptions.body;
    if (body !== undefined && body !== null && isJsonBody(body)) {
      if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
      body = JSON.stringify(body);
    }

    const timeoutMs = requestOptions.timeoutMs ?? options.timeoutMs ?? 15_000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort('timeout'), timeoutMs);
    const externalSignal = requestOptions.signal;
    const abortFromExternal = () => controller.abort(externalSignal?.reason);
    externalSignal?.addEventListener('abort', abortFromExternal, { once: true });
    const requestUrl = joinUrl(baseUrl, path);

    let response: Response;
    try {
      const {
        body: _body,
        idempotencyKey: _idempotencyKey,
        notifyForbidden: _notifyForbidden,
        retryAuthentication: _retryAuthentication,
        retryAuthorization: _retryAuthorization,
        timeoutMs: _timeoutMs,
        ...requestInit
      } = requestOptions;
      response = await fetcher(requestUrl, {
        ...requestInit,
        body: body as BodyInit | null | undefined,
        headers,
        signal: controller.signal,
        credentials: 'omit',
      });
    }
    catch (error) {
      const message = controller.signal.aborted
        ? 'MOM API request timed out'
        : 'MOM API network request failed';
      throw new MomNetworkError(message, correlationId, { cause: error });
    }
    finally {
      clearTimeout(timer);
      externalSignal?.removeEventListener('abort', abortFromExternal);
    }

    if (response.status === 401
      && !authenticationRetried
      && requestOptions.retryAuthentication !== false) {
      try {
        await refreshOnce();
      }
      catch (error) {
        await options.onAuthenticationRequired?.(error);
        throw error;
      }
      return execute(path, requestOptions, true, authorizationRetried, acceptNotModified);
    }

    if (response.status === 403) {
      const error = await toApiError(response, correlationId);
      if (
        !authorizationRetried
        && requestOptions.retryAuthorization !== false
        && options.refreshAuthorization
      ) {
        await refreshAuthorizationOnce();
        if (isReadOnlyMethod(requestOptions.method)) {
          return execute(
            path,
            requestOptions,
            authenticationRetried,
            true,
            acceptNotModified,
          );
        }
        const changed = new MomApiError(
          '权限已发生变化，请确认后重新操作',
          403,
          'authorization_changed_retry_required',
          error.correlationId,
          error.retryAfterSeconds,
          error.payload,
        );
        await options.onWriteAuthorizationChanged?.(changed);
        throw changed;
      }
      if (requestOptions.notifyForbidden !== false) {
        await options.onForbidden?.(error);
      }
      throw error;
    }

    if (!response.ok && !(acceptNotModified && response.status === 304)) {
      const error = await toApiError(response, correlationId);
      if (response.status === 401) await options.onAuthenticationRequired?.(error);
      throw error;
    }
    return response;
  }

  async function refreshAuthorizationOnce(): Promise<void> {
    authorizationFlight ??= Promise.resolve(
      options.refreshAuthorization?.(),
    ).finally(() => {
      authorizationFlight = undefined;
    });
    return authorizationFlight;
  }

  return {
    request,
    conditionalGet,
    get: (path, requestOptions = {}) => request(path, { ...requestOptions, method: 'GET' }),
    post: (path, body, requestOptions = {}) => request(path, { ...requestOptions, method: 'POST', body }),
    put: (path, body, requestOptions = {}) => request(path, { ...requestOptions, method: 'PUT', body }),
    delete: (path, requestOptions = {}) => request(path, { ...requestOptions, method: 'DELETE' }),
    download: async (path, requestOptions = {}) => {
      const context = options.getContext?.() ?? {};
      const correlationId = context.correlationId?.trim() || crypto.randomUUID();
      const headers = new Headers(requestOptions.headers);
      headers.set('Accept', '*/*');
      headers.set('X-Correlation-Id', correlationId);
      if (context.accessToken) headers.set('Authorization', `Bearer ${context.accessToken}`);
      if (context.factoryId) headers.set('X-Factory-Id', context.factoryId);
      const {
        body: _body,
        idempotencyKey: _idempotencyKey,
        notifyForbidden: _notifyForbidden,
        timeoutMs: _timeoutMs,
        retryAuthorization: _retryAuthorization,
        retryAuthentication: _retryAuthentication,
        ...downloadInit
      } = requestOptions;
      const response = await fetcher(joinUrl(baseUrl, path), {
        ...downloadInit,
        method: requestOptions.method ?? 'GET',
        headers,
        credentials: 'omit',
      });
      if (!response.ok) throw await toApiError(response, correlationId);
      return response.blob();
    },
  };
}

function responseHeaders(response: Response): Readonly<Record<string, string>> {
  const headers: Record<string, string> = {};
  for (const name of ['cache-control', 'etag', 'x-correlation-id']) {
    const value = response.headers.get(name);
    if (value !== null) headers[name] = value;
  }
  return Object.freeze(headers);
}

async function readSuccess<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get('Content-Type')?.toLowerCase() ?? '';
  if (contentType.includes('application/json') || contentType.includes('+json')) {
    return response.json() as Promise<T>;
  }
  return response.text() as Promise<T>;
}

async function toApiError(response: Response, fallbackCorrelationId: string): Promise<MomApiError> {
  const contentType = response.headers.get('Content-Type')?.toLowerCase() ?? '';
  let payload: ApiErrorPayload | undefined;
  if (contentType.includes('application/json') || contentType.includes('+json')) {
    try {
      payload = await response.json() as ApiErrorPayload;
    }
    catch {
      payload = undefined;
    }
  }
  const correlationId = response.headers.get('X-Correlation-Id') ?? fallbackCorrelationId;
  const code = stringValue(payload?.code) ?? stringValue(payload?.error) ?? `http_${response.status}`;
  const message = stringValue(payload?.message) ?? defaultMessage(response.status);
  return new MomApiError(
    message,
    response.status,
    code,
    correlationId,
    parseRetryAfter(response.headers.get('Retry-After')),
    payload,
  );
}

function defaultMessage(status: number): string {
  if (status === 401) return 'Authentication is required or the session was revoked';
  if (status === 403) return 'The current user is not allowed to perform this operation';
  if (status === 404) return 'The requested resource is unavailable';
  if (status === 409) return 'The resource changed or the command result is uncertain';
  if (status === 429) return 'Too many requests';
  if (status >= 500) return 'MOM service is temporarily unavailable';
  return `MOM API request failed with HTTP ${status}`;
}

function joinUrl(baseUrl: string, path: string): string {
  if (/^https?:\/\//u.test(path)) throw new TypeError('ApiClient only accepts Gateway-relative paths');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

function isJsonBody(value: unknown): value is Record<string, unknown> | unknown[] {
  if (Array.isArray(value)) return true;
  if (!value || typeof value !== 'object') return false;
  return !(value instanceof Blob)
    && !(value instanceof FormData)
    && !(value instanceof URLSearchParams)
    && !(value instanceof ArrayBuffer)
    && !ArrayBuffer.isView(value);
}

function isReadOnlyMethod(method: string | undefined): boolean {
  const normalized = (method ?? 'GET').toUpperCase();
  return normalized === 'GET' || normalized === 'HEAD';
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds;
  const at = Date.parse(value);
  return Number.isNaN(at) ? undefined : Math.max(0, Math.ceil((at - Date.now()) / 1000));
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
