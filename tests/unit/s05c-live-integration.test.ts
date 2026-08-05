import { describe, expect, it } from 'vitest';

// 运行脚本保持原生 Node ESM；Vitest 只消费其显式导出的纯契约和 Publisher 工厂。
import {
  createS05cLivePublisher,
  S05C_CATALOG_NODES,
  S05C_MESSAGES,
  validateS05cSpecification,
} from '../../scripts/s05c-live-integration.mjs';

describe('S05C live integration specification', () => {
  it('freezes nine bilingual messages and two groups plus six routes', () => {
    expect(validateS05cSpecification()).toEqual({ messageCount: 9, nodeCount: 8 });
    expect(S05C_MESSAGES).toHaveLength(9);
    expect(S05C_CATALOG_NODES.filter((node) => node.type === 'GROUP')).toHaveLength(2);
    expect(S05C_CATALOG_NODES.filter((node) => node.type === 'ROUTE')).toHaveLength(6);
  });

  it('rejects a token that lacks any governance permission', async () => {
    const publisher = createS05cLivePublisher({
      baseUrl: 'https://gateway.example.test',
      fetcher: async (url) => url.endsWith('/api/iam/auth/login')
        ? Response.json({ accessToken: 'sensitive-token' })
        : Response.json({ permissions: ['system:catalog:read'], username: 'admin' }),
      logger: () => {},
    });

    await expect(publisher.authenticate('admin', 'not-logged'))
      .rejects.toThrow('当前 Token 缺少治理权限');
  });

  it('verifies strong ETag and conditional 304 without exposing the token', async () => {
    const calls: Array<{ authorization: string | null; url: string }> = [];
    const permissions = [
      'system:catalog:publish',
      'system:catalog:read',
      'system:catalog:write',
      'system:i18n:publish',
      'system:i18n:read',
      'system:i18n:write',
    ];
    const publisher = createS05cLivePublisher({
      baseUrl: 'https://gateway.example.test/',
      fetcher: async (url, init = {}) => {
        calls.push({ authorization: new Headers(init.headers).get('authorization'), url });
        if (url.endsWith('/api/iam/auth/login')) return Response.json({ accessToken: 'sensitive-token' });
        if (url.endsWith('/api/iam/me')) return Response.json({ permissions, username: 'admin' });
        const conditional = new Headers(init.headers).has('if-none-match');
        if (conditional) return new Response(null, { status: 304 });
        if (url.includes('/api/system/i18n/')) {
          return Response.json({ messages: Object.fromEntries(S05C_MESSAGES.map(([key, value]) => [key, value])) }, {
            headers: { etag: '"i18n-etag"' },
          });
        }
        return Response.json({ applications: [{ applicationCode: 'mom-admin' }] }, {
          headers: { etag: '"catalog-etag"' },
        });
      },
      logger: () => {},
    });

    await publisher.authenticate('admin', 'not-logged');
    await expect(publisher.verifyRuntime()).resolves.toEqual({
      catalogEtag: '"catalog-etag"',
      i18nEtag: '"i18n-etag"',
    });
    expect(calls.filter((call) => call.url.endsWith('/api/iam/auth/login'))[0].authorization).toBeNull();
    expect(calls.filter((call) => !call.url.endsWith('/api/iam/auth/login'))
      .every((call) => call.authorization === 'Bearer sensitive-token')).toBe(true);
  });
});
