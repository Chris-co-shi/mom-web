import { describe, expect, it } from 'vitest';

import {
  accessibleTaskNavigation,
  ADMIN_ROUTE_CONTRACT_VERSION,
  ADMIN_TASK_DOMAINS,
  ADMIN_TASKS,
  findAdminTask,
  firstAccessibleTaskPath,
} from '../../apps/mom-admin/src/router/registry';

describe('Admin 静态任务注册表', () => {
  it('冻结六个任务、两个任务域与可执行组件白名单', () => {
    expect(ADMIN_ROUTE_CONTRACT_VERSION).toBe(1);
    expect(ADMIN_TASK_DOMAINS.map(({ key }) => key)).toEqual([
      'people-access',
      'security-operations',
    ]);
    expect(ADMIN_TASKS.map(({ path }) => path)).toEqual([
      '/iam/users',
      '/iam/roles',
      '/iam/permissions',
      '/iam/clients',
      '/iam/sessions',
      '/iam/audit',
    ]);
    expect(new Set(ADMIN_TASKS.map(({ routeKey }) => routeKey))).toHaveLength(6);
    expect(ADMIN_TASKS.every(({ component }) => typeof component === 'function')).toBe(true);
  });

  it('Permission 只过滤任务，不生成域、名称、顺序或路径', () => {
    const allowed = new Set(['iam:user:read', 'iam:audit:read']);
    const navigation = accessibleTaskNavigation((permission) =>
      allowed.has(permission),
    );

    expect(navigation.map(({ domain, tasks }) => ({
      domain: domain.key,
      tasks: tasks.map(({ name, path }) => ({ name, path })),
    }))).toEqual([
      {
        domain: 'people-access',
        tasks: [{ name: 'IamUsers', path: '/iam/users' }],
      },
      {
        domain: 'security-operations',
        tasks: [{ name: 'IamAudit', path: '/iam/audit' }],
      },
    ]);
    expect(firstAccessibleTaskPath((permission) => allowed.has(permission))).toBe('/iam/users');
  });

  it('当前路由只能解析到本地已知任务', () => {
    expect(findAdminTask({ name: 'IamRoles', path: '/unknown' })?.section).toBe('roles');
    expect(findAdminTask({ path: '/iam/sessions' })?.name).toBe('IamSessions');
    expect(findAdminTask({ name: 'RemoteTask', path: '/remote' })).toBeUndefined();
  });
});
