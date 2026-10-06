import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setHttpRequestContextProvider } from '../../../shared/api/http-client';
import { changeOwnPassword, getCurrentSession, login, logout, updateOwnProfile } from './auth-api';

function resultResponse(data: unknown): Response {
  return new Response(JSON.stringify({ code: '0', message: 'success', data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('authApi', () => {
  it('自助写接口沿用统一 Gateway 前缀，不发送目标用户并保留密码原文', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(resultResponse(null)));
    vi.stubGlobal('fetch', fetchMock);
    await updateOwnProfile({ displayName: 'Name', version: 3 });
    await changeOwnPassword({ currentPassword: ' old secret ', newPassword: ' new secret ', version: 4 });
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual(['/api/auth/me/profile', '/api/auth/me/password']);
    expect(fetchMock.mock.calls.every((call) => (call[1] as RequestInit).method === 'PUT')).toBe(true);
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({ currentPassword: ' old secret ', newPassword: ' new secret ', version: 4 });
  });
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
    expect(url).toBe('/api/auth/login');
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
    expect(url).toBe('/api/auth/logout');
    expect(request.method).toBe('POST');
    expect(new Headers(request.headers).get('Authorization')).toBe('Bearer opaque-token');
  });

  it('通过 Gateway auth path 读取当前 Token 快照', async () => {
    const fetchMock = vi.fn().mockResolvedValue(resultResponse({
        user: { userId: '1900000000000000001', username: 'test-user', displayName: '测试用户', version: 3 },
        authorization: { authorities: ['auth:user:read'] },
        session: { expiresAt: '2099-01-01T00:00:00Z' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await getCurrentSession();

    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/auth/me');
    expect(request.method).toBe('GET');
    expect(new Headers(request.headers).get('Authorization')).toBe('Bearer opaque-token');
  });
});
