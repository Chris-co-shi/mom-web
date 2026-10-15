# Web-P2 账户自助收口记录

- 日期：2026-10-04。
- 功能状态：用户已检查并确认完成。
- 验证状态：Auth 定向 Reactor 与 Web 门禁通过；整个变更范围门禁仍存在 Gateway 既有配置断言失败，不能描述为全仓通过。

## 当前契约

浏览器统一走 Gateway `/auth/**`，StripPrefix=1 后由 Auth Controller 接收。

| 接口 | 入参 | 成功 Result.data |
|---|---|---|
| GET /auth/me | Bearer Token | user + authorization + session |
| PUT /auth/me/profile | displayName、version | 同上，资料和版本已更新 |
| PUT /auth/me/password | currentPassword、newPassword、version | 同上，版本已更新 |
| PUT /auth/users/{id}/password | newPassword、version | 保持现有管理员重置契约，需要 auth:user:write |

`user` 为 `{userId: String, username, displayName, version}`；`authorization` 为 `{authorities: []}`；
`session` 为 `{expiresAt}`。用户资料查数据库，权限和有效期来自已验证 Token，二者不混淆。
自助接口的目标只来自认证主体，不接受 body 指定目标；用户名、enabled、角色不允许自助修改。
显示名必须非空且不超过 200 字符；新密码沿用 8～128 字符；密码原文不规范化。
原密码错误为 400 / auth.current_password_invalid，不误触发 401 清理；旧版本为 409。

## IMPLEMENTATION REVIEW

1. 实现：账户页、顶部名称、个人资料编辑、原密码确认改密及嵌套 /me 契约。
2. 核心调用链：AccountPage → auth-session → auth-api → 统一请求层 → Gateway → AuthenticationController → UserApplication → UserMapper。
3. 数据写入：仅 `mom_auth.auth_user` 的显示名或密码摘要，以及既有审计/版本字段；无新字段或 Migration。
4. 事务入口：`UserApplication.updateOwnProfile/changeOwnPassword`，Spring public 代理、REQUIRED、本地数据库默认隔离；摘要比较与最终 CAS 使用同一版本。无事务内远程调用，无 Outbox/Inbox/Seata。
5. 约束：Request 校验长度；Controller 固定本人身份；Application 校验原密码、版本和 affected rows；Redis 不参与资料写事务。
6. 失败：异常回滚，不自动重试写请求；前端保留名称草稿，409 或结果未知时要求主动刷新核对；密码请求结束即清空输入。
7. 会话：sessionStorage 只保留凭证、类型和有效期；资料与权限重新从服务端获取，旧响应不会复活已退出会话；迟到的低版本资料不覆盖高版本。
8. 未做：邮箱、手机号、头像、System 偏好、忘记密码自助找回、注销全部 Token、管理员重置页面。后者属于下一用户管理 Slice。
9. 建议重点 Review：Controller 本人身份来源；UserApplication 原密码与 CAS；响应资料/权限分区；auth-session 恢复与迟到响应；AccountPage 冲突/未知结果处理。
10. 主要风险：资料实时读取增加数据库依赖；V1 改密和停用不撤销已有 Token；姓名/密码共用用户版本会发生合理冲突。

## 文件清单（本次范围）

后端修改：UserApplication.java、AuthErrorCode.java、AuthExceptionHandler.java、AuthenticationController.java、
CurrentSessionResponse.java、AuthenticationControllerTest.java、UserApplicationTest.java、AuthExceptionHandlerTest.java、AuthManagementPostgresqlIT.java。

后端新增：controller/request/UpdateOwnProfileRequest.java、ChangeOwnPasswordRequest.java；controller/CurrentUserControllerTest.java（测试源码）。

前端修改：MainLayout.vue；route-names.ts、route-registry.ts；auth-api.ts/test；auth-session.ts/test；
auth-permissions.test.ts、auth-guard.test.ts；zh-CN.ts、en-US.ts；vitest.config.ts；本文及架构、计划、S02 审计记录。

前端新增：modules/auth/pages/AccountPage.vue、account.css、AccountPage.test.ts。
本次无删除文件。用户已有的 Test.java 暂存删除、Gateway 配置以及上一 Slice 的变更均保留。

## 验证证据

Maven 均通过 `scripts/codex-mvn-test.sh` 执行，使用本机已安装的 Maven 3.9.11：

- `-pl mom-auth-platform/mom-auth-server -am test-compile`：通过。
- `-pl mom-auth-platform/mom-auth-server -am -Dtest=UserApplicationTest,AuthenticationControllerTest,AuthExceptionHandlerTest -Dsurefire.failIfNoSpecifiedTests=false test`：通过。
- `-pl mom-auth-platform/mom-auth-server -am verify`：通过；AuthManagementPostgresqlIT 6 项通过，0 跳过。覆盖真实 Flyway、持久化、版本推进、失败不改库、管理员重置后旧版本拒绝。
- `pnpm verify`：lint、typecheck、11 文件 43 项测试、生产构建通过；账户页测试使用真实 TDesign 控件。
- `bash scripts/codex-verify-changed.sh`：静态基线通过；Gateway 的 MomGatewayApplicationTest 第 50 行预期空 Redis 密码，与工作区既有配置不符而失败。未改配置、未放宽断言。包装脚本摘要误引用历史 Outbox 报告，以本次完整日志末尾为准。
- 本次真实联调：Vite → Gateway → Auth 的新 /me 结构已验证；无管理权限的临时账号成功登录并进入账户页，顶部展示显示名。用户随后自行验收确认功能完成；不能将本次浏览器检查表述为所有写分支 E2E 均由自动化验证。

日志位于 mom-platform/.codex/runtime/logs/：maven-20261004-135620-79328.log、maven-20261004-140113-80166.log、
maven-20261004-140245-80448.log、maven-20261004-140651-81554.log。

## 未完成清理

本次临时账号 `web.self.1791093977365`（ID `2106626945701810177`）清理时管理员登录返回 401，未执行删除。
不要重置用户的管理员密码来完成清理；待有效管理员身份可用后按精确 ID 与用户名核对并逻辑删除。

## DESIGN PRESSURE TEST

- A（当前必须）：只能改本人、不能自提权、错误原密码不写库、并发重置不能被旧版本覆盖。已有 Controller/Application/真实数据库证据。
- B（V1 接受）：改密/停用后旧 Token 有效到注销或 TTL；数据库不可用时 /me 无法恢复完整资料；同一用户资料/密码共享版本。
- C（当前过度设计）：新增会话平台、跨服务事务、独立资料微服务、事件同步框架。当前不引入。

下一步：Web-P2-S03 用户管理真实页面，之后角色、Permission 和关系分配，再进入 System、MDM。
