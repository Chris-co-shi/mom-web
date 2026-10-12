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
];
