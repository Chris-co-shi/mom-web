export const ROUTE_NAMES = {
  iamUsers: 'iam-users',
  iamRoles: 'iam-roles',
  iamPermissions: 'iam-permissions',
  iamPermissionResources: 'iam-permission-resources',
  systemDictionaries: 'system-dictionaries',
  systemLocales: 'system-locales',
  systemMessages: 'system-messages',
  foundationOverview: 'foundation-overview',
  login: 'login',
  account: 'account',
  forbidden: 'forbidden',
  offline: 'offline',
  error: 'error',
  notFound: 'not-found',
} as const;

export type MomRouteName = (typeof ROUTE_NAMES)[keyof typeof ROUTE_NAMES];
