import { createApp, watchEffect } from 'vue';

import 'ant-design-vue/dist/reset.css';

import '@mom/common-ui/styles.css';
import '@mom/design-tokens/styles.css';

import RootApp from './root.vue';
import { appConfig } from './app/config';
import { $t, currentLocale, setupI18n } from './locales';
import { router } from './router';
import { installCatalogForegroundRevalidation } from './router/catalog';
import './styles.css';

export async function bootstrap(): Promise<void> {
  const app = createApp(RootApp);

  await setupI18n(app);
  app.use(router);
  installCatalogForegroundRevalidation();

  watchEffect(() => {
    void currentLocale.value;
    const routeTitle = router.currentRoute.value.meta.title;
    const localized = routeTitle ? $t(String(routeTitle)) : '';
    document.title = localized
      ? `${localized} - ${appConfig.name}`
      : appConfig.name;
  });

  app.mount('#app');
}
