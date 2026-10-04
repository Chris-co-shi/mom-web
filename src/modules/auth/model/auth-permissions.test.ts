import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setHttpRequestContextProvider } from '../../../shared/api/http-client';

function resultResponse(data: unknown): Response {
  return new Response(JSON.stringify({ code: '0', message: 'success', data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('authPermissions', () => {
  beforeEach(() => {
    vi.resetModules();
    window.sessionStorage.clear();
  });

  it('基于同一 Token 快照支持 all 与 any 判断', async () => {
    window.sessionStorage.setItem('mom.auth.session', JSON.stringify({
      accessToken: 'restored-token',
      tokenType: 'Bearer',
      expiresAt: '2099-01-01T00:00:00Z',
    }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resultResponse({
        user: { userId: '1900000000000000001', username: 'test-user', displayName: '测试用户', version: 3 },
        authorization: { authorities: ['auth:user:read', 'auth:role:read'] },
        session: { expiresAt: '2099-01-01T00:00:00Z' },
    })));
    const authSession = await import('./auth-session');
    setHttpRequestContextProvider(() => ({ accessToken: authSession.getAccessToken(), locale: 'zh-CN' }));
    await authSession.synchronizeAuthSession();
    const permissions = await import('./auth-permissions');

    expect(permissions.hasAuthority('auth:user:read')).toBe(true);
    expect(permissions.hasAuthorities(['auth:user:read', 'auth:role:read'])).toBe(true);
    expect(permissions.hasAuthorities(['auth:user:write', 'auth:role:read'], 'any')).toBe(true);
    expect(permissions.hasAuthorities(['auth:user:write'])).toBe(false);
    expect(permissions.hasAuthorities([])).toBe(true);
  });
});
