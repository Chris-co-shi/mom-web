import { describe, expect, it } from 'vitest';

import { createApiClient } from '../../packages/api-client/src/index';
import {
  createSystemRuntime,
  DEFAULT_SYSTEM_PREFERENCE,
  type ResolvedUserPreference,
  type SystemStorage,
} from '../../packages/system-client/src/index';

const preference: ResolvedUserPreference = {
  ...DEFAULT_SYSTEM_PREFERENCE,
  locale: 'en-US',
  displayTimezone: 'Asia/Shanghai',
  themeMode: 'DARK',
  density: 'COMPACT',
  pageSize: 50,
  version: 3,
  persisted: true,
  updatedAt: '2026-08-04T10:00:00Z',
  sources: {
    locale: 'USER',
    displayTimezone: 'USER',
    themeMode: 'USER',
    density: 'USER',
    pageSize: 'USER',
  },
};

describe('System Runtime Client', () => {
  it('loads Preference and revalidates isolated Dynamic I18n with ETag', async () => {
    const storage = new MemoryStorage();
    let i18nCalls = 0;
    const runtime = createRuntime(storage, async (input, init) => {
      if (String(input).includes('/preferences/')) return Response.json(preference);
      i18nCalls += 1;
      if (new Headers(init?.headers).get('If-None-Match') === '"checksum-1"') {
        return new Response(null, { status: 304, headers: { ETag: '"checksum-1"' } });
      }
      return Response.json(i18nView(), { headers: { ETag: '"checksum-1"' } });
    });

    const first = await runtime.activate({ userId: 'user-1' });
    expect(first.phase).toBe('READY');
    expect(first.preferenceSource).toBe('REMOTE');
    expect(first.i18nSource).toBe('REMOTE');

    const second = await runtime.activate({ userId: 'user-1' });
    expect(second.phase).toBe('READY');
    expect(second.i18nSource).toBe('CACHE');
    expect(i18nCalls).toBe(2);
  });

  it('never reuses one user cache for another user during an outage', async () => {
    const storage = new MemoryStorage();
    await createRuntime(storage, async (input) =>
      String(input).includes('/preferences/')
        ? Response.json(preference)
        : Response.json(i18nView(), { headers: { ETag: '"checksum-1"' } }))
      .activate({ userId: 'user-a' });

    const offline = createRuntime(storage, async () => { throw new Error('offline'); });
    const cached = await offline.activate({ userId: 'user-a' });
    expect(cached.preferenceSource).toBe('CACHE');
    expect(cached.i18nSource).toBe('CACHE');
    expect(cached.phase).toBe('DEGRADED');

    const otherUser = await offline.activate({ userId: 'user-b' });
    expect(otherUser.preferenceSource).toBe('STATIC');
    expect(otherUser.i18nSource).toBe('STATIC');
    expect(otherUser.i18n).toBeUndefined();
  });

  it('rejects messages outside mom.runtime and keeps static resources', async () => {
    const runtime = createRuntime(new MemoryStorage(), async (input) => {
      if (String(input).includes('/preferences/')) return Response.json(DEFAULT_SYSTEM_PREFERENCE);
      return Response.json({
        ...i18nView(),
        requestedLocale: 'zh-CN',
        messages: { 'mom.auth.login': 'Injected' },
      }, { headers: { ETag: '"checksum-1"' } });
    });
    const result = await runtime.activate({ userId: 'user-1' });
    expect(result.phase).toBe('DEGRADED');
    expect(result.i18nSource).toBe('STATIC');
    expect(result.i18n).toBeUndefined();
  });

  it('keeps only messages whose placeholders match the client contract', async () => {
    const runtime = createSystemRuntime({
      api: createApiClient({
        baseUrl: '',
        fetcher: async (input) => String(input).includes('/preferences/')
          ? Response.json(preference)
          : Response.json({
              ...i18nView(),
              messages: {
                'mom.runtime.greeting': 'Hello {name}',
                'mom.runtime.unsafe': 'Hello {unknown}',
              },
            }, { headers: { ETag: '"checksum-1"' } }),
      }),
      applicationCode: 'mom-admin',
      clientId: 'mom-admin-web',
      defaultPreference: DEFAULT_SYSTEM_PREFERENCE,
      messageParameters: { 'mom.runtime.greeting': ['name'] },
      storage: new MemoryStorage(),
    });
    const result = await runtime.activate({ userId: 'user-1' });
    expect(result.i18n?.messages).toEqual({
      'mom.runtime.greeting': 'Hello {name}',
    });
  });

  it('clears the active cache and preserves a terminal 401', async () => {
    const storage = new MemoryStorage();
    const runtime = createRuntime(storage, async () =>
      Response.json({ error: 'invalid_token' }, { status: 401 }));
    await expect(runtime.activate({ userId: 'user-1' })).rejects.toMatchObject({
      name: 'MomApiError',
      status: 401,
    });
    expect(runtime.snapshot().phase).toBe('IDLE');
    expect(storage.length).toBe(0);
  });

  it('saves and resets Preference through explicit versioned write contracts', async () => {
    const writes: Array<{ body: unknown; method: string; path: string }> = [];
    const runtime = createRuntime(new MemoryStorage(), async (input, init) => {
      const path = String(input);
      if (path.includes('/i18n/')) return new Response(null, { status: 404 });
      if (init?.method === 'PUT' || init?.method === 'POST') {
        writes.push({
          body: JSON.parse(String(init.body)) as unknown,
          method: init.method,
          path,
        });
        return Response.json({ ...preference, version: preference.version + writes.length });
      }
      return Response.json(preference);
    });
    await runtime.activate({ userId: 'user-1' });

    const saved = await runtime.savePreference({
      locale: 'zh-CN',
      displayTimezone: 'UTC',
      themeMode: 'LIGHT',
      density: 'COMFORTABLE',
      pageSize: 20,
      version: 3,
    });
    const reset = await runtime.resetPreference(saved.version);

    expect(writes).toEqual([
      {
        body: {
          locale: 'zh-CN',
          displayTimezone: 'UTC',
          themeMode: 'LIGHT',
          density: 'COMFORTABLE',
          pageSize: 20,
          version: 3,
        },
        method: 'PUT',
        path: '/api/system/preferences/me',
      },
      {
        body: { version: 4 },
        method: 'POST',
        path: '/api/system/preferences/me/reset',
      },
    ]);
    expect(reset.version).toBe(5);
    expect(runtime.snapshot().preferenceSource).toBe('REMOTE');
  });

  it('preserves a Preference 409 as a conflict instead of falling back or retrying', async () => {
    let writeCalls = 0;
    const runtime = createRuntime(new MemoryStorage(), async (input, init) => {
      if (String(input).includes('/i18n/')) return new Response(null, { status: 404 });
      if (init?.method === 'PUT') {
        writeCalls += 1;
        return Response.json({ code: 'stale_version' }, { status: 409 });
      }
      return Response.json(preference);
    });
    await runtime.activate({ userId: 'user-1' });

    await expect(runtime.savePreference({
      locale: null,
      displayTimezone: null,
      themeMode: null,
      density: null,
      pageSize: null,
      version: 2,
    })).rejects.toMatchObject({ name: 'MomApiError', status: 409 });
    expect(writeCalls).toBe(1);
    expect(runtime.snapshot().preference.version).toBe(3);
  });
});

function createRuntime(storage: SystemStorage, fetcher: typeof fetch) {
  return createSystemRuntime({
    api: createApiClient({ baseUrl: '', fetcher }),
    applicationCode: 'mom-admin',
    clientId: 'mom-admin-web',
    defaultPreference: DEFAULT_SYSTEM_PREFERENCE,
    storage,
  });
}

function i18nView() {
  return {
    applicationCode: 'mom-admin',
    resourceCode: 'runtime',
    requestedLocale: 'en-US',
    defaultLocale: 'zh-CN',
    releaseVersion: 1,
    checksum: 'checksum-1',
    fallbackCount: 0,
    publishedAt: '2026-08-04T10:00:00Z',
    messages: { 'mom.runtime.greeting': 'Hello' },
  };
}

class MemoryStorage implements SystemStorage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}
