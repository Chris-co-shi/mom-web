# MOM-Web S04 Admin Shell、Router 与页面布局前置评审

> 日期：2026-08-04  
> 阶段：MOM Platform P1.6 / S04 Preflight  
> 前置：S03 客户端交付已获 Chris 接受  
> Review：**Accepted · Chris Review 2026-08-04**  
> 结论：**GO FOR S04 MICRO-SLICES AFTER CHRIS APPROVAL**

## 1. 总体结论

S04 可以实施，但不得把“替换 Vben Layout、Preferences、Locales、Stores、Access Route、Types、Utils、Styles”作为一次不可分割的大切换。

当前 `mom-admin` 的 Shell、路由权限同步、用户信息、Tabbar、动态标题、Locale、Theme 和全局样式仍由 Vben 多个包共同提供。直接整体替换会同时改变深链、401/403、权限变化、主题、语言、页面布局和 Bundle，无法满足“一个 Slice 一次 Review、独立回滚”的既定规则。

本评审把 S04 拆成 S04A～S04D：先沉淀页面布局，再切换 Shell 和任务导航，再替换 Router/Access/Locale 等运行时，最后做零直接引用与视觉封板。S04 不删除 Vben 源码快照；源码、License/NOTICE 和 Workspace 退场仍属于 S05。

Chris 批准本报告后，只授权从 S04A 开始，不自动授权一次性完成 S04B～S04D。

## 2. 证据基线

|证据|当前事实|S04 约束|
|---|---|---|
|`apps/mom-admin/src/App.vue`|606 行，同时组合六个 IAM 页面、命令、弹窗和页面布局|S04 只替换布局组合；业务逻辑和模块拆分留在 S06|
|Admin Vben 引用扫描|19 个应用文件、45 处 `@vben` 引用，涉及 11 个 Vben 导入入口|必须按能力减少引用，不能复制 Vben 实现到 `@mom/*`|
|`router/access.ts`|通过 `generateAccessible('backend')`、Vben Access/User/Tabbar Store 动态加入路由|S04 改为 MOM 静态任务注册表；Permission 只过滤和守卫，不生成导航|
|`router/menu-source.ts`|单一“系统管理”父节点，下挂用户、角色、权限、会话、审计、OAuth Client|必须转为 People & Access / Security Operations 用户任务域，避免技术对象菜单继续膨胀|
|`layouts/basic.vue`|Vben `BasicLayout` 拥有 Logo、Sidebar、Header、Factory、UserDropdown、Tabbar|新 Shell 必须显式接管这些职责，并逐项说明保留或删除|
|`preferences.ts`|Header 56、Sidebar 240/64、Tabbar 40 且启用；页面 Padding 24|尺寸必须迁入 MOM Token；不保留第二套 Preference 存储|
|S02R2|证实页面安全边距、主操作、筛选、主从布局存在真实问题|S04 必须形成受治理布局组件，不能继续复制页面私有 CSS|
|S03|System Preference 已读取并驱动 Theme/Locale；真实写入/409 尚待补证|替换 Vben Preferences 时不能回退到另一个本地偏好事实源|
|真实浏览器只读检查|新标签页直接访问 `/iam/users`，按当前标签页 Session 规则跳转到 `/auth/login?redirect=%252Fiam%252Fusers`|保留深链和重定向语义；未登录时不得加载受保护任务页|

现有 Vben 直接依赖为：`@vben/access`、`hooks`、`layouts`、`locales`、`preferences`、`stores`、`styles`、`tailwind-config`、`types`、`utils`，以及 `@vben/styles/antd` 子入口。

## 3. 产品与 UX 决策

以下决策在 Chris 批准本报告时一并冻结。

### 3.1 Shell 信息层级

```text
Admin Shell
├── Sidebar：稳定任务域与任务入口
├── Header：折叠、面包屑、Factory 上下文、显示偏好入口、用户菜单
└── Content
    ├── Page Task Header：标题、说明、主操作
    ├── Filter Bar：筛选、查询、重置
    └── Task Content：列表、状态、详情与命令
```

