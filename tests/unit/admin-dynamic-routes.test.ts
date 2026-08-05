import { describe, expect, it } from 'vitest';

import { createDynamicAdminTaskRoutes } from '../../apps/mom-admin/src/router/dynamic-task-routes';

describe('Admin Catalog 动态任务路由', () => {
  it('只把 Catalog 激活的静态 Registry 任务加入 Root', () => {
    const router = createTestRouter();
    const dynamic = createDynamicAdminTaskRoutes(router.router);

    expect(router.resolve('/iam/users')).toBeUndefined();
    dynamic.apply(new Set([
      'mom-admin.people-access.users',
      'mom-admin.security-operations.audit',
    ]));

    expect(router.resolve('/iam/users')).toMatchObject({ name: 'IamUsers' });
    expect(router.resolve('/iam/audit')).toMatchObject({ name: 'IamAudit' });
    expect(router.resolve('/iam/roles')).toBeUndefined();
    expect(router.resolve('/iam/users')?.meta).toMatchObject({
      requiredPermission: 'iam:user:read',
      routeKey: 'mom-admin.people-access.users',
    });
  });

  it('替换表示时撤销旧任务，并可在 Logout 时全部清除', () => {
    const router = createTestRouter();
    const dynamic = createDynamicAdminTaskRoutes(router.router);
    dynamic.apply(new Set(['mom-admin.people-access.users']));

    dynamic.apply(new Set(['mom-admin.people-access.roles']));
    expect(router.resolve('/iam/users')).toBeUndefined();
    expect(router.resolve('/iam/roles')?.name).toBe('IamRoles');

    dynamic.clear();
    expect(router.resolve('/iam/roles')).toBeUndefined();
    expect(dynamic.activeRouteKeys()).toEqual(new Set());
  });

  it('拒绝静态 Registry 外的 routeKey', () => {
    const router = createTestRouter();
    const dynamic = createDynamicAdminTaskRoutes(router.router);

    expect(() => dynamic.apply(new Set(['remote.component']))).toThrow(
      'outside the Admin static registry',
    );
    expect(router.resolve('/remote')).toBeUndefined();
  });
});

interface TestRoute {
  meta?: Record<string, unknown>;
  name?: unknown;
  path: string;
}

function createTestRouter() {
  const routes = new Map<string, TestRoute>();
  const router = {
    addRoute(parentName: string, route: TestRoute) {
      expect(parentName).toBe('Root');
      routes.set(route.path, route);
      return () => { routes.delete(route.path); };
    },
  } as unknown as Parameters<typeof createDynamicAdminTaskRoutes>[0];
  return {
    resolve: (path: string) => routes.get(path),
    router,
  };
}
