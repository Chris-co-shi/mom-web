import assert from 'node:assert/strict';
import test from 'node:test';

import { createApiClient, MomApiError } from './index.ts';

test('concurrent 401 responses create one refresh and retry once', async () => {
  let accessToken = 'expired';
  let refreshCalls = 0;
  let requests = 0;
  const client = createApiClient({
    baseUrl: 'https://gateway.example.test',
    getContext: () => ({ accessToken }),
    refreshAccessToken: async () => {
      refreshCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      accessToken = 'fresh';
      return accessToken;
    },
    fetcher: async (_input, init) => {
      requests += 1;
      return new Headers(init?.headers).get('Authorization') === 'Bearer fresh'
        ? Response.json({ ok: true })
        : Response.json({ error: 'invalid_token' }, { status: 401 });
    },
  });
  assert.deepEqual(await Promise.all([
    client.get('/api/a'), client.get('/api/b'), client.get('/api/c'),
  ]), [{ ok: true }, { ok: true }, { ok: true }]);
  assert.equal(refreshCalls, 1);
  assert.equal(requests, 6);
});

test('403 never triggers refresh', async () => {
  let refreshCalls = 0;
  const client = createApiClient({
    baseUrl: '',
    getContext: () => ({ accessToken: 'valid' }),
    refreshAccessToken: async () => { refreshCalls += 1; return 'new'; },
    fetcher: async () => Response.json({ code: 'forbidden' }, { status: 403 }),
  });
  await assert.rejects(client.get('/api/protected'), (error) => {
    assert.ok(error instanceof MomApiError);
    assert.equal(error.status, 403);
    return true;
  });
  assert.equal(refreshCalls, 0);
});

test('a retried request cannot enter an infinite 401 loop', async () => {
  let requests = 0;
  let refreshCalls = 0;
  const client = createApiClient({
    baseUrl: '',
    getContext: () => ({ accessToken: 'token' }),
    refreshAccessToken: async () => { refreshCalls += 1; return 'token-2'; },
    fetcher: async () => {
      requests += 1;
      return Response.json({ error: 'invalid_token' }, { status: 401 });
    },
  });
  await assert.rejects(client.get('/api/protected'), MomApiError);
  assert.equal(refreshCalls, 1);
  assert.equal(requests, 2);
});
