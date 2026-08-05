import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import Page from '../../packages/common-ui/src/components/Page.vue';

describe('Page', () => {
  it('按显式属性和插槽渲染页面语义区', () => {
    const wrapper = mount(Page, {
      props: {
        description: '当前工厂范围内的用户',
        title: '人员与访问',
      },
      slots: {
        actions: '<button type="button">新建用户</button>',
        context: '<span data-testid="context">当前工厂</span>',
        default: '<div data-testid="content">用户列表</div>',
      },
    });

    expect(wrapper.get('h1').text()).toBe('人员与访问');
    expect(wrapper.get('.mom-page__heading p').text()).toBe('当前工厂范围内的用户');
    expect(wrapper.get('[data-testid="content"]').text()).toBe('用户列表');
    expect(wrapper.get('[data-testid="context"]').text()).toBe('当前工厂');
    expect(wrapper.get('button').text()).toBe('新建用户');
    expect(wrapper.get('section').attributes('aria-labelledby')).toBeTruthy();
  });
});
