# 08 · 实施计划

> 状态：Accepted · Chris Review 2026-08-03
>
> 当前执行状态：S01 Token 与主题已完成；停在 S02 前。

## 1. 执行原则

- 一个 Slice 一次 Review，独立构建、验证和回滚；
- 先冻结契约与失败行为，再替换实现；
- 兼容层必须登记消费者、所属 Slice 和删除条件；
- Product Architecture 中的 Deferred/Future 页面不因技术 Slice 自动获准；
- 不提交 Git、不推送、不创建 PR，除非 Chris 明确要求。

## 2. 文档阶段

### D00 · 架构文档落盘（已完成）

- 范围：本目录九份文档、ADR-011～016 Proposed、ADR 索引；
- 非范围：代码、依赖、配置、现有 ADR 状态；
- 验收：链接有效、六项 ADR 均为 Proposed、ADR-006/010 仍为 Accepted、前端现有验证不回归；
- 回滚：只删除本次新增文档并还原索引，不影响运行代码；
- 停止：等待 Chris Review。

### D00R · 评审问题修订与复审（已完成）

- 前置：[D00 全量架构评审](reviews/D00-architecture-review.md) 结论为 `CONDITIONAL GO`；
- 范围：关闭评审中的 Catalog fail-closed、Product 状态治理、System 产品范围、状态模型、Vben 迁移例外、响应式基线、跨仓库门禁、Bundle 测量和共享包准入问题；生成独立复审记录；
- 非范围：修改 Draft/Proposed/Accepted 状态、代码、依赖、配置、ADR 替代关系或 Future 页面阶段；
- 验收：Blocker/Major 全部关闭，Minor 进入明确条款，链接/状态/`pnpm validate`/越界检查通过；
- 回滚：回退 D00R 文档补丁，不影响运行代码；
- 停止：等待 Chris 单独批准 D01。

### D01 · 决策生效

- 状态：Completed — 2026-08-03；验证证据见 [D01 决策生效报告](reviews/D01-decision-activation-report.md)；
- 前置：D00R 独立复审为 GO，且 Chris 明确批准 D01；
- 范围：六份 Product Architecture 转为 `Approved with Deferred Items`；ADR-011～016 转 Accepted；ADR-011 取代 ADR-010，ADR-015 取代 ADR-006；更新索引、旧架构文档和开源台账引用；
- 非范围：业务代码与 UI；
- 验收：决策状态和交叉链接无冲突；Deferred/Future/Not Build 标记保持有效，未批准业务页面没有获得实现授权；
- 回滚：若状态、替代关系或链接无法一致成立，则整体回退 D01 状态变更并保持在 S00 前。

## 3. 代码 Slice

|Slice|目标与主要范围|前置条件|验收重点|风险与回滚|
|---|---|---|---|---|
|S00 质量安全网（Completed）|增加 ESLint、Stylelint、Vitest、Vue Test Utils、Playwright、Token/Bundle 门禁；保留 Node 契约测试；冻结六个 IAM URL、三应用 Client/`user_type`、安全和构建基线；冻结可重复的 Bundle 测量协议|D01 Accepted|新增门禁可在 CI Node 24 运行；现有契约测试不被替换；Bundle 的入口、求和、gzip、Source Map 与基线可复现|完成证据见 [S00 质量安全网报告](reviews/S00-quality-safety-net-report.md)；严格 Bundle 目标仍为红色，不得误报达标|
|S01 Token 与主题（Completed）|建立单一 Token Source，生成 CSS/Tailwind/Antdv/TS；三主题、两密度、防闪烁；一个 IAM 示范页|S00|Token 无漂移，主题切换和可信启动值恢复契约可测；真实用户偏好持久化仍属 S03|完成证据见 [S01 实施报告](reviews/S01-token-theme-implementation-report.md)；保留 Legacy Provider 回滚入口，真实 IAM 示范页视觉待环境验证|
|S02 UI 与 Shell 基础|Page、DataState、ActionBar、ConfirmAction、Lucide Registry；Admin/Portal/Auth Shell；Portal 按需 Antdv|S01|页面/数据与命令状态类型分离；组件交互、焦点与渠道视口通过；Bundle 下降|封装过度；保持页面可直接用 Antdv 原语，命令状态机留在模块|
|S03 System Runtime Client|Preference、Dynamic I18n、ETag、契约允许的用户隔离缓存和静态双语回退；三应用独立 Runtime|S00～S02；跨仓库契约门禁已冻结|200/304、失效、409、服务不可用、跨用户隔离；不包含 Catalog 旧快照降级|缓存污染；命名空间版本化，可整体禁用 Preference/I18n 缓存回退|
|S04 Admin Shell 与 Router|用 MOM Shell、Core Routes、Static Registry 替换 Vben Layout/Preferences/Locales/Stores/Access Route/Types/Utils/Styles|S03|现有 URL、深链、权限、登录、错误行为不变|导航回归；按能力分开切换，不删除 Vben|
|S05 Catalog 与 Vben 退场|接入 Catalog、`routeKey` Registry、版本校验和受限模式；零引用后删除快照与专用适配|S04、跨仓库契约门禁与全部删除门禁|仅当前 200/经重验证 304 驱动动态路由；失败撤销动态路由；未知键/版本 fail closed；三应用构建与关键 E2E|删除不可逆面较大；删除前保留独立可回滚提交并核对 License/NOTICE|
|S06 Admin 模块化|拆分现有大型 `App.vue`；落地 People & Access、Security Operations|S05|IAM URL、高风险确认、审计原因和错误语义不变|行为漂移；按页面迁移并保留契约测试|
|S07 Personal Settings|偏好读取、保存、Reset、版本冲突、离线回退和 View Setting|S03、S06|默认值、409、失败可见、隔离缓存|后端契约差异；未确认字段标记 Need Backend Confirmation|
|S08 Experience Governance|Application Catalog、Navigation Draft、排序、发布、回滚、Release History|S06、对应后端契约|不可编辑可执行 Path/Component/远程代码；审计完整|误发布；发布/回滚权限和确认独立验收|
|S09 Dynamic I18n Governance|Resource、Message Draft、发布、回滚、版本历史和运行时预览|S03、对应后端契约|ETag、缺失 Key、Locale 切换、静态回退|翻译快照不一致；按发布版本回滚|
|S10 Runtime Configuration|非秘密 Parameter、Dictionary、Dictionary Item|S06、对应后端契约|Secret/主数据/权限/业务状态不可管理|边界膨胀；字段白名单 fail closed|
|S11 Portal 骨架治理|去除两个 Portal 的 Auth/runtime/styles 重复；接入 Router、I18n、Token、主题、响应式 Shell|S03、S02|三应用独立 Runtime；Portal 360/768/1280；Future 页面未创建|错误共享内部模型；保留渠道 VM 和发布边界|
|S12 封板|安全、组件、E2E、视觉、无障碍、Bundle、三应用构建；移除临时适配和公开 Source Map；更新文档|S00～S11|全部门禁通过，无无主兼容层|遗漏历史入口；按清单逐项删除并保留回归证据|

