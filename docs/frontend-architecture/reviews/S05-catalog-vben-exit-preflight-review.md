# S05 · Catalog 与 Vben 退场前置评审

> 评审日期：2026-08-05  
> 评审范围：System Catalog 客户端边界、Admin 动态路由生命周期、Workspace Vben 退场  
> 总体结论：`CONDITIONAL GO`  
> 当前状态：Accepted · Chris Review 2026-08-05；只授权 S05A，未授权 S05B～S05E 或源码删除

## 1. 结论

S05 的技术方向与 ADR-011、ADR-012 一致，后端也已经提供经过 Gateway、JWT Authority 过滤、强 ETag、不可变 Release 和完整性校验约束的 Catalog Runtime API。当前前端具备静态 Core Route、静态 `routeKey → Component` Registry、Gateway-only Fetch Client 和 Catalog Error 页面，因此不需要改变既有技术栈即可继续。

但是，S05 **不能作为一个“大爆炸”切片直接启用动态路由并删除 Vben**。当前仍有四项必须先关闭的前置条件：

1. `mom-admin` 在 System Catalog 中的 Application 组成和稳定编码尚未由产品决策冻结；
2. System 中没有已发布的 `mom-admin/runtime` Dynamic I18n 资源，也没有可供真实验收的 Catalog Release；
3. IAM 权限变化、Catalog JWT Authority 和浏览器重新校验的收敛语义尚未形成跨仓库验收契约；
4. Workspace Vben 删除尚无 Chris 授权的恢复点，而当前工作树包含其他已批准文档变更。

因此本评审建议：

- `GO`：在 Chris 接受本报告并批准具体微切片后，可以先实施 S05A——Catalog DTO、严格校验器、无持久化的内存状态机及单元测试；
- `CONDITIONAL GO`：S05B 动态路由激活必须先冻结 Application/Group 编码和权限收敛规则；
- `NO-GO`：在真实 Catalog 发布及跨仓库 E2E 通过前，不得删除静态任务路由兼容入口；在恢复点、零引用、三应用回归和开源台账未就绪前，不得删除 Vben 源码。

## 2. 本次边界

本次只完成证据审计与实施设计，不修改：

- `apps/`、`packages/`、`internal/` 中的任何运行代码；
- `package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`；
- ESLint、Stylelint、Vite、TypeScript 或构建配置；
- mom-platform 的 API、数据库、权限模型、Token Claim 或运行数据；
- Vben 源码、License/NOTICE 或开源来源记录。

本次新增本报告，并只更新前端架构状态与跨工具交接说明。S05 实施不会因报告生成而自动获准。

## 3. 证据矩阵

|证据面|实际证据|结论|
|---|---|---|
|前端任务契约|`apps/mom-admin/src/router/task-contract.ts`|前端已冻结契约版本 1、两个用户任务域和六个任务 `routeKey`，但 GROUP 尚无 `routeKey`|
|前端 Registry|`apps/mom-admin/src/router/registry.ts`|六个任务均静态映射到本地组件，并通过新鲜 `/api/iam/me` 权限过滤；服务端不能返回 Component|
|Router 与 Guard|`routes.ts`、`guard.ts`、`access.ts`|Core Route 和任务 Route 当前都静态注册；尚无动态 Route 添加、撤销与深链重匹配|
|System Runtime Client|`packages/system-client`|只实现 Preference/Dynamic I18n；其验证脚本明确禁止 S03 Runtime 访问 Catalog，Catalog 必须新增独立边界|
|请求层|`packages/api-client`|Fetch 实现已支持条件请求、响应状态和 Header，无需新增 Axios 或第二请求层|
|Gateway|mom-platform `mom-gateway/.../application.yml` 及路由测试|`/api/system/**` 经 Gateway 转发到 System；本地 Gateway 与 System 健康，匿名 Catalog 经两入口均返回 401|
|System Runtime API|`SystemCatalogRuntimeController`、`SystemCatalogContracts`|提供 `/api/system/catalog/me` 与 `/applications/{applicationCode}`；200 带强 ETag，匹配时 304|
|System 发布模型|Catalog Application/Navigation/Release 代码与 ADR-030/031|Release 不可变；运行时校验 checksum；按 JWT Authority 过滤；数据库/完整性失败不返回旧快照|
|IAM 授权|Admin `/api/iam/me` 同步与 IAM 权限实现|浏览器可用新鲜 `/me` 收紧权限；Catalog 使用当前 JWT Authority，新增权限可能等待 Token 更新|
|发布数据|System Migration、当前本地运行证据、S03 报告|只存在 Catalog Schema，无生产 Seed；当前没有已发布 `mom-admin/runtime` I18n，无法发布完整 Catalog|
|Vben 退场|Workspace manifest、源码引用、构建与治理脚本扫描|Admin 应用运行时零 Vben 引用，但 Workspace 快照、importer、配置与来源台账仍大量存在|

