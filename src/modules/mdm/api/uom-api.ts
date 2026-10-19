import { apiPath } from '../../../shared/api/config';
import type { PageResult } from '../../../shared/api/contracts';
import { httpClient } from '../../../shared/api/http-client';

/** UOM 主数据目录类型；三类目录共享分页查询入口。 */
export type UnitCatalogKind = 'dimensions' | 'uom-categories' | 'uoms';
/** 维度、单位类别或单位的统一列表行。 */
export interface UomRow {
  id: string; code: string; name: string; status: 'ENABLED' | 'DISABLED'; version: number;
  createdAt: string; updatedAt: string;
  dimensionId?: string; referenceUomId?: string;
  categoryId?: string; symbol?: string; referenceUnit?: boolean; ucumNotApplicableReason?: string | null;
  timeExponent?: number; lengthExponent?: number; massExponent?: number;
  electricCurrentExponent?: number; temperatureExponent?: number;
  amountExponent?: number; luminousIntensityExponent?: number;
}
/** 创建量纲请求；指数共同定义量纲维度。 */
export interface CreateDimensionRequest {
  code: string; name: string; status: UomRow['status'];
  timeExponent: number; lengthExponent: number; massExponent: number;
  electricCurrentExponent: number; temperatureExponent: number;
  amountExponent: number; luminousIntensityExponent: number;
}
/** 创建单位类别及其基准单位的原子请求。 */
export interface CreateUomCategoryRequest {
  code: string; name: string; dimensionId: string; status: UomRow['status'];
  referenceCode: string; referenceName: string; referenceSymbol: string;
  referenceUcumNotApplicableReason: string | null;
}
/** 创建单位及首版换算规则请求；Decimal 字段保持字符串。 */
export interface CreateUomRequest {
  code: string; name: string; symbol: string; categoryId: string; status: UomRow['status'];
  ucumNotApplicableReason: string | null;
  multiplier: string; offset: string; calculationPrecision: number; roundingMode: string;
}
/** 当前单位换算规则及其发布状态。 */
export interface UomRule {
  id: string; uomId: string; versionNo: number; algorithmType: 'AFFINE';
  multiplier: string; offset: string; calculationPrecision: number; roundingMode: string;
  status: 'ENABLED' | 'DISABLED'; lockVersion: number;
}
/** 发布下一版 AFFINE 换算规则的请求。 */
export interface PublishRuleRequest {
  expectedCurrentVersion: number;
  multiplier: string; offset: string; calculationPrecision: number; roundingMode: string;
}
function path(kind: UnitCatalogKind, id = '', suffix = ''): string {
  return apiPath('mdm', `/${kind}${id ? `/${encodeURIComponent(id)}` : ''}${suffix}`);
}
export function searchUomCatalog(
  kind: UnitCatalogKind, pageNo: number, pageSize: number,
  params: Readonly<Record<string, string | boolean>> = {}, signal?: AbortSignal,
): Promise<PageResult<UomRow>> {
  return httpClient.result({ path: path(kind, '', '/search'), method: 'POST',
    body: { params, pageNo, pageSize }, signal });
}
export function getUomCatalog(kind: UnitCatalogKind, id: string, signal?: AbortSignal): Promise<UomRow> {
  return httpClient.result({ path: path(kind, id), signal });
}
export function createDimension(request: CreateDimensionRequest): Promise<UomRow> {
  return httpClient.result({ path: path('dimensions'), method: 'POST', body: request });
}
/** UOM Category 与基准单位必须原子创建；客户端不可拆成两次 POST。 */
export function createUomCategory(request: CreateUomCategoryRequest): Promise<UomRow> {
  return httpClient.result({ path: path('uom-categories'), method: 'POST', body: request });
}
/** 新 UOM 和首版 AFFINE 规则一同提交。Decimal 不经过 Number 转换。 */
export function createUom(request: CreateUomRequest): Promise<UomRow> {
  return httpClient.result({ path: path('uoms'), method: 'POST', body: request });
}
export function updateUomCatalog(kind: UnitCatalogKind, id: string, name: string, version: number): Promise<UomRow> {
  return httpClient.result({ path: path(kind, id), method: 'PUT', body: { name, version } });
}
export function setUomCatalogEnabled(kind: UnitCatalogKind, id: string, enabled: boolean, version: number): Promise<UomRow> {
  return httpClient.result({ path: apiPath('mdm', `/${kind}/${enabled ? 'enable' : 'disable'}/${encodeURIComponent(id)}`),
    method: 'PATCH', body: { version } });
}
export function getCurrentUomRule(uomId: string): Promise<UomRule> {
  return httpClient.result({ path: path('uoms', uomId, '/conversion-rules/current') });
}
export function searchRules(uomId: string, pageNo: number, pageSize: number): Promise<PageResult<UomRule>> {
  return httpClient.result({ path: apiPath('mdm', '/uom-conversion-rules/search'),
    method: 'POST', body: { params: { uomId }, pageNo, pageSize } });
}
export function publishUomRule(uomId: string, request: PublishRuleRequest): Promise<UomRule> {
  return httpClient.result({ path: path('uoms', uomId, '/conversion-rules'),
    method: 'POST', body: request });
}
