import { beforeEach, describe, expect, it, vi } from 'vitest';
import { httpClient } from '../../../shared/api/http-client';
import { searchInventoryDetails, searchInventoryOverview } from './inventory-api';

vi.mock('../../../shared/api/http-client', () => ({ httpClient: { result: vi.fn() } }));

beforeEach(() => { vi.mocked(httpClient.result).mockReset(); });

describe('WMS 库存只读契约', () => {
  it('总览沿 Gateway 原路径提交物料和仓库筛选', async () => {
    vi.mocked(httpClient.result).mockResolvedValue({ records: [], pageNo: 1, pageSize: 20, total: 0, totalPages: 0 });
    await searchInventoryOverview(1, 20, { materialId: '1001', warehouseId: '2001' });
    expect(httpClient.result).toHaveBeenCalledWith(expect.objectContaining({
      path: '/wms/inventory/overview/search', method: 'POST',
      body: { params: { materialId: '1001', warehouseId: '2001' }, pageNo: 1, pageSize: 20 },
    }));
  });

  it('明细提交组合筛选且不添加 /api', async () => {
    vi.mocked(httpClient.result).mockResolvedValue({ records: [], pageNo: 2, pageSize: 10, total: 0, totalPages: 0 });
    await searchInventoryDetails(2, 10, { materialId: '1001', snCode: 'SN-1', warehouseStatus: 'FROZEN' });
    expect(httpClient.result).toHaveBeenCalledWith(expect.objectContaining({
      path: '/wms/inventory/details/search', method: 'POST',
      body: { params: { materialId: '1001', snCode: 'SN-1', warehouseStatus: 'FROZEN' }, pageNo: 2, pageSize: 10 },
    }));
  });
});
