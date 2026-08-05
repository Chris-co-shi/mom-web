import type { CatalogNavigationItem } from '@mom/system-client';
import type { Router } from 'vue-router';

import {
  access,
  catalogRuntime,
  runtimeState,
} from '../runtime';
import {
  createDynamicAdminTaskRoutes,
  type DynamicAdminTaskRoutes,
} from './dynamic-task-routes';
import { findAdminTask, firstAccessibleTaskPath } from './registry';

let routerRef: Router | undefined;
let dynamicRoutes: DynamicAdminTaskRoutes | undefined;
let synchronizationFlight: Promise<void> | undefined;
let synchronizationKey: string | undefined;
let foregroundListenerInstalled = false;

export function bindCatalogRouter(router: Router): void {
  if (routerRef && routerRef !== router) throw new Error('Catalog Router is already bound');
  routerRef = router;
  dynamicRoutes ??= createDynamicAdminTaskRoutes(router);
}

/**
 * 重新验证当前用户的 Catalog，并用验证后的 routeKey 集合替换动态任务路由。
 */
export function synchronizeCatalog(): Promise<void> {
  const requestedKey = currentAccessKey();
  if (synchronizationFlight) {
    if (synchronizationKey === requestedKey) return synchronizationFlight;
    return synchronizationFlight
      .catch(() => undefined)
      .then(() => synchronizeCatalog());
  }
  synchronizationKey = requestedKey;
  synchronizationFlight = synchronize(requestedKey).finally(() => {
    synchronizationFlight = undefined;
    synchronizationKey = undefined;
  });
  return synchronizationFlight;
}

async function synchronize(expectedAccessKey: string): Promise<void> {
  const routes = requireDynamicRoutes();
  const context = access.snapshot();
  if (!context) {
    resetCatalogAccess();
    throw new Error('Access context is not initialized for Catalog');
  }
  try {
    const snapshot = await catalogRuntime.activate({
      permissions: new Set(context.permissions),
      userId: context.userId,
    });
    if (snapshot.phase !== 'ACTIVE' || !snapshot.catalog) {
      throw new Error('Catalog Runtime did not produce an active representation');
    }
    if (currentAccessKey() !== expectedAccessKey) {
      throw new Error('Access context changed during Catalog activation');
    }
    routes.apply(collectRouteKeys(snapshot.catalog.applications[0]?.channels[0]?.navigation ?? []));
  }
  catch (error) {
    routes.clear();
    if (catalogRuntime.snapshot().phase !== 'RESTRICTED') {
      catalogRuntime.restrict('catalog_route_activation_failed', error);
    }
    throw error;
  }
}

export function resetCatalogAccess(): void {
  dynamicRoutes?.clear();
  catalogRuntime.clear();
}

export function restrictCatalogAccess(reason: string, error?: unknown): void {
  dynamicRoutes?.clear();
  catalogRuntime.restrict(reason, error);
}

export function isCatalogRouteActive(routeKey: string): boolean {
  return dynamicRoutes?.has(routeKey) ?? false;
}

export function defaultCatalogTaskPath(): string {
  return firstAccessibleTaskPath(
    (permission) => access.hasPermission(permission),
    isCatalogRouteActive,
  ) ?? '/403';
}

/**
 * 页面从后台恢复时立即重验证 Catalog；失败或当前任务被撤销时离开旧页面。
 */
export function installCatalogForegroundRevalidation(): void {
  if (foregroundListenerInstalled) return;
  foregroundListenerInstalled = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || runtimeState.phase !== 'ready') return;
    const router = routerRef;
    if (!router) return;
    const previousTask = findAdminTask(router.currentRoute.value);
    void synchronizeCatalog()
      .then(async () => {
        if (!previousTask || isCatalogRouteActive(previousTask.routeKey)) return;
        await router.replace(access.hasPermission(previousTask.requiredPermission)
          ? '/catalog-error'
          : {
              path: '/403',
              query: { from: router.currentRoute.value.fullPath },
            });
      })
      .catch(async () => {
        if (router.currentRoute.value.path !== '/catalog-error') {
          await router.replace('/catalog-error');
        }
      });
  });
}

function requireDynamicRoutes(): DynamicAdminTaskRoutes {
  if (!dynamicRoutes) throw new Error('Catalog Router is not bound');
  return dynamicRoutes;
}

function currentAccessKey(): string {
  const context = access.snapshot();
  if (!context) return 'anonymous';
  return [
    context.userId,
    context.currentFactoryId ?? '',
    [...context.permissions].sort().join(','),
  ].join('\u0000');
}

function collectRouteKeys(items: readonly CatalogNavigationItem[]): ReadonlySet<string> {
  const result = new Set<string>();
  const visit = (nodes: readonly CatalogNavigationItem[]): void => {
    for (const node of nodes) {
      if (node.type === 'ROUTE') result.add(node.routeKey);
      visit(node.children);
    }
  };
  visit(items);
  return result;
}
