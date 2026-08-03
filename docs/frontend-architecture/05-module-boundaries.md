# 05 · 模块边界

> 状态：Accepted · Chris Review 2026-08-03
>
> 关联决策：[ADR-014](../adr/ADR-014-用户任务模块与依赖方向.md)

## 1. 划分原则

模块围绕“用户任务 + 业务能力 + 数据边界”建立，不围绕后端服务、数据库 Schema 或权限编码建立。IAM/System 是模块依赖的平台能力，不能直接生成 `IAM / System / Production` 菜单。

一个模块必须同时具备：明确用户、可陈述的日常任务、稳定业务语言、独立路由入口或工作流、可验证的数据边界。缺少这些证据时标记 `Need Product Decision` 或 `Need Backend Confirmation`，不创建目录。

## 2. Admin P1.6 模块

|模块|用户目标|核心任务|依赖能力|明确不包含|
|---|---|---|---|---|
|People & Access|让正确的人以正确范围进入应用|用户、角色、授权、应用访问关系|IAM 用户/角色/权限/应用|业务组织主数据、员工全生命周期|
|Security Operations|发现并处理访问安全风险|Session、审计、安全事件诊断|IAM Session/Audit|SOC/SIEM 替代、基础设施监控|
|Experience Governance|治理应用入口与导航发布|Catalog、Navigation Draft、发布、回滚|System Application Catalog/Navigation|任意路径、组件或远程代码编辑|
|Runtime Configuration|维护受控运行参数与字典|非秘密 Parameter、Dictionary/Item|System Parameter/Dictionary|Secret、主数据、权限、业务状态|
|Personal Settings|控制个人显示体验|Locale、时区、Theme、Density、Page Size、View|System Preference|权限、Factory 业务时区、业务事实|

工作台不在 P1.6 自动获准。统一工作台需要后端提供面向角色的聚合、时效和数据范围契约；在证据缺失前为 `Need Backend Confirmation`。

## 3. 长期任务域

以下是产品架构的演进边界，不是当前页面建设清单：

- Work Management
- Inbound Collaboration
- Manufacturing Operations
- Quality Decisions
- Inventory & Fulfillment
- Traceability & Response

任何长期模块进入实现前都需要产品目标、角色任务、页面地图、后端契约与验收指标，不得因已有 MES/WMS/QMS 服务名而创建。

## 4. Portal 模块边界

Supplier Portal 面向供应商联系人，候选任务域为 Delivery Collaboration、Incoming Quality、Documents；Customer Portal 面向客户联系人，候选任务域为 Order Fulfillment、Shipment Visibility、Quality Feedback。P1.6 S11 只治理两个 Portal 的认证、Runtime、Router、I18n、Token、主题与响应式 Shell，以上 Future 业务页均不建设。

Portal 与 Admin 是独立安全和信息架构边界：不得用 Role Switch 合并，不得暴露内部审计字段、内部配置、内部导航治理或超出 Party/Factory 范围的数据。

## 5. 依赖方向

```text
App Bootstrap / Router / Shell
              ↓
      User-task Modules
              ↓
 Module Public Contracts / MOM Clients
              ↓
 common-ui / design-tokens / pure utilities
```

- Router 只组合模块公开路由和 Core Routes，不读取模块内部实现；
- 模块通过客户端契约访问后端，不共享可变 Store；
- 共享组件不访问 API、Router、Store 或权限；
- `api-client` 不知道业务页面，`system-client` 不拥有产品导航；
- 前端不得实现跨域业务事务或制造状态机。

## 6. 跨域跳转

跨域跳转使用稳定业务标识和目标模块公开的路由契约。来源模块不能拼接目标模块内部 Path，也不能读取其 Store。若目标模块未安装、Catalog 未授权或数据范围不允许，应返回明确的 Forbidden/Unavailable 状态，而不是静默跳到首页。

## 7. 边界治理

新增或提升模块时必须回答：目标用户、核心任务、数据所有者、公开入口、允许依赖、禁止依赖、错误状态、消费者和删除/迁移影响。依赖图检查、深层导入检查和循环依赖检查在 S00 建立；未经 ADR 不允许例外。
