import { beforeEach, describe, expect, it, vi } from 'vitest';

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
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(resultResponse({
        accessToken: 'issued-token',
        tokenType: 'Bearer',
        expiresAt: '2099-01-01T00:00:00Z',
      }))
      .mockResolvedValueOnce(resultResponse({
        user: { userId: '1900000000000000001', username: 'test-user', displayName: '测试用户', version: 3 },
        authorization: { authorities: ['auth:user:read'] },
        session: { expiresAt: '2099-01-01T00:00:00Z' },
      })));
    const authSession = await import('./auth-session');

    await authSession.login({ username: 'test-user', password: 'Case Sensitive Test Value' });

    expect(authSession.getAccessToken()).toBe('issued-token');
    const stored = window.sessionStorage.getItem(authSession.AUTH_SESSION_STORAGE_KEY) ?? '';
    expect(stored).toContain('issued-token');
    expect(stored).not.toContain('1900000000000000001');
    expect(stored).not.toContain('auth:user:read');
    expect(authSession.useAuthSession().user.value?.displayName).toBe('测试用户');
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
      .mockResolvedValueOnce(resultResponse({
        user: { userId: '1900000000000000001', username: 'test-user', displayName: '测试用户', version: 3 },
        authorization: { authorities: [] },
        session: { expiresAt: '2099-01-01T00:00:00Z' },
      }))
      .mockRejectedValueOnce(new TypeError('network down'));
    vi.stubGlobal('fetch', fetchMock);
    const authSession = await import('./auth-session');
    const { setHttpRequestContextProvider } = await import('../../../shared/api/http-client');
    setHttpRequestContextProvider(() => ({ accessToken: authSession.getAccessToken(), locale: 'zh-CN' }));
    await authSession.login({ username: 'test-user', password: 'Case Sensitive Test Value' });

    await expect(authSession.logout()).rejects.toMatchObject({ kind: 'network' });
    expect(authSession.getAccessToken()).toBeUndefined();
    expect(window.sessionStorage.getItem(authSession.AUTH_SESSION_STORAGE_KEY)).toBeNull();
  });

  it('刷新恢复后通过当前会话接口重新校验权限快照', async () => {
    window.sessionStorage.setItem('mom.auth.session', JSON.stringify({
      accessToken: 'restored-token',
      tokenType: 'Bearer',
      expiresAt: '2099-01-01T00:00:00Z',
      userId: 'old-user',
      authorities: ['old:authority'],
    }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resultResponse({
        user: { userId: '1900000000000000001', username: 'test-user', displayName: '测试用户', version: 3 },
        authorization: { authorities: ['auth:role:read'] },
        session: { expiresAt: '2099-01-01T00:00:00Z' },
    })));
    const authSession = await import('./auth-session');
    const { setHttpRequestContextProvider } = await import('../../../shared/api/http-client');
    setHttpRequestContextProvider(() => ({ accessToken: authSession.getAccessToken(), locale: 'zh-CN' }));

    expect(authSession.getAuthorities()).toEqual([]);
    await authSession.synchronizeAuthSession();

    expect(authSession.getAuthorities()).toEqual(['auth:role:read']);
    expect(authSession.useAuthSession().user.value?.userId).toBe('1900000000000000001');
  });

  it('个人改密的 400 不退出登录，也不自动重试或保存密码', async () => {
    window.sessionStorage.setItem('mom.auth.session', JSON.stringify({ accessToken: 'token', tokenType: 'Bearer', expiresAt: '2099-01-01T00:00:00Z' }));
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'auth.current_password_invalid', message: '原密码错误' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const auth = await import('./auth-session');
    await expect(auth.changeOwnPassword({ currentPassword: 'wrong-secret', newPassword: 'new-secret', version: 3 }))
      .rejects.toMatchObject({ code: 'auth.current_password_invalid', status: 400 });
    expect(auth.getAccessToken()).toBe('token');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem('mom.auth.session')).not.toContain('secret');
  });

  it('退出后迟到的资料写响应不能复活会话', async () => {
    window.sessionStorage.setItem('mom.auth.session', JSON.stringify({ accessToken: 'token', tokenType: 'Bearer', expiresAt: '2099-01-01T00:00:00Z' }));
    let resolve!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((done) => { resolve = done; })));
    const auth = await import('./auth-session');
    const pending = auth.updateOwnProfile({ displayName: 'New', version: 3 });
    auth.clearAuthSession();
    resolve(resultResponse({ user: { userId: '1', username: 'user', displayName: 'New', version: 4 }, authorization: { authorities: [] }, session: { expiresAt: '2099-01-01T00:00:00Z' } }));
    await pending;
    expect(auth.getAccessToken()).toBeUndefined();
    expect(auth.useAuthSession().user.value).toBeUndefined();
  });

  it('拒绝不完整的当前用户契约', async () => {
    window.sessionStorage.setItem('mom.auth.session', JSON.stringify({ accessToken: 'token', tokenType: 'Bearer', expiresAt: '2099-01-01T00:00:00Z' }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resultResponse(null)));
    const auth = await import('./auth-session');
    await expect(auth.synchronizeAuthSession()).rejects.toThrow('auth.invalid_current_session_response');
    expect(auth.getAuthorities()).toEqual([]);
  });
});
