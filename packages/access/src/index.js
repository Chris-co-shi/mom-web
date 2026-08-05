export class AppEntryMismatchError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AppEntryMismatchError';
    }
}
export class FactoryScopeError extends Error {
    constructor(message) {
        super(message);
        this.name = 'FactoryScopeError';
    }
}
export function createAccessRuntime(options) {
    const storage = options.preferenceStorage ?? globalThis.localStorage;
    const preferenceKey = options.preferenceKey ?? `mom.factory.preference.${options.expectedClientId}`;
    let current;
    const listeners = new Set();
    function publish(context) {
        current = context;
        for (const listener of listeners)
            listener(context);
    }
    function snapshot() {
        return current;
    }
    function subscribe(listener) {
        listeners.add(listener);
        listener(current);
        return () => listeners.delete(listener);
    }
    async function initialize() {
        const preferredFactory = normalizedPreference(storage.getItem(preferenceKey));
        let response;
        try {
            response = await options.loadMe(preferredFactory);
        }
        catch (error) {
            if (!preferredFactory)
                throw error;
            storage.removeItem(preferenceKey);
            response = await options.loadMe();
        }
        return replace(response);
    }
    function replace(context) {
        validateContext(context, options.expectedClientId, options.expectedUserType);
        const factoryIds = unique(context.factoryIds);
        let currentFactoryId = context.currentFactoryId;
        if (currentFactoryId && !factoryIds.includes(currentFactoryId))
            currentFactoryId = null;
        const preferredFactory = normalizedPreference(storage.getItem(preferenceKey));
        if (!currentFactoryId && preferredFactory && factoryIds.includes(preferredFactory)) {
            currentFactoryId = preferredFactory;
        }
        if (currentFactoryId)
            storage.setItem(preferenceKey, currentFactoryId);
        else
            storage.removeItem(preferenceKey);
        const normalized = Object.freeze({
            ...context,
            roles: Object.freeze(unique(context.roles)),
            permissions: Object.freeze(unique(context.permissions)),
            factoryIds: Object.freeze(factoryIds),
            partyType: context.partyType ?? null,
            partyId: context.partyId ?? null,
            currentFactoryId: currentFactoryId ?? null,
        });
        publish(normalized);
        return normalized;
    }
    function clear() {
        publish(undefined);
    }
    function currentFactoryId() {
        return current?.currentFactoryId ?? undefined;
    }
    function setCurrentFactory(factoryId) {
        const value = factoryId.trim();
        if (!current)
            throw new FactoryScopeError('Access context is not initialized');
        if (!current.factoryIds.includes(value)) {
            throw new FactoryScopeError('Factory is outside the current user scope');
        }
        storage.setItem(preferenceKey, value);
        replace({ ...current, currentFactoryId: value });
    }
    function hasPermission(permission) {
        return current?.permissions.includes(permission) ?? false;
    }
    function hasAnyPermission(permissions) {
        return permissions.some(hasPermission);
    }
    function hasAllPermissions(permissions) {
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
export function hasPermission(context, permission) {
    return context.permissions.includes(permission);
}
export function hasAnyPermission(context, permissions) {
    return permissions.some((permission) => hasPermission(context, permission));
}
export function hasAllPermissions(context, permissions) {
    return permissions.every((permission) => hasPermission(context, permission));
}
function validateContext(context, expectedClientId, expectedUserType) {
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
function normalizedPreference(value) {
    const normalized = value?.trim();
    return normalized || undefined;
}
function unique(values) {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
