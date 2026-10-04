import { getAuthorities } from './auth-session';

export type AuthorityMatchMode = 'all' | 'any';

/** 判断当前 Token 快照是否包含指定权限；这里只控制前端体验，不替代服务端授权。 */
export function hasAuthority(authority: string): boolean {
  return authority.length > 0 && getAuthorities().includes(authority);
}

/**
 * 按 all/any 语义判断权限集合。
 * 空权限集合不构成访问限制，因此无论匹配模式都返回 true。
 */
export function hasAuthorities(
  required: readonly string[] | undefined,
  mode: AuthorityMatchMode = 'all',
): boolean {
  if (!required || required.length === 0) return true;
  return mode === 'any'
    ? required.some(hasAuthority)
    : required.every(hasAuthority);
}
