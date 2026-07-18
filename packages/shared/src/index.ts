export const MOM_PLATFORM_NAME = 'Industrial MOM';

export type AppCode = 'mom-admin' | 'supplier-portal' | 'customer-portal';

export interface AppMetadata {
  code: AppCode;
  title: string;
  audience: string;
  gatewayBaseUrl: string;
}
