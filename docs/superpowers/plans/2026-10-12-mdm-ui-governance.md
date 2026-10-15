# MDM UI Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变 MDM 后端契约的前提下，完成 MDM 页面层级、操作、表单、UOM 和响应式体验治理。

**Architecture:** 保留现有页面与 API，用模块内专用组合和现有 MOM 共享组件改善信息架构。行为变化先通过 Vitest 建立回归证据，纯布局变化通过 lint/typecheck/build 与浏览器检查验证。

**Tech Stack:** Vue 3、TypeScript、Reka UI、MOM Design Token、Vitest

**Spec:** `docs/superpowers/specs/2026-10-12-mdm-ui-governance-design.md`

## Global Constraints

- 不创建 Worktree，不 Commit/Push/Merge/PR。
- 不修改 MDM API Controller、数据库模型或业务规则。
- 不新增生产依赖，不创建万能 CRUD/万能表单。
- Runtime i18n 仍由数据库 Bundle 提供。

## Review Focus

- 部分分页引用未加载时不得把范围描述成完整目录。
- Tab 键盘移动后焦点和选中态必须同步。
- 只读权限不得暴露写操作。
- 写入结果未知后不得允许直接重复提交。
- 1024px 与英文长文案不得挤压主要操作。

---

### Task 1: MDM 可访问分区和展示模型

**Files:**
- Create: `src/modules/mdm/components/MdmSectionTabs.vue`
- Create: `src/modules/mdm/components/MdmSectionTabs.test.ts`
- Create: `src/modules/mdm/model/mdm-display.ts`
- Create: `src/modules/mdm/model/mdm-display.test.ts`

**Interfaces:**
- Produces: 可访问 Tab 组件；舍入方式展示 Key；动作标题映射。

- [ ] 先写 Tab 键盘行为和展示映射失败测试。
- [ ] 运行定向测试确认 RED。
- [ ] 实现最小组件与展示模型。
- [ ] 运行定向测试确认 GREEN。

### Task 2: MDM 表格动作与详情治理

**Files:**
- Modify: `src/modules/mdm/pages/StructureManagementPage.vue`
- Modify: `src/modules/mdm/pages/MaterialCategoryPage.vue`
- Modify: `src/modules/mdm/pages/MaterialManagementPage.vue`
- Modify: `src/modules/mdm/pages/UomManagementPage.vue`

**Interfaces:**
- Consumes: Task 1 的 Tab 和展示映射。
- Produces: 最多两个常驻动作、动作化弹窗标题、完整详情。

- [ ] 将低频/危险动作移入 `MomCrudRowMenu`。
- [ ] 完善详情字段和弹窗标题。
- [ ] 用 Task 1 的 Tab 替换伪 Tab。
- [ ] 运行 MDM 定向测试与 typecheck。

### Task 3: 层级上下文、字段反馈与响应式布局

**Files:**
- Modify: `src/modules/mdm/pages/StructureManagementPage.vue`
- Modify: `src/modules/mdm/pages/MaterialCategoryPage.vue`
- Modify: `src/modules/mdm/pages/MaterialManagementPage.vue`
- Modify: `src/modules/mdm/pages/UomManagementPage.vue`
- Modify: `src/modules/mdm/pages/mdm-pages.css`
- Modify: `src/locales/zh-CN.ts`

**Interfaces:**
- Produces: 当前目录上下文、字段级反馈、结构化规则历史、1024px 布局。

- [ ] 增加当前目录范围表达，不构造伪全量树。
- [ ] 增加字段错误关联和结构化规则展示。
- [ ] 记录新增 Runtime i18n 文案需求；当前后端模块只读，不修改 MDM Flyway。
- [ ] 调整模块 CSS，仅消费现有 Token。

### Task 4: 验证与审查

**Files:**
- Modify: 必要的既有 MDM 测试与验证记录。

- [ ] 运行 `pnpm lint`。
- [ ] 运行 `pnpm typecheck`。
- [ ] 运行 `pnpm test`。
- [ ] 运行 `pnpm build`。
- [ ] 尝试登录态浏览器验证并记录真实结果。
- [ ] 检查最终 diff，不覆盖既有无关修改。
