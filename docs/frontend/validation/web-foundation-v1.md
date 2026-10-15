# MOM Web Foundation V1 审计与验收报告

> 当前状态（2026-10-13）：下文 2026-10-12 的准入结论属于历史 Foundation 范围，不代表新增 B2 全站治理已验收。最新续作证据见 5.6；前面的故障与测试数量保留为对应代码状态的历史记录。

- 日期：2026-10-12
- 范围：MOM PC Web 全局设计系统、共享 UI、管理页组合组件、Application Shell 与质量门禁
- 技术基线：ADR-003
- 业务边界：不新增 MDM、WMS、MES、QMS 页面，不修改后端或 API 契约

## 1. Phase 0 本地代码审计

### 1.1 能力矩阵

| 能力 | 审计状态 | 本地证据 | Foundation V1 处理 |
|---|---|---|---|
| Primitive / Semantic / Component Token | 已实现且主体符合规范 | `src/styles/primitives.css`、`semantic.css`、`components.css` | 清理已退出 UI 栈的 `--td-*` 迁移残留 |
| 亮色、暗色、跟随系统 | 已实现且符合规范 | `theme.ts`、首屏脚本、主题测试 | 保持唯一主题入口，不创建第二套主题 |
| 字体、字号、间距、圆角、阴影、密度 | 已实现且符合规范 | MOM Token 与共享组件 CSS | 核对文档和值的一致性 |
| Hover / Focus / Disabled / Loading | 已实现但需补证据 | `ui.css`、`base.css`、`MomLoading`、`MomModal` | 核对焦点和浮层层级；浏览器检查可达页面 |
| Button / Input / Textarea / Select / Checkbox | 已实现且被真实页面使用 | `src/shared/ui/Mom*.vue` | 保持 Props/事件，不新增重复封装 |
| NumberInput | 已实现且边界可接受 | `MomNumberInput.vue` 集中数字转换、范围属性与 MOM 样式 | 保持显式数字契约；不为底层标签形式做无行为收益重构 |
| Dialog / Modal | 已实现且符合规范 | `MomModal` 基于 Reka Dialog，保存中禁关和局部 Loading | 修正文档中“VXE Modal”历史表述，并消除缺失描述引用告警 |
| Dropdown Menu | 已实现且符合规范 | `MomCrudRowMenu` 基于共享 dropdown-menu | 保持键盘/Esc/焦点恢复由 Reka UI 承担 |
| Feedback / Notification | Inline Feedback 已实现；全局通知未实现 | 页面使用 `role=status` / `role=alert`，HTTP 错误映射统一 | 当前无稳定全局通知需求，不新增通知中心 |
| PageContainer / ManagementHeader / ListSurface | 已实现且被 IAM/System 复用 | `src/shared/components` 与页面引用 | 保持结构职责，不吸收业务规则 |
| MomDataTable | 已实现但列宽键盘行为缺失 | TanStack Table v9；分隔器只有鼠标/触摸事件 | 补键盘调整、ARIA value 与定向测试 |
| CrudSearch / Pagination / RowMenu | 已实现且被真实页面复用 | IAM 普通列表页 | 保持当前页筛选、服务端分页和行菜单语义 |
| 普通列表、主从、详情、创建/编辑、确认 | 已由现有页面覆盖 | IAM 用户/角色/权限、System 字典/Locale/i18n | 不新增业务页面或万能页面 Schema |
| Application 初始化 | 已实现且有明确顺序 | `create-app.ts` | 验证主题、认证、HTTP 上下文、Locale、Router 装配 |
| Router 与菜单 | 已实现且共用 Route Registry | `route-registry.ts`、路由测试 | 保持 Web 源码所有权与权限过滤边界 |
| 登录态、用户信息、权限可见性 | 已实现 | auth session、guard、AuthorityGuard、相关测试 | 只验证，不重写；后端仍是最终授权边界 |
| Pinia 状态边界 | 已实现 | auth / locale 使用 Pinia，页面列表状态留在模块 | 保持现有边界 |
| HTTP Client、取消和错误语义 | 已实现且有测试 | `http-client.ts`、`use-management-list.ts` | 验证 401/403/404/409、超时、未知写结果语义 |
| i18n Namespace | 已实现且有运行时失效重载测试 | `locale.ts`、`locale.test.ts` | 保留当前用户对占位符文案的未提交修复 |
| 1024px 及以上 PC 适配 | CSS 已实现，浏览器矩阵待本轮核验 | `min-width: 1024px`、局部横向滚动、断点样式 | 可达页面实测；受认证/后端阻断项如实登记 |
| Playwright / 视觉回归平台 | 尚未实现且当前非必须 | `package.json` 无相关依赖 | 不新增大型测试平台 |
| MDM/WMS/MES/QMS 页面 | 不属于当前阶段 | 当前路由无这些模块 | 明确不创建 |

