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
  it.each([
    ['mdmWorkshops', 'mdm/workshops', 'mdm:factory:read'],
    ['mdmProductionLines', 'mdm/production-lines', 'mdm:factory:read'],
    ['mdmWorkstations', 'mdm/workstations', 'mdm:factory:read'],
    ['mdmWarehouses', 'mdm/warehouses', 'mdm:warehouse:read'],
    ['mdmWarehouseAreas', 'mdm/warehouse-areas', 'mdm:warehouse:read'],
    ['mdmLocationTypes', 'mdm/location-types', 'mdm:location:read'],
    ['mdmLocations', 'mdm/locations', 'mdm:location:read'],
  ] as const)('将业务页面 %s 接入已有导航/路由，按读取权限可见', (routeName, path, authority) => {
    const route = mdmRoutes.find(item => item.name === ROUTE_NAMES[routeName]);
    expect(route).toMatchObject({ path, meta: { module: 'mdm', permissions: [authority], requiresAuth: true } });
    expect(mainNavigation.find(item => item.name === ROUTE_NAMES[routeName])).toBeDefined();
    expect(appRoutes[0]?.children).toContain(route);
  });
});
