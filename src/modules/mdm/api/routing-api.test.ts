import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setHttpRequestContextProvider } from '../../../shared/api/http-client';
import { createRouting, releaseRoutingRevision, searchRoutings } from './routing-api';

describe('Routing API 边界', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset().mockImplementation(async () => new Response(JSON.stringify({ code: '0', message: 'ok', data: null }), {
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    setHttpRequestContextProvider(() => ({ accessToken: 'route-token', locale: 'zh-CN' }));
  });

  it('使用 /mdm 路由并保留字符串资源 ID', async () => {
    await searchRoutings(1, 20, { plantId: '2106626945701810177' });
    expect(fetchMock.mock.calls[0]![0]).toBe('/mdm/routings/search');
    await createRouting({ code: 'R-DMC', name: '配液', plantId: '2106626945701810177',
      steps: [{ sequenceNo: 10, operationCode: 'MIX', name: '混合', resourceType: 'PRODUCTION_LINE',
        resourceId: '2106626945701810178' }] });
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body).steps[0].resourceId).toBe('2106626945701810178');
    await releaseRoutingRevision('2106626945701810179', 0);
    expect(fetchMock.mock.calls[2]![0]).toBe('/mdm/routings/revisions/release/2106626945701810179');
    expect(JSON.parse(fetchMock.mock.calls[2]![1].body)).toEqual({ lockVersion: 0 });
  });
});
