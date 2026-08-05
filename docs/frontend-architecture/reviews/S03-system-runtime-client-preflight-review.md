# MOM-Web S03 System Runtime Client 前置评审

> 评审日期：2026-08-04  
> 阶段：MOM Platform P1.6 / S03 Preflight  
> 前置：S00～S02 Completed；ADR-012 Accepted  
> 结论：**SUPERSEDED BY S03A — GO FOR CLIENT IMPLEMENTATION**  
> 授权边界：本文只记录证据、拟定客户端边界和关闭条件，不构成 S03 实施授权

> 2026-08-04 更新：Chris 已批准 S03A，门禁关闭结果与剩余 Live Integration 条件见 [S03A 跨仓库契约关闭报告](S03A-cross-repository-contract-closure-report.md)。本文保留为实施前证据快照。

## 1. 总体结论

System 后端已经存在可消费的 Preference 与 Dynamic I18n HTTP 能力，但当前端到端调用链尚不成立：Gateway 没有 `/api/system/**` 路由，当前 `@mom/api-client` 不暴露响应状态和 ETag 并会把 304 当作错误，三个 Web 渠道也没有权威的 `applicationCode`、I18n `resourceCode` 与合并顺序。

因此 S03 不能直接编码或宣称联调完成。先关闭本文 B-01～B-04，并由 Chris 独立批准修订后的 Preflight；随后可在一个 Slice 内实现客户端、三应用实例和真实 Gateway/System E2E。Catalog 与动态路由仍严格留在 S05。

## 2. 本轮任务边界

### 2.1 S03 目标

- 建立 `@mom/system-client`，只封装 Preference、受限 View Setting 和 Dynamic I18n Runtime HTTP 契约；
- 在 `@mom/api-client` 内提供可审计的条件 GET/响应元数据能力，继续只有一个 Fetch 请求层；
- 三应用分别创建独立 System Runtime，不共享内存实例、Store 或缓存；
- 启动时以静态 `zh-CN/en-US` 和 S01 Token 为可信默认，认证并取得 `UserAccessContext` 后再加载用户偏好与动态语言资源；
- Preference/I18n 缓存按 Schema、用户、Client、Application、Locale/Resource 隔离，并在退出、身份变化或不兼容版本时失效；
- 完整覆盖 200/304、401/403/404/409/429/5xx、网络失败、跨用户隔离、缺失 Key 和静态回退。

### 2.2 S03 明确不做

- 不接入 Catalog、Navigation、`routeKey`、动态路由或旧 Catalog 快照；
- 不修改 Gateway、System、IAM、数据库、Token Claim、Permission 或 Factory/Party Scope；
- 不建设 Personal Settings 页面；保存/Reset UI 仍属于 S07；
- 不建设 Dynamic I18n 治理页面；Draft/Publish/Rollback/History 仍属于 S09；
- 不建设 Parameter、Dictionary、Application Catalog 或 Navigation 管理页；
- 不替换 Admin `BasicLayout`、Router、Vben Preferences/Locales/Stores；该迁移仍属于 S04；
- 不修改 `mom-mobile`，不把 Web 缓存协议强加给 Mobile；
- 不新增 Axios、TanStack Query、第二状态库、自动缓存插件或生产依赖；
- 不提交 Git、不推送、不创建 PR。

## 3. 证据矩阵

