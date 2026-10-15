import type { MessageKey } from '../../../locales/zh-CN';
import { isApiError } from '../../../shared/api/errors';

export interface PermissionFeedback { key: MessageKey; correlationId?: string }

/** 仅显示稳定错误语义，不回显服务端原始异常。 */
export function permissionFeedback(error: unknown, writing = false): PermissionFeedback {
  if (!isApiError(error)) return { key: writing ? 'iam.permissions.unknownWrite' : 'iam.permissions.loadFailed' };
  let key: MessageKey = 'iam.permissions.loadFailed';
  if (writing && (error.resultUnknown || error.kind === 'server' || error.kind === 'protocol')) key = 'iam.permissions.unknownWrite';
  else if (error.code === 'auth.permission_code_conflict') key = 'iam.permissions.codeConflict';
  else if (error.code === 'auth.resource_code_conflict') key = 'iam.resources.codeConflict';
  else if (error.code === 'auth.resource_disabled') key = 'iam.permissions.resourceDisabled';
  else if (error.code === 'auth.resource_invalid_code') key = 'iam.permissions.invalidCode';
  else if (error.code === 'auth.resource_referenced') key = 'iam.permissions.referenced';
  else if (error.kind === 'conflict') key = 'iam.permissions.conflict';
  else if (error.kind === 'not_found') key = 'iam.permissions.notFound';
  else if (error.kind === 'forbidden') key = 'iam.permissions.forbidden';
  else if (error.kind === 'unauthenticated') key = 'iam.permissions.unauthenticated';
  else if (error.kind === 'rate_limited') key = 'iam.permissions.rateLimited';
  else if (error.kind === 'validation') key = 'iam.permissions.invalidFields';
  return { key, correlationId: error.correlationId };
}
