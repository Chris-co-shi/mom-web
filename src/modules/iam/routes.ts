import type { RouteRecordRaw } from 'vue-router';
import { ROUTE_NAMES } from '../../router/route-names';

export const iamRoutes: RouteRecordRaw[] = [
  {
    path: 'iam/users',
    name: ROUTE_NAMES.iamUsers,
    component: () => import('./pages/UserManagementPage.vue'),
    meta: {
      title: '用户管理', titleKey: 'iam.users.title', module: 'iam', requiresAuth: true,
      permissions: ['auth:user:read'], i18nNamespaces: ['auth.navigation', 'auth.iam'], navigationGroup: 'iam', navigationOrder: 10,
    },
  },
  {
    path: 'iam/roles',
    name: ROUTE_NAMES.iamRoles,
    component: () => import('./pages/RoleManagementPage.vue'),
    meta: {
      title: '角色管理', titleKey: 'iam.roles.title', module: 'iam', requiresAuth: true,
      permissions: ['auth:role:read'], i18nNamespaces: ['auth.navigation', 'auth.iam'], navigationGroup: 'iam', navigationOrder: 20,
    },
  },
  {
    path: 'iam/permissions',
    name: ROUTE_NAMES.iamPermissions,
    component: () => import('./pages/PermissionResourcePage.vue'),
    meta: {
      title: '权限管理', titleKey: 'iam.permissions.title', module: 'iam', requiresAuth: true,
      permissions: ['auth:permission:read'], i18nNamespaces: ['auth.navigation', 'auth.iam'], navigationGroup: 'iam', navigationOrder: 30,
    },
  },
  {
    path: 'iam/permission-resources',
    name: ROUTE_NAMES.iamPermissionResources,
    redirect: { name: ROUTE_NAMES.iamPermissions },
    meta: {
      title: '权限管理', titleKey: 'iam.permissions.title', module: 'iam', requiresAuth: true,
      permissions: ['auth:permission:read'], i18nNamespaces: ['auth.iam'], hideInMenu: true,
    },
  },
];
