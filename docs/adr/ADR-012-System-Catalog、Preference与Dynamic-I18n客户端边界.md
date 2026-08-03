# ADR-012：System Catalog、Preference 与 Dynamic I18n 客户端边界

- 状态：Accepted
- 日期：2026-08-02
- 接受日期：2026-08-03
- 决策人：Chris
- 关联架构：[技术架构](../frontend-architecture/02-technical-architecture.md)
- 替代：无

## 1. 背景

System MVP 已提供 Application Catalog、Navigation、Preference、Locale 与动态国际化能力。前端需要消费这些能力，但不能让服务端元数据变成可执行代码，也不能把运行时失败扩大为三应用不可用。

## 2. 问题

需要确定客户端执行边界、缓存隔离、版本校验和降级语义。本 ADR 不定义后端 API、不把权限生成菜单，也不决定产品信息架构。

## 3. 候选方案

### A. 服务端返回 Path 与 Component 并直接执行

灵活，但扩大远程执行、安全、版本和回滚风险。

### B. 前端完全静态，不消费 System Runtime

简单，但无法使用已确定的治理、偏好和发布快照能力。

### C. 不可执行元数据 + 客户端静态 Registry

服务端治理可见性，客户端控制可执行边界；需要维护契约版本和注册表。

## 4. 决策

选择 C。Catalog 只返回不可执行元数据，客户端以 `routeKey` 和 `routeContractVersion` 映射本地组件。未知键或不兼容版本 fail closed。登录、强制改密、403、404、Runtime Error、Catalog Error、个人偏好等 Core Routes 永远静态存在。

Catalog 只有当前请求返回 200，或服务端以 304 明确完成重验证后，才可驱动动态路由。任何请求失败、认证/授权拒绝、应用停用、未知键、不兼容版本或完整性失败都立即撤销动态路由，只保留静态 Core Routes 并进入受限诊断模式；客户端不得用持久化或内存中的旧 Catalog 降级。Preference 严格对齐后端类型。Dynamic I18n 使用发布快照和 ETag，静态 `zh-CN/en-US` 始终可启动和回退。三个应用创建独立 Runtime 实例。

## 5. 决策理由

该方案在利用 System 治理能力的同时，保留前端构建、审查和 CSP 可控制的执行边界，并服从后端 Catalog 的 `private, no-cache`、即时停用与 fail-closed 语义。页面连续性不能优先于当前发布和权限事实。

## 6. 正向后果

- 服务端不能注入任意组件、路径或脚本。
- Preference/I18n 缓存和渠道状态有明确隔离键；Catalog 不以旧响应作为失败回退。
- Catalog/I18n 故障不必导致认证与诊断页面失效。

## 7. 负向后果与风险

- Catalog 与客户端 Registry 发布需要版本协调。
- 受限模式、动态路由撤销和缓存失效增加测试矩阵。
- Catalog 短期不可用会中断动态页面访问，但这是即时停用和权限正确性的必要代价。

## 8. 实施约束

- Permission 不生成产品菜单；Catalog 不包含远程代码。
- Catalog 响应仅可在本次 200 或服务端确认 304 后使用；网络失败、401/403/404、应用停用、权限变化、Client/Application 变化、未知键和不兼容版本均 fail closed，不读取旧 Catalog。
- Preference 与 Dynamic I18n 的允许缓存必须按用户、Client、Application 和契约版本隔离；退出或身份变化时失效。
- Preference 保存失败、409 或结果未知必须显式呈现。
- API DTO 在模块边界映射 View Model，Admin/Portal 不共享内部字段模型。
- S03/S05 前必须与 System P1.6 客户端集成 Slice 冻结 Gateway 路由、认证、DTO/版本、ETag/304、停用/权限变化和跨仓库 E2E 责任；只有 mom-web Mock 或类型编译时不得宣称集成完成。

## 9. 验证方式

覆盖 Catalog 200/经重验证 304、网络/5xx/401/403/404/应用停用/权限变化时撤销动态路由、未知 `routeKey`、不兼容版本、Preference 缓存命中/失效与跨用户隔离、Preference Reset/409、Locale 缺失 Key 和静态回退。

## 10. 替代或回滚条件

若 System 客户端契约、Gateway 路由、认证上下文或跨仓库 E2E 责任未确认，标记 `Need Backend Confirmation` 并停在静态 Core Runtime；不得临时允许可执行 Catalog，也不得以旧 Catalog 或 Mock 成功绕过。
