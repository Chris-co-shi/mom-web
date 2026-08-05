# S05A · Catalog 契约与内存 Runtime 实施报告

> 实施日期：2026-08-05  
> 当前状态：Accepted · Chris Review 2026-08-05  
> 前置：[S05 Catalog 与 Vben 退场前置评审](S05-catalog-vben-exit-preflight-review.md)已获 Chris 批准  
> 实施范围：`@mom/system-client` Catalog DTO、严格校验器、无持久化内存状态机和单元测试

## 1. 结论

S05A 已完成。`@mom/system-client` 现在提供独立于 Preference/Dynamic I18n Runtime 的 Catalog Client 边界，能够读取单一 `mom-admin` Application 的 Runtime Catalog，并且只有当前 200 或同一进程、同一身份、同一 ETag 的 304 可以形成 `ACTIVE` 表示。

本切片没有接入 Admin Router，也没有发布 System 数据或删除 Vben。动态导航、真实 Gateway/IAM/System Catalog E2E 和 Workspace 退场仍分别属于 S05B～S05E。

## 2. 已冻结决策

Chris 已于 2026-08-05 批准：

- S05 Preflight 的 `CONDITIONAL GO`；
- P1.6 使用单一 System Catalog Application Code：`mom-admin`；
- Group Route Key：`mom-admin.people-access`、`mom-admin.security-operations`；
- Dynamic I18n 使用 `runtime` Resource 与 `mom.runtime.*` Key；
- 本轮只实施 S05A，S05B～S05E 继续独立 Review；
- Vben 删除恢复点延后到 S05D 前单独选择，不因本批准自动建立 Commit 或归档。

## 3. 实施边界

### 已完成

- Catalog 稳定只读 DTO：Application、Channel、Navigation、I18n Reference；
- 客户端静态 `CatalogContract`：Application、版本、Channel、Group/Route、Permission、Icon、I18n 和父子关系白名单；
- 严格 DTO 解析：未知字段、缺失字段、未知枚举、重复键、错误父子关系、过深/过量树均拒绝；
- 强 ETag 以及 `private, no-cache` 响应策略验证；
- `/api/iam/me` 新鲜权限与已验证 Catalog Route 的交集过滤；
- `IDLE → LOADING → ACTIVE/RESTRICTED` 状态机；
- 同一 `clientId + userId + applicationCode` 的进程内 304 重验证；
- Logout/身份变化/外部授权变化所需的 `clear()` 与 `restrict()` 生命周期入口；
- 200/304、身份隔离、权限收紧、HTTP/网络失败和注入拒绝单元测试。

### 明确未完成

- 没有调用 `router.addRoute`，现有静态任务 Route 完全未改；
- 没有将 Admin Task/Group Registry 接入 Catalog Runtime；
- 没有创建 System Catalog 或 Dynamic I18n 发布数据；
- 没有执行真实 Catalog 200/304；
- 没有定义权限变化的最终重验证时机；
- 没有修改依赖、锁文件、Workspace、构建配置、Vben 源码或开源台账。

## 4. 核心实现

### 4.1 静态契约优先

服务端 Catalog 只允许选择客户端预先声明的能力。`CatalogContract` 明确声明：

- 唯一 Application、Application Type、Route Contract Version 和 Snapshot Schema Version；
- 唯一获准 Channel；
- 每个 Group/Route 的 Key、父节点、类型、Permission、Icon 与 I18n Reference。

后端响应中的 `routeKey` 不能动态产生 Component、Path 或权限。未知节点不会被忽略后继续运行，而是使整份表示 fail closed。

### 4.2 严格数据验证

校验器按后端实际 DTO 使用字段白名单。任意额外字段都会拒绝，包括 `path`、`component`、`layout`、远程 URL 或脚本字段。它同时验证：

- Snapshot 最大 1 MiB；
- Snapshot Schema、Route Contract 和 Catalog Version；
- RFC 3339 UTC `generatedAt`；
- 导航最大深度 4、每 Channel 最大 500 节点；
- GROUP 必须有 Children，ROUTE 不得有 Children；
- 全树 Route Key 唯一，父子关系与静态契约一致；
- Permission、Icon 和 I18n Reference 与静态契约精确相等。

