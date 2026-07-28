import type { Router } from 'vue-router';

import { preferences } from '@vben/preferences';
import { useAccessStore } from '@vben/stores';
import { startProgress, stopProgress } from '@vben/utils';

import { bootstrapRuntime, runtimeState } from '../runtime';
import {
  defaultAuthorizedPath,
  resolveAuthorizedRedirect,
  synchronizeAccess,
} from './access';
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
    if (preferences.transition.progress) startProgress();
    await ensureRuntime();

    const isCoreRoute = coreRouteNames.has(String(to.name));

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

    if (runtimeState.phase !== 'ready') {
      return to.name === 'Login' ? true : { path: '/auth/login', replace: true };
    }

    const accessStore = useAccessStore();
    if (!accessStore.isAccessChecked) {
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
      if (to.path === '/') {
        return { path: defaultAuthorizedPath(), replace: true };
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

    if (isCoreRoute || to.meta.ignoreAccess) return true;

    const permission = to.meta.requiredPermission;
    if (
      permission
      && !accessStore.accessCodes.includes(String(permission))
    ) {
      return {
        path: '/403',
        query: { from: to.fullPath },
        replace: true,
      };
    }
    return true;
  });

  router.afterEach(() => {
    if (preferences.transition.progress) stopProgress();
  });

  router.onError(() => {
    if (preferences.transition.progress) stopProgress();
  });
}
