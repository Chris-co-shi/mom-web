import { describe, expect, it } from 'vitest';
import { API_PATHS, apiPath, resolveApiUrl } from './config';

describe('Gateway module path contract', () => {
  it('浏览器到 Gateway 不包含 /api 前缀', () => {
    expect(API_PATHS).toEqual({ auth: '/auth', system: '/system', mdm: '/mdm', wms: '/wms', qms: '/qms' });
    expect(apiPath('auth', '/login')).toBe('/auth/login');
    expect(apiPath('system', '/i18n/locales')).toBe('/system/i18n/locales');
    expect(apiPath('mdm', '/materials/search')).toBe('/mdm/materials/search');
    expect(apiPath('qms', '/inspection-tasks/search')).toBe('/qms/inspection-tasks/search');
    expect(apiPath('auth')).toBe('/auth');
  });

  it.each(['login', '//outside.example/api'])('拒绝不合法的路径：%s', (path) => {
    expect(() => resolveApiUrl(path)).toThrow(TypeError);
    expect(() => apiPath('auth', path)).toThrow(TypeError);
  });

  it.each(['/api', '/api/mdm/materials/search', '/mdm/materials/search'])('阻止重复注入模块或者 /api 前缀：%s', (path) => {
    expect(() => apiPath('mdm', path)).toThrow(TypeError);
  });
});
