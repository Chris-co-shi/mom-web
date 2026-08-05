import type { SystemApplicationCode, SystemClientId } from './contracts.js';

export type CatalogApplicationType = 'BUSINESS' | 'PLATFORM';
export type CatalogClientChannel = 'MOBILE' | 'WEB';
export type CatalogNavigationType = 'GROUP' | 'ROUTE';
export type CatalogRuntimePhase = 'ACTIVE' | 'IDLE' | 'LOADING' | 'RESTRICTED';

export interface CatalogI18nReference {
  messageKey: string;
  resourceCode: string;
}

export interface CatalogNavigationItem {
  children: readonly CatalogNavigationItem[];
  i18n: CatalogI18nReference;
  iconKey: string;
  keepAlive: boolean;
  permissionCode: string | null;
  routeKey: string;
  type: CatalogNavigationType;
  visibleInBreadcrumb: boolean;
  visibleInMenu: boolean;
  visibleInTab: boolean;
}

export interface CatalogChannelCatalog {
  clientChannel: CatalogClientChannel;
  navigation: readonly CatalogNavigationItem[];
}

export interface CatalogApplicationCatalog {
  applicationCode: SystemApplicationCode;
  applicationType: CatalogApplicationType;
  catalogVersion: number;
  channels: readonly CatalogChannelCatalog[];
  i18n: CatalogI18nReference;
  iconKey: string;
  routeContractVersion: number;
}

export interface CatalogView {
  applications: readonly CatalogApplicationCatalog[];
  generatedAt: string;
  snapshotSchemaVersion: number;
}

export interface CatalogNodeContract {
  i18n: CatalogI18nReference;
  iconKey: string;
  parentRouteKey: string | null;
  permissionCode: string | null;
  type: CatalogNavigationType;
}

/**
 * 客户端可执行能力的静态白名单。Catalog 只能选择这里已有的节点，不能扩大能力集合。
 */
export interface CatalogContract {
  applicationCode: SystemApplicationCode;
  applicationI18n: CatalogI18nReference;
  applicationIconKey: string;
  applicationType: CatalogApplicationType;
  channels: readonly CatalogClientChannel[];
  nodes: Readonly<Record<string, CatalogNodeContract>>;
  routeContractVersion: number;
  snapshotSchemaVersion: number;
}

export interface CatalogRuntimeIdentity {
  permissions: ReadonlySet<string>;
  userId: string;
}

export interface CatalogRuntimeSnapshot {
  applicationCode: SystemApplicationCode;
  catalog?: CatalogView;
  clientId: SystemClientId;
  etag?: string;
  phase: CatalogRuntimePhase;
  restrictionReason?: string;
  userId?: string;
}
