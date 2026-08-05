# MOM-Web S02 UI 与 Shell 基础实施报告

> 实施日期：2026-08-04  
> 阶段：MOM Platform P1.6 / S02  
> 前置：[S02 UI 与 Shell 基础前置评审](S02-ui-shell-preflight-review.md)已获 Chris 独立批准  
> 结论：**COMPLETED — 停在 S03 前**

## 1. 结果

S02 已在不改变后端 API、认证授权、安全错误语义和产品范围的前提下完成。三个应用开始消费 MOM 语义 UI 基础；两个 Portal 已从 Ant Design Vue 全量注册改为具名按需导入，并把已认证内容隔离到异步 Chunk。

本轮没有替换 Admin `BasicLayout`、Router、Vben Preferences/Locales/Stores，也没有接入 Catalog、Preference 或 Dynamic I18n。S03 未自动获得实施授权。

## 2. 交付范围

### 2.1 `@mom/common-ui`

- 建立 `Page`、`DataState`、`ActionBar`、`ConfirmAction`；
- 建立纯视觉 `AuthShell`、`PortalShell`；
- 建立静态 Lucide Registry 与 `MomIcon`，未知 Key 回退为 `circle-help`，不执行动态导入；
- 统一以语义 Token 表达布局、状态和渠道密度，组件不读取 API、Router、Store 或 Permission；
- 删除旧 `Page` 的任意 Class 注入口，公共入口继续只从 `@mom/common-ui` 导出。

### 2.2 应用接入

- Admin Auth Route 使用 MOM `AuthShell`；已认证内容区接入 Page、DataState、ActionBar 和受控 ConfirmAction；
- 高风险操作继续由 Admin 页面拥有命令闭包、原因、提交状态和结果未知语义；
- Supplier/Customer Portal 使用 MOM AuthShell/PortalShell，移除 `.use(Antd)`，认证完成后才加载各自 `App.vue`；
- 两个 Portal 继续保持独立 Runtime、Party 类型、业务文案和发布边界，没有通过 `portalType` 合并应用。

### 2.3 质量门禁

- Bundle 检查支持按应用过滤，但仍读取同一份预算，不放宽目标；
- Portal 建立稳定 vendor 分组，避免单个 Antdv Chunk 超过 500 KB；
- Playwright 支持显式覆盖三应用测试端口，便于与本地已运行服务隔离；
- 新增组件状态、ConfirmAction 焦点返回、Shell 视口、匿名 Chunk 与认证深链回归。

## 3. 共享组件准入登记

|能力|真实消费者|所有者|公共 API 边界|复审条件|
|---|---|---|---|---|
|Page|Admin、Supplier、Customer|MOM-Web Architecture|标题、说明、上下文、操作与默认内容插槽|API 变化需架构评审|
|DataState|Admin、两个 Portal AuthGate|MOM-Web Architecture|显式状态、文案、关联标识与单一操作事件|不得吸收 HTTP/命令状态机|
|ActionBar|Admin、Supplier、Customer|MOM-Web Architecture|上下文、主/次/溢出操作插槽|不得吸收权限判断|
|AuthShell|Admin、Supplier、Customer|MOM-Web Architecture|纯视觉 brand/form/footer/toolbar/artwork 插槽|认证流程去重留在 S11|
|PortalShell|Supplier、Customer|MOM-Web Architecture|Header、身份上下文和内容插槽|不得合并渠道 Runtime|
|ConfirmAction|Admin People & Access|MOM-Web Architecture|受控原因、状态和事件|高风险一致性例外，最晚 S08 复审第二消费者|
|Lucide Registry|DataState、PortalShell；后续 S04/S05|MOM-Web Architecture|静态 `iconKey` Map 与未知回退|Catalog 路由仍必须 fail closed|

## 4. 验收证据

### 4.1 自动化

- ESLint、Stylelint、Token 漂移、TypeScript strict 均通过；
- Vitest + Vue Test Utils：16 个组件测试通过；
- Node 契约测试保留并通过；
- Playwright：17 个场景通过，4 个依赖真实已认证后端状态的场景按既有条件跳过；
- 三应用生产构建通过，公开 Source Map 为 0；
- Supplier/Customer Portal 初始 JS gzip 均约 189.0 KB，低于 250 KB 目标；最大 minified JS Chunk 约 154.5 KB，低于 500 KB 目标；
- Admin 仍受既有 Vben 大 Chunk 约束，保持在 S04/S05 关闭，不以 S02 伪报整体严格目标完成。

### 4.2 真实浏览器

在本地独立端口对生产结构等价的开发入口进行了人工视觉复核：

- Admin 1280×720：MOM AuthShell 双区布局、标题层级、表单和主题工具条正常，无横向溢出；
- Supplier 1280×720：Portal AuthShell 双区布局、表单和品牌信息正常，无横向溢出；
- Customer 360×800：单列布局、触控表单和长说明正常，无横向溢出；
- 自动化另覆盖 Portal 360/768/1280、Admin Auth 1024、200% 文本缩放和匿名深链。

浏览器观察到 Admin 既有 Vben StorageManager 空前缀 warning；没有 error。该提示属于 S04 运行时替换范围，不扩大 S02。

## 5. 明确未做

- 未修改后端、Gateway、IAM/System API、DTO、Token Claim 或权限模型；
- 未替换 Admin `BasicLayout`、Router、导航、Preferences、Locales、Stores 或 Vben Styles；
- 未接入 Preference、Dynamic I18n、Catalog、ETag 或缓存；
- 未拆分 Admin 大型 `App.vue`，未迁移 `@mom/iam-admin`；
- 未建设 Workbench、Delivery、Order、Production、Quality 等未批准页面；
- 未升级 Vue、Vite、Router、TypeScript、Ant Design Vue 或 Lucide；
- 未删除 Vben 快照，未提交 Git、推送或创建 PR。

## 6. 风险与后续停止条件

- Admin Bundle 的严格 500 KB 单 Chunk 目标尚未关闭，必须由 S04/S05 的 Vben 替换与退场解决；
- ConfirmAction 当前以高风险横切能力例外准入，最晚在 S08 复审第二消费者；
- Portal Runtime/Auth/styles 的流程级去重仍属于 S11；
- S03 开始前必须单独评审 System Runtime 契约、Gateway 路由、ETag、用户隔离缓存和跨仓库 E2E 责任边界。

因此本轮在 S02 完成后停止。未经 Chris 独立批准，不进入 S03。
