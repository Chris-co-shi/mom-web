import type { PermissionCode } from '@mom/access';
import type { RouteRecordRaw } from 'vue-router';
import type { ComponentRecordType } from '@vben/types';

import { generateAccessible } from '@vben/access';
import {
  useAccessStore,
  useTabbarStore,
  useUserStore,
} from '@vben/stores';

import { access, runtimeState } from '../runtime';
import ForbiddenView from '../views/fallback/forbidden.vue';
import { router } from './index';
import { firstAccessiblePath, loadMenuRoutes } from './menu-source';

interface SynchronizeOptions {
  reloadContext?: boolean;
}

let synchronizationFlight: Promise<void> | undefined;

const layoutMap: ComponentRecordType = {
  BasicLayout: () => import('../layouts/basic.vue'),
};

const pageMap: ComponentRecordType = {
  '/_core/fallback/not-found.vue': () =>
    import('../views/fallback/not-found.vue'),
  '/iam-admin.vue': () => import('../App.vue'),
};

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
    await access.initialize();
  }

  const context = access.snapshot();
  if (!context) throw new Error('Access context is not initialized');

  if (router.hasRoute('IamManagement')) {
    router.removeRoute('IamManagement');
  }

  const accessStore = useAccessStore();
  const userStore = useUserStore();
  const tabbarStore = useTabbarStore();
  const { accessibleMenus, accessibleRoutes } = await generateAccessible(
    'backend',
    {
      fetchMenuListAsync: loadMenuRoutes,
      forbiddenComponent: ForbiddenView,
      layoutMap,
      pageMap,
      roles: context.roles,
      router,
      routes: [] as RouteRecordRaw[],
    },
  );

  accessStore.setAccessCodes([...context.permissions]);
  accessStore.setAccessMenus(accessibleMenus);
  accessStore.setAccessRoutes(accessibleRoutes);
  accessStore.setIsAccessChecked(true);
  userStore.setUserInfo({
    avatar: '',
    realName: context.displayName,
    roles: [...context.roles],
    userId: context.userId,
    username: context.username,
  });

  const accessiblePaths = new Set(
    accessibleRoutes.flatMap((route) => [
      route.path,
      ...(route.children ?? []).map((child) => child.path),
    ]),
  );
  tabbarStore.tabs = tabbarStore.tabs.filter((tab) =>
    accessiblePaths.has(tab.path),
  );

  const requiredPermission = router.currentRoute.value.meta
    .requiredPermission;
  if (
    requiredPermission
    && !access.hasPermission(requiredPermission as PermissionCode)
    && router.currentRoute.value.path !== '/403'
  ) {
    await router.replace({
      path: '/403',
      query: { from: router.currentRoute.value.fullPath },
    });
  }
}

export function resetGeneratedAccess(): void {
  if (router.hasRoute('IamManagement')) {
    router.removeRoute('IamManagement');
  }
  const accessStore = useAccessStore();
  const userStore = useUserStore();
  const tabbarStore = useTabbarStore();
  accessStore.setAccessCodes([]);
  accessStore.setAccessMenus([]);
  accessStore.setAccessRoutes([]);
  accessStore.setIsAccessChecked(false);
  userStore.setUserInfo(null);
  tabbarStore.tabs = [];
}

export function defaultAuthorizedPath(): string {
  return firstAccessiblePath() ?? '/403';
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
  const resolved = router.resolve(decoded);
  if (resolved.name === 'NotFound') return defaultAuthorizedPath();
  const permission = resolved.meta.requiredPermission;
  return permission && !access.hasPermission(permission as PermissionCode)
    ? defaultAuthorizedPath()
    : decoded;
}

export function accessIsReady(): boolean {
  return runtimeState.phase === 'ready'
    && useAccessStore().isAccessChecked;
}