### 1.2 旧组件迁移与重复实现

- 生产依赖中已无 TDesign、VXE；ESLint 禁止业务层重新导入旧依赖和底层 Reka/TanStack 原语。
- 审计时 `src/styles/components.css` 仍有 `--td-*` 变量，属于迁移完成后的无调用残留；本轮已删除。
- 审计时 `design-system.md`、`frontend-architecture.md` 仍把 `MomModal` / `MomListSurface` 描述为 VXE 封装，与 ADR-003 和代码冲突；本轮已修正文档现状，历史 ADR 和历史验证报告保留，不改写其当时事实。
- IAM 三类管理页仍有模块私有表单、反馈和状态样式，但它们承载字段、权限和状态差异；本轮不为减少类名数量建立万能 CRUD。
- Theme 与 Locale 切换器存在相似分段控件样式，但当前只有两个稳定调用方，抽象收益不足，保持显式实现。

### 1.3 用户现有修改保护

审计开始时已有以下未提交修改，本任务不覆盖其业务意图：

- `src/locales/zh-CN.ts`
- `src/modules/i18n/pages/I18nManagementPage.vue`
- `src/modules/system/pages/system-pages.css`
- `src/shared/components/mom-crud-controls.css`
- `src/shared/i18n/locale.test.ts`

其中 `mom-crud-controls.css` 的焦点环调整属于本次 Design System 验收输入；最终差异仍按用户原修改保留。

## 2. Phase 1–4 实施结论

当前完成：

- 删除无调用的 `--td-*` Token，并把焦点环、禁用透明度、浮层遮罩与层级收敛到 MOM Token；品牌色、密度和主题结构未改变。
- `MomDataTable` 列宽分隔器新增键盘焦点、列标题可访问名称、当前/最小/最大宽度语义；ArrowLeft/ArrowRight 以 8px 步长调整并遵守边界，鼠标和触摸行为保持不变。
- `MomModal` 保留 `DialogTitle` 作为可访问名称；通用组件无法推断业务描述时显式取消无效的 `aria-describedby` 引用，避免 Reka UI 控制台告警。弹窗正文仍由调用方提供字段标签、提示与错误语义。
- 现行设计与架构文档改为 Reka UI / shadcn-vue / TanStack Table 的真实事实；历史 ADR 和验证记录不改写。
- `MomNumberInput` 保持现状。其公开契约已经集中，底层原生 number input 不在业务页面扩散；仅改成另一层原生 input 包装没有可观察收益。
- 修复 Vitest 与 Vite 配置漂移：测试配置补回 `@` 路径别名并删除已退出生产栈的 TDesign 内联依赖，确保组件测试解析路径与生产构建一致。

公共组件边界：

| 组件 | 责任 | 不负责 |
|---|---|---|
| `MomButton` | variant、size、loading/disabled、按钮语义 | 业务权限与提交规则 |
| `MomInput` / `MomNumberInput` / `MomTextarea` | 值事件、禁用/只读/长度或数值范围、MOM 外观 | 业务字段校验文案 |
| `MomSelect` / `MomCheckbox` | Reka 键盘语义、值事件、主题外观 | 业务选项来源与授权 |
| `MomLoading` | 局部状态提示与 live region | 请求并发和取消 |
| `MomModal` | Dialog 标题关联、焦点圈定/回归、Esc、遮罩、保存中禁关/Loading | 表单字段、业务描述、写请求、确认语义 |
| `MomDataTable` | TanStack 列宽、固定操作列、密度、空态插槽 | 服务端分页、排序契约、业务动作 |
| `MomCrud*` | 当前页搜索、分页控件、行菜单 | API、过滤字段、状态机 |
| `MomManagementHeader` / `MomListSurface` | 管理页标题、工具区、列表表面和局部 Loading | IAM/System/MDM 规则 |

Feedback 继续使用页面内 `role=status` / `role=alert` 与统一错误映射。当前没有跨路由消息队列、堆叠、超时和撤销等稳定需求，因此不新增全局 Notification/Toast 中心。

## 3. Phase 5 质量验证

### 3.1 编码前基线

`pnpm verify`：PASS。12 个测试文件、56 项测试通过；Lint、TypeScript 与生产构建通过。

### 3.2 实施后验证

自动化与静态验证：

| 命令 | 结果 | 证据范围 |
|---|---|---|
| `pnpm exec vitest run src/shared/components/MomDataTable.test.ts` | PASS，1 文件 2 项 | 列宽分隔器焦点、ARIA、方向键步长、最小宽度 |
| `pnpm exec vitest run src/shared/components/MomModal.test.ts` | PASS，1 文件 1 项 | 无业务描述时不生成失效 `aria-describedby`，无 Reka 缺失描述告警 |
| `pnpm lint && pnpm typecheck && pnpm test` | PASS，14 文件 59 项 | 代码规范、类型与全量单元/组件回归 |
| `pnpm verify` | PASS，14 文件 59 项，生产构建成功 | 最终 Lint、TypeScript、测试和构建门禁 |
| `git diff --check` | PASS | 本次与用户既有差异均无空白错误 |
| `rg -n "tdesign|vxe" src package.json pnpm-lock.yaml vite.config.ts vitest.config.ts` | 无匹配 | 当前生产源码、依赖和构建/测试配置无旧 UI 栈引用 |

