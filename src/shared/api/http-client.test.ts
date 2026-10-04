import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './errors';
import { httpClient, setHttpRequestContextProvider, setHttpUnauthorizedHandler } from './http-client';
import { setLocale } from '../i18n/locale';

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  return new Response(JSON.stringify(body), { ...init, headers });
}

describe('httpClient', () => {
  beforeEach(() => {
    setLocale('zh-CN');
    setHttpRequestContextProvider(() => ({ locale: 'zh-CN', accessToken: 'opaque-token' }));
    setHttpUnauthorizedHandler(() => undefined);
  });

  it('拆包 Result<T> 并附加协议 Header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      code: '0',
      message: 'success',
      data: { id: '9223372036854775807' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(httpClient.result<{ id: string }>({
      path: '/auth/users',
      query: { pageNo: 1, ignored: undefined },
    })).resolves.toEqual({ id: '9223372036854775807' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(request.headers);
    expect(url).toBe('/auth/users?pageNo=1');
    expect(headers.get('Authorization')).toBe('Bearer opaque-token');
    expect(headers.get('Accept-Language')).toBe('zh-CN');
    expect(headers.get('X-Correlation-Id')).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('把 409 Result 错误映射为稳定冲突对象', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      code: 'optimistic_lock_conflict',
      message: '数据已经变化',
      data: [{ field: 'version', code: 'stale', message: '版本已过期' }],
    }, {
      status: 409,
      headers: { 'X-Correlation-Id': 'corr-409' },
    })));

    const error = await httpClient.result({ path: '/api/system/dictionaries/1' })
      .catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      kind: 'conflict',
      status: 409,
      code: 'optimistic_lock_conflict',
      correlationId: 'corr-409',
      retryable: false,
      fieldErrors: [{ field: 'version', code: 'stale', message: '版本已过期' }],
    });
  });

  it('收到 401 时触发唯一认证失效入口', async () => {
    const unauthorized = vi.fn();
    setHttpUnauthorizedHandler(unauthorized);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      code: 'invalid_token',
      message: 'token expired',
      data: null,
    }, { status: 401 })));

    await expect(httpClient.result({ path: '/auth/users' })).rejects.toMatchObject({
      kind: 'unauthenticated',
      status: 401,
    });
    expect(unauthorized).toHaveBeenCalledTimes(1);
  });

  it('写请求网络中断只发送一次并标记结果未知', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('network down'));
    vi.stubGlobal('fetch', fetchMock);

    const error = await httpClient.result({
      path: '/auth/users',
      method: 'POST',
      body: { username: 'operator' },
    }).catch((cause: unknown) => cause);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(error).toMatchObject({
      kind: 'network',
      retryable: false,
      resultUnknown: true,
    });
  });

  it('GET 超时可以由调用方决定是否显式重试', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url: string, request: RequestInit) => new Promise((_resolve, reject) => {
      request.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    })));

    const request = httpClient.result({ path: '/api/system/i18n/locales', timeoutMs: 50 });
    const assertion = expect(request).rejects.toMatchObject({
      kind: 'timeout',
      retryable: true,
      resultUnknown: false,
    });
    await vi.advanceTimersByTimeAsync(50);
    await assertion;
  });
});
