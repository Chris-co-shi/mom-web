# MOM-Web S04B Admin Shell 与任务导航实施报告

> 日期：2026-08-04  
> 阶段：MOM Platform P1.6 / S04B  
> 前置：S04 前置评审与 S04A 已获 Chris 接受  
> Review：**Accepted · Chris Review 2026-08-05**  
> 结论：**ACCEPTED**

## 1. 总体结论

S04B 已按批准边界完成：`mom-admin` 的已认证视觉框架已由 MOM 应用私有 Shell 接管；六个既有 IAM 页面按“人员与访问 / 安全运营”两个用户任务域组织；Vben Tabbar 不再进入已认证页面；Permission 仅过滤静态注册任务，不再生成标题、Path、顺序或组件。

本切片保留现有 Vben Guard、Access/Store、Locale/Theme Bridge 和回滚文件，不删除 Vben Workspace 源码。Router/Provider 的运行时替换仍属于 S04C，Catalog 激活与 Vben 源码退场仍属于 S05。本报告完成后停止，等待 Chris Review，不自动进入 S04C。

## 2. 核心实现

### 2.1 静态任务契约与注册表

新增 `router/task-contract.ts` 作为纯数据契约，冻结：

- 六个既有 URL、稳定 Route Name、两个任务域和显示顺序；
- `requiredPermission`、静态 `routeKey`、Title Key 与 Lucide `iconKey`；
- `ADMIN_ROUTE_CONTRACT_VERSION = 1`。

新增 `router/registry.ts`，只在客户端本地为契约补充静态 Component Factory，并提供权限过滤、任务查询和首个可访问路径。`section-navigation.ts` 与 Legacy Vben Menu Adapter 均消费同一契约，避免出现第二套菜单事实源。

当前 `routeKey` 仅是 S05 Catalog 的不可执行客户端键；S04B 不请求 Catalog，也不接受服务端 Path、Component 或远程代码。

### 2.2 MOM Admin Shell

新增应用私有 Shell：

- `AdminSidebar`：展示两个产品任务域、活动任务、展开/折叠状态和稳定本地 Logo；
- `AdminHeader`：提供折叠、面包屑、Factory 上下文、显示偏好入口及内部用户菜单；
- `admin-shell.vue`：只负责 Router、Access Context 与 Factory 重校验的应用编排；纯视觉子组件只接收 Props/Events。

导航不再显示“系统管理”，不提供 Admin/Supplier/Customer Role Switch，也不提供应用内 Tabbar。1024～1279px 默认收起为 64px Rail，1280px 起允许展开；内容继续使用 S04A 的页面安全边距与 `content-lg` 最大宽度。

Factory 切换继续保持既有安全语义：先更新当前上下文，再重新读取 `/api/iam/me`，成功后恢复原任务 URL；失败进入受控 `/menu-error`，不把显示偏好当作授权事实。

### 2.3 路由与回滚边界

- Root Route 与 Legacy `BasicLayout` 映射均指向 MOM Shell，保证现有动态路由适配仍可工作；
- 六个 URL、权限和业务页面组件保持不变；
- `/settings` 作为静态受保护 Core Route 提供诚实的 `PARTIAL` 状态，不实现本地伪保存；
- `layouts/basic.vue` 保留为 S04B 回滚文件；Vben Guard/Store/Theme/Locale 继续留到 S04C。

回滚 S04B 时，只需将 Root Layout 与 Legacy Layout Map 切回 `layouts/basic.vue`；S04A 页面布局、IAM API 和业务状态不需回退。

### 2.4 Token、图标与文案

权威 Token Source 新增 Admin Header 56px、Sidebar 240px 和 Rail 64px，并重新生成 CSS Variables 与 TypeScript 产物。Lucide Registry 新增 Shell 所需的受控图标键；中英文文案新增任务域、面包屑、折叠与显示偏好文案，并移除视觉导航中的“系统管理”。

未新增生产依赖，未引入第二图标集、第二状态库、第二请求层或 Ant Design Vue 私有 DOM 样式覆盖。

## 3. 自动化证据

### 3.1 契约与组件

|证据|结果|
|---|---|
|静态任务注册表|六个任务、两个域、Route Key 唯一、Component Factory 为本地静态工厂|
|权限过滤|只减少可见任务；不能改变 Path、标题、顺序或域|
|Shell 组件测试|Sidebar 活动态/折叠、Header 面包屑与事件通过|
|UI 回归|MOM Shell 为唯一视觉导航；无 Tabbar；Legacy 回滚文件仍存在|
|Token 契约|Comfortable/Compact 均生成 56/240/64px Shell 尺寸|

### 3.2 受控登录态 E2E

新增的 Admin E2E 使用当前标签页 `sessionStorage` 契约和受控 Gateway 响应，不保存真实凭据，验证：

