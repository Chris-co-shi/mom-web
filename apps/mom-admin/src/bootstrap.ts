import { createApp, watchEffect } from 'vue';

import { registerAccessDirective } from '@vben/access';
import { preferences } from '@vben/preferences';
import '@vben/styles';
import '@vben/styles/antd';
import '@vben/tailwind-config';

import { useTitle } from '@vueuse/core';
import Antd from 'ant-design-vue';
import { createPinia } from 'pinia';

import '@mom/common-ui/styles.css';
import '@mom/design-tokens/styles.css';

import RootApp from './root.vue';
import { $t, setupI18n } from './locales';
import { router } from './router';
import './styles.css';

export async function bootstrap(): Promise<void> {
  const app = createApp(RootApp);
  const pinia = createPinia();

  app.use(pinia);
  app.use(Antd);
  registerAccessDirective(app);
  await setupI18n(app);
  app.use(router);

  watchEffect(() => {
    if (!preferences.app.dynamicTitle) return;
    const routeTitle = router.currentRoute.value.meta.title;
    const localized = routeTitle ? $t(String(routeTitle)) : '';
    useTitle(localized
      ? `${localized} - ${preferences.app.name}`
      : preferences.app.name);
  });

  app.mount('#app');
}
