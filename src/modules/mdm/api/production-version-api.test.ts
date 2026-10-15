import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setHttpRequestContextProvider } from '../../../shared/api/http-client';
import { createProductionVersion, releaseProductionVersion, searchProductionVersions } from './production-version-api';

describe('ProductionVersion API 契约', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset().mockImplementation(async () => new Response(JSON.stringify({ code: '0', message: 'ok', data: null }), {
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    setHttpRequestContextProvider(() => ({ accessToken: 'pv-token', locale: 'zh-CN' }));
  });

  it('使用 /mdm 路由并保留半开日期范围和字符串 ID', async () => {
    await searchProductionVersions(1, 20, { status: 'RELEASED' });
    expect(fetchMock.mock.calls[0]![0]).toBe('/mdm/production-versions/search');
    await createProductionVersion({ code: 'PV-1', name: '版本', businessVersion: '1.0', plantId: '1',
      outputMaterialId: '2', formulaRevisionId: '3', routingRevisionId: '4',
      validFrom: '2026-01-01', validTo: null });
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toMatchObject({
      formulaRevisionId: '3', routingRevisionId: '4', validTo: null,
    });
    await releaseProductionVersion('5', 0);
    expect(fetchMock.mock.calls[2]![0]).toBe('/mdm/production-versions/release/5');
    expect(JSON.parse(fetchMock.mock.calls[2]![1].body)).toEqual({ lockVersion: 0 });
  });
});
