import type { SystemLocale } from '@mom/system-client';
import type { Locale as AntdLocale } from 'ant-design-vue/es/locale';
import type { App } from 'vue';

import { ref } from 'vue';
import { createI18n } from 'vue-i18n';

import antdEnLocale from 'ant-design-vue/es/locale/en_US';
import antdZhLocale from 'ant-design-vue/es/locale/zh_CN';
import dayjs from 'dayjs';

import { appConfig } from '../app/config';

type LocaleMessages = Record<string, unknown>;
type NamedValues = Record<string, number | string>;

const localeModules = import.meta.glob<{ default: LocaleMessages }>('./langs/**/*.json');
const staticMessages = new Map<SystemLocale, LocaleMessages>();

export const currentLocale = ref<SystemLocale>(appConfig.defaultLocale);
export const antdLocale = ref<AntdLocale>(antdZhLocale);

export const i18n = createI18n({
  fallbackLocale: appConfig.defaultLocale,
  globalInjection: true,
  legacy: false,
  locale: appConfig.defaultLocale,
  messages: {},
  missingWarn: !import.meta.env.PROD,
});

export async function setupI18n(app: App): Promise<void> {
  app.use(i18n);
  await setLocale(appConfig.defaultLocale);
}

/** 切换当前实例语言；匿名阶段只改变当前运行状态，不写入持久化偏好。 */
export async function setLocale(locale: SystemLocale): Promise<void> {
  const messages = await loadStaticMessages(locale);
  i18n.global.setLocaleMessage(locale, cloneMessages(messages));
  await synchronizeThirdPartyLocale(locale);
  i18n.global.locale.value = locale;
  currentLocale.value = locale;
  document.documentElement.lang = locale;
}

/** 加载静态 Locale 后，仅合并经过 System Runtime 校验的动态命名空间。 */
export async function applySystemLocale(
  locale: SystemLocale,
  messages: Readonly<Record<string, string>>,
): Promise<void> {
  const fallback = await loadStaticMessages(locale);
  i18n.global.setLocaleMessage(locale, cloneMessages(fallback));
  i18n.global.mergeLocaleMessage(locale, expandDottedMessages(messages));
  await synchronizeThirdPartyLocale(locale);
  i18n.global.locale.value = locale;
  currentLocale.value = locale;
  document.documentElement.lang = locale;
}

export function $t(key: string, values?: NamedValues): string {
  return values ? i18n.global.t(key, values) : i18n.global.t(key);
}

async function loadStaticMessages(locale: SystemLocale): Promise<LocaleMessages> {
  const cached = staticMessages.get(locale);
  if (cached) return cached;

  const prefix = `./langs/${locale}/`;
  const messages: LocaleMessages = Object.create(null) as LocaleMessages;
  for (const [path, load] of Object.entries(localeModules)) {
    if (!path.startsWith(prefix)) continue;
    const namespace = path.slice(prefix.length).replace(/\.json$/u, '');
    messages[namespace] = (await load()).default;
  }
  staticMessages.set(locale, messages);
  return messages;
}

async function synchronizeThirdPartyLocale(locale: SystemLocale): Promise<void> {
  if (locale === 'en-US') {
    antdLocale.value = antdEnLocale;
    await import('dayjs/locale/en');
    dayjs.locale('en');
    return;
  }
  antdLocale.value = antdZhLocale;
  await import('dayjs/locale/zh-cn');
  dayjs.locale('zh-cn');
}

function cloneMessages(value: LocaleMessages): LocaleMessages {
  return JSON.parse(JSON.stringify(value)) as LocaleMessages;
}

function expandDottedMessages(
  messages: Readonly<Record<string, string>>,
): LocaleMessages {
  const root: LocaleMessages = Object.create(null) as LocaleMessages;
  for (const [key, message] of Object.entries(messages)) {
    const segments = key.split('.');
    let current = root;
    for (const segment of segments.slice(0, -1)) {
      const child = current[segment];
      if (!child || typeof child !== 'object' || Array.isArray(child)) {
        current[segment] = Object.create(null) as LocaleMessages;
      }
      current = current[segment] as LocaleMessages;
    }
    const leaf = segments.at(-1);
    if (leaf) current[leaf] = message;
  }
  return root;
}
