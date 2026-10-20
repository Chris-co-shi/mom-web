import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import MomQuantityInput from './MomQuantityInput.vue';
vi.mock('../i18n/locale', () => ({ useLocale: () => ({ tForOwner: (_owner: string, key: string) => key }) }));

describe('MomQuantityInput', () => {
  it('保留 Decimal String 原值，锁定单位不锁数量', async () => {
    const wrapper = mount(MomQuantityInput, { props: { modelValue: '123456789012345.123456',
      unitValue: 'KG', units: [{ value: 'KG', label: 'kg' }], label: '数量', unitDisabled: true } });
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('123456789012345.123456');
    await wrapper.find('input').setValue('0.000001');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['0.000001']);
    expect(wrapper.find('select').attributes('disabled')).toBeDefined();
  });

  it('禁用整体并拒绝不在允许集合内的单位', async () => {
    const wrapper = mount(MomQuantityInput, { props: { modelValue: '1', unitValue: 'KG',
      units: [{ value: 'KG', label: 'kg' }, { value: 'G', label: 'g' }], label: '数量', disabled: true } });
    expect(wrapper.find('input').attributes('disabled')).toBeDefined();
    expect(wrapper.find('select').attributes('disabled')).toBeDefined();
    expect(wrapper.emitted('update:unitValue')).toBeUndefined();
  });

  it('按十进制字符串校验精度与边界，非法单位给出字段反馈', async () => {
    const wrapper = mount(MomQuantityInput, { props: { modelValue: '0.000001', unitValue: 'L',
      units: [{ value: 'KG', label: 'kg' }], label: '数量', precision: 6, min: '0.000001', max: '999999999999999.999999' } });
    expect(wrapper.find('input').attributes('aria-invalid')).toBe('true');
    await wrapper.setProps({ unitValue: 'KG' });
    expect(wrapper.find('input').attributes('aria-invalid')).toBe('false');
    await wrapper.setProps({ modelValue: '0.0000001' });
    expect(wrapper.find('input').attributes('aria-invalid')).toBe('true');
  });
});
