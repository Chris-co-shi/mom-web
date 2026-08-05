import type { ApiClient } from '@mom/api-client';

import type {
  CatalogContract,
  CatalogRuntimeIdentity,
  CatalogRuntimeSnapshot,
  CatalogView,
} from './catalog-contracts.js';
import {
  filterCatalogByPermissions,
  parseCatalogView,
  validateCatalogCacheControl,
  validateCatalogEtag,
} from './catalog-validation.js';
import type { SystemClientId } from './contracts.js';

export interface CatalogRuntimeOptions {
  api: ApiClient;
  clientId: SystemClientId;
  contract: CatalogContract;
  onDiagnostic?: (message: string, error?: unknown) => void;
}

export interface CatalogRuntime {
  activate(identity: CatalogRuntimeIdentity): Promise<Readonly<CatalogRuntimeSnapshot>>;
  clear(): void;
  restrict(reason: string, error?: unknown): void;
  snapshot(): Readonly<CatalogRuntimeSnapshot>;
  subscribe(listener: (snapshot: Readonly<CatalogRuntimeSnapshot>) => void): () => void;
}

interface RetainedCatalog {
  catalog: CatalogView;
  etag: string;
  identityKey: string;
}

/**
 * 创建只保留当前进程内已验证表示的 Catalog Runtime。
 *
 * 网络、认证、版本或完整性失败都会清除表示并进入 RESTRICTED；调用方不得把失败解释为可继续使用旧路由。
 */
export function createCatalogRuntime(options: CatalogRuntimeOptions): CatalogRuntime {
  const listeners = new Set<(snapshot: Readonly<CatalogRuntimeSnapshot>) => void>();
  let generation = 0;
  let retained: RetainedCatalog | undefined;
  let state = freezeSnapshot({
    applicationCode: options.contract.applicationCode,
    clientId: options.clientId,
    phase: 'IDLE',
  });

  function publish(next: CatalogRuntimeSnapshot): void {
    state = freezeSnapshot(next);
    for (const listener of listeners) listener(state);
  }

  async function activate(
    identity: CatalogRuntimeIdentity,
  ): Promise<Readonly<CatalogRuntimeSnapshot>> {
    let userId: string;
    let permissions: ReadonlySet<string>;
    try {
      userId = identity.userId.trim();
      if (!userId) throw new TypeError('Catalog Runtime userId must not be empty');
      permissions = normalizePermissions(identity.permissions);
    }
    catch (error) {
      generation += 1;
      restrictInternal('invalid_catalog_identity', error);
      throw error;
    }
    const identityKey = `${options.clientId}\u0000${userId}\u0000${options.contract.applicationCode}`;
    const previous = retained?.identityKey === identityKey ? retained : undefined;
    if (!previous) retained = undefined;
    const requestGeneration = ++generation;
    publish({
      applicationCode: options.contract.applicationCode,
      clientId: options.clientId,
      phase: 'LOADING',
      userId,
    });

    try {
      const response = await options.api.conditionalGet<unknown>(
        `/api/system/catalog/applications/${encodeURIComponent(options.contract.applicationCode)}`,
        {
          headers: previous ? { 'If-None-Match': previous.etag } : undefined,
          notifyForbidden: false,
          retryAuthorization: false,
        },
      );
      if (requestGeneration !== generation) return state;
      validateCatalogCacheControl(response.headers['cache-control']);
      const responseEtag = validateCatalogEtag(response.headers.etag);
      let catalog: CatalogView;
      if (response.status === 304) {
        if (!previous || previous.etag !== responseEtag) {
          throw new TypeError('Catalog 304 has no matching in-memory representation');
        }
        catalog = previous.catalog;
      }
      else if (response.status === 200) {
        catalog = parseCatalogView(response.data, options.contract);
      }
      else {
        throw new TypeError(`Catalog response status ${response.status} is unsupported`);
      }
      retained = { catalog, etag: responseEtag, identityKey };
      publish({
        applicationCode: options.contract.applicationCode,
        catalog: filterCatalogByPermissions(catalog, permissions),
        clientId: options.clientId,
        etag: responseEtag,
        phase: 'ACTIVE',
        userId,
      });
      return state;
    }
    catch (error) {
      if (requestGeneration !== generation) return state;
      restrictInternal('catalog_activation_failed', error, userId);
      throw error;
    }
  }

  function restrict(reason: string, error?: unknown): void {
    const normalized = reason.trim();
    if (!normalized) throw new TypeError('Catalog restriction reason must not be empty');
    generation += 1;
    restrictInternal(normalized, error, state.userId);
  }

  function restrictInternal(reason: string, error: unknown, userId?: string): void {
    retained = undefined;
    options.onDiagnostic?.(reason, error);
    publish({
      applicationCode: options.contract.applicationCode,
      clientId: options.clientId,
      phase: 'RESTRICTED',
      restrictionReason: reason,
      ...(userId ? { userId } : {}),
    });
  }

  function clear(): void {
    generation += 1;
    retained = undefined;
    publish({
      applicationCode: options.contract.applicationCode,
      clientId: options.clientId,
      phase: 'IDLE',
    });
  }

  return {
    activate,
    clear,
    restrict,
    snapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
    },
  };
}

function normalizePermissions(value: ReadonlySet<string>): ReadonlySet<string> {
  const result = new Set<string>();
  for (const permission of value) {
    const normalized = permission.trim();
    if (normalized) result.add(normalized);
  }
  return result;
}

function freezeSnapshot(value: CatalogRuntimeSnapshot): Readonly<CatalogRuntimeSnapshot> {
  return Object.freeze({ ...value });
}
