# 02 · 技术架构

> 状态：Accepted · Chris Review 2026-08-03
>
> 关联决策：[ADR-011](../adr/ADR-011-MOM自有轻量前端运行时与Vben渐进退出.md)、[ADR-012](../adr/ADR-012-System-Catalog、Preference与Dynamic-I18n客户端边界.md)

## 1. 保留基线

本轮保留 Vue 3、Vite、TypeScript strict、Vue Router、Pinia、vue-i18n 和 pnpm。迁移期间不同时升级这些基础设施，也不升级 Ant Design Vue。

现有 MOM 自有契约继续有效：

- 浏览器只访问 MOM Gateway；
- 三应用保持独立 Client 与 `user_type` 校验；
- Party/Factory 上下文、Token 存储、刷新与 403 Single Flight 同步语义不变；
- `@mom/api-client` 继续使用现有真实 Fetch 实现，不新增 Axios 等第二请求层；
- Node 契约测试保留，后续补充 Vitest、Vue Test Utils 与 Playwright。

## 2. 迁移策略

采用原位 Strangler：逐项用 MOM 自有 Bootstrap、Router、Shell、Runtime、Locales、Stores、Styles 和 Access Route 替代 Vben 能力。禁止创建长期并行的 `mom-admin-next`。

Vben 源码快照只有在以下条件全部满足后删除：

1. 仓库内零运行时、构建和类型引用；
2. 三应用构建、安全回归和关键 E2E 通过；
3. URL、深链、权限和错误语义保持；
4. License、NOTICE 与第三方来源台账更新完成。

[ADR-010](../adr/ADR-010-MOM-Admin-Vben5.7源码快照.md) 已被 ADR-011 取代，但其来源、补丁和 License/NOTICE 记录在 Vben 源码实际删除前继续作为迁移证据有效。

迁移期规则按“新旧分治”执行：新增或实质修改的 MOM 自有代码从对应 Slice 起遵守 ADR-013/016 的组件、图标和样式约束；现有 Vben/Reka/Iconify/Sass 只作为冻结的历史快照例外，不得增加依赖、调用面或复制到 `@mom/*`。例外在 S05 满足全部删除门禁后终止。

## 3. 运行时组成

```text
App Bootstrap / Provider
        |
        +-- Auth Runtime（现有契约）
        +-- System Runtime（Catalog / Preference / I18n）
        +-- Router（Core Routes + Static Registry）
        +-- Theme / Locale / Density
        `-- App Shell
```

每个应用创建独立 Runtime 实例；不得跨应用共享 Store、内存 Session 或用户缓存。

## 4. 路由与 Catalog

Core Route 永远静态存在：登录、强制改密、403、404、Runtime Error、Catalog Error、个人偏好。

System Catalog 仅提供不可执行元数据。客户端使用受版本控制的静态 Registry 把 `routeKey` 映射到组件及路由约束：

```text
Catalog routeKey + routeContractVersion
                    |
                    v
        Client Static Route Registry
                    |
                    v
          Local Component / Route
```

- 未知 `routeKey`：拒绝注册并进入可诊断的受限状态；
- 不支持的 `routeContractVersion`：fail closed；
- Catalog 不得下发 Component、脚本、任意 Path 或远程代码；
- Permission 控制能力访问，但不能自动生成信息架构。

## 5. 降级与缓存

|能力|正常路径|失败路径|
|---|---|---|
|Catalog|使用当前请求的 200，或经服务端重验证确认的 304 与对应私有表示|立即撤销动态路由，只保留静态 Core Route，进入 Catalog Error/受限诊断模式；不得读取旧响应降级|
|Preference|读取并合并服务端偏好|使用明确默认值或同一用户隔离缓存，不把失败伪装为保存成功|
|Dynamic I18n|发布快照 + ETag / 304|静态 `zh-CN`、`en-US` 启动资源回退|
|认证|现有刷新与 Single Flight|沿用现有 fail-closed 与重新登录语义|

Catalog 响应只有在本次请求得到 200，或服务端以 304 明确完成重验证后才可驱动动态路由。网络失败、超时、401/403/404、应用停用、未知 `routeKey`、不兼容版本或完整性失败均不得复用持久化或内存旧 Catalog；`private, no-cache` 与即时 Kill Switch 语义优先于页面连续性。

Preference 与 Dynamic I18n 的允许缓存必须按后端契约版本化，不得跨用户、跨 Client 或跨 Application 复用；退出登录、身份变化和不兼容版本必须使相关缓存失效。静态 Core Route 和静态双语资源不是 Catalog 旧快照。

## 6. 数据边界

- API DTO 在模块边界映射成 View Model；页面和共享组件不直接消费后端 DTO。
- Admin 与 Portal 不共享包含内部字段、内部状态或内部权限语义的 View Model。
- 共享组件只接收 View Model、显式状态和事件，不访问 API、Router、Store 或权限服务。
- 前端只呈现后端业务事实，不复制生产、质量或库存状态机。
- Preference 严格对齐后端已确认类型：Locale、显示时区、Theme、Density、Page Size 与受限 View。

## 7. 状态与错误体验

状态按职责分为两类，不能用一个 `error` 布尔值承载：

|类别|必须建模的状态|统一责任|
|---|---|---|
|页面/数据|Loading、Empty、No Result、Error、Forbidden、Not Found、Partial|Shell/`DataState` 提供一致语义和恢复入口，模块提供任务文案与可执行下一步|
|命令|Idle、Submitting、Processing、Succeeded、Conflict、Rate Limited、Result Unknown|模块用例持有状态机；`ConfirmAction` 等语义组件只呈现显式输入，不推断业务结果|

最低错误映射为：401 进入现有刷新/重新认证流程；403 呈现 Forbidden 且不泄露对象；404 按契约呈现 Not Found；409 呈现 Conflict 并要求刷新权威状态；429 呈现 Rate Limited 与允许的重试时间；5xx/网络失败在读操作进入 Error，在无法确认写结果时进入 Result Unknown。所有映射都保留后端最终授权与防枚举语义，不能折叠成通用 Toast。

## 8. System 跨仓库集成门禁

S03/S05 开始前必须与 System P1.6 客户端集成 Slice 共同冻结：Gateway 路由、认证上下文、DTO/版本、ETag 200/304、Catalog 停用与权限变化、Preference 409/Reset、Dynamic I18n 静态回退，以及跨仓库 E2E 的所有者和执行位置。

mom-web 可以先完成静态客户端契约与组件实现，但在真实 Gateway、认证和 System Runtime 证据完成前，只能报告“客户端准备完成”，不能报告“平台集成完成”或“生产可用”。契约未确认时停在静态 Core Runtime，不以 Mock 或旧快照绕过。

## 9. 非目标

- 不更改 IAM/System 后端契约、权限模型或 Token Claim。
- 不引入 SSR、微前端、远程组件、第二状态库或第二请求客户端。
- 不因目录迁移重写已有认证和安全语义。
- 不在缺少后端聚合契约时实现工作台聚合。