TDD 过程保留了有效失败证据：`MomDataTable` 首次定向测试在补齐测试别名后因分隔器缺少键盘/ARIA 行为失败；`MomModal` 测试首次因仍存在自动生成的描述引用失败。两项均只在实现最小行为后转绿。首次表格测试还暴露 `vitest.config.ts` 缺少 `@` 别名，这属于测试基础设施故障，不冒充业务行为 RED。

真实浏览器检查通过本地 `pnpm dev --host 127.0.0.1` 执行，未新增 Playwright 依赖：

| 场景 | 结果 |
|---|---|
| 亮色、暗色、跟随系统 | Foundation 概览和 IAM 用户管理可切换；暗色计算色与文本对比可辨，结束时恢复跟随系统 |
| 中文、英文 | 登录/Foundation/IAM 可切换，`html[lang]` 与界面同步 |
| 1024 / 1280 / 1440 / 1920px | Foundation 页面均无页面级横向溢出；1024px IAM 页宽表只在列表表面局部滚动 |
| Loading / Disabled / Empty | IAM 列表加载态可见；分页首尾按钮禁用；当前页搜索无匹配时展示空态 |
| 表格键盘列宽 | Username 列从 210px 经 ArrowRight 调整到 218px，页面未滚动 |
| 弹窗与焦点 | 详情弹窗打开后焦点进入关闭按钮；Esc 关闭并把焦点还给触发按钮；修复后新增 warn/error 为 0 |
| 路由异常 | `/forbidden` 显示 403，未知路径显示 404，标题与返回入口正确，1024px 无溢出 |
| 控制台 | 修复 `DialogContent` 描述告警后，本轮复验没有新增 warn/error |

未验证或不虚构通过：

- 真实屏幕阅读器朗读顺序、Windows 高对比模式和操作系统级缩放未执行人工验收。
- 当前 IAM 数据只有一页，真实“下一页”请求未触发；分页禁用边界与既有自动化测试通过。
- 为避免修改本地真实业务数据，本轮没有从浏览器提交创建、编辑、启停、删除、重复提交或 409 写冲突；这些能力沿用各业务 Slice 既有测试/验收记录，不把本轮只读检查描述为重复联调通过。
- 未主动中断 Gateway/Auth/System 服务，因此断网、请求结果未知、401 会话失效和后端恢复没有在本轮浏览器会话重新制造；HTTP Client、路由守卫和管理列表的既有自动化测试仍通过。
- 未引入 Playwright、视觉快照平台或真实屏幕阅读器测试依赖。

## 4. Phase 6 准入结论

**结论：Foundation V1 已达到开始 MDM 前端 Slice 设计与开发的条件。**

准入依据：唯一 Design System/主题入口已收口，基础控件和管理页组合组件已有 IAM/System 真实调用方，键盘列宽与弹窗告警缺口已修复，Application Shell、Router、认证权限、HTTP、i18n 和主题边界有代码/自动化证据，最终质量门禁与四档 PC 视口检查通过。

该结论不等于 MDM 业务设计已完成，也不替代 MDM 开始前对数据所有权、API、权限、状态、失败模型和真实联调环境的 Slice 级确认。上节未验证项属于后续专项验收或真实写场景证据，不需要在 Foundation 阶段扩建通用框架。

## 5. B2 自适应治理增量验收（2026-10-13）

### 5.1 已实现

- 移除全局 1024px 最小宽度；Shell 完整侧栏/图标栏/导航抽屉分别适应空间，自动适配不写入手动折叠偏好。顶栏语言与主题可收为菜单。
- 复用现有 Token 与 Mom*，控件/面板/弹窗圆角映射为 12/20/24px；表格自身滚动，查询与分页换行，Modal 动态视口约束、独立 footer、可选侧边展示。
- 圆润 M SVG 用于 Shell、登录、异常页，提供独立图标、横版、单色及 favicon；登录删除工程编号和无检测依据的状态宣传。
- 权限分配资源目录单页查询，不循环扫描；全局草稿跨资源/页保存，固定总数与变更摘要，窄屏目录/权限单栏切换，关闭脏草稿需确认；沿用整体替换 API、限制与并发/结果未知核对。
- 字典/文案目录简化选中样式，自适应单栏切换保留当前选择；文案使用已有说明，缺少说明显示标识标签与真实 Key，不逐行拉取译文。
- MDM 增补上下文、分类逐层进入/返回、详情字段、按需引用分页、部分选中引用详情补齐、UOM 可访问 Tab、规则历史；Decimal String 的极小偏移量不再经 Number 转换丢失。
- 修复 MomSelect 字段 aria/id 属性未传到实际触发器；修复行菜单打开弹窗后焦点丢失。物料辅助 UOM 403 不再阻断合法状态操作；物料/分类引用错误不再掩盖列表错误。

