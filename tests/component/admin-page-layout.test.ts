import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import AdminContentSection from '../../apps/mom-admin/src/layouts/page/AdminContentSection.vue';
import AdminFilterBar from '../../apps/mom-admin/src/layouts/page/AdminFilterBar.vue';
import AdminMasterDetail from '../../apps/mom-admin/src/layouts/page/AdminMasterDetail.vue';

describe('Admin 页面布局契约', () => {
  it('筛选条使用 search 语义并只发出提交事件', async () => {
    const wrapper = mount(AdminFilterBar, {
      props: { label: '用户筛选' },
      slots: {
        actions: '<button type="submit">查询</button>',
        default: '<label>状态<input name="status"></label>',
      },
    });

    expect(wrapper.get('form').attributes('role')).toBe('search');
    expect(wrapper.get('form').attributes('aria-label')).toBe('用户筛选');
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('submit')).toHaveLength(1);
  });

  it('内容区通过二级标题建立命名区域', () => {
    const wrapper = mount(AdminContentSection, {
      props: { title: '用户目录' },
      slots: {
        actions: '<button>刷新</button>',
        default: '<p>目录内容</p>',
      },
    });

    const heading = wrapper.get('h2');
    expect(wrapper.get('section').attributes('aria-labelledby')).toBe(heading.attributes('id'));
    expect(heading.text()).toBe('用户目录');
    expect(wrapper.text()).toContain('目录内容');
  });

  it('主从布局没有选中项时不保留空详情节点', async () => {
    const wrapper = mount(AdminMasterDetail, {
      props: { hasDetail: false },
      slots: {
        detail: '<p>详情</p>',
        master: '<p>目录</p>',
      },
    });

    expect(wrapper.attributes('data-has-detail')).toBe('false');
    expect(wrapper.text()).toBe('目录');

    await wrapper.setProps({ hasDetail: true });
    expect(wrapper.attributes('data-has-detail')).toBe('true');
    expect(wrapper.text()).toContain('详情');
  });
});
