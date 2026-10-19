import { apiPath } from '../../../shared/api/config';
import type { PageResult } from '../../../shared/api/contracts';
import { httpClient } from '../../../shared/api/http-client';

/** MDM 物料类别及其默认批次/保质期策略。 */
export interface MaterialCategory {
  id: string; code: string; name: string; parentId: string | null; sort: number;
  defaultShelfLifeDays: number | null; defaultBatchTrackingPolicy: BatchTrackingPolicy | null;
  status: 'ENABLED' | 'DISABLED';
  version: number; createdAt: string; updatedAt: string;
}
/** 物料类型；UNSPECIFIED 只作为展示或后端兼容值，不用于新建请求。 */
export type MaterialType = 'UNSPECIFIED' | 'RAW_MATERIAL' | 'SEMI_FINISHED' | 'FINISHED_PRODUCT';
/** 物料批次追踪策略。 */
export type BatchTrackingPolicy = 'UNSPECIFIED' | 'NONE' | 'REQUIRED';
/** MDM 物料主数据视图。 */
export interface Material {
  id: string; code: string; name: string; categoryId: string; baseUomId: string;
  materialType: MaterialType; batchTrackingPolicy: BatchTrackingPolicy; revisionNo: number;
  shelfLifeDays: number | null; status: 'ENABLED' | 'DISABLED';
  version: number; createdAt: string; updatedAt: string;
}
/** 新建物料类别请求。 */
export interface CreateMaterialCategoryRequest {
  code: string; name: string; parentId: string | null; sort: number;
  defaultShelfLifeDays: number | null; defaultBatchTrackingPolicy: 'NONE' | 'REQUIRED' | null;
  status: MaterialCategory['status'];
}
/** 更新物料类别请求；version 用于并发控制。 */
export interface UpdateMaterialCategoryRequest {
  name: string; parentId: string | null; sort: number;
  defaultShelfLifeDays: number | null; defaultBatchTrackingPolicy: 'NONE' | 'REQUIRED' | null;
  version: number;
}
/** 新建物料请求；来源字段决定是否继承类别默认值。 */
export interface CreateMaterialRequest {
  code: string; name: string; categoryId: string; baseUomId: string;
  materialType: Exclude<MaterialType, 'UNSPECIFIED'>;
  batchTrackingSource: 'CATEGORY_DEFAULT' | 'EXPLICIT';
  batchTrackingPolicy: 'NONE' | 'REQUIRED' | null;
  shelfLifeSource: 'CATEGORY_DEFAULT' | 'EXPLICIT';
  shelfLifeDays: number | null; status: Material['status'];
}
/** 更新物料可变属性请求。 */
export interface UpdateMaterialRequest {
  name: string; categoryId: string; batchTrackingPolicy: 'NONE' | 'REQUIRED';
  shelfLifeDays: number | null; version: number;
}
/** 物料服务端筛选条件。 */
export interface MaterialFilter {
  code?: string; keyword?: string; categoryId?: string; baseUomId?: string; status?: string;
}
/** 物料类别服务端筛选条件。 */
export interface CategoryFilter { parentId?: string; status?: string }

const categoryPath = (id?: string, suffix = '') => apiPath('mdm',
  `/material-categories${id ? `/${encodeURIComponent(id)}` : ''}${suffix}`);
const materialPath = (id?: string, suffix = '') => apiPath('mdm',
  `/materials${id ? `/${encodeURIComponent(id)}` : ''}${suffix}`);
export function searchMaterialCategories(
  pageNo: number, pageSize: number, params: CategoryFilter = {}, signal?: AbortSignal,
): Promise<PageResult<MaterialCategory>> {
  return httpClient.result({ path: categoryPath(undefined, '/search'),
    method: 'POST', body: { params, pageNo, pageSize }, signal });
}
export function getMaterialCategory(id: string, signal?: AbortSignal): Promise<MaterialCategory> {
  return httpClient.result({ path: categoryPath(id), signal });
}
export function createMaterialCategory(request: CreateMaterialCategoryRequest): Promise<MaterialCategory> {
  return httpClient.result({ path: categoryPath(), method: 'POST', body: request });
}
export function updateMaterialCategory(id: string, request: UpdateMaterialCategoryRequest): Promise<MaterialCategory> {
  return httpClient.result({ path: categoryPath(id), method: 'PUT', body: request });
}
export function setMaterialCategoryEnabled(id: string, enabled: boolean, version: number): Promise<MaterialCategory> {
  return httpClient.result({ path: apiPath('mdm', `/material-categories/${enabled ? 'enable' : 'disable'}/${encodeURIComponent(id)}`),
    method: 'PATCH', body: { version } });
}
export function searchMaterials(
  pageNo: number, pageSize: number, params: MaterialFilter = {}, signal?: AbortSignal,
): Promise<PageResult<Material>> {
  return httpClient.result({ path: materialPath(undefined, '/search'),
    method: 'POST', body: { params, pageNo, pageSize }, signal });
}
export function getMaterial(id: string, signal?: AbortSignal): Promise<Material> {
  return httpClient.result({ path: materialPath(id), signal });
}
export function createMaterial(request: CreateMaterialRequest): Promise<Material> {
  return httpClient.result({ path: materialPath(), method: 'POST', body: request });
}
export function updateMaterial(id: string, request: UpdateMaterialRequest): Promise<Material> {
  return httpClient.result({ path: materialPath(id), method: 'PUT', body: request });
}
export function setMaterialEnabled(id: string, enabled: boolean, version: number): Promise<Material> {
  return httpClient.result({ path: apiPath('mdm', `/materials/${enabled ? 'enable' : 'disable'}/${encodeURIComponent(id)}`),
    method: 'PATCH', body: { version } });
}
