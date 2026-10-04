import type { RouteLocationNormalized } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
    const navigation = resolveAuthNavigation(route({
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
});
