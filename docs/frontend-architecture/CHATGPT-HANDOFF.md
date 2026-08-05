# MOM-Web P1.6 · ChatGPT 续执行交接

> 快照日期：2026-08-05  
> 当前阶段：S04、S05 Preflight、S05A、S05B 已接受；S05C 后端权限基线修正已实现  
> 下一执行边界：等待本地 IAM 重启应用 Flyway V11；S05D～S05E 与 Vben 删除尚未授权  
> 面向读者：接替当前任务、继续 MOM-Web P1.6 前端体系重构的 ChatGPT 或其他工程工具

## 1. 交接目标

你需要在不丢失既有产品、架构、安全和验证约束的前提下继续 MOM-Web。不要根据本文件直接修改代码；先读取当前仓库、权威文档和实际后端契约，确认它们与本快照一致。

当前仓库：

```text
/Users/sxc/company/IndigoByte Studios/MOM/mom-web
```

关联后端仓库：

```text
/Users/sxc/company/IndigoByte Studios/MOM/mom-platform
```

当前 Git 分支为 `phase/p1.6`。本交接最初生成后已有前端架构文档变更；接手时必须重新执行 `git status --short`，不得清理、覆盖或回退用户已有变更。未经 Chris 明确要求，不提交 Git、不推送、不创建 PR。

## 2. 必须先读的权威资料

按以下顺序读取：

1. [前端架构 README](README.md)；
2. [实施计划](08-implementation-plan.md)；
3. [技术架构](02-technical-architecture.md)；
4. [模块边界](05-module-boundaries.md)与[复用规则](06-reuse-rules.md)；
5. [S04D 收口报告](reviews/S04D-visual-accessibility-bundle-closure-report.md)；
6. [ADR-011：Vben 渐进退出](../adr/ADR-011-MOM自有轻量前端运行时与Vben渐进退出.md)；
7. [ADR-012：Catalog、Preference、Dynamic I18n 客户端边界](../adr/ADR-012-System-Catalog、Preference与Dynamic-I18n客户端边界.md)；
8. 后端仓库的 `AGENTS.md` 以及与 System Catalog、Gateway、IAM 安全契约相关的当前代码和规范。

若代码、已接受 ADR、已确认后端契约与本交接冲突，以当前证据为准，并先修正文档。不得用通用 ERP/MES 经验补全未知内容。

## 3. 已使用的 Skills

以下 Skills 已实际参与当前体系的设计、实现或验收：

|Skill|位置|在本项目中的作用|后续何时使用|
|---|---|---|---|
|`frontend-project-skeleton`|`/Users/sxc/.codex/skills/frontend-project-skeleton/SKILL.md`|冻结视觉、技术栈、目录、模块、复用、Token、质量门禁和逐 Slice 停点|每个新 Slice 的前置评审、实施边界和验收报告|
|`UX 架构师`|`/Users/sxc/.codex/skills/ux-architect/SKILL.md`|审查 Admin Shell、页面层级、响应式、任务导航和布局契约|涉及 Shell、页面布局、信息密度、响应式或交互结构时|
|`UI 设计师`|`/Users/sxc/.codex/skills/ui-designer/SKILL.md`|审查视觉一致性、组件状态、主题、焦点与无障碍|涉及组件视觉、主题、设计系统或页面视觉验收时|
|`browser:control-in-app-browser`|Codex 插件 Skill|在 Chris 手动登录后执行真实 Gateway/IAM 页面、深链、退出、视口和控制台检查|需要已有登录态或真实页面证据时；不得把 Mock 当作真实集成|
|`技术文档工程师`|`/Users/sxc/.codex/skills/technical-writer/SKILL.md`|整理本交接，使状态、停点、命令和风险可直接查阅|新增评审、交接、迁移或验收文档时|

如果接手工具无法加载这些 Skill 文件，至少必须遵守本文件提炼出的边界；不能声称已使用无法访问的 Skill。

## 4. 固定产品与技术决策