后端契约以当前代码、[System Catalog ADR-030](../../../../mom-platform/docs/adr/ADR-030-System应用目录导航发布与IAM权限引用边界.md)和[System Runtime ADR-031](../../../../mom-platform/docs/adr/ADR-031-System运行时缓存变更通知与服务身份事务边界.md)为证据。后端旧的模块边界说明仍包含“无 Application Catalog”的历史文字，属于文档漂移，不得覆盖当前 ADR 和代码事实。

## 4. 已确认的后端契约

### 4.1 Runtime API

- `GET /api/system/catalog/me`：返回当前主体可见的全部应用；
- `GET /api/system/catalog/applications/{applicationCode}`：返回当前主体可见的指定应用；
- 所有调用必须认证，经 Gateway 暴露；匿名请求返回 401；
- 200 响应使用 `Cache-Control: private, no-cache` 和基于 checksum 的强 ETag；
- `If-None-Match` 与当前 Release 一致时返回 304，响应体为空；
- 未发布、已停用或主体不可见的应用不提供可执行导航；指定应用端点可返回 404；
- Redis 不可用时可回源 PostgreSQL；数据库或完整性校验失败时不得返回旧缓存。

### 4.2 数据形状与安全边界

Catalog Snapshot Schema 当前为 1。Runtime 表示只包含：

- Application：稳定 `applicationCode`、PLATFORM/BUSINESS 类型、Catalog/Route Contract Version、I18n 引用、`iconKey`、Channel；
- Navigation：GROUP/ROUTE、`routeKey`、`permissionCode`、I18n 引用、`iconKey`、显示标志、`keepAlive` 和 Children；
- Channel：WEB/MOBILE。

它不包含 Path、Component、Layout、脚本、远程代码或数据库 ID。后端限制导航最大深度 4、每 Channel 最大 500 个节点、Snapshot 最大 1 MiB，并拒绝 URL/Script/Data 形式的图标键。前端仍必须再次校验，不能把“后端校验过”当作执行授权。

### 4.3 权限语义

System Runtime 按当前 JWT Authority 过滤 Route，无可见子项的 Group 会被去除。Admin 当前 `/api/iam/me` 从 IAM 读取新鲜权限，且 IAM 的角色权限替换不会自动撤销已有 Session。因此：

- 权限被撤销后，前端可以用 Catalog 与新鲜 `/me` 的交集立即隐藏或撤销任务；
- 权限新增后，旧 Access Token 可能使 Catalog 暂时不返回新任务，直到 Token 更新；
- 前端必须以静态 Registry 中声明的 `permissionCode` 为准做精确相等校验，再与 `/me` 权限相交；
- Catalog 返回的 Permission 不能单独授权，也不能替代页面与后端业务授权。

新增权限的最大收敛时间、Token 更新机制和服务端 Kill Switch 触发点仍是 `Need Backend Confirmation`。

## 5. 前端 Catalog 安全状态机

Catalog 与 Preference/Dynamic I18n 的降级语义不同。S03 允许按用户隔离的缓存和静态语言回退；Catalog **禁止持久化旧导航，也禁止网络失败时继续使用旧响应**。

```text
UNINITIALIZED
    │ authenticated + current access loaded
    ▼
VALIDATING ── 200 + all checks pass ──▶ ACTIVE(etag, representation)
    │                                      │
    │ 304 + no matching in-memory value    │ revalidate with If-None-Match
    │ network/401/403/404/5xx/invalid       ├─ 304 ─▶ ACTIVE
    ▼                                      └─ 200 ─▶ replace atomically
RESTRICTED(Catalog Error) ◀── any validation/request failure
    │
    └─ remove every dynamic route and discard etag/representation
```

