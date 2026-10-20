import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { codeRuleApi, codeRuleOwners, type CodeRuleView } from '../api/code-rule-api';
import { useCodeRuleManagement } from './use-code-rule-management';
import { ApiError } from '../../../shared/api/errors';
import type { CodeRuleDefinition, CodeSegmentCatalogEntry } from '../../../shared/form-designer/types';
vi.mock('../api/code-rule-api', async importOriginal => {
  const original = await importOriginal<typeof import('../api/code-rule-api')>();
  return { ...original, codeRuleApi: { catalog: vi.fn(), search: vi.fn(), detail: vi.fn(), create: vi.fn(), update: vi.fn(), revise: vi.fn(), enable: vi.fn(), disable: vi.fn() } };
});
const definition: CodeRuleDefinition = { schemaVersion: 1 as const, segments: [
  { id: 'prefix', type: 'LITERAL', params: { value: 'M-' } },
  { id: 'seq', type: 'SEQUENCE', params: { width: 4, step: 1 } },
] };
const catalog: CodeSegmentCatalogEntry[] = [
  { type: 'LITERAL', label: '服务端固定字符', description: '', catalogVersion: 1, parameterSchema: { schemaVersion: 1, fields: [{ id: 'value', name: 'value', type: 'TEXT', label: 'value' }] } },
  { type: 'SEQUENCE', label: '服务端流水号', description: '', catalogVersion: 1, parameterSchema: { schemaVersion: 1, fields: [{ id: 'width', name: 'width', type: 'NUMBER', label: 'width' }, { id: 'step', name: 'step', type: 'NUMBER', label: 'step' }] } },
];
const row = (id = 'revision-1', status: CodeRuleView['status'] = 'DRAFT'): CodeRuleView => ({ id, ruleId: 'rule-identity', ruleCode: 'material', usageScenario: '物料编码', description: null, revisionNo: 1, status, definition, ruleVersion: 3, createdAt: '2026-10-17T00:00:00Z', updatedAt: '2026-10-17T00:00:00Z' });
function setup(allowed: (authority: string) => boolean = () => true) {
  vi.mocked(codeRuleApi.catalog).mockResolvedValue(catalog);
  vi.mocked(codeRuleApi.search).mockResolvedValue({ records: [row()], pageNo: 1, pageSize: 20, total: 1, totalPages: 1 });
  vi.mocked(codeRuleApi.detail).mockResolvedValue(row());
  const owners = [...codeRuleOwners, { ...codeRuleOwners[0], id: 'test_owner', basePath: '/test_owner/code-rules', readAuthority: 'test_owner:rules:read', writeAuthority: 'test_owner:rules:write' }];
  let state!: ReturnType<typeof useCodeRuleManagement>;
  const wrapper = mount(defineComponent({ setup() { state = useCodeRuleManagement(owners, allowed); return {}; }, template: '<div />' }));
  return { state, wrapper, owners };
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }

