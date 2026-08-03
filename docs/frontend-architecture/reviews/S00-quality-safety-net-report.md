# MOM-Web S00 质量安全网实施报告

> 执行日期：2026-08-03  
> 授权：Chris 明确批准 S00  
> 前置：D01 Completed，ADR-011～016 Accepted  
> 执行结论：**COMPLETED — QUALITY GATES ESTABLISHED**  
> 下一状态：停在 S01 前，等待独立批准

## 1. 结论

S00 已建立可执行的静态检查、测试、契约冻结、Token 漂移、Bundle 与公开 Source Map 门禁。现有 Node 契约测试被完整保留，没有通过删除测试、放宽业务断言或替换请求层来获得通过。

本结论只表示“安全网已经建立并能阻止回归”，不表示目标前端已经完成性能优化：严格 Bundle 产品目标仍有明确缺口，`pnpm bundle:target` 会如实失败。当前停止在 S01 前，不自动修改 Token、主题、图标适配、Vben 运行时或业务页面。

## 2. 本轮范围

### 已完成

- ESLint 10 + typescript-eslint + eslint-plugin-vue，覆盖 MOM 自有应用、包、脚本和测试；冻结 Vben 快照继续作为迁移期例外，不纳入新增规范追责范围；
- Stylelint 17 + Standard + Vue 配置，覆盖三应用和 MOM 样式包；
- Vitest 单元测试与 Vue Test Utils/jsdom 组件测试；
- Playwright 三应用匿名入口 Shell 烟测与独立 CI Job；
- 六个 IAM URL、三应用 Client/`user_type`/端口、认证端点、Gateway-only、Fetch、403 单飞同步和构建模式的可审计基线；
- 当前 Token 两个输出文件的过渡性 SHA-256 漂移门禁；S01 必须以单一 Token Source 生成器取代它；
- Vite production manifest、静态入口依赖闭包、level 9 gzip、单 Chunk 和 Source Map 的统一测量脚本；
- 三应用生产构建关闭公开 Source Map；
- CI 固定 Node 24、pnpm 11.7.0，并执行静态、测试、构建、Bundle 与浏览器烟测。

### 明确未做

- 没有新增或升级生产依赖；
- 没有修改 IAM/System API、DTO、权限、Token Claim 或 Gateway；
- 没有改变六个 IAM URL、三应用 Client/`user_type`、Party/Factory 规则或 401/403 行为；
- 没有修改 Design Token 值、主题、密度、组件方案或 UI 布局；
- 没有替换 `lucide-vue-next`，没有开始 Vben 退场；
- 没有建设 Workbench、Production、Quality、Delivery、Order 等 Deferred/Future 页面；
- 没有修改 `mom-platform` 或 `mom-mobile`；没有提交、推送或创建 PR。

## 3. 契约冻结

### 3.1 IAM 导航 URL

|URL|权限|
|---|---|
|`/iam/users`|`iam:user:read`|
|`/iam/roles`|`iam:role:read`|
|`/iam/permissions`|`iam:permission:read`|
|`/iam/sessions`|`iam:session:read`|
|`/iam/audit`|`iam:audit:read`|
|`/iam/clients`|`iam:client:read`|

这些 URL 是现有兼容契约，不代表 IAM 服务名成为未来产品菜单来源。

### 3.2 应用入口

|应用|Client ID|`user_type`|开发端口|
|---|---|---|---|
|`mom-admin`|`mom-admin-web`|`INTERNAL`|5555|
|`supplier-portal`|`mom-supplier-web`|`SUPPLIER`|5556|
|`customer-portal`|`mom-customer-web`|`CUSTOMER`|5557|

### 3.3 安全与构建

- 第一方认证继续使用 `/api/iam/auth/login`、`password/change-required`、`refresh`、`logout`；访问上下文继续来自 `/api/iam/me`；
- Token 继续只由已审计运行时保存在当前标签页 `sessionStorage`；
- `@mom/api-client` 继续使用 Fetch 和 Gateway 相对路径；403 权限同步保持 single-flight，只有 GET/HEAD 可自动重试一次，写请求不自动重试；
- production build 生成 Vite manifest 供门禁读取，但不生成 `.map`；
- 权威数据位于 `quality/s00-contract-baseline.json`，`pnpm validate` 会同时检查代码与 CI 是否仍符合基线。

## 4. 测试与工具结果

