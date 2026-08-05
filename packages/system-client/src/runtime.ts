import type { ApiClient } from '@mom/api-client';
import { MomApiError } from '@mom/api-client';

import { createRuntimeCache } from './cache.js';
import type {
  DynamicI18nSnapshot,
  ResolvedUserPreference,
  RuntimeIdentity,
  SaveUserPreference,
  SystemApplicationCode,
  SystemClientId,
  SystemLocale,
  SystemRuntimeSnapshot,
  SystemStorage,
} from './contracts.js';
import { parseI18nSnapshot, parsePreference, validateEtag } from './validation.js';

export interface SystemRuntimeOptions {
  api: ApiClient;
  applicationCode: SystemApplicationCode;
  clientId: SystemClientId;
  defaultPreference: ResolvedUserPreference;
  messageParameters?: Readonly<Record<string, readonly string[]>>;
  namespace?: string;
  onDiagnostic?: (message: string, error?: unknown) => void;
  onI18n?: (locale: SystemLocale, messages: Readonly<Record<string, string>>) => void | Promise<void>;
  onPreference?: (preference: ResolvedUserPreference) => void | Promise<void>;
  resourceCode?: string;
  storage?: SystemStorage;
}

export interface SystemRuntime {
  activate(identity: RuntimeIdentity): Promise<Readonly<SystemRuntimeSnapshot>>;
  clear(): void;
  loadLocale(locale: SystemLocale): Promise<DynamicI18nSnapshot | undefined>;
  resetPreference(version: number): Promise<ResolvedUserPreference>;
  savePreference(command: SaveUserPreference): Promise<ResolvedUserPreference>;
  snapshot(): Readonly<SystemRuntimeSnapshot>;
  subscribe(listener: (snapshot: Readonly<SystemRuntimeSnapshot>) => void): () => void;
}