### 4.3 无持久化状态机

Catalog Runtime 没有 `storage` 参数，也不引用现有 `cache.ts`。当前验证表示只保存在 Runtime Closure 中：

- 200 校验成功后保留当前 ETag 与原始验证表示；
- 304 只有在当前进程存在完全匹配的身份和 ETag 时才能继续；
- 身份变化不会发送上一用户的 ETag；
- 网络、401/403/404/409/429/5xx、响应策略或 DTO 校验失败都会清除 ETag/Catalog 并进入 `RESTRICTED`；
- `clear()` 返回 `IDLE`；`restrict(reason)` 为 S05B 提供权限变化时的显式撤销入口。

公开 Snapshot 只包含验证并经新鲜 IAM 权限收紧后的表示。Catalog 权限不替代后端授权。

## 5. 文件清单

### 新增

- `packages/system-client/src/catalog-contracts.ts`：Catalog DTO、静态契约和 Runtime 状态类型；
- `packages/system-client/src/catalog-validation.ts`：严格 DTO、ETag、Cache-Control、树结构和权限过滤；
- `packages/system-client/src/catalog-runtime.ts`：无持久化 Catalog 状态机；
- `tests/unit/catalog-runtime.test.ts`：21 项 Catalog Runtime 单元测试；
- 本实施报告。

### 修改

- `packages/system-client/src/index.ts`：公开 Catalog 类型、Runtime Factory 与 Validation Error；
- `docs/frontend-architecture/README.md`；
- `docs/frontend-architecture/08-implementation-plan.md`；
- `docs/frontend-architecture/CHATGPT-HANDOFF.md`；
- S05 Preflight 状态说明。

### 删除

- 无。

## 6. 验证结果

|检查|命令|结果|
|---|---|---|
|依赖与锁文件一致性|`pnpm install --frozen-lockfile`|PASS；Already up to date|
|项目边界|`pnpm validate`|PASS；72 项边界与安全约束|
|Lint|`pnpm lint`|PASS|
|Style|`pnpm stylelint`|PASS|
|Token 漂移|`pnpm tokens:check`|PASS；4 个生成输出一致|
|全 Workspace 类型|`pnpm check:type`|PASS；三应用与相关包通过|
|Catalog 专项测试|`pnpm exec vitest run tests/unit/catalog-runtime.test.ts`|PASS；21 tests|
|全量单元/契约测试|`pnpm test`|PASS；含 31 Auth、2 Admin Runtime、11 UI Regression、39 Vitest Unit|
|组件测试|`pnpm test:component`|PASS；23 tests|
|三应用生产构建|`pnpm build`|PASS|
|Bundle 基线|`pnpm bundle:check`|PASS；公开 Source Map 0|
|Bundle 产品目标|`pnpm bundle:target`|PASS；Admin 1.3/256.0 KB，Portal 193.6/153.0 KB|

所有 pnpm 命令运行于本地 Node 25.9.0，出现预期 Engine Warning。正式 CI 证据仍要求 Node 24。

## 7. 风险与后续门禁

- 当前实现尚无真实 Catalog 数据证据，不能称为“生产集成完成”；
- S05B 必须在 Admin 应用内建立 Group/Route 静态 Registry，System Client 不得反向依赖 Admin；
- Router 激活前必须冻结 Catalog 重验证点、深链单次重匹配和动态 Route 撤销顺序；
- S05C 仍需在可重置环境先发布 Dynamic I18n，再发布 Catalog；
- Vben 删除恢复点、Workspace 零引用和 License/NOTICE 仍未完成；
- 本轮没有 E2E，因为 Router、认证流程和页面行为没有变化。

## 8. Review 与停止条件

Chris 已接受 S05A 并明确批准 S05B。该接受不等于真实 Catalog 集成完成，也不授权发布后端数据或删除 Vben。
