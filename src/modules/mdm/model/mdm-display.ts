export type TabNavigationKey = 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End';

/** 计算符合 ARIA Tabs 模式的循环键盘导航目标。 */
export function nextTabValue<T extends string>(values: readonly T[], current: T, key: TabNavigationKey): T {
  const currentIndex = Math.max(0, values.indexOf(current));
  if (key === 'Home') return values[0] ?? current;
  if (key === 'End') return values.at(-1) ?? current;
  const offset = key === 'ArrowRight' ? 1 : -1;
  return values[(currentIndex + offset + values.length) % values.length] ?? current;
}

/** 将十进制定点换算规则格式化为用户可扫描的数学表达式。 */
export function decimalRuleExpression(multiplier: string, offset: string): string {
  // 只检查尾数，不转换浮点数，避免极小的非零值下溢。
  const mantissa = offset.split(/[eE]/)[0] ?? offset;
  if (/^[+-]?0*(?:\.0*)?$/.test(mantissa)) return `x × ${multiplier}`;
  return offset.startsWith('-')
    ? `x × ${multiplier} − ${offset.replace(/^-/, '')}`
    : `x × ${multiplier} + ${offset}`;
}
