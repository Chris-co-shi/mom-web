import { httpClient } from '../../../shared/api/http-client';
import type { PageQuery, PageResult } from '../../../shared/api/contracts';
import type { CodeRuleDefinition, CodeSegmentCatalogEntry } from '../../../shared/form-designer/types';

export type CodeRuleStatus = 'DRAFT' | 'ENABLED' | 'DISABLED';
export interface CodeRuleView {
  id: string; ruleId: string; ruleCode: string; usageScenario: string | null; description: string | null; revisionNo: number; status: CodeRuleStatus;
  definition: CodeRuleDefinition; ruleVersion: number; createdAt: string; updatedAt: string;
}
export interface CodeRuleFilters { ruleCode?: string; status?: CodeRuleStatus | '' }
/** 受控接入清单，API 路径与权限来自代码配置，页面选择值不能构造任意服务地址。 */
export interface CodeRuleOwner {
  id: string; label: string; basePath: string; readAuthority: string; writeAuthority: string;
}
export const codeRuleOwners: readonly CodeRuleOwner[] = [
  { id: 'mdm', label: 'MDM', basePath: '/mdm/code-rules', readAuthority: 'mdm:code-rule:read', writeAuthority: 'mdm:code-rule:write' },
];
const revisionPath = (owner: CodeRuleOwner, revisionId: string) => `${owner.basePath}/${encodeURIComponent(revisionId)}`;

/** 通过 Gateway 使用 Owner 自有 API；写入不重试，ruleId 从不作为修订操作的目标。 */
export const codeRuleApi = {
  catalog: (owner: CodeRuleOwner, signal?: AbortSignal) =>
    httpClient.result<CodeSegmentCatalogEntry[]>({ path: `${owner.basePath}/segments`, signal }),
  search: (owner: CodeRuleOwner, body: PageQuery<CodeRuleFilters>, signal?: AbortSignal) =>
    httpClient.result<PageResult<CodeRuleView>>({ path: `${owner.basePath}/search`, method: 'POST', body, signal }),
  detail: (owner: CodeRuleOwner, revisionId: string, signal?: AbortSignal) =>
    httpClient.result<CodeRuleView>({ path: revisionPath(owner, revisionId), signal }),
  create: (owner: CodeRuleOwner, body: { ruleCode: string; usageScenario: string; description: string; definition: CodeRuleDefinition }) =>
    httpClient.result<CodeRuleView>({ path: owner.basePath, method: 'POST', body }),
  update: (owner: CodeRuleOwner, revisionId: string, body: { usageScenario: string; description: string; definition: CodeRuleDefinition; ruleVersion: number }) =>
    httpClient.result<CodeRuleView>({ path: revisionPath(owner, revisionId), method: 'PUT', body }),
  revise: (owner: CodeRuleOwner, revisionId: string, ruleVersion: number) =>
    httpClient.result<CodeRuleView>({ path: `${revisionPath(owner, revisionId)}/revisions`, method: 'POST', body: { ruleVersion } }),
  enable: (owner: CodeRuleOwner, revisionId: string, ruleVersion: number) =>
    httpClient.result<CodeRuleView>({ path: `${revisionPath(owner, revisionId)}/enable`, method: 'POST', body: { ruleVersion } }),
  disable: (owner: CodeRuleOwner, revisionId: string, ruleVersion: number) =>
    httpClient.result<CodeRuleView>({ path: `${revisionPath(owner, revisionId)}/disable`, method: 'POST', body: { ruleVersion } }),
};
