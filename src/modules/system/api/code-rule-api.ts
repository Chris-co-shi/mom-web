import { httpClient } from '../../../shared/api/http-client';
import type { PageQuery, PageResult } from '../../../shared/api/contracts';
import type { CodeRuleDefinition, CodeSegmentCatalogEntry } from '../../../shared/form-designer/types';

/** 编码规则生命周期状态；修订和启停操作以 revisionId 为目标。 */
export type CodeRuleStatus = 'DRAFT' | 'ENABLED' | 'DISABLED';
/** Owner API 返回的编码规则修订视图。 */
export interface CodeRuleView {
  id: string; ruleId: string; ruleCode: string; usageScenario: string | null; description: string | null; revisionNo: number; status: CodeRuleStatus;
  definition: CodeRuleDefinition; ruleVersion: number; createdAt: string; updatedAt: string;
}
/** 编码规则列表筛选条件。 */
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
  /** 读取 Owner 声明的段目录，供设计器校验和展示。 */
  catalog: (owner: CodeRuleOwner, signal?: AbortSignal) =>
    httpClient.result<CodeSegmentCatalogEntry[]>({ path: `${owner.basePath}/segments`, signal }),
  /** 按 Owner 的服务端分页查询规则修订。 */
  search: (owner: CodeRuleOwner, body: PageQuery<CodeRuleFilters>, signal?: AbortSignal) =>
    httpClient.result<PageResult<CodeRuleView>>({ path: `${owner.basePath}/search`, method: 'POST', body, signal }),
  /** 读取指定修订的完整定义。 */
  detail: (owner: CodeRuleOwner, revisionId: string, signal?: AbortSignal) =>
    httpClient.result<CodeRuleView>({ path: revisionPath(owner, revisionId), signal }),
  /** 创建规则及其首个草稿修订。 */
  create: (owner: CodeRuleOwner, body: { ruleCode: string; usageScenario: string; description: string; definition: CodeRuleDefinition }) =>
    httpClient.result<CodeRuleView>({ path: owner.basePath, method: 'POST', body }),
  /** 使用修订版本更新草稿定义。 */
  update: (owner: CodeRuleOwner, revisionId: string, body: { usageScenario: string; description: string; definition: CodeRuleDefinition; ruleVersion: number }) =>
    httpClient.result<CodeRuleView>({ path: revisionPath(owner, revisionId), method: 'PUT', body }),
  /** 从当前修订建立下一份草稿修订。 */
  revise: (owner: CodeRuleOwner, revisionId: string, ruleVersion: number) =>
    httpClient.result<CodeRuleView>({ path: `${revisionPath(owner, revisionId)}/revisions`, method: 'POST', body: { ruleVersion } }),
  /** 发布当前草稿修订；最终有效性由 Owner 后端重验。 */
  enable: (owner: CodeRuleOwner, revisionId: string, ruleVersion: number) =>
    httpClient.result<CodeRuleView>({ path: `${revisionPath(owner, revisionId)}/enable`, method: 'POST', body: { ruleVersion } }),
  /** 停用当前已发布修订。 */
  disable: (owner: CodeRuleOwner, revisionId: string, ruleVersion: number) =>
    httpClient.result<CodeRuleView>({ path: `${revisionPath(owner, revisionId)}/disable`, method: 'POST', body: { ruleVersion } }),
};
