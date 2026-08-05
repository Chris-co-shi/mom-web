# MOM-Web S03 System Runtime Client 实施报告

> 日期：2026-08-04  
> 阶段：MOM Platform P1.6 / S03  
> 授权：Chris 已批准 S03A，并确认 Gateway、IAM、System 服务已启动  
> Review：**Accepted · Chris Review 2026-08-04**  
> 结论：**CLIENT IMPLEMENTATION COMPLETED / LIVE INTEGRATION PARTIALLY VERIFIED**

## 1. 总体结论

S03 的前端客户端范围已完成：`@mom/api-client` 提供受控条件 GET，新增 `@mom/system-client`，三应用分别拥有独立 Runtime，并在认证成功后读取 Preference 与 Dynamic I18n。客户端实现具备 ETag、同用户 `sessionStorage` 缓存、静态双语回退、输入校验、身份切换清理和 401 终止语义。

真实环境已证明 Admin 登录态可以经 Gateway 读取 Preference；当前 System 中不存在已发布的 `mom-admin/runtime` Dynamic I18n 资源，因此真实响应进入 404 静态回退，Runtime 状态为 `DEGRADED`。这符合 S03A 冻结的失败策略，但不能替代真实 I18n 200/304 验收。

因此，本报告不宣称“生产集成完成”。Chris 已接受 S03 客户端交付；真实 I18n 200/304 与 Preference 写入/409 仍需在有受控测试数据时补证。该批准允许下一轮单独开展 S04 前置评审，但不等于已授权 S04 编码。

## 2. 实施范围

### 2.1 统一请求层

`@mom/api-client` 增加：

- `ApiResponse<T>`：只暴露 `status`、受控响应 Header 和可选 Body；
- `conditionalGet<T>`：把 304 作为成功的重验证结果，不解析空 Body；
- `notifyForbidden: false`：允许 Runtime 本地消费 403，不触发应用级全局 Forbidden 跳转；
- 继续复用既有认证、超时、Correlation ID、Gateway-only、401 刷新和 403 单飞同步实现。

没有引入 Axios、Query Client、第二个 Fetch 或新的生产依赖。

### 2.2 System Runtime

新增 `@mom/system-client`：

- `GET /api/system/preferences/me`；
- `PUT /api/system/preferences/me`；
- `POST /api/system/preferences/me/reset`；
- `GET /api/system/i18n/applications/{applicationCode}/resources/runtime?locale={locale}`；
- `If-None-Match` / ETag 200、304；
- `IDLE / LOADING / READY / DEGRADED` 状态；
- `STATIC / CACHE / REMOTE` 数据来源；
- 退出、401、用户切换和无效缓存清理；
- 延迟响应不得覆盖新身份状态；
- Preference DTO、IANA Zone ID、枚举、版本、RFC 3339 时间验证；
- Dynamic I18n Application/Resource/Locale/ETag/Checksum 校验；
- 只允许 `mom.runtime.*`，禁止危险 Key 段；
- 占位参数必须与客户端声明完全匹配；文案只作为普通文本处理。

缓存键包含 Schema Version、Client ID、Application Code、User ID、Capability、Resource 和 Locale，不跨标签页、浏览器会话或用户复用。

### 2.3 三应用接入

|应用|Client ID|Application Code|接入结果|
|---|---|---|---|
|`mom-admin`|`mom-admin-web`|`mom-admin`|独立 Runtime；Preference 驱动主题、密度和 Locale；动态消息合并到静态资源之上|
|`supplier-portal`|`mom-supplier-web`|`supplier-portal`|独立 Runtime；Preference 驱动主题、密度和文档语言；保存验证后的动态快照|
|`customer-portal`|`mom-customer-web`|`customer-portal`|独立 Runtime；Preference 驱动主题、密度和文档语言；保存验证后的动态快照|

Portal 当前页面尚未迁移到完整 `vue-i18n` 文案体系；该工作保持在 S11，不在 S03 中扩大范围。

匿名状态不会激活 System Runtime，也不会发起 `/api/system/**` 请求。登录、退出、需要重新认证和身份变化会清理或重新初始化各应用自己的 Runtime。

## 3. 明确未实施

