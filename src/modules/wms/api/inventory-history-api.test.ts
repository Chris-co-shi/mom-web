import { beforeEach, expect, it, vi } from 'vitest';
import { httpClient } from '../../../shared/api/http-client';
import { getInventoryHistoryTransaction, searchInventoryHistory } from './inventory-history-api';

vi.mock('../../../shared/api/http-client', () => ({ httpClient: { result: vi.fn() } }));
beforeEach(() => { vi.mocked(httpClient.result).mockReset().mockResolvedValue({}); });

it('按 /wms 路径和原始 Decimal String 契约提交服务端分页查询', async () => {
  const params = { materialId: '1001', batchCode: 'B1', snCode: 'SN-1',
    startTime: '2026-10-01T00:00:00Z', endTime: '2026-10-02T00:00:00Z' };
  const controller = new AbortController();
  await searchInventoryHistory(2, 20, params, controller.signal);
  expect(httpClient.result).toHaveBeenCalledExactlyOnceWith({ path: '/wms/inventory/history/search',
    method: 'POST', body: { params, pageNo: 2, pageSize: 20 }, signal: controller.signal });
});

it('交易详情编码路径参数并使用 GET', async () => {
  await getInventoryHistoryTransaction('123/456');
  expect(httpClient.result).toHaveBeenCalledExactlyOnceWith({
    path: '/wms/inventory/transactions/123%2F456', method: 'GET', signal: undefined,
  });
});
