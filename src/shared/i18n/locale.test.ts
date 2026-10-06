import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LocaleSwitcher from './LocaleSwitcher.vue';
import { initializeLocale, translate, translateInNamespace, useLocale, useLocaleStore } from './locale';
import { i18nRuntimeApi } from './runtime-api';

const locales = [
  { localeCode: 'zh-CN', displayName: '简体中文', nativeName: '简体中文', enabled: true, defaultLocale: true, sortOrder: 10 },
  { localeCode: 'en-US', displayName: '英语', nativeName: 'English', enabled: true, defaultLocale: false, sortOrder: 20 },
  { localeCode: 'fr-FR', displayName: '法语', nativeName: 'Français', enabled: false, defaultLocale: false, sortOrder: 30 },
];

describe('locale service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setActivePinia(createPinia());
    window.localStorage.clear();
    vi.spyOn(i18nRuntimeApi, 'locales').mockResolvedValue(locales);
    vi.spyOn(i18nRuntimeApi, 'bundle').mockImplementation(async (_owner, locale, namespaces) => ({
      requestedLocale: locale,
      effectiveLocale: locale,
      bundles: Object.fromEntries(namespaces.map((namespace) => [namespace,
        namespace === 'system.web' ? { 'shell.main.title': locale === 'en-US' ? 'MOM Workspace' : 'MOM 工作台', 'locale.mode': '语言' } : {}])),
    }));
  });

  it('只采用已启用的存储偏好，否则使用服务端默认语言', async () => {
    window.localStorage.setItem('mom.locale.preference', 'fr-FR');
    await initializeLocale();
    expect(useLocale().locale.value).toBe('zh-CN');

    window.localStorage.setItem('mom.locale.preference', 'en');
    await initializeLocale();
    expect(useLocale().locale.value).toBe('en-US');
  });


  it('不同 namespace 的同名 key 必须隔离，显式 namespace 可精确读取', async () => {
    vi.spyOn(i18nRuntimeApi, 'bundle').mockImplementation(async (_owner, locale, namespaces) => ({
      requestedLocale: locale,
      effectiveLocale: locale,
      bundles: Object.fromEntries(namespaces.map((namespace) => [namespace, {
        'shell.main.title': namespace === 'system.web' ? 'System title' : 'Auth title',
      }])),
    }));

    await initializeLocale();

    expect(useLocaleStore().messagesByLocale['zh-CN']?.['system.web']?.['shell.main.title']).toBe('System title');
    expect(useLocaleStore().messagesByLocale['zh-CN']?.['auth.login']?.['shell.main.title']).toBe('Auth title');
    expect(translate('shell.main.title')).toBe('shell.main.title');
    expect(translateInNamespace('system.web', 'shell.main.title')).toBe('System title');
    expect(translateInNamespace('auth.login', 'shell.main.title')).toBe('Auth title');
  });

  it('先加载目标语言再切换 HTML、Vue I18n 和浏览器偏好', async () => {
    await initializeLocale();
    const wrapper = mount(LocaleSwitcher);
    await wrapper.get('[aria-label="English"]').trigger('click');
    await flushPromises();
    await nextTick();

    expect(document.documentElement.lang).toBe('en-US');
    expect(window.localStorage.getItem('mom.locale.preference')).toBe('en-US');
    expect(translate('shell.main.title')).toBe('MOM Workspace');
    expect(wrapper.get('[aria-label="English"]').attributes('aria-checked')).toBe('true');
    expect(useLocaleStore().loadedNamespaces['en-US']).toContain('system.web');
  });
});
