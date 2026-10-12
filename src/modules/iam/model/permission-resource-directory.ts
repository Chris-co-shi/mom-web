import type { PermissionResourceResponse } from '../api/permission-resources-api';

export interface PermissionResourceGroup {
  domainCode: string;
  resources: PermissionResourceResponse[];
}

/** 仅组织服务端已返回的当前页记录，不推断全量 Domain、数量或额外分页数据。 */
export function groupPermissionResources(rows: readonly PermissionResourceResponse[]): PermissionResourceGroup[] {
  const groups = new Map<string, PermissionResourceResponse[]>();
  rows.forEach((resource) => {
    const resources = groups.get(resource.domainCode) ?? [];
    resources.push(resource);
    groups.set(resource.domainCode, resources);
  });
  return [...groups].map(([domainCode, resources]) => ({ domainCode, resources }));
}