### 5.2 自动化证据

- 最终 `pnpm verify` 退出成功：lint、typecheck、31 个测试文件 / 116 项测试、生产 build 全部通过。完整日志：`/tmp/mom-b2-final-verify.log`。
- 新回归先失败后通过：Select 可访问属性、Decimal String、窄窗口 Shell、资源分页/草稿、物料辅助引用失败隔离、列表错误可见性、行菜单→弹窗→关闭焦点恢复。
- 权限测试覆盖跨资源与目录分页草稿、一次提交完整集合、重开恢复服务端关系、并发关系改变拒绝提交、结果未知禁止重复提交。不是后端关系版本 CAS 证据。
- 后端工程静态门禁 `bash .github/scripts/validate-engineering-baseline.sh` 成功；日志 `/tmp/mom-b2-backend-baseline.log`。不等同于 SQL/Flyway 或真实数据库验证。
- `bash scripts/codex-doctor.sh` 检出本机 Maven 3.9.0 低于 3.9.9 基线；未绕过、安装或更换工具。三个新文案迁移未应用到运行数据库，未声称后端构建/迁移验收通过。

### 5.3 实际浏览器证据

使用本地已登录 ADMIN-01 会话，无真实权限提交、无业务数据写入：

- 角色页 390/768/1024/1280/1440/1920/2560px，逐档核实实际 innerWidth；文档 scrollWidth 均等于视口宽度。该证据仅限此页，非全站全部尺寸验收。
- 权限弹窗真实加载 12 个资源及 24 个已有权限；取消一项后切换资源仍为 23 项、移除 1 项；390×700 下目录/动作切换正常，弹窗宽374、高684，footer 在可视范围；放弃草稿没有保存。
- 行菜单打开权限弹窗→Esc：修复前焦点落 BODY，修复后回到“更多操作”。嵌套放弃确认后的焦点尚未再次完整验证。
- 字典真实数据目录→“星期（演示）”详情→返回→宽布局，选择保留；390px 主体无横向溢出。
- 已实际切换暗色、跟随系统、亮色以及英文/中文；英文 Runtime 加载后界面更新。最后恢复中文/亮色并取消视口覆盖。
- 国际化页面已显示真实 Key 及选中项实际译文；未应用新迁移时中文标签仍有旧文案，不能算文案验收通过。
- 物料页真实出现列表 not_found 与引用失败，新增被禁用；已观察到的控制台 error 日志为空，不代表网络请求成功或所有页面无错误。

### 5.4 未完成、阻塞与下一步

1. 文案迁移 Auth V12、System V16、MDM V112 未运行。权限目录的新 Key、返回按钮及登录文案需部署后验收；禁止用前端硬编码绕过 Runtime 所有权。需合规 Maven 环境并运行迁移/数据库测试。
2. MDM 公共 Runtime 只读探测 `/mdm/i18n/runtime/bundles?locale=zh-CN&namespaces=mdm.web` 返回401。Gateway `application.yml:106` 为 `PrefixPath=/api`；MDM `application.yml:62` Runtime base-path 为 `/i18n/runtime`，base/local public-path 又不同。记录为路径/安全配置不一致线索，尚未验证每一运行实例的有效配置；本轮后端授权仅文案迁移，未修改这些配置。
3. 已登录物料列表仍得到 not_found 映射，引用目录失败；真实列表成功、引用回显、创建/编辑/启停无法完成联调验收。需核对运行服务版本、Gateway→Controller 实际映射及响应；列表404仍沿用旧“记录不存在”文案，需后续按列表/详情上下文细分。
4. 前端剩余项：UOM/结构页所有分页外选中引用的名称补齐、所有表单的首次错误定位与完整关联、主从单栏切换的键盘焦点管理、编码复制能力，尚未全量完成，不归因于后端阻塞。
5. 未完整执行：全页全主题/中英文/全部断点两侧矩阵、连续拖窗、小高度、200%缩放、减少动效偏好、真实屏幕阅读器、登录页最终文案及新品牌全面验收；没有用构建或局部截图替代这些检查。
6. 无真实权限保存、禁用权限/200项边界的浏览器验证；测试覆盖不能替代服务端并发 CAS。集中独立审查因额度中断，仅已收到的明确物料403回归得到修复；不声称全量审查完成。

### 5.5 Implementation Review / Design Pressure Test

