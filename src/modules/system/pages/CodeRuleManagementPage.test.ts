import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import CodeRuleManagementPage from './CodeRuleManagementPage.vue';
import CodeRuleDesigner from '../../../shared/form-designer/CodeRuleDesigner.vue';
import { codeRuleApi, type CodeRuleView } from '../api/code-rule-api';
import type { CodeRuleDefinition, CodeSegmentCatalogEntry } from '../../../shared/form-designer/types';

vi.mock('../../../shared/i18n/locale', () => ({ useLocale: () => ({ t: (key: string) => key, locale: 'zh-CN' }) }));
vi.mock('vue-router', () => ({ onBeforeRouteLeave: vi.fn() }));
vi.mock('../../auth', () => ({ hasAuthority: () => true, AuthorityGuard: { props: ['authorities'], template: '<slot />' } }));
vi.mock('../api/code-rule-api', async importOriginal => {
  const original = await importOriginal<typeof import('../api/code-rule-api')>();
  return { ...original, codeRuleApi: { catalog: vi.fn(), search: vi.fn(), detail: vi.fn(), create: vi.fn(), update: vi.fn(), revise: vi.fn(), enable: vi.fn(), disable: vi.fn() } };
});
const catalog: CodeSegmentCatalogEntry[] = [
  { type: 'LITERAL', label: '后端固定字符', description: '后端目录', catalogVersion: 1, parameterSchema: { schemaVersion: 1, fields: [{ id: 'value', name: 'value', label: '固定字符', type: 'TEXT', defaultValue: 'M-' }] } },
  { type: 'DATE', label: '后端日期', description: '', catalogVersion: 1, parameterSchema: { schemaVersion: 1, fields: [{ id: 'format', name: 'format', label: '日期', type: 'SELECT', options: [{ value: 'YYYYMMDD', label: 'YYYYMMDD' }], defaultValue: 'YYYYMMDD' }] } },
  { type: 'BUSINESS_FIELD', label: '后端业务字段', description: '', catalogVersion: 1, parameterSchema: { schemaVersion: 1, fields: [{ id: 'fieldKey', name: 'fieldKey', label: '业务字段', type: 'SELECT', options: [{ value: 'mdm.materialCategory.code', label: '物料分类' }], defaultValue: 'mdm.materialCategory.code' }] } },
  { type: 'SEQUENCE', label: '后端流水', description: '', catalogVersion: 1, parameterSchema: { schemaVersion: 1, fields: [{ id: 'width', name: 'width', label: '位数', type: 'NUMBER', defaultValue: 4 }, { id: 'step', name: 'step', label: '步长', type: 'NUMBER', defaultValue: 1, readonly: true }] } },
];
function row(definition: CodeRuleDefinition, status: CodeRuleView['status'] = 'DRAFT'): CodeRuleView {
  return { id: 'revision-123', ruleId: 'rule-456', ruleCode: 'material', usageScenario: '物料编码', description: null, revisionNo: 1, status, definition, ruleVersion: 0, createdAt: '2026-10-17T00:00:00Z', updatedAt: '2026-10-17T00:00:00Z' };
}
const modal = { props: ['open', 'title'], template: '<section v-if="open" role="dialog"><h2>{{ title }}</h2><slot /><slot name="footer" /></section>' };
async function setup() {
  vi.mocked(codeRuleApi.catalog).mockResolvedValue(catalog);
  vi.mocked(codeRuleApi.search).mockResolvedValue({ records: [], pageNo: 1, pageSize: 20, total: 0, totalPages: 0 });
  const wrapper = mount(CodeRuleManagementPage, { global: { stubs: { MomModal: modal } } });
  await flushPromises(); return wrapper;
}

