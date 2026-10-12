import { apiPath } from '../../../shared/api/config';
import type { PageResult } from '../../../shared/api/contracts';
import { httpClient } from '../../../shared/api/http-client';

/** 工厂、仓储、库位均由现有 MDM Controller 对外提供，不重复建模后端规则。 */
export type CatalogKind =
  | 'plants' | 'workshops' | 'production-lines' | 'workstations'
  | 'warehouses' | 'warehouse-areas' | 'location-types' | 'locations';

export interface MasterRow {
  id: string;
  code: string;
  name: string;
  status: 'ENABLED' | 'DISABLED';
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  plantId?: string;
  workshopId?: string;
  productionLineId?: string;
  warehouseId?: string;
  warehouseAreaId?: string | null;
  locationTypeId?: string;
}

export interface CreateCatalogRequest {
  code: string;
  name: string;
  status: MasterRow['status'];
  plantId?: string;
  workshopId?: string;
  productionLineId?: string;
  warehouseId?: string;
  warehouseAreaId?: string | null;
  locationTypeId?: string;
}

function endpoint(kind: CatalogKind, id = '', suffix = ''): string {
  return apiPath('mdm', `/${kind}${id ? `/${encodeURIComponent(id)}` : ''}${suffix}`);
}

/** POST 搜索是业务只读请求，严格按 PageQuery<Params> 发送过滤字段。 */
export function searchCatalog(
  kind: CatalogKind, pageNo: number, pageSize: number,
  params: Readonly<Record<string, string | null>> = {},
  signal?: AbortSignal,
): Promise<PageResult<MasterRow>> {
  return httpClient.result({
    path: endpoint(kind, '', '/search'), method: 'POST',
    body: { params, pageNo, pageSize }, signal,
  });
}

export function getCatalog(kind: CatalogKind, id: string, signal?: AbortSignal): Promise<MasterRow> {
  return httpClient.result({ path: endpoint(kind, id), signal });
}

export function createCatalog(kind: CatalogKind, request: CreateCatalogRequest): Promise<MasterRow> {
  return httpClient.result({ path: endpoint(kind), method: 'POST', body: request });
}

/** Controller UpdateNameRequest 只接受 name、version；不传身份和父级以免错误表达可修改性。 */
export function updateCatalog(kind: CatalogKind, id: string, request: { name: string; version: number }): Promise<MasterRow> {
  return httpClient.result({ path: endpoint(kind, id), method: 'PUT', body: request });
}

export function setCatalogEnabled(kind: CatalogKind, id: string, enabled: boolean, version: number): Promise<MasterRow> {
  return httpClient.result({
    path: endpoint(kind, id, enabled ? '/enable' : '/disable'),
    method: 'PATCH', body: { version },
  });
}
