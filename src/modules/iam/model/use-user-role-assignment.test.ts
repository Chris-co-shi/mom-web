import { effectScope } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUserRoleAssignment } from './use-user-role-assignment';
import { getUser, getUserRoles, replaceUserRoles } from '../api/users-api';
import { searchRoles } from '../api/roles-api';

vi.mock('../../auth', () => ({ hasAuthorities: () => true, hasAuthority: () => true }));
vi.mock('../api/users-api', () => ({ getUser: vi.fn(), getUserRoles: vi.fn(), replaceUserRoles: vi.fn() }));
vi.mock('../api/roles-api', () => ({ searchRoles: vi.fn() }));

const user = { id: 'u-1', username: 'operator', displayName: '操作员', enabled: true, version: 1, createdAt: '', updatedAt: '' };
const role = (id: string, enabled = true) => ({ id, code: `ROLE_${id}`, name: `角色 ${id}`, description: null, enabled,
  version: 1, createdAt: '', updatedAt: '' });

describe('用户角色分配草稿', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getUser).mockResolvedValue(user);
    vi.mocked(getUserRoles).mockResolvedValue([role('existing')]);
    vi.mocked(searchRoles).mockImplementation(async (pageNo, pageSize) => ({
      records: pageNo === 1 ? [role('existing'), role('new')] : [role('later')],
      pageNo, pageSize, total: 3, totalPages: 2,
    }));
    vi.mocked(replaceUserRoles).mockResolvedValue([role('existing'), role('new'), role('later')]);
  });

  it('跨页保留选择，保存时整体替换角色 ID', async () => {
    const scope = effectScope();
    const assignment = scope.run(useUserRoleAssignment)!;
    await assignment.openFor(user);
    assignment.toggle(role('new'));
    await assignment.loadPage(2);
    assignment.toggle(role('later'));
    expect(assignment.selectedIds.value).toEqual(['existing', 'new', 'later']);
    await assignment.submit();
    expect(replaceUserRoles).toHaveBeenCalledExactlyOnceWith('u-1', ['existing', 'new', 'later'], 1);
    expect(assignment.opened.value).toBe(false);
    scope.stop();
  });

  it('写入结果未知时禁止重复提交，必须重新读取关系核对', async () => {
    const scope = effectScope();
    const assignment = scope.run(useUserRoleAssignment)!;
    await assignment.openFor(user);
    assignment.toggle(role('new'));
    vi.mocked(replaceUserRoles).mockRejectedValue(new Error('connection lost'));
    await assignment.submit();
    await assignment.submit();
    expect(replaceUserRoles).toHaveBeenCalledTimes(1);
    expect(assignment.stage.value).toBe('unknown');
    scope.stop();
  });

  it('未知结果即使读到目标关系也保留草稿和阻断，因为关系集合无法证明原请求提交', async () => {
    const scope = effectScope();
    const assignment = scope.run(useUserRoleAssignment)!;
    await assignment.openFor(user);
    assignment.toggle(role('new'));
    vi.mocked(replaceUserRoles).mockRejectedValueOnce(new Error('response lost'));
    await assignment.submit();
    await assignment.reloadLatest();
    expect(assignment.stage.value).toBe('unknown');
    expect(assignment.selectedIds.value).toEqual(['existing', 'new']);
    vi.mocked(getUserRoles).mockResolvedValueOnce([role('existing'), role('new')]);
    await assignment.reloadLatest();
    expect(assignment.stage.value).toBe('unknown');
    expect(assignment.selectedIds.value).toEqual(['existing', 'new']);
    expect(assignment.canSubmit.value).toBe(false);
    scope.stop();
  });

  it('初始关系读取失败时不能用空关系覆盖，必须重新读取后才允许保存', async () => {
    const scope = effectScope();
    const assignment = scope.run(useUserRoleAssignment)!;
    vi.mocked(getUserRoles).mockRejectedValueOnce(new Error('read failed'));
    await assignment.openFor(user);
    assignment.toggle(role('new'));
    expect(assignment.canSubmit.value).toBe(false);
    await assignment.retry();
    expect(assignment.selectedIds.value).toEqual(['existing']);
    expect(assignment.canSubmit.value).toBe(false);
    scope.stop();
  });
});
