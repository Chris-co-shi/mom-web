# MOM-Web S04C Admin Runtime 与 Vben 应用级退出实施报告

> 日期：2026-08-05  
> 阶段：MOM Platform P1.6 / S04C  
> 前置：S04B 与 S04C 前置评审已获 Chris 接受  
> Review：**Accepted · Chris Review 2026-08-05**  
> 结论：**ACCEPTED**

## 1. 总体结论

S04C 已按 C1～C4 完成：`mom-admin` 的 Bootstrap、Provider、Locale、Theme、Router、Access Guard、Auth Shell、Core Error Route、Manifest 与 Vite 配置已由 MOM 自有运行时接管；`apps/mom-admin` 源码、Manifest 与构建配置中的 `@vben/*` 直接引用为 0，三个应用级 Legacy 文件已在最终门禁前删除。

六个 IAM URL、认证/强制改密、Gateway-only、Client/`user_type`、Party/Factory、Token、System Preference/Dynamic I18n、401/403 单飞和写请求不盲目重试契约保持不变。S04C 没有接入 Catalog、没有删除 Workspace Vben 源码、没有修改 Portal/Mobile/后端，也没有进入 S04D 或 S05。

## 2. C1 · App Config、Locale 与 Theme Provider

- 新增不可变 `app/config.ts`，只保存构建期产品信息，不承载权限或用户偏好；
- Admin 直接依赖 `vue-i18n`，应用私有 Locale Runtime 负责静态 `zh-CN/en-US`、Antdv/dayjs 同步、System 动态命名空间合并和跨用户静态复位；
- Theme 以 `LIGHT + COMFORTABLE` 可信静态值启动，System Preference 登录后覆盖；
- Root 只使用 MOM Antdv Theme Adapter 和应用私有 Antdv Locale；
- Auth Shell 的语言/主题控件只修改当前实例，不使用 Storage，也不宣称已保存；
- 页面日期格式直接读取 MOM 当前 Locale，不读取 Vben Preferences。

## 3. C2 · Static Router 与 MOM Access Guard

- 六个任务 Route 在启动时由 `ADMIN_TASKS` 静态注册，Component 仍是本地动态 Import；
- Permission 只过滤 Sidebar 并守卫深链，不生成 Path、Name、Title、Order 或 Component；
- Access 同步保留单飞，只发布最小 `UNCHECKED/READY` 状态，不复制 Access/User/Tabbar Store；
- Factory 重校验与 API 403 继续复用同一授权同步；
- 新增 `/runtime-error` 与 `/catalog-error`，保留 `/menu-error` 兼容 URL；未知 Route 继续进入 404；
- Router Error 不主动清理仍有效的认证会话，不引入新的路由进度库。

## 4. C3/C4 · Bootstrap、Manifest 与 Legacy 删除

- 删除 Vben Preferences 初始化、全局 Styles/Antd 覆盖、Tailwind Reference 插件、Access Directive、Pinia 和 VueUse 入口；
- Ant Design Vue 改为应用内显式按需组件导入，保留官方 Reset CSS；
- Admin Manifest 删除 13 个 `@vben/*` 依赖及无消费者的 `pinia`、`@vueuse/core`，新增已冻结的直接 `vue-i18n` 依赖；
- Bootstrap 和 Core Route 使用明确异步边界，业务页和错误页按路由加载；
- 删除 `layouts/basic.vue`、`preferences.ts`、`router/menu-source.ts`；
- `scripts/validate.mjs` 永久检查 Admin Manifest、源码/Vite 配置零 Vben 直接引用、三个 Legacy 文件持续不存在，以及静态 Router/Access 依赖方向。

## 5. Bundle 结果

|指标|S04B|S04C|结论|
|---|---:|---:|---|
|Admin 初始 JS gzip|69.0 KB|1.3 KB|通过 84 KB 迁移基线与 350 KB 产品目标|
|Admin 最大 minified JS Chunk|1321.8 KB|256.0 KB|通过 500 KB 最终目标|
|Admin 主样式 Chunk|118.6 KB|18.3 KB|Vben 全局样式退出后显著下降|
|公开 Source Map|0|0|通过|

初始值按既有 Manifest 入口协议统计；Bootstrap、Route 与业务组件的动态 Chunk 仍会按实际访问加载，不能把 1.3 KB 解释为完整可操作页面总传输量。核心页面 3 秒 P75 仍需在批准的企业网络条件下于 S12 验收。

## 6. 自动化与行为证据

- 31 个 Auth/API/IAM/Portal 安全契约测试通过；
- 2 个 Admin Runtime 测试通过；
- 11 个 Admin UI 回归测试通过；
- 18 个 Vitest Unit 测试通过；
- 23 个组件测试通过；
- 隔离端口 E2E 为 `28 passed / 11 skipped`，跳过项均为项目渠道条件；
- 新增行为覆盖匿名 Locale/Theme 不持久化、受限权限静态深链进入 403、隐藏无权任务、Catalog Error 与 404 可达；
- Admin `@vben/*` 直接引用为 0，三个 Legacy 文件删除状态进入永久验证门禁。

## 7. 最终验证

|命令|结果|
|---|---|
|`pnpm install --frozen-lockfile`|通过|
|`pnpm validate`|通过；72 项工程边界及 6 URL/3 应用基线通过|
|`pnpm lint`|通过|
|`pnpm stylelint`|通过；保留既有 1 项精确 Token 例外|
|`pnpm tokens:check`|通过；4 个生成产物无漂移|
|`pnpm check:type`|通过；三应用及共享包通过|
|`pnpm test`|通过|
|`pnpm test:component`|通过；23 个|
|`pnpm build`|通过；三应用生产构建通过|
|`pnpm bundle:check`|通过；Admin 1.3 KB initial / 256.0 KB largest / 0 maps|
|隔离端口 `pnpm test:e2e`|通过；28 passed / 11 skipped|
|`rg -n "@vben/" apps/mom-admin`|0 条|
|`git diff --check`|通过|

本地 Node 为 25.9.0，存在预期 Engine Warning；正式 CI 证据仍须使用 Node 24。Doctor 同时报告 Maven 3.9.0 和后端工程基线失败，但本切片未修改或验证 Java/Maven 能力。

## 8. 明确未实施

- System Catalog 请求、200/304、版本校验、快照、受限诊断运行时或动态激活；
- Workspace `internal/`、`packages/@core/`、`packages/effects/`、顶层 Vben 快照包及 License/NOTICE 删除；
- Portal 的 Vben 兼容输出清理；
- Preference Save/Reset/409/View Setting；
- `App.vue` 业务模块拆分及页面中英术语统一；
- S04D 视觉/Bundle 收口、S05 Catalog 或后续业务模块。

## 9. 风险与停止条件

- 异步 Bootstrap 和 Route Chunk 已通过 E2E，但真实企业网络性能仍待 S12；
- S04B 已取得真实 Gateway/IAM 登录证据；S04C 变更后未再次输入真实凭据，真实登录/刷新/退出 Smoke Test 仍可在 Review 时补充，当前结论不把隔离 E2E 表述为真实联调；
- Workspace 仍保留 Vben 源码供 Portal/S05 迁移，不能宣称全仓 Vben 已退场；
- Dynamic I18n 真实 200/304 与 Preference 写入/409 仍是 S03 已登记的后端数据补证项；
- 页面 `Permission/OAuth/Session` 中英混用继续留到 S06 模块化处理。

Chris 已于 2026-08-05 明确接受本报告并授权 S04D；该授权不延伸到 S05。
