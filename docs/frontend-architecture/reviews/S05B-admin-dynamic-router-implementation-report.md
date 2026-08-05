# S05B · Admin Catalog 动态 Router 实施报告

> 实施日期：2026-08-05  
> 当前状态：Accepted · Chris Review 2026-08-05  
> 前置：S05 Preflight 与 S05A 已获 Chris 批准  
> 实施范围：Admin 静态 Catalog Registry、动态任务 Route、Guard、导航交集与 Mock E2E

## 1. 结论

S05B 已完成。MOM Admin 的 Core Route 继续静态存在，六个任务 Route 不再随应用启动注册；它们只有在 S05A Catalog Runtime 得到当前 200 或同一身份、同一 ETag 的 304，并通过静态 Registry、IAM 新鲜权限和应用契约验证后，才作为 `Root` 子路由动态加入。

Catalog 请求、DTO、版本、身份或路由激活失败时，应用先执行全部 Vue Router 撤销句柄，再进入静态 `/catalog-error`。没有静态任务菜单或旧 Catalog 降级路径。

本切片使用 Mock Catalog 完成浏览器回归，但没有创建真实 System 数据。因此 S05B 仍不等于生产集成完成；当前真实环境在没有已发布 `mom-admin` Catalog 时会按设计进入 Catalog Error，必须由 S05C 完成受控发布与跨仓库 E2E。

## 2. 实施边界

### 已完成

- 冻结单一 `mom-admin` Application 的应用内 Catalog Contract；
- 为两个任务域增加 Group Route Key 和 `mom.runtime.*` I18n Reference；
- 从静态 `routes.ts` 移除六个任务 Route，保留所有 Core Route；
- 用 `router.addRoute('Root', ...)` 和返回的撤销句柄管理当前任务集合；
- Catalog 表示变化时完整替换 Route 集合；Logout、401、显式限制和失败时全部撤销；
- 侧栏、默认落点、Redirect、Permission Guard 使用 IAM Permission 与活动 Catalog Route 的交集；
- 首次深链先激活 Catalog，再只重匹配原始目标一次；
- 每次任务导航、权限刷新、Factory 切换和浏览器恢复前台时重新验证 Catalog；
- 请求期间用户、Factory 或权限发生变化时拒绝旧结果并针对新上下文重验；
- `/catalog-error` 提供显式重新验证入口；
- 更新 Unit、UI Regression、Mock E2E 和静态治理门禁。

### 明确未完成

- 没有发布 `mom-admin/runtime` Dynamic I18n；
- 没有发布 System Catalog Application/Navigation/Release；
- 没有使用真实 Gateway/IAM/System 取得 Catalog 200/304；
- 没有删除现有静态 Task Registry，它仍是唯一可执行白名单；
- 没有删除 Vben、修改 Workspace/Lockfile 或调整开源台账；
- 没有改变后端权限、Token、Session、DTO 或数据库。

## 3. 路由生命周期

### 3.1 静态 Core Route

以下 Route 始终存在，不依赖 Catalog：

- Login、Password Change；
- 403、404；
- Menu Error、Runtime Error、Catalog Error；
- Personal Settings；
- Admin Root/Shell。

### 3.2 动态任务 Route

动态集合只来自三者交集：

```text
System Catalog 已验证 routeKey
          ∩
Admin 静态 Task/Group Registry
          ∩
/api/iam/me 当前 Permission
```

Catalog 不拥有 Path、Component、Route Name 或 Permission 定义。`createAdminTaskRoute` 只从本地 Registry 创建 Vue Route，System DTO 不能生成远程组件。

### 3.3 深链与失败

首次访问 `/iam/users` 时，静态 Router 会暂时匹配 404。Guard 完成 Catalog 激活后，仅当该路径对应本地任务、用户拥有 Permission 且活动 Catalog 包含其 Route Key 时，才对原始 Path/Query/Hash执行一次 Replace。未知路径保持 404；已知但无权限进入 403；用户有 IAM Permission 但 Catalog 未激活该任务时进入 Catalog Error。

任何 Catalog 失败都会：

1. 清除当前动态 Route；
2. 清除进程内 Catalog 表示和 ETag；
3. 保留 Core Route；
4. 进入 `/catalog-error`；
5. 禁止继续显示旧侧栏或旧任务页面。

