import { describe, expect, it } from 'vitest';
import { i18nOwners } from './i18n-owner-registry';

describe('国际化 Owner 管理入口', () => {
  it('所有 Owner 共用唯一写权限和固定管理路径', () => {
    expect(i18nOwners.map(({ managementAuthority, managementPath }) => ({
      managementAuthority,
      managementPath,
    }))).toEqual([
      { managementAuthority: 'system:i18n:write', managementPath: '/i18n/messages' },
      { managementAuthority: 'system:i18n:write', managementPath: '/i18n/messages' },
      { managementAuthority: 'system:i18n:write', managementPath: '/i18n/messages' },
    ]);
  });
});
