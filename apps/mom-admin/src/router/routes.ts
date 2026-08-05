import type { RouteRecordRaw } from 'vue-router';

export const coreRouteNames = new Set([
  'Authentication',
  'Login',
  'PasswordChange',
  'Forbidden',
  'MenuError',
  'RuntimeError',
  'CatalogError',
  'PersonalSettings',
  'NotFound',
]);

export const routes: RouteRecordRaw[] = [
  {
    children: [
      {
        component: () => import('../views/settings/personal-settings.vue'),
        meta: {
          hideInBreadcrumb: true,
          hideInMenu: true,
          hideInTab: true,
          ignoreAccess: true,
          title: 'mom.settings.title',
        },
        name: 'PersonalSettings',
        path: '/settings',
      },
    ],
    component: () => import('../layouts/admin-shell.vue'),
    meta: {
      hideInBreadcrumb: true,
      title: 'mom.appName',
    },
    name: 'Root',
    path: '/',
  },
  {
    children: [
      {
        component: () => import('../views/auth/login.vue'),
        meta: {
          hideInTab: true,
          ignoreAccess: true,
          title: 'mom.auth.loginTitle',
        },
        name: 'Login',
        path: 'login',
      },
      {
        component: () => import('../views/auth/password-change.vue'),
        meta: {
          hideInTab: true,
          ignoreAccess: true,
          title: 'mom.auth.changeTitle',
        },
        name: 'PasswordChange',
        path: 'change-password',
      },
    ],
    component: () => import('../layouts/auth.vue'),
    meta: {
      hideInTab: true,
      ignoreAccess: true,
      title: 'mom.auth.loginTitle',
    },
    name: 'Authentication',
    path: '/auth',
    redirect: '/auth/login',
  },
  {
    component: () => import('../views/fallback/forbidden.vue'),
    meta: {
      hideInBreadcrumb: true,
      hideInMenu: true,
      hideInTab: true,
      ignoreAccess: true,
      title: 'mom.fallback.forbiddenTitle',
    },
    name: 'Forbidden',
    path: '/403',
  },
  {
    component: () => import('../views/fallback/menu-error.vue'),
    meta: {
      hideInBreadcrumb: true,
      hideInMenu: true,
      hideInTab: true,
      ignoreAccess: true,
      title: 'mom.fallback.menuErrorTitle',
    },
    name: 'MenuError',
    path: '/menu-error',
  },
  {
    component: () => import('../views/fallback/runtime-error.vue'),
    meta: {
      hideInBreadcrumb: true,
      hideInMenu: true,
      hideInTab: true,
      ignoreAccess: true,
      title: 'mom.fallback.runtimeErrorTitle',
    },
    name: 'RuntimeError',
    path: '/runtime-error',
  },
  {
    component: () => import('../views/fallback/catalog-error.vue'),
    meta: {
      hideInBreadcrumb: true,
      hideInMenu: true,
      hideInTab: true,
      ignoreAccess: true,
      title: 'mom.fallback.catalogErrorTitle',
    },
    name: 'CatalogError',
    path: '/catalog-error',
  },
  {
    component: () => import('../views/fallback/not-found.vue'),
    meta: {
      hideInBreadcrumb: true,
      hideInMenu: true,
      hideInTab: true,
      ignoreAccess: true,
      title: 'mom.fallback.notFoundTitle',
    },
    name: 'NotFound',
    path: '/:path(.*)*',
  },
];