调用链仍为页面 → 现有 API 封装 → 统一 HTTP Client → Gateway → 原服务。权限草稿只在前端内存，确认后调用既有整体替换；事务与数据写入仍由后端原 Application 决定，本轮未改变。文案 SQL 只写所属服务既有 i18n 表，且尚未运行。

重点 Review：`use-role-permission-assignment.ts` 完整集合及结果未知分支、`MomCrudRowMenu.vue` 焦点时序、`MaterialManagementPage.vue` 引用失败隔离、三个新迁移、Shell 自动/手动收敛边界。

- A（V1 必须）：解决实际 MDM 读取失败、应用并验证文案迁移、完成上列可访问性/引用缺口与验收后，才能宣称 B2 收口。
- B（现阶段记录）：关系重读后到提交之间仍有竞争窗口，前端重读不是 CAS；不在本轮擅自改变关系 API。大数据量目录继续服务端分页，不伪造全量目录。
- C（本轮过度设计）：万能 CRUD、通用树平台、额外前端状态框架或新增部署平台均不引入。

**当前结论：B2 尚未完全收口。既有 MDM 页面可以继续修复，但本报告不能作为“全站体验与 MDM 真实联调均已通过”的准入证明。**

### 5.6 接口恢复后的续作

用户告知接口链路修复后，本轮未改后端任何文件，保留用户的 Controller 修改与前端测试删除。

**代码增量：**

- `UomManagementPage.vue`：仅为当前详情的量纲、单位分类和基准单位补齐名称/编码；使用已有详情 API、不扫描分页，失败保留 ID，过期请求不覆盖当前详情；必填名称/编码添加错误关联。规则发布表单补充 Decimal/精度错误关联与可聚焦摘要，只读错误提示保留。
- `StructureManagementPage.vue`：补齐 URL 当前父级不在引用首批分页时的名称；详情辅助引用失败不阻断已经成功读取的目标及状态操作。
- `MaterialCategoryPage.vue`：已选父分类即使停用仍正确回显，不扩大可选父级规则。
- `MaterialManagementPage.vue`：创建表单计量单位空选项改为“选择关联主数据”，不再用筛选场景的“全部”；必填引用提供 aria-invalid 和错误说明关联。
- 上述四个 MDM 页面接入提交后的首个错误字段/摘要定位。
- `DictionaryPage.vue`、`I18nManagementPage.vue`：窄屏目录进入详情时聚焦返回按钮，返回时聚焦当前选中目录行；宽屏隐藏返回按钮不会夺取焦点。
- `AuthEntryPage.vue`：防止重复调用登录；字段 aria-invalid、错误播报与首次错误定位。
- 新增 `src/shared/ui/focus.ts` 和 `focus.test.ts`：只处理渲染后可见焦点，不承载字段规则/API/状态机；两个共享交互测试通过。未新增页面测试文件。
- 本轮新增文件仅上述焦点工具和测试；本轮没有删除文件。仓库中已存在的 MDM 测试删除未恢复、未扩大。

**新验证：**

- `pnpm verify` 成功：lint/typecheck、27 个测试文件 / 99 项测试、build。日志 `/tmp/mom-b2-continuation.log`。数量不同于先前116项，原因包括用户已有测试删除及本轮新增共享测试，不能把两个代码状态混称为同一套测试。
- `git diff --check` 无错误。
- 用户在新浏览器会话登录后，物料页正常空列表、引用错误消失、新增可用；此前物料列表失败已不能继续视为当前阻塞。尚无物料记录可验证详情和分页外引用回显，没有为验收创建数据。
- 登录空表单实际聚焦 `login-username`，用户名/密码均有 aria-invalid；未尝试使用对话中的凭据。
- 物料空表单实际聚焦 `mdm-material-code`；没有发送有效业务写请求。
- 模态框状态下拉实际 elementFromPoint 命中弹出列表，popup z-index=2200、modal=2100，未被遮挡；Esc 退出。
- System 导航被浏览器客户端阻止，未绕过；新增主从焦点代码未完成真实浏览器验证。其他视口矩阵沿用前一轮有限证据，不冒称本轮重新验证。

**仍需收口：** 所有复杂表单逐字段关联与错误链接、编码便捷复制，以及完整自适应/主题/语言矩阵。登录仍显示旧 Runtime 产品文案，文案迁移实际部署状态未验证；这与 MDM 业务接口恢复是两件事。后端公共 Runtime/写入/并发验收没有在本轮重跑。UOM 规则表单新增定位逻辑尚缺真实数据验证。B2 暂不宣布全量完成。

### 5.7 B2 视觉代码交付（2026-10-14）

按用户要求，本轮只完成视觉代码整理，不打开或操控浏览器；以下为实现及静态质量证据，不代表视觉验收通过。

**修改文件与实现：**

