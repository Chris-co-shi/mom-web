import { describe, expect, it } from 'vitest';
import { browserGatewayContexts } from './vite.config';

describe('Vite Gateway proxy contract', () => {
  it('浏览器 /auth、/system、/mdm 原样代理，不经过 /api 前缀重写', () => {
    expect(browserGatewayContexts).toEqual(['/auth', '/system', '/mdm']);
  });

  it('不能再通过旧的 /api 入口访问业务服务', () => {
    expect(browserGatewayContexts).not.toContain('/api');
  });
});
