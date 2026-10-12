import type { CatalogKind } from '../api/catalog-api';
import type { MessageKey } from '../../../locales/zh-CN';

export interface CatalogReference {
  field: 'plantId' | 'workshopId' | 'productionLineId' | 'warehouseId' | 'warehouseAreaId' | 'locationTypeId';
  labelKey: MessageKey;
  catalog: CatalogKind;
  required: boolean;
  /** 仅用于服务端支持的可选父级过滤字段；不会全量加载树。 */
  filterable?: boolean;
}

export interface StructureCatalog {
  kind: CatalogKind;
  labelKey: MessageKey;
  descriptionKey: MessageKey;
  permission: string;
  references: readonly CatalogReference[];
  childRoute?: { name: string; queryParam: string };
}

/** 只描述后端已存在的七种简单主数据；UOM / Material 使用独立业务页面，禁止普通 CRUD 泛化。 */
export const structureCatalogs = {
  workshops: {
    kind: 'workshops', labelKey: 'mdm.struct.workshops', descriptionKey: 'mdm.struct.factoryDescription',
    permission: 'mdm:factory', references: [
      { field: 'plantId', labelKey: 'mdm.struct.plant', catalog: 'plants', required: true, filterable: true },
    ],
    childRoute: { name: 'mdm-production-lines', queryParam: 'workshopId' },
  },
  'production-lines': {
    kind: 'production-lines', labelKey: 'mdm.struct.productionLines', descriptionKey: 'mdm.struct.factoryDescription',
    permission: 'mdm:factory', references: [
      { field: 'workshopId', labelKey: 'mdm.struct.workshop', catalog: 'workshops', required: true, filterable: true },
    ],
    childRoute: { name: 'mdm-workstations', queryParam: 'productionLineId' },
  },
  workstations: {
    kind: 'workstations', labelKey: 'mdm.struct.workstations', descriptionKey: 'mdm.struct.factoryDescription',
    permission: 'mdm:factory', references: [
      { field: 'productionLineId', labelKey: 'mdm.struct.productionLine', catalog: 'production-lines', required: true, filterable: true },
    ],
  },
  warehouses: {
    kind: 'warehouses', labelKey: 'mdm.struct.warehouses', descriptionKey: 'mdm.struct.warehouseDescription',
    permission: 'mdm:warehouse', references: [
      { field: 'plantId', labelKey: 'mdm.struct.plant', catalog: 'plants', required: true, filterable: true },
    ],
    childRoute: { name: 'mdm-warehouse-areas', queryParam: 'warehouseId' },
  },
  'warehouse-areas': {
    kind: 'warehouse-areas', labelKey: 'mdm.struct.warehouseAreas', descriptionKey: 'mdm.struct.warehouseDescription',
    permission: 'mdm:warehouse', references: [
      { field: 'warehouseId', labelKey: 'mdm.struct.warehouse', catalog: 'warehouses', required: true, filterable: true },
    ],
    childRoute: { name: 'mdm-locations', queryParam: 'warehouseAreaId' },
  },
  'location-types': {
    kind: 'location-types', labelKey: 'mdm.struct.locationTypes', descriptionKey: 'mdm.struct.typeDescription',
    permission: 'mdm:location', references: [],
  },
  locations: {
    kind: 'locations', labelKey: 'mdm.struct.locations', descriptionKey: 'mdm.struct.locationDescription',
    permission: 'mdm:location', references: [
      { field: 'plantId', labelKey: 'mdm.struct.plant', catalog: 'plants', required: true, filterable: true },
      { field: 'warehouseAreaId', labelKey: 'mdm.struct.warehouseArea', catalog: 'warehouse-areas', required: false, filterable: true },
      { field: 'locationTypeId', labelKey: 'mdm.struct.locationType', catalog: 'location-types', required: true },
    ],
  },
} satisfies Record<Exclude<CatalogKind, 'plants'>, StructureCatalog>;
