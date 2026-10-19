import { apiPath } from '../../../shared/api/config';
import type { PageResult } from '../../../shared/api/contracts';
import { httpClient } from '../../../shared/api/http-client';

/** 有序工序直接引用产线或工位，不把 WorkCenter 伪装为产线。 */
export interface RoutingStepInput {
  sequenceNo: number; operationCode: string; name: string;
  resourceType: 'PRODUCTION_LINE' | 'WORKSTATION'; resourceId: string;
}
/** 带持久化 ID 的工艺路线步骤。 */
export interface RoutingStep extends RoutingStepInput { id: string }
/** 工艺路线身份摘要。 */
export interface RoutingIdentity { id: string; code: string; name: string; plantId: string; createdAt: string; updatedAt: string }
/** 工艺路线修订及其乐观锁版本。 */
export interface RoutingRevision {
  id: string; routingId: string; revisionNo: number; status: 'DRAFT' | 'RELEASED' | 'OBSOLETE';
  lockVersion: number; releasedAt: string | null; obsoleteAt: string | null;
}
/** 工艺路线详情，包含身份、修订和有序步骤。 */
export interface RoutingDetail { routing: RoutingIdentity; revision: RoutingRevision; steps: RoutingStep[] }
/** 创建工艺路线请求；步骤顺序和资源类型由后端校验。 */
export interface CreateRoutingRequest { code: string; name: string; plantId: string; steps: RoutingStepInput[] }

const path = (suffix = '') => apiPath('mdm', `/routings${suffix}`);
const id = (value: string) => encodeURIComponent(value);
export function searchRoutings(pageNo: number, pageSize: number, params: { plantId?: string } = {}, signal?: AbortSignal): Promise<PageResult<RoutingIdentity>> {
  return httpClient.result({ path: path('/search'), method: 'POST', body: { params, pageNo, pageSize }, signal });
}
export function getRouting(value: string, signal?: AbortSignal): Promise<RoutingDetail> {
  return httpClient.result({ path: path(`/${id(value)}`), signal });
}
export function getRoutingRevision(value: string, signal?: AbortSignal): Promise<RoutingDetail> {
  return httpClient.result({ path: path(`/revisions/${id(value)}`), signal });
}
export function createRouting(request: CreateRoutingRequest): Promise<RoutingDetail> {
  return httpClient.result({ path: path(), method: 'POST', body: request });
}
export function updateRoutingDraft(value: string, lockVersion: number, steps: RoutingStepInput[]): Promise<RoutingDetail> {
  return httpClient.result({ path: path(`/revisions/${id(value)}`), method: 'PUT', body: { lockVersion, steps } });
}
export function nextRoutingRevision(value: string): Promise<RoutingDetail> {
  return httpClient.result({ path: path(`/revisions/next/${id(value)}`), method: 'POST' });
}
export function releaseRoutingRevision(value: string, lockVersion: number): Promise<RoutingDetail> {
  return httpClient.result({ path: path(`/revisions/release/${id(value)}`), method: 'PATCH', body: { lockVersion } });
}
export function obsoleteRoutingRevision(value: string, lockVersion: number): Promise<RoutingDetail> {
  return httpClient.result({ path: path(`/revisions/obsolete/${id(value)}`), method: 'PATCH', body: { lockVersion } });
}
