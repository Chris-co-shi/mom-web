import type { RouteRecordRaw } from 'vue-router';
import { ROUTE_NAMES } from '../../router/route-names';

const sectionMeta = {
  requiresAuth: true,
  permissions: ['mdm:quality-definition:read'],
  i18nOwners: ['system', 'mdm'] as const,
  navigationGroup: 'mdm',
  navigationSection: 'quality-definition',
  navigationSectionTitleKey: 'navigation.mdmQualityDefinition' as const,
  navigationSectionOrder: 50,
};

/** MDM 权威的质量基础定义页面，不承载 QMS 检验执行状态。 */
export const mdmQualityRoutes: RouteRecordRaw[] = [
  {
    path: 'master-data/inspection-characteristics', name: ROUTE_NAMES.mdmInspectionCharacteristics,
    component: () => import('./pages/QualityCatalogPage.vue'), props: { kind: 'characteristics' },
    meta: { ...sectionMeta, title: '检验特性', titleKey: 'navigation.mdmInspectionCharacteristics', module: 'mdm', navigationOrder: 150 },
  },
  {
    path: 'master-data/inspection-methods', name: ROUTE_NAMES.mdmInspectionMethods,
    component: () => import('./pages/QualityCatalogPage.vue'), props: { kind: 'methods' },
    meta: { ...sectionMeta, title: '检验方法', titleKey: 'navigation.mdmInspectionMethods', module: 'mdm', navigationOrder: 160 },
  },
  {
    path: 'master-data/quality-specifications', name: ROUTE_NAMES.mdmQualitySpecifications,
    component: () => import('./pages/QualitySpecificationPage.vue'),
    meta: { ...sectionMeta, title: '质量标准', titleKey: 'navigation.mdmQualitySpecifications', module: 'mdm', navigationOrder: 170 },
  },
];
