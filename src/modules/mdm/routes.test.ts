import { describe, expect, it } from 'vitest';
import { mainNavigation } from '../../router/route-registry';
import { ROUTE_NAMES } from '../../router/route-names';

describe('MDM 三级导航路由契约', () => {
  it('将现有真实页面归入稳定的二级业务板块', () => {
    expect(mainNavigation.find((item) => item.name === ROUTE_NAMES.mdmPlants)).toMatchObject({
      group: 'mdm',
      section: 'organization-resources',
      sectionTitleKey: 'navigation.mdmOrganizationResources',
      sectionOrder: 10,
    });
    expect(mainNavigation.find((item) => item.name === ROUTE_NAMES.mdmUom)).toMatchObject({
      group: 'mdm',
      section: 'material-uom',
      sectionTitleKey: 'navigation.mdmMaterialUom',
      sectionOrder: 20,
    });
    expect(mainNavigation.find((item) => item.name === ROUTE_NAMES.mdmLocations)).toMatchObject({
      group: 'mdm',
      section: 'warehouse-logistics',
      sectionTitleKey: 'navigation.mdmWarehouseLogistics',
      sectionOrder: 40,
    });
    expect(mainNavigation.find((item) => item.name === ROUTE_NAMES.mdmFormulas)).toMatchObject({
      section: 'manufacturing-definition',
      permissions: ['mdm:manufacturing-definition:read'],
    });
    expect(mainNavigation.find((item) => item.name === ROUTE_NAMES.mdmRoutings)).toMatchObject({
      section: 'manufacturing-definition',
      permissions: ['mdm:manufacturing-definition:read'],
    });
    expect(mainNavigation.find((item) => item.name === ROUTE_NAMES.mdmProductionVersions)).toMatchObject({
      section: 'manufacturing-definition', permissions: ['mdm:manufacturing-definition:read'],
    });
    expect(mainNavigation.find((item) => item.name === ROUTE_NAMES.qmsQualitySpecifications)).toMatchObject({
      group: 'mdm', section: 'quality-definition', permissions: ['qms:quality-definition:read'],
    });
    expect(mainNavigation.find((item) => item.name === ROUTE_NAMES.mdmGovernanceChecks)).toMatchObject({
      group: 'mdm', section: 'governance', permissions: ['mdm:governance:read'],
    });
  });

  it('未注册真实页面的板块不会伪装成可用导航', () => {
    const renderedSections = new Set(
      mainNavigation.filter((item) => item.group === 'mdm').map((item) => item.section),
    );

    expect(renderedSections).toEqual(new Set([
      'organization-resources',
      'material-uom',
      'manufacturing-definition',
      'warehouse-logistics',
      'quality-definition',
      'governance',
    ]));
  });
});
