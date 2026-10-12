# MOM Web Foundation V1 设计说明

## 目标与成功标准

本阶段在 MDM 前端开发前收口现有 MOM PC Web 基础能力，不新增制造业业务页面。成功标准是：ADR-003 的技术栈与代码、现行文档一致；MOM Token、基础控件、管理页组合组件和 Application Shell 的边界可直接复用；行为改动有自动化证据；未执行的真实浏览器与后端联调场景被明确登记。

## 当前事实

- 技术栈已是 Vue 3.5、TypeScript 6、Vite 8、Pinia、Vue Router、Reka UI、shadcn-vue、Tailwind CSS 4、TanStack Table v9。
- Primitive / Semantic / Component Token、亮色/暗色/系统主题、唯一 HTTP Client、认证快照、权限守卫、动态 Namespace i18n 已存在。
- `MomManagementHeader`、`MomListSurface`、`MomDataTable`、`MomCrudSearch`、`MomCrudPagination`、`MomCrudRowMenu`、`MomModal`、`MomUnavailableState` 已被 IAM/System 页面真实使用。
- 工作区已有 5 个用户修改，属于 i18n 管理页和相关样式/测试，本次必须保留。
- 基线 `pnpm verify` 已通过：12 个测试文件、56 项测试、生产构建成功。

## 方案选择

采用增量治理：保留现有正确能力，只修复审计证实的缺口并同步文档。这比全量重写风险低，也比只改文档更能解决键盘可访问性和历史迁移残留。

未采用：

- 全量重做 Design System 或组件库：违反 ADR-003 和最小修改原则。
- 新建万能 CRUD/表单/反馈框架：当前没有稳定业务语义支撑。
- 引入 Playwright、VeeValidate 或新的通知库：当前收益不足以覆盖依赖和维护成本。

## 设计边界

### Design System

现有蓝青品牌方向、字体、4px 间距网格、圆角、密度和三态主题保持不变。删除只服务于已退出组件库的 `--td-*` 映射；浮层、焦点、禁用与加载状态继续只消费 MOM Semantic/Component Token，不创建第二套色板。

### 基础组件

基础组件继续分为 `shared/ui` 的底层 shadcn-vue/Reka UI 封装与 `shared/components` 的 MOM 组合组件。按钮、输入、数字输入、文本域、选择、复选框、弹窗、下拉和加载保持现有 Props/事件契约。数据表格列宽分隔器补齐键盘操作、可访问名称和值语义；业务页面无需感知 TanStack API。

### 页面组合

管理页继续由页面负责 API、权限、字段、失败策略和状态动作；共享组件只负责结构与交互不变量。当前普通列表、主从布局、详情、创建/编辑、确认弹窗已经有真实 IAM/System 场景，不新增业务无关抽象。

### 全局能力

应用初始化、路由菜单、认证/权限、Pinia、HTTP 取消与错误分类、i18n Namespace、主题切换以验证为主，不重写。后端不可用时不以 Mock 冒充联调。

## 验证策略

- 行为变更：为 `MomDataTable` 键盘列宽调整先写失败测试，再实现最小代码。
- 视觉变更：检查亮/暗/系统主题与公共路由；尝试 1024/1280/1440/1920 视口，能力不足或后端阻断时登记未验证。
- 静态门禁：`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`、`git diff --check` 与旧依赖扫描。
- 不把 jsdom 组件测试描述为真实浏览器或屏幕阅读器证据。

## 明确不做

- 不新增 MDM、WMS、MES、QMS 页面或菜单。
- 不修改后端与 API 契约。
- 不新增生产依赖，不恢复 TDesign/VXE，不引入第二套主题。
- 不实施服务端搜索、批量编辑、列配置持久化、通用状态机或通知中心。
- 不执行 Worktree、Commit、Push、Merge 或 PR。

