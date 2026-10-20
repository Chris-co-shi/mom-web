import { apiPath } from '../../../shared/api/config';
import type { PageResult } from '../../../shared/api/contracts';
import { httpClient } from '../../../shared/api/http-client';

/** 库存总览以 Material 分组，所有数量均为 Decimal String。 */
export interface InventoryOverview {
  materialId: string;
  materialCode: string;
  materialName: string;
  uomCode: string;
  totalQuantity: string;
  availableQuantity: string;
  unavailableQuantity: string;
  frozenQuantity: string;
}

/** 唯一余额维度；同一 SN 可返回多种状态。 */
export interface InventoryDetail {
  id: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  uomCode: string;
  batchCode: string | null;
  snCode: string | null;
  warehouseId: string;
  warehouseCode: string;
  locationId: string;
  locationCode: string;
  qualityStatus: 'PENDING' | 'QUALIFIED' | 'RESTRICTED' | 'REJECTED';
  warehouseStatus: 'NORMAL' | 'FROZEN';
  quantity: string;
}

export interface OverviewFilter { materialId?: string; keyword?: string; warehouseId?: string; warehouseCode?: string }
export interface DetailFilter {
  materialId?: string; warehouseId?: string; locationId?: string;
  batchCode?: string; snCode?: string;
  qualityStatus?: InventoryDetail['qualityStatus'];
  warehouseStatus?: InventoryDetail['warehouseStatus'];
}

export type FreezeReason = 'PACKAGE_DAMAGE' | 'STOCK_DISCREPANCY' | 'WAREHOUSE_CHECK' | 'SAFETY_HOLD' | 'OTHER';

/** 独立的仓储冻结限制事实。 */
export interface InventoryFreeze {
  id: string;
  transactionId: string;
  originalBalanceId: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  uomCode: string;
  batchCode: string | null;
  snCode: string | null;
  warehouseId: string;
  warehouseCode: string;
  locationId: string;
  locationCode: string;
  qualityStatus: InventoryDetail['qualityStatus'];
  reasonCode: FreezeReason;
  note: string | null;
  originalQuantity: string;
  remainingQuantity: string;
  sourceType: string;
  sourceId: string;
  operatorId: string;
  frozenAt: string;
}

/** 按明确冻结限制返回的解冻交易结果。 */
export interface InventoryUnfreezeResult {
  transactionId: string;
  freezeId: string;
  remainingQuantity: string;
}

/** 按 Material 查询实时汇总。 */
export function searchInventoryOverview(pageNo: number, pageSize: number, params: OverviewFilter,
                                        signal?: AbortSignal): Promise<PageResult<InventoryOverview>> {
  return httpClient.result({ path: apiPath('wms', '/inventory/overview/search'), method: 'POST',
    body: { params, pageNo, pageSize }, signal });
}

/** 查询非零实时余额，服务端负责分页和权限。 */
export function searchInventoryDetails(pageNo: number, pageSize: number, params: DetailFilter,
                                       signal?: AbortSignal): Promise<PageResult<InventoryDetail>> {
  return httpClient.result({ path: apiPath('wms', '/inventory/details/search'), method: 'POST',
    body: { params, pageNo, pageSize }, signal });
}

/** 查询选中库存维度的所有有效限制。 */
export function searchActiveFreezes(balanceId: string): Promise<InventoryFreeze[]> {
  return httpClient.result({ path: apiPath('wms', '/inventory/freezes/query'), method: 'POST',
    body: { balanceId } });
}

/** 对指定余额执行仓储冻结；写入失败时由调用方根据错误结果提示刷新核对，不自动重试。 */
export function freezeInventory(input: { requestKey: string; balanceId: string; quantity: string;
  reason: FreezeReason; note?: string }): Promise<InventoryFreeze> {
  return httpClient.result({ path: apiPath('wms', '/inventory/freezes'), method: 'POST', body: input });
}

/** 对明确冻结限制执行全部或部分解冻；请求不自动重试。 */
export function unfreezeInventory(freezeId: string, input: { requestKey: string; quantity: string;
  note?: string }): Promise<InventoryUnfreezeResult> {
  return httpClient.result({ path: apiPath('wms', `/inventory/freezes/${encodeURIComponent(freezeId)}/unfreeze`),
    method: 'POST', body: input });
}

/** 同仓库库位移动；写请求由调用方使用稳定请求键，网络结果未知时不自动重试。 */
export function transferInventory(input: { requestKey: string; balanceId: string;
  targetLocationId: string; quantity: string }): Promise<{ transactionId: string }> {
  return httpClient.result({ path: apiPath('wms', '/inventory/transfers'), method: 'POST', body: input });
}

/** 按原请求键读取当前操作人的已提交移动事实；null 不代表原请求未提交。 */
export function findTransferByRequestKey(requestKey: string): Promise<{
  transactionId: string; balanceId: string; targetLocationId: string; quantity: string;
} | null> {
  return httpClient.result({ path: apiPath('wms', `/inventory/transfers/by-request-key/${encodeURIComponent(requestKey)}`),
    method: 'GET' });
}