|门禁|S00 结果|证据范围|
|---|---|---|
|Repository Validate|PASS|原 46 项边界 + S00 六 URL/三应用/安全/构建基线|
|ESLint|PASS|MOM 自有 TS、Vue、脚本、测试；Vben 冻结快照排除|
|Stylelint|PASS|三应用 CSS/Vue Style、`common-ui`、`design-tokens`|
|Token 漂移|PASS|2 个现有 Token 输出文件 SHA-256|
|Node 契约测试|PASS|认证、API Client、IAM Admin、Portal Access、安全 E2E|
|Vitest 单元|PASS|1 文件、2 测试|
|Vue 组件|PASS|1 文件、1 测试；真实挂载 `@mom/common-ui/Page`|
|Playwright|PASS|3 应用 Chromium 匿名入口 Shell 烟测|
|Type Check|PASS|三应用与 MOM 包|
|Production Build|PASS|三应用独立构建，0 个公开 Source Map|
|Bundle 回归基线|PASS|manifest 静态闭包、level 9 gzip、单 Chunk、Source Map|
|Bundle 严格目标|**NOT MET（预期红灯）**|Portal 初始 gzip 与三应用最大 Chunk|

最终矩阵使用本机已安装的 Node 24.0.0 与 pnpm 11.7.0 执行；GitHub Actions 继续使用 `node-version: 24` 获取 CI 当前 Node 24。默认 Node 25 的前期校准结果不作为正式验收替代。

Playwright 首次本机执行因缺少对应 Chromium binary 失败；安装 Playwright 锁定版本的 Chromium 后，未改断言重跑为 3/3 PASS。烟测还发现两个 Portal 把 Antdv `maxlength` 作为字符串传递，已最小修正为数字绑定。Admin 的 Vben StorageManager 控制台警告保留为 S04 迁移事项。

## 5. Bundle 测量与缺口

### 5.1 固定协议

1. 使用三应用 production build 的 `.vite/manifest.json` 找到 `index.html`；
2. 递归收集 `imports` 静态依赖并去重，不把 `dynamicImports` 计入匿名/Core 初始入口；
3. 每个 JS 文件使用 Node `zlib.gzipSync({ level: 9 })` 后求和；
4. 最大 Chunk 使用单个 minified `.js` 文件字节数；
5. 递归扫描整个 `dist`，任何 `.map` 都失败；
6. CI 固定 Node 24、pnpm 11.7.0、Vite production mode。

### 5.2 S00 实测

|应用|初始 JS gzip|最大 minified JS|公开 Source Map|严格目标|
|---|---:|---:|---:|---|
|Admin|约 78.7 KB|约 1,325.9 KB|0|初始通过；最大 Chunk 失败|
|Supplier Portal|约 438.2 KB|约 1,442.1 KB|0|初始与最大 Chunk 失败|
|Customer Portal|约 438.2 KB|约 1,442.1 KB|0|初始与最大 Chunk 失败|

严格目标仍为 Portal 250 KB、Admin 350 KB、单 Chunk 500 KB，没有放宽。`bundle:check` 用带约 3% 稳定余量的当前基线阻止新增回归；`bundle:target` 保留批准目标并返回非零退出码。Portal 缺口由 S02 关闭，Admin Vben Chunk 缺口由 S04/S05 关闭，S12 前严格目标必须整体转绿。

## 6. 依赖与许可证

S00 新增项全部是根 Workspace `devDependencies`：ESLint 体系、Stylelint 体系、Vitest、Vue Test Utils、jsdom 和 Playwright Test。许可证为 MIT，Playwright Test 为 Apache-2.0；已更新第三方声明。锁文件中的 `lucide-vue-next` deprecation 属于既有 Vben 快照，不在本轮新增，也没有被静默替换。

## 7. 风险与后续停止线

- Token 门禁当前冻结两个手工维护输出，只能防漂移，不能证明单一来源；S01 必须替换为生成与一致性门禁；
- Portal 全量注册 Antdv 导致初始 Bundle 超标，不能把回归基线通过表述为性能目标通过；
- Admin 最大 Chunk 由 Vben 和现有依赖闭包主导，S05 零引用前不能删除快照；
- Shell 烟测不等价于需要真实 IAM/System 环境的登录、权限变化、Catalog、Preference 或 I18n E2E；
- Lucide Vue 适配包的生产依赖选择仍需在使用前独立说明和批准；
- S01 未经 Chris 明确批准不得开始。

## 8. 验证命令

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
pnpm test:e2e
```

严格目标审计另行执行并预期返回非零：

```bash
pnpm bundle:target
```

完成本报告后停止。下一轮只能单独评审和批准 S01 Token 与主题，不自动进入后续 Slice。
