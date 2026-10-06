import { defineStore, storeToRefs } from 'pinia';
import { readonly } from 'vue';
import { createI18n } from 'vue-i18n';
import { messageParameterOrder, type MessageKey } from '../../locales/zh-CN';
import { emergencyMessages } from './emergency-messages';
import { i18nRuntimeApi, type I18nOwner, type SupportedLocaleInfo } from './runtime-api';

export type SupportedLocale = string;
export type MessageParams = Readonly<Record<string, string | number>>;

export const LOCALE_STORAGE_KEY = 'mom.locale.preference';
export const DEFAULT_LOCALE = 'zh-CN';

/** 数据库 Bundle 是权威；Vue I18n 只保存已加载的当前标签页快照。 */
export const i18n = createI18n({
  legacy: false,
  locale: DEFAULT_LOCALE,
  fallbackLocale: false,
  missingWarn: false,
  fallbackWarn: false,
  messages: {},
});

export const useLocaleStore = defineStore('mom-locale', {
  state: () => ({
    supportedLocales: [] as SupportedLocaleInfo[],
    defaultLocale: DEFAULT_LOCALE,
    currentLocale: DEFAULT_LOCALE,
    loadedNamespaces: {} as Record<string, string[]>,
    loadingNamespaces: {} as Record<string, string[]>,
    messagesByLocale: {} as Record<string, Record<string, string>>,
    ready: false,
  }),
});

const pending = new Map<string, Promise<void>>();
const events = new Map<I18nOwner, EventSource>();
const connected = new Set<I18nOwner>();

function ownerOf(namespace: string): I18nOwner {
  const root = namespace.split('.')[0];
  if (root === 'auth' || root === 'system' || root === 'mdm') return root;
  throw new Error(`未知的国际化 Owner：${namespace}`);
}

function nestedMessages(flat: Record<string, string>): Record<string, unknown> {
  const root: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) {
    const path = key.split('.');
    let cursor = root;
    for (const part of path.slice(0, -1)) {
      if (typeof cursor[part] !== 'object' || cursor[part] === null) cursor[part] = {};
      cursor = cursor[part] as Record<string, unknown>;
    }
    cursor[path.at(-1)!] = value;
  }
  return root;
}

function publishMessages(locale: string): void {
  const store = useLocaleStore();
  i18n.global.setLocaleMessage(locale, nestedMessages(store.messagesByLocale[locale] ?? {}));
}

async function loadOne(namespace: string, locale: string, force: boolean): Promise<void> {
  const store = useLocaleStore();
  if (!force && store.loadedNamespaces[locale]?.includes(namespace)) return;
  const key = `${locale}:${namespace}`;
  const existing = pending.get(key);
  if (existing) return existing;
  const work = (async () => {
    store.loadingNamespaces[locale] = [...new Set([...(store.loadingNamespaces[locale] ?? []), namespace])];
    try {
      const result = await i18nRuntimeApi.bundle(ownerOf(namespace), locale, [namespace]);
      const fresh = result.bundles[namespace] ?? {};
      const previous = { ...(store.messagesByLocale[locale] ?? {}) };
      for (const oldKey of Object.keys(previous)) {
        if (oldKey in (store.messagesByLocale[locale] ?? {}) &&
            store.loadedNamespaces[locale]?.includes(namespace) &&
            oldKey in (namespaceKeys.get(`${locale}:${namespace}`) ?? new Set())) delete previous[oldKey];
      }
      namespaceKeys.set(key, new Set(Object.keys(fresh)));
      store.messagesByLocale[locale] = { ...previous, ...fresh };
      store.loadedNamespaces[locale] = [...new Set([...(store.loadedNamespaces[locale] ?? []), namespace])];
      publishMessages(locale);
    } finally {
      store.loadingNamespaces[locale] = (store.loadingNamespaces[locale] ?? []).filter((item) => item !== namespace);
    }
  })();
  pending.set(key, work);
  try { await work; } finally { pending.delete(key); }
}

const namespaceKeys = new Map<string, Set<string>>();

/** 按 Locale + namespace 去重加载；强制刷新只更新对应 namespace，不抹去其他 Owner。 */
export async function ensureNamespaces(namespaces: readonly string[], locale?: string, force = false): Promise<void> {
  const target = locale ?? useLocaleStore().currentLocale;
  await Promise.all([...new Set(namespaces)].map((namespace) => loadOne(namespace, target, force)));
}