唯一允许使用 304 的条件是：当前浏览器进程中存在同一 `clientId + userId + applicationCode`、相同 ETag 且已经完整验证的表示。304 没有匹配的当前内存表示时必须 fail closed。Catalog 状态不得写入 LocalStorage、SessionStorage、IndexedDB、Service Worker Cache 或普通 HTTP 离线缓存。

### 5.1 200 响应的强制校验

前端在原子替换动态 Route 前必须验证：

1. 强 ETag 存在且格式有效；
2. `snapshotSchemaVersion === 1`；
3. 响应只包含本次获批的 Application 组成与编码；
4. `routeContractVersion === 1`；
5. 只消费 `WEB` Channel；
6. 树深、节点数、枚举、重复 Application/Group/Route Key 均合法；
7. GROUP/ROUTE 的必填字段与 Children 形状合法；
8. 每个 Group/Route `routeKey` 都存在于本地静态 Registry；
9. Route 的 `permissionCode` 与 Registry 声明精确相等；
10. Route Permission 与新鲜 `/api/iam/me` 权限取交集；
11. `iconKey` 只允许静态 Lucide Registry 中的键；未知 Key 不退回服务端图标；
12. I18n 引用只落入已批准 Resource/Namespace，缺失文本可用同 Key 静态双语资源回退。

任何一项失败都必须撤销整份动态表示，而不是跳过异常节点后继续生成不完整导航。

### 5.2 Core Route 与动态 Route 生命周期

以下 Core Route 永远静态存在：登录、强制改密、403、404、Runtime Error、Catalog Error、个人偏好。业务任务 Route 只有在当前 200 或经服务端重验证的 304 后才动态添加。

每次 `router.addRoute` 的撤销句柄必须归属当前 Runtime Instance，并在以下事件发生时全部执行：

- Logout、Token/User/Client 变化；
- Catalog 请求或校验失败；
- Application 停用、404 或版本不兼容；
- `/api/iam/me` 权限变化使任务不再可见；
- Runtime Dispose 或应用重新 Bootstrap。

首次直接访问 `/iam/users` 时，Vue Router 可能先匹配静态 404。Guard 完成 Catalog 激活后必须只对原始 `fullPath` 重匹配一次，并带有循环保护；失败则进入 Catalog Error 或 404，不得无限 Replace。

## 6. Application 与 Route Registry 冻结建议

### 6.1 需要 Chris 决策的两种方案

|方案|运行端点与组成|优点|代价与风险|
|---|---|---|---|
|A：单产品应用（推荐）|`/applications/mom-admin`；一个 `mom-admin` Application，下设获批用户任务 Group|与三渠道产品边界、S03 `applicationCode` 和现有 Route Key 前缀一致；避免把 IAM/System 服务变成菜单|长期若需要多个可独立发布的产品应用，需新增稳定 Application，而不是重命名 `mom-admin`|
|B：多个逻辑应用|`/catalog/me`；返回多个业务 Application|可独立版本和启停|前端需组合多应用 I18n/版本/失效；测试夹具中的 `iam` 容易被误当产品域，增加超级后台风险|

Chris 已批准方案 A：P1.6 使用单一 `mom-admin` Application。该批准冻结客户端稳定编码，但不授权直接创建或修改 System Catalog 数据。后端测试中的 `iam` 只是夹具证据，不是产品命名证据。

### 6.2 方案 A 的建议静态契约

|类型|建议 `routeKey`|页面路径|权限|
|---|---|---|---|
|Application|`mom-admin`|—|—|
|Group|`mom-admin.people-access`|—|由子任务决定|
|Route|`mom-admin.people-access.users`|`/iam/users`|`iam:user:read`|
|Route|`mom-admin.people-access.roles`|`/iam/roles`|`iam:role:read`|
|Route|`mom-admin.people-access.permissions`|`/iam/permissions`|`iam:permission:read`|
|Route|`mom-admin.people-access.clients`|`/iam/clients`|`iam:client:read`|
|Group|`mom-admin.security-operations`|—|由子任务决定|
|Route|`mom-admin.security-operations.sessions`|`/iam/sessions`|`iam:session:read`|
|Route|`mom-admin.security-operations.audit`|`/iam/audit`|`iam:audit:read`|

