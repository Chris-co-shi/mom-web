import type { RouteRecordRaw } from 'vue-router';
import { ROUTE_NAMES } from '../../router/route-names';

const sectionMeta = {
  requiresAuth: true,
  permissions: ['qms:quality-definition:read'],
  i18nOwners: ['system', 'qms'] as const,
  navigationGroup: 'mdm',
  navigationSection: 'quality-definition',
  navigationSectionTitleKey: 'navigation.mdmQualityDefinition' as const,
  navigationSectionOrder: 50,
};

/** QMS 权威页面挂载在主数据中心目录，编辑入口仍只写 QMS。 */
export const qmsRoutes: RouteRecordRaw[] = [
  {
    path: 'master-data/inspection-characteristics', name: ROUTE_NAMES.qmsInspectionCharacteristics,
    component: () => import('./pages/QualityCatalogPage.vue'), props: { kind: 'characteristics' },
    meta: { ...sectionMeta, title: '检验特性', titleKey: 'navigation.mdmInspectionCharacteristics', module: 'qms', navigationOrder: 150 },
  },
  {
    path: 'master-data/inspection-methods', name: ROUTE_NAMES.qmsInspectionMethods,
    component: () => import('./pages/QualityCatalogPage.vue'), props: { kind: 'methods' },
    meta: { ...sectionMeta, title: '检验方法', titleKey: 'navigation.mdmInspectionMethods', module: 'qms', navigationOrder: 160 },
  },
  {
    path: 'master-data/quality-specifications', name: ROUTE_NAMES.qmsQualitySpecifications,
    component: () => import('./pages/QualitySpecificationPage.vue'),
    meta: { ...sectionMeta, title: '质量标准', titleKey: 'navigation.mdmQualitySpecifications', module: 'qms', navigationOrder: 170 },
  },
];
