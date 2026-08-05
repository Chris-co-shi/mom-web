export type SystemApplicationCode = 'customer-portal' | 'mom-admin' | 'supplier-portal';
export type SystemClientId = 'mom-admin-web' | 'mom-customer-web' | 'mom-supplier-web';
export type SystemLocale = 'en-US' | 'zh-CN';
export type SystemThemeMode = 'DARK' | 'LIGHT' | 'SYSTEM';
export type SystemDensity = 'COMFORTABLE' | 'COMPACT';
export type PreferenceSource = 'PLATFORM_DEFAULT' | 'USER';

export interface PreferenceSources {
  locale: PreferenceSource;
  displayTimezone: PreferenceSource;
  themeMode: PreferenceSource;
  density: PreferenceSource;
  pageSize: PreferenceSource;
}

export interface ResolvedUserPreference {
  locale: SystemLocale;
  displayTimezone: string;
  themeMode: SystemThemeMode;
  density: SystemDensity;
  pageSize: 10 | 20 | 50 | 100;
  version: number;
  persisted: boolean;
  updatedAt: string | null;
  sources: PreferenceSources;
}

export interface SaveUserPreference {
  locale: SystemLocale | null;
  displayTimezone: string | null;
  themeMode: SystemThemeMode | null;
  density: SystemDensity | null;
  pageSize: 10 | 20 | 50 | 100 | null;
  version: number;
}

export interface DynamicI18nSnapshot {
  applicationCode: SystemApplicationCode;
  resourceCode: string;
  requestedLocale: SystemLocale;
  defaultLocale: SystemLocale;
  releaseVersion: number;
  checksum: string;
  fallbackCount: number;
  publishedAt: string;
  messages: Readonly<Record<string, string>>;
}

export interface RuntimeIdentity {
  userId: string;
}

export type RuntimeSource = 'CACHE' | 'REMOTE' | 'STATIC';
export type SystemRuntimePhase = 'DEGRADED' | 'IDLE' | 'LOADING' | 'READY';

export interface SystemRuntimeSnapshot {
  phase: SystemRuntimePhase;
  userId?: string;
  preference: ResolvedUserPreference;
  preferenceSource: RuntimeSource;
  i18n?: DynamicI18nSnapshot;
  i18nSource: RuntimeSource;
  diagnostics: readonly string[];
}

export interface SystemStorage {
  readonly length: number;
  getItem(key: string): string | null;
  key(index: number): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
}
