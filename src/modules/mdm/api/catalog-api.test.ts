import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setHttpRequestContextProvider } from '../../../shared/api/http-client';
import { searchCatalog, setCatalogEnabled } from './catalog-api';

describe('MDM 结构主数据 API 契约', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue(new Response(JSON.stringify({ code: '0', message: 'ok', data: null }), {
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    setHttpRequestContextProvider(() => ({ accessToken: 'mdm-test-token', locale: 'zh-CN' }));
  });

  it('库位查询使用 MDM 分页契约并按字符串传递仓库 ID', async () => {
    await searchCatalog('locations', 2, 20, { warehouseId: '2106626945701810177' });
    expect(fetchMock.mock.calls[0]![0]).toBe('/mdm/locations/search');
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({
      params: { warehouseId: '2106626945701810177' }, pageNo: 2, pageSize: 20,
    });
  });

  it('结构启停携带版本且只发送一次', async () => {
    await setCatalogEnabled('workstations', '2106626945701810177', false, 6);
    expect(fetchMock.mock.calls[0]![0]).toBe('/mdm/workstations/disable/2106626945701810177');
    expect(fetchMock.mock.calls[0]![1].method).toBe('PATCH');
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ version: 6 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
