import { apiPath } from '../../../shared/api/config';
import type { PageResult } from '../../../shared/api/contracts';
import { httpClient } from '../../../shared/api/http-client';

/** 时间区间左闭右开，最长 366 天；关键字按历史快照模糊匹配，其余字段精确匹配。 */
export interface InventoryHistoryFilter {
  materialId?: string; batchCode?: string; snCode?: string; warehouseId?: string; locationId?: string;
  materialKeyword?: string; warehouseCode?: string; locationCode?: string;
  transactionType?: string; sourceType?: string; sourceId?: string; actor?: string;
  startTime: string; endTime: string;
}

/** 单条不可变分录，旧历史快照允许为空，数量为 Decimal String。 */
export interface InventoryHistoryEntry {
  id: string; transactionId: string; lineNo: number;
  transactionType: string | null; sourceType: string | null; sourceId: string | null;
  operatorId: string | null; occurredAt: string;
  materialId: string | null; materialCode: string | null; materialName: string | null;
  uomCode: string | null; batchCode: string | null; snCode: string | null;
  warehouseId: string | null; warehouseCode: string | null;
  locationId: string | null; locationCode: string | null;
  qualityStatus: string | null; warehouseStatus: string | null;
  deltaQuantity: string; beforeQuantity: string | null; afterQuantity: string | null;
}

/** 交易头及全部分录，不受列表过滤条件限制。 */
export interface InventoryHistoryTransaction {
  id: string; transactionType: string | null; sourceType: string | null; sourceId: string | null;
  operatorId: string | null; occurredAt: string; reasonCode: string | null; note: string | null;
  entries: InventoryHistoryEntry[];
}

/** 服务端分页查询库存历史。 */
export function searchInventoryHistory(pageNo: number, pageSize: number, params: InventoryHistoryFilter,
                                       signal?: AbortSignal): Promise<PageResult<InventoryHistoryEntry>> {
  return httpClient.result({ path: apiPath('wms', '/inventory/history/search'), method: 'POST',
    body: { params, pageNo, pageSize }, signal });
}

/** 查询一笔交易的全部正负分录。 */
export function getInventoryHistoryTransaction(id: string, signal?: AbortSignal): Promise<InventoryHistoryTransaction> {
  return httpClient.result({ path: apiPath('wms', `/inventory/transactions/${encodeURIComponent(id)}`),
    method: 'GET', signal });
}
