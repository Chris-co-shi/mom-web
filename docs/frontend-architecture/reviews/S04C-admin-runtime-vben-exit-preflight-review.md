# MOM-Web S04C Admin Runtime 与 Vben 应用级退出前置评审

> 日期：2026-08-04  
> 阶段：MOM Platform P1.6 / S04C Preflight  
> 前置：S04B 已实现，尚待 Chris Review  
> Review：**Accepted · Chris Review 2026-08-05**  
> 结论：**GO / IMPLEMENTATION AUTHORIZED**

## 1. 总体结论

S04C 可以在不修改 IAM/System 后端契约、不接入 Catalog、不升级 Vue/Vite/Router/TypeScript/Ant Design Vue 的前提下完成，但必须按“Locale/Theme/Provider → Static Router/Access → Bootstrap/Styles/Dependencies → Zero-reference Gate”的顺序推进。

当前 `mom-admin` 仍有 19 个源码、Manifest 或构建配置文件直接引用 Vben，覆盖 13 个 `@vben/*` Manifest 依赖。它们不是一个单点依赖：Vben Preferences 同时控制标题、Locale、Theme、Auth 工具栏、时间格式和路由进度；Vben Store 同时保存 Access、User 与 Tabbar；Vben Access 负责从字符串菜单生成动态路由。因此，S04C 禁止通过空壳适配包把这些引用改名后继续保留同一运行闭包。

本评审只冻结实施边界，不修改代码、依赖、锁文件或 S04B 状态。S04B 未经接受或本评审未经明确批准时，不得开始 S04C 编码。

## 2. 当前证据

### 2.1 Vben 直接引用面

|能力|当前位置|S04C 目标|
|---|---|---|
|Bootstrap/Styles|`bootstrap.ts`、`main.ts`、`vite.config.ts`|MOM Bootstrap；删除 Vben Preferences 初始化、全局 Styles 和 Tailwind Reference 适配|
|Provider/Theme|`root.vue`、`app/theme.ts`|仅使用 MOM Theme Runtime、Antdv Theme Adapter 和本地 Locale Provider|
|Locale|`locales/index.ts`、Auth/Fallback Views|直接使用 `vue-i18n`；保持静态 `zh-CN/en-US`、System Dynamic I18n 合并与 Antdv/dayjs Locale|
|Access/Router|`router/access.ts`、`guard.ts`、`menu-source.ts`|静态任务注册路由；MOM Access Context 直接过滤导航并守卫深链|
|Store|Access/User/Tabbar Store|不复制 Store；使用既有 `runtimeState`、`@mom/access` 和最小 Router Access 状态|
|Auth Shell|`layouts/auth.vue`|MOM 应用私有匿名 Locale/Theme 控件；不伪造用户偏好保存|
|业务格式化|`App.vue`|读取 MOM 当前 Locale，不读取 Vben Preferences|
|Legacy Rollback|`layouts/basic.vue`、`preferences.ts`|在新运行时通过前保留；S04C 零引用封板前删除应用级 Legacy 文件|

Manifest 当前声明 13 个 `@vben/*` 依赖，其中 `common-ui/constants/icons` 已无源码消费者，但仍属于 S04C 最终清理面。`vue-i18n` 已存在于 Workspace Catalog 和锁文件，但 Admin 目前通过 `@vben/locales` 间接获得；S04C 必须把它提升为明确直接依赖，不能继续依赖传递关系。

### 2.2 必须保持的契约

- 三应用 Client/`user_type`、Gateway-only、Party/Factory、Token 和 `sessionStorage` 隔离契约；
- 六个 IAM URL、Route Name、Permission、深链和默认首个可访问任务；
- 401 刷新单飞、403 授权同步单飞、GET 最多重试一次、写请求不盲目重试；
- 登录、强制改密、403、404、`/menu-error`、个人偏好等 Core Route；
- System Preference 与 Dynamic I18n 的用户隔离、ETag、静态双语回退和失败可见性；
- Light/Dark/System、Comfortable/Compact 与 Antdv Theme Adapter；
- S04A/B 已接受的页面布局、任务导航、无 Tabbar 和 Factory 重校验行为。

## 3. 冻结设计

### 3.1 Static Router 是唯一任务路由来源

`router/registry.ts` 在应用启动时把六个本地 Component Factory 组合为 Root Route Children。Permission 不再添加或删除 Route，只执行两件事：

1. 过滤 Sidebar 中可见任务；
2. Guard 在用户上下文就绪后对深链 fail closed。

因此 S04C 删除 `generateAccessible('backend')`、字符串 Component Map、Vben Menu/Access/User/Tabbar Store 和动态 `router.addRoute/removeRoute`。`routeKey` 仍保留在本地 Registry，等待 S05 Catalog 仅激活已注册条目。

### 3.2 MOM Access 状态

