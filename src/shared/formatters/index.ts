import type { SupportedLocale } from '../i18n/locale';

const RFC_3339_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const DECIMAL_STRING = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;

export interface InstantFormatOptions {
  locale: SupportedLocale;
  timeZone?: string;
  dateStyle?: 'full' | 'long' | 'medium' | 'short';
  timeStyle?: 'full' | 'long' | 'medium' | 'short';
}

export interface DecimalFormatOptions {
  locale: SupportedLocale;
  useGrouping?: boolean;
  minimumFractionDigits?: number;
}

function assertDecimalString(value: string): void {
  if (!DECIMAL_STRING.test(value)) {
    throw new TypeError(`无效 Decimal String：${value}`);
  }
}

function decimalSymbols(locale: SupportedLocale): { group: string; decimal: string; minus: string } {
  const parts = new Intl.NumberFormat(locale, { useGrouping: true }).formatToParts(-12_345.6);
  const valueOf = (type: Intl.NumberFormatPartTypes, fallback: string) =>
    parts.find((part) => part.type === type)?.value ?? fallback;
  return {
    group: valueOf('group', ','),
    decimal: valueOf('decimal', '.'),
    minus: valueOf('minusSign', '-'),
  };
}

function groupInteger(value: string, separator: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

/**
 * 格式化 RFC 3339 时间点。默认使用 UTC，调用方必须显式传入显示时区才能改变展示。
 */
export function formatInstant(value: string | Date, options: InstantFormatOptions): string {
  const serialized = value instanceof Date ? value.toISOString() : value;
  if (!RFC_3339_INSTANT.test(serialized)) {
    throw new TypeError(`时间点必须是 RFC 3339 且包含 Offset：${serialized}`);
  }
  const instant = new Date(serialized);
  if (Number.isNaN(instant.getTime())) {
    throw new TypeError(`无效时间点：${serialized}`);
  }
  return new Intl.DateTimeFormat(options.locale, {
    dateStyle: options.dateStyle ?? 'medium',
    timeStyle: options.timeStyle ?? 'medium',
    timeZone: options.timeZone ?? 'UTC',
  }).format(instant);
}

/** 使用 ECMA-402 格式化普通计数；精度敏感值必须调用 formatDecimalString。 */
export function formatNumber(
  value: number | bigint,
  locale: SupportedLocale,
  options: Intl.NumberFormatOptions = {},
): string {
  if (typeof value === 'number' && !Number.isFinite(value)) {
    throw new TypeError(`只能格式化有限数值：${value}`);
  }
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * 在不转换为 Number 的前提下展示规范 Decimal String，避免超过安全整数或小数精度丢失。
 * 本方法只补足最小小数位，不执行舍入；领域定义的展示舍入必须在调用前显式完成。
 */
export function formatDecimalString(value: string, options: DecimalFormatOptions): string {
  assertDecimalString(value);
  const symbols = decimalSymbols(options.locale);
  const negative = value.startsWith('-');
  const unsigned = negative ? value.slice(1) : value;
  const [integer, fraction = ''] = unsigned.split('.');
  const minimumFractionDigits = options.minimumFractionDigits ?? 0;
  if (!Number.isInteger(minimumFractionDigits) || minimumFractionDigits < 0) {
    throw new RangeError('minimumFractionDigits 必须是非负整数');
  }
  const normalizedFraction = fraction.padEnd(minimumFractionDigits, '0');
  const formattedInteger = options.useGrouping === false
    ? integer
    : groupInteger(integer, symbols.group);
  const sign = negative ? symbols.minus : '';
  return normalizedFraction
    ? `${sign}${formattedInteger}${symbols.decimal}${normalizedFraction}`
    : `${sign}${formattedInteger}`;
}

/** 展示数值与稳定单位 Code/本地化名称；不执行任何量纲换算。 */
export function formatUnit(
  value: string,
  unitCode: string,
  options: DecimalFormatOptions & { unitLabel?: string },
): string {
  if (!unitCode.trim()) {
    throw new TypeError('unitCode 不能为空');
  }
  return `${formatDecimalString(value, options)}\u00a0${options.unitLabel ?? unitCode}`;
}
