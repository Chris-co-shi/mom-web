import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setHttpRequestContextProvider } from '../../../shared/api/http-client';
import { systemApi } from './system-api';

describe('System API 契约', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset().mockResolvedValue(new Response(JSON.stringify({ code: '0', message: 'ok', data: null }), {
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    setHttpRequestContextProvider(() => ({ accessToken: 'system-test-token', locale: 'zh-CN' }));
  });

  it('字典类型状态操作使用统一管理路径、字符串 ID 和版本条件', async () => {
    await systemApi.setDictionaryTypeStatus({
      id: '2106626945701810177', code: 'MATERIAL', name: '物料', enabled: true, description: null, version: 7, updatedAt: '',
    }, false);

    expect(fetchMock.mock.calls[0]![0]).toBe('/system/dictionary-types/change-status/2106626945701810177');
    expect(fetchMock.mock.calls[0]![1].method).toBe('PATCH');
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ enabled: false, version: 7 });
  });
});
