import { describe, expect, it } from 'vitest';

import { createApiClient } from '../../packages/api-client/src/index';
import {
  CatalogValidationError,
  createCatalogRuntime,
  type CatalogContract,
} from '../../packages/system-client/src/index';

const responseHeaders = {
  'Cache-Control': 'private, no-cache',
  ETag: '"catalog-checksum-1"',
};

const contract: CatalogContract = {
  applicationCode: 'mom-admin',
  applicationI18n: i18n('mom.runtime.application.admin'),
  applicationIconKey: 'app-window',
  applicationType: 'PLATFORM',
  channels: ['WEB'],
  nodes: {
    'mom-admin.people-access': {
      i18n: i18n('mom.runtime.navigation.peopleAccess'),
      iconKey: 'users',
      parentRouteKey: null,
      permissionCode: null,
      type: 'GROUP',
    },
    'mom-admin.people-access.roles': {
      i18n: i18n('mom.runtime.navigation.roles'),
      iconKey: 'shield-check',
      parentRouteKey: 'mom-admin.people-access',
      permissionCode: 'iam:role:read',
      type: 'ROUTE',
    },
    'mom-admin.people-access.users': {
      i18n: i18n('mom.runtime.navigation.users'),
      iconKey: 'users',
      parentRouteKey: 'mom-admin.people-access',
      permissionCode: 'iam:user:read',
      type: 'ROUTE',
    },
  },
  routeContractVersion: 1,
  snapshotSchemaVersion: 1,
};

