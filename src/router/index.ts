import { createRouter, createWebHistory } from 'vue-router';
import { watch } from 'vue';
import { ensureNamespaces, translate, useLocale } from '../shared/i18n/locale';
import { resolveAuthNavigation } from './auth-guard';
import { appRoutes } from './route-registry';

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: appRoutes,
  scrollBehavior: () => ({ top: 0 }),
});

router.beforeEach(async (to) => {
  const redirect = await resolveAuthNavigation(to);
  if (redirect) return redirect;
  if (to.matched.some((record) => record.meta.requiresAuth)) {
    try { await ensureNamespaces(['auth.navigation', 'system.navigation', 'auth.iam', 'auth.account']); }
    catch { return { name: 'offline' }; }
  }
  return undefined;
});

function updateDocumentTitle(titleKey: Parameters<typeof translate>[0]): void {
  document.title = `${translate(titleKey)} · MOM`;
}

router.afterEach((to) => updateDocumentTitle(to.meta.titleKey));

/** Pinia 激活后再订阅 Locale，避免模块求值阶段访问尚未创建的 Store。 */
export function installLocaleTitleWatcher(): void {
  const { locale } = useLocale();
  watch(locale, () => {
    const titleKey = router.currentRoute.value.meta.titleKey;
    if (titleKey) updateDocumentTitle(titleKey);
  });
}
