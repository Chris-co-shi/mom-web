import type { RouteRecordRaw } from 'vue-router';
import { ROUTE_NAMES } from '../../router/route-names';

/** MDM 自主管理页面在 Web 维护静态路由；Permission 只控制导航可见性。 */
export const mdmRoutes: RouteRecordRaw[] = [
  {
    path: 'mdm/plants',
    name: ROUTE_NAMES.mdmPlants,
    component: () => import('./pages/PlantManagementPage.vue'),
    meta: {
      title: '工厂管理',
      titleKey: 'navigation.mdmPlants',
      module: 'mdm',
      requiresAuth: true,
      permissions: ['mdm:factory:read'],
      i18nNamespaces: ['mdm.web'],
      navigationGroup: 'mdm',
      navigationOrder: 10,
    },
  },
  {
    path: 'mdm/workshops', name: ROUTE_NAMES.mdmWorkshops,
    component: () => import('./pages/StructureManagementPage.vue'),
    props: { kind: 'workshops' },
    meta: {
      title: 'workshops', titleKey: 'navigation.mdmWorkshops', module: 'mdm', requiresAuth: true,
      permissions: ['mdm:factory:read'], i18nNamespaces: ['mdm.web'],
      navigationGroup: 'mdm', navigationOrder: 20,
    },
  },
  {
    path: 'mdm/production-lines', name: ROUTE_NAMES.mdmProductionLines,
    component: () => import('./pages/StructureManagementPage.vue'),
    props: { kind: 'production-lines' },
    meta: {
      title: 'production-lines', titleKey: 'navigation.mdmProductionLines', module: 'mdm', requiresAuth: true,
      permissions: ['mdm:factory:read'], i18nNamespaces: ['mdm.web'],
      navigationGroup: 'mdm', navigationOrder: 30,
    },
  },
  {
    path: 'mdm/workstations', name: ROUTE_NAMES.mdmWorkstations,
    component: () => import('./pages/StructureManagementPage.vue'),
    props: { kind: 'workstations' },
    meta: {
      title: 'workstations', titleKey: 'navigation.mdmWorkstations', module: 'mdm', requiresAuth: true,
      permissions: ['mdm:factory:read'], i18nNamespaces: ['mdm.web'],
      navigationGroup: 'mdm', navigationOrder: 40,
    },
  },
  {
    path: 'mdm/warehouses', name: ROUTE_NAMES.mdmWarehouses,
    component: () => import('./pages/StructureManagementPage.vue'),
    props: { kind: 'warehouses' },
    meta: {
      title: 'warehouses', titleKey: 'navigation.mdmWarehouses', module: 'mdm', requiresAuth: true,
      permissions: ['mdm:warehouse:read'], i18nNamespaces: ['mdm.web'],
      navigationGroup: 'mdm', navigationOrder: 50,
    },
  },
  {
    path: 'mdm/warehouse-areas', name: ROUTE_NAMES.mdmWarehouseAreas,
    component: () => import('./pages/StructureManagementPage.vue'),
    props: { kind: 'warehouse-areas' },
    meta: {
      title: 'warehouse-areas', titleKey: 'navigation.mdmWarehouseAreas', module: 'mdm', requiresAuth: true,
      permissions: ['mdm:warehouse:read'], i18nNamespaces: ['mdm.web'],
      navigationGroup: 'mdm', navigationOrder: 60,
    },
  },
  {
    path: 'mdm/location-types', name: ROUTE_NAMES.mdmLocationTypes,
    component: () => import('./pages/StructureManagementPage.vue'),
    props: { kind: 'location-types' },
    meta: {
      title: 'location-types', titleKey: 'navigation.mdmLocationTypes', module: 'mdm', requiresAuth: true,
      permissions: ['mdm:location:read'], i18nNamespaces: ['mdm.web'],
      navigationGroup: 'mdm', navigationOrder: 70,
    },
  },
  {
    path: 'mdm/locations', name: ROUTE_NAMES.mdmLocations,
    component: () => import('./pages/StructureManagementPage.vue'),
    props: { kind: 'locations' },
    meta: {
      title: 'locations', titleKey: 'navigation.mdmLocations', module: 'mdm', requiresAuth: true,
      permissions: ['mdm:location:read'], i18nNamespaces: ['mdm.web'],
      navigationGroup: 'mdm', navigationOrder: 80,
    },
  },
  {
    path: 'mdm/uom', name: ROUTE_NAMES.mdmUom,
    component: () => import('./pages/UomManagementPage.vue'),
    meta: { title: '计量单位', titleKey: 'navigation.mdmUom', module: 'mdm', requiresAuth: true,
      permissions: ['mdm:uom:read'], i18nNamespaces: ['mdm.web'],
      navigationGroup: 'mdm', navigationOrder: 90 },
  },
];