|证据|已确认事实|S03 约束|
|---|---|---|
|[ADR-012](../../adr/ADR-012-System-Catalog、Preference与Dynamic-I18n客户端边界.md)|Preference/I18n 可使用用户隔离缓存；Catalog 不允许旧快照降级；三应用必须独立 Runtime|S03 不能顺带实现 Catalog，缓存策略必须按能力分开|
|[技术架构](../02-technical-architecture.md)|浏览器只访问 Gateway；静态双语资源始终可启动；API DTO 在边界映射|不得直连 System Server，不得让远端文案成为唯一启动资源|
|三个 `apps/*/src/runtime.ts`|三应用已独立创建 Auth、Access、Api Client；Access 初始化后才有已校验 userId/clientId/user_type|System Runtime 必须在 Access 成功后激活，不能从未校验 Token Payload 自建身份|
|`packages/api-client/src/index.ts`|统一 Fetch、401/403 单飞和 Gateway-only 已存在；成功接口只返回 Body|必须扩展现有请求层，不能在 system-client 私建 Fetch；需要保留 304 与响应头|
|System `SystemUserPreferenceController`|GET/PUT/Reset 和 View API 已实现；身份只来自 JWT `sub`；PUT/Reset 使用 Version|前端 DTO 不允许 userId/身份字段；409 必须重新 GET 并要求用户确认|
|System `ResolvedUserPreference`|字段为 Locale、显示时区、Theme、Density、Page Size、Version、Persisted、UpdatedAt、Sources|客户端只接受白名单和精确枚举；来源不解释为权限|
|System `SystemI18nController`|Runtime 为认证 GET，强 ETag/304；404 表示不存在、停用、未发布或不完整|404 回退静态资源；304 只能与同隔离键的已验证表示组合|
|System `RuntimeView`|返回 application/resource/requested/default Locale、releaseVersion、checksum、fallbackCount、publishedAt、messages|远端消息必须当普通文本；不可解释 HTML、Markdown、表达式或可执行代码|
|Gateway `application.yml`|当前只声明 `/api/iam/**` 与 `/api/integration/**` 路由|浏览器无法按 Gateway-only 规则调用 `/api/system/**`，形成 Blocker|
|System 数据与测试|测试使用过 `mom-admin`、`mom-web`、`iam` 等示例 Code；生产 Migration 未发现三应用/I18n Resource 种子|示例值不是产品契约，前端不得猜测 Code|

## 4. Blocker

### B-01 · Gateway 没有 System 路由

**证据**：`mom-gateway/src/main/resources/application.yml` 只有 IAM 与 Integration 两条静态路由，没有 `/api/system/** → lb://mom-system-server`。

**影响**：前端若按 Gateway-only 调用会得到路由失败；若直连 System Server 则违反已接受安全架构。

**必须修正**：由 mom-platform 独立任务增加并验证受保护的 System Gateway 路由，明确是否原样保留 `/api/system/**`，并用三个 Web Audience 的真实 JWT 覆盖 200/304/401/403/404/409。该修正不在 mom-web S03 中实施。

### B-02 · 三渠道 Application 与 I18n Resource Code 未冻结

**证据**：后端测试分别出现 `mom-admin`（View）、`mom-web`（I18n）和 `iam`（Catalog），但 Application 不是 OAuth Client，生产 Migration 也未提供三渠道 Runtime 资源种子。

**影响**：缓存隔离键、I18n URL、View Setting URL 和发布治理无法稳定；错误选择可能让 Portal 读取内部资源或造成跨渠道文案污染。

**必须修正**：Product/System/Web 共同冻结以下矩阵，并提供已发布的 `zh-CN/en-US` 资源或明确允许 404 静态回退：

|Web 应用|Client ID|Application Code|Runtime Resource Code|允许的消息命名空间|
|---|---|---|---|---|
|Admin|`mom-admin-web`|Need Product Decision|Need Backend Confirmation|Need Product Decision|
|Supplier Portal|`mom-supplier-web`|Need Product Decision|Need Backend Confirmation|Need Product Decision|
|Customer Portal|`mom-customer-web`|Need Product Decision|Need Backend Confirmation|Need Product Decision|

### B-03 · 统一请求层不能表达 304/ETag

**证据**：`ApiClient.request<T>` 只返回 Body；`readSuccess` 不暴露 Header；`Response.ok` 对 304 为 false，因此当前条件 GET 会抛出 `MomApiError`。

**影响**：Dynamic I18n 无法满足已接受的强 ETag/304 契约；在 system-client 中直接 Fetch 又会形成第二请求层并绕过 401/403 单飞。

**必须修正**：S03 方案中冻结一个最小响应元数据接口，并在 `@mom/api-client` 内实现。例如：

```ts
export interface ApiResponse<T> {
  status: number;
  headers: Readonly<Record<string, string>>;
  data?: T;
}

conditionalGet<T>(path: string, options?: ApiRequestOptions): Promise<ApiResponse<T>>;
```

接口必须只暴露受控响应元数据，复用现有超时、Token、401/403、Gateway-only 和相关 ID 逻辑；304 不解析 Body，普通 `get<T>` 行为保持兼容。最终 API 名称可在批准时调整，但不得新增第二 Fetch 实现。

### B-04 · 跨仓库 E2E 所有者和运行环境未冻结

**证据**：mom-web 现有 Playwright 只启动三个 Vite 应用；System 后端报告明确把正式客户端接入留给后续跨仓库任务；当前用户只确认 Gateway/IAM 已启动，未确认 System Server、PostgreSQL Schema/数据与 Nacos 注册状态。

