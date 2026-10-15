# MOM 级联侧栏实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将应用左侧导航改造成模块一级菜单与页面二级菜单的级联结构，并保留可访问、可记忆的整栏折叠能力。

**Architecture:** 路由注册表继续作为菜单唯一来源；布局层只派生模块分组、当前模块和展开状态。折叠偏好封装为无业务依赖的小型状态模块，布局使用现有 MOM Token、Lucide 和 Vue Router，不新增组件库或业务规则。

**Tech Stack:** Vue 3、TypeScript、Vue Router、Vitest、Lucide、现有 MOM Design Token。

**Spec:** `docs/frontend/product-experience.md`

## Global Constraints

- 不新增生产依赖，不修改 MDM API、数据模型或业务页面逻辑。
- 保留现有未提交修改，不执行 Worktree、Commit、Push、Merge 或 PR。
- 侧栏满足 1024px 以上 PC、亮暗主题、中英文与键盘访问。
- 运行时国际化仍以服务端 Bundle 为权威，不复制前端静态业务词典。

## Review Focus

- 存储不可用或值非法时，侧栏应安全回到展开状态。
- 直接进入任意二级路由时，其所属模块必须自动展开。
- 整栏收起后仍须有可访问名称，并能从模块图标恢复对应菜单。
- 模块或页面被权限过滤为空时，不应生成空菜单结构。
- 中英文长文案不得挤压主内容或破坏 1024px 布局。

---

### Task 1: 侧栏偏好状态

**Files:**
- Create: `src/layouts/navigation-preference.ts`
- Create: `src/layouts/navigation-preference.test.ts`

**Interfaces:**
- Produces: `readNavigationCollapsed(): boolean`、`writeNavigationCollapsed(collapsed: boolean): void`

- [x] 先编写存储值、非法值与存储异常的失败测试。
- [x] 运行定向测试并确认失败原因是接口尚不存在。
- [x] 实现最小 localStorage 读写与安全降级。
- [x] 运行定向测试确认通过。

### Task 2: 模块级联导航与视觉治理

**Files:**
- Modify: `src/layouts/MainLayout.vue`
- Modify: `src/layouts/layouts.css`
- Create: `src/layouts/MainLayout.test.ts`

**Interfaces:**
- Consumes: Task 1 的折叠偏好接口；现有 `mainNavigation`、权限过滤和翻译入口。
- Produces: 单模块展开的一级菜单、对应二级页面菜单、底部整栏折叠入口。

- [x] 编写当前模块自动展开、模块切换、整栏折叠恢复和无障碍属性测试。
- [x] 运行测试，确认旧布局无法满足级联结构。
- [x] 实现模块按钮、二级菜单、路由同步、语义图标和偏好持久化。
- [x] 使用现有 Token 完成 240px/64px 布局、独立滚动、焦点、悬停与折叠提示。
- [x] 运行定向测试确认通过。

### Task 3: Runtime i18n 根因验证与文档收口

**Files:**
- Modify: `docs/frontend/product-experience.md`
- Modify: `docs/frontend/validation/web-foundation-v1.md`（仅在验证结果需要记录时）

**Interfaces:**
- Consumes: 现有 `mdm.web` 路由 namespace 与 MDM V109–V111 词条迁移。
- Produces: 不依赖前端硬编码的诊断结论和侧栏交互规范。

- [x] 核对本地 Runtime Bundle 或可用服务日志，确认原始 Key 出现在哪个边界。
- [x] 只修复有代码证据的问题；服务未运行则如实记录未联调。
- [x] 更新既有侧栏规范，不创建重复文档。
- [x] 运行 `pnpm verify`；浏览器因可用会话停留在登录页，主题、语言和目标视口验收标记为未验证。

