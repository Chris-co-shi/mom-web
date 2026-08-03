# MOM-Web S01 Token 与主题前置评审

> 评审日期：2026-08-03  
> 前置：S00 Completed，ADR-013/ADR-016 Accepted  
> 当前状态：**APPROVED BY CHRIS — IMPLEMENTED**  
> 实施证据：[S01 Token 与主题实施报告](S01-token-theme-implementation-report.md)

## 1. 结论

S01 可以进入实施，但必须由 Chris 明确批准本报告冻结的范围和四项澄清后才能修改代码：

1. S01 实现 `LIGHT / DARK / SYSTEM` 主题内核和首屏应用契约，但不创建跨用户共享的浏览器偏好缓存；真实用户偏好持久化、用户隔离缓存和服务端冲突处理仍属于 S03/S07；
2. S01 的“刷新恢复可测”指：给定可信启动值时，主题必须在 Vue 挂载前恢复并保持无组件级闪烁；三应用从 System Preference 恢复真实用户值必须等 S03；
3. Admin 支持 Comfortable/Compact，Portal 只使用 Comfortable 并保持触控尺寸下限，不把 Compact 机械复用到 Portal；
4. 暗色状态色冻结为 Success `#34D399`、Warning `#FBBF24`、Danger `#F87171`，其在暗色 Surface `#1C1C1E` 上的对比度分别约为 8.85:1、10.19:1、6.15:1。

本轮没有发现必须改变后端契约、权限模型或产品渠道边界的 Blocker。条件未批准前不得开始 S01；批准仅授权 S01，不自动授权 S02。

## 2. 本轮评审边界

### 2.1 本轮目标

- 核对 Accepted 视觉、组件库、样式系统和实施计划是否足以指导 S01；
- 审计现有 Design Token、Vben Preferences、Antdv Theme 和三应用启动链；
- 冻结 S01 的 Token 契约、主题状态、密度、文件范围、兼容桥、验收和回滚；
- 为下一轮代码实施提供可直接执行的文件级计划。

### 2.2 本轮只新增

- 本评审文档。

### 2.3 本轮不做

- 不修改 Token、主题、CSS、Vue、Vite、依赖、锁文件或 CI；
- 不改变 ADR、Product Architecture 或 Frontend Architecture 的状态；
- 不接入 System Preference、Dynamic I18n 或 Catalog；
- 不建设 Page/DataState/ActionBar、Admin/Portal/Auth Shell 或 Lucide Registry；
- 不拆分现有大型 `App.vue`，不迁移 `@mom/iam-admin`；
- 不建设 Workbench、Production、Quality、Delivery、Order 等 Deferred/Future 页面；
- 不修改 `mom-platform`、`mom-mobile` 或任何后端 API。

## 3. 证据矩阵

|证据|当前事实|对 S01 的约束|
|---|---|---|
|[视觉方向](../01-visual-direction.md)|克制、内容优先；Admin 中高密度，Portal 更轻；首日支持三主题|不能只换品牌色；必须同时验证渠道密度、焦点和暗色状态|
|[UI 组件库](../03-ui-component-library.md)|Ant Design Vue 4.2.6；集中 Theme Adapter|不得升级 Antdv，不得在页面复制 Theme 配置|
|[样式系统](../07-style-system.md)|Token 单一来源生成 CSS/Tailwind/Antdv/TS|当前手工双写必须在 S01 终止|
|[实施计划](../08-implementation-plan.md)|S01 只做 Token/主题/密度/示范页|不得提前吞并 S02、S03、S06|
|[ADR-013](../../adr/ADR-013-Ant-Design-Vue作为MOM基础组件库.md)|Antdv 是基础组件库，业务语义由 MOM 封装|Theme Adapter 必须走公开 Token API|
|[ADR-016](../../adr/ADR-016-MOM样式系统与Token单一来源.md)|生成物提交，页面只消费 Semantic Token|生成器、漂移检查和例外台账是 S01 验收内容|
|`packages/design-tokens/src/index.ts`|TypeScript 常量手工维护|与 CSS 已构成两个事实来源|
|`packages/design-tokens/src/styles.css`|只有 Light，类别不完整|不能支持 Dark、密度、Tailwind 和完整 Antdv 映射|
|`apps/mom-admin/src/main.ts` / `root.vue`|启动依赖 Vben Preferences；Antdv 主题来自 Vben Hook|需要有期限的单向兼容桥，不能在 S01 删除 Vben|
|`packages/@core/preferences`|主题支持 `light/dark/auto`，缓存只按应用命名空间隔离|可作为 Admin 迁移输入，但不能被宣称为用户隔离的最终 Preference|
|两个 Portal `main.ts`|全量注册 Antdv，无 Design Token/Theme Provider|S01 要接入 Theme Provider；按需 Antdv 仍留给 S02|
|两个 Portal CSS/AuthGate|大量硬编码颜色，`body min-width: 1080px`|当前可见入口无法直接通过暗色与 360px 基线|
|S00 Token 门禁|只冻结两个文件 SHA-256|S01 必须替换为“源生成 + `--check`”而非更新哈希假装单一来源|
|S00 Bundle 门禁|Portal/最大 Chunk 的严格目标仍失败|S01 只能保持 baseline 不回归，不能声称完成 Bundle 优化|

