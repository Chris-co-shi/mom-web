import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setHttpRequestContextProvider } from '../../../shared/api/http-client';
import * as users from './users-api';

describe('用户 API 契约', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ code: '0', message: 'ok', data: null }), { headers: { 'Content-Type': 'application/json' } })));
    vi.stubGlobal('fetch', fetchMock);
    setHttpRequestContextProvider(() => ({ accessToken: 'test-token', locale: 'zh-CN' }));
  });

  it('只发送真实分页字段且沿用当前统一 URL', async () => {
    await users.searchUsers(2, 20);
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/auth/users/search');
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ params: {}, pageNo: 2, pageSize: 20 });
    expect(fetchMock.mock.calls[0]![1].method).toBe('POST');
  });

  it('ID 不转数字，路径编码，读请求接受取消信号', async () => {
    const controller = new AbortController();
    await users.getUser('2106626945701810177/a', controller.signal);
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/auth/users/2106626945701810177%2Fa');
    expect(new Headers(fetchMock.mock.calls[0]![1].headers).get('Authorization')).toBe('Bearer test-token');
  });

  it('创建与管理员重置保持密码原文且不发送原密码', async () => {
    await users.createUser({ username: ' Name ', password: ' Password@123 ', displayName: 'Name', enabled: true });
    await users.resetUserPassword('123', ' NewPassword@123 ', 4);
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).password).toBe(' Password@123 ');
    expect(fetchMock.mock.calls[1]![0]).toBe('/api/auth/users/123/password');
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({ newPassword: ' NewPassword@123 ', version: 4 });
  });

  it('编辑/启停传递版本，删除无请求体', async () => {
    await users.updateUser('123', { displayName: 'New', enabled: false, version: 2 });
    await users.setUserEnabled('123', true, 3);
    await users.setUserEnabled('123', false, 4);
    await users.deleteUser('123');
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual(['/api/auth/users/123', '/api/auth/users/123/enable', '/api/auth/users/123/disable', '/api/auth/users/123']);
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({ version: 3 });
    expect(fetchMock.mock.calls[3]![1]).toMatchObject({ method: 'DELETE', body: undefined });
  });

  it('403 写失败只发送一次且保持可识别状态码', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ code: 'ACCESS_DENIED', message: 'forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } }));
    await expect(users.deleteUser('123')).rejects.toMatchObject({ kind: 'forbidden', status: 403 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
