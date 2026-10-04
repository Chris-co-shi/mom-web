import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setHttpRequestContextProvider } from '../../../shared/api/http-client';

function resultResponse(data: unknown): Response {
  return new Response(JSON.stringify({ code: '0', message: 'success', data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('authSession', () => {
  beforeEach(() => {
    vi.resetModules();
    window.sessionStorage.clear();
  });

  it('登录后只在 sessionStorage 保存服务端会话字段', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resultResponse({
      accessToken: 'issued-token',
      tokenType: 'Bearer',
      expiresAt: '2099-01-01T00:00:00Z',
    })));
    const authSession = await import('./auth-session');

    await authSession.login({ username: 'test-user', password: 'Case Sensitive Test Value' });

    expect(authSession.getAccessToken()).toBe('issued-token');
    const stored = window.sessionStorage.getItem(authSession.AUTH_SESSION_STORAGE_KEY) ?? '';
    expect(stored).toContain('issued-token');
    expect(stored).not.toContain('test-user');
    expect(stored).not.toContain('Case Sensitive Test Value');
  });

  it('恢复时清除过期或损坏的会话', async () => {
    window.sessionStorage.setItem('mom.auth.session', JSON.stringify({
      accessToken: 'expired-token',
      tokenType: 'Bearer',
      expiresAt: '2000-01-01T00:00:00Z',
    }));
    const authSession = await import('./auth-session');

    expect(authSession.getAccessToken()).toBeUndefined();
    expect(window.sessionStorage.getItem(authSession.AUTH_SESSION_STORAGE_KEY)).toBeNull();
  });

  it('远端退出失败时仍清除当前标签页凭证并继续抛出错误', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(resultResponse({
        accessToken: 'issued-token',
        tokenType: 'Bearer',
        expiresAt: '2099-01-01T00:00:00Z',
      }))
      .mockRejectedValueOnce(new TypeError('network down'));
    vi.stubGlobal('fetch', fetchMock);
    const authSession = await import('./auth-session');
    setHttpRequestContextProvider(() => ({ accessToken: authSession.getAccessToken(), locale: 'zh-CN' }));
    await authSession.login({ username: 'test-user', password: 'Case Sensitive Test Value' });

    await expect(authSession.logout()).rejects.toMatchObject({ kind: 'network' });
    expect(authSession.getAccessToken()).toBeUndefined();
    expect(window.sessionStorage.getItem(authSession.AUTH_SESSION_STORAGE_KEY)).toBeNull();
  });
});
