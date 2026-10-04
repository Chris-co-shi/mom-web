import type { ApiFieldError, ApiResult } from './contracts';
import { API_TIMEOUT_MS, resolveApiUrl } from './config';
import { ApiError } from './errors';
import { translate } from '../i18n/locale';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type QueryValue = string | number | boolean | null | undefined;

export interface HttpRequestContext {
  accessToken?: string;
  locale?: string;
}

export interface HttpRequestOptions {
  path: string;
  method?: HttpMethod;
  query?: Readonly<Record<string, QueryValue>>;
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
  timeoutMs?: number;
}

type RequestContextProvider = () => HttpRequestContext;
type UnauthorizedHandler = () => void;

interface ParsedErrorBody {
  code?: string;
  message?: string;
  correlationId?: string;
  fieldErrors: ApiFieldError[];
}

let requestContextProvider: RequestContextProvider = () => ({
  locale: document.documentElement.lang || navigator.language,
});
let unauthorizedHandler: UnauthorizedHandler = () => undefined;

/**
 * 为唯一 HTTP Client 接入认证与 Locale 上下文。
 * Provider 只在发起请求时读取，P2/P5 可接线，页面不应直接操作 Token。
 */
export function setHttpRequestContextProvider(provider: RequestContextProvider): void {
  requestContextProvider = provider;
}

/** 注册统一 401 处理入口；请求层不反向依赖具体认证模块或路由实现。 */
export function setHttpUnauthorizedHandler(handler: UnauthorizedHandler): void {
  unauthorizedHandler = handler;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isApiResult(value: unknown): value is ApiResult<unknown> {
  return isRecord(value) && typeof value.code === 'string' && typeof value.message === 'string' && 'data' in value;
}

function toFieldErrors(value: unknown): ApiFieldError[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.field !== 'string' || typeof item.message !== 'string') {
      return [];
    }
    return [{
      field: item.field,
      code: typeof item.code === 'string' ? item.code : 'invalid',
      message: item.message,
    }];
  });
}

function buildUrl(path: string, query?: Readonly<Record<string, QueryValue>>): string {
  const url = resolveApiUrl(path);
  if (!query) {
    return url;
  }
  const search = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      search.set(key, String(value));
    }
  });
  const serialized = search.toString();
  return serialized ? `${url}?${serialized}` : url;
}

function createCorrelationId(): string {
  return globalThis.crypto.randomUUID();
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined;
  }
  const text = await response.text();
  if (!text) {
    return undefined;
  }
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('json')) {
    return text;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch (cause) {
    throw new ApiError(translate('error.invalidJson'), {
      kind: 'protocol',
      code: 'client.invalid_json',
      status: response.status,
      correlationId: response.headers.get('X-Correlation-Id') ?? undefined,
      cause,
    });
  }
}

function readErrorBody(body: unknown): ParsedErrorBody {
  if (!isRecord(body)) {
    return { fieldErrors: [] };
  }
  const resultData = 'data' in body ? body.data : undefined;
  return {
    code: typeof body.code === 'string'
      ? body.code
      : typeof body.error === 'string' ? body.error : undefined,
    message: typeof body.message === 'string'
      ? body.message
      : typeof body.detail === 'string' ? body.detail : typeof body.title === 'string' ? body.title : undefined,
    correlationId: typeof body.correlationId === 'string' ? body.correlationId : undefined,
    fieldErrors: toFieldErrors(body.fieldErrors).concat(toFieldErrors(resultData)),
  };
}

function kindForStatus(status: number): ApiError['kind'] {
  if (status === 401) return 'unauthenticated';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 409) return 'conflict';
  if (status === 400 || status === 422) return 'validation';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server';
  return 'http';
}

