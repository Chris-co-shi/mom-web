import { createApp } from 'vue';
import App from '../App.vue';
import { clearAuthSession, getAccessToken, initializeAuthSession } from '../modules/auth/model/auth-session';
import { router } from '../router';
import { ROUTE_NAMES } from '../router/route-names';
import { setHttpRequestContextProvider, setHttpUnauthorizedHandler } from '../shared/api/http-client';
import { initializeLocale } from '../shared/i18n/locale';
import { useLocale } from '../shared/i18n/locale';
import { initializeTheme } from '../shared/theme/theme';

/**
 * 创建 MOM PC Web 应用实例，并集中完成应用级插件装配。
 *
 * 主题与 Locale 在 Vue 挂载前初始化，避免首屏先渲染错误的外观或语言。
 */
export function createMomApp() {
  initializeLocale();
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
  return createApp(App).use(router);
}
