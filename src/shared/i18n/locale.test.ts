import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LocaleSwitcher from './LocaleSwitcher.vue';
import { initializeLocale, setLocale, translate, useLocale } from './locale';

describe('locale service', () => {
  beforeEach(() => {
    setLocale('zh-CN');
    window.localStorage.clear();
  });

  it('只接受受控 Alias，不把其他地区模糊映射为 en-US', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['fr-FR']);
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('fr-FR');

    window.localStorage.setItem('mom.locale.preference', 'en-GB');
    initializeLocale();
    expect(useLocale().locale.value).toBe('zh-CN');

    window.localStorage.setItem('mom.locale.preference', 'en');
    initializeLocale();
    expect(useLocale().locale.value).toBe('en-US');
  });

  it('切换语言时同步 HTML、静态文案和浏览器选择', async () => {
    const wrapper = mount(LocaleSwitcher);
    await wrapper.get('[aria-label="英语（美国）"]').trigger('click');

    expect(document.documentElement.lang).toBe('en-US');
    expect(window.localStorage.getItem('mom.locale.preference')).toBe('en-US');
    expect(translate('shell.main.title')).toBe('MOM Workspace');
    expect(wrapper.get('[aria-label="English (United States)"]').attributes('aria-checked')).toBe('true');
  });
});