- Sidebar 表达用户任务域，不表达微服务、Permission 树或代码目录；
- Header 面包屑表达 `平台治理 / 任务域 / 当前任务`；
- `Page` 继续拥有页面唯一 `h1`、说明和主操作；Shell 不重复页面标题；
- Factory 是数据上下文，不是 Role Switch；只在存在多个授权 Factory 时显示；
- 用户菜单只显示当前内部身份与退出，不提供 Admin/Supplier/Customer 切换。

### 3.2 导航分组

S04 的静态 P1.6 任务注册表只包含当前已实现页面：

|任务域|任务入口|保持的 URL|Permission 作用|
|---|---|---|---|
|人员与访问（People & Access）|用户与授权|`/iam/users`|只过滤可见性并守卫深链|
||角色配置|`/iam/roles`|同上|
||权限目录|`/iam/permissions`|同上|
||登录客户端|`/iam/clients`|同上；必须与 System Application Catalog 明确区分|
|安全运营（Security Operations）|会话处置|`/iam/sessions`|同上|
||安全审计|`/iam/audit`|同上|

约束：

- 不保留“系统管理”作为产品一级导航；
- Permission 集合不能创建节点、排序或命名，只能过滤注册表；
- 空任务域不显示；无任何任务权限时进入受控 403；
- Sidebar 一级任务域最多 7 个，禁止演化为数百项平铺菜单；
- S05 Catalog 只能激活客户端已注册任务，不得改变组件、Path 或执行代码。

### 3.3 不保留应用内 Tabbar

推荐并冻结为：MOM Admin Shell 不提供 Vben 多页签 Tabbar。

理由：

- 当前 Sidebar、Breadcrumb、Tabbar 同时表达位置，造成重复导航和额外垂直占用；
- 当前 Tabbar 不持久化，也没有产品证据表明制造治理任务需要应用内多页签；
- 浏览器标签页已提供并行任务边界，当前认证契约也明确按浏览器标签页隔离；
- 删除 Tabbar 可以移除 Tabbar Store、缓存清理和一组 Vben 运行时依赖。

若未来存在经用户研究确认的多任务切换需求，需单独 Product Decision，不在 S04 中恢复通用 Tabbar。

### 3.4 页面布局契约

S04A 建立 Admin 应用私有布局组件；它们不进入 `@mom/common-ui`，因为当前只有一个真实渠道消费者，且 Admin 与 Portal 的密度、触控和信息结构不同。

|契约|职责|不拥有|
|---|---|---|
|现有 `Page`|任务标题、说明、主操作、唯一 `h1`|Router、API、Permission、业务状态|
|`AdminFilterBar`|筛选字段、查询/重置、响应式换行、`role=search`|筛选模型、请求和权限|
|`AdminContentSection`|平面内容分区、标题、局部操作、状态容器|业务 Card 语义、数据加载|
|`AdminMasterDetail`|无选择时单栏；有选择时主从；窄宽度单栏|选中逻辑、DTO、详情请求|

布局规则：

- 页面主操作只位于 `Page.actions`；
- 查询/重置始终与筛选字段相邻，不被推到页面另一端；
- 列表默认使用平面分区和语义边框，不形成卡片墙；
- Empty、No Result、Error、Forbidden、Partial 使用 `DataState`，不以空白或永久 Spinner 表达；
- 行操作留在行内，批量操作留在列表区，详情命令留在详情区；
- 通用布局组件不得访问 API、Router、Store、Permission 或 IAM View Model；
- 不创建 Universal Table、Universal Form 或万能 CRUD。

### 3.5 尺寸与响应式

S02R2 已接受的 24px 安全边距优先于当前 Admin Comfortable `page-gutter=20px` 的旧生成值。S04A 必须修改权威 Token Source，而不是在页面硬编码覆盖：

|目标|Comfortable|Compact|
|---|---|---|
|内容外边距|24px|20px|
|Header 高度|56px|56px|
|Sidebar 展开/折叠|240px / 64px|240px / 64px|

