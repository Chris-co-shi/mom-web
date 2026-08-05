import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import AdminHeader from '../../apps/mom-admin/src/layouts/admin-shell/AdminHeader.vue';
import AdminSidebar from '../../apps/mom-admin/src/layouts/admin-shell/AdminSidebar.vue';

const groups = [
  {
    iconKey: 'users' as const,
    key: 'people-access',
    tasks: [
      { iconKey: 'users' as const, path: '/iam/users', title: '用户与授权' },
      { iconKey: 'shield-check' as const, path: '/iam/roles', title: '角色配置' },
    ],
    title: '人员与访问',
  },
  {
    iconKey: 'shield-check' as const,
    key: 'security-operations',
    tasks: [
      { iconKey: 'scroll-text' as const, path: '/iam/audit', title: '安全审计' },
    ],
    title: '安全运营',
  },
];

describe('Admin Shell', () => {
  it('Sidebar 按任务域呈现导航并显式标记当前任务', async () => {
    const wrapper = mount(AdminSidebar, {
      props: {
        activePath: '/iam/users',
        collapsed: false,
        groups,
        logoSource: '/mom.svg',
        navigationLabel: '主要任务导航',
        productName: 'MOM 制造运营管理平台',
      },
    });

    expect(wrapper.get('nav').attributes('aria-label')).toBe('主要任务导航');
    expect(wrapper.findAll('section')).toHaveLength(2);
    expect(wrapper.get('[aria-current="page"]').text()).toContain('用户与授权');

    await wrapper.get('a[href="/iam/roles"]').trigger('click');
    expect(wrapper.emitted('navigate')?.at(-1)).toEqual(['/iam/roles']);
  });

  it('Sidebar 折叠后保留图标入口的可访问名称', () => {
    const wrapper = mount(AdminSidebar, {
      props: {
        activePath: '/iam/users',
        collapsed: true,
        groups,
        logoSource: '/mom.svg',
        navigationLabel: '主要任务导航',
        productName: 'MOM 制造运营管理平台',
      },
    });

    expect(wrapper.attributes('data-collapsed')).toBe('true');
    expect(wrapper.get('a[href="/iam/users"]').attributes('title')).toBe('用户与授权');
  });

  it('Header 保持唯一位置上下文并发出 Shell 动作', async () => {
    const wrapper = mount(AdminHeader, {
      props: {
        breadcrumbLabel: '当前位置',
        breadcrumbs: ['平台治理', '人员与访问', '用户与授权'],
        collapsed: false,
        currentFactoryId: 'F01',
        factories: ['F01', 'F02'],
        factoryBusy: false,
        factoryLabel: '当前工厂',
        logoutLabel: '退出登录',
        preferencesLabel: '显示偏好',
        toggleLabel: '收起侧边栏',
        user: {
          avatar: 'A',
          displayName: 'Administrator',
          userType: 'INTERNAL',
          username: 'admin',
        },
      },
    });

    expect(wrapper.get('nav').attributes('aria-label')).toBe('当前位置');
    expect(wrapper.findAll('nav li')).toHaveLength(3);
    expect(wrapper.get('[aria-current="page"]').text()).toBe('用户与授权');
    expect(wrapper.text()).toContain('admin · INTERNAL');
    expect(wrapper.get('[aria-label="Administrator · admin"]')).toBeTruthy();

    await wrapper.get('[aria-label="收起侧边栏"]').trigger('click');
    await wrapper.get('[aria-label="显示偏好"]').trigger('click');
    expect(wrapper.emitted('toggleSidebar')).toHaveLength(1);
    expect(wrapper.emitted('openPreferences')).toHaveLength(1);
  });
});