describe('System Catalog Runtime', () => {
  it('activates a strict 200 representation and intersects fresh IAM permissions', async () => {
    const runtime = createRuntime(async () => Response.json(catalogView(), { headers: responseHeaders }));

    const snapshot = await runtime.activate(identity('user-1', ['iam:user:read']));

    expect(snapshot.phase).toBe('ACTIVE');
    expect(snapshot.etag).toBe('"catalog-checksum-1"');
    expect(snapshot.catalog?.applications[0]?.channels[0]?.navigation[0]?.children)
      .toHaveLength(1);
    expect(snapshot.catalog?.applications[0]?.channels[0]?.navigation[0]?.children[0]?.routeKey)
      .toBe('mom-admin.people-access.users');
    expect(Object.isFrozen(snapshot.catalog)).toBe(true);
  });

  it('uses 304 only with the matching current-process identity representation', async () => {
    const sentEtags: Array<string | null> = [];
    let calls = 0;
    const runtime = createRuntime(async (_input, init) => {
      calls += 1;
      sentEtags.push(new Headers(init?.headers).get('If-None-Match'));
      return calls === 1
        ? Response.json(catalogView(), { headers: responseHeaders })
        : new Response(null, { status: 304, headers: responseHeaders });
    });

    await runtime.activate(identity('user-1', ['iam:user:read', 'iam:role:read']));
    const snapshot = await runtime.activate(identity('user-1', ['iam:role:read']));

    expect(sentEtags).toEqual([null, '"catalog-checksum-1"']);
    expect(snapshot.phase).toBe('ACTIVE');
    expect(snapshot.catalog?.applications[0]?.channels[0]?.navigation[0]?.children[0]?.routeKey)
      .toBe('mom-admin.people-access.roles');
  });

  it('fails closed when 304 has no matching in-memory representation', async () => {
    const runtime = createRuntime(async () =>
      new Response(null, { status: 304, headers: responseHeaders }));

    await expect(runtime.activate(identity('user-1', ['iam:user:read'])))
      .rejects.toThrow('Catalog 304 has no matching in-memory representation');
    expect(runtime.snapshot()).toMatchObject({
      phase: 'RESTRICTED',
      restrictionReason: 'catalog_activation_failed',
    });
    expect(runtime.snapshot().catalog).toBeUndefined();
    expect(runtime.snapshot().etag).toBeUndefined();
  });

  it('does not send one identity ETag for another identity', async () => {
    const sentEtags: Array<string | null> = [];
    let calls = 0;
    const runtime = createRuntime(async (_input, init) => {
      calls += 1;
      sentEtags.push(new Headers(init?.headers).get('If-None-Match'));
      return calls === 1
        ? Response.json(catalogView(), { headers: responseHeaders })
        : new Response(null, { status: 304, headers: responseHeaders });
    });

    await runtime.activate(identity('user-a', ['iam:user:read']));
    await expect(runtime.activate(identity('user-b', ['iam:user:read']))).rejects.toThrow();

    expect(sentEtags).toEqual([null, null]);
    expect(runtime.snapshot()).toMatchObject({ phase: 'RESTRICTED', userId: 'user-b' });
  });

  it('discards the active representation after a network or HTTP failure', async () => {
    let calls = 0;
    const runtime = createRuntime(async () => {
      calls += 1;
      if (calls === 1) return Response.json(catalogView(), { headers: responseHeaders });
      throw new Error('offline');
    });
    await runtime.activate(identity('user-1', ['iam:user:read']));

    await expect(runtime.activate(identity('user-1', ['iam:user:read'])))
      .rejects.toMatchObject({ name: 'MomNetworkError' });

    expect(runtime.snapshot().phase).toBe('RESTRICTED');
    expect(runtime.snapshot().catalog).toBeUndefined();
    expect(runtime.snapshot().etag).toBeUndefined();
  });

  it.each([401, 403, 404, 409, 429, 500])(
    'fails closed after an HTTP %s response',
    async (status) => {
      const runtime = createRuntime(async () =>
        Response.json({ code: 'catalog_unavailable' }, { status }));

      await expect(runtime.activate(identity('user-1', ['iam:user:read']))).rejects.toThrow();
      expect(runtime.snapshot().phase).toBe('RESTRICTED');
      expect(runtime.snapshot().catalog).toBeUndefined();
      expect(runtime.snapshot().etag).toBeUndefined();
    },
  );

  it.each([
    ['weak ETag', catalogView(), { ...responseHeaders, ETag: 'W/"catalog-checksum-1"' }],
    ['missing cache policy', catalogView(), { ETag: '"catalog-checksum-1"' }],
    ['unknown schema', { ...catalogView(), snapshotSchemaVersion: 2 }, responseHeaders],
    ['unknown route', catalogView((view) => {
      view.applications[0].channels[0].navigation[0].children[0].routeKey = 'mom-admin.unknown';
    }), responseHeaders],
    ['permission mismatch', catalogView((view) => {
      view.applications[0].channels[0].navigation[0].children[0].permissionCode = 'iam:user:write';
    }), responseHeaders],
    ['icon mismatch', catalogView((view) => {
      view.applications[0].channels[0].navigation[0].children[0].iconKey = 'remote-icon';
    }), responseHeaders],
    ['I18n mismatch', catalogView((view) => {
      view.applications[0].channels[0].navigation[0].children[0].i18n.messageKey = 'outside.namespace';
    }), responseHeaders],
    ['executable field', catalogView((view) => {
      Object.assign(view.applications[0].channels[0].navigation[0].children[0], {
        component: 'https://example.invalid/remote.js',
      });
    }), responseHeaders],
  ])('rejects %s and clears the representation', async (_name, response, headers) => {
    const runtime = createRuntime(async () => Response.json(response, { headers }));

    await expect(runtime.activate(identity('user-1', ['iam:user:read'])))
      .rejects.toBeInstanceOf(CatalogValidationError);
    expect(runtime.snapshot().phase).toBe('RESTRICTED');
    expect(runtime.snapshot().catalog).toBeUndefined();
  });

  it('supports an explicit fail-closed restriction and clear lifecycle', async () => {
    const runtime = createRuntime(async () => Response.json(catalogView(), { headers: responseHeaders }));
    await runtime.activate(identity('user-1', ['iam:user:read']));

    runtime.restrict('authorization_changed');
    expect(runtime.snapshot()).toMatchObject({
      phase: 'RESTRICTED',
      restrictionReason: 'authorization_changed',
    });
    expect(runtime.snapshot().catalog).toBeUndefined();

    runtime.clear();
    expect(runtime.snapshot()).toEqual({
      applicationCode: 'mom-admin',
      clientId: 'mom-admin-web',
      phase: 'IDLE',
    });
  });

  it('clears an active representation when the next identity input is invalid', async () => {
    const runtime = createRuntime(async () => Response.json(catalogView(), { headers: responseHeaders }));
    await runtime.activate(identity('user-1', ['iam:user:read']));

    await expect(runtime.activate(identity('  ', ['iam:user:read']))).rejects.toThrow();

    expect(runtime.snapshot()).toMatchObject({
      phase: 'RESTRICTED',
      restrictionReason: 'invalid_catalog_identity',
    });
    expect(runtime.snapshot().catalog).toBeUndefined();
  });
});