### 3.1 System 跨仓库协调门禁

S03/S05 不得仅凭 mom-web Mock 或类型编译声明集成完成。开始前需由 mom-web 与 System P1.6 客户端集成 Slice 共同记录并冻结：

1. Gateway 路由、认证上下文和三应用 Client/`user_type` 场景；
2. Catalog/Preference/Dynamic I18n DTO 与契约版本；
3. ETag 200/304、应用停用、权限变化、409、静态回退和 fail-closed 矩阵；
4. 跨仓库 E2E 的测试仓库、触发方式、环境和失败责任人。

后端 Slice 未完成时，前端可报告“客户端准备完成”，不得报告“生产集成完成”。

### 3.2 S00 Bundle 双门禁

S00 把“检测能力已建立”和“目标优化已完成”分开：

- `pnpm bundle:check` 是当前阻断门禁，防止任一应用在现状基础上继续膨胀，并始终阻断公开 Source Map；
- `pnpm bundle:target` 使用本文件批准的 250/350/500 KB 目标，当前预期失败且不能在 CI 中伪装通过；
- 两个 Portal 的目标缺口由 S02 的按需 Antdv 和 Shell 治理关闭；Admin 超大 Chunk 由 S04/S05 的 Vben 替换与退场关闭；
- S12 前 `bundle:target` 必须整体通过并转为正式阻断门禁。基线预算只能因可审计的构建方法变化或真实优化而下调；提高基线需单独 Review。

## 4. 每个代码 Slice 的验证基线

工具在 S00 建立后，每个 Slice 至少执行：

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
```

涉及路由、认证、System Runtime 或 Shell 时增加 `pnpm test:e2e`。命令不存在时不能伪报通过；应由 S00 建立并在该 Slice 记录为未就绪。

## 5. 场景验收

- 三应用登录、强制改密、刷新、退出；Client/`user_type`/Party/Factory 错配拒绝；
- 401、403、404、409、429、5xx、网络失败和结果未知；
- Catalog 200/经重验证 304、网络/5xx/401/403/404/停用时不复用旧响应并进入受限模式、未知 `routeKey`、不兼容版本；
- Preference 默认值、保存、Reset、409、服务不可用；
- I18n 200/304、Locale 切换、缺失 Key、静态回退；
- 深链、刷新恢复、权限变化；Light/Dark/System、Comfortable/Compact、`zh-CN/en-US`；
- 键盘、焦点、Form Label、Dialog 焦点管理、非颜色唯一表达、reduced motion、200% 文本缩放。

## 6. Bundle 与性能门禁

S00 必须先把 Bundle 测量固化为可重复命令：以生产构建 manifest 确定目标入口和静态依赖闭包；Portal 分别测量两个应用的首个匿名/Auth 入口，Admin 测量 Core/Auth 入口；对入口同步加载的 JS Chunk 去重求和并使用同一 gzip 实现；动态业务路由另行记录，不混入初始预算。500 KB 门禁按单个 minified JS 文件判断，Source Map 单独扫描公开部署目录。CI Node 24、pnpm 版本和构建模式必须固定，并保存基线报告。

- Portal 初始 JS gzip 不超过 250 KB；
- Admin Core/Auth 初始 JS gzip 不超过 350 KB；
- 不存在超过 500 KB 的 minified JS Chunk；
- Source Map 不进入公开部署产物；
- 核心页面的 3 秒 P75 可操作目标，必须在企业网络条件与测量方法获批后才作为正式验收，不以本地单次加载替代。

## 7. 全局停止条件

任何 Slice 出现权限/数据范围放宽、后端契约未知、URL 或安全语义无法保持、需要新增生产依赖、或要求建设未批准业务页面时立即停止，标记 `Need Product Decision` 或 `Need Backend Confirmation`。不得用前端临时状态机、Mock 成功或降低测试断言绕过。
