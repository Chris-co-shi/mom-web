import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  NAVIGATION_COLLAPSED_STORAGE_KEY,
  readNavigationCollapsed,
  writeNavigationCollapsed,
} from './navigation-preference';

describe('navigation preference', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('默认展开，仅接受明确保存的折叠值', () => {
    expect(readNavigationCollapsed()).toBe(false);

    window.localStorage.setItem(NAVIGATION_COLLAPSED_STORAGE_KEY, 'true');
    expect(readNavigationCollapsed()).toBe(true);

    window.localStorage.setItem(NAVIGATION_COLLAPSED_STORAGE_KEY, 'invalid');
    expect(readNavigationCollapsed()).toBe(false);
  });

  it('写入用户的整栏折叠选择', () => {
    writeNavigationCollapsed(true);
    expect(window.localStorage.getItem(NAVIGATION_COLLAPSED_STORAGE_KEY)).toBe('true');

    writeNavigationCollapsed(false);
    expect(window.localStorage.getItem(NAVIGATION_COLLAPSED_STORAGE_KEY)).toBe('false');
  });

  it('浏览器存储不可用时不阻断布局', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(readNavigationCollapsed()).toBe(false);

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(() => writeNavigationCollapsed(true)).not.toThrow();
  });
});
