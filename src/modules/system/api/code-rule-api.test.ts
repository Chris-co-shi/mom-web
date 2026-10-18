import { describe, expect, it, vi } from 'vitest';
import { httpClient } from '../../../shared/api/http-client';
import { codeRuleApi, codeRuleOwners } from './code-rule-api';
vi.mock('../../../shared/api/http-client', () => ({ httpClient: { result: vi.fn().mockResolvedValue({}) } }));

describe('编码规则真实 API 契约', () => {
  it('V1 只开放 MDM，所有动作使用 revision ID 和规则级版本', async () => {
    expect(codeRuleOwners.map(owner => owner.id)).toEqual(['mdm']);
    const owner = codeRuleOwners[0];
    const definition = { schemaVersion: 1 as const, segments: [{ id: 'seg_1', type: 'LITERAL', params: { value: 'M-' } }] };
    await codeRuleApi.catalog(owner);
    await codeRuleApi.search(owner, { params: { ruleCode: 'material', status: 'DRAFT' }, pageNo: 2, pageSize: 10 });
    await codeRuleApi.detail(owner, 'revision-id');
    await codeRuleApi.create(owner, { ruleCode: 'material', usageScenario: '物料编码', description: '物料创建', definition });
    await codeRuleApi.update(owner, 'revision-id', { usageScenario: '物料编码', description: '物料创建', definition, ruleVersion: 7 });
    await codeRuleApi.revise(owner, 'revision-id', 8);
    await codeRuleApi.enable(owner, 'revision-id', 9);
    await codeRuleApi.disable(owner, 'revision-id', 10);
    expect(vi.mocked(httpClient.result).mock.calls.map(([request]) => [request.path, request.method ?? 'GET', request.body])).toEqual([
      ['/mdm/code-rules/segments', 'GET', undefined],
      ['/mdm/code-rules/search', 'POST', { params: { ruleCode: 'material', status: 'DRAFT' }, pageNo: 2, pageSize: 10 }],
      ['/mdm/code-rules/revision-id', 'GET', undefined],
      ['/mdm/code-rules', 'POST', { ruleCode: 'material', usageScenario: '物料编码', description: '物料创建', definition }],
      ['/mdm/code-rules/revision-id', 'PUT', { usageScenario: '物料编码', description: '物料创建', definition, ruleVersion: 7 }],
      ['/mdm/code-rules/revision-id/revisions', 'POST', { ruleVersion: 8 }],
      ['/mdm/code-rules/revision-id/enable', 'POST', { ruleVersion: 9 }],
      ['/mdm/code-rules/revision-id/disable', 'POST', { ruleVersion: 10 }],
    ]);
  });
});