- `src/layouts/layouts.css`：侧栏选中态取消竖线；登录品牌区流式间距、收敛标题字号，修正窄屏覆盖顺序。
- `src/modules/auth/pages/auth-entry.css`：登录控件统一 control 圆角、减轻阴影，消除窄屏间距被旧断点覆盖。
- `src/modules/foundation/pages/foundation-overview.css`：概览页取消过大标题和硬性列宽，容器断点顺序明确，窄空间单列。
- `src/modules/iam/pages/permission-management.css`：目录浅青选中态、弱边框，名称和编码可换行，采用容器宽度切换布局。
- `src/modules/iam/components/role-permission-dialog.css`：资源长文案换行、选中态悬停保持、权限选中背景及键盘焦点区分。
- `src/modules/system/pages/system-pages.css`：目录和详情统一面板圆角，筛选区柔和面板，长文案及工具栏可换行。
- `src/modules/mdm/pages/mdm-pages.css`：查询面板、分段 Tab、局部错误反馈、详情与表单网格统一，窄空间释放历史区嵌套滚动。
- `src/shared/components/mom-management.css`：合并面板重复规则，避免覆盖 embedded 无边框/无阴影外观；工具栏标记弱化。
- `src/shared/components/mom-modal.css`：弹窗长标题换行、字重与行高统一。
- 文档更新本报告及既有 B2 执行计划。此次视觉增量无新增或删除文件；保留此前代码及用户删除的测试。

沿用现有 Mom*、主题语义 Token 和青色品牌，没有增加组件库、生产依赖、业务对象或第二套主题。调用链和后端事务不变；此次 CSS 不写业务数据。

**质量证据：** `pnpm verify` 退出码0，lint、typecheck、27个测试文件/99项测试、build通过，日志 `/tmp/mom-b2-visual-verify.log`；`git diff --check`通过。纯样式调整未新增页面测试。实际使用 ui-ux-pro-max 的自适应/溢出审查，按 executing-plans 接续已批准方案，并依 verification-before-completion 核实命令结果。

**交给用户的手动验收：** 优先检查登录页、IAM权限弹窗、System目录/详情、MDM筛选与表单；连续缩放窗口并切换主题/语言，观察长文案、选中与悬停、表格内部滚动和弹窗操作栏。此次没有运行浏览器矩阵，不将构建通过描述为界面验收通过。

**Implementation Review / Design Pressure Test：** 重点Review目录选中/悬停区分、共享面板embedded覆盖顺序、窄屏登录及MDM表单。A：实际窄屏/长文案/暗色视觉仍须人工验收；B：Runtime旧文案的部署状态仍待确认，不用CSS或硬编码掩盖；C：不为此次视觉收口新增通用布局框架。视觉代码已可交付手动测试，完整B2功能与联调仍按5.6剩余项管理。

### 5.8 用户验收退回：权限目录文字重叠（2026-10-14）

用户截图确认权限分配弹窗左侧资源名称、编码、已选数量重叠，5.7不能视为视觉交付合格。此前质量命令不覆盖浏览器布局，完成措辞过早。

- 代码定位：`role-permission-dialog.css` 的目录使用限高Grid，隐式auto行未保证多行按钮的内容高度。改为 `grid-auto-rows: max-content`，让目录滚动而非压缩资源行；资源按钮明确单列、自然高度、1.5行高及名称字重，保留长文本换行和焦点空间。
- 此次只修改上述CSS及本报告，无新增/删除文件，不改共享按钮默认尺寸、权限API或草稿保存行为。
- `pnpm lint`、`pnpm typecheck`、`pnpm build`退出码0；构建日志 `/tmp/mom-grants-layout-build.log`；`git diff --check`通过。
- 按用户此前要求未启动浏览器，未完成修复后的布局复现检查。截图已证明原问题，代码修正不等于实测解决；资源多项/长名称/窄窗/暗色的实际效果仍待验收。此问题在人工复验前保持为A级未验收项。

### 5.9 权限弹窗按已确认效果图重做（2026-10-14）

用户确认新的B2效果图后，将此前双侧独立滚动方案替换为短分页目录和单一正文滚动；效果图中的48项、资源图标映射、通知、背景菜单均不是后端事实或新增需求。

**本轮文件：**

- `src/modules/iam/components/RolePermissionDialog.vue`：两行资源目录（名称/编码、已选数、变更标记）；搜索和域筛选；当前资源标题及权限卡片；跨资源搜索独立模式；固定底部摘要及核对入口；窄屏进入/返回的焦点定位。
- `src/modules/iam/components/role-permission-dialog.css`：B2分栏面板、轻量选中态、卡片与分页布局；移除目录和权限区的限高及独立滚动，仅保留MomModal正文滚动；按容器空间切换目录/详情。
- `src/modules/iam/model/use-role-permission-assignment.ts`：目录默认8项，支持8/16/24项；容量变化回首页；当前资源快照独立于目录分页；选择资源时清除跨资源搜索条件及待执行防抖请求。
- `src/modules/iam/model/use-role-permission-assignment.test.ts`：在已有测试中增加页容量/分页计数/草稿保持、资源上下文保留及搜索条件切换回归。
- 本报告。此次无新增/删除文件，未动共享组件默认契约、数据库和后端代码，保留仓库中已有测试删除。

