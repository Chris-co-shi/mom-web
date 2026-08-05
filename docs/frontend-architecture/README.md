# MOM-Web P1.6 前端体系

> 状态：Accepted · Chris Review 2026-08-03
>
> 阶段：MOM Platform P1.6 / S05C · Backend Fix Implemented / Live Migration Pending
>
> 当前授权结果：Chris 已接受 S05B 并批准 S05C，也已批准并完成 IAM Dynamic I18n 权限基线代码修正；当前等待 IAM 重启应用 Flyway V11，Vben 删除仍未授权。

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

## 6. D01/S00/S01/S02/S02R 结果与停止条件

D00 首轮结论记录于 [D00 全量架构评审](reviews/D00-architecture-review.md)，修订后的独立结论记录于 [D00R 架构复审](reviews/D00R-architecture-re-review.md)，状态生效证据记录于 [D01 决策生效报告](reviews/D01-decision-activation-report.md)。

D01 已完成以下治理动作：

1. 六份 Product Architecture 转为 `Approved with Deferred Items`；
2. ADR-011～016 转为 Accepted；
3. ADR-011/015 分别取代 ADR-010/006；
4. 索引、历史说明和开源治理引用同步更新。

Chris 已独立批准并完成 S01 本地实现，实施证据见 [S01 Token 与主题实施报告](reviews/S01-token-theme-implementation-report.md)；2026-08-04 已补齐真实 IAM 登录后的 1024px Light/Dark/Comfortable 视觉证据，Compact 由专项 E2E 与 Token 契约覆盖，用户偏好入口仍留在 S07。

S02 的冻结范围见 [S02 UI 与 Shell 基础前置评审](reviews/S02-ui-shell-preflight-review.md)，实现与验收证据见 [S02 UI 与 Shell 基础实施报告](reviews/S02-ui-shell-implementation-report.md)。S02 已建立语义组件、Auth/Portal Shell、静态 Lucide Registry 和 Portal 按需分包；没有替换 Admin `BasicLayout`、Router 或 Vben Runtime。

S02 完成后的专项页面复核与修订记录于 [S02R UI Review 修订报告](reviews/S02R-ui-review-remediation-report.md)。三应用匿名认证入口已关闭任务标题层级、表单可访问名称、工具按钮名称和 Portal 内部术语暴露问题；Admin 任务导航、全量动态国际化和 Vben 运行时退出仍分别属于 S04/S06、S03/S11、S04/S05，不因 S02R 自动获准实施。

Chris 对已登录用户页的截图复核发现内容安全边距失效、筛选与主操作失联、未选中详情时目录半宽及页面说明暴露实现术语。修订与证据记录于 [S02R2 Admin 用户页视觉修订报告](reviews/S02R2-admin-user-page-visual-remediation-report.md)。S02R2 已通过 Review；页面任务头部、筛选栏、内容容器和主从详情布局必须在 S04 沉淀为统一组件或等价组合契约，而不是继续复制页面私有样式。

[S03 System Runtime Client 前置评审](reviews/S03-system-runtime-client-preflight-review.md)记录了最初的跨仓库阻塞；[S03A 跨仓库契约关闭报告](reviews/S03A-cross-repository-contract-closure-report.md)冻结 Gateway 路由、三渠道 Application/Resource/Namespace、`sessionStorage` 隔离、条件 GET 接口与 E2E 责任；Chris 已接受 [S03 实施报告](reviews/S03-system-runtime-client-implementation-report.md)中的客户端实现、自动化和真实 Preference 读取证据。当前 System 没有已发布的 `runtime` 资源，因此 I18n 200/304 与 Preference 写入/409 仍是显式待补证项，不得宣称生产集成完成。

[S04 Admin Shell、Router 与页面布局前置评审](reviews/S04-admin-shell-router-layout-preflight-review.md)已经 Chris 接受，导航采用“人员与访问 / 安全运营”并删除应用内 Tabbar 的决策已冻结。S04A、[S04B Admin Shell 与任务导航实施报告](reviews/S04B-admin-shell-task-navigation-implementation-report.md)、[S04C 实施报告](reviews/S04C-admin-runtime-vben-exit-implementation-report.md)及 [S04D 视觉、无障碍、Bundle 与文档收口报告](reviews/S04D-visual-accessibility-bundle-closure-report.md)均已 Accepted，S04 至此完成。

[S05 Catalog 与 Vben 退场前置评审](reviews/S05-catalog-vben-exit-preflight-review.md)已经 Chris 接受，冻结单一 `mom-admin` Application、Group Route Key 与 Dynamic I18n Key。[S05A Catalog 契约与内存 Runtime 实施报告](reviews/S05A-catalog-contract-runtime-implementation-report.md)与 [S05B Admin Catalog 动态 Router 实施报告](reviews/S05B-admin-dynamic-router-implementation-report.md)均已 Accepted。[S05C 真实发布前置核验](reviews/S05C-live-catalog-integration-preflight.md)发现 IAM 未登记 `system:i18n:read/write/publish`；Chris 已批准并完成 Flyway V11 与 PostgreSQL IT，当前等待 IAM 重启应用 Migration，完成只读复核前不得发布 I18n 或 Catalog。S05D Vben 删除仍未授权。

跨工具续执行所需的仓库位置、已用技能、当前状态、门禁、风险和下一步停点见 [ChatGPT 续执行交接](CHATGPT-HANDOFF.md)。