function fallbackMessage(status: number): string {
  if (status === 401) return translate('error.unauthenticated');
  if (status === 403) return translate('error.forbidden');
  if (status === 404) return translate('error.notFound');
  if (status === 409) return translate('error.conflict');
  if (status === 429) return translate('error.rateLimited');
  if (status >= 500) return translate('error.server');
  return translate('error.requestFailed');
}

function toHttpError(response: Response, body: unknown, method: HttpMethod): ApiError {
  const parsed = readErrorBody(body);
  const correlationId = response.headers.get('X-Correlation-Id') ?? parsed.correlationId;
  const safeMethod = method === 'GET';
  return new ApiError(parsed.message ?? fallbackMessage(response.status), {
    kind: kindForStatus(response.status),
    code: parsed.code ?? `http.${response.status}`,
    status: response.status,
    correlationId: correlationId ?? undefined,
    fieldErrors: parsed.fieldErrors,
    retryable: safeMethod && (response.status === 429 || response.status >= 500),
  });
}

async function execute(options: HttpRequestOptions): Promise<{ response: Response; body: unknown }> {
  const method = options.method ?? 'GET';
  const context = requestContextProvider();
  const headers = new Headers(options.headers);
  const controller = new AbortController();
  let timedOut = false;
  const timeoutMs = options.timeoutMs ?? API_TIMEOUT_MS;
  const timeout = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const cancel = () => controller.abort();
  if (options.signal?.aborted) {
    controller.abort();
  } else {
    options.signal?.addEventListener('abort', cancel, { once: true });
  }

  headers.set('Accept', 'application/json');
  headers.set('X-Correlation-Id', createCorrelationId());
  if (context.locale) headers.set('Accept-Language', context.locale);
  if (context.accessToken) headers.set('Authorization', `Bearer ${context.accessToken}`);
  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(buildUrl(options.path, options.query), {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
    const body = await parseBody(response);
    if (!response.ok) {
      if (response.status === 401) unauthorizedHandler();
      throw toHttpError(response, body, method);
    }
    return { response, body };
  } catch (cause) {
    if (cause instanceof ApiError) throw cause;
    if (timedOut) {
      throw new ApiError(
        method === 'GET' ? translate('error.timeoutRead') : translate('error.timeoutWrite'),
        {
          kind: 'timeout',
          code: 'client.timeout',
          retryable: method === 'GET',
          resultUnknown: method !== 'GET',
          cause,
        },
      );
    }
    if (options.signal?.aborted) {
      throw new ApiError(translate('error.cancelled'), { kind: 'cancelled', code: 'client.cancelled', cause });
    }
    throw new ApiError(
      method === 'GET' ? translate('error.networkRead') : translate('error.networkWrite'),
      {
        kind: 'network',
        code: 'client.network_error',
        retryable: method === 'GET',
        resultUnknown: method !== 'GET',
        cause,
      },
    );
  } finally {
    window.clearTimeout(timeout);
    options.signal?.removeEventListener('abort', cancel);
  }
}

/** 全应用唯一请求入口；不包含任何自动重试。 */
export const httpClient = {
  async result<T>(options: HttpRequestOptions): Promise<T> {
    const { response, body } = await execute(options);
    if (!isApiResult(body)) {
      throw new ApiError(translate('error.invalidResult'), {
        kind: 'protocol',
        code: 'client.invalid_result',
        status: response.status,
        correlationId: response.headers.get('X-Correlation-Id') ?? undefined,
      });
    }
    if (body.code !== '0') {
      const parsed = readErrorBody(body);
      throw new ApiError(body.message || translate('error.businessFailed'), {
        kind: 'business',
        code: body.code,
        status: response.status,
        correlationId: response.headers.get('X-Correlation-Id') ?? undefined,
        fieldErrors: parsed.fieldErrors,
      });
    }
    return body.data as T;
  },

  async json<T>(options: HttpRequestOptions): Promise<T> {
    const { body } = await execute(options);
    return body as T;
  },

  async void(options: HttpRequestOptions): Promise<void> {
    await execute(options);
  },
};
