import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setHttpRequestContextProvider } from '../../../shared/api/http-client';
import * as permissions from './permissions-api';

describe('权限 API 契约', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ code: '0', message: 'ok', data: null }), { headers: { 'Content-Type': 'application/json' } })));
    vi.stubGlobal('fetch', fetchMock);
    setHttpRequestContextProvider(() => ({ accessToken: 'test-token', locale: 'zh-CN' }));
  });

  it('分页向服务端发送域、资源、关键字和状态筛选', async () => {
    await permissions.searchPermissions(2, 20, undefined, { domainCode: 'AUTH', resourceId: '88', keyword: 'users', enabled: true });
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/auth/permissions/search');
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ params: { domainCode: 'AUTH', resourceId: '88', keyword: 'users', enabled: true }, pageNo: 2, pageSize: 20 });
  });

  it('技术 ID 按字符串编码，读取通过统一认证请求层', async () => {
    await permissions.getPermission('2106626945701810177/a', new AbortController().signal);
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/auth/permissions/2106626945701810177%2Fa');
    expect(new Headers(fetchMock.mock.calls[0]![1].headers).get('Authorization')).toBe('Bearer test-token');
  });

  it('创建、编辑与状态变更使用各自真实字段和乐观锁版本', async () => {
    await permissions.createPermission({ resourceId: '88', actionCode: 'READ', name: 'Operator', description: null, enabled: true });
    await permissions.updatePermission('123', { name: 'New', description: 'note', enabled: true, version: 2 });
    await permissions.setPermissionEnabled('123', false, 3);
    await permissions.setPermissionEnabled('123', true, 4);
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual(['/api/auth/permissions', '/api/auth/permissions/123', '/api/auth/permissions/123/disable', '/api/auth/permissions/123/enable']);
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ resourceId: '88', actionCode: 'READ', name: 'Operator', description: null, enabled: true });
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({ name: 'New', description: 'note', enabled: true, version: 2 });
    expect(JSON.parse(fetchMock.mock.calls[2]![1].body)).toEqual({ version: 3 });
  });

  it('删除不虚构 version 或请求体，失败不重放', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ code: 'ACCESS_DENIED', message: 'forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } }));
    await expect(permissions.deletePermission('123')).rejects.toMatchObject({ kind: 'forbidden', status: 403 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({ method: 'DELETE', body: undefined });
  });
});
