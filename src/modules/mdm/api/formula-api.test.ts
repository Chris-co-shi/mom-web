import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setHttpRequestContextProvider } from '../../../shared/api/http-client';
import { createFormula, releaseFormulaRevision, searchFormulas, updateFormulaDraft } from './formula-api';

describe('Formula API 精确数量与版本契约', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset().mockImplementation(async () => new Response(JSON.stringify({ code: '0', message: 'ok', data: null }), {
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    setHttpRequestContextProvider(() => ({ accessToken: 'formula-token', locale: 'zh-CN' }));
  });

  it('搜索只使用 /mdm 前缀和分页对象', async () => {
    await searchFormulas(2, 20, { plantId: '2106626945701810177' });
    expect(fetchMock.mock.calls[0]![0]).toBe('/mdm/formulas/search');
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({
      pageNo: 2, pageSize: 20, params: { plantId: '2106626945701810177' },
    });
  });

  it('数量以 Decimal String 发出，发布只提交技术锁版本', async () => {
    await createFormula({ code: 'F-DMC', name: 'DMC 配方', plantId: '1', outputMaterialId: '2',
      baseBatchQuantity: '100.000000001', baseUomId: '3',
      items: [{ sequenceNo: 10, materialId: '4', quantity: '80.000000001', uomId: '3' }] });
    expect(fetchMock.mock.calls[0]![0]).toBe('/mdm/formulas');
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).baseBatchQuantity).toBe('100.000000001');
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).items[0].quantity).toBe('80.000000001');
    await updateFormulaDraft('5', 0, [{ sequenceNo: 10, materialId: '4', quantity: '81', uomId: '3' }]);
    expect(fetchMock.mock.calls[1]![0]).toBe('/mdm/formulas/revisions/5');
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body).lockVersion).toBe(0);
    await releaseFormulaRevision('5', 1);
    expect(fetchMock.mock.calls[2]![0]).toBe('/mdm/formulas/revisions/release/5');
    expect(JSON.parse(fetchMock.mock.calls[2]![1].body)).toEqual({ lockVersion: 1 });
  });
});
