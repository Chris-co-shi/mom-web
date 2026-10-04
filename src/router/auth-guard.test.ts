import type { RouteLocationNormalized } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setHttpRequestContextProvider } from '../shared/api/http-client';

function resultResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ code: status === 200 ? '0' : 'error', message: 'result', data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function route(overrides: Partial<RouteLocationNormalized>): RouteLocationNormalized {
  return {
    fullPath: '/foundation/overview',
    hash: '',
    href: '/foundation/overview',
    matched: [],
    meta: {},
    name: undefined,
    params: {},
    path: '/foundation/overview',
    query: {},
    redirectedFrom: undefined,
    ...overrides,
  } as RouteLocationNormalized;
}

describe('authGuard', () => {
  beforeEach(() => {
    vi.resetModules();
    window.sessionStorage.clear();
  });

  it('未认证访问受保护路由时保留站内回跳地址', async () => {
    const { resolveAuthNavigation } = await import('./auth-guard');
    const navigation = await resolveAuthNavigation(route({
      matched: [{ meta: { requiresAuth: true } }] as RouteLocationNormalized['matched'],
    }));

    expect(navigation).toEqual({
      name: 'login',
      query: { redirect: '/foundation/overview' },
    });
  });

  it('拒绝协议相对地址形成开放重定向', async () => {
    const { resolveLoginRedirect } = await import('./auth-guard');

    expect(resolveLoginRedirect('//evil.example')).toEqual({ name: 'foundation-overview' });
    expect(resolveLoginRedirect('/foundation/overview')).toBe('/foundation/overview');
  });

  it('同步当前会话后拒绝缺少页面权限的访问', async () => {
    window.sessionStorage.setItem('mom.auth.session', JSON.stringify({
      accessToken: 'restored-token',
      tokenType: 'Bearer',
      expiresAt: '2099-01-01T00:00:00Z',
    }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resultResponse({
        user: { userId: '1900000000000000001', username: 'test-user', displayName: '测试用户', version: 3 },
        authorization: { authorities: ['auth:user:read'] },
        session: { expiresAt: '2099-01-01T00:00:00Z' },
    })));
    const authSession = await import('../modules/auth/model/auth-session');
    setHttpRequestContextProvider(() => ({ accessToken: authSession.getAccessToken(), locale: 'zh-CN' }));
    const { resolveAuthNavigation } = await import('./auth-guard');

    const navigation = await resolveAuthNavigation(route({
      matched: [{ meta: { requiresAuth: true, permissions: ['auth:user:write'] } }] as unknown as RouteLocationNormalized['matched'],
    }));

    expect(navigation).toEqual({ name: 'forbidden' });
  });

  it('当前会话服务不可用时进入离线状态且保留本地 Token', async () => {
    window.sessionStorage.setItem('mom.auth.session', JSON.stringify({
      accessToken: 'restored-token',
      tokenType: 'Bearer',
      expiresAt: '2099-01-01T00:00:00Z',
    }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resultResponse(null, 503)));
    const authSession = await import('../modules/auth/model/auth-session');
    setHttpRequestContextProvider(() => ({ accessToken: authSession.getAccessToken(), locale: 'zh-CN' }));
    const { resolveAuthNavigation } = await import('./auth-guard');

    const navigation = await resolveAuthNavigation(route({
      matched: [{ meta: { requiresAuth: true } }] as RouteLocationNormalized['matched'],
    }));

    expect(navigation).toEqual({ name: 'offline' });
    expect(authSession.getAccessToken()).toBe('restored-token');
  });
});
