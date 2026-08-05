export type {
  DynamicI18nSnapshot,
  PreferenceSource,
  PreferenceSources,
  ResolvedUserPreference,
  RuntimeIdentity,
  RuntimeSource,
  SaveUserPreference,
  SystemApplicationCode,
  SystemClientId,
  SystemDensity,
  SystemLocale,
  SystemRuntimePhase,
  SystemRuntimeSnapshot,
  SystemStorage,
  SystemThemeMode,
} from './contracts.js';
export type { SystemRuntime, SystemRuntimeOptions } from './runtime.js';
export { createSystemRuntime } from './runtime.js';
export type {
  CatalogApplicationCatalog,
  CatalogApplicationType,
  CatalogChannelCatalog,
  CatalogClientChannel,
  CatalogContract,
  CatalogI18nReference,
  CatalogNavigationItem,
  CatalogNavigationType,
  CatalogNodeContract,
  CatalogRuntimeIdentity,
  CatalogRuntimePhase,
  CatalogRuntimeSnapshot,
  CatalogView,
} from './catalog-contracts.js';
export type { CatalogRuntime, CatalogRuntimeOptions } from './catalog-runtime.js';
export { createCatalogRuntime } from './catalog-runtime.js';
export { CatalogValidationError } from './catalog-validation.js';

import type { ResolvedUserPreference } from './contracts.js';

export const DEFAULT_SYSTEM_PREFERENCE: ResolvedUserPreference = Object.freeze({
  locale: 'zh-CN',
  displayTimezone: 'UTC',
  themeMode: 'SYSTEM',
  density: 'COMFORTABLE',
  pageSize: 20,
  version: 0,
  persisted: false,
  updatedAt: null,
  sources: Object.freeze({
    locale: 'PLATFORM_DEFAULT',
    displayTimezone: 'PLATFORM_DEFAULT',
    themeMode: 'PLATFORM_DEFAULT',
    density: 'PLATFORM_DEFAULT',
    pageSize: 'PLATFORM_DEFAULT',
  }),
});
