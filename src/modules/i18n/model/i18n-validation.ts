import { validDisplayText } from '../../../shared/management/management-feedback';

export const normalizeMessageKey = (value: string): string => value.toLowerCase();
export const validMessageKey = (value: string): boolean => value.length <= 160 && !/\s/.test(value)
  && /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(normalizeMessageKey(value));

/** 与后端纯文本、数字占位符限制一致；跨 Locale 一致性仍由后端最终裁决。 */
export function validMessageText(value: string): boolean {
  if (!validDisplayText(value, 4096) || /[<>]/.test(value)) return false;
  const placeholders = [...value.matchAll(/\{([0-9]+)\}/g)];
  return placeholders.every(match => Number(match[1]) <= 2_147_483_647) && !/[{}]/.test(value.replace(/\{[0-9]+\}/g, ''));
}

export function placeholderSet(value: string): string {
  return [...new Set([...value.matchAll(/\{([0-9]+)\}/g)].map(match => String(Number(match[1]))))].sort().join(',');
}
