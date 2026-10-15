import { apiPath } from '../../../shared/api/config';
import { httpClient } from '../../../shared/api/http-client';
export type GovernanceScope='ALL'|'ORGANIZATION'|'WAREHOUSE'|'MATERIAL_UOM'|'MANUFACTURING_DEFINITION';
export interface GovernanceIssue {issueType:string;resourceType:string;resourceId:string;businessCode:string|null;severity:'ERROR'|'WARNING';reasonCode:string;relatedResourceId:string|null}
export interface GovernanceReport {scope:GovernanceScope;checkedAt:string;issueCount:number;truncated:boolean;issues:GovernanceIssue[]}
/** POST 只触发只读扫描，不产生主数据写。 */
export function runConsistencyCheck(scope:GovernanceScope,signal?:AbortSignal):Promise<GovernanceReport>{
  return httpClient.result({path:apiPath('mdm','/governance/consistency-checks'),method:'POST',body:{scope},signal});
}
