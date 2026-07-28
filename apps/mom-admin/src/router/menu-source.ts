import type { PermissionCode } from '@mom/access';
import type { RouteRecordStringComponent } from '@vben/types';

import { access } from '../runtime';

export type IamSection =
  | 'audit'
  | 'clients'
  | 'permissions'
  | 'roles'
  | 'sessions'
  | 'users';

interface MenuDefinition {
  icon: string;
  menuCode: string;
  name: string;
  order: number;
  path: string;
  permission: PermissionCode;
  section: IamSection;
  titleKey: string;
}
export const menuDefinitions: readonly MenuDefinition[] = [
  {
    icon: 'lucide:users',
    menuCode: 'iam.users',
    name: 'IamUsers',
    order: 10,
    path: '/iam/users',
    permission: 'iam:user:read',
    section: 'users',
    titleKey: 'mom.menu.users',
  },
  {
    icon: 'lucide:shield-check',
    menuCode: 'iam.roles',
    name: 'IamRoles',
    order: 20,
    path: '/iam/roles',
    permission: 'iam:role:read',
    section: 'roles',
    titleKey: 'mom.menu.roles',
  },
  {
    icon: 'lucide:key-round',
    menuCode: 'iam.permissions',
    name: 'IamPermissions',
    order: 30,
    path: '/iam/permissions',
    permission: 'iam:permission:read',
    section: 'permissions',
    titleKey: 'mom.menu.permissions',
  },
  {
    icon: 'lucide:monitor-smartphone',
    menuCode: 'iam.sessions',
    name: 'IamSessions',
    order: 40,
    path: '/iam/sessions',
    permission: 'iam:session:read',
    section: 'sessions',
    titleKey: 'mom.menu.sessions',
  },
  {
    icon: 'lucide:scroll-text',
    menuCode: 'iam.audit',
    name: 'IamAudit',
    order: 50,
    path: '/iam/audit',
    permission: 'iam:audit:read',
    section: 'audit',
    titleKey: 'mom.menu.audit',
  },
  {
    icon: 'lucide:app-window',
    menuCode: 'iam.clients',
    name: 'IamClients',
    order: 60,
    path: '/iam/clients',
    permission: 'iam:client:read',
    section: 'clients',
    titleKey: 'mom.menu.clients',
  },
];

export async function loadMenuRoutes(): Promise<
  RouteRecordStringComponent[]
> {
  const children = menuDefinitions
    .filter(({ permission }) => access.hasPermission(permission))
    .map<RouteRecordStringComponent>((definition) => ({
      component: '/iam-admin',
      meta: {
        icon: definition.icon,
        menuCode: definition.menuCode,
        order: definition.order,
        requiredPermission: definition.permission,
        section: definition.section,
        title: definition.titleKey,
      },
      name: definition.name,
      path: definition.path,
    }));

  if (children.length === 0) return [];

  return [
    {
      children,
      component: 'BasicLayout',
      meta: {
        icon: 'lucide:settings',
        order: 10,
        title: 'mom.menu.system',
      },
      name: 'IamManagement',
      path: '/iam',
      redirect: children[0]?.path,
    },
  ];
}

export function firstAccessiblePath(): string | undefined {
  return menuDefinitions.find(({ permission }) =>
    access.hasPermission(permission),
  )?.path;
}
