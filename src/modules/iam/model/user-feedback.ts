import type { MessageKey } from '../../../locales/zh-CN';
import { isApiError } from '../../../shared/api/errors';

export interface UserFeedback {
  key: MessageKey;
  correlationId?: string;
}

/** 不将服务端原始异常文本直接显示给管理员；保留关联 ID 供排障。 */
export function userFeedback(error: unknown, writing = false): UserFeedback {
  if (!isApiError(error)) return { key: writing ? 'iam.users.unknownWrite' : 'iam.users.loadFailed' };
  let key: MessageKey = 'iam.users.loadFailed';
  if (writing && (error.resultUnknown || error.kind === 'server' || error.kind === 'protocol')) key = 'iam.users.unknownWrite';
  else if (error.code === 'auth.username_conflict') key = 'iam.users.usernameConflict';
  else if (error.code === 'auth.resource_referenced') key = 'iam.users.referenced';
  else if (error.kind === 'conflict') key = 'iam.users.conflict';
  else if (error.kind === 'not_found') key = 'iam.users.notFound';
  else if (error.kind === 'forbidden') key = 'iam.users.forbidden';
  else if (error.kind === 'unauthenticated') key = 'iam.users.unauthenticated';
  else if (error.kind === 'rate_limited') key = 'iam.users.rateLimited';
  else if (error.kind === 'validation') key = 'iam.users.invalidFields';
  return { key, correlationId: error.correlationId };
}
