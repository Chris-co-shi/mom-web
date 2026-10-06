import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setHttpRequestContextProvider } from '../../../shared/api/http-client';
import * as roles from './roles-api';

describe('角色 API 契约', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ code: '0', message: 'ok', data: null }), { headers: { 'Content-Type': 'application/json' } })));
    vi.stubGlobal('fetch', fetchMock);
    setHttpRequestContextProvider(() => ({ accessToken: 'test-token', locale: 'zh-CN' }));
  });

  it('分页只发送后端支持的空 params 和页码', async () => {
    await roles.searchRoles(2, 20);
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/auth/roles/search');
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ params: {}, pageNo: 2, pageSize: 20 });
  });

  it('技术 ID 按字符串编码，读取通过统一认证请求层', async () => {
    await roles.getRole('2106626945701810177/a', new AbortController().signal);
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/auth/roles/2106626945701810177%2Fa');
    expect(new Headers(fetchMock.mock.calls[0]![1].headers).get('Authorization')).toBe('Bearer test-token');
  });

  it('创建、编辑与状态变更使用各自真实字段和乐观锁版本', async () => {
    await roles.createRole({ code: 'OPS', name: 'Operator', description: null, enabled: true });
    await roles.updateRole('123', { name: 'New', description: 'note', enabled: true, version: 2 });
    await roles.setRoleEnabled('123', false, 3);
    await roles.setRoleEnabled('123', true, 4);
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual(['/api/auth/roles', '/api/auth/roles/123', '/api/auth/roles/123/disable', '/api/auth/roles/123/enable']);
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ code: 'OPS', name: 'Operator', description: null, enabled: true });
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({ name: 'New', description: 'note', enabled: true, version: 2 });
    expect(JSON.parse(fetchMock.mock.calls[2]![1].body)).toEqual({ version: 3 });
  });

  it('删除不虚构 version 或请求体，失败不重放', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ code: 'ACCESS_DENIED', message: 'forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } }));
    await expect(roles.deleteRole('123')).rejects.toMatchObject({ kind: 'forbidden', status: 403 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({ method: 'DELETE', body: undefined });
  });

  it('角色赋权读取和整体替换使用 Gateway 契约与字符串 ID', async () => {
    await roles.getRolePermissions('123/a');
    await roles.replaceRolePermissions('123/a', ['101', '202']);
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual(['/api/auth/roles/123%2Fa/permissions', '/api/auth/roles/123%2Fa/permissions']);
    expect(fetchMock.mock.calls[0]![1].method).toBe('GET');
    expect(fetchMock.mock.calls[1]![1].method).toBe('PUT');
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({ permissionIds: ['101', '202'] });
  });
});
