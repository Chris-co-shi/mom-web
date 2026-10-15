import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import MomDataTable from './MomDataTable.vue';

describe('MomDataTable', () => {
  it('允许键盘用户调整列宽并暴露当前宽度语义', async () => {
    const wrapper = mount(MomDataTable, {
      props: {
        rows: [{ id: '1', name: 'Alpha' }],
        columns: [{ key: 'name', title: '名称', width: 120, minWidth: 80 }],
        emptyText: '暂无数据',
      },
    });
    const separator = wrapper.get('[role="separator"]');

    expect(separator.attributes('tabindex')).toBe('0');
    expect(separator.attributes('aria-label')).toBe('名称');
    expect(separator.attributes('aria-valuemin')).toBe('80');
    expect(separator.attributes('aria-valuenow')).toBe('120');

    const grow = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true });
    separator.element.dispatchEvent(grow);
    await wrapper.vm.$nextTick();
    expect(grow.defaultPrevented).toBe(true);
    expect(separator.attributes('aria-valuenow')).toBe('128');

    const shrink = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true });
    separator.element.dispatchEvent(shrink);
    await wrapper.vm.$nextTick();
    expect(shrink.defaultPrevented).toBe(true);
    expect(separator.attributes('aria-valuenow')).toBe('120');
  });

  it('键盘缩窄列宽时不越过最小值', async () => {
    const wrapper = mount(MomDataTable, {
      props: {
        rows: [{ id: '1', name: 'Alpha' }],
        columns: [{ key: 'name', title: '名称', width: 84, minWidth: 80 }],
        emptyText: '暂无数据',
      },
    });
    const separator = wrapper.get('[role="separator"]');

    await separator.trigger('keydown', { key: 'ArrowLeft' });
    expect(separator.attributes('aria-valuenow')).toBe('80');
    await separator.trigger('keydown', { key: 'ArrowLeft' });
    expect(separator.attributes('aria-valuenow')).toBe('80');
  });
});
