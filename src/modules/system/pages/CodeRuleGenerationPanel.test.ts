import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import CodeRuleGenerationPanel from './CodeRuleGenerationPanel.vue';
import { codeRuleApi, codeRuleOwners, type CodeRuleView } from '../api/code-rule-api';
import { ApiError } from '../../../shared/api/errors';

vi.mock('../../../shared/i18n/locale', () => ({ useLocale: () => ({ t: (key: string) => key }) }));
vi.mock('../api/code-rule-api', async importOriginal => {
  const original = await importOriginal<typeof import('../api/code-rule-api')>();
  return { ...original, codeRuleApi: { ...original.codeRuleApi, generationFields: vi.fn(), generate: vi.fn() } };
});

const rule: CodeRuleView = {
  id: 'revision', ruleId: 'rule', ruleCode: 'material', usageScenario: '物料', description: null,
  revisionNo: 2, status: 'ENABLED', ruleVersion: 3, createdAt: '2026-03-04T00:00:00Z', updatedAt: '2026-03-04T00:00:00Z',
  definition: { schemaVersion: 1, segments: [
    { id: 'field', type: 'BUSINESS_FIELD', params: { fieldKey: 'mdm.materialCategory.code' } },
    { id: 'serial', type: 'SEQUENCE', params: { width: 4, step: 1 } },
  ] },
};

describe('正式发号验证区', () => {
  it('结果未知时锁定上下文并用同一请求键重试', async () => {
    vi.mocked(codeRuleApi.generationFields).mockResolvedValue([
      { fieldKey: 'mdm.materialCategory.code', label: '物料分类', description: '', requiredContextKeys: ['materialCategoryId'] },
    ]);
    vi.mocked(codeRuleApi.generate)
      .mockRejectedValueOnce(new ApiError('timeout', { kind: 'timeout', code: 'timeout', resultUnknown: true }))
      .mockResolvedValueOnce({ ruleCode: 'material', revisionId: 'revision', revisionNo: 2, code: 'M-0001' });
    const wrapper = mount(CodeRuleGenerationPanel, { props: { owner: codeRuleOwners[0], rule } });
    await flushPromises();
    await wrapper.get('input').setValue('category-1');
    await wrapper.get('button').trigger('click'); await flushPromises();
    expect(wrapper.text()).toContain('system.feedback.unknown');
    expect(wrapper.get('input').attributes('disabled')).toBeDefined();
    await wrapper.get('button').trigger('click'); await flushPromises();
    expect(vi.mocked(codeRuleApi.generate).mock.calls[0][1]).toEqual(vi.mocked(codeRuleApi.generate).mock.calls[1][1]);
    expect(wrapper.text()).toContain('M-0001');
    wrapper.unmount();
  });
});
