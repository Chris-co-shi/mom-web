import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router';
import { hasAuthorities } from '../modules/auth/model/auth-permissions';
import { getAccessToken, synchronizeAuthSession } from '../modules/auth/model/auth-session';
import { isApiError } from '../shared/api/errors';
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
export async function resolveAuthNavigation(to: RouteLocationNormalized): Promise<RouteLocationRaw | undefined> {
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const token = getAccessToken();
  if (requiresAuth && !token) {
    return {
      name: ROUTE_NAMES.login,
      query: to.fullPath === '/' ? undefined : { redirect: to.fullPath },
    };
  }

  if (token && (requiresAuth || to.name === ROUTE_NAMES.login)) {
    try {
      await synchronizeAuthSession();
    } catch (error) {
      if (isApiError(error)) {
        if (error.kind === 'unauthenticated') {
          return { name: ROUTE_NAMES.login, query: { redirect: to.fullPath } };
        }
        if (error.kind === 'forbidden') return { name: ROUTE_NAMES.forbidden };
        if (['network', 'timeout', 'server', 'rate_limited'].includes(error.kind)) {
          return { name: ROUTE_NAMES.offline, query: { redirect: to.fullPath } };
        }
      }
      return { name: ROUTE_NAMES.error };
    }
  }

  const deniedByPermissions = to.matched.some((record) =>
    !hasAuthorities(record.meta.permissions, record.meta.permissionMode ?? 'all'));
  if (requiresAuth && deniedByPermissions) {
    return { name: ROUTE_NAMES.forbidden };
  }
  if (to.name === ROUTE_NAMES.login && getAccessToken()) {
    return safeRedirect(to.query.redirect) ?? { name: ROUTE_NAMES.foundationOverview };
  }
  return undefined;
}

/** 仅接受站内单斜杠路径，避免登录成功后形成开放重定向。 */
export function resolveLoginRedirect(value: unknown): RouteLocationRaw {
  return safeRedirect(value) ?? { name: ROUTE_NAMES.foundationOverview };
}