建议使用 `runtime` Resource 和 `mom.runtime.*` Namespace，预先发布以下受控 I18n Key，并在 mom-web 提供同 Key 的 `zh-CN/en-US` 静态回退：

- `mom.runtime.application.admin`；
- `mom.runtime.navigation.peopleAccess`、`mom.runtime.navigation.securityOperations`；
- `mom.runtime.navigation.users`、`roles`、`permissions`、`clients`、`sessions`、`audit`。

Chris 已接受上述 Group Route Key 与 Dynamic I18n Key 作为前端静态契约。System 发布顺序、数据环境和 E2E 责任仍需 `Need Backend Confirmation`，不能直接通过 Flyway Seed 或测试 SQL 写入共享环境。

## 7. Vben 退场影响清单

### 7.1 当前源码规模

当前 Workspace 仍包含：

|区域|Manifest 数|文件数（近似）|
|---|---:|---:|
|`internal/`|2|14|
|`packages/@core/`|12|505|
|`packages/effects/`|4|237|
|顶层 `constants/icons/locales/preferences/stores/styles/types/utils`|8|113|

本次宽口径扫描在快照区域发现 387 个包含 `@vben/` 或 `@vben-core/` 的源码/配置文件。S04D 的 145 个是当时较窄口径的应用退场清单；两者口径不同，本报告的数字只用于 Workspace 删除规划，不回写 S04 历史结论。Admin 应用运行代码的 Vben 直接引用仍为 0。

### 7.2 删除顺序

Vben 删除必须拆成可审计步骤：

1. 证明 `apps/` 与 MOM 自有保留包对 Vben Snapshot 的运行和构建引用均为 0；
2. 更新 `scripts/validate.mjs`：删除对 Vben 历史文件和 Access Store 的“必须存在”断言，新增 Workspace 零 Vben Source/Manifest 门禁，并把静态任务路由断言替换为 Catalog 生命周期断言；
3. 删除 `pnpm-workspace.yaml` 中只属于 `internal/*`、`packages/@core/*`、`packages/effects/*` 的 Workspace Glob；
4. 删除 Vben 源码快照和无真实 MOM 消费者的顶层快照包；
5. 使用 pnpm 正常重算 Lockfile Importer 与依赖闭包，不手工编辑锁文件；
6. 清理 ESLint/Stylelint 中只用于已删除快照的 Ignore/Adapter；
7. 对根 Catalog 依赖逐项做消费者扫描，只删除 Vben 独占条目；Pinia、Lucide、Tailwind、Vue 及 MOM 真实消费者依赖必须保留；
8. 验证无 SCSS 消费者后移除 Admin 的 `sass-embedded` 直接开发依赖；
9. 将 README、THIRD-PARTY-NOTICES 和开源来源台账改为“历史来源/已删除源码”，保留可追溯记录；修正 `common-ui` Page 来源记录中的实际路径；
10. 在两个 Portal 主题与 E2E 全部通过后删除 `design-tokens` 的 `.dark` 兼容输出；若 Portal 回归则显式延后到 S11，不伪报退场完成；
11. 重新执行三应用构建、全量测试、Bundle、Source Map 和零引用门禁。

Legacy Token Alias 仍被 MOM 自有 UI/Styles 消费，不能因为 Vben 删除而一并清除。它属于独立消费者迁移，不是 S05 自动删除项。

### 7.3 可恢复性前置条件

源码删除属于高影响操作。用户当前明确要求不提交 Git，而 S05 原计划又要求独立可回滚提交。两者冲突时必须停止，不能自行 Commit。

在 S05D 删除前，Chris 必须明确选择并授权一种恢复点：

- 允许创建一个只包含 S05D 的本地 Git Commit；或
- 由 Chris 提供已确认的现有 Commit/Branch 作为恢复点；或
- 允许创建审计清晰、位于 Workspace 外的只读归档。

恢复点建立前不得执行源码删除。现有未提交文档变更不得混入删除恢复点，也不得被清理或覆盖。

## 8. 实施微切片

