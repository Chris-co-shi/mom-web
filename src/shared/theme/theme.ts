import { readonly, ref } from 'vue';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'mom.theme.preference';

const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
const themePreference = ref<ThemePreference>('light');
const resolvedTheme = ref<ResolvedTheme>('light');
let initialized = false;

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

function readStoredPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : 'light';
  } catch {
    // 隐私模式或浏览器策略可能禁用存储；主题仍可在当前标签页内工作。
    return 'light';
  }
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') {
    return systemTheme.matches ? 'dark' : 'light';
  }
  return preference;
}

function applyTheme(preference: ThemePreference): void {
  const resolved = resolveTheme(preference);
  themePreference.value = preference;
  resolvedTheme.value = resolved;
  document.documentElement.setAttribute('theme-mode', resolved);
  document.documentElement.dataset.themePreference = preference;
}

function handleSystemThemeChange(): void {
  if (themePreference.value === 'system') {
    applyTheme('system');
  }
}

/**
 * 在 Vue 挂载前初始化全局主题并监听系统外观变化。
 * 方法可重复调用，事件监听器只注册一次，不依赖后端或 System 用户偏好。
 */
export function initializeTheme(): void {
  applyTheme(readStoredPreference());
  if (!initialized) {
    systemTheme.addEventListener('change', handleSystemThemeChange);
    initialized = true;
  }
}

/**
 * 更新当前用户在本浏览器中的主题偏好。
 *
 * localStorage 不可用时只影响持久化，DOM 与响应式状态仍立即更新。
 */
export function setThemePreference(preference: ThemePreference): void {
  applyTheme(preference);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // 存储失败不应阻断用户继续操作，也不伪装为已同步到服务端。
  }
}

/** 获取全应用唯一的主题只读状态和更新入口。 */
export function useTheme() {
  return {
    preference: readonly(themePreference),
    resolvedTheme: readonly(resolvedTheme),
    setPreference: setThemePreference,
  };
}
