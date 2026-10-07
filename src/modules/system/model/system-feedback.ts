export { managementFeedback as systemFeedback, validDisplayText } from '../../../shared/management/management-feedback';
export type { ManagementFeedback as SystemFeedback } from '../../../shared/management/management-feedback';

export const validSortOrder = (value: number): boolean => Number.isInteger(value) && value >= 0 && value <= 1_000_000;
export const validDictionaryCode = (value: string): boolean => value.length <= 128 && /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/.test(value);
export const validItemKey = (value: string): boolean => /^[a-z][a-z0-9_-]{0,63}$/.test(value);

export function validLocaleCode(value: string): boolean {
  try {
    const [normalized] = Intl.getCanonicalLocales(value.trim());
    return !!normalized && normalized.length <= 35 && /^[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-(?:[A-Z]{2}|[0-9]{3}))?$/.test(normalized);
  } catch { return false; }
}
