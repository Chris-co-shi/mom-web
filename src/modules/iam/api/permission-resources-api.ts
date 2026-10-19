import { apiPath } from '../../../shared/api/config';
import type { PageResult } from '../../../shared/api/contracts';
import { httpClient } from '../../../shared/api/http-client';

/** Auth 权限资源目录项；资源编码是权限目录身份的一部分。 */
export interface PermissionResourceResponse {
  id: string;
  domainCode: string;
  resourceCode: string;
  name: string;
  description: string | null;
  sortOrder: number;
  enabled: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/** 权限资源服务端搜索条件。 */
export interface ResourceSearchParams {
  domainCode?: string;
  keyword?: string;
  enabled?: boolean;
}

/** 新建权限资源请求；domainCode 与 resourceCode 共同确定资源身份。 */
export interface CreateResourceRequest {
  domainCode: string;
  resourceCode: string;
  name: string;
  description: string | null;
  sortOrder: number;
  enabled: boolean;
}

/** 更新权限资源请求；version 用于后端乐观并发控制。 */
export interface UpdateResourceRequest {
  name: string;
  description: string | null;
  sortOrder: number;
  enabled: boolean;
  version: number;
}

const base = apiPath('auth', '/permission-resources');
const path = (id: string, suffix = '') => `${base}/${encodeURIComponent(id)}${suffix}`;

/** 分页查询权限资源；失败只返回错误，不在请求层重放。 */
export function searchResources(pageNo: number, pageSize: number, params: ResourceSearchParams = {}, signal?: AbortSignal): Promise<PageResult<PermissionResourceResponse>> {
  return httpClient.result({ path: `${base}/search`, method: 'POST', body: { pageNo, pageSize, params }, signal });
}

/** 按资源 ID读取当前目录项。 */
export function getResource(id: string, signal?: AbortSignal): Promise<PermissionResourceResponse> {
  return httpClient.result({ path: path(id), signal });
}

/** 创建权限资源。 */
export function createResource(request: CreateResourceRequest): Promise<PermissionResourceResponse> {
  return httpClient.result({ path: base, method: 'POST', body: request });
}

/** 使用读取到的 version 更新权限资源。 */
export function updateResource(id: string, request: UpdateResourceRequest): Promise<PermissionResourceResponse> {
  return httpClient.result({ path: path(id), method: 'PUT', body: request });
}

/** 按当前 version 启用或停用权限资源。 */
export function setResourceEnabled(id: string, enabled: boolean, version: number): Promise<PermissionResourceResponse> {
  return httpClient.result({ path: `${base}/${enabled ? 'enable' : 'disable'}/${encodeURIComponent(id)}`, method: 'PUT', body: { version } });
}

/** 删除权限资源；引用保护和冲突判断由后端负责。 */
export function deleteResource(id: string): Promise<void> {
  return httpClient.result({ path: path(id), method: 'DELETE' });
}
