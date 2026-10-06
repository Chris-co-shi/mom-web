import { apiPath } from '../../../shared/api/config';
import type { PageResult } from '../../../shared/api/contracts';
import { httpClient } from '../../../shared/api/http-client';

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

export interface ResourceSearchParams {
  domainCode?: string;
  keyword?: string;
  enabled?: boolean;
}

export interface CreateResourceRequest {
  domainCode: string;
  resourceCode: string;
  name: string;
  description: string | null;
  sortOrder: number;
  enabled: boolean;
}

export interface UpdateResourceRequest {
  name: string;
  description: string | null;
  sortOrder: number;
  enabled: boolean;
  version: number;
}

const base = apiPath('auth', '/permission-resources');
const path = (id: string, suffix = '') => `${base}/${encodeURIComponent(id)}${suffix}`;

export function searchResources(pageNo: number, pageSize: number, params: ResourceSearchParams = {}, signal?: AbortSignal): Promise<PageResult<PermissionResourceResponse>> {
  return httpClient.result({ path: `${base}/search`, method: 'POST', body: { pageNo, pageSize, params }, signal });
}

export function getResource(id: string, signal?: AbortSignal): Promise<PermissionResourceResponse> {
  return httpClient.result({ path: path(id), signal });
}

export function createResource(request: CreateResourceRequest): Promise<PermissionResourceResponse> {
  return httpClient.result({ path: base, method: 'POST', body: request });
}

export function updateResource(id: string, request: UpdateResourceRequest): Promise<PermissionResourceResponse> {
  return httpClient.result({ path: path(id), method: 'PUT', body: request });
}

export function setResourceEnabled(id: string, enabled: boolean, version: number): Promise<PermissionResourceResponse> {
  return httpClient.result({ path: path(id, enabled ? '/enable' : '/disable'), method: 'PUT', body: { version } });
}

export function deleteResource(id: string): Promise<void> {
  return httpClient.result({ path: path(id), method: 'DELETE' });
}
