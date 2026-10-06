import { apiPath } from '../../../shared/api/config';
import type { PageResult } from '../../../shared/api/contracts';
import { httpClient } from '../../../shared/api/http-client';
import type { PermissionResponse } from './permissions-api';

export interface RoleResponse {
  id: string;
  code: string;
  name: string;
  description: string | null;
  enabled: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleRequest {
  code: string;
  name: string;
  description: string | null;
  enabled: boolean;
}

export interface UpdateRoleRequest {
  name: string;
  description: string | null;
  enabled: boolean;
  version: number;
}

function rolePath(id: string, suffix = ''): string {
  return apiPath('auth', `/roles/${encodeURIComponent(id)}${suffix}`);
}

/** 后端角色目录只接受空 params；本地筛选不能伪装成服务端搜索。 */
export function searchRoles(pageNo: number, pageSize: number, signal?: AbortSignal): Promise<PageResult<RoleResponse>> {
  return httpClient.result({ path: apiPath('auth', '/roles/search'), method: 'POST', body: { params: {}, pageNo, pageSize }, signal });
}

export function getRole(id: string, signal?: AbortSignal): Promise<RoleResponse> {
  return httpClient.result({ path: rolePath(id), signal });
}

export function createRole(request: CreateRoleRequest): Promise<RoleResponse> {
  return httpClient.result({ path: apiPath('auth', '/roles'), method: 'POST', body: request });
}

export function updateRole(id: string, request: UpdateRoleRequest): Promise<RoleResponse> {
  return httpClient.result({ path: rolePath(id), method: 'PUT', body: request });
}

export function setRoleEnabled(id: string, enabled: boolean, version: number): Promise<RoleResponse> {
  return httpClient.result({ path: rolePath(id, enabled ? '/enable' : '/disable'), method: 'PUT', body: { version } });
}

/** 删除契约没有版本条件；引用检查由 Auth 后端负责。 */
export function deleteRole(id: string): Promise<void> {
  return httpClient.result({ path: rolePath(id), method: 'DELETE' });
}

/** 读取角色当前权限；不从角色列表或 Token 推断关系。 */
export function getRolePermissions(id: string, signal?: AbortSignal): Promise<PermissionResponse[]> {
  return httpClient.result({ path: rolePath(id, '/permissions'), signal });
}

/** 整体替换关系，空数组代表清空；不得改写为逐项增删或自动重试。 */
export function replaceRolePermissions(id: string, permissionIds: string[]): Promise<PermissionResponse[]> {
  return httpClient.result({ path: rolePath(id, '/permissions'), method: 'PUT', body: { permissionIds } });
}
