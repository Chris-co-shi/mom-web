# MOM Web Foundation V1 审计与验收报告

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

