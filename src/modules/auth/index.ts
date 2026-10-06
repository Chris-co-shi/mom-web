/** 供其他业务模块使用的认证公开入口，避免读取 Auth 内部实现路径。 */
export { hasAuthority, hasAuthorities } from './model/auth-permissions';
export { useAuthSession } from './model/auth-session';
export { default as AuthorityGuard } from './components/AuthorityGuard.vue';
