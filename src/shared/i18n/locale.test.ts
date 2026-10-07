import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LocaleSwitcher from './LocaleSwitcher.vue';
import { ensureNamespaces, initializeLocale, setLocale, translate, translateInNamespace, useLocale, useLocaleStore } from './locale';
import { i18nRuntimeApi } from './runtime-api';
import { appRoutes, mainNavigation } from '../../router/route-registry';
import { ROUTE_NAMES } from '../../router/route-names';

const locales = [
  { localeCode: 'zh-CN', displayName: '简体中文', nativeName: '简体中文', enabled: true, defaultLocale: true, sortOrder: 10 },
  { localeCode: 'en-US', displayName: '英语', nativeName: 'English', enabled: true, defaultLocale: false, sortOrder: 20 },
  { localeCode: 'fr-FR', displayName: '法语', nativeName: 'Français', enabled: false, defaultLocale: false, sortOrder: 30 },
];

describe('locale service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    setActivePinia(createPinia());
    window.localStorage.clear();
    vi.spyOn(i18nRuntimeApi, 'locales').mockResolvedValue(locales);
    vi.spyOn(i18nRuntimeApi, 'bundle').mockImplementation(async (_owner, locale, namespaces) => ({
      requestedLocale: locale,
      effectiveLocale: locale,
      bundles: Object.fromEntries(namespaces.map((namespace): [string, Record<string, string>] => [namespace,
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

  it('Foundation 的 Shell 导航只依赖轻量导航 Bundle，菜单和账户入口均可翻译', async () => {
    const bundle = vi.spyOn(i18nRuntimeApi, 'bundle').mockImplementation(async (_owner, locale, namespaces) => ({
      requestedLocale: locale, effectiveLocale: locale,
      bundles: Object.fromEntries(namespaces.map((namespace): [string, Record<string, string>] => [namespace, namespace === 'auth.navigation' ? {
        'navigation.iam': '身份与访问', 'navigation.users': '用户管理',
        'navigation.roles': '角色管理', 'navigation.permissions': '权限管理',
        'navigation.account': '账户设置', 'navigation.currentUser': '当前用户',
      } : namespace === 'system.navigation' ? { 'system.navigation': '系统管理' } : {}])),
    }));
    await initializeLocale();
    const shell = appRoutes[0]!;
    const foundation = shell.children!.find((route) => route.name === ROUTE_NAMES.foundationOverview)!;
    await ensureNamespaces([...(shell.meta?.i18nNamespaces ?? []), ...(foundation.meta?.i18nNamespaces ?? [])]);

    expect(shell.meta?.i18nNamespaces).toEqual(['system.web', 'system.navigation', 'auth.navigation']);
    expect(translate('navigation.iam')).toBe('身份与访问');
    expect(mainNavigation.filter((item) => item.group === 'iam').map((item) => translate(item.titleKey)))
      .toEqual(['用户管理', '角色管理', '权限管理']);
    expect(translate('navigation.account')).toBe('账户设置');
    expect(translate('system.navigation')).toBe('系统管理');
    expect(useLocaleStore().loadedNamespaces['zh-CN']).not.toContain('auth.iam');
    expect(bundle.mock.calls.some(([, , namespaces]) => namespaces.includes('auth.iam'))).toBe(false);
  });

  it('IAM 和 Account 正文按路由加载，重复进入不重复请求', async () => {
    const bundle = vi.spyOn(i18nRuntimeApi, 'bundle');
    await initializeLocale();
    const shell = appRoutes[0]!;
    const iam = shell.children!.find((route) => route.name === ROUTE_NAMES.iamUsers)!;
    const account = shell.children!.find((route) => route.name === ROUTE_NAMES.account)!;
    expect(iam.meta?.titleKey).toBe('navigation.users');
    expect(account.meta?.titleKey).toBe('navigation.account');
    await ensureNamespaces([...(shell.meta?.i18nNamespaces ?? []), ...(iam.meta?.i18nNamespaces ?? [])]);
    await ensureNamespaces([...(shell.meta?.i18nNamespaces ?? []), ...(iam.meta?.i18nNamespaces ?? [])]);
    expect(bundle.mock.calls.filter(([, , namespaces]) => namespaces.includes('auth.iam'))).toHaveLength(1);
    expect(useLocaleStore().loadedNamespaces['zh-CN']).not.toContain('auth.account');
    await ensureNamespaces([...(shell.meta?.i18nNamespaces ?? []), ...(account.meta?.i18nNamespaces ?? [])]);
    expect(bundle.mock.calls.filter(([, , namespaces]) => namespaces.includes('auth.account'))).toHaveLength(1);
  });

  it('切换语言时先装入当前 Shell 与页面的全部 Bundle，再原子切换', async () => {
    let release: (() => void) | undefined;
    vi.spyOn(i18nRuntimeApi, 'bundle').mockImplementation(async (_owner, locale, namespaces) => {
      if (locale === 'en-US' && namespaces.includes('auth.iam')) {
        await new Promise<void>((resolve) => { release = resolve; });
      }
      return { requestedLocale: locale, effectiveLocale: locale,
        bundles: Object.fromEntries(namespaces.map((namespace): [string, Record<string, string>] => [namespace, namespace === 'auth.navigation'
          ? { 'navigation.users': locale === 'en-US' ? 'User Management' : '用户管理' } : {}])) };
    });
    await initializeLocale();
    await ensureNamespaces(['system.navigation', 'auth.navigation', 'auth.iam']);
    const switching = setLocale('en-US');
    await Promise.resolve();
    expect(useLocale().locale.value).toBe('zh-CN');
    expect(translate('navigation.users')).toBe('用户管理');
    expect(release).toBeTypeOf('function');
    release!();
    await switching;
    expect(useLocale().locale.value).toBe('en-US');
    expect(translate('navigation.users')).toBe('User Management');
    expect(useLocaleStore().loadedNamespaces['en-US']).toEqual(expect.arrayContaining(['system.web', 'system.navigation', 'auth.login', 'auth.navigation', 'auth.iam']));
  });

  it('SSE 失效后重读已使用的 Auth 导航与 System 页面 Bundle，无需重新构建', async () => {
    class MockEventSource {
      static instances: MockEventSource[] = [];
      private listeners = new Map<string, EventListenerOrEventListenerObject>();
      constructor(readonly url: string) { MockEventSource.instances.push(this); }
      addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
        this.listeners.set(type, listener);
      }
      emit(type: string, namespace: string) {
        const listener = this.listeners.get(type);
        if (typeof listener === 'function') listener(new MessageEvent(type, {
          data: JSON.stringify({ locale: 'zh-CN', namespace }),
        }));
      }
    }
    vi.stubGlobal('EventSource', MockEventSource);
    let menuText = '用户管理';
    let shellText = 'MOM 工作台';
    const bundle = vi.spyOn(i18nRuntimeApi, 'bundle').mockImplementation(async (_owner, locale, namespaces) => ({
      requestedLocale: locale, effectiveLocale: locale,
      bundles: Object.fromEntries(namespaces.map((namespace): [string, Record<string, string>] => [namespace,
        namespace === 'auth.navigation' ? { 'navigation.users': menuText }
          : namespace === 'system.web' ? { 'shell.main.title': shellText } : {}])),
    }));

    await initializeLocale();
    await ensureNamespaces(['auth.navigation']);
    expect(translate('navigation.users')).toBe('用户管理');
    expect(translate('shell.main.title')).toBe('MOM 工作台');
    menuText = '账号管理';
    shellText = 'MOM 控制台';
    const auth = MockEventSource.instances.find((source) => source.url.includes('/auth/'))!;
    const system = MockEventSource.instances.find((source) => source.url.includes('/system/'))!;
    expect(auth).toBeDefined();
    expect(system).toBeDefined();
    auth.emit('I18N_BUNDLE_CHANGED', 'auth.navigation');
    system.emit('I18N_BUNDLE_CHANGED', 'system.web');
    await flushPromises();
    expect(translate('navigation.users')).toBe('账号管理');
    expect(translate('shell.main.title')).toBe('MOM 控制台');
    expect(bundle.mock.calls.filter(([, , namespaces]) => namespaces.includes('auth.navigation'))).toHaveLength(2);
  });
});
