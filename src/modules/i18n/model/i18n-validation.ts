import { validDisplayText } from '../../../shared/management/management-feedback';

export const validNamespace = (value: string, owner = 'system'): boolean =>
  value.length <= 128 && /^(?:system|auth|mdm)(?:\.[a-z][a-z0-9-]*)*$/.test(value)
  && (value === owner || value.startsWith(`${owner}.`));
export const validMessageKey = (value: string): boolean => value.length <= 160 && /^[a-zA-Z][a-zA-Z0-9]*(?:[._-][a-zA-Z0-9]+)*$/.test(value);

/** 与后端纯文本、数字占位符限制一致；跨 Locale 一致性仍由后端最终裁决。 */
export function validMessageText(value: string): boolean {
  if (!validDisplayText(value, 4096) || /[<>]/.test(value)) return false;
  const placeholders = [...value.matchAll(/\{([0-9]+)\}/g)];
  return placeholders.every(match => Number(match[1]) <= 2_147_483_647) && !/[{}]/.test(value.replace(/\{[0-9]+\}/g, ''));
}

export function placeholderSet(value: string): string {
  return [...new Set([...value.matchAll(/\{([0-9]+)\}/g)].map(match => String(Number(match[1]))))].sort().join(',');
}
