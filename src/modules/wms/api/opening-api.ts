import { apiPath } from '../../../shared/api/config';
import type { PageResult } from '../../../shared/api/contracts';
import { httpClient } from '../../../shared/api/http-client';
type QualityStatus = 'PENDING' | 'QUALIFIED' | 'RESTRICTED' | 'REJECTED';
type WarehouseStatus = 'NORMAL' | 'FROZEN';

export interface OpeningDocument {
  id: string; documentNo: string; warehouseId: string; warehouseCode: string;
  status: 'DRAFT' | 'POSTED'; transactionId: string | null; createdBy: string; version: number;
  warehouseState: 'INITIALIZING' | 'PENDING_ACTIVATION' | 'ACTIVE';
}
export interface OpeningLine {
  id: string; lineNo: number; materialId: string; materialCode: string; materialName: string;
  batchCode: string | null; snCode: string | null; warehouseId: string; warehouseCode: string;
  locationId: string; locationCode: string; qualityStatus: QualityStatus; warehouseStatus: WarehouseStatus;
  quantity: string; uomCode: string;
}
export interface OpeningDetail { document: OpeningDocument; lines: OpeningLine[] }
export interface OpeningLineInput {
  materialId: string; locationId: string; batchCode: string | null; snCode: string | null;
  qualityStatus: QualityStatus; warehouseStatus: WarehouseStatus; quantity: string;
}
const path = (suffix = '') => apiPath('wms', `/opening-documents${suffix}`);
export function listOpeningDocuments(pageNo: number, pageSize: number): Promise<PageResult<OpeningDocument>> {
  return httpClient.result({ path: path('/search'), method: 'POST', body: { params: {}, pageNo, pageSize } });
}
export function getOpeningDocument(id: string): Promise<OpeningDetail> {
  return httpClient.result({ path: path(`/${encodeURIComponent(id)}`) });
}
export function deleteOpeningDocument(id: string): Promise<void> {
  return httpClient.result({ path: path(`/${encodeURIComponent(id)}`), method: 'DELETE' });
}
export function createOpeningDocument(warehouseId: string): Promise<OpeningDetail> {
  return httpClient.result({ path: path(), method: 'POST', body: { warehouseId } });
}
export function addOpeningLine(id: string, line: OpeningLineInput): Promise<OpeningDetail> {
  return httpClient.result({ path: path(`/${encodeURIComponent(id)}/lines`), method: 'POST', body: line });
}
export function editOpeningLine(id: string, lineId: string, line: OpeningLineInput): Promise<OpeningDetail> {
  return httpClient.result({ path: path(`/${encodeURIComponent(id)}/lines/${encodeURIComponent(lineId)}`), method: 'PUT', body: line });
}
export function deleteOpeningLine(id: string, lineId: string): Promise<OpeningDetail> {
  return httpClient.result({ path: path(`/${encodeURIComponent(id)}/lines/${encodeURIComponent(lineId)}`), method: 'DELETE' });
}
export function postOpeningDocument(id: string): Promise<{ detail: OpeningDetail; transactionId: string }> {
  return httpClient.result({ path: path(`/${encodeURIComponent(id)}/post`), method: 'POST' });
}
export function activateWarehouseInventory(warehouseId: string): Promise<string> {
  return httpClient.result({ path: path(`/warehouses/${encodeURIComponent(warehouseId)}/activate`), method: 'POST' });
}
