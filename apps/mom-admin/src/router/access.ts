import type { PermissionCode } from '@mom/access';

import { access, runtimeState } from '../runtime';
import {
  defaultCatalogTaskPath,
  isCatalogRouteActive,
} from './catalog';
import { router } from './index';
import { findAdminTask } from './registry';

interface SynchronizeOptions {
  reloadContext?: boolean;
}

let synchronizationFlight: Promise<void> | undefined;
let accessChecked = false;

/**
 * 同步当前用户的访问上下文。
 *
 * 权限只用于过滤导航和守卫静态路由；这里不生成路由、不复制 Store，也不保留 Tab 状态。
 */
export function synchronizeAccess(
  options: SynchronizeOptions = {},
): Promise<void> {
  synchronizationFlight ??= synchronize(options).finally(() => {
    synchronizationFlight = undefined;
  });
  return synchronizationFlight;
}

async function synchronize(options: SynchronizeOptions): Promise<void> {
  if (options.reloadContext) {
    accessChecked = false;
    await access.initialize();
  }

  const context = access.snapshot();
  if (!context) throw new Error('Access context is not initialized');
  accessChecked = true;

  const requiredPermission = router.currentRoute.value.meta.requiredPermission;
  if (
    requiredPermission
    && !access.hasPermission(requiredPermission)
    && router.currentRoute.value.path !== '/403'
  ) {
    await router.replace({
      path: '/403',
      query: { from: router.currentRoute.value.fullPath },
    });
  }
}

export function resetGeneratedAccess(): void {
  accessChecked = false;
}

export function defaultAuthorizedPath(): string {
  return defaultCatalogTaskPath();
}

export function isSafeInternalRedirect(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  }
  catch {
    return false;
  }
  return decoded.startsWith('/')
    && !decoded.startsWith('//')
    && !decoded.includes('\\')
    && !decoded.startsWith('/auth/');
}

export function resolveAuthorizedRedirect(value: unknown): string {
  if (!isSafeInternalRedirect(value)) return defaultAuthorizedPath();
  const decoded = decodeURIComponent(value);
  const task = findAdminTask({ path: decoded.split(/[?#]/u, 1)[0] ?? decoded });
  if (task && (
    !access.hasPermission(task.requiredPermission)
    || !isCatalogRouteActive(task.routeKey)
  )) return defaultAuthorizedPath();
  const resolved = router.resolve(decoded);
  if (resolved.name === 'NotFound') return defaultAuthorizedPath();
  const permission = resolved.meta.requiredPermission;
  return permission && !access.hasPermission(permission as PermissionCode)
    ? defaultAuthorizedPath()
    : decoded;
}

export function accessIsReady(): boolean {
  return runtimeState.phase === 'ready' && accessChecked;
}
