import { defineOverridesPreferences } from '@vben/preferences';

import momLogo from './assets/mom-logo.svg';

export const overridesPreferences = defineOverridesPreferences({
  app: {
    accessMode: 'backend',
    authPageLayout: 'panel-left',
    contentCompact: 'wide',
    contentPadding: 16,
    defaultAvatar: '',
    defaultHomePath: '/iam/users',
    enableCheckUpdates: false,
    enablePreferences: true,
    enableRefreshToken: false,
    layout: 'sidebar-nav',
    locale: 'zh-CN',
    loginExpiredMode: 'page',
    name: import.meta.env.VITE_APP_TITLE ?? 'MOM Admin',
    preferencesButtonPosition: 'auto',
    timezone: 'Asia/Shanghai',
  },
  copyright: {
    companyName: 'MOM',
    companySiteLink: '',
    date: '2026',
    enable: true,
    icp: '',
    icpLink: '',
    settingShow: true,
  },
  header: {
    height: 56,
  },
  logo: {
    enable: true,
    fit: 'contain',
    source: momLogo,
  },
  sidebar: {
    collapseWidth: 64,
    width: 240,
  },
  tabbar: {
    enable: true,
    height: 40,
    persist: false,
    styleType: 'chrome',
  },
  theme: {
    colorPrimary: 'hsl(243 75% 59%)',
    mode: 'light',
    radius: '0.5',
    semiDarkHeader: false,
    semiDarkSidebar: false,
  },
  widget: {
    fullscreen: true,
    globalSearch: false,
    languageToggle: true,
    lockScreen: false,
    notification: false,
    refresh: true,
    sidebarToggle: true,
    themeToggle: true,
    timezone: true,
  },
});
