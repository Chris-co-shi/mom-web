import type { PermissionCode } from '@mom/access';
import type { Router } from 'vue-router';

import { access, bootstrapRuntime, runtimeState } from '../runtime';
import {
  accessIsReady,
  defaultAuthorizedPath,
  resolveAuthorizedRedirect,
  synchronizeAccess,
} from './access';
import {
  isCatalogRouteActive,
  synchronizeCatalog,
} from './catalog';
import { findAdminTask } from './registry';
import { coreRouteNames } from './routes';

let bootstrapFlight: Promise<boolean> | undefined;

async function ensureRuntime(): Promise<void> {
  if (runtimeState.phase !== 'starting') return;
  bootstrapFlight ??= bootstrapRuntime().finally(() => {
    bootstrapFlight = undefined;
  });
  await bootstrapFlight;
}

export function createRouterGuard(router: Router): void {
  router.beforeEach(async (to) => {
    await ensureRuntime();

    if (runtimeState.phase === 'anonymous') {
      if (to.name === 'Login') return true;
      return {
        path: '/auth/login',
        query: to.fullPath === '/' ? {} : {
          redirect: encodeURIComponent(to.fullPath),
        },
        replace: true,
      };
    }

    if (runtimeState.phase === 'password-change') {
      return to.name === 'PasswordChange'
        ? true
        : {
            path: '/auth/change-password',
            query: to.query,
            replace: true,
          };
    }

    if (runtimeState.phase === 'access-error') {
      return to.name === 'MenuError'
        ? true
        : {
            path: '/menu-error',
            query: to.fullPath === '/' ? {} : {
              redirect: encodeURIComponent(to.fullPath),
            },
            replace: true,
          };
    }

    if (runtimeState.phase === 'error') {
      return to.name === 'RuntimeError'
        ? true
        : { path: '/runtime-error', replace: true };
    }

    if (runtimeState.phase !== 'ready') {
      return to.name === 'Login' ? true : { path: '/auth/login', replace: true };
    }

    if (!accessIsReady()) {
      try {
        await synchronizeAccess();
      }
      catch {
        return {
          path: '/menu-error',
          query: to.fullPath === '/' ? {} : {
            redirect: encodeURIComponent(to.fullPath),
          },
          replace: true,
        };
      }
    }

    const catalogRequired = to.path === '/'
      || to.name === 'Authentication'
      || to.name === 'Login'
      || to.name === 'NotFound'
      || Boolean(findAdminTask(to));
    if (catalogRequired) {
      try {
        await synchronizeCatalog();
      }
      catch {
        return to.name === 'CatalogError'
          ? true
          : {
              path: '/catalog-error',
              query: to.fullPath === '/' ? {} : {
                redirect: encodeURIComponent(to.fullPath),
              },
              replace: true,
            };
      }
    }

    if (to.name === 'NotFound') {
      const task = findAdminTask(to);
      if (!task) return true;
      if (!access.hasPermission(task.requiredPermission)) {
        return {
          path: '/403',
          query: { from: to.fullPath },
          replace: true,
        };
      }
      if (!isCatalogRouteActive(task.routeKey)) {
        return {
          path: '/catalog-error',
          query: { redirect: encodeURIComponent(to.fullPath) },
          replace: true,
        };
      }
      return {
        hash: to.hash,
        path: to.path,
        query: to.query,
        replace: true,
      };
    }

    if (to.name === 'Login' || to.name === 'Authentication') {
      return {
        path: resolveAuthorizedRedirect(to.query.redirect),
        replace: true,
      };
    }

    if (to.path === '/') {
      return { path: defaultAuthorizedPath(), replace: true };
    }

    const isCoreRoute = coreRouteNames.has(String(to.name));
    if (isCoreRoute || to.meta.ignoreAccess) return true;

    const permission = to.meta.requiredPermission;
    if (permission && !access.hasPermission(permission as PermissionCode)) {
      return {
        path: '/403',
        query: { from: to.fullPath },
        replace: true,
      };
    }
    if (to.meta.routeKey && !isCatalogRouteActive(to.meta.routeKey)) {
      return {
        path: '/catalog-error',
        query: { redirect: encodeURIComponent(to.fullPath) },
        replace: true,
      };
    }
    return true;
  });

  router.onError((error, to) => {
    runtimeState.error = error instanceof Error ? error.message : String(error);
    runtimeState.phase = 'error';
    if (to.name !== 'RuntimeError') {
      void router.replace({ path: '/runtime-error', replace: true });
    }
  });
}
