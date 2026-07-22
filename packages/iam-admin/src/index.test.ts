import assert from 'node:assert/strict';
import test from 'node:test';

import { createIamAdminClient, describeAdminError, type ApiTransport } from './index.js';

interface Call { method: string; path: string; body?: unknown }

function fixture(): { client: ReturnType<typeof createIamAdminClient>; calls: Call[] } {
  const calls: Call[] = [];
  const transport: ApiTransport = {
    get: async (path) => { calls.push({ method: 'GET', path }); return {} as never; },
    post: async (path, body) => { calls.push({ method: 'POST', path, body }); return {} as never; },
    put: async (path, body) => { calls.push({ method: 'PUT', path, body }); return {} as never; },
    delete: async (path, options) => { calls.push({ method: 'DELETE', path, body: options?.body }); return undefined as never; },
  };
  return { client: createIamAdminClient(transport), calls };
}

test('reads the two aggregate snapshots from the hardened S07 endpoints', async () => {
  const { client, calls } = fixture();
  await client.getUserAuthorizations('101');
  await client.getRolePermissions('202');
  assert.deepEqual(calls, [
    { method: 'GET', path: '/api/iam/admin/users/101/authorizations' },
    { method: 'GET', path: '/api/iam/admin/roles/202/permissions' },
  ]);
});

test('sends a non-null parent version on all five relationship replacement commands', async () => {
  const { client, calls } = fixture();
  await client.replaceUserRoles('101', { roleIds: ['201'], version: 3, reason: 'role' });
  await client.replaceFactoryScopes('101', { factoryIds: ['301'], version: 4, reason: 'factory' });
  await client.setMobileAccess('101', { enabled: true, version: 5, reason: 'mobile' });
  await client.rebindParty('101', { partyType: 'SUPPLIER', partyId: '401', version: 6, reason: 'party' });
  await client.replaceRolePermissions('201', { permissionIds: ['501'], version: 7, reason: 'permission' });
  assert.deepEqual(calls.map((call) => (call.body as { version: number }).version), [3, 4, 5, 6, 7]);
  assert.deepEqual(calls.map((call) => call.path), [
    '/api/iam/admin/users/101/roles',
    '/api/iam/admin/users/101/factory-scopes',
    '/api/iam/admin/users/101/mobile-access',
    '/api/iam/admin/users/101/party-binding',
    '/api/iam/admin/roles/201/permissions',
  ]);
});

test('maps stale_version to a reload-and-reconfirm state without automatic retry', () => {
  const error = describeAdminError({ status: 409, code: 'stale_version', correlationId: 'corr-1' });
  assert.equal(error.kind, 'stale');
  assert.equal(error.reloadRequired, true);
  assert.match(error.message, /不会自动覆盖/u);
  assert.equal(error.correlationId, 'corr-1');
});

test('preserves 403 and anti-enumeration 404 as explicit page states', () => {
  assert.equal(describeAdminError({ status: 403 }).kind, 'forbidden');
  const hidden = describeAdminError({ status: 404 });
  assert.equal(hidden.kind, 'not_found');
  assert.match(hidden.message, /无法确认/u);
});

test('encodes list filters and sends delete reason with the selected user version', async () => {
  const { client, calls } = fixture();
  await client.listUsers({ userType: 'INTERNAL', status: 'DISABLED' });
  await client.deleteUser('10/20', { version: 8, reason: 'approved removal' });
  assert.equal(calls[0]?.path, '/api/iam/admin/users?userType=INTERNAL&status=DISABLED');
  assert.deepEqual(calls[1], {
    method: 'DELETE', path: '/api/iam/admin/users/10%2F20',
    body: { version: 8, reason: 'approved removal' },
  });
});
