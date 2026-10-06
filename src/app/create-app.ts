import { createApp } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import App from '../App.vue';
import { clearAuthSession, getAccessToken, initializeAuthSession } from '../modules/auth/model/auth-session';
import { installLocaleTitleWatcher, router } from '../router';
import { ROUTE_NAMES } from '../router/route-names';
import { setHttpRequestContextProvider, setHttpUnauthorizedHandler } from '../shared/api/http-client';
import { connectI18nEvents, i18n, initializeLocale, useLocale } from '../shared/i18n/locale';
import { initializeTheme } from '../shared/theme/theme';

/**
 * 创建 MOM PC Web 应用实例，并集中完成应用级插件装配。
 *
 * 主题与 Locale 在 Vue 挂载前初始化，避免首屏先渲染错误的外观或语言。
 */
export async function createMomApp() {
  const pinia = createPinia();
  setActivePinia(pinia);
  initializeTheme();
  initializeAuthSession();
  const { locale } = useLocale();
  setHttpRequestContextProvider(() => ({
    accessToken: getAccessToken(),
    locale: locale.value,
  }));
  setHttpUnauthorizedHandler(() => {
    clearAuthSession();
    const current = router.currentRoute.value;
    if (current.name !== ROUTE_NAMES.login) {
      void router.replace({
        name: ROUTE_NAMES.login,
        query: { redirect: current.fullPath },
      });
    }
  });
  await initializeLocale();
  installLocaleTitleWatcher();
  connectI18nEvents('system');
  connectI18nEvents('auth');
  return createApp(App).use(pinia).use(i18n).use(router);
}
