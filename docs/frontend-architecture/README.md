# MOM-Web P1.6 前端体系

> 状态：Accepted · Chris Review 2026-08-03
>
> 阶段：MOM Platform P1.6 / S01 Completed
>
> 当前授权结果：S01 Token 与主题已完成；S02 仍需独立批准。

## 1. 目的

本目录把已完成的产品架构转换为可评审、可执行、可回滚的前端架构输入，适用于 `mom-admin`、`supplier-portal`、`customer-portal` 及 MOM 自有共享包。`mom-mobile` 仅参与契约对齐，不属于本次重构范围。

产品定位保持为“面向制造协同任务的多渠道工作空间”。IAM/System 是认证、授权与运行时治理能力，不直接转译为菜单或产品信息架构。

## 2. 阅读顺序

|顺序|文档|回答的问题|
|---|---|---|
|1|[视觉方向](01-visual-direction.md)|产品应呈现怎样的气质与渠道差异？|
|2|[技术架构](02-technical-architecture.md)|保留什么、替换什么、运行时怎样失效？|
|3|[UI 组件库](03-ui-component-library.md)|基础组件、图标与封装边界是什么？|
|4|[目录结构](04-directory-structure.md)|代码放在哪里，哪些目录不得提前创建？|
|5|[模块边界](05-module-boundaries.md)|用户任务模块怎样划分和依赖？|
|6|[复用规则](06-reuse-rules.md)|何时共享，何时保持私有？|
|7|[样式系统](07-style-system.md)|Token、主题、密度和响应式如何治理？|
|8|[实施计划](08-implementation-plan.md)|怎样按 Slice 迁移、验证和回滚？|

决策依据来自已批准的 [Product Architecture](../product-architecture/product-positioning.md)、现有三应用代码、IAM/System 已确认契约以及仓库现有 ADR。六份产品文档已在 D01 同步转为 `Approved with Deferred Items`；Deferred/Future 页面不会因此获得实现授权。

## 3. D00 证据快照

以下事实来自 2026-08-02 的仓库检查，用于约束方案，而不是长期版本清单：

- Workspace 中存在 `mom-admin`、`supplier-portal`、`customer-portal` 三个独立应用；
- Catalog 固定 Vue 3.5.34、Vue Router 5.0.7、Pinia 3.0.4、vue-i18n 11.4.x、Ant Design Vue 4.2.6、Tailwind 4.3.0；根构建使用 Vite 8.0.10、TypeScript 6.0.3、pnpm 11.7.0；
- Vben 快照仍分布在 `internal/`、`packages/@core/`、`packages/effects/` 和相关顶层包，不能在零引用前删除；
- `apps/mom-admin/src/App.vue` 当前为 496 行，是 S06 模块化的已知热点，但 D00 不修改它；
- D00 时仓库只有 Node 契约、Admin Runtime 和 UI 回归测试；S00 已补齐 ESLint、Stylelint、Vitest、Vue Test Utils、Playwright、Token 漂移和 Bundle 门禁，执行证据见 [S00 质量安全网报告](reviews/S00-quality-safety-net-report.md)；
- `@mom/api-client` 的现有请求实现是 Fetch；后续文档和代码不得因旧说明误引入 Axios。

证据与代码冲突时以当前代码、已接受 ADR 和已确认后端契约为准，并在实施前修正文档；未知事项不得凭通用 ERP/MES 经验补齐。

## 4. 决策状态

以下 ADR 已于 2026-08-03 经 Chris Review 接受：

- [ADR-011：MOM 自有轻量前端运行时与 Vben 渐进退出](../adr/ADR-011-MOM自有轻量前端运行时与Vben渐进退出.md)
- [ADR-012：System Catalog、Preference 与 Dynamic I18n 客户端边界](../adr/ADR-012-System-Catalog、Preference与Dynamic-I18n客户端边界.md)
- [ADR-013：Ant Design Vue 作为 MOM 基础组件库](../adr/ADR-013-Ant-Design-Vue作为MOM基础组件库.md)
- [ADR-014：用户任务模块与依赖方向](../adr/ADR-014-用户任务模块与依赖方向.md)
- [ADR-015：MOM 组件复用与共享包准入](../adr/ADR-015-MOM组件复用与共享包准入.md)
- [ADR-016：MOM 样式系统与Token单一来源](../adr/ADR-016-MOM样式系统与Token单一来源.md)

[ADR-006](../adr/ADR-006-共享组件准入边界.md) 与 [ADR-010](../adr/ADR-010-MOM-Admin-Vben5.7源码快照.md) 已转为 Superseded，分别由 ADR-015、ADR-011 取代。Vben 源码仍是有期限的迁移例外，ADR 状态变化不等于源码已经删除。

## 5. 固定边界

- 不改变后端 API、数据库、权限模型、Token Claim 或 Gateway-only 规则。
- 不把服务名直接转换为菜单、目录或用户任务模块。
- 不建设尚未获得产品与后端契约批准的 Workbench、Production、Quality 等页面。
- 不在本阶段决定远程组件、微前端或服务端可执行路由。
- 不通过一个 Role Switch 合并 Admin、Supplier、Customer 渠道。
- 不并行升级 Vue、Vite、Router、TypeScript 或 Ant Design Vue。

## 6. D01/S00/S01 结果与停止条件

D00 首轮结论记录于 [D00 全量架构评审](reviews/D00-architecture-review.md)，修订后的独立结论记录于 [D00R 架构复审](reviews/D00R-architecture-re-review.md)，状态生效证据记录于 [D01 决策生效报告](reviews/D01-decision-activation-report.md)。

D01 已完成以下治理动作：

1. 六份 Product Architecture 转为 `Approved with Deferred Items`；
2. ADR-011～016 转为 Accepted；
3. ADR-011/015 分别取代 ADR-010/006；
4. 索引、历史说明和开源治理引用同步更新。

Chris 已独立批准并完成 S01，实施证据见 [S01 Token 与主题实施报告](reviews/S01-token-theme-implementation-report.md)。当前停在 S02 前：未经独立批准，不建设 Page/DataState/ActionBar、Lucide Registry 或新 Shell，也不进入 System Runtime、Vben 删除或业务模块拆分。