**复用边界：** 复用MomModal/MomButton/MomInput/MomSelect/MomCheckbox/MomLoading、现有Lucide图标及Runtime文案。此处是既有权限选择器，不是普通CRUD列表：保留局部目录及精简分页，因为MomCrudPagination固定10/20/50选项并带跳页表单，不为这一个弹窗扩大共享契约；不另造基础控件。暂用既有“所属域”文案，不在前端硬编码效果图中的新句子。

**行为与调用链：** 资源搜索/翻页 → 原searchResources接口；资源选择/跨资源搜索 → 原searchPermissions接口；selectedIds仍独立保留全部草稿 → 核对变更 → 既有整体替换API。此次没有提交真实权限写入；数据和事务仍归后端。现有200项限制、禁用权限处理、放弃草稿确认、并发重读和结果未知分支未改写。

**验证证据：** 两项新增回归先失败（旧目录请求20项、资源切换残留关键词），实现后7项权限状态测试通过。全量命令与浏览器边界见本节末尾；测试不覆盖实际CSS排版。

**Review重点：** 短目录页容量及总页数、翻页后右侧资源标题、搜索切换不丢完整草稿、唯一正文滚动及底部操作栏、窄屏返回焦点。A：亮暗主题、长名称、中英文、大小窗口及弹窗操作位置仍须用户实测；B：关系重读不是CAS，保持现有后端限制；C：不引入完整资源树、全量域枚举或万能权限编辑器。暂不把代码原型视为视觉验收完成。

最终 `pnpm verify` 退出码0：lint/typecheck、22个测试文件/73项测试、build通过；`git diff --check`通过。日志 `/tmp/mom-grants-b2-verify.log`。当前测试集合与5.7不同，工作区存在既有测试删除，此次未删除测试或修改测试配置，不能沿用99项结果。按用户要求本轮未打开浏览器。技能沿用已确认的brainstorming/ui-ux-pro-max设计，行为修改按test-driven-development先红后绿，完成声明按verification-before-completion限定证据。

### 5.10 国际化目录状态与跨工具规范（2026-10-14）

- 修改 `src/modules/system/pages/system-pages.css`：国际化目录选中行采用品牌实色底与inverse文字（含编码、状态），明确覆盖通用按钮hover，避免移入/移出时与选中状态冲突。范围仅限i18n目录，不改业务请求。
- 新增 `docs/frontend/standards/b2-ui-contract.md`：工具无关的必读入口、组件映射、B2视觉定义、状态矩阵、自适应与滚动责任、页面范式、验收清单和任务开场模板。
- 更新 `AGENTS.md`、`docs/frontend/README.md`、`docs/frontend/design-system.md`及本报告；修正文档中历史Foundation收口等于当前B2通过的误导表述、业务译文所有权和此次选中态例外。无删除文件、无新依赖、无后端改动。
- Namespace移除尚未实施：Framework `I18nManagementController.messages(@RequestParam String namespace)` 要求精确命名空间，没有现成的全服务列表契约。已询问用户选择次级筛选入口或另行授权后端全服务查询；不固定初始namespace后伪称支持全部文案。
- 实际运行 `pnpm verify` 退出码0：lint/typecheck、20文件69测试、build通过；本次没有改/删测试，记录本轮实际数量，不沿用历史结果。日志 `/tmp/mom-ui-contract-verify.log`。AGENTS/README/新契约共3文件本地链接检查0处失效；`git diff --check`通过。
- 使用ui-ux-pro-max约束状态可读性、技术文档工程师组织跨工具入口；保持既有设计，不新增文档平台。未打开浏览器，主题/鼠标/键盘实测仍未验证。

Implementation Review：此次调用链、数据写入和事务不变，仅样式与文档。重点Review实色选中与hover优先级、暗色inverse文字、跨工具入口及Namespace约束说明。Design Pressure Test：A为Namespace方案待确认及浏览器视觉验收，B为后续规范与代码同步维护，C为本轮不需要的文档网站/通用命名空间平台。

### 5.11 按服务查询全部文案（2026-10-14）

用户已选择调整后端，此节解除5.10的Namespace方案待确认项，不代表浏览器验收完成。

**本轮修改文件：**

