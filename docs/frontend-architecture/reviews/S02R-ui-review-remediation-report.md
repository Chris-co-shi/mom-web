# MOM-Web S02R UI Review 修订报告

> 评审与修订日期：2026-08-04  
> 阶段：MOM Platform P1.6 / S02R  
> 前置：S02 已完成，Chris 已批准插入专项 UI Review 修订  
> 结论：**S02R PASS；MOM-Web 最终视觉验收仍为 CONDITIONAL PASS**

## 1. 结论

三应用匿名认证入口已达到 S02 对 AuthShell、渠道视觉、响应式和基础无障碍的要求。本轮关闭了首次真实页面复核发现的四类问题：任务标题层级、表单标签关联、图标按钮名称和 Portal 面向外部用户的文案边界。

本结论只覆盖匿名认证入口及 S02 UI/Shell 基础，不代表整个 MOM-Web 已完成最终设计验收。Admin 当前业务导航仍带有按 IAM 技术对象组织的历史结构；Portal 全量动态国际化、Admin Vben Runtime 退出和已认证业务页任务化仍有明确后续 Slice，因此整体维持 `CONDITIONAL PASS`，不得据此进入 S03 或宣布前端重构完成。

## 2. 评审依据

- [视觉方向](../01-visual-direction.md)：内容优先、任务优先、渠道差异、WCAG 2.2 AA；
- [UI 组件库](../03-ui-component-library.md)：Ant Design Vue 适配边界与显式状态；
- [样式系统](../07-style-system.md)：语义 Token、渠道密度、360px Portal、1024px Admin；
- [实施计划](../08-implementation-plan.md)：一个 Slice 一次 Review，S03 独立授权；
- 当前三应用源码、生产构建、Playwright 最终 DOM 与真实浏览器截图。

## 3. 问题关闭矩阵

|问题|原影响|本轮修订|证据与结论|
|---|---|---|---|
|品牌标题与登录任务同时使用标题元素|一个页面出现品牌与任务两个竞争层级，屏幕阅读器无法快速定位当前任务|品牌标题改为视觉标题，登录/首次改密成为唯一 `h1`|三应用 Playwright 均断言唯一 level-1 heading；PASS|
|FormItem 只有视觉标签|账号、密码控件的可访问名称不稳定|所有认证字段建立显式、唯一的 `html-for → id` 关联|最终 DOM 可按“账号/用户名”“密码”定位；PASS|
|Admin 登录页存在无名称或弱名称图标按钮|键盘和辅助技术用户无法理解操作；颜色/布局入口干扰登录任务|移除颜色与布局调试入口；语言、主题按钮增加本地化目标名称|最终 DOM 仅保留“语言”“深色/浅色”按钮，空名称按钮为 0；PASS|
|Portal 暴露 IAM、Factory Scope、Portal Session|把平台实现细节暴露给供应商/客户，破坏渠道边界|替换为“贵司”“授权工厂”“进入协同门户”等任务文案|E2E 阻断 `IAM / Factory Scope / Portal Session`；PASS|

## 4. 页面逐项结论

|页面|视觉与任务层级|渠道边界|无障碍|结论|
|---|---|---|---|---|
|MOM Admin 登录|中高密度、克制、任务标题明确；品牌插画不与主操作竞争|内部账号与管理渠道表达清楚|唯一 `h1`、具名字段、具名语言/主题按钮、焦点样式可见|PASS for S02R|
|Supplier Portal 登录|留白和触控尺度符合 Portal；任务标题明确|文案只表达贵司及授权工厂范围，不暴露内部模型|唯一 `h1`、具名字段、360px 无横向溢出|PASS for S02R|
|Customer Portal 登录|与 Supplier 共享基础语言但保留渠道标识|不通过角色切换合并渠道，不暴露内部模型|唯一 `h1`、具名字段、360px 无横向溢出|PASS for S02R|

## 5. 明确未关闭

以下事项不属于 S02R，不允许通过扩大本轮修订顺带实现：

1. **Admin 信息架构与导航**：当前历史导航仍接近“系统管理 → 用户/角色/权限/会话/审计/OAuth Client”。它不满足最终用户任务域目标，必须在 S04/S06 结合 MOM Shell 和 People & Access / Security Operations 模块治理，不能把服务或权限对象继续扩展成超级后台菜单。
2. **动态国际化与用户偏好**：Portal 当前中文静态文案仍是启动回退资源，不等于 S03 Dynamic I18n 或 S11 Portal Runtime 已完成。
3. **样式迁移完成度**：MOM 自有 S02 样式遵循语义 Token，但 Admin 仍包含 Vben/Tailwind 历史运行时与迁移例外；零引用和退出门禁属于 S04/S05。
4. **已认证业务页面完整视觉验收**：本轮只对匿名认证入口做真实浏览器复核。Admin 已认证任务页、Portal Future 业务页必须在各自获批 Slice 独立评审；未批准页面仍为 Not Build/Future。

## 6. 自动化与浏览器证据

执行结果：

- `pnpm check`：通过；包含 Validate、ESLint、Stylelint、Token 漂移、TypeScript strict、Node 契约、Vitest 与 Vue Test Utils；
- `pnpm build`：三应用通过；公开 Source Map 为 0；
- `pnpm bundle:check`：通过；
- `pnpm bundle:target:portal`：通过；Supplier/Customer 初始 JS gzip 均为 189.1 KB，最大 minified JS Chunk 均为 154.5 KB；
- 隔离端口 `pnpm test:e2e`：22 passed、5 条按渠道条件跳过、0 failed；
- 真实浏览器：Admin、Supplier、Customer 最终 DOM 与桌面视觉复核通过；自动化另覆盖 Admin 1024/1280/1600、Portal 360/768/1280、200% 文本缩放和主题切换。

本地使用 Node 25.9.0，存在已知 Engine Warning；正式 CI 证据仍以计划冻结的 Node 24 为准。该警告没有被误报为正式环境兼容性证据。

## 7. 变更边界与停止条件

- 未修改后端、Gateway、IAM/System API、DTO、Token Claim、权限模型或认证状态机；
- 未新增/升级依赖，未修改锁文件作为 S02R 内容；
- 未重组 Admin 导航、未接入 System Runtime、未删除 Vben 快照；
- 未提交 Git、推送或创建 PR；
- S03 前置评审仍为 `NO-GO`。关闭 Gateway 路由、Application/I18n Resource Code、ETag 元数据接口及跨仓库 E2E 责任之前，不得进入 S03。
