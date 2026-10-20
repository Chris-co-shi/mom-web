/**
 * 前端路由稳定名称目录。
 * 路由跳转和权限守卫依赖这些名称，页面路径变化时不应在业务代码中散落字符串。
 */
export const ROUTE_NAMES = {
  wmsInventoryOverview: 'wms-inventory-overview',
  wmsInventoryDetails: 'wms-inventory-details',
  wmsInventoryHistory: 'wms-inventory-history',
  wmsOpeningDocuments: 'wms-opening-documents',
  wmsOpeningDetail: 'wms-opening-detail',
  wmsInventoryCounts: 'wms-inventory-counts',
  wmsInventoryCountDetail: 'wms-inventory-count-detail',
  mdmPlants: 'mdm-plants',
  mdmUom: 'mdm-uom',
  mdmCategories: 'mdm-categories',
  mdmMaterials: 'mdm-materials',
  mdmFormulas: 'mdm-formulas',
  mdmRoutings: 'mdm-routings',
  mdmProductionVersions: 'mdm-production-versions',
  mdmInspectionCharacteristics: 'mdm-inspection-characteristics',
  mdmInspectionMethods: 'mdm-inspection-methods',
  mdmQualitySpecifications: 'mdm-quality-specifications',
  mdmGovernanceChecks: 'mdm-governance-checks',
  mdmWorkshops: 'mdm-workshops',
  mdmProductionLines: 'mdm-production-lines',
  mdmWorkstations: 'mdm-workstations',
  mdmWarehouses: 'mdm-warehouses',
  mdmWarehouseAreas: 'mdm-warehouse-areas',
  mdmLocationTypes: 'mdm-location-types',
  mdmLocations: 'mdm-locations',
  iamUsers: 'iam-users',
  iamRoles: 'iam-roles',
  iamPermissions: 'iam-permissions',
  iamPermissionResources: 'iam-permission-resources',
  systemDictionaries: 'system-dictionaries',
  systemLocales: 'system-locales',
  systemMessages: 'system-messages',
  systemCodeRules: 'system-code-rules',
  foundationOverview: 'foundation-overview',
  login: 'login',
  account: 'account',
  forbidden: 'forbidden',
  offline: 'offline',
  error: 'error',
  notFound: 'not-found',
} as const;

/** 路由名称联合类型，限制导航目标只能引用已登记的名称。 */
export type MomRouteName = (typeof ROUTE_NAMES)[keyof typeof ROUTE_NAMES];
