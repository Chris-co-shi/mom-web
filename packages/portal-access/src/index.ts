export type PortalKind = 'supplier' | 'customer';

export interface PortalDefinition {
  kind: PortalKind;
  clientId: 'mom-supplier-web' | 'mom-customer-web';
  userType: 'SUPPLIER' | 'CUSTOMER';
  partyType: 'SUPPLIER' | 'CUSTOMER';
  title: string;
}

export interface PortalAccessContext {
  clientId: string;
  userType: string;
  partyType: string | null;
  partyId: string | null;
  factoryIds: readonly string[];
  currentFactoryId: string | null;
  permissions: readonly string[];
}

export const supplierPortal: PortalDefinition = {
  kind: 'supplier', clientId: 'mom-supplier-web', userType: 'SUPPLIER',
  partyType: 'SUPPLIER', title: '供应商协同门户',
};

export const customerPortal: PortalDefinition = {
  kind: 'customer', clientId: 'mom-customer-web', userType: 'CUSTOMER',
  partyType: 'CUSTOMER', title: '客户协同门户',
};

export class PortalBoundaryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PortalBoundaryError';
  }
}

export function assertPortalBoundary(context: PortalAccessContext, definition: PortalDefinition): void {
  if (context.clientId !== definition.clientId || context.userType !== definition.userType) {
    throw new PortalBoundaryError('当前 Token 不属于该门户入口');
  }
  if (context.partyType !== definition.partyType || !context.partyId?.trim()) {
    throw new PortalBoundaryError('IAM 未返回与门户匹配的固定 Party Binding');
  }
  if (context.currentFactoryId && !context.factoryIds.includes(context.currentFactoryId)) {
    throw new PortalBoundaryError('当前 Factory 已不在用户授权范围内');
  }
}

export interface PortalFeature {
  key: string;
  route: string;
  requiredPermission: string;
  allowedClientId: PortalDefinition['clientId'];
  allowedUserType: PortalDefinition['userType'];
  allowedPartyType: PortalDefinition['partyType'];
  availability: 'planned' | 'enabled';
  title: string;
  description: string;
}

export function portalFeatures(kind: PortalKind): PortalFeature[] {
  const supplier = [
    ['delivery', '/deliveries', 'wms:delivery:read', '送货协同', '送货计划、预约与到货状态'],
    ['inspection', '/incoming-inspections', 'qms:incoming-inspection:read', '来料质量', '来料检验、退货与质量协同'],
    ['documents', '/documents', 'integration:document:read', '业务单据', '仅查看当前 Supplier 的业务单据'],
  ] as const;
  const customer = [
    ['orders', '/orders', 'mes:customer-order:read', '订单协同', '订单、交期与生产进度'],
    ['shipping', '/shipments', 'wms:shipment:read', '发运跟踪', '发运计划与物流状态'],
    ['quality', '/quality-feedback', 'qms:quality-feedback:read', '质量反馈', '仅查看当前 Customer 的质量反馈'],
  ] as const;
  const definition = kind === 'supplier' ? supplierPortal : customerPortal;
  return (kind === 'supplier' ? supplier : customer).map(([
    key, route, requiredPermission, title, description,
  ]) => ({
    key, route, requiredPermission, title, description,
    allowedClientId: definition.clientId,
    allowedUserType: definition.userType,
    allowedPartyType: definition.partyType,
    availability: 'planned',
  }));
}

export function isPortalFeatureAvailable(
  feature: PortalFeature,
  context: PortalAccessContext,
): boolean {
  return feature.availability === 'enabled'
    && feature.allowedClientId === context.clientId
    && feature.allowedUserType === context.userType
    && feature.allowedPartyType === context.partyType
    && context.permissions.includes(feature.requiredPermission);
}

export interface PortalErrorView {
  kind: 'entry_mismatch' | 'forbidden' | 'not_found' | 'conflict' | 'rate_limited' | 'unavailable' | 'unknown_result';
  title: string;
  message: string;
  retryable: boolean;
  correlationId?: string;
}

export function describePortalError(error: unknown): PortalErrorView {
  const value = error as { name?: string; status?: number; message?: string; correlationId?: string };
  if (value?.name === 'PortalBoundaryError' || value?.name === 'AppEntryMismatchError' || value?.name === 'FactoryScopeError') {
    return errorView('entry_mismatch', '门户入口或授权范围不匹配', value.message || '请重新登录正确门户。', false, value);
  }
  if (value?.status === 403) return errorView('forbidden', '没有访问权限', '服务端拒绝该操作，门户不会尝试刷新 Token。', false, value);
  if (value?.status === 404) return errorView('not_found', '对象不存在或不可访问', '门户不会推断对象是否属于其他 Party 或 Factory。', false, value);
  if (value?.status === 409) return errorView('conflict', '状态已变化', '请重新读取当前状态后再决定，不自动重放命令。', true, value);
  if (value?.status === 429) return errorView('rate_limited', '请求过于频繁', '请按服务端提示稍后显式重试。', true, value);
  if ((value?.status ?? 0) >= 500) return errorView('unavailable', '服务暂时不可用', '查询可以显式重试，业务命令不会自动重放。', true, value);
  if (value?.name === 'MomNetworkError') return errorView('unknown_result', '网络中断，结果未知', '请先查询最终状态，不要重复提交。', true, value);
  return errorView('unavailable', '门户初始化失败', value?.message || '请稍后重试或重新登录。', true, value);
}

function errorView(
  kind: PortalErrorView['kind'], title: string, message: string, retryable: boolean,
  value: { correlationId?: string },
): PortalErrorView {
  return { kind, title, message, retryable, correlationId: value.correlationId };
}
