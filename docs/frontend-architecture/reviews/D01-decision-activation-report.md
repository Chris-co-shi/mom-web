# MOM-Web D01 决策生效报告

> 执行日期：2026-08-03  
> 授权：Chris 明确批准 D01  
> 前置证据：[D00R 架构复审](D00R-architecture-re-review.md) — GO（仅 D01）  
> 执行结论：**COMPLETED**  
> 下一状态：停在 S00 前，等待独立批准

## 1. 生效结果

D01 已把通过复审的产品与前端架构从评审态转换为正式治理输入，没有修改任何应用代码、共享包、依赖、锁文件或配置。

|对象|D01 前|D01 后|
|---|---|---|
|六份 Product Architecture|Draft|Approved with Deferred Items|
|九份 Frontend Architecture|Proposed / Awaiting Chris Review|Accepted|
|ADR-011～016|Proposed|Accepted|
|ADR-006|Accepted|Superseded by ADR-015|
|ADR-010|Accepted|Superseded by ADR-011|

`Approved with Deferred Items` 不改变页面阶段：Existing/Must Build/Future/Not Build 继续有效，Workbench、Production、Quality、Supplier Delivery、Customer Order 等 Future 页面没有获得实施授权。

## 2. 正式决策关系

### 2.1 Vben

[ADR-011](../../adr/ADR-011-MOM自有轻量前端运行时与Vben渐进退出.md) 取代 [ADR-010](../../adr/ADR-010-MOM-Admin-Vben5.7源码快照.md) 作为当前目标和迁移权威。

ADR-010 仍保留 P1.5 已发生迁入的历史事实。Vben 源码没有在 D01 删除；其来源、补丁、MIT License 和 NOTICE 在 S05 零引用、三应用构建、安全回归、关键 E2E 和许可证门禁全部通过前继续有效。

### 2.2 组件复用

[ADR-015](../../adr/ADR-015-MOM组件复用与共享包准入.md) 取代 [ADR-006](../../adr/ADR-006-共享组件准入边界.md)。新的当前规则要求真实消费者、View Model 输入、无应用基础设施依赖、测试/所有者/Bundle 证据，以及单消费者例外的到期审计。

### 2.3 其他当前决策

- [ADR-012](../../adr/ADR-012-System-Catalog、Preference与Dynamic-I18n客户端边界.md)：Catalog 严格重验证与 fail-closed，Preference/I18n 使用各自允许的缓存和静态回退；
- [ADR-013](../../adr/ADR-013-Ant-Design-Vue作为MOM基础组件库.md)：Ant Design Vue 4.2.6 与 Lucide 单一图标来源；
- [ADR-014](../../adr/ADR-014-用户任务模块与依赖方向.md)：应用 Shell → 用户任务模块 → 客户端契约 → 纯共享能力的单向依赖；
- [ADR-016](../../adr/ADR-016-MOM样式系统与Token单一来源.md)：单一 Token Source 生成 CSS、Tailwind、Antdv 和 TypeScript 映射。

## 3. 历史与台账处理

D01 没有删除或伪造历史。以下材料已增加当前权威说明：

- P1.5 Vben 迁移架构与迁移计划：保留为 Historical；
- 旧设计系统、Monorepo、总体架构和视觉基线：保留已实现事实，P1.6 目标指向 Accepted Frontend Architecture；
- Vben 源码快照台账：标记为冻结迁移例外；
- 开源来源和第三方声明：保留 Vben License/NOTICE，并纠正 MOM 请求层当前使用 Fetch；
- 根 README 与文档中心：改为 P1.6 D01 Completed，明确下一步不是自动建设业务页。

## 4. 本轮明确未做

- 未修改 `apps/` 或 `packages/`；
- 未修改 `package.json`、`pnpm-workspace.yaml`、`pnpm-lock.yaml`；
- 未新增、删除或升级依赖；
- 未删除 Vben 源码或构建适配；
- 未修改 IAM/System API、Gateway、Token Claim 或权限模型；
- 未进入 S00、S01 或任何 UI/Runtime 实现；
- 未提交 Git、推送或创建 PR。

## 5. Deferred 与实施停止线

以下决定继续延期，并阻断对应功能实现：产品正式名称、Workbench 聚合、Portal 通知、Mobile 离线风险分级、Factory 以下数据范围、Phase 02～04 状态机、ERP/MOM 边界、对外质量发布、附件安全以及 3 秒 P75 的正式测量条件。

System S19-A 正式客户端和跨仓库 E2E 未完成前，只能声明 mom-web 客户端准备状态，不能声明生产集成完成。

当前锁文件将 `lucide-vue-next` 标记为 deprecated。ADR-013 接受的是 Lucide 图标体系，不是该具体适配包的永久冻结；S00 必须确认受支持的 Vue 适配包、许可证、Bundle 影响以及是否需要新的生产依赖批准。D01 不据此修改依赖。

S00 必须由 Chris 单独批准。即使 D01 已完成，也不得自动新增 ESLint、Stylelint、Vitest、Vue Test Utils、Playwright、Token 或 Bundle 门禁依赖与配置。

## 6. 验证记录

|检查|结果|
|---|---|
|Markdown 本地链接|PASS：检查 73 份 Markdown，本地链接全部可解析|
|Product/Frontend/ADR 状态矩阵|PASS：6 Product Approved with Deferred Items；9 Frontend 与 ADR-011～016 Accepted；ADR-006/010 Superseded|
|ADR 替代关系双向一致性|PASS：ADR-006 ↔ ADR-015、ADR-010 ↔ ADR-011 及 ADR 索引一致|
|历史/开源治理引用|PASS：历史架构、Vben 快照台账、来源登记和第三方声明均指向当前治理；License/NOTICE 保留|
|`pnpm validate`|PASS：验证 46 项项目边界与 P1.5 安全不变量；本机 Node 25.9.0 产生非 CI 基线 engine 警告|
|代码、依赖和配置越界|PASS：`apps/`、`packages/`、`package.json`、锁文件和 workspace 配置无新增差异|
|环境预检|WARN：本机 Maven 3.9.0 低于平台要求 3.9.9；D01 为纯前端文档状态治理且未运行 Maven，该提示不阻断本轮，也不构成后端验证证据|

## 7. 完成定义

D01 只有在上述检查全部 PASS 后才可称为完成。完成后停止，下一轮只能单独评审和批准 S00 质量安全网，不能跳到 Token、Shell、System Runtime 或业务页面实现。