## 4. 重验证策略

P1.6 冻结以下触发点：

- 认证用户首次进入任务、根路径或登录后 Redirect；
- 每次任务导航和未知深链解析；
- `@mom/api-client` 403 单飞完成 `/api/iam/me` 权限刷新后；
- Factory Context 切换后；
- 浏览器 `visibilitychange` 恢复为 `visible` 时。

Catalog 使用条件 GET，因此正常导航通常得到 304。若请求期间 User、Factory 或 Permission Fingerprint 变化，旧请求不得写入 Router；Controller 先 fail closed，再为新上下文重新发起验证。

## 5. 文件清单

### 新增

- `apps/mom-admin/src/router/catalog-contract.ts`；
- `apps/mom-admin/src/router/catalog.ts`；
- `apps/mom-admin/src/router/dynamic-task-routes.ts`；
- `tests/unit/admin-dynamic-routes.test.ts`；
- 本实施报告。

### 修改

- `apps/mom-admin/src/router/task-contract.ts`；
- `apps/mom-admin/src/router/registry.ts`；
- `apps/mom-admin/src/router/routes.ts`；
- `apps/mom-admin/src/router/index.ts`；
- `apps/mom-admin/src/router/guard.ts`；
- `apps/mom-admin/src/router/access.ts`；
- `apps/mom-admin/src/runtime.ts`、`bootstrap.ts`；
- Admin Shell、Login、Password Change、Menu Error、Catalog Error；
- Admin Registry Unit、UI Regression、Playwright Fixture/E2E；
- `scripts/validate.mjs`；
- 前端架构 README、实施计划和跨工具交接。

### 删除

- 无。静态 Task Registry 是安全白名单，不能随静态 Route 退出而删除。

## 6. 验证证据

|检查|结果|
|---|---|
|Admin Catalog/Registry/动态 Route 专项 Unit|PASS；27 tests（含 S05A Catalog Runtime）|
|Admin UI Regression|PASS；11 tests|
|Admin Mock E2E|PASS；12 passed / 3 渠道跳过|
|首次深链重匹配|PASS；`/iam/users` 从静态 404 转为已验证动态 Route|
|条件 GET|PASS；任务导航观察到 `If-None-Match: "e2e-catalog-1"` 与 304|
|权限拒绝|PASS；未授权 `/iam/audit` 进入 403且侧栏无任务|
|Catalog 503|PASS；撤销任务并进入静态 Catalog Error，Admin Sidebar 不存在|
|Factory 重验证|PASS；F02 Context 重新读取并保持授权路径|
|`pnpm check`|PASS；Validate 78 项、Auth Contract 31 tests、Admin Runtime 2 tests、Unit 42 tests、Component 23 tests|
|三应用完整 E2E|PASS；30 passed / 15 按渠道跳过|
|三应用 Build|PASS；Admin、Supplier Portal、Customer Portal 均构建成功|
|Bundle 门禁|PASS；Admin Initial 1.3 KB / Max 256.0 KB，两个 Portal Initial 193.6 KB / Max 153.0 KB，无公开 Source Map|

首次 Admin E2E 暴露了 Catalog Controller 与 Router Index 的 ESM 循环初始化问题；实现改为在 Router 创建后显式绑定，随后 Admin 专项和三应用完整 E2E 均通过。正式 CI 仍要求 Node 24；本地 Node 25 的 Engine Warning 不作为正式 CI 证据。

## 7. 风险与回滚

- 当前真实 System 没有已发布 Catalog，真实登录后进入 Catalog Error 是预期 fail-closed 行为，不是可用性完成证据；
- S05C 必须在可重置环境先发布 Dynamic I18n，再发布 Catalog，并验证 200/304、停用、版本和权限变化；
- 如果 S05B 需要回滚，应恢复 `routes.ts` 的静态 Task Route 构造并移除 Catalog Controller 接入；不得保留动态和静态任务 Route 双轨运行；
- Vben 删除和 Lockfile/License 仍完全未授权。

## 8. Review 结论

Chris 已接受 S05B 并批准进入 S05C 前置核验。该接受不授权通过 SQL 绕过治理 API，不授权修改 IAM 权限基线，也不授权删除静态 Registry 或 Vben Workspace。
