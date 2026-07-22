export type PermissionCode = `${string}:${string}:${string}`;
export type UserType = 'INTERNAL' | 'SUPPLIER' | 'CUSTOMER';
export type WebClientId = 'mom-admin-web' | 'mom-supplier-web' | 'mom-customer-web';

export interface UserAccessContext {
  userId: string;
  username: string;
  displayName: string;
  userType: UserType;
  clientId: WebClientId;
  roles: string[];
  permissions: PermissionCode[];
  factoryIds: string[];
  partyType: 'SUPPLIER' | 'CUSTOMER' | null;
  partyId: string | null;
  currentFactoryId: string | null;
}

export interface AccessStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface AccessRuntimeOptions {
  expectedClientId: WebClientId;
  expectedUserType: UserType;
  loadMe: (requestedFactoryId?: string) => Promise<UserAccessContext>;
  preferenceStorage?: AccessStorage;
  preferenceKey?: string;
}

export class AppEntryMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppEntryMismatchError';
  }
}

export class FactoryScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FactoryScopeError';
  }
}

export interface AccessRuntime {
  snapshot(): Readonly<UserAccessContext> | undefined;
  subscribe(listener: (context: Readonly<UserAccessContext> | undefined) => void): () => void;
  initialize(): Promise<Readonly<UserAccessContext>>;
  replace(context: UserAccessContext): Readonly<UserAccessContext>;
  clear(): void;
  currentFactoryId(): string | undefined;
  setCurrentFactory(factoryId: string): void;
  hasPermission(permission: PermissionCode): boolean;
  hasAnyPermission(permissions: readonly PermissionCode[]): boolean;
  hasAllPermissions(permissions: readonly PermissionCode[]): boolean;
}

export function createAccessRuntime(options: AccessRuntimeOptions): AccessRuntime {
  const storage = options.preferenceStorage ?? globalThis.localStorage;
  const preferenceKey = options.preferenceKey ?? `mom.factory.preference.${options.expectedClientId}`;
  let current: Readonly<UserAccessContext> | undefined;
  const listeners = new Set<(context: Readonly<UserAccessContext> | undefined) => void>();

  function publish(context: Readonly<UserAccessContext> | undefined): void {
    current = context;
    for (const listener of listeners) listener(context);
  }

  function snapshot(): Readonly<UserAccessContext> | undefined {
    return current;
  }

  function subscribe(listener: (context: Readonly<UserAccessContext> | undefined) => void): () => void {
    listeners.add(listener);
    listener(current);
    return () => listeners.delete(listener);
  }

  async function initialize(): Promise<Readonly<UserAccessContext>> {
    const preferredFactory = normalizedPreference(storage.getItem(preferenceKey));
    let response: UserAccessContext;
    try {
      response = await options.loadMe(preferredFactory);
    }
    catch (error) {
      if (!preferredFactory) throw error;
      storage.removeItem(preferenceKey);
      response = await options.loadMe();
    }
    return replace(response);
  }

  function replace(context: UserAccessContext): Readonly<UserAccessContext> {
    validateContext(context, options.expectedClientId, options.expectedUserType);
    const factoryIds = unique(context.factoryIds);
    let currentFactoryId = context.currentFactoryId;
    if (currentFactoryId && !factoryIds.includes(currentFactoryId)) currentFactoryId = null;
    const preferredFactory = normalizedPreference(storage.getItem(preferenceKey));
    if (!currentFactoryId && preferredFactory && factoryIds.includes(preferredFactory)) {
      currentFactoryId = preferredFactory;
    }
    if (currentFactoryId) storage.setItem(preferenceKey, currentFactoryId);
    else storage.removeItem(preferenceKey);
    const normalized = Object.freeze({
      ...context,
      roles: Object.freeze(unique(context.roles)) as unknown as string[],
      permissions: Object.freeze(unique(context.permissions)) as unknown as PermissionCode[],
      factoryIds: Object.freeze(factoryIds) as unknown as string[],
      partyType: context.partyType ?? null,
      partyId: context.partyId ?? null,
      currentFactoryId: currentFactoryId ?? null,
    });
    publish(normalized);
    return normalized;
  }

  function clear(): void {
    publish(undefined);
  }

  function currentFactoryId(): string | undefined {
    return current?.currentFactoryId ?? undefined;
  }

  function setCurrentFactory(factoryId: string): void {
    const value = factoryId.trim();
    if (!current) throw new FactoryScopeError('Access context is not initialized');
    if (!current.factoryIds.includes(value)) {
      throw new FactoryScopeError('Factory is outside the current user scope');
    }
    storage.setItem(preferenceKey, value);
    replace({ ...current, currentFactoryId: value });
  }

  function hasPermission(permission: PermissionCode): boolean {
    return current?.permissions.includes(permission) ?? false;
  }

  function hasAnyPermission(permissions: readonly PermissionCode[]): boolean {
    return permissions.some(hasPermission);
  }

  function hasAllPermissions(permissions: readonly PermissionCode[]): boolean {
    return permissions.every(hasPermission);
  }

  return {
    snapshot,
    subscribe,
    initialize,
    replace,
    clear,
    currentFactoryId,
    setCurrentFactory,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
}

export function hasPermission(
  context: Pick<UserAccessContext, 'permissions'>,
  permission: PermissionCode,
): boolean {
  return context.permissions.includes(permission);
}

export function hasAnyPermission(
  context: Pick<UserAccessContext, 'permissions'>,
  permissions: readonly PermissionCode[],
): boolean {
  return permissions.some((permission) => hasPermission(context, permission));
}

export function hasAllPermissions(
  context: Pick<UserAccessContext, 'permissions'>,
  permissions: readonly PermissionCode[],
): boolean {
  return permissions.every((permission) => hasPermission(context, permission));
}

function validateContext(
  context: UserAccessContext,
  expectedClientId: WebClientId,
  expectedUserType: UserType,
): void {
  if (context.clientId !== expectedClientId) {
    throw new AppEntryMismatchError(`IAM returned client ${context.clientId}; expected ${expectedClientId}`);
  }
  if (context.userType !== expectedUserType) {
    throw new AppEntryMismatchError(`User type ${context.userType} cannot enter ${expectedClientId}`);
  }
  if (!context.userId || !context.username || !context.displayName) {
    throw new AppEntryMismatchError('IAM user context is incomplete');
  }
  if (context.userType === 'INTERNAL') {
    if (context.partyType || context.partyId) {
      throw new AppEntryMismatchError('Internal user must not carry an external Party binding');
    }
  }
  else if (context.partyType !== context.userType || !context.partyId) {
    throw new AppEntryMismatchError('External user Party binding is incomplete or mismatched');
  }
}

function normalizedPreference(value: string | null): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function unique<T extends string>(values: readonly T[]): T[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean) as T[])];
}
