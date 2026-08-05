import assert from 'node:assert/strict';
import test from 'node:test';

import { createApiClient, MomApiError } from './index.js';

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

test('403 never triggers token refresh', async () => {
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

test('concurrent 403 responses share one authorization refresh and retry GET once', async () => {
  let authorizationVersion = 1;
  let authorizationRefreshCalls = 0;
  let requestCalls = 0;
  const client = createApiClient({
    baseUrl: '',
    refreshAuthorization: async () => {
      authorizationRefreshCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      authorizationVersion = 2;
    },
    fetcher: async () => {
      requestCalls += 1;
      return authorizationVersion === 2
        ? Response.json({ ok: true })
        : Response.json({ code: 'stale_authorization' }, { status: 403 });
    },
  });

  assert.deepEqual(
    await Promise.all([
      client.get('/api/a'),
      client.get('/api/b'),
      client.get('/api/c'),
    ]),
    [{ ok: true }, { ok: true }, { ok: true }],
  );
  assert.equal(authorizationRefreshCalls, 1);
  assert.equal(requestCalls, 6);
});

test('a read-only request cannot enter an infinite 403 synchronization loop', async () => {
  let authorizationRefreshCalls = 0;
  let forbiddenCalls = 0;
  let requestCalls = 0;
  const client = createApiClient({
    baseUrl: '',
    refreshAuthorization: async () => {
      authorizationRefreshCalls += 1;
    },
    onForbidden: async () => {
      forbiddenCalls += 1;
    },
    fetcher: async () => {
      requestCalls += 1;
      return Response.json({ code: 'forbidden' }, { status: 403 });
    },
  });

  await assert.rejects(client.get('/api/protected'), MomApiError);
  assert.equal(authorizationRefreshCalls, 1);
  assert.equal(forbiddenCalls, 1);
  assert.equal(requestCalls, 2);
});

test('a write request refreshes authorization but is never retried automatically', async () => {
  let authorizationRefreshCalls = 0;
  let writeChangedCalls = 0;
  let requestCalls = 0;
  const client = createApiClient({
    baseUrl: '',
    refreshAuthorization: async () => {
      authorizationRefreshCalls += 1;
    },
    onWriteAuthorizationChanged: async () => {
      writeChangedCalls += 1;
    },
    fetcher: async () => {
      requestCalls += 1;
      return Response.json({ code: 'stale_authorization' }, { status: 403 });
    },
  });

  await assert.rejects(
    client.post('/api/users', { displayName: 'Changed' }),
    (error) => {
      assert.ok(error instanceof MomApiError);
      assert.equal(error.code, 'authorization_changed_retry_required');
      return true;
    },
  );
  assert.equal(authorizationRefreshCalls, 1);
  assert.equal(writeChangedCalls, 1);
  assert.equal(requestCalls, 1);
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

test('uses only the frozen Gateway request headers and rejects absolute service URLs', async () => {
  let captured: Headers | undefined;
  const client = createApiClient({
    baseUrl: 'https://gateway.example.test',
    getContext: () => ({ accessToken: 'token', correlationId: 'corr-1', factoryId: 'factory-1' }),
    fetcher: async (_input, init) => {
      captured = new Headers(init?.headers);
      return Response.json({ ok: true });
    },
  });
  await client.post('/api/wms/receipts', {}, { idempotencyKey: 'idem-1' });
  assert.equal(captured?.get('Authorization'), 'Bearer token');
  assert.equal(captured?.get('X-Correlation-Id'), 'corr-1');
  assert.equal(captured?.get('X-Factory-Id'), 'factory-1');
  assert.equal(captured?.get('Idempotency-Key'), 'idem-1');
  assert.equal(captured?.has('X-Idempotency-Key'), false);
  await assert.rejects(client.get('http://business-service/api/wms/receipts'), /Gateway-relative/u);
});

test('conditional GET exposes controlled metadata and accepts 304 without parsing a body', async () => {
  const seenEtags: Array<string | null> = [];
  const client = createApiClient({
    baseUrl: 'https://gateway.example.test',
    fetcher: async (_input, init) => {
      const etag = new Headers(init?.headers).get('If-None-Match');
      seenEtags.push(etag);
      return etag
        ? new Response(null, { status: 304, headers: { ETag: '"release-1"' } })
        : Response.json(
            { releaseVersion: 1 },
            {
              headers: {
                'ETag': '"release-1"',
                'X-Correlation-Id': 'corr-response',
                'X-Internal-Header': 'not-exposed',
              },
            },
          );
    },
  });

  const fresh = await client.conditionalGet<{ releaseVersion: number }>('/api/system/i18n');
  assert.equal(fresh.status, 200);
  assert.deepEqual(fresh.data, { releaseVersion: 1 });
  assert.equal(fresh.headers.etag, '"release-1"');
  assert.equal(fresh.headers['x-correlation-id'], 'corr-response');
  assert.equal(fresh.headers['x-internal-header'], undefined);

  const unchanged = await client.conditionalGet('/api/system/i18n', {
    headers: { 'If-None-Match': fresh.headers.etag ?? '' },
  });
  assert.equal(unchanged.status, 304);
  assert.equal(unchanged.data, undefined);
  assert.deepEqual(seenEtags, [null, '"release-1"']);
});

test('a caller may consume a 403 locally without invoking the application forbidden handler', async () => {
  let forbiddenCalls = 0;
  const client = createApiClient({
    baseUrl: '',
    onForbidden: async () => { forbiddenCalls += 1; },
    fetcher: async () => Response.json({ code: 'forbidden' }, { status: 403 }),
  });
  await assert.rejects(client.get('/api/system/preferences/me', {
    notifyForbidden: false,
    retryAuthorization: false,
  }), MomApiError);
  assert.equal(forbiddenCalls, 0);
});
