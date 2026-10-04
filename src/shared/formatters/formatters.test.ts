import { describe, expect, it } from 'vitest';
import { formatDecimalString, formatInstant, formatNumber, formatUnit } from './index';

describe('formatters', () => {
  it('保持超长 Decimal String 的全部精度', () => {
    expect(formatDecimalString('12345678901234567890.1250', { locale: 'en-US' }))
      .toBe('12,345,678,901,234,567,890.1250');
  });

  it('只补足最小小数位且不擅自舍入', () => {
    expect(formatDecimalString('-12.3', { locale: 'zh-CN', minimumFractionDigits: 4 }))
      .toBe('-12.3000');
  });

  it.each(['01.2', '+1', '1e3', '1,000', 'NaN'])('拒绝非规范 Decimal String：%s', (value) => {
    expect(() => formatDecimalString(value, { locale: 'zh-CN' })).toThrow(TypeError);
  });

  it('使用显式 IANA 时区展示 RFC 3339 时间点', () => {
    expect(formatInstant('2026-10-04T00:00:00Z', {
      locale: 'en-US',
      timeZone: 'Asia/Shanghai',
    })).toBe('Oct 4, 2026, 8:00:00 AM');
  });

  it('拒绝没有 Offset 的本地时间', () => {
    expect(() => formatInstant('2026-10-04T08:00:00', { locale: 'zh-CN' })).toThrow(TypeError);
  });

  it('区分普通计数与精度敏感值', () => {
    expect(formatNumber(12_345, 'en-US')).toBe('12,345');
    expect(() => formatNumber(Number.POSITIVE_INFINITY, 'en-US')).toThrow(TypeError);
    expect(formatUnit('1250.500', 'kg', { locale: 'en-US' })).toBe('1,250.500\u00a0kg');
  });
});
