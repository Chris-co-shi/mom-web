import { describe, expect, it } from 'vitest';
import { appRoutes } from './route-registry';

describe('开发验收路由', () => {
  it('仅在 DEV 注册且无需登录', () => {
    const route = appRoutes.find((entry) => entry.name === 'dev-form-designer');
    if (import.meta.env.DEV) expect(route?.meta?.requiresAuth).toBe(false);
    else expect(route).toBeUndefined();
  });
});
