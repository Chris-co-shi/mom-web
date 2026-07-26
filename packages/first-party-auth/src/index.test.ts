import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createFirstPartyAuthRuntime,
  FirstPartyAuthError,
  type BrowserSessionStorage,
} from './index.js';

class MemoryStorage implements BrowserSessionStorage {
  readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const now = Date.parse('2026-07-26T10:00:00Z');

function tokenResponse(sequence: number) {
  return {
    accessToken: `access-${sequence}`,
    refreshToken: `refresh-${sequence}`,
    tokenType: 'Bearer',
    expiresIn: 600,
    sessionId: 'session-1',
    accessExpiresAt: '2026-07-26T10:10:00Z',
    sessionExpiresAt: '2026-07-26T18:00:00Z',
  } as const;
}

function runtime(fetcher: typeof fetch, storage = new MemoryStorage()) {
  return {
    storage,
    auth: createFirstPartyAuthRuntime({
      clientId: 'mom-admin-web',
      baseUrl: 'https://gateway.example.test/',
      storage,
      fetcher,
      now: () => now,
    }),
  };
}

test('login uses the exact first-party endpoint and persists only the current tab session', async () => {
  let requestedUrl = '';
  let requestedBody: Record<string, unknown> = {};
  const current = runtime(async (input, init) => {
    requestedUrl = String(input);
    requestedBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return Response.json(tokenResponse(1));
  });

  assert.equal(await current.auth.login({
    username: 'admin',
    password: 'temporary-password',
    deviceName: 'test-browser',
  }), 'access-1');

  assert.equal(requestedUrl, 'https://gateway.example.test/api/iam/auth/login');
  assert.deepEqual(requestedBody, {
    username: 'admin',
    password: 'temporary-password',
    clientId: 'mom-admin-web',
    deviceName: 'test-browser',
  });
  assert.equal(current.auth.getAccessToken(), 'access-1');
  assert.deepEqual([...current.storage.values.keys()], ['mom.auth.session.mom-admin-web']);
  const persisted = [...current.storage.values.values()][0];
  assert.equal(persisted.includes('temporary-password'), false);
  assert.equal(persisted.includes('access-1'), true);
  assert.equal(persisted.includes('refresh-1'), true);
});

test('a new runtime restores the sessionStorage token set after page reload', async () => {
  const storage = new MemoryStorage();
  const first = runtime(async () => Response.json(tokenResponse(1)), storage);
  await first.auth.login({ username: 'admin', password: 'password', deviceName: 'test' });

  const second = runtime(async () => { throw new Error('not called'); }, storage);
  assert.equal(second.auth.restore(), true);
  assert.equal(second.auth.getAccessToken(), 'access-1');
  assert.equal(second.auth.snapshot().status, 'authenticated');
});

test('password change required remains a typed conflict and does not persist tokens', async () => {
  const current = runtime(async () => Response.json(
    { error: 'password_change_required', message: '必须修改临时密码' },
    { status: 409 },
  ));

  await assert.rejects(
    current.auth.login({ username: 'admin', password: 'temporary', deviceName: 'test' }),
    (error: unknown) => error instanceof FirstPartyAuthError
      && error.code === 'password_change_required'
      && error.status === 409,
  );
  assert.equal(current.storage.values.size, 0);
  assert.equal(current.auth.getAccessToken(), undefined);
});

test('concurrent refresh performs one rotation and all callers receive the successor access token', async () => {
  let sequence = 0;
  let refreshCalls = 0;
  const current = runtime(async (input) => {
    if (String(input).endsWith('/refresh')) {
      refreshCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return Response.json(tokenResponse(2));
    }
    sequence += 1;
    return Response.json(tokenResponse(sequence));
  });
  await current.auth.login({ username: 'admin', password: 'password', deviceName: 'test' });

  assert.deepEqual(await Promise.all([
    current.auth.refresh(),
    current.auth.refresh(),
    current.auth.refresh(),
  ]), ['access-2', 'access-2', 'access-2']);
  assert.equal(refreshCalls, 1);
  assert.equal(current.auth.getAccessToken(), 'access-2');
});

test('logout sends the current bearer token and clears sessionStorage even when IAM is unavailable', async () => {
  const authorizationHeaders: string[] = [];
  const current = runtime(async (input, init) => {
    if (String(input).endsWith('/logout')) {
      authorizationHeaders.push(new Headers(init?.headers).get('Authorization') ?? '');
      throw new Error('network unavailable');
    }
    return Response.json(tokenResponse(1));
  });
  await current.auth.login({ username: 'admin', password: 'password', deviceName: 'test' });

  await assert.rejects(current.auth.logout(), /network unavailable/);
  assert.deepEqual(authorizationHeaders, ['Bearer access-1']);
  assert.equal(current.storage.values.size, 0);
  assert.equal(current.auth.snapshot().status, 'anonymous');
});
