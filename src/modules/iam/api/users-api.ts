import { apiPath } from '../../../shared/api/config';
import type { PageResult } from '../../../shared/api/contracts';
import { httpClient } from '../../../shared/api/http-client';

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
  return httpClient.result({ path: userPath(id, '/password'), method: 'PUT', body: { newPassword, version } });
}

export function setUserEnabled(id: string, enabled: boolean, version: number): Promise<UserResponse> {
  return httpClient.result({ path: userPath(id, enabled ? '/enable' : '/disable'), method: 'PUT', body: { version } });
}

/** 已有删除契约无请求体和 version，引用保护由后端负责，不虚构条件删除。 */
export function deleteUser(id: string): Promise<void> {
  return httpClient.result({ path: userPath(id), method: 'DELETE' });
}
