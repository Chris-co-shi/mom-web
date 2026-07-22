import assert from 'node:assert/strict';
import test from 'node:test';

import { createAuthRuntime } from './index.ts';

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

function fixture(fetcher: typeof fetch) {
  const storage = new MemoryStorage();
  let assigned = '';
  let replaced = '';
  const now = 1_800_000_000_000;
  const runtime = createAuthRuntime({
    issuer: 'https://iam.example.test',
    clientId: 'mom-admin-web',
    redirectUri: 'https://admin.example.test/auth/callback',
    postLogoutRedirectUri: 'https://admin.example.test/',
    fetcher,
    transactionStorage: storage,
    location: {
      href: 'https://admin.example.test/orders?status=open',
      origin: 'https://admin.example.test',
      assign(url) { assigned = url; },
    },
    history: { replaceState(_data, _unused, url) { replaced = String(url ?? ''); } },
    now: () => now,
    idTokenVerifier: async (_token, expected) => ({
      iss: expected.issuer,
      sub: 'user-1',
      aud: expected.clientId,
      exp: Math.floor(now / 1000) + 600,
      nonce: expected.nonce,
    }),
  });
  return { runtime, storage, assigned: () => assigned, replaced: () => replaced };
}

test('PKCE transaction is the only persisted auth state', async () => {
  const current = fixture(async () => { throw new Error('not called'); });
  await current.runtime.beginLogin('/orders?status=open');
  assert.equal(current.storage.values.size, 1);
  const [key, raw] = [...current.storage.values.entries()][0];
  assert.equal(key, 'mom.auth.pkce.mom-admin-web');
  assert.deepEqual(Object.keys(JSON.parse(raw)).sort(), [
    'codeVerifier', 'createdAt', 'nonce', 'returnUrl', 'state',
  ]);
  assert.equal(raw.includes('access_token'), false);
  const authorization = new URL(current.assigned());
  assert.equal(authorization.pathname, '/oauth2/authorize');
  assert.equal(authorization.searchParams.get('code_challenge_method'), 'S256');
});

test('callback clears transaction and keeps tokens only in memory', async () => {
  const current = fixture(async () => Response.json({
    access_token: 'access-1', refresh_token: 'refresh-1',
    id_token: 'header.payload.signature', token_type: 'Bearer', expires_in: 600,
  }));
  await current.runtime.beginLogin('/orders');
  const state = new URL(current.assigned()).searchParams.get('state');
  const result = await current.runtime.handleAuthorizationCallback(
    `https://admin.example.test/auth/callback?code=code-1&state=${state}`,
  );
  assert.equal(result.returnUrl, '/orders');
  assert.equal(current.runtime.getAccessToken(), 'access-1');
  assert.equal(current.storage.values.size, 0);
  assert.equal(current.replaced(), '/auth/callback');
});

test('concurrent refresh rotates once and shares one promise', async () => {
  let refreshCalls = 0;
  const current = fixture(async (_input, init) => {
    const body = new URLSearchParams(String(init?.body ?? ''));
    if (body.get('grant_type') === 'refresh_token') {
      refreshCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return Response.json({
        access_token: 'access-2', refresh_token: 'refresh-2',
        token_type: 'Bearer', expires_in: 600,
      });
    }
    return Response.json({
      access_token: 'access-1', refresh_token: 'refresh-1',
      id_token: 'header.payload.signature', token_type: 'Bearer', expires_in: 600,
    });
  });
  await current.runtime.beginLogin('/');
  const state = new URL(current.assigned()).searchParams.get('state');
  await current.runtime.handleAuthorizationCallback(
    `https://admin.example.test/auth/callback?code=code-1&state=${state}`,
  );
  assert.deepEqual(await Promise.all([
    current.runtime.refresh(), current.runtime.refresh(), current.runtime.refresh(),
  ]), ['access-2', 'access-2', 'access-2']);
  assert.equal(refreshCalls, 1);
});

test('state mismatch clears one-time transaction without code exchange', async () => {
  let calls = 0;
  const current = fixture(async () => { calls += 1; return Response.json({}); });
  await current.runtime.beginLogin('/');
  await assert.rejects(
    current.runtime.handleAuthorizationCallback(
      'https://admin.example.test/auth/callback?code=code-1&state=attacker',
    ),
    /state mismatch/i,
  );
  assert.equal(calls, 0);
  assert.equal(current.storage.values.size, 0);
});
