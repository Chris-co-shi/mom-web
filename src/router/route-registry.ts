import type { RouteRecordRaw } from 'vue-router';
import type { MessageKey } from '../locales/zh-CN';
import type { AuthorityMatchMode } from '../modules/auth/model/auth-permissions';
import { foundationRoutes } from '../modules/foundation/routes';
import { iamRoutes } from '../modules/iam';
import { systemRoutes } from '../modules/system/routes';
import { ROUTE_NAMES, type MomRouteName } from './route-names';

export interface NavigationItem {
  name: MomRouteName;
  titleKey: MessageKey;
  group: string;
  order: number;
  permissions: readonly string[];
  permissionMode: AuthorityMatchMode;
}

/**
 * 应用静态 Route Registry。
 *
 * 路由组件映射和菜单结构由 Web 自身持有，不依赖 System 动态下发。
 * requiresAuth 由 Web-P2 认证守卫消费；它只负责前端导航体验，不替代后端鉴权。
 */
export const appRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    redirect: { name: ROUTE_NAMES.foundationOverview },
    meta: {
      title: 'MOM 工作台',
      titleKey: 'shell.main.title',
      module: 'shell',
      requiresAuth: true,
      hideInMenu: true,
    },
    children: [
      ...foundationRoutes,
      ...iamRoutes,
      ...systemRoutes,
      {
        path: 'account',
        name: ROUTE_NAMES.account,
        component: () => import('../modules/auth/pages/AccountPage.vue'),
        meta: {
          title: '账户设置',
          titleKey: 'account.title',
          module: 'auth',
          requiresAuth: true,
          i18nNamespaces: ['auth.account'],
          hideInMenu: true,
        },
      },
    ],
  },
  {
    path: '/login',
    component: () => import('../layouts/AuthLayout.vue'),
    meta: {
      title: '身份认证',
      titleKey: 'auth.layout.title',
      module: 'auth',
      requiresAuth: false,
      hideInMenu: true,
    },
    children: [
      {
        path: '',
        name: ROUTE_NAMES.login,
        component: () => import('../modules/auth/pages/AuthEntryPage.vue'),
        meta: {
          title: '登录',
          titleKey: 'auth.login.title',
          module: 'auth',
          requiresAuth: false,
          i18nNamespaces: ['auth.login'],
          hideInMenu: true,
        },
      },
    ],
  },
  {
    path: '/forbidden',
    name: ROUTE_NAMES.forbidden,
    component: () => import('../pages/RouteStatePage.vue'),
    props: {
      code: '403',
      eyebrowKey: 'state.forbidden.eyebrow',
      titleKey: 'state.forbidden.title',
      descriptionKey: 'state.forbidden.description',
    },
    meta: {
      title: '无权访问',
      titleKey: 'shell.forbidden.title',
      module: 'shell',
      requiresAuth: false,
      i18nNamespaces: ['system.web'],
      hideInMenu: true,
    },
  },
  {
    path: '/offline',
    name: ROUTE_NAMES.offline,
    component: () => import('../pages/RouteStatePage.vue'),
    props: {
      code: 'OFF',
      eyebrowKey: 'state.offline.eyebrow',
      titleKey: 'state.offline.title',
      descriptionKey: 'state.offline.description',
    },
    meta: {
      title: '服务离线',
      titleKey: 'shell.offline.title',
      module: 'shell',
      requiresAuth: false,
      i18nNamespaces: ['system.web'],
      hideInMenu: true,
    },
  },
  {
    path: '/error',
    name: ROUTE_NAMES.error,
    component: () => import('../pages/RouteStatePage.vue'),
    props: {
      code: 'ERR',
      eyebrowKey: 'state.error.eyebrow',
      titleKey: 'state.error.title',
      descriptionKey: 'state.error.description',
    },
    meta: {
      title: '页面异常',
      titleKey: 'shell.error.title',
      module: 'shell',
      requiresAuth: false,
      i18nNamespaces: ['system.web'],
      hideInMenu: true,
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: ROUTE_NAMES.notFound,
    component: () => import('../pages/RouteStatePage.vue'),
    props: {
      code: '404',
      eyebrowKey: 'state.notFound.eyebrow',
      titleKey: 'state.notFound.title',
      descriptionKey: 'state.notFound.description',
    },
    meta: {
      title: '页面不存在',
      titleKey: 'shell.notFound.title',
      module: 'shell',
      requiresAuth: false,
      hideInMenu: true,
    },
  },
];

function isNavigationRoute(route: RouteRecordRaw): route is RouteRecordRaw & {
  name: MomRouteName;
  meta: Required<Pick<NonNullable<RouteRecordRaw['meta']>, 'title' | 'titleKey' | 'navigationGroup' | 'navigationOrder'>>;
} {
  return Boolean(
    route.name &&
      !route.meta?.hideInMenu &&
      route.meta?.navigationGroup &&
      route.meta.navigationOrder !== undefined,
  );
}

/** 主导航直接由已注册路由派生，避免路由与菜单维护两份显示配置。 */
export const mainNavigation: NavigationItem[] = [...foundationRoutes, ...iamRoutes, ...systemRoutes]
  .filter(isNavigationRoute)
  .map((route) => ({
    name: route.name,
    titleKey: route.meta.titleKey,
    group: route.meta.navigationGroup,
    order: route.meta.navigationOrder,
    permissions: route.meta.permissions ?? [],
    permissionMode: route.meta.permissionMode ?? 'all',
  }))
  .sort((left, right) => left.order - right.order);