describe('编码规则编辑生命周期与失败语义', () => {
  it('只有 WMS 规则权限时默认选择 WMS Owner', async () => {
    const { state, wrapper } = setup(authority => authority.startsWith('wms:'));
    await state.reload();
    expect(state.owner.value.id).toBe('wms');
    expect(state.owners.map(item => item.id)).toEqual(['wms']);
    expect(codeRuleApi.search).toHaveBeenLastCalledWith(codeRuleOwners[1], expect.anything(), expect.any(AbortSignal));
    wrapper.unmount();
  });
  it('使用场景必填、说明限长，纯元信息编辑也参与未保存保护', async () => {
    const { state, wrapper } = setup(); await state.reload(); await state.open(); state.ruleCode.value = 'metadata';
    const before = vi.mocked(codeRuleApi.create).mock.calls.length;
    await state.save(); expect(state.feedback.value?.key).toBe('system.coderules.invalidmetadata');
    state.usageScenario.value = '  物料主数据编码  '; state.description.value = '文'.repeat(1001);
    await state.save(); expect(vi.mocked(codeRuleApi.create).mock.calls.length).toBe(before);
    state.description.value = '  新增物料时使用  ';
    vi.mocked(codeRuleApi.create).mockResolvedValueOnce({ ...row(), usageScenario: '物料主数据编码', description: '新增物料时使用' });
    await state.save();
    expect(codeRuleApi.create).toHaveBeenLastCalledWith(codeRuleOwners[0], { ruleCode: 'metadata', usageScenario: '物料主数据编码', description: '新增物料时使用', definition: { schemaVersion: 1, segments: [] } });
    expect(state.usageScenario.value).toBe('物料主数据编码'); expect(state.dirty.value).toBe(false);
    state.description.value = '尚未保存的说明';
    const closing = state.close(); expect(state.discardPending.value).toBe(true);
    state.resolveDiscard(false); await closing;
    expect(state.editorOpen.value).toBe(true); expect(state.description.value).toBe('尚未保存的说明');
    wrapper.unmount();
  });
  it('Owner 切换清理详情和过滤条件，所有请求与权限随接入清单切换', async () => {
    const { state, owners, wrapper } = setup();
    await state.reload(); await state.open(row());
    expect(state.definition.value).toEqual(definition);
    await state.changeOwner('test_owner');
    expect(state.target.value).toBeNull();
    expect(codeRuleApi.catalog).toHaveBeenLastCalledWith(owners[2], expect.any(AbortSignal));
    expect(codeRuleApi.search).toHaveBeenLastCalledWith(owners[2], expect.objectContaining({ params: {} }), expect.any(AbortSignal));
    expect(state.owner.value.readAuthority).toBe('test_owner:rules:read');
    wrapper.unmount();
  });
  it('保存完整 JSON，保持 ID、顺序、参数，使用修订 ID 和最新 ruleVersion', async () => {
    const { state, wrapper } = setup();
    await state.reload(); await state.open(row());
    state.definition.value = { schemaVersion: 1, segments: [...definition.segments].reverse() };
    vi.mocked(codeRuleApi.update).mockResolvedValue({ ...row(), definition: state.definition.value, ruleVersion: 4 });
    await state.save();
    expect(codeRuleApi.update).toHaveBeenCalledWith(codeRuleOwners[0], 'revision-1', { usageScenario: '物料编码', description: '', definition: { schemaVersion: 1, segments: [...definition.segments].reverse() }, ruleVersion: 3 });
    expect(state.target.value?.ruleVersion).toBe(4);
    expect(state.dirty.value).toBe(false); wrapper.unmount();
  });
  it('未保存切换须明确丢弃，取消时保留 Owner、目标与 definition', async () => {
    const { state, wrapper } = setup(); await state.reload(); await state.open(row());
    state.definition.value = { schemaVersion: 1, segments: [] };
    const change = state.changeOwner('test_owner');
    expect(state.discardPending.value).toBe(true);
    state.resolveDiscard(false); await change;
    expect(state.owner.value.id).toBe('mdm'); expect(state.dirty.value).toBe(true);
    const close = state.close(); state.resolveDiscard(true); await close;
    expect(state.editorOpen.value).toBe(false); wrapper.unmount();
  });
  it.each(['conflict', 'timeout'] as const)('%s 阻止重复写入，保留草稿并要求重读，不自动重试', async kind => {
    const { state, wrapper } = setup(); await state.reload(); await state.open(row());
    vi.mocked(codeRuleApi.update).mockRejectedValueOnce(new ApiError('failed', { kind, code: 'failed', status: kind === 'conflict' ? 409 : undefined, resultUnknown: kind === 'timeout' }));
    const before = vi.mocked(codeRuleApi.update).mock.calls.length;
    await state.save(); await state.save();
    expect(vi.mocked(codeRuleApi.update).mock.calls.length).toBe(before + 1);
    expect(state.writeBlocked.value).toBe(true);
    expect(state.feedback.value?.key).toBe(kind === 'conflict' ? 'system.feedback.conflict' : 'system.feedback.unknown');
    expect(state.definition.value).toEqual(definition); wrapper.unmount();
  });
  it('只读与无权限不会发起写入；已发布版本不可保存 definition', async () => {
    const { state, wrapper } = setup(authority => authority.endsWith(':read'));
    await state.reload(); await state.open(row()); const before = vi.mocked(codeRuleApi.update).mock.calls.length;
    await state.save(); expect(vi.mocked(codeRuleApi.update).mock.calls.length).toBe(before);
    expect(state.canWrite.value).toBe(false); wrapper.unmount();
    const denied = setup(() => false); const reads = vi.mocked(codeRuleApi.search).mock.calls.length;
    await denied.state.reload(); expect(vi.mocked(codeRuleApi.search).mock.calls.length).toBe(reads); denied.wrapper.unmount();
  });
  it('缺失 Handler/Provider 的历史仍可查看且完全保留 JSON', async () => {
    const { state, wrapper } = setup(); await state.reload();
    const historical = { ...row(), definition: { schemaVersion: 1 as const, segments: [{ id: 'old-field', type: 'BUSINESS_FIELD', params: { fieldKey: 'removed.provider' } }] } };
    vi.mocked(codeRuleApi.detail).mockResolvedValueOnce(historical);
    await state.open(historical);
    expect(state.definition.value).toEqual(historical.definition);
    expect(state.unsupported.value).toEqual(['old-field']); expect(state.editable.value).toBe(false); wrapper.unmount();
  });
  it('Catalog 失败、空目录和非法 Schema 均保留详情读取并阻止编辑', async () => {
    const { state, wrapper } = setup();
    vi.mocked(codeRuleApi.catalog).mockRejectedValueOnce(new ApiError('offline', { kind: 'network', code: 'offline' }));
    await state.reload(); await state.open(row());
    expect(state.catalogError.value?.key).toBe('system.feedback.failed');
    expect(state.definition.value).toEqual(definition); expect(state.editable.value).toBe(false);
    vi.mocked(codeRuleApi.catalog).mockResolvedValueOnce([]); await state.loadCatalog();
    expect(state.catalogReady.value).toBe(false);
    vi.mocked(codeRuleApi.catalog).mockResolvedValueOnce([{ ...catalog[0], parameterSchema: { schemaVersion: 1, fields: [{ id: 'bad', name: 'bad', type: 'REMOVED', label: 'bad' }] } }]);
    await state.loadCatalog(); expect(state.catalogError.value?.key).toBe('system.coderules.cataloginvalid');
    wrapper.unmount();
  });
  it('已移除 Provider 选项可识别，历史定义不会被重建或清空', async () => {
    const { state, wrapper } = setup();
    vi.mocked(codeRuleApi.catalog).mockResolvedValueOnce([...catalog, { type: 'BUSINESS_FIELD', label: '字段', description: '', catalogVersion: 1, parameterSchema: { schemaVersion: 1, fields: [{ id: 'key', name: 'fieldKey', type: 'SELECT', label: '字段', options: [{ value: 'other.provider', label: '其他字段' }] }] } }]);
    await state.reload();
    const historical: CodeRuleView = { ...row(), definition: { schemaVersion: 1, segments: [{ id: 'historical', type: 'BUSINESS_FIELD', params: { fieldKey: 'removed.provider' } }] } };
    vi.mocked(codeRuleApi.detail).mockResolvedValueOnce(historical); await state.open(historical);
    expect(state.unsupported.value).toEqual(['historical']); expect(state.definition.value).toEqual(historical.definition);
    wrapper.unmount();
  });
  it('保存期间不能编辑，避免响应覆盖提交后的键盘输入', async () => {
    const { state, wrapper } = setup(); await state.reload(); await state.open(row());
    const pending = deferred<CodeRuleView>(); vi.mocked(codeRuleApi.update).mockReturnValueOnce(pending.promise);
    const save = state.save(); expect(state.editable.value).toBe(false); pending.resolve(row()); await save;
    expect(state.editable.value).toBe(true); wrapper.unmount();
  });
  it.each(['protocol', 'server'] as const)('%s 响应不能证明写入失败，阻止重放并要求核对', async kind => {
    const { state, wrapper } = setup(); await state.reload(); await state.open(row());
    vi.mocked(codeRuleApi.update).mockRejectedValueOnce(new ApiError('bad response', { kind, status: kind === 'server' ? 500 : 200, code: 'bad_response' }));
    const count = vi.mocked(codeRuleApi.update).mock.calls.length; await state.save(); await state.save();
    expect(state.writeBlocked.value).toBe(true); expect(state.feedback.value?.key).toBe('system.feedback.unknown');
    expect(vi.mocked(codeRuleApi.update).mock.calls.length).toBe(count + 1); wrapper.unmount();
  });
  it('参数错误允许修正后提交，403 禁止重放，重复点击不会产生第二次写入', async () => {
    const { state, wrapper } = setup(); await state.reload(); await state.open(row());
    vi.mocked(codeRuleApi.update).mockRejectedValueOnce(new ApiError('bad parameter', { kind: 'validation', status: 400, code: 'code_rule.parameter_invalid' }));
    await state.save(); expect(state.feedback.value?.key).toBe('system.feedback.invalid'); expect(state.writeBlocked.value).toBe(false);
    const pending = deferred<CodeRuleView>(); vi.mocked(codeRuleApi.update).mockReturnValueOnce(pending.promise);
    const before = vi.mocked(codeRuleApi.update).mock.calls.length; const first = state.save(); await state.save();
    expect(vi.mocked(codeRuleApi.update).mock.calls.length).toBe(before + 1); pending.resolve(row()); await first;
    vi.mocked(codeRuleApi.update).mockRejectedValueOnce(new ApiError('forbidden', { kind: 'forbidden', status: 403, code: 'forbidden' }));
    await state.save(); expect(state.feedback.value?.key).toBe('system.feedback.forbidden'); expect(state.writeBlocked.value).toBe(true);
    wrapper.unmount();
  });
  it('未知创建结果按原 Owner 和规则编码核对，已有同编码规则仍不足以证明原操作', async () => {
    const { state, wrapper } = setup(); await state.reload(); await state.open(); state.ruleCode.value = 'material'; state.usageScenario.value = '物料编码';
    vi.mocked(codeRuleApi.create).mockRejectedValueOnce(new ApiError('offline', { kind: 'network', resultUnknown: true, code: 'offline' }));
    await state.save(); expect(state.writeBlocked.value).toBe(true);
    vi.mocked(codeRuleApi.search).mockResolvedValueOnce({ records: [], pageNo: 1, pageSize: 20, total: 0, totalPages: 0 });
    let read = state.reconcile(); state.resolveDiscard(true); await read;
    expect(state.writeBlocked.value).toBe(true);
    read = state.reconcile(); state.resolveDiscard(true); await read;
    expect(state.target.value).toBeNull(); expect(state.writeBlocked.value).toBe(true);
    expect(state.feedback.value?.key).toBe('system.feedback.unknown'); wrapper.unmount();
  });
  it('已发布和停用版本无法更新 definition，详情失败不能误创建新规则', async () => {
    const { state, wrapper } = setup(); await state.reload();
    for (const status of ['ENABLED', 'DISABLED'] as const) {
      vi.mocked(codeRuleApi.detail).mockResolvedValueOnce(row('published', status)); await state.open(row('published'));
      expect(state.editable.value).toBe(false); const before = vi.mocked(codeRuleApi.update).mock.calls.length;
      await state.save(); expect(vi.mocked(codeRuleApi.update).mock.calls.length).toBe(before);
    }
    vi.mocked(codeRuleApi.detail).mockRejectedValueOnce(new ApiError('offline', { kind: 'network', code: 'offline' }));
    await state.open(row()); expect(state.writeBlocked.value).toBe(true); expect(state.editable.value).toBe(false);
    wrapper.unmount();
  });
  it('过期详情和 Owner 请求不能覆盖新的状态', async () => {
    const { state, wrapper } = setup(); await state.reload();
    const first = deferred<CodeRuleView>(); vi.mocked(codeRuleApi.detail).mockReturnValueOnce(first.promise);
    const old = state.open(row('old')); await state.open(row('new'));
    first.resolve(row('old')); await old;
    expect(state.target.value?.id).toBe('revision-1');
    const pending = deferred<CodeSegmentCatalogEntry[]>(); vi.mocked(codeRuleApi.catalog).mockReturnValueOnce(pending.promise);
    const reload = state.reload(); await state.changeOwner('test_owner'); pending.resolve([]); await reload;
    expect(state.catalog.value).toEqual(catalog); wrapper.unmount();
  });
  it('修订、发布与停用只发出一次显式动作；历史搜索按 ruleCode 查询', async () => {
    const { state, wrapper } = setup(); await state.reload();
    vi.mocked(codeRuleApi.detail).mockResolvedValue(row('enabled', 'ENABLED')); await state.open(row('enabled'));
    vi.mocked(codeRuleApi.revise).mockResolvedValue({ ...row('rev2'), revisionNo: 2 });
    await state.act('revise'); expect(codeRuleApi.revise).toHaveBeenCalledWith(codeRuleOwners[0], 'enabled', 3);
    vi.mocked(codeRuleApi.enable).mockResolvedValue(row('rev2', 'ENABLED')); await state.act('enable');
    expect(codeRuleApi.enable).toHaveBeenCalledWith(codeRuleOwners[0], 'rev2', 3);
    vi.mocked(codeRuleApi.disable).mockResolvedValue(row('rev2', 'DISABLED')); await state.act('disable');
    expect(codeRuleApi.disable).toHaveBeenCalledWith(codeRuleOwners[0], 'rev2', 3);
    await state.showHistory(row()); expect(codeRuleApi.search).toHaveBeenLastCalledWith(codeRuleOwners[0], expect.objectContaining({ params: { ruleCode: 'material' } }), expect.any(AbortSignal));
    wrapper.unmount();
  });
});
