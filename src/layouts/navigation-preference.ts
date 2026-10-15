export const NAVIGATION_COLLAPSED_STORAGE_KEY = 'mom.navigation.collapsed';

/** 读取整栏折叠偏好；存储不可用或数据非法时保持默认展开。 */
export function readNavigationCollapsed(): boolean {
  try {
    return window.localStorage.getItem(NAVIGATION_COLLAPSED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/** 保存整栏折叠偏好；浏览器禁止存储时只影响刷新后的状态。 */
export function writeNavigationCollapsed(collapsed: boolean): void {
  try {
    window.localStorage.setItem(NAVIGATION_COLLAPSED_STORAGE_KEY, String(collapsed));
  } catch {
    // 当前标签页的响应式状态仍然立即生效。
  }
}
