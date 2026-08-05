# MOM-Web S04D 视觉、无障碍、Bundle 与文档收口报告

> 日期：2026-08-05  
> 阶段：MOM Platform P1.6 / S04D  
> 前置：S04A、S04B、S04C 已获 Chris 接受  
> Review：**Pending Chris Review**  
> 结论：**IMPLEMENTED / READY FOR REVIEW**

## 1. 总体结论

S04D 已完成已认证 Admin 的视觉、响应式、无障碍、Bundle、真实 Gateway/IAM Smoke Test 和文档收口。真实页面与自动化均确认：MOM Shell、页面安全边距、主操作、筛选、列表、深链、主题/密度根契约及退出行为保持稳定；Admin 应用仍为 `@vben/*` 零直接引用，三应用均通过最终 Bundle 产品目标。

真实页面审计发现并关闭一个响应式缺口：Admin 在窄视口自动折叠后放大到桌面宽度时，侧栏此前不会恢复。现在 Shell 分离“桌面手动折叠状态”与“窄视口自动折叠状态”：1024px 自动折叠，回到 1600px 恢复桌面状态；用户在桌面主动折叠的选择仍可跨断点恢复。

本切片没有接入 Catalog、没有删除 Workspace Vben 源码、没有修改 Portal/Mobile/后端、没有拆分业务模块，也没有新增或升级依赖。S04D 完成不自动授权 S05。

## 2. 真实页面证据

使用当前本地 Gateway、IAM 与 `mom-admin`，由 Chris 手动登录后完成以下只读或可回滚检查：

|场景|证据|结论|
|---|---|---|
|真实用户列表|`/iam/users` 返回 `admin` 真实数据；页面唯一 `h1`、用户目录、筛选和主要操作可见|PASS|
|1024px|侧栏自动折叠；页面宽 912px；筛选、表格和分页完整；`scrollWidth = clientWidth = 1024`|PASS|
|1600px|修订后由 1024px 放大时侧栏恢复展开；内容保持 24px 安全边距；`scrollWidth = clientWidth = 1600`|PASS|
|主题与密度|真实 Preference 解析为 `SYSTEM / COMFORTABLE`，当前系统解析为 Light；Dark/System 与 Compact 的完整组合由隔离 E2E 覆盖|PASS|
|Dialog 焦点|“新增用户”打开后焦点进入 Dialog；取消后焦点返回“新增用户”触发按钮；未提交任何表单|PASS|
|深链与刷新|进入 `/iam/roles` 后刷新仍保留认证、Route 和真实角色列表，无旧页面上下文残留|PASS|
|退出|用户菜单退出后到达 `/auth/login`，已认证 Shell 消失|PASS|
|控制台|上述页面与交互无应用 error/warn|PASS|

真实账号没有出现多 Factory 选择器，因此本轮不把 Factory 切换描述为 Live PASS；Factory 重校验、旧上下文清理和当前 URL 保持由隔离 E2E 覆盖。

## 3. 自动化视觉与无障碍矩阵

新增 Admin 已认证矩阵覆盖：

- 1024 / 1280 / 1600 三个目标视口；
- `LIGHT / DARK / SYSTEM` 三主题模式；
- `COMFORTABLE / COMPACT` 两种 Admin 密度；
- 每个组合的根属性、唯一任务标题、筛选、目录、侧栏断点和横向溢出；
- 1024 → 1600 的自动折叠恢复；
- `prefers-reduced-motion: reduce` 下 Motion Token 与侧栏 Transition 为 0；
- 200% 文本缩放下任务标题、筛选和无横向溢出；
- 403 fail-closed、Core Error Route、Factory 切换、个人偏好入口、深链和导航上下文。

组件测试继续覆盖 `ConfirmAction` 初始焦点、原因输入、结果未知和关闭后焦点返回。S04D 没有为通过测试降低断言、扩大跳过条件或创建 Mock 成功路径。

## 4. Bundle 结果

