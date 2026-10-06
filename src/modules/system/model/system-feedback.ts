import { isApiError } from '../../../shared/api/errors';
import type { MessageKey } from '../../../locales/zh-CN';

/** 保留关联标识，但不把后端堆栈或未知响应体直接显示给用户。 */
export interface SystemFeedback { key: MessageKey; correlationId?: string }

export function systemFeedback(error: unknown, write = false): SystemFeedback {
  if (!isApiError(error)) return { key: 'system.feedback.failed' };
  const key: MessageKey = error.resultUnknown && write ? 'system.feedback.unknown'
    : error.kind === 'conflict' ? 'system.feedback.conflict'
      : error.kind === 'forbidden' ? 'system.feedback.forbidden'
        : error.kind === 'validation' ? 'system.feedback.invalid'
          : error.kind === 'not_found' ? 'system.feedback.notFound'
            : 'system.feedback.failed';
  return { key, correlationId: error.correlationId };
}

export const validSortOrder = (value: number): boolean => Number.isInteger(value) && value >= 0 && value <= 1_000_000;
export const validNamespace = (value: string, owner = 'system'): boolean =>
  value.length <= 128 && /^(?:system|auth|mdm)(?:\.[a-z][a-z0-9-]*)*$/.test(value)
  && (value === owner || value.startsWith(`${owner}.`));
export const validDictionaryCode = (value: string): boolean => value.length <= 128 && /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/.test(value);
export const validItemKey = (value: string): boolean => /^[a-z][a-z0-9_-]{0,63}$/.test(value);
export const validMessageKey = (value: string): boolean => value.length <= 160 && /^[a-zA-Z][a-zA-Z0-9]*(?:[._-][a-zA-Z0-9]+)*$/.test(value);

export function validDisplayText(value: string, maxLength: number, required = true): boolean {
  const trimmed = value.trim();
  if ((required && !trimmed) || trimmed.length > maxLength) return false;
  return !Array.from(trimmed).some(char => { const code = char.codePointAt(0) ?? 0; return code <= 31 || (code >= 127 && code <= 159); });
}

export function validLocaleCode(value: string): boolean {
  try {
    const [normalized] = Intl.getCanonicalLocales(value.trim());
    return !!normalized && normalized.length <= 35 && /^[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-(?:[A-Z]{2}|[0-9]{3}))?$/.test(normalized);
  } catch { return false; }
}

/** 与 System V1 的纯文本、数字占位符限制一致；跨 Locale 一致性由后端最终裁决。 */
export function validMessageText(value: string): boolean {
  if (!validDisplayText(value, 4096) || /[<>]/.test(value)) return false;
  const placeholders = [...value.matchAll(/\{([0-9]+)\}/g)];
  return placeholders.every(match => Number(match[1]) <= 2_147_483_647) && !/[{}]/.test(value.replace(/\{[0-9]+\}/g, ''));
}

export function placeholderSet(value: string): string {
  return [...new Set([...value.matchAll(/\{([0-9]+)\}/g)].map(match => String(Number(match[1]))))].sort().join(',');
}
