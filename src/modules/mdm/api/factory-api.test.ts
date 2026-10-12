import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setHttpRequestContextProvider } from '../../../shared/api/http-client';
import * as factory from './factory-api';

describe('MDM Plant API contract', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset().mockImplementation(() => new Response(JSON.stringify({
      code: '0', message: 'ok', data: { records: [], pageNo: 1, pageSize: 20, total: 0, totalPages: 0 },
    }), { headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    setHttpRequestContextProvider(() => ({ accessToken: 'test-token', locale: 'zh-CN' }));
  });

  it('分页查询传空 params，且浏览器到 Gateway 路径不带 /api', async () => {
    await factory.searchPlants(1, 20);
    expect(fetchMock.mock.calls[0]![0]).toBe('/mdm/plants/search');
    expect(fetchMock.mock.calls[0]![1].method).toBe('POST');
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ params: {}, pageNo: 1, pageSize: 20 });
  });

  it('ID 保持字符串，启停使用 PATCH 和所读取的版本', async () => {
    await factory.getPlant('1000000000000000001');
    await factory.setPlantEnabled('1000000000000000001', false, 7);
    expect(fetchMock.mock.calls.map(call => call[0])).toEqual([
      '/mdm/plants/1000000000000000001',
      '/mdm/plants/1000000000000000001/disable',
    ]);
    expect(fetchMock.mock.calls[1]![1].method).toBe('PATCH');
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({ version: 7 });
  });

  it('更新只允许名称与版本，创建携带稳定业务编码', async () => {
    await factory.createPlant({ code: 'PLANT01', name: '工厂一', status: 'ENABLED' });
    await factory.updatePlant('100', { name: '工厂新名称', version: 4 });
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({
      code: 'PLANT01', name: '工厂一', status: 'ENABLED',
    });
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({ name: '工厂新名称', version: 4 });
  });
});
