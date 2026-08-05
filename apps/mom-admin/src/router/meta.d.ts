import type { PermissionCode } from '@mom/access';
import type { AdminTaskDomainKey, IamSection } from './registry';

declare module 'vue-router' {
  interface RouteMeta {
    menuCode?: string;
    requiredPermission?: PermissionCode;
    routeKey?: string;
    section?: IamSection;
    taskDomain?: AdminTaskDomainKey;
  }
}

export {};
