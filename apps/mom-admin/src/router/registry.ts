import type { Component } from 'vue';

import {
  ADMIN_TASK_CONTRACTS,
  ADMIN_TASK_DOMAINS,
  type AdminTaskContract,
  type AdminTaskDomain,
  type AdminTaskPermission,
} from './task-contract';

export interface AdminTaskDefinition extends AdminTaskContract {
  component: () => Promise<{ default: Component }>;
}

export interface AdminTaskNavigationGroup {
  domain: AdminTaskDomain;
  tasks: readonly AdminTaskDefinition[];
}

export { ADMIN_ROUTE_CONTRACT_VERSION, ADMIN_TASK_DOMAINS } from './task-contract';
export type {
  AdminTaskDomain,
  AdminTaskDomainKey,
  AdminTaskRouteName,
  IamSection,
} from './task-contract';

export const ADMIN_TASKS: readonly AdminTaskDefinition[] =
  ADMIN_TASK_CONTRACTS.map((task) => ({
    ...task,
    component: () => import('../App.vue'),
  }));

export function accessibleTaskNavigation(
  hasPermission: (permission: AdminTaskPermission) => boolean,
): readonly AdminTaskNavigationGroup[] {
  return ADMIN_TASK_DOMAINS
    .map((domain) => ({
      domain,
      tasks: ADMIN_TASKS.filter((task) =>
        task.domain === domain.key && hasPermission(task.requiredPermission)),
    }))
    .filter(({ tasks }) => tasks.length > 0);
}

export function findAdminTask(
  route: { name?: unknown; path: string },
): AdminTaskDefinition | undefined {
  return ADMIN_TASKS.find((task) =>
    task.name === route.name || task.path === route.path,
  );
}

export function firstAccessibleTaskPath(
  hasPermission: (permission: AdminTaskPermission) => boolean,
): string | undefined {
  return ADMIN_TASKS.find((task) => hasPermission(task.requiredPermission))?.path;
}
