import { apiPath } from '../../../shared/api/config';
import type { PageResult } from '../../../shared/api/contracts';
import { httpClient } from '../../../shared/api/http-client';

/** 数量一律使用 Decimal String；number 会在浏览器端提前丢失精度。 */
export interface FormulaItemInput { sequenceNo: number; materialId: string; quantity: string; uomId: string }
export interface FormulaItem extends FormulaItemInput { id: string }
export interface FormulaIdentity {
  id: string; code: string; name: string; plantId: string; outputMaterialId: string;
  baseBatchQuantity: string; baseUomId: string; createdAt: string; updatedAt: string;
}
export interface FormulaRevision {
  id: string; formulaId: string; revisionNo: number; status: 'DRAFT' | 'RELEASED' | 'OBSOLETE';
  lockVersion: number; releasedAt: string | null; obsoleteAt: string | null;
}
export interface FormulaDetail { formula: FormulaIdentity; revision: FormulaRevision; items: FormulaItem[] }
export interface CreateFormulaRequest {
  code: string; name: string; plantId: string; outputMaterialId: string;
  baseBatchQuantity: string; baseUomId: string; items: FormulaItemInput[];
}
export interface FormulaFilter { plantId?: string; outputMaterialId?: string }

const path = (suffix = '') => apiPath('mdm', `/formulas${suffix}`);
const id = (value: string) => encodeURIComponent(value);

export function searchFormulas(pageNo: number, pageSize: number, params: FormulaFilter = {}, signal?: AbortSignal): Promise<PageResult<FormulaIdentity>> {
  return httpClient.result({ path: path('/search'), method: 'POST', body: { params, pageNo, pageSize }, signal });
}
export function getFormula(value: string, signal?: AbortSignal): Promise<FormulaDetail> {
  return httpClient.result({ path: path(`/${id(value)}`), signal });
}
export function getFormulaRevision(value: string, signal?: AbortSignal): Promise<FormulaDetail> {
  return httpClient.result({ path: path(`/revisions/${id(value)}`), signal });
}
export function createFormula(request: CreateFormulaRequest): Promise<FormulaDetail> {
  return httpClient.result({ path: path(), method: 'POST', body: request });
}
export function updateFormulaDraft(value: string, lockVersion: number, items: FormulaItemInput[]): Promise<FormulaDetail> {
  return httpClient.result({ path: path(`/revisions/${id(value)}`), method: 'PUT', body: { lockVersion, items } });
}
export function nextFormulaRevision(value: string): Promise<FormulaDetail> {
  return httpClient.result({ path: path(`/revisions/next/${id(value)}`), method: 'POST' });
}
export function releaseFormulaRevision(value: string, lockVersion: number): Promise<FormulaDetail> {
  return httpClient.result({ path: path(`/revisions/release/${id(value)}`), method: 'PATCH', body: { lockVersion } });
}
export function obsoleteFormulaRevision(value: string, lockVersion: number): Promise<FormulaDetail> {
  return httpClient.result({ path: path(`/revisions/obsolete/${id(value)}`), method: 'PATCH', body: { lockVersion } });
}
