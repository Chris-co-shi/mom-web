import type { I18nOwner } from './runtime-api';

/** Web 只保存 Owner 的 API 与权限映射，不持有服务端 Translation。 */
export const i18nOwners: ReadonlyArray<{
  owner: I18nOwner;
  label: string;
  initialNamespace: string;
  readAuthority: string;
  writeAuthority: string;
  managementPath: string;
}> = [
  { owner: 'system', label: 'System', initialNamespace: 'system.web', readAuthority: 'system:i18n:read', writeAuthority: 'system:i18n:write', managementPath: '/admin/i18n/messages' },
  { owner: 'auth', label: 'Auth', initialNamespace: 'auth.iam', readAuthority: 'auth:i18n:read', writeAuthority: 'auth:i18n:write', managementPath: '/admin/i18n/messages' },
  { owner: 'mdm', label: 'MDM', initialNamespace: 'mdm', readAuthority: 'mdm:i18n:read', writeAuthority: 'mdm:i18n:write', managementPath: '/admin/i18n/messages' },
];

export function i18nOwner(owner: I18nOwner) {
  return i18nOwners.find((item) => item.owner === owner)!;
}
