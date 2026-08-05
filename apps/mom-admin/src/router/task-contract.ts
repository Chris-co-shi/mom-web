export const ADMIN_ROUTE_CONTRACT_VERSION = 1 as const;

export type AdminTaskPermission = `${string}:${string}:${string}`;
export type AdminTaskDomainKey = 'people-access' | 'security-operations';
export type AdminTaskIconKey =
  | 'app-window'
  | 'key-round'
  | 'monitor-smartphone'
  | 'scroll-text'
  | 'shield-check'
  | 'users';
export type AdminTaskRouteName =
  | 'IamAudit'
  | 'IamClients'
  | 'IamPermissions'
  | 'IamRoles'
  | 'IamSessions'
  | 'IamUsers';
export type IamSection =
  | 'audit'
  | 'clients'
  | 'permissions'
  | 'roles'
  | 'sessions'
  | 'users';

export interface AdminTaskDomain {
  catalogI18nKey: `mom.runtime.${string}`;
  iconKey: AdminTaskIconKey;
  key: AdminTaskDomainKey;
  order: number;
  routeKey: `mom-admin.${string}`;
  titleKey: string;
}

export interface AdminTaskContract {
  catalogI18nKey: `mom.runtime.${string}`;
  domain: AdminTaskDomainKey;
  iconKey: AdminTaskIconKey;
  menuCode: string;
  name: AdminTaskRouteName;
  order: number;
  path: `/iam/${string}`;
  requiredPermission: AdminTaskPermission;
  routeKey: `mom-admin.${string}`;
  section: IamSection;
  titleKey: string;
}

export const ADMIN_TASK_DOMAINS = [
  {
    catalogI18nKey: 'mom.runtime.navigation.peopleAccess',
    iconKey: 'users',
    key: 'people-access',
    order: 10,
    routeKey: 'mom-admin.people-access',
    titleKey: 'mom.navigation.peopleAccess',
  },
  {
    catalogI18nKey: 'mom.runtime.navigation.securityOperations',
    iconKey: 'shield-check',
    key: 'security-operations',
    order: 20,
    routeKey: 'mom-admin.security-operations',
    titleKey: 'mom.navigation.securityOperations',
  },
] as const satisfies readonly AdminTaskDomain[];

export const ADMIN_TASK_CONTRACTS = [
  {
    catalogI18nKey: 'mom.runtime.navigation.users',
    domain: 'people-access',
    iconKey: 'users',
    menuCode: 'iam.users',
    name: 'IamUsers',
    order: 10,
    path: '/iam/users',
    requiredPermission: 'iam:user:read',
    routeKey: 'mom-admin.people-access.users',
    section: 'users',
    titleKey: 'mom.menu.users',
  },
  {
    catalogI18nKey: 'mom.runtime.navigation.roles',
    domain: 'people-access',
    iconKey: 'shield-check',
    menuCode: 'iam.roles',
    name: 'IamRoles',
    order: 20,
    path: '/iam/roles',
    requiredPermission: 'iam:role:read',
    routeKey: 'mom-admin.people-access.roles',
    section: 'roles',
    titleKey: 'mom.menu.roles',
  },
  {
    catalogI18nKey: 'mom.runtime.navigation.permissions',
    domain: 'people-access',
    iconKey: 'key-round',
    menuCode: 'iam.permissions',
    name: 'IamPermissions',
    order: 30,
    path: '/iam/permissions',
    requiredPermission: 'iam:permission:read',
    routeKey: 'mom-admin.people-access.permissions',
    section: 'permissions',
    titleKey: 'mom.menu.permissions',
  },
  {
    catalogI18nKey: 'mom.runtime.navigation.clients',
    domain: 'people-access',
    iconKey: 'app-window',
    menuCode: 'iam.clients',
    name: 'IamClients',
    order: 40,
    path: '/iam/clients',
    requiredPermission: 'iam:client:read',
    routeKey: 'mom-admin.people-access.clients',
    section: 'clients',
    titleKey: 'mom.menu.clients',
  },
  {
    catalogI18nKey: 'mom.runtime.navigation.sessions',
    domain: 'security-operations',
    iconKey: 'monitor-smartphone',
    menuCode: 'iam.sessions',
    name: 'IamSessions',
    order: 10,
    path: '/iam/sessions',
    requiredPermission: 'iam:session:read',
    routeKey: 'mom-admin.security-operations.sessions',
    section: 'sessions',
    titleKey: 'mom.menu.sessions',
  },
  {
    catalogI18nKey: 'mom.runtime.navigation.audit',
    domain: 'security-operations',
    iconKey: 'scroll-text',
    menuCode: 'iam.audit',
    name: 'IamAudit',
    order: 20,
    path: '/iam/audit',
    requiredPermission: 'iam:audit:read',
    routeKey: 'mom-admin.security-operations.audit',
    section: 'audit',
    titleKey: 'mom.menu.audit',
  },
] as const satisfies readonly AdminTaskContract[];
