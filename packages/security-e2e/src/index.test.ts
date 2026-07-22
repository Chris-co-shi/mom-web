import assert from 'node:assert/strict';
import test from 'node:test';

import { AppEntryMismatchError, createAccessRuntime, type UserAccessContext, type UserType, type WebClientId } from '../../access/src/index.js';
import { assertPortalBoundary, customerPortal, supplierPortal } from '../../portal-access/src/index.js';

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const matrix: Array<{ clientId: WebClientId; userType: UserType; partyType: 'SUPPLIER' | 'CUSTOMER' | null }> = [
  { clientId: 'mom-admin-web', userType: 'INTERNAL', partyType: null },
  { clientId: 'mom-supplier-web', userType: 'SUPPLIER', partyType: 'SUPPLIER' },
  { clientId: 'mom-customer-web', userType: 'CUSTOMER', partyType: 'CUSTOMER' },
];

function context(entry: typeof matrix[number]): UserAccessContext {
  return {
    userId: `${entry.userType.toLowerCase()}-1`,
    username: `${entry.userType.toLowerCase()}-user`,
    displayName: `${entry.userType} User`,
    userType: entry.userType,
    clientId: entry.clientId,
    roles: [],
    permissions: ['portal:entry:read'],
    factoryIds: ['factory-a'],
    partyType: entry.partyType,
    partyId: entry.partyType ? 'party-a' : null,
    currentFactoryId: 'factory-a',
  };
}

test('S12 enforces the complete Web client and user_type entry matrix', () => {
  for (const expected of matrix) {
    const runtime = createAccessRuntime({
      expectedClientId: expected.clientId,
      expectedUserType: expected.userType,
      preferenceStorage: new MemoryStorage(),
      loadMe: async () => context(expected),
    });
    assert.doesNotThrow(() => runtime.replace(context(expected)));
    for (const actual of matrix.filter((entry) => entry.clientId !== expected.clientId)) {
      assert.throws(() => runtime.replace(context(actual)), AppEntryMismatchError);
    }
  }
});

test('S12 keeps Supplier and Customer Party identities fixed across portal boundaries', () => {
  const supplier = context(matrix[1]!);
  const customer = context(matrix[2]!);
  assert.doesNotThrow(() => assertPortalBoundary(supplier, supplierPortal));
  assert.doesNotThrow(() => assertPortalBoundary(customer, customerPortal));
  assert.throws(() => assertPortalBoundary(customer, supplierPortal));
  assert.throws(() => assertPortalBoundary(supplier, customerPortal));
});

test('S12 revalidates Factory preference and never treats it as authorization', async () => {
  const storage = new MemoryStorage();
  storage.setItem('mom.factory.preference.mom-admin-web', 'factory-revoked');
  const calls: Array<string | undefined> = [];
  const runtime = createAccessRuntime({
    expectedClientId: 'mom-admin-web',
    expectedUserType: 'INTERNAL',
    preferenceStorage: storage,
    loadMe: async (factoryId) => {
      calls.push(factoryId);
      if (factoryId === 'factory-revoked') throw Object.assign(new Error('forbidden'), { status: 403 });
      return context(matrix[0]!);
    },
  });
  const result = await runtime.initialize();
  assert.deepEqual(calls, ['factory-revoked', undefined]);
  assert.equal(storage.getItem('mom.factory.preference.mom-admin-web'), 'factory-a');
  assert.deepEqual(result.factoryIds, ['factory-a']);
  assert.throws(() => runtime.setCurrentFactory('factory-revoked'), /outside/u);
});