function preferredLocale(supported: readonly SupportedLocaleInfo[], defaultLocale: string): string {
  let stored: string | null = null;
  try { stored = window.localStorage.getItem(LOCALE_STORAGE_KEY); } catch { /* 浏览器禁用存储不影响启动。 */ }
  const alias = stored?.toLowerCase() === 'en' ? 'en-US' : stored;
  return supported.find((item) => item.enabled && item.localeCode.toLowerCase() === alias?.toLowerCase())?.localeCode
    ?? defaultLocale;
}

function applyLocale(locale: string): void {
  const store = useLocaleStore();
  store.currentLocale = locale;
  i18n.global.locale.value = locale;
  document.documentElement.lang = locale;
  document.documentElement.dataset.locale = locale;
}

/** 启动时重新读取 System 权威 Locale，随后加载首屏文案才允许挂载应用。 */
export async function initializeLocale(): Promise<void> {
  const store = useLocaleStore();
  const supported = await i18nRuntimeApi.locales();
  const platformDefault = supported.find((item) => item.defaultLocale && item.enabled);
  if (!platformDefault) throw new Error('System 未返回可用的默认 Locale');
  store.supportedLocales = supported;
  store.defaultLocale = platformDefault.localeCode;
  const effective = preferredLocale(supported, platformDefault.localeCode);
  await ensureNamespaces(['system.web', 'auth.login'], effective);
  applyLocale(effective);
  store.ready = true;
}

/** 预先加载已使用 namespace 的新语言，再原子切换，失败时保留旧语言。 */
export async function setLocale(nextLocale: SupportedLocale): Promise<void> {
  const store = useLocaleStore();
  if (!store.supportedLocales.some((item) => item.enabled && item.localeCode === nextLocale)) {
    throw new Error(`不支持的 Locale：${nextLocale}`);
  }
  if (store.currentLocale === nextLocale) return;
  await ensureNamespaces(store.loadedNamespaces[store.currentLocale] ?? ['system.web', 'auth.login'], nextLocale);
  applyLocale(nextLocale);
  try { window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale); } catch { /* 当前标签页仍已切换。 */ }
}

/** 将既有页面 Key 映射为 Vue I18n 词条；数字占位符顺序属于代码契约。 */
export function translate(key: MessageKey, params: MessageParams = {}): string {
  const names = messageParameterOrder[key];
  const value = names
    ? i18n.global.t(key, names.map((name) => params[name] ?? ''))
    : i18n.global.t(key);
  return value === key ? key : value;
}

/** 加载失败时只提供极小应急文本，不回退整份静态业务词典。 */
export function emergencyText(key: keyof typeof emergencyMessages['zh-CN']): string {
  const locale = useLocaleStore().currentLocale;
  return (locale === 'en-US' ? emergencyMessages['en-US'] : emergencyMessages['zh-CN'])[key];
}

/** SSE 只做本标签页缓存失效；重连后重载已使用 namespace，不承诺跨实例广播。 */
export function connectI18nEvents(owner: I18nOwner): void {
  if (events.has(owner) || typeof EventSource === 'undefined') return;
  const source = new EventSource(i18nRuntimeApi.eventUrl(owner));
  events.set(owner, source);
  source.addEventListener('I18N_CONNECTED', () => {
    if (!connected.has(owner)) { connected.add(owner); return; }
    const store = useLocaleStore();
    void ensureNamespaces((store.loadedNamespaces[store.currentLocale] ?? []).filter((name) => ownerOf(name) === owner),
      store.currentLocale, true);
  });
  source.addEventListener('I18N_BUNDLE_CHANGED', (event) => {
    const change = JSON.parse((event as MessageEvent).data) as { locale: string; namespace: string };
    const store = useLocaleStore();
    if ((change.locale === '*' || change.locale === store.currentLocale) &&
        store.loadedNamespaces[store.currentLocale]?.includes(change.namespace)) {
      void ensureNamespaces([change.namespace], store.currentLocale, true);
    }
  });
  source.addEventListener('I18N_LOCALES_CHANGED', () => { void refreshSupportedLocales(); });
}

async function refreshSupportedLocales(): Promise<void> {
  const store = useLocaleStore();
  const supported = await i18nRuntimeApi.locales();
  const platformDefault = supported.find((item) => item.defaultLocale && item.enabled);
  if (!platformDefault) return;
  store.supportedLocales = supported;
  store.defaultLocale = platformDefault.localeCode;
  if (!supported.some((item) => item.enabled && item.localeCode === store.currentLocale)) {
    await setLocale(platformDefault.localeCode);
  }
}

/** 获取全应用唯一 Locale 状态和翻译入口。 */
export function useLocale() {
  const store = useLocaleStore();
  const { currentLocale: locale, supportedLocales } = storeToRefs(store);
  return { locale: readonly(locale), supportedLocales: readonly(supportedLocales), setLocale, t: translate };
}
