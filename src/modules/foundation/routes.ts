import type { RouteRecordRaw } from 'vue-router';
import { ROUTE_NAMES } from '../../router/route-names';

/**
 * 基础模块只登记已经存在且可以访问的页面。
 * IAM、System、MDM 等模块在对应 Slice 实施时再追加，避免产生假入口。
 */
export const foundationRoutes: RouteRecordRaw[] = [
  {
    path: 'foundation/overview',
    name: ROUTE_NAMES.foundationOverview,
    component: () => import('./pages/FoundationOverviewPage.vue'),
    meta: {
      title: '前端基础概览',
      titleKey: 'foundation.overview.title',
      module: 'foundation',
      requiresAuth: false,
      navigationGroup: 'foundation',
      navigationOrder: 10,
    },
  },
];
