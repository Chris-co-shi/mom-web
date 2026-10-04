import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router';
import { getAccessToken } from '../modules/auth/model/auth-session';
import { ROUTE_NAMES } from './route-names';

function safeRedirect(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return undefined;
  }
  return value;
}

/**
 * 计算认证路由跳转。
 * 前端守卫只控制页面体验，Token 真伪和权限仍由各 Resource Server 最终判定。
 */
export function resolveAuthNavigation(to: RouteLocationNormalized): RouteLocationRaw | undefined {
  const authenticated = getAccessToken() !== undefined;
  if (to.matched.some((record) => record.meta.requiresAuth) && !authenticated) {
    return {
      name: ROUTE_NAMES.login,
      query: to.fullPath === '/' ? undefined : { redirect: to.fullPath },
    };
  }
  if (to.name === ROUTE_NAMES.login && authenticated) {
    return safeRedirect(to.query.redirect) ?? { name: ROUTE_NAMES.foundationOverview };
  }
  return undefined;
}

/** 仅接受站内单斜杠路径，避免登录成功后形成开放重定向。 */
export function resolveLoginRedirect(value: unknown): RouteLocationRaw {
  return safeRedirect(value) ?? { name: ROUTE_NAMES.foundationOverview };
}
