import { effectScope } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRolePermissionAssignment } from './use-role-permission-assignment';
import { getRole, getRolePermissions, replaceRolePermissions } from '../api/roles-api';
import { searchResources } from '../api/permission-resources-api';
import { searchPermissions, type PermissionResponse } from '../api/permissions-api';

vi.mock('../../auth', () => ({ hasAuthorities: () => true }));
vi.mock('../api/roles-api', () => ({ getRole: vi.fn(), getRolePermissions: vi.fn(), replaceRolePermissions: vi.fn() }));
vi.mock('../api/permission-resources-api', () => ({ searchResources: vi.fn() }));
vi.mock('../api/permissions-api', () => ({ searchPermissions: vi.fn() }));
const role = { id: 'r', code: 'OP', name: '操作员', description: null, enabled: true, version: 1, createdAt: '', updatedAt: '' };
const permission = (id: string, resourceId: string): PermissionResponse => ({ id, resourceId, resourceName: resourceId,
  domainCode: 'MDM', resourceCode: resourceId, actionCode: 'read', code: `mdm:${resourceId}:read`, name: id,
  description: null, enabled: true, version: 1, createdAt: '', updatedAt: '' });
const a = permission('a', 'material'); const b = permission('b', 'uom');

describe('角色整体权限草稿', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getRole).mockResolvedValue(role);
    vi.mocked(getRolePermissions).mockResolvedValue([a]);
    vi.mocked(searchResources).mockImplementation(async (pageNo, pageSize) => ({ records: pageNo === 1 ? [{
      id: 'material', domainCode: 'MDM', resourceCode: 'material', name: '物料', description: null,
      sortOrder: 0, enabled: true, version: 1, createdAt: '', updatedAt: '',
    }] : [], pageNo, pageSize, total: 100, totalPages: Math.ceil(100 / pageSize) }));
    vi.mocked(searchPermissions).mockResolvedValue({ records: [b], pageNo: 1, pageSize: 50, total: 1, totalPages: 1 });
    vi.mocked(replaceRolePermissions).mockResolvedValue([a, b]);
  });

  it('打开只读取一页资源，不循环扫描目录', async () => {
    const scope = effectScope(); const m = scope.run(useRolePermissionAssignment)!;
    await m.openFor(role);
    expect(searchResources).toHaveBeenCalledTimes(1);
    expect(m.selectedIds.value).toEqual(['a']);
    scope.stop();
  });

  it('短目录每页8项，切换页容量回首页且不丢已选草稿', async () => {
    const scope = effectScope(); const m = scope.run(useRolePermissionAssignment)!;
    await m.openFor(role);
    expect(searchResources).toHaveBeenLastCalledWith(1, 8, {}, expect.any(AbortSignal));
    expect(m.resourcePages.value).toBe(13);
    await m.loadResources(2);
    await m.setResourcePageSize(16);
    expect(m.resourcePage.value).toBe(1);
    expect(m.resourcePages.value).toBe(7);
    expect(searchResources).toHaveBeenLastCalledWith(1, 16, {}, expect.any(AbortSignal));
    expect(m.selectedIds.value).toEqual(['a']);
    scope.stop();
  });

  it('目录翻页保留当前资源上下文，选择资源清除跨资源搜索条件', async () => {
    const scope = effectScope(); const m = scope.run(useRolePermissionAssignment)!;
    await m.openFor(role);
    m.searchQuery.value = '单位';
    await m.setResource('material');
    expect(m.searchQuery.value).toBe('');
    expect(searchPermissions).toHaveBeenLastCalledWith(1, 50, expect.any(AbortSignal), {
      domainCode: 'MDM', resourceId: 'material', keyword: undefined,
    });
    await m.loadResources(2);
    expect(m.currentResource.value?.name).toBe('物料');
    await m.setResource('');
    expect(m.currentResource.value).toBeUndefined();
    expect(m.selectedIds.value).toEqual(['a']);
    scope.stop();
  });

  it('切换资源和目录分页保留完整草稿，一次整体保存', async () => {
    const scope = effectScope(); const m = scope.run(useRolePermissionAssignment)!;
    await m.openFor(role);
    await m.setResource('uom'); m.toggle(b);
    await m.loadResources(2);
    await m.setResource('material');
    expect(m.selectedIds.value).toEqual(['a', 'b']);
    await m.review(); expect(m.stage.value).toBe('review');
    await m.submit();
    expect(replaceRolePermissions).toHaveBeenCalledExactlyOnceWith('r', ['a', 'b']);
    expect(m.opened.value).toBe(false);
    scope.stop();
  });

  it('重开以服务端关系恢复勾选，不沿用已放弃草稿', async () => {
    const scope = effectScope(); const m = scope.run(useRolePermissionAssignment)!;
    await m.openFor(role); await m.setResource('uom'); m.toggle(b); m.close();
    await m.openFor(role);
    expect(m.selectedIds.value).toEqual(['a']); scope.stop();
  });

  it('服务端关系并发变化时阻止覆盖', async () => {
    const scope = effectScope(); const m = scope.run(useRolePermissionAssignment)!;
    await m.openFor(role); await m.setResource('uom'); m.toggle(b);
    vi.mocked(getRolePermissions).mockResolvedValue([]);
    await m.review(); await m.submit();
    expect(m.stage.value).toBe('stale'); expect(replaceRolePermissions).not.toHaveBeenCalled(); scope.stop();
  });

  it('写入结果未知后禁止重发并保留核对目标', async () => {
    const scope = effectScope(); const m = scope.run(useRolePermissionAssignment)!;
    await m.openFor(role); await m.setResource('uom'); m.toggle(b); await m.review();
    vi.mocked(replaceRolePermissions).mockRejectedValue(new Error('connection lost'));
    await m.submit(); await m.submit(); m.close(); await m.openFor({...role,id:'other'});
    expect(m.stage.value).toBe('unknown'); expect(m.target.value?.id).toBe('r');
    expect(replaceRolePermissions).toHaveBeenCalledTimes(1); scope.stop();
  });
});
