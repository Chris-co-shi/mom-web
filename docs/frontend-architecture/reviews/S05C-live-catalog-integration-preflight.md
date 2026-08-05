# S05C · 真实 Catalog 发布与跨仓库集成前置核验

> 核验日期：2026-08-05  
> 当前状态：BACKEND FIX IMPLEMENTED · Live Migration Pending  
> 前置：S05A、S05B 已获 Chris 接受；Chris 已批准进入 S05C  
> 范围：Gateway、IAM、System、数据库只读状态与真实发布前置条件

## 1. 结论

S05C 当前不能进入数据发布。Gateway、IAM、System 和 PostgreSQL 均已启动，System Catalog 治理权限也已登记并授予 `admin` 的 `PLATFORM_ADMIN` 角色；但是 System Dynamic I18n Controller 要求的三个 IAM Authority 完全没有进入 IAM 权限目录：

- `system:i18n:read`；
- `system:i18n:write`；
- `system:i18n:publish`。

S05C 冻结的发布顺序是“先发布 `mom-admin/runtime` Dynamic I18n，再发布 `mom-admin` Catalog”。缺少上述 Authority 时，正式治理 API 必然拒绝创建、维护和发布 I18n Resource。Catalog 又要求发布时验证 I18n 引用，因此不能跳过第一步直接发布 Catalog。

本核验没有使用 SQL 写入、Flyway 历史修改、伪造 JWT、权限放宽或 Mock 结果绕过阻塞。

## 2. 证据

|证据|结果|
|---|---|
|Gateway `http://127.0.0.1:20000/actuator/health`|200 / UP|
|IAM `http://127.0.0.1:20100/actuator/health`|200 / UP|
|System `http://127.0.0.1:20300/actuator/health`|200 / UP|
|`mom_system.system_application`|0 行，无 Catalog Application|
|`mom_system.system_i18n_resource`|0 行，无 Dynamic I18n Resource|
|IAM System Catalog 权限|`system:catalog:read/write/publish` 存在、启用并授予 Admin|
|IAM System I18n 权限|0 行；`system:i18n:*` 未登记|
|System Controller|管理 API 分别要求 `system:i18n:read/write/publish`|
|IAM Migration|当前只存在 Catalog 权限 Seed，没有 I18n 权限 Seed|

## 3. 数据所有权与禁止绕过

- Dynamic I18n Resource、Message、Release 归 `mom_system` 所有，只能通过 System 治理 API 发布；
- Permission、Role-Permission 归 `mom_iam` 所有，应由 IAM 的权威权限基线或治理用例维护；
- 不允许直接向 `mom_system` 或 `mom_iam` 表插入测试数据；
- 不允许修改已经执行的 Flyway Migration；
- 不允许给 System Controller 临时改成 `isAuthenticated()` 或复用 Catalog Authority；
- 不允许用测试 JWT、Mock Gateway 或数据库快照宣称真实跨仓库集成完成。

## 4. 后端修正状态

Chris 已明确批准后端 IAM 权限基线修正。`mom-platform` 已新增 `V11__seed_system_i18n_permissions.sql`，登记三个内建 Dynamic I18n 权限并显式授予 `PLATFORM_ADMIN`；历史 Migration、Controller、安全规则、Token Claim 和现有 Session 均未修改。

已冻结并实现：

1. `system:i18n:read/write/publish` 分别使用 LOW/MEDIUM/HIGH Risk Level；
2. Domain/Resource 固定为 `system/i18n`，Action 与 Code 后缀一致；
3. 三项均为 `built_in=true`、`ENABLED`；
4. 默认授予内建且启用的 `PLATFORM_ADMIN`；
5. V11 只向前新增，V10→V11 与 Fresh V11 均由真实 PostgreSQL IT 验证；
6. 当前运行中的 IAM 仍停留在 Flyway V10，必须重启后才会应用 V11；用户需要重新登录取得包含新 Authority 的 Token。

验证结果：

- Maven 3.9.11 官方归档 SHA-512 校验通过；
- IAM `test-compile` 通过；
- `IamAssociationIntegrityPostgresqlIT`：3 tests，0 failure、0 error、0 skipped；
- 工程、CRUD、Schema、无业务外键和 Package Layout 静态门禁均通过；
- 全部 Surefire 未声明为通过：用户现有本地管理员恢复配置使 `IamRuntimeSecureDefaultsTest` 读到非空恢复密码，该问题与 V11 无关且本轮未修改。

## 5. 阻塞关闭后的 S05C 顺序

1. 重启 IAM，使 Flyway 把已验证的 V11 应用到当前本地库；
2. 注销并重新登录，让 Admin 获得包含新 Authority 的新 Token；
3. 通过 System 治理 API 创建并发布 `mom-admin/runtime` 的 `zh-CN/en-US` 消息；
4. 验证 Dynamic I18n 200、ETag 与 304；
5. 通过 Catalog 治理 API创建 `mom-admin`、两个 Group、六个 Route 并发布 Release；
6. 通过 Gateway 验证 Catalog 200、强 ETag、304、Authority 过滤和版本契约；
7. 在真实 Admin 浏览器验证登录、深链、侧栏、刷新和动态路由；
8. 使用新 Release 或 Kill Switch 验证停用、版本不兼容、权限撤销和失败时路由撤销；
9. 记录数据标识、Release Version 和恢复方式，不修改已发布 Release；
10. 更新 S05C 实施报告并停止等待 Chris Review。

## 6. 当前停止条件

当前停止等待 IAM 重启。重启后必须只读确认 Flyway V11、三个 Permission 和三条 `PLATFORM_ADMIN` 关系，再继续正式治理 API 发布。本状态不回退 S05B，也不授权 S05D Vben 删除。
