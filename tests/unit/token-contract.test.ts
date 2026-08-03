import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { getMomAntdThemeTokens } from '../../packages/design-tokens/src/generated/antd-theme';

const root = resolve(import.meta.dirname, '../..');

describe('MOM Token Contract', () => {
  it('保留四层来源和两种主题，Portal 不暴露 Compact', async () => {
    const source = JSON.parse(
      await readFile(resolve(root, 'packages/design-tokens/tokens/mom.tokens.json'), 'utf8'),
    ) as Record<string, unknown> & {
      channel: { PORTAL: Record<string, unknown> };
      semantic: Record<string, unknown>;
    };

    expect(source).toHaveProperty('primitive');
    expect(source).toHaveProperty('semantic');
    expect(source).toHaveProperty('component');
    expect(source).toHaveProperty('channel');
    expect(Object.keys(source.semantic).sort()).toEqual(['DARK', 'LIGHT']);
    expect(source.channel.PORTAL).toHaveProperty('COMFORTABLE');
    expect(source.channel.PORTAL).not.toHaveProperty('COMPACT');
  });

  it('四个生成物都声明权威来源且不存在手工输入标记', async () => {
    const files = ['tokens.css', 'tailwind.css', 'antd-theme.ts', 'tokens.ts'];
    const contents = await Promise.all(
      files.map((file) => readFile(resolve(root, 'packages/design-tokens/src/generated', file), 'utf8')),
    );

    expect(contents.every((content) => content.includes('Generated from tokens/mom.tokens.json'))).toBe(true);
    expect(contents.every((content) => content.includes('Do not edit'))).toBe(true);
  });

  it('Antdv Adapter 按主题与渠道密度返回确定值', () => {
    expect(getMomAntdThemeTokens('LIGHT', 'ADMIN', 'COMFORTABLE').token.controlHeight).toBe(36);
    expect(getMomAntdThemeTokens('DARK', 'ADMIN', 'COMPACT').token.controlHeight).toBe(32);
    expect(getMomAntdThemeTokens('DARK', 'PORTAL', 'COMPACT').token.controlHeight).toBe(44);
    expect(getMomAntdThemeTokens('DARK', 'PORTAL', 'COMPACT').token.colorSuccess).toBe('#34D399');
  });
});