export function createSystemRuntime(options: SystemRuntimeOptions): SystemRuntime {
  const resourceCode = options.resourceCode ?? 'runtime';
  const namespace = options.namespace ?? 'mom.runtime.';
  const storage = options.storage ?? globalThis.sessionStorage;
  const cache = createRuntimeCache({
    applicationCode: options.applicationCode,
    clientId: options.clientId,
    resourceCode,
    storage,
  });
  const listeners = new Set<(snapshot: Readonly<SystemRuntimeSnapshot>) => void>();
  let generation = 0;
  let currentUserId: string | undefined;
  let state = freezeState({
    phase: 'IDLE',
    preference: options.defaultPreference,
    preferenceSource: 'STATIC',
    i18nSource: 'STATIC',
    diagnostics: [],
  });

  function publish(next: SystemRuntimeSnapshot): void {
    state = freezeState(next);
    for (const listener of listeners) listener(state);
  }

  function diagnostic(message: string, error?: unknown): void {
    options.onDiagnostic?.(message, error);
    publish({
      ...state,
      diagnostics: [...state.diagnostics, message].slice(-10),
    });
  }

  async function activate(identity: RuntimeIdentity): Promise<Readonly<SystemRuntimeSnapshot>> {
    const userId = identity.userId.trim();
    if (!userId) throw new TypeError('System Runtime userId must not be empty');
    const requestGeneration = ++generation;
    if (currentUserId && currentUserId !== userId) cache.clearUser(currentUserId);
    currentUserId = userId;
    publish({
      phase: 'LOADING',
      userId,
      preference: options.defaultPreference,
      preferenceSource: 'STATIC',
      i18nSource: 'STATIC',
      diagnostics: [],
    });

    const cachedPreference = validatedCachedPreference(userId);
    if (cachedPreference) {
      publish({ ...state, preference: cachedPreference, preferenceSource: 'CACHE' });
      await options.onPreference?.(cachedPreference);
    }

    let preference = cachedPreference ?? options.defaultPreference;
    try {
      preference = await getRemotePreferenceFor(options.api);
      if (requestGeneration !== generation) return state;
      cache.writePreference(userId, preference);
      publish({ ...state, preference, preferenceSource: 'REMOTE' });
      await options.onPreference?.(preference);
    }
    catch (error) {
      if (isAuthenticationError(error)) {
        clear();
        throw error;
      }
      diagnostic('System Preference 不可用，已使用同用户缓存或静态默认值。', error);
      if (!cachedPreference) await options.onPreference?.(options.defaultPreference);
    }

    await loadLocaleInternal(preference.locale, requestGeneration);
    if (requestGeneration !== generation) return state;
    publish({ ...state, phase: state.diagnostics.length > 0 ? 'DEGRADED' : 'READY' });
    return state;
  }

  async function loadLocale(locale: SystemLocale): Promise<DynamicI18nSnapshot | undefined> {
    if (!currentUserId) throw new Error('System Runtime is not active');
    const requestGeneration = ++generation;
    await loadLocaleInternal(locale, requestGeneration);
    return state.i18n;
  }

  async function loadLocaleInternal(
    locale: SystemLocale,
    requestGeneration: number,
  ): Promise<void> {
    const userId = currentUserId;
    if (!userId) return;
    const cached = validatedCachedI18n(userId, locale);
    const headers = cached ? { 'If-None-Match': cached.etag } : undefined;
    try {
      const response = await options.api.conditionalGet<unknown>(
        `/api/system/i18n/applications/${options.applicationCode}/resources/${resourceCode}?locale=${locale}`,
        { headers, notifyForbidden: false, retryAuthorization: false },
      );
      if (requestGeneration !== generation || currentUserId !== userId) return;
      if (response.status === 304) {
        if (!cached) throw new TypeError('I18n 304 has no isolated cache representation');
        publish({ ...state, i18n: cached.snapshot, i18nSource: 'CACHE' });
        await options.onI18n?.(locale, cached.snapshot.messages);
        return;
      }
      const parsed = parseI18nSnapshot(response.data, {
        applicationCode: options.applicationCode,
        locale,
        namespace,
        resourceCode,
        messageParameters: options.messageParameters,
      });
      const etag = validateEtag(response.headers.etag, parsed.checksum);
      cache.writeI18n(userId, locale, { etag, snapshot: parsed });
      publish({ ...state, i18n: parsed, i18nSource: 'REMOTE' });
      await options.onI18n?.(locale, parsed.messages);
    }
    catch (error) {
      if (isAuthenticationError(error)) {
        clear();
        throw error;
      }
      if (requestGeneration !== generation || currentUserId !== userId) return;
      if (cached) {
        publish({ ...state, i18n: cached.snapshot, i18nSource: 'CACHE' });
        await options.onI18n?.(locale, cached.snapshot.messages);
      }
      else {
        publish({ ...state, i18n: undefined, i18nSource: 'STATIC' });
        await options.onI18n?.(locale, {});
      }
      diagnostic('Dynamic I18n 不可用，已使用同用户缓存或静态语言资源。', error);
    }
  }

  async function savePreference(command: SaveUserPreference): Promise<ResolvedUserPreference> {
    return updatePreference(() => options.api.put('/api/system/preferences/me', command, {
      notifyForbidden: false,
      retryAuthorization: false,
    }));
  }

  async function resetPreference(version: number): Promise<ResolvedUserPreference> {
    return updatePreference(() => options.api.post('/api/system/preferences/me/reset', { version }, {
      notifyForbidden: false,
      retryAuthorization: false,
    }));
  }

  async function updatePreference(request: () => Promise<unknown>): Promise<ResolvedUserPreference> {
    const userId = currentUserId;
    if (!userId) throw new Error('System Runtime is not active');
    const preference = parsePreference(await request());
    if (currentUserId !== userId) throw new Error('System Runtime identity changed during preference update');
    cache.writePreference(userId, preference);
    publish({ ...state, preference, preferenceSource: 'REMOTE' });
    await options.onPreference?.(preference);
    return preference;
  }

  function validatedCachedPreference(userId: string): ResolvedUserPreference | undefined {
    const value = cache.readPreference(userId);
    if (!value) return undefined;
    try {
      return parsePreference(value);
    }
    catch (error) {
      cache.removePreference(userId);
      options.onDiagnostic?.('Preference 缓存无效，已清除。', error);
      return undefined;
    }
  }

  function validatedCachedI18n(
    userId: string,
    locale: SystemLocale,
  ): { etag: string; snapshot: DynamicI18nSnapshot } | undefined {
    const value = cache.readI18n(userId, locale);
    if (!value) return undefined;
    try {
      const snapshot = parseI18nSnapshot(value.snapshot, {
        applicationCode: options.applicationCode,
        locale,
        namespace,
        resourceCode,
        messageParameters: options.messageParameters,
      });
      validateEtag(value.etag, snapshot.checksum);
      return { etag: value.etag, snapshot };
    }
    catch (error) {
      cache.removeI18n(userId, locale);
      options.onDiagnostic?.('I18n 缓存无效，已清除。', error);
      return undefined;
    }
  }

  function clear(): void {
    generation += 1;
    if (currentUserId) cache.clearUser(currentUserId);
    currentUserId = undefined;
    publish({
      phase: 'IDLE',
      preference: options.defaultPreference,
      preferenceSource: 'STATIC',
      i18nSource: 'STATIC',
      diagnostics: [],
    });
  }

  return {
    activate,
    clear,
    loadLocale,
    resetPreference,
    savePreference,
    snapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
    },
  };
}

function isAuthenticationError(error: unknown): boolean {
  return error instanceof MomApiError && error.status === 401;
}

function freezeState(value: SystemRuntimeSnapshot): Readonly<SystemRuntimeSnapshot> {
  return Object.freeze({
    ...value,
    diagnostics: Object.freeze([...value.diagnostics]),
  });
}

async function getRemotePreferenceFor(
  api: ApiClient,
): Promise<ResolvedUserPreference> {
  return parsePreference(await api.get<unknown>('/api/system/preferences/me', {
    notifyForbidden: false,
    retryAuthorization: false,
  }));
}
