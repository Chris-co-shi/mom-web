import type { MessageKey } from '../../../locales/zh-CN';
import { isApiError } from '../../../shared/api/errors';

export interface RoleFeedback { key: MessageKey; correlationId?: string }

/** 仅显示稳定错误语义，不回显服务端原始异常。 */
export function roleFeedback(error: unknown, writing = false): RoleFeedback {
  if (!isApiError(error)) return { key: writing ? 'iam.roles.unknownWrite' : 'iam.roles.loadFailed' };
  let key: MessageKey = 'iam.roles.loadFailed';
  if (writing && (error.resultUnknown || error.kind === 'server' || error.kind === 'protocol')) key = 'iam.roles.unknownWrite';
  else if (error.code === 'auth.role_code_conflict') key = 'iam.roles.codeConflict';
  else if (error.code === 'auth.resource_referenced') key = 'iam.roles.referenced';
  else if (error.kind === 'conflict') key = 'iam.roles.conflict';
  else if (error.kind === 'not_found') key = 'iam.roles.notFound';
  else if (error.kind === 'forbidden') key = 'iam.roles.forbidden';
  else if (error.kind === 'unauthenticated') key = 'iam.roles.unauthenticated';
  else if (error.kind === 'rate_limited') key = 'iam.roles.rateLimited';
  else if (error.kind === 'validation') key = 'iam.roles.invalidFields';
  return { key, correlationId: error.correlationId };
}
