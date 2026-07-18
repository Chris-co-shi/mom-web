export type PermissionCode = `${string}:${string}:${string}`;

export interface UserAccessContext {
  roles: string[];
  permissions: PermissionCode[];
  factoryIds: string[];
}

export function hasPermission(context: UserAccessContext, permission: PermissionCode): boolean {
  return context.permissions.includes(permission);
}
