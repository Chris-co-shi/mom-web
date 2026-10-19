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

export interface OverviewFilter { materialId?: string; keyword?: string; warehouseId?: string }
export interface DetailFilter {
  materialId?: string; warehouseId?: string; locationId?: string;
  batchCode?: string; snCode?: string;
  qualityStatus?: InventoryDetail['qualityStatus'];
  warehouseStatus?: InventoryDetail['warehouseStatus'];
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
