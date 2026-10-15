import { isApiError } from '../api/errors';
import type { MessageKey } from '../../locales/zh-CN';

/** 管理端反馈只向 UI 暴露稳定文案 Key 与关联标识，不展示后端异常正文。 */
export interface ManagementFeedback { key: MessageKey; correlationId?: string }

export function managementFeedback(error: unknown, write = false): ManagementFeedback {
  if (!isApiError(error)) return { key: 'system.feedback.failed' };
  const key: MessageKey = error.resultUnknown && write ? 'system.feedback.unknown'
    : error.kind === 'conflict' ? 'system.feedback.conflict'
      : error.kind === 'forbidden' ? 'system.feedback.forbidden'
        : error.kind === 'validation' ? 'system.feedback.invalid'
          : error.kind === 'not_found' ? 'system.feedback.notFound'
            : 'system.feedback.failed';
  return { key, correlationId: error.correlationId };
}

export function validDisplayText(value: string, maxLength: number, required = true): boolean {
  const trimmed = value.trim();
  if ((required && !trimmed) || trimmed.length > maxLength) return false;
  return !Array.from(trimmed).some(char => { const code = char.codePointAt(0) ?? 0; return code <= 31 || (code >= 127 && code <= 159); });
}
