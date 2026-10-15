import { apiPath } from '../../../shared/api/config';
import type { PageResult } from '../../../shared/api/contracts';
import { httpClient } from '../../../shared/api/http-client';

export interface InspectionCharacteristic { id:string; code:string; name:string; defaultUomId:string; defaultUomVersion:number; enabled:boolean; version:number }
export interface InspectionMethod { id:string; code:string; name:string; description:string|null; enabled:boolean; version:number }
export interface QualitySpecification { id:string; code:string; name:string; plantId:string; materialId:string; inspectionUsage:'INCOMING'; latestRevisionNo:number; latestStatus:RevisionStatus }
export type RevisionStatus = 'DRAFT'|'RELEASED'|'OBSOLETE';
export interface SpecificationItemInput { sequenceNo:number; characteristicId:string; methodId:string; uomId:string; lowerLimit:string|null; targetValue:string|null; upperLimit:string|null; mandatory:boolean }
export interface SpecificationItem extends SpecificationItemInput { id:string; characteristicVersion:number; methodVersion:number; uomVersion:number }
export interface SpecificationDetail extends Omit<QualitySpecification,'latestRevisionNo'|'latestStatus'> {
  plantVersion:number; materialRevisionNo:number; materialVersion:number; revisionId:string; revisionNo:number;
  status:RevisionStatus; lockVersion:number; releasedAt:string|null; obsoleteAt:string|null; items:SpecificationItem[];
}
const path = (root:string,suffix='') => apiPath('qms',`/${root}${suffix}`);
const id = (value:string) => encodeURIComponent(value);
export function searchCharacteristics(pageNo:number,pageSize:number,enabled?:boolean,signal?:AbortSignal):Promise<PageResult<InspectionCharacteristic>> {
  return httpClient.result({path:path('inspection-characteristics','/search'),method:'POST',body:{params:{enabled},pageNo,pageSize},signal});
}
export function createCharacteristic(body:{code:string;name:string;defaultUomId:string}):Promise<InspectionCharacteristic> {
  return httpClient.result({path:path('inspection-characteristics'),method:'POST',body});
}
export function updateCharacteristic(value:string,body:{name:string;defaultUomId:string;enabled:boolean;version:number}):Promise<InspectionCharacteristic> {
  return httpClient.result({path:path('inspection-characteristics',`/${id(value)}`),method:'PUT',body});
}
export function searchMethods(pageNo:number,pageSize:number,enabled?:boolean,signal?:AbortSignal):Promise<PageResult<InspectionMethod>> {
  return httpClient.result({path:path('inspection-methods','/search'),method:'POST',body:{params:{enabled},pageNo,pageSize},signal});
}
export function createMethod(body:{code:string;name:string;description:string|null}):Promise<InspectionMethod> {
  return httpClient.result({path:path('inspection-methods'),method:'POST',body});
}
export function updateMethod(value:string,body:{name:string;description:string|null;enabled:boolean;version:number}):Promise<InspectionMethod> {
  return httpClient.result({path:path('inspection-methods',`/${id(value)}`),method:'PUT',body});
}
export function searchSpecifications(pageNo:number,pageSize:number,params:{plantId?:string;materialId?:string}={},signal?:AbortSignal):Promise<PageResult<QualitySpecification>> {
  return httpClient.result({path:path('quality-specifications','/search'),method:'POST',body:{params,pageNo,pageSize},signal});
}
export function getSpecification(value:string,signal?:AbortSignal):Promise<SpecificationDetail> {
  return httpClient.result({path:path('quality-specifications',`/${id(value)}`),signal});
}
export function createSpecification(body:{code:string;name:string;plantId:string;materialId:string;items:SpecificationItemInput[]}):Promise<SpecificationDetail> {
  return httpClient.result({path:path('quality-specifications'),method:'POST',body});
}
export function updateSpecificationDraft(revisionId:string,lockVersion:number,items:SpecificationItemInput[]):Promise<SpecificationDetail> {
  return httpClient.result({path:path('quality-specifications',`/revisions/${id(revisionId)}`),method:'PUT',body:{lockVersion,items}});
}
export function nextSpecificationRevision(specificationId:string):Promise<SpecificationDetail> {
  return httpClient.result({path:path('quality-specifications',`/revisions/next/${id(specificationId)}`),method:'POST'});
}
export function releaseSpecificationRevision(revisionId:string,lockVersion:number):Promise<SpecificationDetail> {
  return httpClient.result({path:path('quality-specifications',`/revisions/release/${id(revisionId)}`),method:'PATCH',body:{lockVersion}});
}
export function obsoleteSpecificationRevision(revisionId:string,lockVersion:number):Promise<SpecificationDetail> {
  return httpClient.result({path:path('quality-specifications',`/revisions/obsolete/${id(revisionId)}`),method:'PATCH',body:{lockVersion}});
}
