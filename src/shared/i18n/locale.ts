import { defineStore, storeToRefs } from 'pinia';
import { readonly } from 'vue';
import { createI18n } from 'vue-i18n';
import { messageParameterOrder, type MessageKey } from '../../locales/zh-CN';
import { emergencyMessages } from './emergency-messages';
import { i18nRuntimeApi, type I18nOwner, type SupportedLocaleInfo } from './runtime-api';

export type SupportedLocale = string;
export type MessageParams = Readonly<Record<string, string | number>>;

export const LOCALE_STORAGE_KEY = 'mom.locale.preference';
/** 数据库 Bundle 是权威；Vue I18n 只保存已加载 Owner 的当前标签页快照。 */
export const i18n = createI18n({
  legacy: false,
  locale: '',
  fallbackLocale: false,
  missingWarn: false,
  fallbackWarn: false,
  messages: {},
});

export const useLocaleStore = defineStore('mom-locale', {
  state: () => ({
    supportedLocales: [] as SupportedLocaleInfo[],
    defaultLocale: '',
    currentLocale: '',
    loadedOwners: {} as Record<string, I18nOwner[]>,
    loadingOwners: {} as Record<string, I18nOwner[]>,
    messagesByLocale: {} as Record<string, Partial<Record<I18nOwner, Record<string, string>>>>,
    resolvedMessagesByLocale: {} as Record<string, Record<string, string>>,
    ready: false,
  }),
});

const pending = new Map<string, Promise<void>>();
const events = new Map<I18nOwner, EventSource>();
const connected = new Set<I18nOwner>();

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

/** 合并已加载 Owner；跨 Owner 同名 Key 只有译文完全一致时才可展示，避免静默覆盖。 */
function publishMessages(locale: string): void {
  const store = useLocaleStore();
  const byKey = new Map<string, Set<string>>();
  for (const ownerMessages of Object.values(store.messagesByLocale[locale] ?? {})) {
    for (const [key, value] of Object.entries(ownerMessages ?? {})) {
      const normalizedKey = key.toLowerCase();
      const values = byKey.get(normalizedKey) ?? new Set<string>();
      values.add(value);
      byKey.set(normalizedKey, values);
    }
  }
  const merged = Object.fromEntries([...byKey].flatMap(([key, values]) =>
    values.size === 1 ? [[key, [...values][0]]] : []));
  store.resolvedMessagesByLocale[locale] = merged;
  i18n.global.setLocaleMessage(locale, nestedMessages(merged));
}

async function loadOwner(owner: I18nOwner, locale: string, force: boolean): Promise<void> {
  const store = useLocaleStore();
  if (!force && store.loadedOwners[locale]?.includes(owner)) return;
  const key = `${locale}:${owner}`;
  const existing = pending.get(key);
  if (existing) return existing;
  const work = (async () => {
    store.loadingOwners[locale] = [...new Set([...(store.loadingOwners[locale] ?? []), owner])];
    try {
      connectI18nEvents(owner);
      const result = await i18nRuntimeApi.bundle(owner, locale);
      store.messagesByLocale[locale] = {
        ...(store.messagesByLocale[locale] ?? {}),
        [owner]: { ...result.messages },
      };
      store.loadedOwners[locale] = [...new Set([...(store.loadedOwners[locale] ?? []), owner])];
      publishMessages(locale);
    } finally {
      store.loadingOwners[locale] = (store.loadingOwners[locale] ?? []).filter((item) => item !== owner);
    }
  })();
  pending.set(key, work);
  try { await work; } finally { pending.delete(key); }
}

