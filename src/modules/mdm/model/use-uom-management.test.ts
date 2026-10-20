import { effectScope } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../shared/api/errors';
import { searchUomCatalog, publishUomRule, type UomRow, type UomRule } from '../api/uom-api';
import { useUomManagement } from './use-uom-management';

vi.mock('../../auth', () => ({ hasAuthority: () => true }));
vi.mock('../../../shared/i18n/locale', () => ({ useLocale: () => ({ t: (key: string) => key }) }));
vi.mock('../api/uom-api', async importOriginal => ({
  ...await importOriginal<typeof import('../api/uom-api')>(),
  searchUomCatalog: vi.fn(),
  publishUomRule: vi.fn(),
}));

const row = (id: string): UomRow => ({
  id, code: id, name: id, status: 'ENABLED', version: 1,
  createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z',
});
const rule: UomRule = {
  id: 'rule-1', uomId: 'uom-1', versionNo: 4, algorithmType: 'AFFINE',
  multiplier: '1', offset: '0', calculationPrecision: 18, roundingMode: 'HALF_UP',
  status: 'ENABLED', lockVersion: 1,
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
function setup() {
  const scope = effectScope();
  const state = scope.run(useUomManagement)!;
  return { state, dispose: () => scope.stop() };
}

describe('UOM 页面流程', () => {
  beforeEach(() => vi.clearAllMocks());

  it('较旧分页响应不能覆盖后发请求', async () => {
    const first = deferred<Awaited<ReturnType<typeof searchUomCatalog>>>();
    vi.mocked(searchUomCatalog)
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce({ records: [row('new')], pageNo: 2, pageSize: 20, total: 21, totalPages: 2 });
    const { state, dispose } = setup();
    const earlier = state.loadList(1);
    await state.loadList(2);
    first.resolve({ records: [row('old')], pageNo: 1, pageSize: 20, total: 1, totalPages: 1 });
    await earlier;
    expect(state.rows.value.map(item => item.id)).toEqual(['new']);
    expect(state.pageNo.value).toBe(2);
    dispose();
  });

  it('规则发布结果未知时保留草稿、阻止重复写入并保持 Decimal String', async () => {
    vi.mocked(publishUomRule).mockRejectedValueOnce(new ApiError('timeout', {
      kind: 'timeout', code: 'timeout', resultUnknown: true,
    }));
    const { state, dispose } = setup();
    state.ruleTarget.value = row('uom-1');
    state.ruleCurrent.value = rule;
    state.ruleForm.multiplier = '0.000000000000000001';
    await state.publish();
    await state.publish();
    expect(publishUomRule).toHaveBeenCalledTimes(1);
    expect(publishUomRule).toHaveBeenCalledWith('uom-1', expect.objectContaining({
      expectedCurrentVersion: 4, multiplier: '0.000000000000000001',
    }));
    expect(state.ruleForm.multiplier).toBe('0.000000000000000001');
    expect(state.ruleBlocked.value).toBe(true);
    expect(state.ruleUnknown.value).toBe(true);
    state.ruleOpen.value = true;
    state.closeRule();
    await state.loadRule(row('uom-1'));
    expect(state.ruleOpen.value).toBe(true);
    expect(state.ruleForm.multiplier).toBe('0.000000000000000001');
    expect(state.ruleBlocked.value).toBe(true);
    dispose();
  });
});
