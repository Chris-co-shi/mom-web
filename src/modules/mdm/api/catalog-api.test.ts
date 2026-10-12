import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setHttpRequestContextProvider } from '../../../shared/api/http-client';
import { searchCatalog, createCatalog, updateCatalog, setCatalogEnabled } from './catalog-api';

describe('MDM 主数据服务端契约', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset().mockImplementation(() => new Response(JSON.stringify({ code: '0', message: 'ok', data: {
      records: [], pageNo: 1, pageSize: 20, total: 0, totalPages: 0,
    } }), { headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    setHttpRequestContextProvider(() => ({ accessToken: 'test-token', locale: 'zh-CN' }));
  });

  it('层级主数据只发送 Controller 定义的直接父级筛选', async () => {
    await searchCatalog('workshops', 2, 20, { plantId: '1234567890123456789' });
    expect(fetchMock.mock.calls[0]![0]).toBe('/mdm/workshops/search');
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({
      params: { plantId: '1234567890123456789' }, pageNo: 2, pageSize: 20,
    });
  });
  it('Warehouse 创建提交父级、编码、名称与状态', async () => {
    await createCatalog('warehouses', { plantId: '100', code: 'WH01', name: '原料仓库', status: 'ENABLED' });
    expect(fetchMock.mock.calls[0]![0]).toBe('/mdm/warehouses');
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toMatchObject({ plantId: '100', code: 'WH01' });
  });
  it('更新不发送不可修改的父级和 code', async () => {
    await updateCatalog('workstations', '100', { name: 'Station 2', version: 4 });
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ name: 'Station 2', version: 4 });
  });
  it('启停使用 PATCH + version，ID 只作为字符串传输', async () => {
    await setCatalogEnabled('locations', '1000000000000000001', false, 3);
    expect(fetchMock.mock.calls[0]![0]).toBe('/mdm/locations/1000000000000000001/disable');
    expect(fetchMock.mock.calls[0]![1].method).toBe('PATCH');
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ version: 3 });
  });
});
