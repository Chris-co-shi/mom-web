import { describe, expect, it } from 'vitest';
import { browserGatewayContexts, gatewayDocumentBypass } from './vite.config';

describe('Vite Gateway proxy contract', () => {
  it('浏览器 /auth、/system、/mdm 原样代理，不经过 /api 前缀重写', () => {
    expect(browserGatewayContexts).toEqual(['/auth', '/system', '/mdm']);
  });

  it('不能再通过旧的 /api 入口访问业务服务', () => {
    expect(browserGatewayContexts).not.toContain('/api');
  });
});

describe('页面深链接与 Gateway API 的同前缀处理', () => {
  it('HTML 页面导航返回 SPA，API JSON 与 SSE 继续通过 Gateway', () => {
    expect(gatewayDocumentBypass({ method: 'GET', headers: { accept: 'text/html,application/xhtml+xml' } })).toBe('/index.html');
    expect(gatewayDocumentBypass({ method: 'GET', headers: { accept: 'application/json' } })).toBeUndefined();
    expect(gatewayDocumentBypass({ method: 'GET', headers: { accept: 'text/event-stream' } })).toBeUndefined();
    expect(gatewayDocumentBypass({ method: 'POST', headers: { accept: 'text/html' } })).toBeUndefined();
  });
});
