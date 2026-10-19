import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computed } from 'vue';
import { i18nRuntimeApi, type I18nOwner } from './runtime-api';

const key = 'system.common.page';
let bundles: Record<string, Partial<Record<I18nOwner, Record<string, string>>>>;
let sources: Map<string, EventTarget>;

beforeEach(() => {
  vi.resetModules();
  setActivePinia(createPinia());
  bundles = {
    'zh-CN': { system: { [key]: '系统第 {0} / {1} 页' }, mdm: { [key]: '主数据第 {0} / {1} 页' } },
    'en-US': { system: { [key]: 'System {0} / {1}' }, mdm: { [key]: 'MDM {0} / {1}' } },
  };
  sources = new Map();
  vi.stubGlobal('EventSource', class extends EventTarget {
    constructor(url: string) { super(); sources.set(url, this); }
  });
  vi.spyOn(i18nRuntimeApi, 'bundle').mockImplementation(async (owner, requestedLocale) => ({
    requestedLocale, effectiveLocale: requestedLocale, messages: bundles[requestedLocale]?.[owner] ?? {},
  }));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

// 每个用例加载独立的事件连接状态，Runtime API mock 保持同一实例。
async function runtime() {
  vi.doMock('./runtime-api', () => ({ i18nRuntimeApi }));
  return import('./locale');
}

async function initialize(api: Awaited<ReturnType<typeof runtime>>) {
  vi.spyOn(i18nRuntimeApi, 'locales').mockResolvedValue(['zh-CN', 'en-US'].map((localeCode) => ({
    localeCode, displayName: localeCode, nativeName: localeCode, enabled: true,
    defaultLocale: localeCode === 'zh-CN', sortOrder: 0,
  })));
  await api.initializeLocale();
}

describe('Owner 隔离翻译', () => {
  it.each(['zh-CN', 'en-US'])('Shell 取消/关闭文案在 %s 刷新启动、进入 MDM 和切换语言后保持正确 Owner', async (initialLocale) => {
    const api = await runtime();
    const locales = ['zh-CN', 'en-US'];
    vi.spyOn(i18nRuntimeApi, 'locales').mockResolvedValue(locales.map((localeCode) => ({
      localeCode, displayName: localeCode, nativeName: localeCode, enabled: true,
      defaultLocale: localeCode === 'zh-CN', sortOrder: 0,
    })));
    for (const locale of locales) {
      bundles[locale]!.system = {
        'system.common.cancel': locale === 'zh-CN' ? '取消' : 'Cancel',
        'system.common.close': locale === 'zh-CN' ? '关闭' : 'Close',
      };
      // 故意让 MDM 包含同名异义文案，验证公共 UI 不读取合并后的冲突 Key。
      bundles[locale]!.mdm = {
        'system.common.cancel': 'MDM 领域取消', 'system.common.close': 'MDM 领域关闭',
      };
    }
    window.localStorage.setItem(api.LOCALE_STORAGE_KEY, initialLocale);
    await api.initializeLocale();
    const cancel = computed(() => api.useLocale().tForOwner('system', 'system.common.cancel'));
    const close = computed(() => api.useLocale().tForOwner('system', 'system.common.close'));
    const expectLabels = (locale: string) => {
      expect(cancel.value).toBe(locale === 'zh-CN' ? '取消' : 'Cancel');
      expect(close.value).toBe(locale === 'zh-CN' ? '关闭' : 'Close');
    };
    expect(api.useLocaleStore().ready).toBe(true);
    expect(api.useLocaleStore().loadedOwners[initialLocale]).toEqual(['system', 'auth']);
    expectLabels(initialLocale);
    // 与路由进入/切换相同的加载入口，不增加新的 Owner 请求。
    await api.ensureOwners(['mdm']);
    await api.ensureOwners(['mdm']);
    expectLabels(initialLocale);
    expect(api.translate('system.common.cancel')).toBe('system.common.cancel');
    const nextLocale = initialLocale === 'zh-CN' ? 'en-US' : 'zh-CN';
    await api.setLocale(nextLocale);
    expectLabels(nextLocale);
    bundles[nextLocale]!.system!['system.common.cancel'] = 'Shell 更新';
    sources.get('/system/i18n/runtime/events')!.dispatchEvent(new MessageEvent('I18N_BUNDLE_CHANGED', {
      data: JSON.stringify({ locale: nextLocale }),
    }));
    await vi.waitFor(() => expect(cancel.value).toBe('Shell 更新'));
    expect(api.translateForOwner('mdm', 'system.common.cancel')).toBe('MDM 领域取消');
    expect(close.value).toBe(nextLocale === 'zh-CN' ? '关闭' : 'Close');
  });

  it.each([['system', 'mdm'], ['mdm', 'system']] as const)('加载顺序 %s → %s 不影响冲突读取', async (first, second) => {
    const api = await runtime();
    await initialize(api);
    await api.ensureOwners([first]);
    await api.ensureOwners([second]);
    expect(api.translateForOwner('system', key, { current: 2, pages: 8 })).toBe('系统第 2 / 8 页');
    expect(api.translateForOwner('mdm', key, { current: 2, pages: 8 })).toBe('主数据第 2 / 8 页');
    expect(api.translate(key)).toBe(key);
    expect(api.useLocale().t(key)).toBe(key);
  });

  it('同名同译文及原有无冲突调用保持可用', async () => {
    const api = await runtime();
    await initialize(api);
    bundles['zh-CN']!.mdm = { [key]: '系统第 {0} / {1} 页', 'mdm.plants.title': '工厂' };
    await api.ensureOwners(['system', 'mdm']);
    expect(api.translate(key, { current: 1, pages: 3 })).toBe('系统第 1 / 3 页');
    expect(api.useLocale().t('mdm.plants.title')).toBe('工厂');
    expect(api.translateForOwner('mdm', key, { current: 1, pages: 3 })).toBe('系统第 1 / 3 页');
  });

  it.each([false, true])('点号 Key 同时作为译文和父路径时仍显示译文（父 Key 后置：%s）', async parentLast => {
    const api = await runtime();
    await initialize(api);
    bundles['zh-CN']!.wms = parentLast
      ? { 'wms.inventory.warehouse.normal': '正常', 'wms.inventory.warehouse': '仓库' }
      : { 'wms.inventory.warehouse': '仓库', 'wms.inventory.warehouse.normal': '正常' };
    await api.ensureOwners(['wms']);
    expect(api.translate('wms.inventory.warehouse')).toBe('仓库');
    expect(api.translate('wms.inventory.warehouse.normal')).toBe('正常');
  });

  it('不存在的 Key、未加载 Owner 及目标 Owner 缺失 Key 均返回原 Key', async () => {
    const api = await runtime();
    await initialize(api);
    await api.ensureOwners(['system']);
    expect(api.translateForOwner('mdm', key)).toBe(key);
    await api.ensureOwners(['auth']);
    expect(api.translateForOwner('auth', key)).toBe(key);
    expect(api.translateForOwner('system', 'missing.key')).toBe('missing.key');
    expect(api.translate('auth.login.title')).toBe('auth.login.title');
    expect(api.translateForOwner('system', 'toString')).toBe('toString');
  });

  it('Key 大小写规范化、参数大小写及数字占位符保持稳定，不解析其他 Owner 的引用', async () => {
    const api = await runtime();
    bundles['zh-CN']!.system = {
      'System.Common.Page': '页 {0} / {1}，重复 {0}',
      'custom.message': '{0} / {1}',
      'linked.message': '@:mdm.plants.title',
      'empty.message': '',
    };
    bundles['zh-CN']!.mdm = { 'mdm.plants.title': '其他 Owner 的译文' };
    await initialize(api);
    await api.ensureOwners(['system', 'mdm']);
    expect(api.useLocale().tForOwner('system', key, { current: 2, pages: 5 })).toBe('页 2 / 5，重复 2');
    expect(api.translateForOwner('system', key, { Current: 2, pages: 5 })).toBe('页  / 5，重复 ');
    expect(api.translateForOwner('system', 'CUSTOM.MESSAGE', { 0: 'A', 1: 3 })).toBe('A / 3');
    expect(api.translateForOwner('system', 'linked.message')).toBe('@:mdm.plants.title');
    expect(api.translateForOwner('system', 'empty.message')).toBe('');
  });

  it('Locale 切换后响应式读取对应 Owner 的数据库译文', async () => {
    const api = await runtime();
    await initialize(api);
    await api.ensureOwners(['system', 'mdm']);
    const text = computed(() => api.translateForOwner('mdm', key, { current: 4, pages: 9 }));
    expect(text.value).toBe('主数据第 4 / 9 页');
    await api.setLocale('en-US');
    expect(text.value).toBe('MDM 4 / 9');
    expect(api.translateForOwner('system', key, { current: 4, pages: 9 })).toBe('System 4 / 9');
    expect(api.translate(key)).toBe(key);
  });

  it('单个 Owner SSE 刷新不污染另一个 Owner，移除的 Key 不跨 Owner 回退', async () => {
    const api = await runtime();
    await initialize(api);
    await api.ensureOwners(['system', 'mdm']);
    bundles['zh-CN']!.system = { [key]: '刷新 {0} / {1}' };
    sources.get('/system/i18n/runtime/events')!.dispatchEvent(new MessageEvent('I18N_BUNDLE_CHANGED', { data: JSON.stringify({ locale: 'zh-CN' }) }));
    await vi.waitFor(() => expect(api.translateForOwner('system', key, { current: 2, pages: 3 })).toBe('刷新 2 / 3'));
    expect(api.translateForOwner('mdm', key, { current: 2, pages: 3 })).toBe('主数据第 2 / 3 页');
    expect(api.translate(key)).toBe(key);
    bundles['zh-CN']!.system = {};
    sources.get('/system/i18n/runtime/events')!.dispatchEvent(new MessageEvent('I18N_BUNDLE_CHANGED', { data: JSON.stringify({ locale: 'zh-CN' }) }));
    await vi.waitFor(() => expect(api.translateForOwner('system', key)).toBe(key));
    expect(api.translateForOwner('mdm', key, { current: 2, pages: 3 })).toBe('主数据第 2 / 3 页');
    expect(api.translate(key, { current: 2, pages: 3 })).toBe('主数据第 2 / 3 页');
  });
});