- Catalog、Navigation、动态路由、`routeKey` Registry；
- Vben Shell、Router、Store、Locale 或源码快照退出；
- Personal Settings 页面；
- Dynamic I18n Resource/Draft/发布/回滚治理页面；
- Supplier/Customer Future 业务页面；
- 后端 API、数据库、Permission、Token Claim 或测试数据修改；
- 跨应用共享 View Model；
- 通过 404 静态回退宣称 I18n 生产链路完成。

## 4. 自动化验证

|验证|结果|
|---|---|
|`pnpm install --frozen-lockfile`|通过；本机 Node 25 产生预期 Engine 警告|
|`pnpm check`|通过；含 Validate、ESLint、Stylelint、Token、TypeScript、Node 契约、Vitest、组件测试|
|`pnpm build`|三应用通过|
|`pnpm bundle:check`|通过；公开 Source Map 为 0|
|隔离端口 Playwright|通过，25 passed / 5 skipped|
|System Runtime Vitest|覆盖 200/304、同用户降级、跨用户隔离、Namespace、占位参数、401、Preference Save/Reset 与 409|

默认 E2E 端口首次执行时发现 `5556` 被用户已有的另一个 Admin Vite 进程占用。未终止或替换用户进程；改用 `6555/6556/6557` 隔离端口重新验证并通过。

Bundle 当前证据：

- Admin Core/Auth 初始 JS gzip 约 80.2 KB；最大遗留 Chunk minified 约 1321.8 KB；
- Supplier Portal 初始 JS gzip 约 193.4 KB；
- Customer Portal 初始 JS gzip 约 193.4 KB；
- 三应用公开 Source Map 均为 0。

Admin 最大 Chunk 仍未达到最终 500 KB 目标，归属 S04/S05 的 Vben 替换与退出，不在 S03 中伪装关闭。

## 5. 真实环境证据

2026-08-04 本机服务：

- Gateway `:20000/actuator/health`：200 / UP；
- IAM `:20100/actuator/health`：200 / UP；
- System `:20300/actuator/health`：200 / UP；
- 未认证 Gateway 与 System Preference 请求：401；
- 已登录 Admin 经 Gateway 读取 Preference：成功，页面标记 `preferenceSource=remote`；
- 当前偏好结果应用为 `zh-CN / SYSTEM / COMFORTABLE`；
- Dynamic I18n `mom-admin/runtime`：资源未发布，客户端使用静态语言包，标记 `i18nSource=static`、`runtime=degraded`；
- 用户管理深链、登录态和页面操作未因 Runtime 降级中断。

真实浏览器联调期间发现 `vue-i18n` 消息对象是 Proxy，不能直接 `structuredClone`；已改为适用于 JSON 静态语言树的复制方式并重新验证页面恢复。该修正不改变消息安全边界。

## 6. 待补证事项

|事项|状态|原因|关闭条件|
|---|---|---|---|
|真实 Dynamic I18n 200|Pending|当前无已发布 `runtime` 资源|通过受保护治理 API 创建并发布测试资源后验证 Remote 来源|
|真实 Dynamic I18n 304|Pending|缺少可重验证的已发布快照|第二次请求携带 ETag 并获得 304，确认同用户缓存|
|真实 Preference Save/Reset|Pending|会修改当前用户偏好，本轮未擅自执行|由 Chris 在 S07 或专项验收中授权测试写入|
|真实 Preference 409|Pending|需要受控并发版本冲突|使用独立测试用户或受控版本制造冲突并验证错误体验|
|CI Node 24|Pending|本机为 Node 25|由正式 CI 执行全部门禁|

以上场景已有前端单元/契约覆盖，但不是生产集成证据。

## 7. 回滚策略

1. 三应用停止在认证成功后调用 `systemRuntime.activate`；
2. 恢复静态 `zh-CN/en-US`、默认主题和默认密度；
3. 删除当前用户 `mom.system.v1.*` 会话缓存；
4. 保留既有认证和 `@mom/api-client` 请求行为；
5. 不允许回滚方案改为浏览器直连 System，或把 Runtime 失败升级为 IAM 会话失效。

## 8. Review 建议

Chris 已对“客户端实现完成”给出 `Accept`：

- S03 状态为 `Accepted · Client Completed / Live Integration Pending`；
- 真实 I18n 与 Preference 写链路作为明确补证，不得遗失；
- 下一轮单独开展 S04 前置评审，评审通过后才进入编码；
- S04 必须兑现已登记的页面任务头部、筛选栏、内容容器和主从详情布局统一契约。
