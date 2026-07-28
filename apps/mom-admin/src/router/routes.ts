import type { RouteRecordRaw } from 'vue-router';

import AuthLayout from '../layouts/auth.vue';
import ForbiddenView from '../views/fallback/forbidden.vue';
import MenuErrorView from '../views/fallback/menu-error.vue';
import LoginView from '../views/auth/login.vue';
import PasswordChangeView from '../views/auth/password-change.vue';

export const coreRouteNames = new Set([
  'Authentication',
  'Login',
  'PasswordChange',
  'Forbidden',
  'MenuError',
  'NotFound',
]);

export const routes: RouteRecordRaw[] = [
  {
    children: [],
    component: () => import('../layouts/basic.vue'),
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
        component: LoginView,
        meta: {
          hideInTab: true,
          ignoreAccess: true,
          title: 'mom.auth.loginTitle',
        },
        name: 'Login',
        path: 'login',
      },
      {
        component: PasswordChangeView,
        meta: {
          hideInTab: true,
          ignoreAccess: true,
          title: 'mom.auth.changeTitle',
        },
        name: 'PasswordChange',
        path: 'change-password',
      },
    ],
    component: AuthLayout,
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
    component: ForbiddenView,
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
    component: MenuErrorView,
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
