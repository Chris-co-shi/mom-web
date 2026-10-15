import { flushPromises, mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { computed, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MainLayout from './MainLayout.vue';
import { NAVIGATION_COLLAPSED_STORAGE_KEY } from './navigation-preference';
import { ROUTE_NAMES } from '../router/route-names';

vi.mock('../modules/auth/model/auth-permissions', () => ({ hasAuthorities: () => true }));
vi.mock('../modules/auth/model/auth-session', () => ({
  logout: vi.fn(),
  useAuthSession: () => ({
    user: computed(() => ({ displayName: '测试用户', username: 'tester' })),
    authorities: ref<string[]>([]),
  }),
}));
vi.mock('../shared/i18n/locale', () => ({
  useLocale: () => ({ t: (key: string) => key }),
}));

const Page = { template: '<div>page</div>' };

async function mountLayout(path = '/master-data/material-categories') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{
      path: '/', component: MainLayout, children: [
        { path: 'master-data/material-categories', name: ROUTE_NAMES.mdmCategories, component: Page,
          meta: { title: '物料分类', titleKey: 'navigation.mdmCategories', module: 'mdm', requiresAuth: true } },
        { path: 'iam/users', name: ROUTE_NAMES.iamUsers, component: Page,
          meta: { title: '用户管理', titleKey: 'navigation.users', module: 'auth', requiresAuth: true } },
      ],
    }],
  });
  await router.push(path);
  await router.isReady();
  const wrapper = mount(MainLayout, {
    global: {
      plugins: [router],
      stubs: {
        AccountMenu: true,
        LocaleSwitcher: true,
        RouterLink: { template: '<a><slot /></a>' },
        RouterView: true,
        ThemeSwitcher: true,
      },
    },
  });
  await flushPromises();
  return { wrapper, router };
}

describe('MainLayout cascading navigation', () => {
  beforeEach(() => { window.localStorage.clear(); vi.stubGlobal('innerWidth', 1440); });

  it('窄窗口自动收起不覆盖用户折叠偏好', async () => {
    vi.stubGlobal('innerWidth', 390);
    const { wrapper } = await mountLayout();
    expect(wrapper.find('.app-sidebar').exists()).toBe(false);
    expect(wrapper.get('[data-testid="navigation-open"]').attributes('aria-expanded')).toBe('false');
    expect(window.localStorage.getItem(NAVIGATION_COLLAPSED_STORAGE_KEY)).toBeNull();
    wrapper.unmount();
  });

  it('仅展开当前页面所属模块，并允许切换一级模块', async () => {
    const { wrapper } = await mountLayout();
    const mdm = wrapper.get('[data-navigation-group="mdm"]');
    const iam = wrapper.get('[data-navigation-group="iam"]');

    expect(mdm.attributes('aria-expanded')).toBe('true');
    expect(iam.attributes('aria-expanded')).toBe('false');
    expect(wrapper.get('#app-navigation-mdm').isVisible()).toBe(true);
    expect(wrapper.get('#app-navigation-iam').isVisible()).toBe(false);
    expect(wrapper.get('[data-navigation-section="material-uom"]').attributes('aria-expanded')).toBe('true');
    expect(wrapper.get('[data-navigation-section="organization-resources"]').attributes('aria-expanded')).toBe('false');
    expect(wrapper.get('[data-navigation-section="manufacturing-definition"]').attributes('aria-expanded')).toBe('false');

    await iam.trigger('click');
    expect(iam.attributes('aria-expanded')).toBe('true');
    expect(mdm.attributes('aria-expanded')).toBe('false');
  });

  it('路由跨模块变化时自动展开目标模块', async () => {
    const { wrapper, router } = await mountLayout();
    await router.push('/iam/users');
    await flushPromises();

    expect(wrapper.get('[data-navigation-group="iam"]').attributes('aria-expanded')).toBe('true');
    expect(wrapper.get('[data-navigation-group="mdm"]').attributes('aria-expanded')).toBe('false');
  });

  it('记忆整栏折叠状态，并可从模块图标恢复对应菜单', async () => {
    window.localStorage.setItem(NAVIGATION_COLLAPSED_STORAGE_KEY, 'true');
    const { wrapper } = await mountLayout();

    expect(wrapper.get('.app-shell').classes()).toContain('app-shell--collapsed');
    const iam = wrapper.get('[data-navigation-group="iam"]');
    expect(iam.attributes('title')).toBe('navigation.iam');
    expect(iam.attributes('aria-label')).toBe('navigation.iam');
    expect(wrapper.get('[data-testid="sidebar-toggle"]').attributes('aria-controls')).toBe('app-sidebar-navigation');
    await iam.trigger('click');

    expect(wrapper.get('.app-shell').classes()).not.toContain('app-shell--collapsed');
    expect(iam.attributes('aria-expanded')).toBe('true');
    expect(window.localStorage.getItem(NAVIGATION_COLLAPSED_STORAGE_KEY)).toBe('false');

    await wrapper.get('[data-testid="sidebar-toggle"]').trigger('click');
    expect(window.localStorage.getItem(NAVIGATION_COLLAPSED_STORAGE_KEY)).toBe('true');
  });
});