**影响**：仅靠 Mock、TypeScript 类型或 System 单仓测试不能证明真实认证、Gateway 路由、ETag 和用户隔离。

**必须修正**：明确跨仓库 E2E 的执行位置、启动脚本、数据准备、清理责任和失败归属。至少覆盖 Admin/Supplier/Customer JWT、Preference GET/PUT/Reset/409、I18n 200/304/404、System 不可用和退出后缓存清理。

## 5. Major 决策项

### M-01 · Runtime 激活顺序

冻结建议：

```text
静态 Token / 静态 zh-CN,en-US
          ↓
Auth restore / refresh
          ↓
IAM Access initialize + client/user_type/Party/Factory 校验
          ↓
System Runtime activate(userId, clientId, applicationCode)
          ↓
Preference 白名单合并 → I18n 当前 Locale 加载
```

Preference/I18n 失败不撤销有效 IAM Session，也不扩大权限；认证或 Access 校验失败时不得读取任何用户缓存。

### M-02 · 缓存协议

冻结建议：`@mom/system-client` 接收显式 Storage Adapter，不访问 Store/Router/Vben。默认浏览器实现是否使用 `localStorage` 必须由 Chris 在批准时确认；无论介质为何，键必须至少包含：

```text
mom.system.<schemaVersion>.<clientId>.<applicationCode>.<userId>.<capability>.<variant>
```

- Preference：保存最后一次成功 GET/PUT/Reset 的完整已校验表示；远端失败时可回退同键表示，再回退静态默认；
- I18n：保存 Body + ETag + Locale + Resource；只有本次 304 才可重用对应 Body；网络/5xx 可回退同键最后成功资源，再回退静态资源；
- 401/身份变化/退出：清除当前用户全部 System Runtime 内存与持久缓存；
- 解析失败、Schema 不兼容、Code 不匹配、checksum/ETag 关系异常：删除该条并回退；
- 不缓存 Token、Permission、Role、Factory/Party Scope、错误响应、Draft 或管理 DTO。

### M-03 · Preference 应用边界

S03 只实现 Client 和启动读取/应用，不建设设置页面。可以实现 `get/save/reset` 方法供 S07 使用，但 S03 不新增用户可见保存入口。Theme/Density/Locale 合并到 S01 Runtime；Page Size 和显示时区只进入类型化 Runtime State，不得提前影响业务日期、Factory 时区或任意页面查询。

### M-04 · Dynamic I18n 合并规则

- 静态应用资源先注册，远端 Runtime 只覆盖批准命名空间内的 Key；
- 缺失 Key 依次使用当前 Locale 静态值、默认 Locale 静态值和稳定缺失标记；
- 远端值按普通文本处理，不使用 `v-html`；
- Placeholder 参数集合与客户端调用不匹配时拒绝该远端 Key 并保留静态值；
- Locale 切换取消或忽略旧请求，防止迟到响应覆盖当前 Locale；
- 三应用各自装载资源，不共享 vue-i18n 实例或消息对象。

## 6. 拟定实现边界（关闭 Blocker 后）

### 6.1 预计新增

```text
packages/system-client/
├── package.json
├── tsconfig.json
└── src/
    ├── contracts.ts
    ├── cache.ts
    ├── preference.ts
    ├── i18n.ts
    ├── runtime.ts
    ├── index.ts
    └── index.test.ts
```

### 6.2 预计修改

- `packages/api-client`：增加条件 GET/响应元数据能力及契约测试；
- 三应用 `runtime.ts`/Bootstrap：Access 成功后创建各自 System Runtime，退出时清理；
- 三应用 locale/theme adapter：只接收已校验 View Model；
- 根质量脚本、TypeScript 测试配置和 E2E：登记新 package 与跨仓库 Profile；
- 本目录：S03 实施报告和状态更新。

不提前创建 Catalog、Router Registry、Personal Settings 页面或 System 管理模块。

## 7. 状态与错误矩阵