## 4. 当前实现审计

### 4.1 Token

当前 `@mom/design-tokens` 只有一个手写 TS 对象和一个手写 CSS 文件。二者已经存在命名和值的并行维护风险，并且缺少：

- Dark 语义色；
- font、line-height、letter-spacing 的完整尺度；
- space、control/icon/container size；
- border、shadow、z-index；
- density/channel；
- breakpoint 和 reduced motion；
- Tailwind 语义映射；
- Antdv Theme Adapter。

S00 的 SHA-256 门禁只能发现文件变化，不能证明两个输出来自同一来源，因此它是明确的过渡实现。

### 4.2 Admin 主题

- Vben `ThemeModeType` 已支持 `light / dark / auto`；映射关系可固定为 `LIGHT / DARK / SYSTEM`；
- Vben 同时拥有根 `.dark` 类、Theme Toggle、Antdv Token Hook 和 Compact 状态；
- 缓存命名空间为应用版本与环境，不包含 `userId`；它是冻结迁移例外，不是 S03 的用户偏好实现；
- 当前 `root.vue` 直接依赖 `@vben/hooks` 和 `@vben/preferences`，S01 不得一次删除这些依赖，因为 Shell 仍消费相同 Preferences；
- `styles.css` 同时使用 MOM Variables、Vben HSL Variables、Hex、任意像素和 `!important`，示范页迁移必须减少而不是扩大例外。

### 4.3 Portal 主题与响应式

- Supplier/Customer Portal 没有 `@mom/design-tokens` 依赖和 ConfigProvider Theme；
- 两个 Portal 都全量 `.use(Antd)`，但按需注册属于 S02 的 Bundle 治理，不在 S01 抢跑；
- 两套样式高度重复，但去重和 Portal Shell 归属 S11；S01 只让它们消费相同语义 Token；
- `body min-width: 1080px` 与 Portal 360px 渠道边界冲突。S01 只修复现有认证入口和当前骨架的基础可用性，不借此建设 Future 页面或完整响应式 Shell。

### 4.4 字体与图标

- 当前 CSS 声明 `Inter`，仓库没有自托管字体资产；浏览器实际依赖系统回退；
- S01 冻结系统字体栈，不引入远程字体、字体 CDN 或新的生产依赖；
- Lucide Registry 属于 S02。S01 不处理锁文件中既有 `lucide-vue-next` deprecation。

## 5. 问题分级

### 5.1 Blocker

无。

### 5.2 Major

