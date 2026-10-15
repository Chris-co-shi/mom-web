import { apiPath } from '../../../shared/api/config';
import type { PageResult } from '../../../shared/api/contracts';
import { httpClient } from '../../../shared/api/http-client';

/** MDM 记录自身状态，不等同整条父级链的业务有效性。 */
export type MasterStatus = 'ENABLED' | 'DISABLED';

export interface PlantView {
  id: string;
  code: string;
  name: string;
  timeZoneId: string | null;
  status: MasterStatus;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  version: number;
}

export interface CreatePlantRequest {
  code: string;
  name: string;
  timeZoneId: string;
  status: MasterStatus;
}

export interface UpdatePlantRequest {
  name: string;
  timeZoneId: string | null;
  version: number;
}

function plantPath(id = '', suffix = ''): string {
  return apiPath('mdm', `/plants${id ? `/${encodeURIComponent(id)}` : ''}${suffix}`);
}

/** POST /search 是服务端分页只读查询，不应被写请求重试策略影响。 */
export function searchPlants(pageNo: number, pageSize: number, signal?: AbortSignal): Promise<PageResult<PlantView>> {
  return httpClient.result({
    path: plantPath('', '/search'), method: 'POST', body: { params: {}, pageNo, pageSize }, signal,
  });
}

export function getPlant(id: string, signal?: AbortSignal): Promise<PlantView> {
  return httpClient.result({ path: plantPath(id), signal });
}

export function createPlant(request: CreatePlantRequest): Promise<PlantView> {
  return httpClient.result({ path: plantPath(), method: 'POST', body: request });
}

export function updatePlant(id: string, request: UpdatePlantRequest): Promise<PlantView> {
  return httpClient.result({ path: plantPath(id), method: 'PUT', body: request });
}

/** 状态操作必须显式提交读到的 version；失败不得乐观翻转。 */
export function setPlantEnabled(id: string, enabled: boolean, version: number): Promise<PlantView> {
  return httpClient.result({
    path: apiPath('mdm', `/plants/${enabled ? 'enable' : 'disable'}/${encodeURIComponent(id)}`),
    method: 'PATCH',
    body: { version },
  });
}
