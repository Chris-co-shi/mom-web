import type { Locale } from 'ant-design-vue/es/locale';
import type { App } from 'vue';
import type {
  LocaleSetupOptions,
  SupportedLanguagesType,
} from '@vben/locales';

import { ref } from 'vue';

import {
  $t,
  loadLocalesMapFromDir,
  setupI18n as setupCoreI18n,
} from '@vben/locales';
import { preferences } from '@vben/preferences';

import antdEnLocale from 'ant-design-vue/es/locale/en_US';
import antdZhLocale from 'ant-design-vue/es/locale/zh_CN';
import dayjs from 'dayjs';

const antdLocale = ref<Locale>(antdZhLocale);
const modules = import.meta.glob('./langs/**/*.json');
const localesMap = loadLocalesMapFromDir(
  /\.\/langs\/([^/]+)\/(.*)\.json$/,
  modules,
);

async function loadMessages(language: SupportedLanguagesType) {
  const [messages] = await Promise.all([
    localesMap[language]?.(),
    loadThirdPartyMessages(language),
  ]);
  return messages?.default;
}

async function loadThirdPartyMessages(
  language: SupportedLanguagesType,
): Promise<void> {
  if (language === 'en-US') {
    antdLocale.value = antdEnLocale;
    await import('dayjs/locale/en');
    dayjs.locale('en');
    return;
  }
  antdLocale.value = antdZhLocale;
  await import('dayjs/locale/zh-cn');
  dayjs.locale('zh-cn');
}

async function setupI18n(
  app: App,
  options: LocaleSetupOptions = {},
): Promise<void> {
  await setupCoreI18n(app, {
    defaultLocale: preferences.app.locale,
    loadMessages,
    missingWarn: !import.meta.env.PROD,
    ...options,
  });
}

export { $t, antdLocale, setupI18n };