|ID|问题|影响|S01 必须采取的修正|
|---|---|---|---|
|S01-M1|Token TS/CSS 手工双写|主题漂移，无法证明单一来源|建立一个机器可读权威源，四类输出全部生成|
|S01-M2|“刷新恢复”与用户隔离 Preference 的 Slice 边界不清|容易用跨用户 localStorage 抢跑 S03|S01 不持久化新用户值；只实现可信启动输入与运行时切换契约|
|S01-M3|Admin 主题仍由 Vben 拥有|新旧 Shell/Antdv 可能出现双主题|建立单向桥：Vben 状态输入 MOM Runtime；MOM Runtime 统一根属性和 Antdv Adapter|
|S01-M4|Portal 没有 Theme Provider|三主题只在 Admin 成立|两个 Portal 分别创建独立 Runtime 实例并接入相同 Adapter|
|S01-M5|暗色状态色未冻结|实现者会在页面自行补色|采用本报告第 1 节的三个状态色并加入自动对比度测试|
|S01-M6|现有硬编码样式与 1080px 最小宽度|暗色和 Portal 移动入口失效|迁移当前可见认证/示范面到语义 Token；遗留项进入精确例外台账|
|S01-M7|S00 Token 门禁只比哈希|可能把手工改四份输出当作通过|`tokens:check` 改为重生成后比较零差异，并校验 Schema/引用/对比度|

### 5.3 Minor

|ID|问题|处理|
|---|---|---|
|S01-m1|Vben 仍使用 `.dark` 和 HSL Variables|Runtime 同步 `.dark` 作为 S04 删除的兼容输出，不把它作为 MOM Token 权威源|
|S01-m2|Portal 两套 CSS 重复|S01 只统一 Token 消费；结构去重留给 S11|
|S01-m3|当前 IAM 页面存在 inline width|仅迁移 `/iam/users` 示范范围中的值；其余随 S06 页面拆分处理|
|S01-m4|无稳定视觉快照|S01 先建立确定性主题/可访问性 E2E；大规模视觉回归基线在 Shell 稳定后建立|

## 6. S01 冻结设计

### 6.1 权威 Token Source

采用仓库内 JSON 作为唯一权威源，不引入 Style Dictionary 或其他生产/构建依赖：

```text
packages/design-tokens/
├── tokens/
│   └── mom.tokens.json          # 唯一手工维护值
├── scripts/
│   └── generate-tokens.mjs      # Node 内置能力生成与校验
└── src/
    ├── generated/
    │   ├── tokens.css           # CSS Variables
    │   ├── tailwind.css         # Tailwind 4 @theme inline
    │   ├── antd-theme.ts        # Antdv 公共 Theme Token Adapter
    │   └── tokens.ts            # TypeScript 值与类型
    ├── runtime.ts               # 纯 DOM 主题状态机，不依赖 Vue/Pinia/API
    ├── index.ts                 # 稳定公共出口
    └── styles.css               # 有序导入生成 CSS 与基础主题属性
```

生成器必须满足：

- 输入 Schema、层级、引用和单位不合法时 fail closed；
- 输出键排序、数字格式和换行确定；
- `generate` 负责写入，`--check` 只比较内存结果与仓库生成物，不自修复 CI；
- 生成文件带“禁止手改”和源文件说明；
- 不从生成物反向读取值，不允许生成物成为第二来源；
- 现有 `--mom-color-*` 名称只在必要处生成兼容别名，并登记 S04/S06 删除条件。

### 6.2 Token 层级与覆盖权

|层级|用途|允许覆盖者|页面能否直接消费|
|---|---|---|---|
|Primitive|原始色阶、尺寸、字重|Token Source 维护者|否|
|Semantic|Canvas、Surface、Text、Border、Action、Status、Focus|Light/Dark Theme|是，默认选择|
|Component|无法由 Semantic 表达的稳定组件契约|Design System Review|仅对应组件|
|Channel|Admin/Portal 的密度、页面间距、控件尺寸|Channel 架构|是，但不能复制颜色|

冻结类别：color、font family/size/weight/line-height/letter-spacing、space、control/icon/container size、radius、shadow、border、z-index、motion、breakpoint。

### 6.3 初始语义色

|语义|Light|Dark|主要映射|
|---|---|---|---|
|Surface Canvas|`#F5F5F7`|`#111113`|页面底色 / Antdv `colorBgLayout`|
|Surface Container|`#FFFFFF`|`#1C1C1E`|卡片 / Antdv `colorBgContainer`|
|Text Primary|`#1D1D1F`|`#F5F5F7`|正文 / Antdv `colorText`|
|Text Secondary|`#5F6368`|`#A1A1AA`|辅助文本 / Antdv `colorTextSecondary`|
|Action Primary|`#4F46E5`|`#818CF8`|主操作 / Antdv `colorPrimary`|
|Status Success|`#207A4B`|`#34D399`|成功文本、图标与状态|
|Status Warning|`#A15C00`|`#FBBF24`|警告文本、图标与状态|
|Status Danger|`#B42318`|`#F87171`|危险文本、图标与状态|

