# MOM Web Foundation V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 收口现有 MOM PC Web 设计系统、共享组件、全局基础能力和验收证据，为 MDM 前端开发提供稳定基线。

**Architecture:** 以 ADR-003 和现有 `Mom*` 组件为权威，采用最小增量治理。业务能力留在 IAM/System，Foundation 只修复跨页面不变量、迁移残留和文档事实。

**Tech Stack:** Vue 3.5、TypeScript 6、Vite 8、Pinia 4、Vue Router 5、Reka UI、shadcn-vue、Tailwind CSS 4、TanStack Table v9、Vitest 5。

**Spec:** `docs/superpowers/specs/2026-10-12-mom-web-foundation-v1-design.md`

## Global Constraints

- 只操作本地 `mom-web`，不修改后端或后端 API。
- 不新增生产依赖，不改变 ADR-003 技术栈。
- 不新增业务页面、万能 CRUD、万能表单或第二套主题系统。
- 保留现有未提交修改，不执行任何 Git 写操作。
- 行为改动先写失败测试；视觉改动通过浏览器与静态门禁验证。

## Review Focus

- 键盘用户操作列宽分隔器时，ArrowLeft/ArrowRight 应改变宽度且不触发页面滚动。
- 列宽到达最小/最大值时不能越界。
- 亮色与暗色下焦点、浮层、禁用和 Loading 状态必须仍清晰可见。
- 1024px 下管理页允许表格局部横向滚动，但不能造成页面级布局破坏。
- 后端不可用时，认证和业务页不得被描述为真实联调通过。

---

### Task 1: 固化审计矩阵与当前事实

**Files:**
- Create: `docs/frontend/validation/web-foundation-v1.md`
- Modify: `docs/frontend/README.md`

**Interfaces:**
- Consumes: ADR-003、现有源码、基线门禁输出。
- Produces: Phase 0–6 能力矩阵、范围和验收事实。

- [x] 记录已实现且符合规范、已实现但不统一、必须补齐、未验证和不属于当前阶段的能力。
- [x] 记录现有用户修改、历史迁移残留和不新增依赖的决定。
- [x] 在 README 中登记 Foundation V1 报告入口。

### Task 2: 清理 Design System 迁移残留

**Files:**
- Modify: `src/styles/components.css`
- Modify: `src/styles/semantic.css`
- Modify: `src/shared/ui/ui.css`
- Modify: `src/shared/components/mom-modal.css`
- Modify: `docs/frontend/design-system.md`
- Modify: `docs/frontend/frontend-architecture.md`

**Interfaces:**
- Consumes: 现有 `--mom-*` Primitive/Semantic Token。
- Produces: 无 `--td-*` 的现行 Component Token 与准确组件关系说明。

- [x] 删除已退出生产栈的 `--td-*` 映射，保留 MOM 布局与控件 Token。
- [x] 将硬编码浮层层级收敛到 `--mom-z-overlay` / `--mom-z-modal`。
- [x] 修正文档中把 `MomModal`、`MomListSurface` 描述为 VXE 的现行表述；历史 ADR/验证报告保持历史性质。
- [x] 运行 `pnpm lint && pnpm typecheck`，Expected: exit 0。

### Task 3: 用 TDD 补齐表格列宽键盘行为

**Files:**
- Create: `src/shared/components/MomDataTable.test.ts`
- Modify: `src/shared/components/MomDataTable.vue`
- Modify: `src/shared/components/mom-data-table.css`
- Modify: `vitest.config.ts`（测试首次运行暴露生产别名未同步）

**Interfaces:**
- Consumes: `MomColumn.width/minWidth/resizable` 与 TanStack Column API。
- Produces: 分隔器 ArrowLeft/ArrowRight 键盘调整、ARIA value 语义和可见焦点。

- [x] 编写失败测试：分隔器可聚焦、使用列标题作为可访问名称、ArrowRight 增宽、ArrowLeft 减宽并阻止默认滚动。
- [x] 运行 `pnpm exec vitest run src/shared/components/MomDataTable.test.ts`，Expected: 因缺少键盘行为 FAIL。
- [x] 实现最小键盘调整逻辑和 ARIA 属性，不改变鼠标/触摸拖拽行为。
- [x] 再运行定向测试，Expected: PASS。
- [x] 运行 `pnpm test`，Expected: 全量 PASS。

### Task 4: 核对基础控件和组合组件边界

**Files:**
- Modify: `src/shared/ui/MomNumberInput.vue`（仅当可直接复用已有 Input 且契约不变）
- Modify: `docs/frontend/standards/crud-management-page-standard.md`
- Modify: `docs/frontend/validation/web-foundation-v1.md`

**Interfaces:**
- Consumes: 现有 `MomButton/Input/Select/Checkbox/Modal/Loading` 与管理页真实用法。
- Produces: 公共组件清单、Props/事件/无障碍/主题边界和明确未抽象项。

- [x] 检查每个基础组件和组合组件的调用方，确认没有功能重复的新组件必要性。
- [x] 数字输入经审计保持现状：替换底层包装没有用户行为收益。
- [x] 文档明确 Inline Feedback 已由页面语义承担，当前不建立全局通知中心。
- [x] 运行 `pnpm lint && pnpm typecheck && pnpm test`，Expected: exit 0。

### Task 5: 全局能力与质量收口

**Files:**
- Modify: `docs/frontend/validation/web-foundation-v1.md`
- Modify: `docs/frontend/implementation-plan.md`
- Modify: `src/shared/components/MomModal.vue`
- Create: `src/shared/components/MomModal.test.ts`

**Interfaces:**
- Consumes: Tasks 1–4 的代码与测试结果。
- Produces: Phase 5/6 验证报告和是否可进入 MDM 的结论。

- [x] 验证 Application 初始化、Router/菜单、认证权限、Pinia、HTTP 错误/取消、i18n Namespace、主题切换的现有测试和代码事实。
- [x] 启动本地 Vite/Preview，检查可达公共页面的亮暗主题、中文英文、目标视口、键盘焦点和控制台错误；后端阻断的场景登记未验证。
- [x] 运行 `pnpm verify`、`git diff --check` 和旧依赖扫描，Expected: 命令成功且生产源码无 TDesign/VXE 引用。
- [x] 更新完成项、未验证项、风险和 MDM 准入结论。

