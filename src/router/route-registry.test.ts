import { describe, expect, it } from 'vitest';
import { appRoutes } from './route-registry';

describe('开发验收路由', () => {
  it('仅在 DEV 注册且无需登录', () => {
    const route = appRoutes.find((entry) => entry.name === 'dev-form-designer');
    if (import.meta.env.DEV) expect(route?.meta?.requiresAuth).toBe(false);
    else expect(route).toBeUndefined();
  });
});

describe('System 编码规则正式入口', () => {
  it('路由与菜单使用 MDM 读取权限及 System 文案 Owner', () => {
    const shell = appRoutes.find(entry => entry.path === '/');
    const route = shell?.children?.find(entry => entry.name === 'system-code-rules');
    expect(route?.path).toBe('system/code-rules');
    expect(route?.meta).toMatchObject({ requiresAuth: true, navigationGroup: 'system', permissions: ['mdm:code-rule:read', 'wms:code-rule:read'], permissionMode: 'any', i18nOwners: ['system'] });
  });
});