function createRuntime(fetcher: typeof fetch) {
  return createCatalogRuntime({
    api: createApiClient({ baseUrl: '', fetcher }),
    clientId: 'mom-admin-web',
    contract,
  });
}

function identity(userId: string, permissions: readonly string[]) {
  return { permissions: new Set(permissions), userId };
}

function i18n(messageKey: string) {
  return { messageKey, resourceCode: 'runtime' };
}

interface MutableCatalogView {
  applications: Array<{
    applicationCode: string;
    applicationType: string;
    catalogVersion: number;
    channels: Array<{
      clientChannel: string;
      navigation: MutableNavigationItem[];
    }>;
    i18n: { messageKey: string; resourceCode: string };
    iconKey: string;
    routeContractVersion: number;
  }>;
  generatedAt: string;
  snapshotSchemaVersion: number;
}

interface MutableNavigationItem {
  children: MutableNavigationItem[];
  i18n: { messageKey: string; resourceCode: string };
  iconKey: string;
  keepAlive: boolean;
  permissionCode: string | null;
  routeKey: string;
  type: string;
  visibleInBreadcrumb: boolean;
  visibleInMenu: boolean;
  visibleInTab: boolean;
}

function catalogView(mutate?: (view: MutableCatalogView) => void): MutableCatalogView {
  const view: MutableCatalogView = {
    applications: [{
      applicationCode: 'mom-admin',
      applicationType: 'PLATFORM',
      catalogVersion: 1,
      channels: [{
        clientChannel: 'WEB',
        navigation: [{
          children: [
            route('mom-admin.people-access.users', 'iam:user:read', 'users'),
            route('mom-admin.people-access.roles', 'iam:role:read', 'shield-check'),
          ],
          i18n: i18n('mom.runtime.navigation.peopleAccess'),
          iconKey: 'users',
          keepAlive: false,
          permissionCode: null,
          routeKey: 'mom-admin.people-access',
          type: 'GROUP',
          visibleInBreadcrumb: true,
          visibleInMenu: true,
          visibleInTab: false,
        }],
      }],
      i18n: i18n('mom.runtime.application.admin'),
      iconKey: 'app-window',
      routeContractVersion: 1,
    }],
    generatedAt: '2026-08-05T08:00:00Z',
    snapshotSchemaVersion: 1,
  };
  mutate?.(view);
  return view;
}

function route(routeKey: string, permissionCode: string, iconKey: string): MutableNavigationItem {
  const name = routeKey.split('.').at(-1);
  return {
    children: [],
    i18n: i18n(`mom.runtime.navigation.${name}`),
    iconKey,
    keepAlive: false,
    permissionCode,
    routeKey,
    type: 'ROUTE',
    visibleInBreadcrumb: true,
    visibleInMenu: true,
    visibleInTab: false,
  };
}
