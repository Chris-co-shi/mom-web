import assert from 'node:assert/strict';
import test from 'node:test';

import { assertPortalBoundary, customerPortal, describePortalError, isPortalFeatureAvailable, portalFeatures, PortalBoundaryError, supplierPortal } from './index.js';

const supplierContext = {
  clientId: 'mom-supplier-web', userType: 'SUPPLIER', partyType: 'SUPPLIER', partyId: 'party-1',
  factoryIds: ['factory-1', 'factory-2'], currentFactoryId: 'factory-1', permissions: [],
};

test('accepts only the frozen Supplier client, user type and Party binding', () => {
  assert.doesNotThrow(() => assertPortalBoundary(supplierContext, supplierPortal));
  assert.throws(() => assertPortalBoundary({ ...supplierContext, clientId: 'mom-customer-web' }, supplierPortal), PortalBoundaryError);
  assert.throws(() => assertPortalBoundary({ ...supplierContext, partyId: null }, supplierPortal), PortalBoundaryError);
});

test('rejects a current Factory that disappeared from the refreshed scope', () => {
  assert.throws(() => assertPortalBoundary({ ...supplierContext, currentFactoryId: 'factory-9' }, supplierPortal), /Factory/u);
});

test('keeps a stable feature registry with fail-closed security metadata', () => {
  const supplierFeatures = portalFeatures('supplier');
  const customerFeatures = portalFeatures('customer');
  assert.equal(supplierFeatures.length, 3);
  assert.equal(customerFeatures.length, 3);
  assert.ok([...supplierFeatures, ...customerFeatures].every((feature) =>
    feature.availability === 'planned'
    && feature.route.startsWith('/')
    && feature.requiredPermission.length > 0
    && feature.allowedClientId.length > 0
    && feature.allowedUserType === feature.allowedPartyType));
  assert.equal(isPortalFeatureAvailable(supplierFeatures[0]!, supplierContext), false);
  assert.equal(customerPortal.partyType, 'CUSTOMER');
});

test('preserves anti-enumeration and no-blind-retry conflict semantics', () => {
  assert.match(describePortalError({ status: 404 }).message, /不会推断/u);
  const conflict = describePortalError({ status: 409 });
  assert.equal(conflict.kind, 'conflict');
  assert.match(conflict.message, /不自动重放/u);
});

test('distinguishes 403, 429, 5xx and unknown network command results', () => {
  assert.equal(describePortalError({ status: 403 }).retryable, false);
  assert.equal(describePortalError({ status: 429 }).kind, 'rate_limited');
  assert.equal(describePortalError({ status: 503 }).kind, 'unavailable');
  assert.equal(describePortalError({ name: 'MomNetworkError' }).kind, 'unknown_result');
});
