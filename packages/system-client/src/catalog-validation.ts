import type {
  CatalogApplicationCatalog,
  CatalogApplicationType,
  CatalogChannelCatalog,
  CatalogClientChannel,
  CatalogContract,
  CatalogI18nReference,
  CatalogNavigationItem,
  CatalogNavigationType,
  CatalogView,
} from './catalog-contracts.js';

const APPLICATION_TYPES = new Set<CatalogApplicationType>(['BUSINESS', 'PLATFORM']);
const CHANNELS = new Set<CatalogClientChannel>(['MOBILE', 'WEB']);
const NAVIGATION_TYPES = new Set<CatalogNavigationType>(['GROUP', 'ROUTE']);
const MAX_CATALOG_BYTES = 1024 * 1024;
const MAX_NAVIGATION_DEPTH = 4;
const MAX_NAVIGATION_NODES = 500;
const RFC_3339_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/u;
const STRONG_ETAG = /^"[^"\\\r\n]+"$/u;

export class CatalogValidationError extends TypeError {
  constructor(
    readonly code: string,
    readonly field: string,
  ) {
    super(`Catalog validation failed: ${code} at ${field}`);
    this.name = 'CatalogValidationError';
  }
}

/**
 * 将不可信 Catalog DTO 转换为只读表示，并以静态契约拒绝未知或可执行字段。
 */
export function parseCatalogView(value: unknown, contract: CatalogContract): CatalogView {
  assertPayloadSize(value);
  const input = exactRecord(
    value,
    ['applications', 'generatedAt', 'snapshotSchemaVersion'],
    'catalog',
  );
  const snapshotSchemaVersion = safeInteger(input.snapshotSchemaVersion, 'catalog.snapshotSchemaVersion');
  if (snapshotSchemaVersion !== contract.snapshotSchemaVersion) {
    fail('unsupported_snapshot_schema', 'catalog.snapshotSchemaVersion');
  }
  const applications = arrayValue(input.applications, 'catalog.applications');
  if (applications.length !== 1) fail('unexpected_application_count', 'catalog.applications');
  const application = parseApplication(applications[0], contract);
  return Object.freeze({
    applications: Object.freeze([application]),
    generatedAt: instant(input.generatedAt, 'catalog.generatedAt'),
    snapshotSchemaVersion,
  });
}

export function validateCatalogEtag(value: string | undefined): string {
  if (!value || !STRONG_ETAG.test(value)) fail('invalid_strong_etag', 'response.headers.etag');
  return value;
}

export function validateCatalogCacheControl(value: string | undefined): void {
  const directives = new Set(
    (value ?? '').toLowerCase().split(',').map((part) => part.trim()).filter(Boolean),
  );
  if (!directives.has('private') || !directives.has('no-cache')) {
    fail('invalid_cache_control', 'response.headers.cache-control');
  }
}

/**
 * `/api/iam/me` 的新鲜权限只能收紧 Catalog，不能把客户端白名单之外的节点变为可执行能力。
 */
export function filterCatalogByPermissions(
  catalog: CatalogView,
  permissions: ReadonlySet<string>,
): CatalogView {
  const application = catalog.applications[0];
  if (!application) fail('missing_application', 'catalog.applications');
  const channels = application.channels.map((channel) => Object.freeze({
    ...channel,
    navigation: Object.freeze(filterNavigation(channel.navigation, permissions)),
  }));
  return Object.freeze({
    ...catalog,
    applications: Object.freeze([
      Object.freeze({ ...application, channels: Object.freeze(channels) }),
    ]),
  });
}

