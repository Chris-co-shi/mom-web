import { createRouter, createWebHistory } from 'vue-router';
import { watch } from 'vue';
import { translate, useLocale } from '../shared/i18n/locale';
import { resolveAuthNavigation } from './auth-guard';
import { appRoutes } from './route-registry';

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: appRoutes,
  scrollBehavior: () => ({ top: 0 }),
});

router.beforeEach((to) => resolveAuthNavigation(to));

function updateDocumentTitle(titleKey: Parameters<typeof translate>[0]): void {
  document.title = `${translate(titleKey)} · GEO MOM`;
}

router.afterEach((to) => updateDocumentTitle(to.meta.titleKey));

const { locale } = useLocale();
watch(locale, () => {
  const titleKey = router.currentRoute.value.meta.titleKey;
  if (titleKey) updateDocumentTitle(titleKey);
});
