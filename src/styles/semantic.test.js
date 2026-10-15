import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const semanticCss = readFileSync('src/styles/semantic.css', 'utf8');

function zIndex(token) {
  const match = semanticCss.match(new RegExp(`--${token}:\\s*(\\d+)`));
  if (!match?.[1]) throw new Error(`缺少层级 Token：${token}`);
  return Number(match[1]);
}

describe('overlay z-index contract', () => {
  it('模态框内通过 Portal 渲染的选择器和菜单必须高于 Dialog 内容与遮罩', () => {
    expect(zIndex('mom-z-modal')).toBeGreaterThan(zIndex('mom-z-overlay'));
    expect(zIndex('mom-z-popover')).toBeGreaterThan(zIndex('mom-z-modal'));
    expect(zIndex('mom-z-notification')).toBeGreaterThan(zIndex('mom-z-popover'));
  });
});