- 1024～1279：默认折叠为 64px Rail，可由用户临时展开；内容任务完整可用；
- 1280～1599：允许展开 Sidebar；主从布局根据可用内容宽度决定单/双栏；
- 1600 及以上：内容最大宽度使用现有 `content-lg=1440px`，居中但不压缩复杂表格；
- 页面组件按**实际内容容器宽度**响应，不仅按浏览器宽度猜测；实现可先使用 CSS Container Query，若现有支持矩阵未确认则使用等价可测策略；
- Admin 低于 1024px 不承诺完整管理体验，但不得出现不可恢复的空白页或隐藏关键错误动作；
- 200% 文本缩放下操作区可换行，不允许文本覆盖或横向裁切。

## 4. Router 与运行时契约

### 4.1 Core Routes

S04 保持或建立以下静态 Core Route：

|Route|处理|
|---|---|
|登录、强制改密|保留 `/auth/login`、`/auth/change-password`|
|Forbidden|保留 `/403`，不泄露对象存在性|
|Not Found|保留 Catch-all 404 与安全返回入口|
|Runtime Error|新增受控运行时错误入口；认证上下文尚有效时不得误清会话|
|Catalog Error|静态存在，但 S05 前不发起 Catalog 请求|
|历史 Menu Error|保留 `/menu-error` 兼容入口，转交 MOM Runtime Error；已有书签不失效|
|Personal Settings|预留稳定路由并显示诚实的不可用状态；不实现读取、保存、Reset 或 View，S07 替换|

### 4.2 静态任务注册表

注册表字段必须包含：稳定 Route Name、Path、本地 Component Factory、Task Domain、Title Key、`MomIconKey`、排序、`requiredPermission` 和供 S05 使用的不可执行 `routeKey`。

- Component 必须是源码中的静态导入工厂，不接受服务端字符串；
- S04 不调用 Catalog；P1.6 静态来源是有明确删除条件的兼容源；
- S05 接入 Catalog 后，由 Catalog 激活 Registry 条目；兼容源随 S05 通过而删除；
- 未知 Route、未知 Icon、无权限深链和不安全 Redirect 全部 fail closed。

### 4.3 Guard 与 Access

- 认证阶段继续由现有 `runtimeState` 和第一方 Auth Runtime 决定；
- Permission 来源继续是 `/api/iam/me` 的 Access Context；
- 权限刷新继续单飞，读取请求只按既有契约重试一次，写请求不盲目重试；
- Guard 直接读取 MOM Access Runtime，不通过 Vben Store 复制一份用户或权限事实；
- 权限变化后，当前 Route 不再可用时进入 `/403`，并保留来源；
- 安全 Redirect 继续拒绝外部 URL、`//`、反斜杠、Auth Route 和未注册路径；
- 路由加载失败进入 Runtime Error，不能只停止进度条或显示空白页。

### 4.4 Theme、Locale 与 Preference

- `vue-i18n` 成为 Admin 直接依赖，替换 `@vben/locales`；静态 `zh-CN/en-US` 和 S03 Dynamic I18n 合并规则保持；
- MOM Theme Runtime 与 Antdv Adapter 成为唯一主题状态，删除 Vben → MOM 单向桥；
- Shell 中保留 Locale/Theme 快捷操作时，必须通过 S03 System Preference 保存，不建立新的本地持久化；
- 真实 Preference Save/409 证据是启用快捷保存的前置条件。证据未关闭时可先完成 S04A，不得用静默本地成功绕过；
- Density、Page Size、Timezone、Reset 和 View 的完整页面仍属于 S07。

## 5. Vben 迁移与兼容层

|兼容项|消费者|建立/保留 Slice|删除条件|
|---|---|---|---|
|P1.6 静态任务来源|MOM Router、MOM Shell|S04B|S05 Catalog 200/304、fail-closed 与回归通过|
|Legacy Vben Menu Adapter|当前 BasicLayout|仅 S04B 切换期间|MOM Shell 成为唯一已认证 Layout|
|Vben Theme Bridge|Root/Theme|沿用至 S04C|MOM Provider、System Preference、Auth/Shell 控件通过|
|`/menu-error` 兼容 Route|历史深链与错误跳转|S04C 起保留|有版本化废弃决策；S05 不要求删除 URL|

