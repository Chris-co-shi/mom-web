import { afterEach, vi } from 'vitest';

const mediaQueryList = {
  matches: false,
  media: '(prefers-color-scheme: dark)',
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  dispatchEvent: vi.fn(() => true),
};

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  value: vi.fn(() => mediaQueryList),
});

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-locale');
  document.documentElement.removeAttribute('data-theme-preference');
  document.documentElement.removeAttribute('theme-mode');
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
