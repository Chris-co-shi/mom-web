import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setHttpRequestContextProvider } from '../../../shared/api/http-client';
import { createUom, publishUomRule } from './uom-api';

describe('MDM UOM API 契约', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue(new Response(JSON.stringify({ code: '0', message: 'ok', data: null }), {
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    setHttpRequestContextProvider(() => ({ accessToken: 'mdm-test-token', locale: 'zh-CN' }));
  });

  it('换算倍率和偏移以十进制字符串无损提交', async () => {
    await createUom({ code: 'MICRO', name: '微单位', symbol: 'μ', categoryId: 'cat-1', status: 'ENABLED',
      ucumNotApplicableReason: null, multiplier: '0.000000000000000001', offset: '0', calculationPrecision: 30, roundingMode: 'HALF_UP' });
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body);
    expect(fetchMock.mock.calls[0]![0]).toBe('/mdm/uoms');
    expect(body.multiplier).toBe('0.000000000000000001');
    expect(body.offset).toBe('0');
    expect(typeof body.multiplier).toBe('string');
  });

  it('发布换算规则提交期望版本以检测并发修改', async () => {
    await publishUomRule('uom-1', { expectedCurrentVersion: 4, multiplier: '1.25', offset: '0', calculationPrecision: 18, roundingMode: 'HALF_UP' });
    expect(fetchMock.mock.calls[0]![0]).toBe('/mdm/uoms/uom-1/conversion-rules');
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({
      expectedCurrentVersion: 4, multiplier: '1.25', offset: '0', calculationPrecision: 18, roundingMode: 'HALF_UP',
    });
  });
});