- `/iam/users` 深链进入 MOM Shell；
- 两个任务域、活动任务、面包屑和无 Tabbar；
- `/iam/roles` 导航保持稳定 URL；
- Factory 从 F01 切换至 F02 后，以 `X-Factory-ID: F02` 重取 `/api/iam/me` 并恢复原路由；
- `/settings` 明确显示后续阶段提供，不伪造保存；
- Sidebar 折叠及 1024px 稳定状态无横向溢出。

三应用 E2E 使用 6555/6556/6557 隔离端口执行，避免复用本机 5556 上的非 Supplier 开发服务。最终结果为 `26 passed / 7 skipped`；跳过项均为项目渠道条件。Playwright 断言窗口从 5 秒调整为 10 秒，以覆盖六 Worker 下 Admin 的 Vite 冷编译；业务断言和测试超时未被放宽或删除。

### 3.3 真实 Gateway/IAM 会话复核

2026-08-04 在本地 Gateway 与 IAM 已启动后，由 Chris 在同一受控应用浏览器中手动输入凭据，成功进入 `/iam/users`。复核过程未读取、记录或写入真实密码，也未执行新增、删除、Factory 切换等业务写操作。

真实会话确认：

- 六个任务入口均能进入冻结 URL，浏览器标题、任务标题和活动导航同步，无 Runtime Error；
- “人员与访问 / 安全运营”两个域清楚，不出现“系统管理”、应用内 Tabbar 或渠道 Role Switch；
- 窄视口正确收起为 64px Rail，展开后任务域和任务名称完整，页面无横向溢出；
- Header、Breadcrumb、Page Title、Filter、Directory 的层级清楚，Dark Theme 与 Compact/Rail 状态可读；
- 复核发现用户菜单按钮和两个筛选 Select 缺少稳定可访问名称，已分别补充用户身份名称及关联的隐藏 Label；修复后真实语义树可按 `Platform Administrator · admin`、`用户类型`、`状态` 定位控件；
- `Permission 目录`、`OAuth Client`、`Session 管理` 的页面任务标题仍有中英混用，不属于 Shell 阻塞项，登记到 S06 页面模块化统一处理。

受控浏览器当前可见区域为 639px，不属于 Admin 正式响应式目标；1024/1280/1600 的布局结论仍由 3.2 的隔离 E2E 提供。真实会话与受控 E2E 两层证据合并后，Chris 于 2026-08-05 明确接受 S04B。

## 4. 验证结果

|命令|结果|
|---|---|
|`pnpm install --frozen-lockfile`|通过；依赖已是最新|
|`pnpm validate`|通过；69 项边界及 6 URL/3 应用基线通过|
|`pnpm lint`|通过|
|`pnpm stylelint`|通过；Token 治理仅保留既有 1 项精确例外|
|`pnpm tokens:check`|通过；4 个生成产物无漂移|
|`pnpm check:type`|通过；三应用及共享包通过|
|`pnpm test`|通过；31 个 Auth/契约、2 个 Admin Runtime、11 个 Admin UI、18 个 Vitest Unit|
|`pnpm test:component`|通过；23 个组件测试|
|`pnpm build`|通过；三应用生产构建通过|
|`pnpm bundle:check`|通过；Admin 初始 69.0 KB gzip、公开 Source Map 为 0|
|隔离端口 `pnpm test:e2e`|通过；26 passed、7 skipped|

本地 Node 为 25.9.0，因此出现预期 Engine Warning；正式 CI 证据仍必须使用 Node 24。Admin 最大 Chunk 当前为 1321.8 KB minified，仍只通过迁移期 Baseline，不满足最终 500 KB 目标；S04C/S04D/S05 不得据此宣称 Bundle 封板完成。

## 5. 明确未实施

- Vben Guard、Access Store、User Store、Preferences、Locales、Utils、Types 或 Styles 的应用级退出；
- Vben Workspace 源码、快照包、License/NOTICE 或锁文件清理；
- System Catalog 请求、200/304、版本校验、旧快照或受限诊断模式；
- Preference 保存、Reset、409 冲突或 View Setting；
- `App.vue` 业务模块拆分；
- IAM API、DTO、Permission、Token Claim、后端或 Portal/Mobile 修改；
- Workbench、Production、Quality 或其他 Future 页面；
- 真实账号凭据写入 E2E。

## 6. Review 检查点与停止条件

Chris Review 应重点确认：

1. “人员与访问 / 安全运营”是否比“系统管理”更符合任务导航；
2. Header、Sidebar、Breadcrumb、Factory 与页面任务标题是否层级清楚且不过度重复；
3. 240px/64px Sidebar 和 56px Header 在 1024/1280/1600 下是否符合中高密度 Admin；
4. 移除应用内 Tabbar 是否符合当前工作方式；
5. 显示偏好入口的诚实占位是否可接受。

Chris 已于 2026-08-05 明确接受本报告；S04C 仍须按其独立前置评审与回滚点执行。
