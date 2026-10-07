import { createRouter, createWebHistory } from 'vue-router';
import { watch } from 'vue';
import { ensureNamespaces, translate, useLocale } from '../shared/i18n/locale';
import { emergencyLocale, emergencyMessages } from '../shared/i18n/emergency-messages';
import { resolveAuthNavigation } from './auth-guard';
import { appRoutes } from './route-registry';
import { ROUTE_NAMES } from './route-names';

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: appRoutes,
  scrollBehavior: () => ({ top: 0 }),
});

router.beforeEach(async (to) => {
  const redirect = await resolveAuthNavigation(to);
  if (redirect) return redirect;
  const namespaces = [...new Set(to.matched.flatMap((record) => record.meta.i18nNamespaces ?? []))];
  if (namespaces.length > 0) {
    try { await ensureNamespaces(namespaces); }
    catch { return { name: ROUTE_NAMES.offline, query: { redirect: to.fullPath } }; }
  }
  return undefined;
});

function updateDocumentTitle(titleKey: Parameters<typeof translate>[0]): void {
  document.title = `${translate(titleKey)} · MOM`;
}

router.afterEach((to) => {
  document.title = to.name === ROUTE_NAMES.offline
    ? `${emergencyMessages[emergencyLocale(true)].routeTitle} · MOM`
    : `${translate(to.meta.titleKey)} · MOM`;
});

/** Pinia 激活后再订阅 Locale，避免模块求值阶段访问尚未创建的 Store。 */
export function installLocaleTitleWatcher(): void {
  const { locale } = useLocale();
  watch(locale, () => {
    const current = router.currentRoute.value;
    if (current.name === ROUTE_NAMES.offline) {
      document.title = `${emergencyMessages[emergencyLocale(true)].routeTitle} · MOM`;
    } else if (current.meta.titleKey) {
      updateDocumentTitle(current.meta.titleKey);
    }
  });
}
