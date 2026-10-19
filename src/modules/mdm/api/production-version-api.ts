import { apiPath } from '../../../shared/api/config';
import type { PageResult } from '../../../shared/api/contracts';
import { httpClient } from '../../../shared/api/http-client';

/** 生产版本生命周期状态。 */
export type ProductionVersionStatus = 'DRAFT' | 'RELEASED' | 'OBSOLETE';
/** 生产版本当前视图，引用已选定的配方和工艺路线修订。 */
export interface ProductionVersion {
  id: string; code: string; name: string; businessVersion: string;
  plantId: string; outputMaterialId: string; formulaRevisionId: string; routingRevisionId: string;
  validFrom: string; validTo: string | null; status: ProductionVersionStatus; lockVersion: number;
  releasedAt: string | null; obsoleteAt: string | null; createdAt: string; updatedAt: string;
}
/** 生产版本可编辑字段。 */
export interface ProductionVersionDraft {
  name: string; businessVersion: string; plantId: string; outputMaterialId: string;
  formulaRevisionId: string; routingRevisionId: string; validFrom: string; validTo: string | null;
}
/** 新建生产版本请求。 */
export interface CreateProductionVersionRequest extends ProductionVersionDraft { code: string }
/** 生产版本服务端筛选条件。 */
export interface ProductionVersionFilter { plantId?: string; outputMaterialId?: string; status?: ProductionVersionStatus }

const path = (suffix = '') => apiPath('mdm', `/production-versions${suffix}`);
const id = (value: string) => encodeURIComponent(value);
export function searchProductionVersions(pageNo: number, pageSize: number, params: ProductionVersionFilter = {}, signal?: AbortSignal): Promise<PageResult<ProductionVersion>> {
  return httpClient.result({ path: path('/search'), method: 'POST', body: { params, pageNo, pageSize }, signal });
}
export function getProductionVersion(value: string, signal?: AbortSignal): Promise<ProductionVersion> {
  return httpClient.result({ path: path(`/${id(value)}`), signal });
}
export function createProductionVersion(request: CreateProductionVersionRequest): Promise<ProductionVersion> {
  return httpClient.result({ path: path(), method: 'POST', body: request });
}
export function updateProductionVersion(value: string, request: ProductionVersionDraft & { lockVersion: number }): Promise<ProductionVersion> {
  return httpClient.result({ path: path(`/${id(value)}`), method: 'PUT', body: request });
}
export function releaseProductionVersion(value: string, lockVersion: number): Promise<ProductionVersion> {
  return httpClient.result({ path: path(`/release/${id(value)}`), method: 'PATCH', body: { lockVersion } });
}
export function obsoleteProductionVersion(value: string, lockVersion: number): Promise<ProductionVersion> {
  return httpClient.result({ path: path(`/obsolete/${id(value)}`), method: 'PATCH', body: { lockVersion } });
}