/** 按 Locale + Owner 去重加载；强制刷新只替换目标服务的完整 Bundle。 */
export async function ensureOwners(owners: readonly I18nOwner[], locale?: string, force = false): Promise<void> {
  const target = locale ?? useLocaleStore().currentLocale;
  await Promise.all([...new Set(owners)].map((owner) => loadOwner(owner, target, force)));
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

/** 启动时重新读取 System 权威 Locale，随后加载 Shell 文案才允许挂载应用。 */
export async function initializeLocale(): Promise<void> {
  const store = useLocaleStore();
  const supported = await i18nRuntimeApi.locales();
  const platformDefault = supported.find((item) => item.defaultLocale && item.enabled);
  if (!platformDefault) throw new Error('System 未返回可用的默认 Locale');
  store.supportedLocales = supported;
  store.defaultLocale = platformDefault.localeCode;
  const effective = preferredLocale(supported, platformDefault.localeCode);
  await ensureOwners(['system', 'auth'], effective);
  applyLocale(effective);
  store.ready = true;
}

/** 预先加载已使用 Owner 的新语言，再原子切换，失败时保留旧语言。 */
export async function setLocale(nextLocale: SupportedLocale): Promise<void> {
  const store = useLocaleStore();
  if (!store.supportedLocales.some((item) => item.enabled && item.localeCode === nextLocale)) {
    throw new Error(`不支持的 Locale：${nextLocale}`);
  }
  if (store.currentLocale === nextLocale) return;
  await ensureOwners(store.loadedOwners[store.currentLocale] ?? ['system', 'auth'], nextLocale);
  applyLocale(nextLocale);
  try { window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale); } catch { /* 当前标签页仍已切换。 */ }
}

/** 使用完整稳定 Key 翻译；Key 查询按小写规范化，参数名按既有契约保留原始大小写。 */
export function translate(key: MessageKey, params: MessageParams = {}): string {
  const normalizedKey = key.toLowerCase();
  const names = messageParameterOrder[key];
  const runtimeKey = normalizedKey;
  const value = names
    ? i18n.global.t(runtimeKey, names.map((name) => params[name] ?? ''))
    : i18n.global.t(runtimeKey);
  if (value !== runtimeKey) return value;
  const store = useLocaleStore();
  const flatValue = store.resolvedMessagesByLocale[store.currentLocale]?.[normalizedKey];
  if (flatValue === undefined) return key;
  return flatValue.replace(/\{(\d+)\}/g, (_placeholder, index: string) =>
    String(params[names?.[Number(index)] ?? index] ?? ''));
}

/**
 * 只读取当前 Locale 的指定 Owner；Owner 未加载或 Key 缺失时返回原 Key。
 * Bundle 使用后端数字位置占位符，复用既有参数顺序；不解析跨 Key 引用，避免串用其他 Owner。
 */
export function translateForOwner(owner: I18nOwner, key: string, params: MessageParams = {}): string {
  const store = useLocaleStore();
  const messages = store.messagesByLocale[store.currentLocale]?.[owner];
  const normalizedKey = key.toLowerCase();
  const entry = Object.entries(messages ?? {}).find(([candidate]) => candidate.toLowerCase() === normalizedKey);
  if (!entry) return key;
  const names = messageParameterOrder[key];
  return entry[1].replace(/\{(\d+)\}/g, (_placeholder, index: string) =>
    String(params[names?.[Number(index)] ?? index] ?? ''));
}

/** 加载失败时只提供极小应急文本，不回退整份静态业务词典。 */
export function emergencyText(key: keyof typeof emergencyMessages['zh-CN']): string {
  const locale = useLocaleStore().currentLocale;
  return (locale === 'en-US' ? emergencyMessages['en-US'] : emergencyMessages['zh-CN'])[key];
}

/** SSE 只做本标签页当前 Owner 缓存失效；重连后重载完整 Bundle。 */
export function connectI18nEvents(owner: I18nOwner): void {
  if (events.has(owner) || typeof EventSource === 'undefined') return;
  const source = new EventSource(i18nRuntimeApi.eventUrl(owner));
  events.set(owner, source);
  source.addEventListener('I18N_CONNECTED', () => {
    if (!connected.has(owner)) { connected.add(owner); return; }
    const store = useLocaleStore();
    if (store.loadedOwners[store.currentLocale]?.includes(owner)) {
      void ensureOwners([owner], store.currentLocale, true);
    }
  });
  source.addEventListener('I18N_BUNDLE_CHANGED', (event) => {
    const change = JSON.parse((event as MessageEvent).data) as { locale: string };
    const store = useLocaleStore();
    if ((change.locale === '*' || change.locale === store.currentLocale) &&
        store.loadedOwners[store.currentLocale]?.includes(owner)) {
      void ensureOwners([owner], store.currentLocale, true);
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
  return { locale: readonly(locale), supportedLocales: readonly(supportedLocales), setLocale, t: translate, tForOwner: translateForOwner };
}
