import { describe, expect, it } from 'vitest';
import { mainNavigation, appRoutes } from '../../router/route-registry';
import { ROUTE_NAMES } from '../../router/route-names';
import { mdmRoutes } from './routes';

describe('MDM 路由/授权入口', () => {
  it('工厂管理出现在静态 Route Registry，读取权限控制导航', () => {
    expect(mdmRoutes[0]).toMatchObject({
      path: 'mdm/plants',
      name: ROUTE_NAMES.mdmPlants,
      meta: { module: 'mdm', requiresAuth: true, permissions: ['mdm:factory:read'] },
    });
    expect(appRoutes[0]?.children).toContain(mdmRoutes[0]);
    expect(mainNavigation.find(entry => entry.name === ROUTE_NAMES.mdmPlants)).toMatchObject({
      group: 'mdm', permissions: ['mdm:factory:read'],
    });
  });
});
