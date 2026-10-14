import type { I18nOwner } from './runtime-api';

/** Web 只保存 Owner 的 API 与权限映射，不持有服务端 Translation。 */
export const i18nOwners: ReadonlyArray<{
  owner: I18nOwner;
  label: string;
  readAuthority: string;
  writeAuthority: string;
  managementPath: string;
}> = [
  { owner: 'system', label: 'System', readAuthority: 'system:i18n:read', writeAuthority: 'system:i18n:write', managementPath: '/i18n/messages' },
  { owner: 'auth', label: 'Auth', readAuthority: 'auth:i18n:read', writeAuthority: 'auth:i18n:write', managementPath: '/i18n/messages' },
  { owner: 'mdm', label: 'MDM', readAuthority: 'mdm:i18n:read', writeAuthority: 'mdm:i18n:write', managementPath: '/i18n/messages' },
];

export function i18nOwner(owner: I18nOwner) {
  return i18nOwners.find((item) => item.owner === owner)!;
}