|微切片|范围|前置|停止与回滚|
|---|---|---|---|
|S05A Catalog 契约与状态机|在现有 System Client 边界内新增 Catalog DTO、严格校验器、无持久化内存状态、200/304/失败单元测试；不激活 Router|Chris 接受本报告并明确批准 S05A|回退客户端新增文件；静态 Router 完全不变|
|S05B Admin 动态 Router|Core Route 静态保留；由验证后的 Catalog 激活本地 Registry；实现撤销、权限交集、深链重匹配和 Catalog Error|批准 Application/Group 编码、I18n Key、权限与重新校验规则；S05A 通过|恢复静态任务 Route 构造；不得删除兼容入口|
|S05C 真实发布与跨仓库 E2E|在可重置环境先发布 Dynamic I18n，再发布 Catalog；经 Gateway/IAM/System 验证 200/304/停用/版本/权限/失败|后端数据与 E2E 责任冻结；环境允许清理|Catalog 用新 Release/停用回滚，不修改已发布 Release；不得在共享本地库做不可追踪测试数据|
|S05D Workspace Vben 删除|按第 7 节删除 Snapshot、Importer、依赖、Adapter，更新 Lockfile、License/NOTICE/来源台账|S05B/C 通过；Workspace 零引用；Chris 授权恢复点|使用获批恢复点整体恢复；不以手工拼回文件作为回滚|
|S05E 封口|全量安全、组件、E2E、视觉、无障碍、三应用构建、Bundle、Source Map、文档验收|S05A～D 完成|任一阻断门禁失败则 S05 不完成，不降低断言或预算|

每个微切片完成后停止等待独立 Review，不自动进入下一项。

## 9. 验证矩阵

### 9.1 Catalog 单元与契约

- 200 + 有效强 ETag 激活；304 + 同身份同 ETag 当前内存表示继续激活；
- 304 无内存表示、弱/缺失 ETag、Schema/Contract Version 不兼容均 fail closed；
- 未知/重复 Application、Group、Route、Icon、Enum、超深/超量树均 fail closed；
- Permission 与静态 Registry 不一致、Catalog 与 `/me` 无交集时不得激活；
- 网络失败、401/403/404/409/429/5xx、无效 JSON、checksum/表示异常时撤销 Route 且清空内存；
- 不产生 LocalStorage、SessionStorage、IndexedDB 或 Service Worker Catalog 缓存。

### 9.2 Router、认证与 E2E

- 登录、强制改密、刷新、Logout；Core Route 在 Catalog 故障时仍可访问；
- 六个现有 URL、浏览器回退、书签和刷新语义保持；
- 首次深链只重匹配一次，无循环；
- Application 停用、Release 更新、权限撤销会在获批重新校验点撤销 Route；
- 未知 Key/版本进入 Catalog Error，不退回旧菜单；
- Admin 1024/1280/1600、Light/Dark/System、两密度、双语、键盘和焦点行为不回归。

### 9.3 Workspace 与构建

实施代码微切片至少执行：

```bash
pnpm install --frozen-lockfile
pnpm validate
pnpm lint
pnpm stylelint
pnpm tokens:check
pnpm check:type
pnpm test
pnpm test:component
pnpm test:e2e
pnpm build
pnpm bundle:check
pnpm bundle:target
```

S05D 另需验证：Workspace Manifest/源码零 `@vben/*` 与 `@vben-core/*`、Lockfile 无已删除 Importer、公开 Source Map 为 0、License/NOTICE 与来源台账一致。正式 CI 证据使用 Node 24；本地 Node 25 Engine Warning 不能替代 CI。

## 10. 问题分级

### Blocker

|编号|问题|影响|必须修正|
|---|---|---|---|
|B-01|Application 组成与 `applicationCode` 未冻结|可能把后端服务/测试夹具变成产品菜单，或产生不可兼容稳定编码|Chris 在方案 A/B 中明确决策；建议 A：单 `mom-admin` Application|
|B-02|无已发布 `mom-admin/runtime` I18n 与 Catalog Release|无法形成真实 200/304、停用与版本验收；Catalog Publish 也无法引用未发布 I18n|通过 System 治理 API 在可重置环境先发布 I18n，再发布 Catalog；不得伪造生产完成|
|B-03|权限新增/撤销和 Catalog 重新校验的收敛规则未冻结|可能保留已撤销导航或让新权限长期不可见|后端确认 Token/Session 语义；前端冻结 Bootstrap、导航、授权刷新及恢复前台的重验点|
|B-04|Vben 删除无获批恢复点|删除面跨数百文件、Lockfile 和开源台账，失败时不可审计恢复|删除前由 Chris 明确授权 Commit、已知 Revision 或外部只读归档|

