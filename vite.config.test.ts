import { describe, expect, it } from 'vitest';
import { rewriteBrowserApiPath } from './vite.config';

describe('Vite API proxy contract', () => {
  it.each([
    ['/api/auth/login', '/auth/login'],
    ['/api/system/admin/dictionaries?enabled=true', '/system/admin/dictionaries?enabled=true'],
    ['/api/mdm/materials/search', '/mdm/materials/search'],
  ])('只移除最前面的 /api：%s', (browserPath, gatewayPath) => {
    expect(rewriteBrowserApiPath(browserPath)).toBe(gatewayPath);
  });

  it('不改写并非浏览器 API 入口的路径', () => {
    expect(rewriteBrowserApiPath('/assets/api/manual.pdf')).toBe('/assets/api/manual.pdf');
  });
});
