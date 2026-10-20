import { flushPromises, mount } from '@vue/test-utils';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import MomReferenceSelect from './MomReferenceSelect.vue';
vi.mock('../i18n/locale', () => ({ useLocale: () => ({ tForOwner: (_owner: string, key: string) => key }) }));
beforeAll(() => { Element.prototype.scrollIntoView = vi.fn(); });

const row = (id: string) => ({ id, code: `C-${id}`, name: `名称${id}` });

describe('MomReferenceSelect', () => {
  it('通过 ID 单独解析分页外的已选项', async () => {
    const resolve = vi.fn().mockResolvedValue(row('42'));
    const wrapper = mount(MomReferenceSelect, { props: { modelValue: '42', label: '物料',
      search: vi.fn().mockResolvedValue({ records: [row('1')], totalPages: 1 }), resolve } });
    await flushPromises();
    expect(resolve).toHaveBeenCalledWith('42', expect.any(AbortSignal));
    expect((wrapper.find('input').element as HTMLInputElement).value).toContain('名称42');
  });

  it('关键字搜索与分页加载更多都交给调用方，过期请求不能覆盖新结果', async () => {
    let finishOld: ((value: { records: ReturnType<typeof row>[]; totalPages: number }) => void) | undefined;
    const search = vi.fn((keyword: string, page: number) => keyword === '旧'
      ? new Promise<{ records: ReturnType<typeof row>[]; totalPages: number }>(resolve => { finishOld = resolve; })
      : Promise.resolve({ records: [row(String(page))], totalPages: 2 }));
    const wrapper = mount(MomReferenceSelect, { props: { modelValue: '', label: '物料', search,
      resolve: vi.fn() } });
    await wrapper.find('input').setValue('旧');
    await wrapper.find('input').setValue('新');
    await flushPromises();
    finishOld?.({ records: [row('old')], totalPages: 1 });
    await flushPromises();
    expect(wrapper.text()).not.toContain('名称old');
    expect(wrapper.text()).toContain('名称1');
    await wrapper.find('[data-testid="reference-more"]').trigger('click');
    await flushPromises();
    expect(search).toHaveBeenCalledWith('新', 2, expect.any(AbortSignal));
    expect(wrapper.text()).toContain('名称2');
  });

  it('父级改变时清空旧 ID 并重新读取当前父级候选', async () => {
    const search = vi.fn().mockResolvedValue({ records: [row('1')], totalPages: 1 });
    const wrapper = mount(MomReferenceSelect, { props: { modelValue: '1', label: '库位', parentKey: 'W1',
      search, resolve: vi.fn().mockResolvedValue(row('1')) } });
    await wrapper.find('input').setValue('库位');
    await flushPromises();
    await wrapper.setProps({ parentKey: 'W2' });
    await flushPromises();
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['']);
    expect(search).toHaveBeenLastCalledWith('', 1, expect.any(AbortSignal));
  });

  it('搜索失败后显示重试入口并能重新请求', async () => {
    const search = vi.fn().mockRejectedValueOnce(new Error('network')).mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue({ records: [row('2')], totalPages: 1 });
    const wrapper = mount(MomReferenceSelect, { props: { modelValue: '', label: '物料', search, resolve: vi.fn() } });
    await wrapper.find('input').setValue('材料');
    await flushPromises();
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    await wrapper.find('[role="alert"] button').trigger('click');
    await flushPromises();
    expect(search).toHaveBeenCalledTimes(3);
    expect(wrapper.text()).toContain('名称2');
  });

  it('按 ID 回显失败时保留值并允许重新解析', async () => {
    const resolve = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValue(row('42'));
    const wrapper = mount(MomReferenceSelect, { props: { modelValue: '42', label: '物料',
      search: vi.fn().mockResolvedValue({ records: [], totalPages: 1 }), resolve } });
    await flushPromises();
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    await wrapper.find('[role="alert"] button').trigger('click');
    await flushPromises();
    expect((wrapper.find('input').element as HTMLInputElement).value).toContain('名称42');
  });
});
