import { computed, readonly, ref } from 'vue';
import type { GlobalConfigProvider } from 'tdesign-vue-next/es/config-provider';
import tdesignEnUS from 'tdesign-vue-next/es/locale/en_US';
import tdesignZhCN from 'tdesign-vue-next/es/locale/zh_CN';
import { enUS } from '../../locales/en-US';
import { zhCN, type MessageKey } from '../../locales/zh-CN';

export type SupportedLocale = 'zh-CN' | 'en-US';
export type MessageParams = Readonly<Record<string, string | number>>;

type DeepMutable<T> = {
  -readonly [Key in keyof T]: DeepMutable<T[Key]>;
};

export const LOCALE_STORAGE_KEY = 'mom.locale.preference';
export const DEFAULT_LOCALE: SupportedLocale = 'zh-CN';

const messages = { 'zh-CN': zhCN, 'en-US': enUS } as const;
const locale = ref<SupportedLocale>(DEFAULT_LOCALE);
const tdesignLocales: Record<SupportedLocale, GlobalConfigProvider> = {
  'zh-CN': structuredClone(tdesignZhCN) as DeepMutable<typeof tdesignZhCN>,
  'en-US': structuredClone(tdesignEnUS) as DeepMutable<typeof tdesignEnUS>,
};
const componentLocale = computed<GlobalConfigProvider>(() => tdesignLocales[locale.value]);

function normalizeLocale(value: string | null | undefined): SupportedLocale | undefined {
  if (!value) return undefined;
  const normalized = value.trim().replaceAll('_', '-').toLowerCase();
  if (normalized === 'zh-cn' || normalized === 'zh-hans-cn') {
    return 'zh-CN';
  }
  if (normalized === 'en' || normalized === 'en-us') {
    return 'en-US';
  }
  return undefined;
}

function readInitialLocale(): SupportedLocale {
  try {
    const stored = normalizeLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
    if (stored) return stored;
  } catch {
    // 浏览器存储不可用时继续使用受支持的浏览器 Locale 或静态默认值。
  }
  for (const candidate of navigator.languages) {
    const supported = normalizeLocale(candidate);
    if (supported) return supported;
  }
  return normalizeLocale(navigator.language) ?? DEFAULT_LOCALE;
}

function applyLocale(nextLocale: SupportedLocale): void {
  locale.value = nextLocale;
  document.documentElement.lang = nextLocale;
  document.documentElement.dataset.locale = nextLocale;
}

/** 在 Vue 挂载前恢复浏览器级 Locale；该值不是 System 服务端用户偏好。 */
export function initializeLocale(): void {
  applyLocale(readInitialLocale());
}

/** 更新当前浏览器的界面语言，不改变权限、业务时区或 Factory 业务日期。 */
export function setLocale(nextLocale: SupportedLocale): void {
  applyLocale(nextLocale);
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
  } catch {
    // 持久化失败不阻断当前标签页的语言切换。
  }
}

/** 解析静态 Web 文案；动态业务文案仍由对应 bounded context 所有。 */
export function translate(key: MessageKey, params: MessageParams = {}): string {
  const template = messages[locale.value][key] ?? zhCN[key];
  return Object.entries(params).reduce(
    (message, [name, value]) => message.replaceAll(`{${name}}`, String(value)),
    template,
  );
}

/** 获取全应用唯一 Locale 状态、TDesign 配置和翻译入口。 */
export function useLocale() {
  return {
    locale: readonly(locale),
    componentLocale,
    setLocale,
    t: translate,
  };
}
