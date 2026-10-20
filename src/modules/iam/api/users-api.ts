import { apiPath } from '../../../shared/api/config';
import type { PageResult } from '../../../shared/api/contracts';
import { httpClient } from '../../../shared/api/http-client';
import type { RoleResponse } from './roles-api';

export interface UserResponse {
  id: string;
  username: string;
  displayName: string;
  enabled: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  displayName: string;
  enabled: boolean;
}

export interface UpdateUserRequest {
  displayName: string;
  enabled: boolean;
  version: number;
}

function userPath(id: string, suffix = ''): string {
  return apiPath('auth', `/users/${encodeURIComponent(id)}${suffix}`);
}

/** 当前后端仅支持空 params；不能把本页过滤伪装为服务端搜索。 */
export function searchUsers(pageNo: number, pageSize: number, signal?: AbortSignal): Promise<PageResult<UserResponse>> {
  return httpClient.result({ path: apiPath('auth', '/users/search'), method: 'POST', body: { params: {}, pageNo, pageSize }, signal });
}

export function getUser(id: string, signal?: AbortSignal): Promise<UserResponse> {
  return httpClient.result({ path: userPath(id), signal });
}

export function createUser(request: CreateUserRequest): Promise<UserResponse> {
  return httpClient.result({ path: apiPath('auth', '/users'), method: 'POST', body: request });
}

export function updateUser(id: string, request: UpdateUserRequest): Promise<UserResponse> {
  return httpClient.result({ path: userPath(id), method: 'PUT', body: request });
}

/** 管理员重置无需原密码；不可复用个人 /me/password 接口。 */
export function resetUserPassword(id: string, newPassword: string, version: number): Promise<UserResponse> {
  return httpClient.result({ path: apiPath('auth', `/users/change-password/${encodeURIComponent(id)}`), method: 'PUT', body: { newPassword, version } });
}

export function setUserEnabled(id: string, enabled: boolean, version: number): Promise<UserResponse> {
  return httpClient.result({ path: apiPath('auth', `/users/${enabled ? 'enable' : 'disable'}/${encodeURIComponent(id)}`), method: 'PUT', body: { version } });
}

/** 已有删除契约无请求体和 version，引用保护由后端负责，不虚构条件删除。 */
export function deleteUser(id: string): Promise<void> {
  return httpClient.result({ path: userPath(id), method: 'DELETE' });
}

/** 读取用户角色关系，角色信息以 Auth 返回值为准。 */
export function getUserRoles(id: string, signal?: AbortSignal): Promise<RoleResponse[]> {
  return httpClient.result({ path: userPath(id, '/roles'), signal });
}

/** 整体替换用户角色关系；失败时不自动重放，空数组表示移除全部角色。 */
export function replaceUserRoles(id: string, roleIds: string[]): Promise<RoleResponse[]> {
  return httpClient.result({ path: userPath(id, '/roles'), method: 'PUT', body: { roleIds } });
}
