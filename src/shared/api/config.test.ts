import { describe, expect, it } from 'vitest';
import { API_PATHS, apiPath, resolveApiUrl } from './config';

describe('API path contract', () => {
  it('集中登记 Gateway bounded context path', () => {
    expect(API_PATHS).toEqual({
      auth: '/auth',
      system: '/system',
      mdm: '/mdm',
    });
    expect(apiPath('auth', '/login')).toBe('/api/auth/login');
    expect(apiPath('system', '/i18n/locales')).toBe('/api/system/i18n/locales');
    expect(apiPath('mdm', '/materials/search')).toBe('/api/mdm/materials/search');
    expect(apiPath('auth')).toBe('/api/auth');
  });

  it.each(['login', '//outside.example/api'])('拒绝绕过统一边界的路径：%s', (path) => {
    expect(() => resolveApiUrl(path)).toThrow(TypeError);
    expect(() => apiPath('auth', path)).toThrow(TypeError);
  });
});
