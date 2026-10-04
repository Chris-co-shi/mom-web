export const ROUTE_NAMES = {
  foundationOverview: 'foundation-overview',
  foundationComponents: 'foundation-components',
  login: 'login',
  account: 'account',
  forbidden: 'forbidden',
  offline: 'offline',
  error: 'error',
  notFound: 'not-found',
} as const;

export type MomRouteName = (typeof ROUTE_NAMES)[keyof typeof ROUTE_NAMES];
