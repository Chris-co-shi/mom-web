import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setHttpRequestContextProvider } from '../../../shared/api/http-client';
import { createDimension, createUomCategory, createUom, publishUomRule, searchUomCatalog, searchRules } from './uom-api';

describe('MDM 计量单位 API 契约', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset().mockImplementation(() => new Response(JSON.stringify({ code: '0', message: 'ok', data: {
      records: [], pageNo: 1, pageSize: 20, total: 0, totalPages: 0,
    } }), { headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    setHttpRequestContextProvider(() => ({ accessToken: 'test-token', locale: 'zh-CN' }));
  });

  it('量纲创建必须携带七个整数维度', async () => {
    await createDimension({ code: 'MASS', name: '质量', status: 'ENABLED',
      timeExponent: 0, lengthExponent: 0, massExponent: 1,
      electricCurrentExponent: 0, temperatureExponent: 0, amountExponent: 0, luminousIntensityExponent: 0 });
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(Object.keys(body).filter(key => key.endsWith('Exponent'))).toHaveLength(7);
    expect(fetchMock.mock.calls[0]![0]).toBe('/mdm/dimensions');
  });

  it('创建类别原子提供基准单位', async () => {
    await createUomCategory({ code: 'MASS', name: '质量单位', dimensionId: '101', status: 'ENABLED',
      referenceCode: 'kg', referenceName: '千克', referenceSymbol: 'kg', referenceUcumNotApplicableReason: null });
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).referenceCode).toBe('kg');
    expect(fetchMock.mock.calls[0]![0]).toBe('/mdm/uom-categories');
  });

  it('乘数偏移保留 decimal 字符串而不是 JS Number', async () => {
    await createUom({ code: 'g', name: '克', symbol: 'g', categoryId: '101', status: 'ENABLED',
      ucumNotApplicableReason: null, multiplier: '0.001', offset: '0',
      calculationPrecision: 18, roundingMode: 'HALF_UP' });
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(body.multiplier).toBe('0.001');
    expect(typeof body.multiplier).toBe('string');
  });

  it('换算规则发布使用当前业务版本，而非乐观锁版本', async () => {
    await publishUomRule('102', { expectedCurrentVersion: 3, multiplier: '0.001',
      offset: '0', calculationPrecision: 20, roundingMode: 'HALF_EVEN' });
    expect(fetchMock.mock.calls[0]![0]).toBe('/mdm/uoms/102/conversion-rules');
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).expectedCurrentVersion).toBe(3);
    await searchRules('102', 1, 20);
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({
      params: { uomId: '102' }, pageNo: 1, pageSize: 20,
    });
  });
  it('分页过滤字段与 Controller 对齐', async () => {
    await searchUomCatalog('uoms', 2, 20, { categoryId: '101', status: 'ENABLED' });
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({
      params: { categoryId: '101', status: 'ENABLED' }, pageNo: 2, pageSize: 20,
    });
  });
});
