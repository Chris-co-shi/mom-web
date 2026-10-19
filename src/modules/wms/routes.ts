import type { RouteRecordRaw } from 'vue-router';
import { ROUTE_NAMES } from '../../router/route-names';

/** WMS Phase 1 只有实时库存读页面；详情通过总览进入，也支持深链接。 */
export const wmsRoutes: RouteRecordRaw[] = [
  {
    path: 'wms/opening-documents', name: ROUTE_NAMES.wmsOpeningDocuments,
    component: () => import('./pages/OpeningInventoryListPage.vue'),
    meta: { title: '期初库存建账', titleKey: 'wms.opening.title', module: 'wms',
      requiresAuth: true, permissions: ['wms:opening:read'], i18nOwners: ['wms'],
      navigationGroup: 'wms', navigationOrder: 20 },
  },
  {
    path: 'wms/opening-documents/:id', name: ROUTE_NAMES.wmsOpeningDetail,
    component: () => import('./pages/OpeningInventoryDetailPage.vue'),
    meta: { title: '期初建账详情', titleKey: 'wms.opening.detail', module: 'wms',
      requiresAuth: true, permissions: ['wms:opening:read'], i18nOwners: ['wms'], hideInMenu: true },
  },
  {
    path: 'wms/inventory', name: ROUTE_NAMES.wmsInventoryOverview,
    component: () => import('./pages/InventoryOverviewPage.vue'),
    meta: { title: '实时库存总览', titleKey: 'wms.inventory.overview', module: 'wms',
      requiresAuth: true, permissions: ['wms:inventory:read'], i18nOwners: ['wms'],
      navigationGroup: 'wms', navigationOrder: 10 },
  },
  {
    path: 'wms/inventory/details', name: ROUTE_NAMES.wmsInventoryDetails,
    component: () => import('./pages/InventoryDetailsPage.vue'),
    meta: { title: '实时库存明细', titleKey: 'wms.inventory.details', module: 'wms',
      requiresAuth: true, permissions: ['wms:inventory:read'], i18nOwners: ['wms'], hideInMenu: true },
  },
  {
    path: 'wms/inventory/history', name: ROUTE_NAMES.wmsInventoryHistory,
    component: () => import('./pages/InventoryHistoryPage.vue'),
    meta: { title: '库存历史查询', titleKey: 'wms.inventory.history.title', module: 'wms',
      requiresAuth: true, permissions: ['wms:inventory:read'], i18nOwners: ['wms'], hideInMenu: true },
  },
];
