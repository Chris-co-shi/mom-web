import { apiPath } from '../../../shared/api/config';
import type { PageResult } from '../../../shared/api/contracts';
import { httpClient } from '../../../shared/api/http-client';

export type CountStatus = 'DRAFT' | 'COUNTING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
export type QualityStatus = 'PENDING' | 'QUALIFIED' | 'RESTRICTED' | 'REJECTED';
export type WarehouseStatus = 'NORMAL' | 'FROZEN';
export interface CountTask {
  id: string; taskNo: string; requestKey: string; warehouseId: string; warehouseCode: string;
  locationIds: string[]; materialIds: string[]; status: CountStatus; transactionId: string | null;
  createdBy: string; createdAt: string; updatedBy: string; updatedAt: string;
  startedBy: string | null; startedAt: string | null; confirmedBy: string | null; confirmedAt: string | null;
  completedBy: string | null; completedAt: string | null; cancelledBy: string | null; cancelledAt: string | null;
  version: number;
}
export interface CountDimension {
  materialId: string; materialCode: string; materialName: string; uomCode: string;
  batchCode: string | null; snCode: string | null; warehouseId: string; warehouseCode: string;
  locationId: string; locationCode: string; qualityStatus: QualityStatus; warehouseStatus: WarehouseStatus;
}
export interface CountLine {
  id: string; dimension: CountDimension; bookQuantity: string; countedQuantity: string | null;
  differenceQuantity: string | null; snapshotBy: string; snapshotAt: string;
  countedBy: string | null; countedAt: string | null;
}
export interface CountDetail { task: CountTask; lines: CountLine[] }
export interface CountSummary {
  id: string; taskNo: string; warehouseId: string; warehouseCode: string; status: CountStatus;
  transactionId: string | null; createdAt: string; startedAt: string | null; completedAt: string | null;
}
export interface CountScope { locationIds: string[]; materialIds: string[] }
export interface ExtraInput {
  materialId: string; locationId: string; batchCode: string | null; snCode: string | null;
  qualityStatus: QualityStatus; warehouseStatus: WarehouseStatus; quantity: string;
}
const path = (suffix = '') => apiPath('wms', `/inventory-counts${suffix}`);
const idPath = (id: string, suffix = '') => path(`/${encodeURIComponent(id)}${suffix}`);
export function listCounts(pageNo: number, pageSize: number, warehouseId?: string): Promise<PageResult<CountSummary>> {
  return httpClient.result({ path: path('/search'), method: 'POST', body: { params: { warehouseId: warehouseId || null }, pageNo, pageSize } });
}
export function getCount(id: string): Promise<CountDetail> { return httpClient.result({ path: idPath(id) }); }
/** 仅返回当前操作人的已提交创建结果；null 不能作为安全重试凭据。 */
export function findCountByRequestKey(requestKey: string): Promise<CountDetail | null> {
  return httpClient.result({ path: path(`/by-request-key/${encodeURIComponent(requestKey)}`) });
}
export function createCount(requestKey: string, warehouseId: string, scope: CountScope): Promise<CountDetail> {
  return httpClient.result({ path: path(), method: 'POST', body: { requestKey, warehouseId, ...scope } });
}
export function editCountScope(id: string, scope: CountScope): Promise<CountDetail> {
  return httpClient.result({ path: idPath(id, '/scope'), method: 'PUT', body: scope });
}
export function startCount(id: string): Promise<CountDetail> {
  return httpClient.result({ path: idPath(id, '/start'), method: 'POST' });
}
export function saveCount(id: string, lineId: string, quantity: string): Promise<CountDetail> {
  return httpClient.result({ path: idPath(id, `/lines/${encodeURIComponent(lineId)}/count`), method: 'PUT', body: { quantity } });
}
export function addExtra(id: string, input: ExtraInput): Promise<CountDetail> {
  return httpClient.result({ path: idPath(id, '/lines'), method: 'POST', body: input });
}
export function confirmCount(id: string): Promise<CountDetail> {
  return httpClient.result({ path: idPath(id, '/confirm'), method: 'POST' });
}
export function adjustCount(id: string): Promise<CountDetail> {
  return httpClient.result({ path: idPath(id, '/adjust'), method: 'POST' });
}
export function cancelCount(id: string): Promise<CountDetail> {
  return httpClient.result({ path: idPath(id, '/cancel'), method: 'POST' });
}
