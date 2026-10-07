import type { RouteRecordRaw } from 'vue-router';
import { ROUTE_NAMES } from '../../router/route-names';

export const systemRoutes: RouteRecordRaw[] = [
  { path: 'system/dictionaries', name: ROUTE_NAMES.systemDictionaries, component: () => import('./pages/DictionaryPage.vue'),
    meta: { title: '平台字典', titleKey: 'system.dictionary.title', module: 'system', requiresAuth: true,
      permissions: ['system:dictionary:read'], i18nNamespaces: ['system.web'], navigationGroup: 'system', navigationOrder: 10 } },
  { path: 'system/locales', name: ROUTE_NAMES.systemLocales, component: () => import('./pages/SupportedLocalePage.vue'),
    meta: { title: '支持语言', titleKey: 'system.locales.title', module: 'system', requiresAuth: true,
      permissions: ['system:i18n:read'], i18nNamespaces: ['system.web'], navigationGroup: 'system', navigationOrder: 20 } },
  { path: 'system/messages', name: ROUTE_NAMES.systemMessages, component: () => import('../i18n/pages/I18nManagementPage.vue'),
    meta: { title: '国际化管理', titleKey: 'system.messages.title', module: 'system', requiresAuth: true,
      permissions: ['system:i18n:read', 'auth:i18n:read', 'mdm:i18n:read'], permissionMode: 'any',
      i18nNamespaces: ['system.web'], navigationGroup: 'system', navigationOrder: 30 } },
];
