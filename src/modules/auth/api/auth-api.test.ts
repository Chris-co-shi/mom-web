import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setHttpRequestContextProvider } from '../../../shared/api/http-client';
import { login, logout } from './auth-api';

function resultResponse(data: unknown): Response {
  return new Response(JSON.stringify({ code: '0', message: 'success', data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('authApi', () => {
  beforeEach(() => {
    setHttpRequestContextProvider(() => ({ locale: 'zh-CN', accessToken: 'opaque-token' }));
  });

  it('通过 Gateway auth path 发送真实登录契约且不改写密码', async () => {
    const fetchMock = vi.fn().mockResolvedValue(resultResponse({
      accessToken: 'issued-token',
      tokenType: 'Bearer',
      expiresAt: '2099-01-01T00:00:00Z',
    }));
    vi.stubGlobal('fetch', fetchMock);

    await login({ username: ' Admin ', password: ' Password With Spaces ' });

    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/auth/login');
    expect(request.method).toBe('POST');
    expect(JSON.parse(request.body as string)).toEqual({
      username: ' Admin ',
      password: ' Password With Spaces ',
    });
  });

  it('退出请求携带统一请求上下文中的 Bearer Token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(resultResponse(null));
    vi.stubGlobal('fetch', fetchMock);

    await logout();

    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/auth/logout');
    expect(request.method).toBe('POST');
    expect(new Headers(request.headers).get('Authorization')).toBe('Bearer opaque-token');
  });
});
