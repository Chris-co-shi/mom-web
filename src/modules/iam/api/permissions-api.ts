import { apiPath } from '../../../shared/api/config';
import type { PageResult } from '../../../shared/api/contracts';
import { httpClient } from '../../../shared/api/http-client';

export interface PermissionResponse {
  id: string;
  resourceId: string;
  domainCode: string;
  resourceCode: string;
  resourceName: string;
  actionCode: string;
  code: string;
  name: string;
  description: string | null;
  enabled: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePermissionRequest {
  resourceId: string;
  actionCode: string;
  name: string;
  description: string | null;
  enabled: boolean;
}

export interface UpdatePermissionRequest {
  name: string;
  description: string | null;
  enabled: boolean;
  version: number;
}

function permissionPath(id: string, suffix = ''): string {
  return apiPath('auth', `/permissions/${encodeURIComponent(id)}${suffix}`);
}

export interface PermissionSearchParams {
  domainCode?: string;
  resourceId?: string;
  keyword?: string;
  enabled?: boolean;
}

/** 搜索条件由 Auth 服务端跨页执行，绝不从编码推断资源。 */
export function searchPermissions(pageNo: number, pageSize: number, signal?: AbortSignal, params: PermissionSearchParams = {}): Promise<PageResult<PermissionResponse>> {
  return httpClient.result({ path: apiPath('auth', '/permissions/search'), method: 'POST', body: { params, pageNo, pageSize }, signal });
}

export function getPermission(id: string, signal?: AbortSignal): Promise<PermissionResponse> {
  return httpClient.result({ path: permissionPath(id), signal });
}

export function createPermission(request: CreatePermissionRequest): Promise<PermissionResponse> {
  return httpClient.result({ path: apiPath('auth', '/permissions'), method: 'POST', body: request });
}

export function updatePermission(id: string, request: UpdatePermissionRequest): Promise<PermissionResponse> {
  return httpClient.result({ path: permissionPath(id), method: 'PUT', body: request });
}

export function setPermissionEnabled(id: string, enabled: boolean, version: number): Promise<PermissionResponse> {
  return httpClient.result({ path: permissionPath(id, enabled ? '/enable' : '/disable'), method: 'PUT', body: { version } });
}

/** 删除契约没有版本条件；引用检查由 Auth 后端负责。 */
export function deletePermission(id: string): Promise<void> {
  return httpClient.result({ path: permissionPath(id), method: 'DELETE' });
}
