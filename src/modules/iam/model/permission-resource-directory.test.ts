import { describe, expect, it } from 'vitest';
import type { PermissionResourceResponse } from '../api/permission-resources-api';
import { groupPermissionResources } from './permission-resource-directory';

function resource(id: string, domainCode: string, resourceCode: string): PermissionResourceResponse {
  return {
    id,
    domainCode,
    resourceCode,
    name: resourceCode,
    description: null,
    sortOrder: 0,
    enabled: true,
    version: 1,
    createdAt: '2026-10-12T00:00:00Z',
    updatedAt: '2026-10-12T00:00:00Z',
  };
}

describe('permission resource directory', () => {
  it('只对传入的当前页记录分组，并保持服务端返回顺序', () => {
    const rows = [
      resource('1', 'AUTH', 'USER'),
      resource('2', 'SYSTEM', 'DICTIONARY'),
      resource('3', 'AUTH', 'ROLE'),
    ];

    expect(groupPermissionResources(rows)).toEqual([
      { domainCode: 'AUTH', resources: [rows[0], rows[2]] },
      { domainCode: 'SYSTEM', resources: [rows[1]] },
    ]);
  });
});
