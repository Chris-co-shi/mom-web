import type {
  DynamicI18nSnapshot,
  PreferenceSource,
  ResolvedUserPreference,
  SystemApplicationCode,
  SystemDensity,
  SystemLocale,
  SystemThemeMode,
} from './contracts.js';

const LOCALES = new Set<SystemLocale>(['en-US', 'zh-CN']);
const THEMES = new Set<SystemThemeMode>(['DARK', 'LIGHT', 'SYSTEM']);
const DENSITIES = new Set<SystemDensity>(['COMFORTABLE', 'COMPACT']);
const SOURCES = new Set<PreferenceSource>(['PLATFORM_DEFAULT', 'USER']);
const PAGE_SIZES = new Set([10, 20, 50, 100]);
const FORBIDDEN_KEY_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

export function parsePreference(value: unknown): ResolvedUserPreference {
  const input = record(value, 'Preference');
  const sources = record(input.sources, 'Preference sources');
  return Object.freeze({
    locale: enumValue(input.locale, LOCALES, 'locale'),
    displayTimezone: timezone(input.displayTimezone),
    themeMode: enumValue(input.themeMode, THEMES, 'themeMode'),
    density: enumValue(input.density, DENSITIES, 'density'),
    pageSize: pageSize(input.pageSize),
    version: nonNegativeInteger(input.version, 'version'),
    persisted: booleanValue(input.persisted, 'persisted'),
    updatedAt: nullableInstant(input.updatedAt, 'updatedAt'),
    sources: Object.freeze({
      locale: enumValue(sources.locale, SOURCES, 'sources.locale'),
      displayTimezone: enumValue(sources.displayTimezone, SOURCES, 'sources.displayTimezone'),
      themeMode: enumValue(sources.themeMode, SOURCES, 'sources.themeMode'),
      density: enumValue(sources.density, SOURCES, 'sources.density'),
      pageSize: enumValue(sources.pageSize, SOURCES, 'sources.pageSize'),
    }),
  });
}

export function parseI18nSnapshot(
  value: unknown,
  expected: {
    applicationCode: SystemApplicationCode;
    locale: SystemLocale;
    messageParameters?: Readonly<Record<string, readonly string[]>>;
    namespace: string;
    resourceCode: string;
  },
): DynamicI18nSnapshot {
  const input = record(value, 'Dynamic I18n');
  if (input.applicationCode !== expected.applicationCode) throw new TypeError('I18n applicationCode mismatch');
  if (input.resourceCode !== expected.resourceCode) throw new TypeError('I18n resourceCode mismatch');
  if (input.requestedLocale !== expected.locale) throw new TypeError('I18n requestedLocale mismatch');
  const messagesInput = record(input.messages, 'Dynamic I18n messages');
  const messages: Record<string, string> = Object.create(null) as Record<string, string>;
  for (const [key, message] of Object.entries(messagesInput)) {
    if (!key.startsWith(expected.namespace)) throw new TypeError('I18n message is outside the approved namespace');
    if (key.split('.').some((segment) => !segment || FORBIDDEN_KEY_SEGMENTS.has(segment))) {
      throw new TypeError('I18n message key is unsafe');
    }
    const value = stringValue(message, `messages.${key}`);
    if (hasMatchingParameters(value, expected.messageParameters?.[key] ?? [])) {
      messages[key] = value;
    }
  }
  return Object.freeze({
    applicationCode: expected.applicationCode,
    resourceCode: expected.resourceCode,
    requestedLocale: expected.locale,
    defaultLocale: enumValue(input.defaultLocale, LOCALES, 'defaultLocale'),
    releaseVersion: positiveInteger(input.releaseVersion, 'releaseVersion'),
    checksum: nonEmptyString(input.checksum, 'checksum'),
    fallbackCount: nonNegativeInteger(input.fallbackCount, 'fallbackCount'),
    publishedAt: instant(input.publishedAt, 'publishedAt'),
    messages: Object.freeze(messages),
  });
}

function hasMatchingParameters(message: string, expected: readonly string[]): boolean {
  const matched = [...message.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/gu)];
  const remaining = message.replaceAll(/\{[A-Za-z][A-Za-z0-9_]*\}/gu, '');
  if (remaining.includes('{') || remaining.includes('}')) return false;
  const actual = [...new Set(matched.map((entry) => entry[1]).filter(Boolean))].sort();
  const allowed = [...new Set(expected)].sort();
  return actual.length === allowed.length
    && actual.every((value, index) => value === allowed[index]);
}

export function validateEtag(etag: string | undefined, checksum: string): string {
  if (!etag || etag !== `"${checksum}"`) throw new TypeError('I18n ETag/checksum mismatch');
  return etag;
}

function record(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} must be an object`);
  return value as Record<string, unknown>;
}

function enumValue<T extends string>(value: unknown, allowed: ReadonlySet<T>, name: string): T {
  if (typeof value !== 'string' || !allowed.has(value as T)) throw new TypeError(`${name} is unsupported`);
  return value as T;
}

function stringValue(value: unknown, name: string): string {
  if (typeof value !== 'string') throw new TypeError(`${name} must be a string`);
  return value;
}

function nonEmptyString(value: unknown, name: string): string {
  const result = stringValue(value, name).trim();
  if (!result) throw new TypeError(`${name} must not be empty`);
  return result;
}

function booleanValue(value: unknown, name: string): boolean {
  if (typeof value !== 'boolean') throw new TypeError(`${name} must be a boolean`);
  return value;
}

function nonNegativeInteger(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) throw new TypeError(`${name} must be a non-negative integer`);
  return Number(value);
}

function positiveInteger(value: unknown, name: string): number {
  const result = nonNegativeInteger(value, name);
  if (result === 0) throw new TypeError(`${name} must be positive`);
  return result;
}

function pageSize(value: unknown): 10 | 20 | 50 | 100 {
  if (!PAGE_SIZES.has(Number(value))) throw new TypeError('pageSize is unsupported');
  return Number(value) as 10 | 20 | 50 | 100;
}

function timezone(value: unknown): string {
  const result = nonEmptyString(value, 'displayTimezone');
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: result }).format();
  }
  catch {
    throw new TypeError('displayTimezone must be an IANA Zone ID');
  }
  return result;
}

function nullableInstant(value: unknown, name: string): string | null {
  return value === null ? null : instant(value, name);
}

function instant(value: unknown, name: string): string {
  const result = nonEmptyString(value, name);
  if (Number.isNaN(Date.parse(result))) throw new TypeError(`${name} must be an RFC 3339 timestamp`);
  return result;
}
