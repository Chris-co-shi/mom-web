import { beforeEach, describe, expect, it, vi } from 'vitest';
import { httpClient } from '../../../shared/api/http-client';
import { freezeInventory, searchActiveFreezes, searchInventoryDetails, searchInventoryOverview, unfreezeInventory } from './inventory-api';

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

  it('查询有效限制并使用 POST，不增加 /api 前缀', async () => {
    vi.mocked(httpClient.result).mockResolvedValue([]);
    await searchActiveFreezes('balance-1');
    expect(httpClient.result).toHaveBeenCalledWith(expect.objectContaining({
      path: '/wms/inventory/freezes/query', method: 'POST', body: { balanceId: 'balance-1' },
    }));
  });

  it('冻结与解冻各提交一次且保留调用方幂等键', async () => {
    vi.mocked(httpClient.result).mockResolvedValue({});
    await freezeInventory({ requestKey: 'freeze-key', balanceId: 'balance-1', quantity: '2.5', reason: 'OTHER', note: '备注' });
    await unfreezeInventory('freeze-1', { requestKey: 'release-key', quantity: '1' });
    expect(httpClient.result).toHaveBeenNthCalledWith(1, expect.objectContaining({
      path: '/wms/inventory/freezes', method: 'POST',
      body: { requestKey: 'freeze-key', balanceId: 'balance-1', quantity: '2.5', reason: 'OTHER', note: '备注' },
    }));
    expect(httpClient.result).toHaveBeenNthCalledWith(2, expect.objectContaining({
      path: '/wms/inventory/freezes/freeze-1/unfreeze', method: 'POST',
      body: { requestKey: 'release-key', quantity: '1' },
    }));
  });
});
