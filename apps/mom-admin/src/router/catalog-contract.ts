import type {
  CatalogContract,
  CatalogNodeContract,
} from '@mom/system-client';

import {
  ADMIN_ROUTE_CONTRACT_VERSION,
  ADMIN_TASK_CONTRACTS,
  ADMIN_TASK_DOMAINS,
} from './task-contract';

export const ADMIN_CATALOG_APPLICATION_CODE = 'mom-admin' as const;

const nodes: Record<string, CatalogNodeContract> = Object.create(null) as Record<
  string,
  CatalogNodeContract
>;

for (const domain of ADMIN_TASK_DOMAINS) {
  nodes[domain.routeKey] = Object.freeze({
    i18n: Object.freeze({
      messageKey: domain.catalogI18nKey,
      resourceCode: 'runtime',
    }),
    iconKey: domain.iconKey,
    parentRouteKey: null,
    permissionCode: null,
    type: 'GROUP',
  });
}

for (const task of ADMIN_TASK_CONTRACTS) {
  const domain = ADMIN_TASK_DOMAINS.find((item) => item.key === task.domain);
  if (!domain) throw new Error(`Admin task domain is not registered: ${task.domain}`);
  nodes[task.routeKey] = Object.freeze({
    i18n: Object.freeze({
      messageKey: task.catalogI18nKey,
      resourceCode: 'runtime',
    }),
    iconKey: task.iconKey,
    parentRouteKey: domain.routeKey,
    permissionCode: task.requiredPermission,
    type: 'ROUTE',
  });
}

/**
 * System Catalog 只能选择该白名单中的任务，不能下发 Path、Component 或新的权限能力。
 */
export const ADMIN_CATALOG_CONTRACT: CatalogContract = Object.freeze({
  applicationCode: ADMIN_CATALOG_APPLICATION_CODE,
  applicationI18n: Object.freeze({
    messageKey: 'mom.runtime.application.admin',
    resourceCode: 'runtime',
  }),
  applicationIconKey: 'app-window',
  applicationType: 'PLATFORM',
  channels: Object.freeze(['WEB'] as const),
  nodes: Object.freeze(nodes),
  routeContractVersion: ADMIN_ROUTE_CONTRACT_VERSION,
  snapshotSchemaVersion: 1,
});