|场景|Preference|Dynamic I18n|认证/权限影响|
|---|---|---|---|
|200|校验并应用、更新隔离缓存|校验 Body/ETag 并合并批准 Key|无|
|304|不适用|只复用同键已验证 Body|无|
|400|客户端契约错误，显式诊断；保存不伪成功|请求配置错误，静态回退|无|
|401|沿用单飞刷新；最终失败清理 Runtime 并重新认证|同左|不得保留旧用户状态|
|403|读取呈现 Forbidden/诊断；写入不重试|静态回退并记录 Forbidden|前端不放大权限|
|404|读取回退默认；View 按后端 persisted=false 契约处理|资源未发布/停用，静态回退|不猜测资源|
|409|重新 GET，保存状态为 Conflict，等待用户确认|不适用|写请求不自动重试|
|429|保留当前已应用状态，呈现 Retry-After|使用同键缓存或静态回退|不盲重试|
|5xx/网络|同用户缓存 → 静态默认|同键缓存 → 静态资源|不退出有效 IAM Session|
|结果未知|写入不更新缓存，标记 Result Unknown 并重新读取权威状态|不适用|不伪造成功|

## 8. 验收矩阵

### 8.1 前端单元与契约测试

- `@mom/api-client`：200 Body/Header、304 空 Body、401 单飞、403 语义、超时、Abort、绝对 URL 拒绝；
- Preference：默认、200、PUT/Reset、409、结果未知、白名单/枚举校验、缓存损坏、Schema 失配；
- I18n：200/304/404、ETag 隔离、缺失 Key、非法消息结构、迟到响应、静态双语回退；
- 隔离：同用户不同 Client/Application、不同用户、退出、身份切换均不能复用；
- 三应用：各自独立实例，Supplier/Customer 不加载 Admin 内部消息或 VM。

### 8.2 真实集成

- 浏览器只请求 Gateway，不出现 System Server 直连地址；
- 使用真实 IAM 登录后的三个 Client/Audience 调用 System；
- 记录 I18n 首次 200 的 ETag，再以 `If-None-Match` 获得 304 空 Body；
- 真实 Preference 首次 `version=0`、更新、Reset、并发 409；
- 停止 System Server 后，登录与静态 Core UI 仍可用，降级不改变授权；
- 退出并切换用户后不存在前一用户主题、Locale 或动态消息泄漏。

## 9. 验证命令（实施阶段）

```bash
pnpm install --frozen-lockfile
pnpm validate
pnpm lint
pnpm stylelint
pnpm tokens:check
pnpm check:type
pnpm test
pnpm test:component
pnpm build
pnpm bundle:check
pnpm test:e2e
```

另需执行经批准的 mom-platform Gateway/System 集成命令和跨仓库 E2E；命令未冻结前必须标记 `NOT RUN / Need Backend Confirmation`。

## 10. 回滚边界

- `@mom/system-client` 必须可由应用装配开关整体停用；停用后回到 S02 的静态主题/Locale 与现有 Auth/Access Runtime；
- `@mom/api-client` 新接口为增量能力，现有 `get/post/put/delete/download` 行为不得变化；
- 回滚不得恢复跨用户 Vben 缓存作为 System Preference 权威，也不得保留半接入的远端消息；
- 如果真实 Gateway/System 证据失败，状态只能报告“客户端准备完成”，不能报告 S03 Completed。

## 11. Unknown / Decision 清单

|分类|问题|关闭责任|
|---|---|---|
|Need Backend Confirmation|Gateway `/api/system/**` 路由、过滤器和服务名|mom-platform / Gateway|
|Need Backend Confirmation|System Server 本地启动、Nacos 注册、PostgreSQL Migration 与测试资源数据|mom-platform / System|
|Need Product Decision|三个 Web 渠道的稳定 Application Code|Chris / Product Architecture|
|Need Backend Confirmation|三个渠道的 I18n Resource Code、发布数据与默认 Locale|System + Web|
|Need Product Decision|批准的动态消息命名空间及静态/远端合并优先级|Chris / Product Architecture|
|Need Security Decision|用户隔离缓存默认使用 localStorage、sessionStorage 或其他 Adapter，以及保留周期|Chris / Security Architecture|
|Need Engineering Decision|跨仓库 E2E 所在仓库、启动脚本和失败所有者|Web + Platform|

## 12. GO 条件

以下条件全部关闭后，将本文结论修订为 `GO` 并等待 Chris 独立批准：

1. Gateway System 路由存在并通过真实 JWT 基线；
2. 三应用 Application/I18n Resource/Namespace 矩阵冻结；
3. `@mom/api-client` 条件 GET 接口形态获批；
4. 用户隔离缓存介质、键、清理和回退策略获批；
5. 跨仓库 E2E 环境、数据与所有者明确；
6. 确认 S03 只接入 Runtime Client，不建设 S07/S09 页面；
7. Chris 对修订后的 S03 独立批准。

在此之前停止，不修改代码、依赖或后端。
