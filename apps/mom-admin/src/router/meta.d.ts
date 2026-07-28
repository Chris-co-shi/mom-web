import type { PermissionCode } from '@mom/access';
import type { IamSection } from './menu-source';

declare module 'vue-router' {
  interface RouteMeta {
    menuCode?: string;
    requiredPermission?: PermissionCode;
    section?: IamSection;
  }
}

export {};