### Major

|编号|问题|影响|必须修正|
|---|---|---|---|
|M-01|前端 Group 没有静态 `routeKey` Registry|无法验证后端 GROUP，可能接受未知导航结构|在 S05A/B 增加受控 Group Registry；不从标题或服务名推导|
|M-02|当前任务 Route 全部静态注册|Catalog 无法真正控制激活/撤销；失败时仍可匹配旧 Route|S05B 改为 Core 静态、任务动态，并保留一项可回滚兼容实现直到 S05C 通过|
|M-03|S03 Client 的缓存策略不适用于 Catalog|误复用会在服务故障或停用时继续显示旧导航|Catalog 使用独立无持久化状态，不复用 Preference/I18n Cache|
|M-04|跨仓库 E2E 的所有者与重置环境未冻结|Mock 通过不能证明 Gateway/IAM/System 的实际组合契约|冻结 mom-platform 与 mom-web 的责任、启动方式、数据准备和清理方式|
|M-05|删除门禁脚本仍要求 Vben 文件存在，且要求任务 Route 静态生成|直接删除会破坏治理门禁，或诱导跳过校验|先重写门禁为 Catalog 生命周期与 Workspace 零引用断言，再删源码|
|M-06|`.dark` 兼容输出仍留在 Design Token Runtime|删除 Snapshot 后仍有双主题信号；Portal 可能存在隐式依赖|全 Portal 主题/E2E 通过后删除；失败则登记到 S11|

### Minor

|编号|问题|影响|必须修正|
|---|---|---|---|
|m-01|后端旧模块边界文档仍称无 Application Catalog|接手者可能选择错误权威来源|后端在后续文档治理修正；当前以 ADR-030/031 和代码为准|
|m-02|THIRD-PARTY-NOTICES 中 `common-ui` Page 路径已过期|开源来源追踪不精确|S05D 更新为实际路径并保留 Vben 历史来源|
|m-03|Admin 仍直接声明无 SCSS 消费者的 `sass-embedded`|遗留依赖与 Vben 退场不完整|删除源码后再次扫描并由 pnpm 正常移除|
|m-04|Legacy Token Alias 与 Vben 删除容易被混为一谈|误删会破坏 MOM 自有组件样式|独立记录消费者；S05 不做无证据删除|

## 11. Unknown 与待决策清单

### Need Product Decision

- Catalog 使用单 `mom-admin` Application 还是多个逻辑 Application；本评审推荐单应用方案；
- Group `routeKey` 与 Dynamic I18n Key 是否接受第 6 节建议；
- 浏览器从后台恢复时是否必须立即重新校验 Catalog，及允许的最大导航收敛时间。

### Need Backend Confirmation

- 权限新增、撤销后 Access Token/Session 的更新或撤销机制与最大收敛时间；
- 本地/CI 可重置 Catalog + Dynamic I18n 发布环境、数据所有者与清理方式；
- S19-A 或等价后端 Slice 是否承担真实 Gateway/IAM/System Catalog E2E；
- 404、停用、依赖失败的最终 Problem Detail/错误码矩阵是否已稳定供前端断言。

### Unknown

- 企业网络条件下 Catalog 首次加载与核心页面 P75；
- 多 Factory 用户切换是否要求 Catalog 按 Factory 重新获取；当前 Catalog API 未显式带 Factory 维度；
- 将来多个业务 Application 是否需要独立发布节奏；该问题不阻塞单 `mom-admin` P1.6，但禁止提前抽象远程应用框架。

## 12. Chris Review 请求与停止条件

请 Chris 分别确认：

1. 是否接受总体 `CONDITIONAL GO`；
2. 是否批准方案 A：System Catalog 稳定 Application Code 使用 `mom-admin`；
3. 是否接受第 6.2 节 Group Route Key 与 I18n Key 作为 S05 冻结契约；
4. 是否只批准 S05A，后续 S05B～E 继续逐项 Review；
5. Vben 删除前采用哪一种恢复点。

Chris 已接受本评审、方案 A、建议的 Group/I18n Key，并只批准 S05A。Vben 删除恢复点延后到 S05D 前单独决策。S05A 完成后必须再次停止；不得自动发布 Catalog 数据、切换动态 Router 或删除 Vben。