- 产品定位是“面向制造协同任务的多渠道工作空间”。
- 保持 `mom-admin`、`supplier-portal`、`customer-portal` 三应用；`mom-mobile` 只做契约对齐。
- IAM/System 是平台能力，不是菜单来源；禁止按微服务名称生成产品导航。
- 禁止形成“一个 Admin + 数百菜单”的超级后台。
- Admin、Supplier、Customer 不得通过 Role Switch 合并。
- 技术栈保持 Vue 3、Vite、TypeScript strict、Vue Router、Pinia、vue-i18n、pnpm。
- 基础组件库为 Ant Design Vue 4.2.6；图标只使用静态 Lucide Registry。
- 样式以语义 Token、Tailwind 4、Antdv Theme Adapter 和少量 scoped CSS 组成。
- 请求层继续使用 `@mom/api-client` 的 Fetch 实现，不引入 Axios 等第二请求层。
- System Catalog 只能返回不可执行元数据；客户端以静态 Registry 映射 `routeKey → Component`。
- 未知 `routeKey`、不兼容 `routeContractVersion`、认证/授权失败、应用停用或完整性失败必须 fail closed。
- Catalog 不允许使用旧内存或持久化快照降级；只有本次 200 或经服务端重验证的 304 可以驱动动态路由。
- Core Routes 永远静态存在：登录、强制改密、403、404、Runtime Error、Catalog Error、个人偏好。
- 不修改后端 API、数据库、权限模型或 Token Claim。

## 5. 当前任务状态

|阶段|状态|关键结果|
|---|---|---|
|D00 / D00R|Completed|产品与前端架构文档完成正式评审和修订|
|D01|Completed|Product Architecture 为 `Approved with Deferred Items`；ADR-011～016 Accepted；ADR-006/010 Superseded|
|S00|Completed|ESLint、Stylelint、Vitest、Vue Test Utils、Playwright、Token/Bundle 门禁建立|
|S01|Completed|Token 单一来源、Light/Dark/System、两密度、首屏主题契约完成|
|S02 / S02R / S02R2|Completed|基础 UI/Shell、Portal 按需加载、登录页与 Admin 用户页视觉修订完成|
|S03|Accepted · Client Completed / Live Integration Pending|System Runtime Client 完成；真实 Preference 读取通过；部分后端数据证据待补|
|S04A～S04D|Accepted · Completed|MOM Admin Shell、Router、任务导航、页面布局、应用级 Vben 零引用、视觉/无障碍/Bundle 收口完成|
|S05 Preflight|Accepted|冻结单 `mom-admin` Application、Group Route Key、I18n Key 与 S05A～E 停点|
|S05A|Accepted|Catalog DTO、严格校验器、无持久化内存状态机与 21 项专项测试完成|
|S05B|Accepted|Admin 动态任务 Route、深链、权限交集、失败撤销与 Mock E2E 完成|
|S05C|Backend Fix Implemented / Live Migration Pending|Flyway V11 与 PostgreSQL IT 已完成，等待 IAM 重启、新 Token 和真实发布|
|S05D～S05E|Not Started / Not Authorized|Vben 删除与封口仍需逐项批准|
|S06～S12|Not Started / Not Authorized|按实施计划逐 Slice 推进|

## 6. S04D 最终证据

- 真实 `/iam/users` 与 `/iam/roles` 页面通过登录后检查；深链刷新和退出行为正确。
- 1024 / 1280 / 1600 视口通过；1024 自动折叠后回到 1600 可恢复桌面侧栏状态。
- Light/Dark/System、Comfortable/Compact、`prefers-reduced-motion`、200% 文本缩放均有自动化覆盖。
- Dialog 焦点进入、关闭后返回触发按钮通过真实页面和组件测试。
- `apps/mom-admin` 中 `@vben/*` 直接引用为 0。
- Admin 专项 E2E：11 passed / 3 skipped。
- 全量 E2E：29 passed / 13 按渠道跳过。
- 三应用生产构建、`pnpm bundle:check`、`pnpm bundle:target` 均通过。
- Bundle：Admin 初始 JS gzip 1.3 KB、最大 Chunk 256.0 KB；两个 Portal 初始 JS gzip 193.6 KB、最大 Chunk 153.0 KB；公开 Source Map 为 0。
- 本地 Node 25.9.0 只有已知 Engine Warning；正式 CI 证据必须使用 Node 24。

## 7. 已知未完成证据与风险

以下项目没有被误报为完成：

- Dynamic I18n 真实 200/304：当前 System 没有已发布的 `runtime` 资源。
- Preference 保存、Reset、409 冲突的真实后端证据。
- 真实多 Factory 账号切换；当前账号无 Factory Selector，行为由隔离 E2E 覆盖。
- 企业网络条件下核心页面 3 秒 P75。
- 更完整的真实浏览器/设备产品矩阵。
- Node 24 正式 CI 结果。

S04D 接受不代表这些证据已经完成；应在对应后续 Slice 或 S12 明确补证。

## 8. 下一步：关闭 S05C 后端权限阻塞

S05 Preflight、S05A、S05B 已接受，S05C 前置核验已落盘：

