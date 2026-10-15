import { describe, expect, it } from 'vitest';
import { appRoutes, mainNavigation } from '../../router/route-registry';
import { ROUTE_NAMES } from '../../router/route-names';
import { iamRoutes } from './routes';

describe('IAM 路由契约', () => {
  it('真实页面与导航来自相同登记，读取权限不是写权限', () => {
    const route = iamRoutes[0]!;
    expect(route).toMatchObject({ path: 'iam/users', name: ROUTE_NAMES.iamUsers, meta: { requiresAuth: true, permissions: ['auth:user:read'], module: 'iam' } });
    expect(appRoutes[0]!.children).toContain(route);
    expect(mainNavigation.find((entry) => entry.name === ROUTE_NAMES.iamUsers)).toMatchObject({ group: 'iam', permissions: ['auth:user:read'] });
  });
  it('角色管理只向具备角色读取权限的用户开放导航', () => {
    const route = iamRoutes[1]!;
    expect(route).toMatchObject({ path: 'iam/roles', name: ROUTE_NAMES.iamRoles, meta: { requiresAuth: true, permissions: ['auth:role:read'], module: 'iam' } });
    expect(appRoutes[0]!.children).toContain(route);
    expect(mainNavigation.find((entry) => entry.name === ROUTE_NAMES.iamRoles)).toMatchObject({ group: 'iam', permissions: ['auth:role:read'] });
  });
  it('权限管理只向具备权限读取权限的用户开放导航', () => {
    const route = iamRoutes[2]!;
    expect(route).toMatchObject({ path: 'iam/permissions', name: ROUTE_NAMES.iamPermissions, meta: { requiresAuth: true, permissions: ['auth:permission:read'], module: 'iam' } });
    expect(appRoutes[0]!.children).toContain(route);
    expect(mainNavigation.find((entry) => entry.name === ROUTE_NAMES.iamPermissions)).toMatchObject({ group: 'iam', permissions: ['auth:permission:read'] });
    expect(mainNavigation.filter((entry) => entry.name === ROUTE_NAMES.iamPermissions || entry.name === ROUTE_NAMES.iamPermissionResources)).toHaveLength(1);
    expect(iamRoutes[3]).toMatchObject({ path: 'iam/permission-resources', redirect: { name: ROUTE_NAMES.iamPermissions }, meta: { hideInMenu: true } });
  });
});
