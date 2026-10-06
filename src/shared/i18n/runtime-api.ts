import { apiPath, resolveApiUrl } from '../api/config';
import { httpClient } from '../api/http-client';

export type I18nOwner = 'system' | 'auth' | 'mdm';

export interface SupportedLocaleInfo {
  localeCode: string;
  displayName: string;
  nativeName: string;
  enabled: boolean;
  defaultLocale: boolean;
  sortOrder: number;
}

export interface RuntimeBundle {
  requestedLocale: string;
  effectiveLocale: string;
  bundles: Record<string, Record<string, string>>;
}

const runtimePath: Readonly<Record<I18nOwner, string>> = {
  system: '/i18n/runtime',
  auth: '/i18n/runtime',
  mdm: '/i18n/runtime',
};

/** 各 Owner 只暴露自己的 Runtime，System 只提供可选语言目录。 */
export const i18nRuntimeApi = {
  locales: () => httpClient.result<SupportedLocaleInfo[]>({ path: apiPath('system', '/i18n/locales') }),
  bundle: (owner: I18nOwner, locale: string, namespaces: readonly string[]) =>
    httpClient.result<RuntimeBundle>({
      path: apiPath(owner, `${runtimePath[owner]}/bundles`),
      query: { locale, namespaces: namespaces.join(',') },
    }),
  eventUrl: (owner: I18nOwner) => resolveApiUrl(apiPath(owner, `${runtimePath[owner]}/events`)),
};