状态色不单独表达业务结果；状态组件必须同时提供文本、图标或结构语义。生成器测试必须覆盖文本/Surface 的 WCAG 2.2 AA 对比度，组件实色背景的前景色另设 Semantic Token，不通过反色猜测。

### 6.4 尺度

- 系统字体栈：`-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", ui-sans-serif, system-ui, sans-serif`；
- 字号：12 / 13 / 14 / 16 / 20 / 24 / 32；字重：400 / 500 / 600 / 700；
- 间距：4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64；
- 圆角：Control 8、Card 12、Modal 16；
- 动效：140 / 180 / 220ms，统一 easing，并为 reduced motion 生成 0ms 覆盖；
- 断点：480 / 768 / 1024 / 1280 / 1600；
- 层级：Page 0、Sticky 100、Dropdown/Popover 1000、Modal 1100、Notification 1200；
- Admin：正文 14，Comfortable Control 36，Compact Control 32；
- Portal：正文 16，Control 最低 44，只允许 Comfortable。

Antdv Adapter 只使用 4.2.6 公开 `ThemeConfig`/Token 类型能表达的字段；无法稳定映射的值保留为 MOM CSS Token，不覆盖 Antdv 私有类或哈希选择器。

### 6.5 Tailwind 映射

- 所有新工具类使用 `mom-` 语义前缀，例如 `bg-mom-surface-canvas`、`text-mom-text-primary`、`border-mom-border-default`；
- Tailwind 映射只引用 CSS Variables，不复制 Hex、尺寸或媒体断点值；
- Admin 继续保留 Vben Tailwind 入口到 S04，MOM 映射采用前缀避免覆盖既有通用名称；
- Portal 在 S01 接入仓库已有的 Tailwind 4 构建依赖，但不借机实现 S02 Shell；
- 任意值只允许在精确例外台账中存在，新增业务样式默认阻断。

### 6.6 主题与密度状态机

公共类型固定为：

```ts
type MomThemeMode = 'LIGHT' | 'DARK' | 'SYSTEM';
type MomResolvedTheme = 'LIGHT' | 'DARK';
type MomDensity = 'COMFORTABLE' | 'COMPACT';
type MomChannel = 'ADMIN' | 'PORTAL';
```

Runtime 职责：

1. 接收可信启动值，不自行读取 Token、用户 ID 或 System API；
2. `SYSTEM` 通过 `matchMedia('(prefers-color-scheme: dark)')` 解析并监听变化；
3. 在 Vue 挂载前设置 `data-mom-theme-mode`、`data-mom-theme`、`data-mom-density`、`data-mom-channel` 和 `color-scheme`；
4. 迁移期同步 `.dark` 类供 Vben 使用，所有权和删除条件登记到 S04；
5. 提供订阅和销毁监听能力，不依赖 Vue、Pinia、Router、API 或共享 Store；
6. Portal 收到 `COMPACT` 时 fail closed 到 `COMFORTABLE` 并产生可测试诊断，不降低触控目标；
7. 不写 `localStorage`，不创建仅按应用名隔离的偏好缓存。

### 6.7 首屏与刷新语义

S01 可承诺：

- 默认 Light 在首个可绘制文档上已有根属性；
- System 在可用的同步媒体查询下、Vue 挂载前解析；
- 给定可信启动值时，Root Provider 首次渲染即使用对应 Antdv Algorithm 与 Token；
- Theme 切换、System 媒体变化和 Density 切换不重建应用；
- Admin 当前 Vben 偏好可作为有期限的兼容输入，支持现有 Theme Toggle 和 Compact Toggle。

S01 不得宣称：

- 已完成 System Preference 读取/保存/Reset/409；
- 已完成三应用真实用户偏好的跨刷新恢复；
- 已完成按 `clientId + userId` 隔离的缓存；
- 服务不可用时已经具备 S03 的离线偏好降级。

这些能力只有在 S03 的用户身份、Preference DTO、ETag/版本和隔离缓存共同接入后才能验收。S01 的测试会通过显式启动输入验证恢复契约，不用不安全的应用级持久化伪造结果。

