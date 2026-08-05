import type { SystemLocale } from '@mom/system-client';

export interface MomAdminAppConfig {
  copyright: Readonly<{
    companyName: string;
    date: string;
  }>;
  defaultLocale: SystemLocale;
  name: string;
}

/**
 * Admin 的不可变应用配置。
 *
 * 这里仅保存构建期产品信息，不承载用户偏好、权限或服务端动态配置。
 */
export const appConfig: Readonly<MomAdminAppConfig> = Object.freeze({
  copyright: Object.freeze({
    companyName: 'MOM',
    date: '2026',
  }),
  defaultLocale: 'zh-CN',
  name: import.meta.env.VITE_APP_TITLE ?? 'MOM Admin',
});