|应用|初始 JS gzip|最大 minified JS Chunk|公开 Source Map|产品目标|
|---|---:|---:|---:|---|
|mom-admin|1.3 KB|256.0 KB|0|PASS|
|supplier-portal|193.6 KB|153.0 KB|0|PASS|
|customer-portal|193.6 KB|153.0 KB|0|PASS|

`pnpm bundle:check` 与 `pnpm bundle:target` 均通过。Admin 的 1.3 KB 只表示 Manifest 静态初始闭包；动态 Router、Shell 与业务 Chunk 按访问加载，不能解释为完整可操作页面的总传输量。企业网络 3 秒 P75 仍按既定计划留到 S12。

## 5. S05 Workspace Vben 零引用清单

S04D 只登记，不删除。当前 `apps/` 已无 `@vben/*` 直接引用；Workspace 快照仍有 26 个包 Manifest，分为：

1. `internal/tailwind-config`、`internal/tsconfig`；
2. `packages/@core/` 下 12 个 `@vben-core/*` 包；
3. `packages/effects/access`、`common-ui`、`hooks`、`layouts`；
4. 顶层 `packages/constants`、`icons`、`locales`、`preferences`、`stores`、`styles`、`types`、`utils`。

排除 README 后，以上目录仍有 145 个文件包含 `@vben/*` 引用。S05 删除时还必须同步处理：

- `pnpm-workspace.yaml` 的 `internal/*`、`packages/@core/*`、`packages/effects/*` 快照 Globs；
- `pnpm-lock.yaml` 的对应 Importer 与依赖闭包；
- `THIRD-PARTY-NOTICES.md`、License/NOTICE 和开源来源记录；
- S04C 冻结保留的 `.dark` 迁移兼容输出及其 Portal/S11 删除条件；
- 三应用构建、安全回归、关键 E2E、Bundle 与公开 Source Map 门禁。

Catalog 接入、`routeKey` 版本校验和受限诊断模式必须先按 S05 独立前置评审实施；不能因为应用引用已经归零就直接删除快照。

## 6. 最终验证

|命令 / 方法|结果|
|---|---|
|`pnpm install --frozen-lockfile`|PASS；锁文件未变化|
|`pnpm check`|PASS；72 项边界、Lint、Stylelint、Token、类型、31 Auth/API 契约、2 Runtime、11 UI、18 Unit、23 Component|
|`pnpm build`|PASS；三应用生产构建通过|
|`pnpm bundle:check`|PASS|
|`pnpm bundle:target`|PASS|
|Admin 专项 E2E|11 passed / 3 skipped|
|全量 `pnpm test:e2e`|29 passed / 13 按渠道跳过|
|真实 Gateway/IAM 页面|PASS；登录后页面、Dialog、深链刷新和退出|
|`rg -n "@vben/" apps/mom-admin`|0 条|
|`git diff --check`|待最终文档落盘后执行|

本地 Node 为 25.9.0，存在预期 Engine Warning；正式 CI 证据仍使用 Node 24。Doctor 报告的 Maven 3.9.0 与后端工程基线失败不属于本前端 Slice，不能据此宣称后端验证通过。

## 7. 明确未实施与风险

- 未实施 System Catalog、动态 Route 激活或 Catalog 快照；
- 未删除任何 Workspace Vben 源码、包、License 或 NOTICE；
- 未建设 Personal Settings、Workbench、Production、Quality 或 Portal Future 页面；
- 未拆分 `App.vue`，页面中的 `Permission`、`Session`、`Version` 等术语治理仍留在 S06；
- 真实账号无多 Factory 场景，Live Factory 切换仍缺环境证据，但隔离 E2E 已覆盖行为契约；
- Dynamic I18n 真实 200/304 与 Preference 写入/409 继续是 S03 登记的后端数据补证项；
- 浏览器/真实设备产品矩阵仍为既有 Unknown，当前证据使用已批准现代 Chromium 与目标视口。

本报告完成后停止，等待 Chris Review。未经明确接受，不进入 S05。