function parseApplication(value: unknown, contract: CatalogContract): CatalogApplicationCatalog {
  const field = 'catalog.applications[0]';
  const input = exactRecord(value, [
    'applicationCode',
    'applicationType',
    'catalogVersion',
    'channels',
    'i18n',
    'iconKey',
    'routeContractVersion',
  ], field);
  if (input.applicationCode !== contract.applicationCode) fail('application_mismatch', `${field}.applicationCode`);
  const applicationType = enumValue(input.applicationType, APPLICATION_TYPES, `${field}.applicationType`);
  if (applicationType !== contract.applicationType) fail('application_type_mismatch', `${field}.applicationType`);
  const routeContractVersion = safeInteger(input.routeContractVersion, `${field}.routeContractVersion`);
  if (routeContractVersion !== contract.routeContractVersion) {
    fail('unsupported_route_contract', `${field}.routeContractVersion`);
  }
  const channelsInput = arrayValue(input.channels, `${field}.channels`);
  if (channelsInput.length !== contract.channels.length) fail('channel_count_mismatch', `${field}.channels`);
  const seenChannels = new Set<CatalogClientChannel>();
  const channels = channelsInput.map((channel, index) => {
    const parsed = parseChannel(channel, contract, `${field}.channels[${index}]`);
    if (seenChannels.has(parsed.clientChannel)) fail('duplicate_channel', `${field}.channels[${index}].clientChannel`);
    seenChannels.add(parsed.clientChannel);
    return parsed;
  });
  if (contract.channels.some((channel) => !seenChannels.has(channel))) fail('channel_mismatch', `${field}.channels`);
  return Object.freeze({
    applicationCode: contract.applicationCode,
    applicationType,
    catalogVersion: positiveInteger(input.catalogVersion, `${field}.catalogVersion`),
    channels: Object.freeze(channels),
    i18n: exactI18n(input.i18n, contract.applicationI18n, `${field}.i18n`),
    iconKey: exactString(input.iconKey, contract.applicationIconKey, `${field}.iconKey`),
    routeContractVersion,
  });
}

function parseChannel(
  value: unknown,
  contract: CatalogContract,
  field: string,
): CatalogChannelCatalog {
  const input = exactRecord(value, ['clientChannel', 'navigation'], field);
  const clientChannel = enumValue(input.clientChannel, CHANNELS, `${field}.clientChannel`);
  if (!contract.channels.includes(clientChannel)) fail('unsupported_channel', `${field}.clientChannel`);
  const navigationInput = arrayValue(input.navigation, `${field}.navigation`);
  const seenRouteKeys = new Set<string>();
  const counter = { value: 0 };
  const navigation = navigationInput.map((item, index) => parseNavigation(
    item,
    contract,
    null,
    1,
    `${field}.navigation[${index}]`,
    seenRouteKeys,
    counter,
  ));
  return Object.freeze({ clientChannel, navigation: Object.freeze(navigation) });
}

function parseNavigation(
  value: unknown,
  contract: CatalogContract,
  parentRouteKey: string | null,
  depth: number,
  field: string,
  seenRouteKeys: Set<string>,
  counter: { value: number },
): CatalogNavigationItem {
  if (depth > MAX_NAVIGATION_DEPTH) fail('navigation_too_deep', field);
  counter.value += 1;
  if (counter.value > MAX_NAVIGATION_NODES) fail('too_many_navigation_nodes', field);
  const input = exactRecord(value, [
    'children',
    'i18n',
    'iconKey',
    'keepAlive',
    'permissionCode',
    'routeKey',
    'type',
    'visibleInBreadcrumb',
    'visibleInMenu',
    'visibleInTab',
  ], field);
  const routeKey = nonEmptyString(input.routeKey, `${field}.routeKey`);
  if (seenRouteKeys.has(routeKey)) fail('duplicate_route_key', `${field}.routeKey`);
  seenRouteKeys.add(routeKey);
  const expected = contract.nodes[routeKey];
  if (!expected) fail('unknown_route_key', `${field}.routeKey`);
  if (expected.parentRouteKey !== parentRouteKey) fail('invalid_parent', `${field}.routeKey`);
  const type = enumValue(input.type, NAVIGATION_TYPES, `${field}.type`);
  if (type !== expected.type) fail('navigation_type_mismatch', `${field}.type`);
  const permissionCode = nullableString(input.permissionCode, `${field}.permissionCode`);
  if (permissionCode !== expected.permissionCode) fail('permission_mismatch', `${field}.permissionCode`);
  const childrenInput = arrayValue(input.children, `${field}.children`);
  if (type === 'ROUTE' && childrenInput.length > 0) fail('route_has_children', `${field}.children`);
  if (type === 'GROUP' && childrenInput.length === 0) fail('empty_group', `${field}.children`);
  const children = childrenInput.map((child, index) => parseNavigation(
    child,
    contract,
    routeKey,
    depth + 1,
    `${field}.children[${index}]`,
    seenRouteKeys,
    counter,
  ));
  return Object.freeze({
    children: Object.freeze(children),
    i18n: exactI18n(input.i18n, expected.i18n, `${field}.i18n`),
    iconKey: exactString(input.iconKey, expected.iconKey, `${field}.iconKey`),
    keepAlive: booleanValue(input.keepAlive, `${field}.keepAlive`),
    permissionCode,
    routeKey,
    type,
    visibleInBreadcrumb: booleanValue(input.visibleInBreadcrumb, `${field}.visibleInBreadcrumb`),
    visibleInMenu: booleanValue(input.visibleInMenu, `${field}.visibleInMenu`),
    visibleInTab: booleanValue(input.visibleInTab, `${field}.visibleInTab`),
  });
}