S04D 的 Admin 应用门禁为：`apps/mom-admin` 中 `@vben/*` 直接引用为 0。此门禁只允许移除 Admin Manifest 的直接 Vben 依赖；不得删除 Workspace Vben 源码、顶层包、License 或 NOTICE，后者必须等到 S05 全仓零引用。

## 6. 微切片实施计划

### S04A · 页面布局契约

**目标**：优先解决 Chris 已确认的页面布局不一致，并让六个现有任务页使用同一结构。

**预计修改**：

- `apps/mom-admin/src/layouts/page/`：Admin 私有布局组件；
- `apps/mom-admin/src/App.vue`：只替换页面结构组合，不迁移业务逻辑；
- `apps/mom-admin/src/styles.css`：删除被布局组件取代的页面私有布局；
- `packages/design-tokens/tokens/mom.tokens.json` 及生成物：冻结 Admin 内容外边距；
- 单元、组件、UI/E2E 测试与 S04A 实施报告。

**不包含**：导航重组、Router、Vben Shell、API/DTO、模块拆分、Catalog。

**验收**：六页面的标题/主操作、筛选、内容分区、数据状态和主从行为一致；1024/1280/1600、Comfortable/Compact、Light/Dark、200% 文本缩放通过。

**回滚**：恢复原页面组合和旧 Token 生成物；Router、认证与 Vben Shell 不受影响。

### S04B · MOM Shell 与任务导航

**目标**：以 Admin 私有 MOM Shell 和静态任务注册表替换视觉 Shell；移除 Tabbar；导航转为人员与访问/安全运营。

**预计修改**：

- `apps/mom-admin/src/layouts/admin-shell.vue` 及 Shell 私有组件；
- `apps/mom-admin/src/router/registry.ts` 与临时 Legacy Adapter；
- `packages/design-tokens/tokens/mom.tokens.json` 及生成物：冻结 Header/Sidebar 尺寸；
- Locale 文案、Lucide Registry、Shell 组件/E2E/视觉测试；
- S04B 实施报告。

**不包含**：删除 Vben Store/Guard/Locale/Theme 源码或接入 Catalog。

**验收**：六个 URL、Logo、Sidebar、Breadcrumb、Factory、用户菜单、退出、权限过滤和深链保持；无 Tabbar；导航不再显示“系统管理”。

**回滚**：路由 Root 切回 `layouts/basic.vue`，继续使用 Vben Menu Adapter；不回滚 S04A 页面布局。

### S04C · Router、Access、Provider 与 Vben 应用级退出

**目标**：替换 Vben Access/Stores/Preferences/Locales/Utils/Styles/Types，并让 MOM Router/Provider 成为唯一应用运行时。

**预计修改**：

- `bootstrap.ts`、`main.ts`、`root.vue`、`runtime.ts`；
- `router/*`、Auth/Fallback Views、Theme/Locale；
- `vite.config.ts`、Admin Manifest 和锁文件；
- 路由/安全/Locale/Theme/E2E 测试与 S04C 实施报告。

**不包含**：删除 Vben Workspace 快照、Catalog、业务模块化或新业务页面。

**验收**：Admin 应用 `@vben/*` 直接引用为 0；认证、强制改密、刷新、退出、401/403、权限变化、六个深链、Core Route、双语和主题行为保持。

**回滚**：按 Provider、Router、Shell 三个入口分别恢复旧适配；不删除旧代码后再尝试回滚。

### S04D · 视觉、无障碍、Bundle 与文档收口

**目标**：完成已认证 Admin 的最终 S04 Review，并登记 S05 的剩余全仓 Vben 引用。

**验收**：

- Admin 1024/1280/1600，Light/Dark/System，Comfortable/Compact；
- 键盘、焦点、Dialog 焦点返回、200% 文本缩放、reduced motion；
- 直接深链、刷新恢复、权限变化、Factory 变化无旧上下文残留；
- `pnpm check`、`pnpm build`、`pnpm bundle:check`、隔离 E2E 和可用环境下的 Live E2E；
- Admin 最大 Chunk 必须显著下降，但最终 500 KB 全仓门禁仍由 S05/S12 判定；
- 不删除 Vben 源码，输出精确的 S05 零引用清单。

