import type { RouteRecordRaw } from 'vue-router';
import { ROUTE_NAMES } from '../../router/route-names';

/** WMS Phase 1 只有实时库存读页面；详情通过总览进入，也支持深链接。 */
export const wmsRoutes: RouteRecordRaw[] = [
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
];