function filterNavigation(
  items: readonly CatalogNavigationItem[],
  permissions: ReadonlySet<string>,
): CatalogNavigationItem[] {
  const result: CatalogNavigationItem[] = [];
  for (const item of items) {
    if (item.type === 'ROUTE') {
      if (item.permissionCode && permissions.has(item.permissionCode)) result.push(item);
      continue;
    }
    const children = filterNavigation(item.children, permissions);
    if (children.length > 0) result.push(Object.freeze({ ...item, children: Object.freeze(children) }));
  }
  return result;
}

function exactI18n(value: unknown, expected: CatalogI18nReference, field: string): CatalogI18nReference {
  const input = exactRecord(value, ['messageKey', 'resourceCode'], field);
  return Object.freeze({
    messageKey: exactString(input.messageKey, expected.messageKey, `${field}.messageKey`),
    resourceCode: exactString(input.resourceCode, expected.resourceCode, `${field}.resourceCode`),
  });
}

function assertPayloadSize(value: unknown): void {
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  }
  catch {
    fail('unserializable_payload', 'catalog');
  }
  if (new TextEncoder().encode(serialized).byteLength > MAX_CATALOG_BYTES) {
    fail('payload_too_large', 'catalog');
  }
}

function exactRecord(value: unknown, keys: readonly string[], field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('expected_object', field);
  const input = value as Record<string, unknown>;
  const expected = new Set(keys);
  for (const key of Object.keys(input)) {
    if (!expected.has(key)) fail('unknown_field', `${field}.${key}`);
  }
  for (const key of keys) {
    if (!Object.hasOwn(input, key)) fail('missing_field', `${field}.${key}`);
  }
  return input;
}

function arrayValue(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) fail('expected_array', field);
  return value;
}

function enumValue<T extends string>(value: unknown, allowed: ReadonlySet<T>, field: string): T {
  if (typeof value !== 'string' || !allowed.has(value as T)) fail('unsupported_enum', field);
  return value as T;
}

function exactString(value: unknown, expected: string, field: string): string {
  const actual = nonEmptyString(value, field);
  if (actual !== expected) fail('value_mismatch', field);
  return actual;
}

function nullableString(value: unknown, field: string): string | null {
  return value === null ? null : nonEmptyString(value, field);
}

function nonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) fail('expected_non_empty_string', field);
  return value;
}

function booleanValue(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') fail('expected_boolean', field);
  return value;
}

function safeInteger(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) fail('expected_non_negative_integer', field);
  return Number(value);
}

function positiveInteger(value: unknown, field: string): number {
  const result = safeInteger(value, field);
  if (result === 0) fail('expected_positive_integer', field);
  return result;
}

function instant(value: unknown, field: string): string {
  const result = nonEmptyString(value, field);
  if (!RFC_3339_INSTANT.test(result) || Number.isNaN(Date.parse(result))) fail('invalid_instant', field);
  return result;
}

function fail(code: string, field: string): never {
  throw new CatalogValidationError(code, field);
}