## 7. 必须冻结的测试

### 路由与安全

- 六个 IAM URL、Route Name、Permission 和默认首个可访问路径；
- 未登录深链跳转及 `redirect` 恢复；
- 强制改密不能进入业务 Route；
- 401 刷新单飞、403 权限同步、写请求不自动重试；
- 无权限导航隐藏，直接深链进入受控 403；
- `/menu-error` 历史兼容、Runtime Error、Catalog Error、404；
- Logout 清理 Auth、Access、System Runtime 和当前用户缓存。

### Shell 与页面布局

- Sidebar 展开/折叠、活动任务、空任务域隐藏；
- Breadcrumb 与页面唯一 `h1` 不重复；
- Factory 选择后重新验证上下文，不把 Factory 当权限；
- 筛选栏在 1024px 与 200% 文本缩放下可换行；
- 未选详情为单栏，选中后按容器宽度进入双栏；
- Loading、Empty、No Result、Error、Forbidden、Partial 均有可恢复动作；
- 主操作、筛选动作、行操作和详情命令位置稳定。

### 架构与 Bundle

- `common-ui` 和 Admin 布局组件不得依赖 API、Router、Store、Permission 或 IAM DTO；
- Permission 不得生成导航名称、排序或 Path；
- S04C 后 `apps/mom-admin` 无 `@vben/*` 直接引用；
- 不新增第二请求层、状态库、UI 库或图标集；
- 生产 Source Map 为 0，Bundle 基线不得放宽。

## 8. 验证命令

每个微切片至少执行：

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
git diff --check
```

涉及真实登录、Preference 写入或权限变化时，增加 Gateway/IAM/System Live E2E。正式证据使用 CI Node 24；本地 Node 25 的 Engine Warning 继续如实记录。

## 9. 明确不做

- 不修改 IAM/System/Gateway API、DTO、Token Claim、Permission 或数据库；
- 不接入 System Catalog，不创建 Navigation Draft/发布页面；
- 不删除 Vben Workspace 源码、License 或 NOTICE；
- 不拆分 `App.vue` 的业务用例与 API，S06 负责 People & Access / Security Operations 模块化；
- 不建设 Workbench、Production、Quality、Portal Future 页面；
- 不创建 Personal Settings 完整页面；
- 不升级 Vue、Vite、Router、TypeScript、Antdv 或 Tailwind；
- 不引入新的生产依赖、UI 库、图标集、请求层或状态库；
- 不以角色、Permission 或微服务自动生成产品导航；
- 不提交 Git、不推送、不创建 PR。

## 10. 待补证与停止条件

|事项|状态|处理|
|---|---|---|
|真实 Preference Save/409|Pending from S03|不阻塞 S04A；启用 Shell 快捷保存前必须关闭|
|S04 中文任务域和任务名称|Need Product Decision|批准本报告即接受第 3.2 节候选名称；否则在 S04B 前修订|
|移除应用内 Tabbar|Need Product Decision|批准本报告即接受第 3.3 节；否则 S04B 暂停|
|目标浏览器/真实设备矩阵|Unknown|继续使用已批准视口与现代浏览器基线，S12 前补产品证据|
|Container Query 支持范围|Need Technical Confirmation|S04A 编码前以实际 Browserslist/构建验证；不满足则使用可测的 Grid/Media 策略|
|Catalog Route Contract|S05 boundary|S04 只预留静态 `routeKey`，不得提前消费 Catalog|

出现 URL、安全重定向、Permission、Factory、认证状态或 System Preference 语义无法保持时，立即停止当前微切片并回滚，不降低断言。

## 11. Review 请求

建议 Chris 批准：

1. S04 拆为 S04A～S04D；
2. 先实施 S04A 页面布局契约；
3. 采用“人员与访问 / 安全运营”任务导航候选；
4. MOM Admin 不保留应用内 Tabbar；
5. S04C 只实现 Admin 应用级 `@vben/*` 零直接引用，Vben 源码删除仍留在 S05。

未经明确批准，不进入 S04A 编码。