### 6.8 Vben 兼容桥

- 映射：`light → LIGHT`、`dark → DARK`、`auto → SYSTEM`；`preferences.app.compact → COMPACT/COMFORTABLE`；
- 方向：Vben Preferences 是 S01～S03 Admin 的迁移输入，MOM Runtime 是根属性和 Antdv Adapter 的统一输出；
- 现有 Vben Theme Toggle 不复制为新的 MOM Toggle；
- 不修改 Vben 缓存 Schema，不把它包装成最终 System Preference；
- 兼容桥不得被 Portal 或共享业务组件引用；
- S04 完成 MOM Preferences/Shell 替换后删除该桥；S05 零引用前不删除 Vben 源码。

### 6.9 IAM 示范页

示范页固定为现有 `/iam/users`，不是新增路由或新产品页面。S01 仅验证：

- Page、筛选区、表格、详情卡、状态、主/次/危险动作使用同一语义 Token；
- Light/Dark/System 与 Comfortable/Compact 下信息层级和操作语义不变；
- 键盘焦点、颜色非唯一表达、200% 文本缩放和 Admin 1024px 可完成核心任务；
- 不改变 IAM URL、权限条件、API、命令确认、审计原因、错误状态或页面业务逻辑；
- 不借示范迁移拆分 496 行 `App.vue`，该工作仍属于 S06。

## 7. S01 实施步骤与文件边界

### S01-A · Token Source 与生成门禁

新增：

- `packages/design-tokens/tokens/mom.tokens.json`；
- `packages/design-tokens/scripts/generate-tokens.mjs`；
- `packages/design-tokens/src/generated/{tokens.css,tailwind.css,antd-theme.ts,tokens.ts}`；
- Token Schema、引用、对比度和确定性单元测试；
- 精确样式例外台账及防扩张检查。

修改：

- `packages/design-tokens/{package.json,tsconfig.json,src/index.ts,src/styles.css}`；
- 根 `package.json` 的 `tokens:generate/tokens:check`；
- `scripts/check-tokens.mjs` 与 S00 过渡 Token 基线；
- CI 中 Token Step 的名称和生成零漂移语义。

退出条件：连续两次生成结果一致；手改任一生成物时 `pnpm tokens:check` 必须失败。

### S01-B · 主题内核与三应用 Provider

新增：

- `packages/design-tokens/src/runtime.ts`；
- 三应用各自的 `src/app/theme.ts`，每个应用创建独立 Runtime 实例；
- 两个 Portal 的轻量 Root Provider（仅 ConfigProvider/AntApp/Theme，不是 S02 Shell）。

修改：

- 三应用 `index.html`、`main.ts`；
- Admin `bootstrap.ts`、`root.vue`、`preferences.ts`；
- 两个 Portal 的 `package.json` 与 `vite.config.ts`，只提升 Workspace 已有 Tailwind/Design Token 为明确直接依赖；
- `pnpm-lock.yaml` 的 importer 记录，不升级任何版本。

依赖影响：不新增外部生产依赖；不升级 Vue、Vite、TypeScript、Router、Pinia 或 Antdv；不处理 Lucide。

### S01-C · 可见样式迁移与示范页

修改：

- `apps/mom-admin/src/styles.css`；
- `apps/mom-admin/src/App.vue` 中仅 `/iam/users` 的样式挂点/inline width；
- 两个 Portal `styles.css` 与 `AuthGate.vue` 的样式；
- `packages/common-ui/src/styles.css`。

约束：

- 不改变模板中的业务条件、事件、API 参数和错误语义；
- Portal 仍保持两个应用独立发布，结构去重留到 S11；
- 未触达遗留样式必须进入精确例外台账，不使用整个目录排除；
- 新增/实质修改区域不得出现任意 Hex/RGB、未登记像素或 `!important`。

### S01-D · 测试、报告与停止

新增或修改：

- Token/Theme Runtime 单元测试；
- 三应用 Theme Provider 组件测试；
- Playwright Theme/Density/首屏根属性/关键视口测试；
- S01 实施报告、架构当前阶段和已冻结暗色值。