`router/access.ts` 保留单飞的 `synchronizeAccess({ reloadContext })`，但只负责：

- 按需重新读取 `/api/iam/me`；
- 发布 `UNCHECKED / READY` 的最小 Router Access 状态；
- 权限变化后检查当前任务，失权时进入 `/403`；
- 提供安全 Redirect、默认首个可访问任务和 Logout Reset。

权限事实始终来自 `@mom/access` 的当前快照，不复制到 Pinia 或第二个 Permission Store。Factory 切换和 API 403 继续复用同一单飞同步。

### 3.3 Core Route 与错误边界

S04C 静态建立：

- `/runtime-error`：前端启动、组件加载或 Router 未知错误；
- `/catalog-error`：S05 前为诚实的不可用占位，不发起 Catalog 请求；
- `/menu-error`：保留历史兼容 URL，复用 Runtime Error 处理语义；
- 登录、强制改密、403、404、个人偏好继续保持。

Router Error 不清理仍有效的认证会话。未知任务、外部 Redirect、反斜杠 Redirect 和无权限深链继续 fail closed。

### 3.4 Locale

Admin 直接依赖 `vue-i18n` 并在应用私有 `locales/` 内完成：

- 静态 `zh-CN/en-US` 按需加载；
- `html[lang]`、Antdv Locale 和 dayjs Locale 同步；
- System 发布消息只合并已校验命名空间；切换用户/Locale 时先恢复静态快照，禁止跨用户污染；
- 导出 `$t` 和只读当前 Locale，供页面时间格式化使用。

不创建跨应用 Locale 单例；三个应用继续拥有独立 Runtime。

### 3.5 Theme、Provider 与匿名工具栏

- `root.vue` 只消费 `momAntdTheme` 与本地 `antdLocale`，删除 Vben Token/Preference 双 Provider；
- `app/theme.ts` 以 `LIGHT + COMFORTABLE` 作为可信静态启动值，登录后由 System Preference 覆盖；
- 删除 Vben → MOM Theme Bridge 和 `VITE_MOM_THEME_PROVIDER=legacy` 分支；
- Auth 工具栏改为应用私有的 Locale/Theme 控件。匿名切换只影响当前运行实例，明确不显示“已保存”；登录后以用户的 System Preference 为准；
- 已认证 Header 继续只进入 `/settings`，S07 前不增加静默保存快捷开关。

共享 `@mom/design-tokens` 中暂时保留 `.dark` 兼容输出，因为两个 Portal 尚未进入 S11；这不是 Admin 对 Vben 的直接依赖，最终删除条件登记到 S05/S11。

### 3.6 Bootstrap、样式与进度反馈

- Bootstrap 保留 Vue、Router、Antdv、MOM Token/Common UI 样式和本地样式；
- 动态标题直接由 Router Meta、本地 `$t` 和静态 App Config 生成；
- Admin 没有 `@apply` 消费者，删除 Vben Tailwind Reference 构建插件；Tailwind 4 插件仍按冻结技术方案保留；
- 删除 Vben 全局 Styles/Antd 覆盖后，以构建、截图和组件状态矩阵确认 Antdv 样式完整；禁止复制 Vben CSS；
- 删除 NProgress 迁移依赖，不新增第二个进度库。路由本地切换依赖即时反馈，数据加载继续由 Page/DataState 表达；组件加载失败进入 Runtime Error。

### 3.7 Manifest 与文件退出

最终门禁前删除 Admin Manifest 中全部 13 个 `@vben/*` 直接依赖，并移除确认无消费者的 Admin `pinia`、`@vueuse/core` 直接依赖；新增已冻结且已在 Catalog/锁文件中的 `vue-i18n` 直接声明。

以下应用级 Legacy 文件只在新链路完成全部 focused test 后删除：

- `layouts/basic.vue`；
- `preferences.ts`；
- `router/menu-source.ts`。

S04C 不删除 Workspace 的 `internal/`、`packages/@core/`、`packages/effects/` 或顶层 Vben 快照包，不修改其 License/NOTICE；这些仍属于 S05。

## 4. 实施顺序与回滚点

### C1 · App Config、Locale 与 Theme Provider

- 建立不可变 App Config；
- 以直接 `vue-i18n` 替换 Locale；
- 以 MOM Provider 替换 Vben Token/Preference Provider；
- 建立匿名 Locale/Theme 控件；
- 业务时间格式读取 MOM 当前 Locale。

**回滚**：Root、Locale、Theme 与 Auth Layout 独立切回；Router/Access 尚未改变。

### C2 · Static Router 与 MOM Access Guard

- Registry 直接生成六个静态任务 Route；
- 重写 Access 同步和 Guard；
- 添加 Runtime/Catalog Error Core Route；
- 保持登录、强制改密、401/403、Factory 与 Redirect 语义。

**回滚**：恢复 Vben Access/Store/Menu Adapter；C1 可独立保留。

