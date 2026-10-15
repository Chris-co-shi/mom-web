import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setHttpRequestContextProvider } from '../../../shared/api/http-client';
import { createPlant, updatePlant } from './factory-api';

describe('MDM 工厂时区 API 契约', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue(new Response(JSON.stringify({ code: '0', message: 'ok', data: {} }), {
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    setHttpRequestContextProvider(() => ({ accessToken: 'mdm-test-token', locale: 'zh-CN' }));
  });

  it('新建工厂在 /mdm 路由提交权威 IANA 时区', async () => {
    await createPlant({ code: 'P-CN', name: '中国工厂', timeZoneId: 'Asia/Shanghai', status: 'ENABLED' });
    expect(fetchMock.mock.calls[0]![0]).toBe('/mdm/plants');
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({
      code: 'P-CN', name: '中国工厂', timeZoneId: 'Asia/Shanghai', status: 'ENABLED',
    });
  });

  it('存量工厂可通过带技术版本的编辑补齐时区', async () => {
    await updatePlant('2106626945701810177', { name: '旧工厂', timeZoneId: 'Europe/Berlin', version: 3 });
    expect(fetchMock.mock.calls[0]![0]).toBe('/mdm/plants/2106626945701810177');
    expect(fetchMock.mock.calls[0]![1].method).toBe('PUT');
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({
      name: '旧工厂', timeZoneId: 'Europe/Berlin', version: 3,
    });
  });
});
