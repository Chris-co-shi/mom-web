import { beforeEach, describe, expect, it } from 'vitest';
import { initializeTheme, setThemePreference, useTheme } from './theme';

describe('theme service', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setThemePreference('light');
  });

  it('恢复并应用浏览器主题选择', () => {
    window.localStorage.setItem('mom.theme.preference', 'dark');
    initializeTheme();

    expect(useTheme().preference.value).toBe('dark');
    expect(document.documentElement.getAttribute('theme-mode')).toBe('dark');
    expect(document.documentElement.dataset.themePreference).toBe('dark');
  });

  it('忽略非法持久化值', () => {
    window.localStorage.setItem('mom.theme.preference', 'neon');
    initializeTheme();
    expect(useTheme().preference.value).toBe('light');
  });
});