完成后停止在 S02 前，等待独立 Review。

## 8. 验收矩阵

### 8.1 Token

- 权威源覆盖全部批准类别；
- 四类输出可从空生成目录确定性重建；
- 生成物手改、未知引用、循环引用、无单位尺寸、非法主题键均 fail closed；
- Light/Dark 关键文本和状态组合通过自动对比度测试；
- 业务代码只使用 Semantic/Channel Token，Primitive 不成为公开页面 API。

### 8.2 Theme Runtime

- LIGHT、DARK、SYSTEM 三态和系统媒体变化；
- 监听器只注册一次且可销毁；
- 根属性、`color-scheme`、迁移期 `.dark` 始终一致；
- 三应用 Runtime 实例互不共享状态；
- Portal Compact 输入被拒绝/回退；
- Runtime 不访问 `localStorage`、API、Router、Pinia 或 Vben 包。

### 8.3 Antdv 与页面

- Admin/两个 Portal 的 ConfigProvider 使用同一生成 Adapter；
- Admin Comfortable/Compact 的控件高度、表格密度和焦点可用；
- Portal Control 不低于 44px，360px 认证入口无横向强制 1080px；
- `/iam/users` 在 Light/Dark/System 下保持筛选、选择、查看详情和危险动作入口；
- 颜色不是 Status/Risk 的唯一表达；
- `prefers-reduced-motion`、键盘焦点和 200% 文本缩放通过。

### 8.4 回归

- 六个 IAM URL、三应用 Client/`user_type`、Gateway-only、Token 存储和 403 单飞契约不变；
- 不出现新增 Product 页面或菜单；
- `bundle:check` 不回归，公开 Source Map 仍为 0；
- `bundle:target` 仍按真实结果报告，不要求 S01 关闭 S02/S05 的既有缺口。

## 9. 验证命令

S01 实施后必须在正式支持的 Node 24 环境执行：

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

另执行严格目标审计并如实记录既有红灯：

```bash
pnpm bundle:target
```

针对生成确定性，至少执行一次“生成 → 检查 → 再生成 → 工作树零漂移”。不得通过更新基线、删除测试、放宽对比度或扩大 Stylelint 排除获得通过。

## 10. 回滚方案

1. Theme Provider 保留 `legacy` 构建入口：Admin 可回到现有 Vben Antdv Adapter，Portal 可回到现有 Antdv Default；该入口只用于 S01 回滚，S04/S05 按登记条件删除；
2. 生成 CSS 提供现有 MOM Variable 的兼容别名，避免一次迁移所有历史页面；别名有明确消费者和删除 Slice；
3. IAM 示范页样式可独立回退，不影响 Token Source、认证和其他 IAM 页面；
4. 任一应用构建、认证入口或关键 Theme E2E 失败时，不删除旧入口，不推进 S02；
5. 若生成链不可确定，回退代码但保留 ADR-016，不允许恢复为四份手工权威值。

## 11. Unknown / Decision / Confirmation

### Need Chris Approval

- 批准第 1 节四项范围澄清；
- 批准 S01 修改文件边界和 `legacy` 回滚入口；
- 批准暗色 Success/Warning/Danger 初始值。

### Unknown

- System Preference 最终 DTO、版本/ETag 和缓存键尚未进入 S01；这是 S03 的已知前置，不阻塞 Token/Theme 内核；
- 企业网络下 3 秒 P75 方法尚未批准，不作为 S01 本地验收结论。

### Need Product Decision

无。S01 不创建新页面、工作台或渠道能力。

### Need Backend Confirmation

无。S01 不调用新后端接口，也不修改 IAM/System 契约。

## 12. S01/S02 前置条件

本报告批准后方可实施 S01。S01 完成并通过独立 Review 前：

- 不得把 S00 Token 哈希门禁标记为最终方案；
- 不得开始 S02 UI/Shell；
- 不得把 Admin 的 Vben 偏好缓存描述为 System Preference；
- 不得以 Portal Theme Provider 为由建设 Delivery/Order 等 Future 页面；
- 不得删除 Vben、全量 Antdv 注册或现有认证入口。

Chris 批准本报告只意味着“按此边界实施 S01”，不意味着 S01 已完成，也不自动授权 S02。
