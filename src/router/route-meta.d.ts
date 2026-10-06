import 'vue-router';
import type { MessageKey } from '../locales/zh-CN';
import type { AuthorityMatchMode } from '../modules/auth/model/auth-permissions';

export type MomRouteModule = 'auth' | 'iam' | 'system' | 'foundation' | 'shell';

declare module 'vue-router' {
  interface RouteMeta {
    /** 仅作为调试和 Locale 资源缺失时的中文说明，不用于运行时页面标题。 */
    title: string;
    /** 稳定标题键，禁止把显示文案当作路由标识。 */
    titleKey: MessageKey;
    /** 路由所属模块，用于后续权限和分包审计。 */
    module: MomRouteModule;
    /** 是否需要认证；前端守卫只控制导航体验，不替代 Resource Server 鉴权。 */
    requiresAuth: boolean;
    /** 是否不显示在主导航中。 */
    hideInMenu?: boolean;
    /** 主导航分组的稳定标识。 */
    navigationGroup?: string;
    /** 同组菜单排序。 */
    navigationOrder?: number;
    /** 后续 IAM Slice 使用的权限码；前端过滤不替代服务端授权。 */
    permissions?: readonly string[];
    /** 权限集合匹配方式；默认 all，跨 Owner 管理入口可显式使用 any。 */
    permissionMode?: AuthorityMatchMode;
  }
}

export {};