```text
docs/frontend-architecture/reviews/S05-catalog-vben-exit-preflight-review.md
docs/frontend-architecture/reviews/S05A-catalog-contract-runtime-implementation-report.md
docs/frontend-architecture/reviews/S05B-admin-dynamic-router-implementation-report.md
docs/frontend-architecture/reviews/S05C-live-catalog-integration-preflight.md
```

S05B 已完成：

1. Core Route 静态保留，六个任务 Route 改为 Catalog 动态激活；
2. Admin 静态 Group/Task Registry 与单 `mom-admin` Catalog Contract；
3. IAM Permission、Catalog Route 与客户端 Registry 三方交集；
4. 首次深链单次重匹配、任务导航/Factory/权限/前台恢复重验证；
5. 失败先撤销 Route，再进入静态 Catalog Error；
6. Unit、UI Regression 和 Mock 200/304/503 E2E。

S05C 只读核验确认 Gateway、IAM、System 均健康，但 IAM 没有登记 System Controller 要求的 `system:i18n:read/write/publish`。Chris 已明确授权并完成 Flyway V11 与 PostgreSQL IT；当前等待 IAM 重启应用 Migration，并在新 Token 下通过正式治理 API 发布 `mom-admin/runtime`，然后发布 Catalog Release并执行 Gateway/IAM/System E2E。S05D 仍需 Chris 选择删除恢复点。

在权限阻塞关闭前明确禁止：

- 修改依赖、锁文件、workspace 配置或构建配置；
- 通过 SQL、测试 JWT 或 Controller 放宽创建 System Catalog/Dynamic I18n 发布数据；
- 删除 Vben 源码快照；
- 用 Mock、类型编译或旧 Catalog 快照声明真实集成完成；
- 自动进入 S05D 或任何后续实施。

## 9. S05 之后的剩余路线

只有相应前置评审和 Chris 批准后，才能依次推进：

1. S05：Catalog 与 Vben Workspace 退场；
2. S06：Admin 模块化，拆分大型 `App.vue`，落地 People & Access、Security Operations；
3. S07：Personal Settings；
4. S08：Experience Governance；
5. S09：Dynamic I18n Governance；
6. S10：Runtime Configuration；
7. S11：Supplier/Customer Portal 骨架治理；
8. S12：安全、E2E、视觉、无障碍、Bundle、三应用构建和文档封板。

Future 的 Workbench、Production、Quality、Delivery、Order 等页面不会因前端重构自动获得建设授权。

## 10. 验证命令

每个代码 Slice 从仓库当前脚本核对后，至少执行：

```bash
pnpm install --frozen-lockfile
pnpm validate
pnpm lint
pnpm stylelint
pnpm tokens:check
pnpm check:type
pnpm test
pnpm test:component
pnpm build
pnpm bundle:check
pnpm bundle:target
```

涉及 Router、认证、System Runtime、Shell 或 Catalog 时增加：

```bash
pnpm test:e2e
```

文档切片至少执行 Markdown 本地链接检查、状态一致性检查、`git diff --check` 和越界检查。命令失败、跳过或环境未就绪必须如实记录为 `FAIL`、`SKIPPED` 或 `BLOCKED`。

## 11. 可直接交给 ChatGPT 的起始指令

```text
继续 MOM-Web P1.6 前端体系重构。仓库位于：
/Users/sxc/company/IndigoByte Studios/MOM/mom-web

先完整阅读 docs/frontend-architecture/CHATGPT-HANDOFF.md、README.md、
08-implementation-plan.md、02-technical-architecture.md、S04D 报告、ADR-011、ADR-012，
并读取 mom-platform/AGENTS.md 以及当前 System Catalog/Gateway/IAM 契约。

先阅读 docs/frontend-architecture/reviews/S05C-live-catalog-integration-preflight.md，
确认 mom-platform 的 Flyway V11 与 PostgreSQL IT 已完成。
先让本地 IAM 重启应用 Migration，并只读确认权限和 PLATFORM_ADMIN 关系；
再继续 S05C 的正式治理 API 发布。不得用 SQL 绕过，不删除 Vben，不提交 Git。
```

## 12. 交接停止条件

本文件只提供续执行上下文，不授权任何新 Slice。S05B 已接受，S05C 的 IAM Dynamic I18n 权限基线修正已完成；IAM 重启并只读确认 V11 后才能继续真实 System 发布与跨仓库 E2E。S05B 不等于真实 Catalog 集成完成，更不等于批准删除 Workspace Vben 快照。
