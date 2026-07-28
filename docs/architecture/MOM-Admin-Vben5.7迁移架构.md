# MOM Admin Vben 5.7 迁移架构

- 状态：Current / Accepted
- 版本基线：Vue Vben Admin `v5.7.0`
- 范围：仅 `apps/mom-admin`
- 认证权威：[ADR-009](../adr/ADR-009-P1.5-Web第一方认证运行时.md)
- 源码策略：[ADR-010](../adr/ADR-010-MOM-Admin-Vben5.7源码快照.md)

## 1. 目标

把 MOM Admin 的手写应用壳迁移到 Vben 的 Bootstrap、BasicLayout、菜单、页签、Preferences、Locale 和路由生成管线，同时保留现有第一方认证、IAM 管理 API、Permission、Factory、错误处理和业务 URL。

## 2. 不变边界

- Client ID：`mom-admin-web`
- user_type：`INTERNAL`
- 登录接口：`/api/iam/auth/*`
- 权限上下文：`GET /api/iam/me`
- 后端最终授权：MOM Gateway 与业务服务
- 六个 IAM 管理 URL：保持现有路径，不改成 Vben 示例地址
- Token：只由 `@mom/first-party-auth` 管理，不进入 Vben Store 或 Preferences

## 3. 应用分层

| 层 | 职责 |
|---|---|
| Vben 快照 | Layout、Menu、Tabs、Preferences、Locale、Access Route 工具 |
| MOM Bootstrap | 初始化 Locale、Pinia/Vben Store、Router、Preferences 与 Ant Design Vue |
| MOM Runtime | 第一方认证、`/api/iam/me`、Factory、IAM Admin Client |
| MOM Access Adapter | Permission 到路由/菜单的转换、403 后权限同步 |
| MOM Views | 登录、首次改密、六个 IAM 管理页面、403/404/菜单加载失败 |

## 4. 登录与默认跳转

1. 登录页使用 Vben 登录页结构与 MOM 品牌。
2. 只保留账号和密码，不提供验证码、短信或手机号入口。
3. 登录成功优先恢复经过站内路径校验的原访问地址。
4. 原地址不存在或无权限时，进入排序后的第一个可访问菜单。
5. `/` 使用同一规则。
6. 没有可访问菜单时进入 403 页面，不循环跳转。

## 5. 菜单与国际化

当前后端没有动态菜单接口，本轮使用稳定菜单注册表结合 `/api/iam/me` Permission 生成 Vben 路由与菜单。

- 使用稳定 `menuCode` 映射 `zh-CN` / `en-US` 文案。
- 未知编码回退服务端标题；开发环境记录告警。
- 预留 `MenuSource` 适配端口，禁止虚构 `/menus` API。
- 切换语言时更新菜单、页签、页面标题和操作文案。
- 后端未来能力见 [IAM 菜单国际化待办](../backlog/iam-menu-internationalization.md)。

## 6. Preferences

- 开放完整 Vben Preferences 面板。
- 主题、明暗、布局、侧栏和页签本轮保存到当前浏览器。
- Vben Access Store 不持久化 Token 或 Permission。
- 预留未来后端同步适配层，但本轮不调用不存在的 API。
- 后端能力见 [IAM 用户偏好待办](../backlog/iam-user-preferences-backend.md)。

## 7. 401 与 403

### 401

- 独立执行 Access Token Single Flight Refresh。
- 每个原业务请求最多重试一次。
- Refresh 失败后清理会话并进入登录页。

### 403

1. 首次 403 触发一次权限与菜单 Single Flight 同步。
2. 同一请求链最多同步一次。
3. `GET`、`HEAD` 同步成功后自动重试一次。
4. `POST`、`PUT`、`PATCH`、`DELETE` 不自动重试，提示“权限已发生变化，请确认后重新操作”。
5. 只读请求重试后仍为 403，进入无权限页，不再同步。
6. 权限撤销后立即更新菜单、路由和页签；当前页失效时关闭或跳转。

## 8. 菜单加载异常

- 网络、超时、IAM 5xx：保留登录状态，显示可重试失败页。
- 失败页提供“重新加载菜单”和“退出登录”。
- 重试成功后恢复原目标地址。
- 不使用固定兜底菜单或持久化旧权限快照。
- 仅认证失效且刷新失败时返回登录页。

## 9. URL 兼容

- 保留现有业务 URL、查询参数、刷新与书签。
- 旧地址确需调整时使用显式重定向。
- 未授权进入 403，不存在进入 404。
- `redirect` 仅接受 MOM Admin 站内路径，防止开放重定向。

## 10. 验收

- 中英文覆盖登录、菜单、页签、页面、操作和提示。
- Preferences 可用且不持久化 Token/Permission。
- 六个 IAM 权限路由按 Permission Fail Closed。
- 401/403 分流与重试上限通过自动测试。
- 冻结安装、边界校验、类型检查、测试和三个应用构建通过。