describe('正式页面与现有设计器的连接', () => {
  it('后端 Catalog 驱动拖拽配置，保存、重读完整恢复 ID、顺序与参数', async () => {
    const wrapper = await setup();
    await wrapper.findAll('button').find(item => item.text() === 'system.coderules.create')!.trigger('click'); await flushPromises();
    await wrapper.get('input[maxlength="64"]').setValue('material');
    await wrapper.get('input[maxlength="120"]').setValue('物料编码');
    const designer = wrapper.getComponent(CodeRuleDesigner);
    expect(designer.props('catalog')).toEqual(catalog);
    expect(designer.find('[data-type="BUSINESS_FIELD"]').text()).toContain('后端业务字段');
    // 模拟拖拽库向画布插入 Catalog 项并发出 add，使用真实设计器的克隆处理。
    const [palette, canvas] = designer.findAllComponents({ name: 'VueDraggable' });
    const segment = palette.props('clone')(catalog[0]);
    canvas.vm.$emit('update:modelValue', [segment]); await flushPromises();
    canvas.vm.$emit('add', { newIndex: 0, clonedData: segment }); await flushPromises();
    for (const type of ['DATE', 'BUSINESS_FIELD', 'SEQUENCE']) await designer.get(`[data-type="${type}"]`).trigger('click');
    await flushPromises();
    const definition = designer.emitted('update:modelValue')!.at(-1)![0] as CodeRuleDefinition;
    expect(definition.segments.map(segment => segment.type)).toEqual(['LITERAL', 'DATE', 'BUSINESS_FIELD', 'SEQUENCE']);
    expect(new Set(definition.segments.map(segment => segment.id)).size).toBe(4);
    vi.mocked(codeRuleApi.create).mockResolvedValue(row(definition));
    await wrapper.findAll('button').find(item => item.text() === 'system.common.save')!.trigger('click'); await flushPromises();
    expect(codeRuleApi.create).toHaveBeenCalledWith(expect.objectContaining({ id: 'mdm' }), { ruleCode: 'material', usageScenario: '物料编码', description: '', definition });
    expect(wrapper.getComponent(CodeRuleDesigner).props('modelValue')).toEqual(definition);
    vi.mocked(codeRuleApi.detail).mockResolvedValue(row(definition));
    await wrapper.findAll('button').find(item => item.text() === 'system.common.close')!.trigger('click'); await flushPromises();
    // 服务端列表返回后通过修订 ID 重新打开，不能使用规则身份 ID。
    vi.mocked(codeRuleApi.search).mockResolvedValue({ records: [row(definition)], pageNo: 1, pageSize: 20, total: 1, totalPages: 1 });
    await wrapper.findAll('button').find(item => item.text() === 'system.common.refresh')!.trigger('click'); await flushPromises();
    await wrapper.findAll('button').find(item => item.text() === 'system.common.detail')!.trigger('click'); await flushPromises();
    expect(codeRuleApi.detail).toHaveBeenCalledWith(expect.objectContaining({ id: 'mdm' }), 'revision-123', expect.any(AbortSignal));
    expect(wrapper.getComponent(CodeRuleDesigner).props('modelValue')).toEqual(definition); wrapper.unmount();
  });
  it('创建时提交使用场景和描述，详情优先显示用途并保留规则编码', async () => {
    const wrapper = await setup();
    await wrapper.findAll('button').find(item => item.text() === 'system.coderules.create')!.trigger('click'); await flushPromises();
    await wrapper.get('input[maxlength="64"]').setValue('material');
    await wrapper.get('input[maxlength="120"]').setValue('物料主数据编码');
    await wrapper.get('textarea').setValue('新增物料时使用');
    const definition: CodeRuleDefinition = { schemaVersion: 1, segments: [] };
    vi.mocked(codeRuleApi.create).mockResolvedValue({ ...row(definition), usageScenario: '物料主数据编码', description: '新增物料时使用' });
    await wrapper.findAll('button').find(item => item.text() === 'system.common.save')!.trigger('click'); await flushPromises();
    expect(codeRuleApi.create).toHaveBeenLastCalledWith(expect.anything(), { ruleCode: 'material', usageScenario: '物料主数据编码', description: '新增物料时使用', definition });
    expect(wrapper.get('[role="dialog"]').text()).toContain('物料主数据编码');
    wrapper.unmount();
  });
  it('旧规则没有使用场景时明确提示，普通只读详情不伪造用途', async () => {
    const wrapper = await setup();
    const legacy = { ...row({ schemaVersion: 1, segments: [] }, 'ENABLED'), usageScenario: null, description: null };
    vi.mocked(codeRuleApi.search).mockResolvedValue({ records: [legacy], pageNo: 1, pageSize: 20, total: 1, totalPages: 1 });
    vi.mocked(codeRuleApi.detail).mockResolvedValue(legacy);
    await wrapper.findAll('button').find(item => item.text() === 'system.common.refresh')!.trigger('click'); await flushPromises();
    expect(wrapper.get('table').text()).toContain('system.coderules.missingscenario');
    expect(wrapper.get('table').text()).toContain('material');
    await wrapper.findAll('button').find(item => item.text() === 'system.common.detail')!.trigger('click'); await flushPromises();
    expect(wrapper.get('[role="dialog"]').text()).toContain('system.coderules.missingscenario');
    expect(wrapper.find('textarea').exists()).toBe(false); wrapper.unmount();
  });
  it('空 Catalog 不回退到本地示例目录，也不会出现创建入口的可用状态', async () => {
    const wrapper = await setup();
    vi.mocked(codeRuleApi.catalog).mockResolvedValue([]);
    await wrapper.findAll('button').find(item => item.text() === 'system.common.refresh')!.trigger('click'); await flushPromises();
    expect(wrapper.text()).toContain('system.coderules.catalogempty');
    expect(wrapper.findAll('button').find(item => item.text() === 'system.coderules.create')!.attributes('disabled')).toBeDefined();
    expect(wrapper.findComponent(CodeRuleDesigner).exists()).toBe(false); wrapper.unmount();
  });
  it('已发布详情用目录名称和参数选项展示配置，原始 JSON 默认收起，未知数据不丢失', async () => {
    const definition: CodeRuleDefinition = { schemaVersion: 1, segments: [
      { id: 'business-1', type: 'BUSINESS_FIELD', params: { fieldKey: 'mdm.materialCategory.code' } },
      { id: 'provider-removed', type: 'BUSINESS_FIELD', params: { fieldKey: 'mdm.retired.field' } },
      { id: 'retired-2', type: 'RETIRED', params: { legacy: '保留的历史配置' } },
    ] };
    const wrapper = await setup();
    const published = row(definition, 'ENABLED');
    vi.mocked(codeRuleApi.search).mockResolvedValue({ records: [published], pageNo: 1, pageSize: 20, total: 1, totalPages: 1 });
    vi.mocked(codeRuleApi.detail).mockResolvedValue(published);
    await wrapper.findAll('button').find(item => item.text() === 'system.common.refresh')!.trigger('click'); await flushPromises();
    await wrapper.findAll('button').find(item => item.text() === 'system.common.detail')!.trigger('click'); await flushPromises();
    const view = wrapper.get('[role="dialog"]').get('.code-rule-definition');
    expect(view.text()).toContain('后端业务字段');
    expect(view.text()).toContain('物料分类');
    expect(view.text()).toContain('保留的历史配置');
    expect(view.text()).toContain('mdm.retired.field');
    expect(view.text()).toContain('system.coderules.unknownoption');
    expect(view.text()).toContain('system.coderules.unknownsegment');
    expect(wrapper.get('details.code-rule-management__technical').attributes('open')).toBeUndefined();
    expect(JSON.parse(wrapper.get('.code-rule-management__json').text())).toEqual(definition);
    expect(wrapper.findComponent(CodeRuleDesigner).exists()).toBe(false);
    wrapper.unmount();
  });
  it('历史修订显示规则组成、隐藏普通查询栏并能返回原列表条件', async () => {
    const wrapper = await setup();
    const published = row({ schemaVersion: 1, segments: [{ id: 'prefix', type: 'LITERAL', params: { value: 'M-' } }] }, 'ENABLED');
    vi.mocked(codeRuleApi.search).mockResolvedValue({ records: [published], pageNo: 1, pageSize: 20, total: 1, totalPages: 1 });
    await wrapper.findAll('button').find(item => item.text() === 'system.common.refresh')!.trigger('click'); await flushPromises();
    expect(wrapper.find('.code-rule-management__filters').exists()).toBe(true);
    expect(wrapper.get('table').text()).toContain('后端固定字符');
    expect(wrapper.get('table').text()).not.toContain('system.common.version');
    await wrapper.findAll('button').find(item => item.text() === 'system.coderules.history')!.trigger('click'); await flushPromises();
    expect(wrapper.find('.code-rule-management__filters').exists()).toBe(false);
    expect(wrapper.text()).toContain('system.coderules.historyhint');
    await wrapper.findAll('button').find(item => item.text() === 'system.coderules.backtolist')!.trigger('click'); await flushPromises();
    expect(wrapper.find('.code-rule-management__filters').exists()).toBe(true);
    wrapper.unmount();
  });

});
