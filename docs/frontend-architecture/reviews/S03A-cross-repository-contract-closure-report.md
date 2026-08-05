# MOM-Web S03A 跨仓库契约关闭报告

> 日期：2026-08-04  
> 阶段：MOM Platform P1.6 / S03A  
> 授权：Chris 明确批准 S03A  
> 结论：**GO FOR S03 CLIENT IMPLEMENTATION / LIVE INTEGRATION PENDING**

## 1. 结论

S03 客户端实现所需的 Gateway 路由、三渠道稳定 Code、动态消息命名空间、缓存介质、统一请求接口方向和跨仓库责任已经冻结。`mom-web` 可以进入 S03 Runtime Client 编码，但在真实 Gateway、IAM、System 与数据库联调通过前，只能报告“客户端实现完成”，不得报告“生产集成完成”。

本轮没有创建 Dynamic I18n 生产数据。未发布或不存在的 `runtime` 资源返回 404 时，客户端必须使用静态 `zh-CN/en-US` 回退；资源的创建、Draft、发布和回滚仍属于后续 System 治理流程，不通过 Flyway 植入产品文案。

## 2. 冻结契约

|Web 应用|Client ID|Application Code|Runtime Resource Code|允许的动态消息命名空间|
|---|---|---|---|---|
|Admin|`mom-admin-web`|`mom-admin`|`runtime`|`mom.runtime.*`|
|Supplier Portal|`mom-supplier-web`|`supplier-portal`|`runtime`|`mom.runtime.*`|
|Customer Portal|`mom-customer-web`|`customer-portal`|`runtime`|`mom.runtime.*`|

补充约束：

- Application Code 与 OAuth Client ID 是不同契约，不得互换；
- Dynamic I18n 只能覆盖 `mom.runtime.*`，Core/Auth/错误与安全提示继续由静态资源负责；
- Runtime 文案始终按普通文本处理，不解释 HTML、Markdown、表达式或代码；
- `runtime` 资源 404 是允许的可降级状态，不撤销有效 IAM 会话；
- Preference 与 I18n 缓存使用 `sessionStorage`，不跨标签页和浏览器会话保留；
- 缓存键必须包含 Schema Version、User ID、Client ID、Application Code、Capability 与 Resource/Locale 变体；
- 退出、身份变化、解析失败或契约不兼容时清除对应用户的 Runtime 缓存。

## 3. Gateway 与安全边界

`mom-platform` 新增：

```text
/api/system/** → lb://mom-system-server
```

路由不执行 `StripPrefix`，System Server 继续接收原始 `/api/system/**` 路径。Gateway 的粗粒度策略为：

- `/api/system/admin` 与 `/api/system/admin/**`：仅 `mom-admin-web + INTERNAL`；
- 其他 `/api/system/**` Runtime：仅允许已登记且 Client/User Type 匹配的 Public Client；
- Gateway 继续校验 JWT、Audience、Session 撤销状态并清理伪造身份 Header；
- System Resource Server 继续验证 JWT 并执行方法级 Permission、用户身份和最终业务授权；
- 未知 API 路径继续 fail closed，不允许前端直连 `mom-system-server:20300`。

`mom-mobile-pda` 只保持现有平台 Runtime 入口契约兼容，不纳入本次 Web Runtime 实现和验收。

## 4. 统一请求层决策

S03 在既有 `@mom/api-client` 内增加最小响应元数据接口，不创建第二 Fetch：

```ts
export interface ApiResponse<T> {
  status: number;
  headers: Readonly<Record<string, string>>;
  data?: T;
}

conditionalGet<T>(path: string, options?: ApiRequestOptions): Promise<ApiResponse<T>>;
```

- 304 是成功的重验证结果，不解析 Body；
- 200 返回经过现有认证、超时、Correlation ID 与 Gateway-only 约束的 Body 和受控 Header；
- 现有 `request/get/post/put/delete/download` 行为保持兼容；
- `system-client` 不直接使用 `fetch`，也不引入 Axios、Query Client 或自动缓存依赖。

## 5. 跨仓库 E2E 责任

|责任面|所有者|必须提供的证据|
|---|---|---|
|Gateway 路由、JWT/Audience、Client/User Type 入口矩阵|`mom-platform/mom-gateway`|路由装配测试、策略测试、真实 Gateway JWT 请求|
|Preference、View、I18n DTO、ETag/304、409 与 Resource Server|`mom-platform/mom-system-platform`|System 契约/集成测试及真实服务响应|
|请求元数据、缓存隔离、静态回退、三应用独立 Runtime|`mom-web`|Node/Vitest/组件测试及三应用构建|
|浏览器到 Gateway 的完整链路|`mom-web` 发起，`mom-platform` 提供环境|Playwright live profile；失败按最先失效的仓库边界归属|

本地 Live Profile 前置环境为 PostgreSQL、Redis、Nacos、IAM、Gateway 和 System。测试数据通过受保护的 System 管理 API 创建并发布，不修改已发布 Migration；测试完成后按治理 API 回滚或停用，不直接操作生产数据表。

## 6. S03 实现边界

获准：

- 扩展 `@mom/api-client` 的 `conditionalGet`；
- 新建 `@mom/system-client`；
- 三应用在 Access 校验成功后创建独立 Runtime；
- 接入 Preference 读取、Dynamic I18n 读取、ETag、用户隔离缓存和静态回退；
- 增加单元、组件、构建与可用环境下的 Live E2E。

仍不获准：

- Catalog、Navigation、动态路由和 Vben 退出；
- Personal Settings 与 I18n 治理页面；
- 修改 System/IAM API、数据库、Token Claim 或 Permission；
- 以 Mock、404 回退或类型编译宣称真实集成完成。

## 7. 当前验证证据

- Maven 3.9.11 / JDK 25 容器：Gateway 路由与 Client Route Policy 定向测试通过；
- Gateway 路由装配断言覆盖 `system-api`、`lb://mom-system-server` 与 `/api/system/**`；
- Client Route Policy 覆盖 Admin、Supplier、Customer、Mobile Runtime 以及 System Admin 拒绝矩阵；
- 本机 `codex-doctor` 工程基线通过，但宿主 Maven 3.9.0 不满足 `>=3.9.9`，因此正式测试使用合规容器；
- Gateway、IAM、System 健康检查均为 200 / UP；未认证 Gateway 与 System Preference 请求均返回 401；
- 已登录 Admin 经 Gateway 成功读取真实 Preference，并应用 `zh-CN / SYSTEM / COMFORTABLE`；
- 当前没有已发布的 `mom-admin/runtime` Dynamic I18n 资源，真实 404 已按契约降级到静态语言包且不撤销 IAM 会话；
- 真实 I18n 200/304 与 Preference 写入/409 仍待受控测试数据和写操作授权，详细状态见 [S03 实施报告](S03-system-runtime-client-implementation-report.md)。

## 8. 回滚

- 删除 `system-api` 路由即可撤回 Gateway 暴露；
- 删除 System Route Policy 分支即可恢复此前 fail-closed 行为；
- 前端 S03 Runtime 必须具备整体停用开关，回滚到静态主题和双语资源；
- 回滚不得允许浏览器直连 System，也不得扩大 Portal 对 `/api/system/admin/**` 的访问。