- mom-web：`src/modules/i18n/pages/I18nManagementPage.vue`、`src/shared/i18n/i18n-management-api.ts`、已有 `src/shared/api/http-client.test.ts`、`docs/frontend/standards/b2-ui-contract.md`、本报告。
- mom-platform：Framework的`I18nManagementController`、`I18nManagementService`、`I18nStore`；Auth/System/MDM各自`infrastructure/persistence/*I18nStore.java`；已有`I18nManagementServiceTest`、`SystemV1PostgresqlIT`；`docs/architecture/System-V1与I18n运行时设计.md`；三份`docs/api/snapshots/*-openapi.json`。
- 新增：后端`mom-framework/mom-webmvc/src/test/java/io/github/chrisshi/mom/webmvc/i18n/I18nManagementControllerTest.java`。无删除、新依赖或数据库迁移。保留此前及用户已有修改，不把整个工作区diff当成本轮产出。

**IMPLEMENTATION REVIEW**

- 主筛选区只保留归属服务；切换后读取该服务全部文案，不再固定初始namespace；清空旧筛选、选择和窄屏详情状态。列表仍为已加载集合本地搜索/分页，搜索包含namespace，目录显示namespace以区分同名Key。
- 新建弹窗明确填写namespace，默认服务初始值，前后端均校验归属；新建不展示上一个选中项的版本摘要。编辑/翻译仍以ID定位，不改稳定键。
- 复用MomSelect/Input/Button/Modal、MomCrudSearch、既有主从布局与请求取消；沿用实色选中状态，不新增主题和基础组件。
- 调用链为Owner API → 当前服务共享Controller → ManagementService → 本Schema Store/Mapper。省略namespace查询全部，显式namespace保留精确筛选；Service再次过滤所有权。只读事务，无数据写入、SSE或跨Schema访问；既有写权限、版本冲突和占位符规则保留。
- 最值得Review：Controller的可选参数；Service的null与非法值区分；三个Store条件查询；前端create归属与服务切换；B2跨工具入口。最大风险为全量数组规模及前后端部署版本不同步。

**实际验证**

- TDD：新增服务级查询回归先因“namespace不能为空”失败；HTTP绑定回归先返回400，修复后通过。Framework `mom-webmvc -am test` 通过。
- Auth/System/MDM `-am test-compile` 通过，日志后缀 `maven-20261014-144949-98996.log`。
- System PostgreSQL定向 `verify -Dit.test=SystemV1PostgresqlIT#serviceWideMessagesMustReadAllOwnedNamespaces`：1项真实集成测试通过，0跳过；覆盖跨namespace、同名Key、停用项、稳定顺序及精确查询。日志后缀 `maven-20261014-145047-99535.log`。
- 前端`pnpm verify`：lint/typecheck、20文件72测试、build通过，日志`/tmp/mom-i18n-service-verify.log`。新增HTTP测试最初因复用已消费Response失败，已修正测试fixture为每次生成响应；未放宽断言或修改HTTP错误行为。
- Maven使用本机IDE已有3.9.11，经`MAVEN_BIN`和`bash scripts/codex-mvn-test.sh`执行；完整日志在后端`.codex/runtime/logs/`。没有安装或更改全局工具。
- 三宿主最终 `-pl mom-auth-platform/mom-auth-server,mom-system-platform/mom-system-server,mom-mdm-platform/mom-mdm-server -am test` **未通过**：`MdmPaginationControllerTest`五项（`shouldBindTypedPageQueryFromPostBody`、`shouldMapConfiguredMaximumFailureToBadRequest`、`shouldRejectMissingPageNumberWithStableBadRequest`、`shouldRejectNullParamsWithStableBadRequest`、`shouldRejectRemovedGetPaginationEndpoint`）均因旧`/api/mdm/uoms`路径返回404；当前`UomMasterDataController`是本轮前已有修改，测试尚未同步。未改动这些文件或放宽断言。下一步在路由收口任务中核对最终内部路径后更新测试与快照。日志后缀`maven-20261014-145340-285.log`。不能宣称后端全量通过。
- 工程静态基线及两仓库`git diff --check`通过；既有规范例外保留。独立Review与静态通过不替代宿主真实鉴权验证。
- OpenAPI快照仅按声明更新namespace必填性，未重启服务导出；不声称运行中服务已生效。Auth/MDM真实数据库、真实登录鉴权、快速切换、主题/键盘/窄屏均未浏览器验收。按用户要求没有打开浏览器。

**DESIGN PRESSURE TEST**

- A：部署时需更新并重启三个服务才能接受省略namespace；真实页面和Auth/MDM联调尚需验收。
- B：数组响应兼容，但全量查询成本随文案增长，前端分页不减少数据库/网络开销；以后采用真正服务端分页，不静默截断。读取不是跨请求快照，既有写入仍按版本保护。
- C：不新增跨服务文案聚合、命名空间注册平台或通用查询框架。

Skills：using-superpowers、executing-plans、test-driven-development、systematic-debugging、ui-ux-pro-max、verification-before-completion；独立只读代码审查未发现新增重大问题，指出全量规模和验证边界。技能只约束执行，本仓库B2契约才是后续工具的规范入口。用户禁止的Git流程均未执行。

