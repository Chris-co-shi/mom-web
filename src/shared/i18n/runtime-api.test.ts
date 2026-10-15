import { beforeEach, describe, expect, it, vi } from 'vitest';
import { i18nRuntimeApi } from './runtime-api';
import { setHttpRequestContextProvider } from '../api/http-client';

describe('动态国际化 Runtime API', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ code: '0', message: 'ok', data: null }), {
      headers: { 'Content-Type': 'application/json' },
    })));
    vi.stubGlobal('fetch', fetchMock);
    setHttpRequestContextProvider(() => ({ accessToken: 'runtime-test-token', locale: 'zh-CN' }));
  });

  it('语言目录归 System 所有，业务文案 Bundle 归各自 Owner', async () => {
    await i18nRuntimeApi.locales();
    await i18nRuntimeApi.bundle('mdm', 'zh-CN');
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      '/system/i18n/locales', '/mdm/i18n/runtime/bundles?locale=zh-CN',
    ]);
  });

  it('变更事件地址由对应 Owner 提供', () => {
    expect(i18nRuntimeApi.eventUrl('auth')).toBe('/auth/i18n/runtime/events');
  });
});
