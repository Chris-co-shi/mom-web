import type {
  DynamicI18nSnapshot,
  ResolvedUserPreference,
  SystemApplicationCode,
  SystemClientId,
  SystemLocale,
  SystemStorage,
} from './contracts.js';

const CACHE_SCHEMA_VERSION = 'v1';

export interface I18nCacheValue {
  etag: string;
  snapshot: DynamicI18nSnapshot;
}

export interface RuntimeCache {
  clearUser(userId: string): void;
  readI18n(userId: string, locale: SystemLocale): I18nCacheValue | undefined;
  readPreference(userId: string): ResolvedUserPreference | undefined;
  removeI18n(userId: string, locale: SystemLocale): void;
  removePreference(userId: string): void;
  writeI18n(userId: string, locale: SystemLocale, value: I18nCacheValue): void;
  writePreference(userId: string, value: ResolvedUserPreference): void;
}

export function createRuntimeCache(options: {
  applicationCode: SystemApplicationCode;
  clientId: SystemClientId;
  resourceCode: string;
  storage: SystemStorage;
}): RuntimeCache {
  const prefix = `mom.system.${CACHE_SCHEMA_VERSION}.${options.clientId}.${options.applicationCode}`;
  const preferenceKey = (userId: string): string => `${prefix}.${userId}.preference`;
  const i18nKey = (userId: string, locale: SystemLocale): string =>
    `${prefix}.${userId}.i18n.${options.resourceCode}.${locale}`;

  return {
    clearUser(userId) {
      const userPrefix = `${prefix}.${userId}.`;
      const keys: string[] = [];
      for (let index = 0; index < options.storage.length; index += 1) {
        const key = options.storage.key(index);
        if (key?.startsWith(userPrefix)) keys.push(key);
      }
      for (const key of keys) options.storage.removeItem(key);
    },
    readI18n: (userId, locale) => readJson(options.storage, i18nKey(userId, locale)),
    readPreference: (userId) => readJson(options.storage, preferenceKey(userId)),
    removeI18n: (userId, locale) => options.storage.removeItem(i18nKey(userId, locale)),
    removePreference: (userId) => options.storage.removeItem(preferenceKey(userId)),
    writeI18n: (userId, locale, value) => writeJson(options.storage, i18nKey(userId, locale), value),
    writePreference: (userId, value) => writeJson(options.storage, preferenceKey(userId), value),
  };
}

function readJson<T>(storage: SystemStorage, key: string): T | undefined {
  const raw = storage.getItem(key);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  }
  catch {
    storage.removeItem(key);
    return undefined;
  }
}

function writeJson(storage: SystemStorage, key: string, value: unknown): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  }
  catch {
    // Storage 配额或浏览器策略失败只禁用本次缓存，不影响静态 Runtime。
  }
}