### C3 · Bootstrap、Styles 与 Manifest

- 删除 Vben Bootstrap、Styles、Tailwind Reference 和进度工具；
- 移除 Pinia/VueUse 的 Admin 无消费者入口；
- 删除 Admin Manifest 中全部 `@vben/*`；更新锁文件；
- 新增 `vue-i18n` 直接依赖声明。

**回滚**：恢复 Manifest/锁文件和 Bootstrap imports；不回滚 C1/C2 业务契约。

### C4 · Legacy 文件删除与零引用封板

- 在三应用构建、Admin 安全回归和关键 E2E 通过后删除三个应用级 Legacy 文件；
- `rg '@vben/' apps/mom-admin` 必须为 0；
- 更新验证脚本、Bundle 基线证据和 S04C 实施报告。

**回滚**：Legacy 文件删除必须是最后动作；若零引用前任何门禁失败，保留旧文件并停止，不以删除伪装迁移完成。

## 5. 测试与验收

### 5.1 必须新增或扩展

- Static Registry 生成六个 Route，Path/Name/Permission/Component Factory 不漂移；
- 无权限任务隐藏，直接深链进入 403，权限变化撤销当前任务；
- 登录 Redirect、强制改密、刷新恢复、Logout 和 Factory 重校验；
- 401/403 单飞与写请求不重试继续使用现有契约测试；
- Locale 静态加载、Antdv/dayjs 同步、Dynamic I18n 合并与跨用户清理；
- Light/Dark/System、Comfortable/Compact、匿名临时切换与登录后 Preference 覆盖；
- Runtime Error、Catalog Error、Menu Error 和 404 均可恢复；
- 1024/1280/1600、200% 文本缩放、键盘与焦点；
- Admin `@vben/*` 直接引用、Vben Manifest 依赖和公开 Source Map 均为 0。

### 5.2 验证命令

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
rg -n "@vben/" apps/mom-admin
```

E2E 必须使用三个隔离端口，避免复用本机 5555～5557 的未知开发服务。可用真实 Gateway/IAM 时追加 Live Login、强制改密、刷新、Factory 和 Logout 证据，但真实密码不得进入源码、日志或测试夹具。

## 6. 明确不做

- 不接入或模拟 System Catalog；
- 不删除任何 Workspace Vben 源码快照；
- 不修改 Portal、Mobile、IAM/System 后端、API、DTO、Token Claim 或 Permission；
- 不实现 Preference Save/Reset/409/View；
- 不拆分 `App.vue` 业务模块；
- 不建设 Future 页面；
- 不升级 Vue、Vite、Router、TypeScript、Ant Design Vue 或 Tailwind；
- 不引入 Axios、第二状态库、第二 UI 库、第二图标集或新的进度库；
- 不把 Vben 代码复制到 `@mom/*`；
- 不以宽泛 ESLint/Stylelint/Bundle 排除绕过零引用门禁。

## 7. 已知风险与停止条件

|风险|处理|
|---|---|
|Locale/Theme 与 System Runtime 初始化次序变化|先冻结匿名静态值，再由已认证 Preference 覆盖；组件/E2E 验证首屏和切换|
|静态 Route 暴露无权限 Path|Guard 在 Access Ready 后 fail closed；Permission 仍不是路由生成器|
|删除 Vben Styles 导致 Antdv 或 Auth 页面视觉回归|C3 前后截图对比；只用 MOM Token/Antdv 修正，不复制 Vben CSS|
|Guard 循环或并发重复读取 Access|保留单飞状态和 Redirect 白名单；冻结 401/403/深链测试|
|应用级零引用被误当成全仓 Vben 退场|S04C 只宣称 `apps/mom-admin` 零直接引用；Workspace 删除仍在 S05|
|Admin 最大 Chunk 仍超过最终 500 KB|记录真实结果；不得提高门禁或宣称 S12 封板|

出现以下任一情况立即停止：六个 URL 或权限语义漂移；写请求被自动重试；需要新增未批准生产依赖；System Preference/Dynamic I18n 契约不兼容；必须修改后端才能维持当前行为；或无法在删除 Legacy 文件前获得独立构建和安全回归证据。

## 8. Review 决策

Chris 接受本报告时，同时确认以下 S04C 产品体验取舍：

1. 任务 Route 启动时静态存在，Permission 只过滤导航并守卫深链；
2. 匿名 Locale/Theme 切换只作用于当前运行实例，不宣称已保存；
3. 不引入新的全局路由进度库，数据等待由页面状态表达；
4. S04C 最终删除 Admin 应用级 `basic.vue`、`preferences.ts` 和 `menu-source.ts`，但不删除 Workspace Vben 源码；
5. S04C 只完成 Admin 应用级 Vben 直接引用归零，Catalog 与全仓退场仍属于 S05。

批准后从 C1 开始；批准不自动授权 S05。
