# ADR-003：MOM PC Web 全站 UI 基线迁移

- 状态：Accepted
- 日期：2026-10-06
- 适用范围：`mom-web` 生产页面
- 决策人：用户
- 取代：ADR-001、ADR-002 中关于当前 UI 组件库和表格引擎的选择；两份历史记录保留作为决策过程

## 决策

全站采用 Reka UI + shadcn-vue + Tailwind CSS 4 + TanStack Table v9。MOM Semantic Token 继续是品牌、主题和布局的权威来源。视觉参考 Apple 的清晰层级、克制用色、柔和圆角、适度留白和细腻反馈，不复制其品牌，也不以大面积透明材质降低管理表格可读性。

业务页面优先复用 `src/shared/components` 和 `src/shared/ui`；后者集中封装 shadcn-vue 组件，Reka UI 负责焦点、键盘、弹层语义，TanStack Table 负责表格状态与列宽。页面仅保留业务字段、权限、API 与失败策略。共享层缺口确实存在时，先写明原因、无障碍与主题影响，再新增最小封装；禁止直接复制相同控件，也禁止建立配置驱动的万能 CRUD。

## 迁移边界

- 保持原有登录、账户、IAM API、权限判断、服务端分页、当前页筛选、状态写入与失败语义。
- 保留表格列宽调整、固定操作列、密度切换、主从布局、列表加载遮罩和弹窗保存防重复提交。
- Tailwind Preflight 在全站启用，MOM base 与组件样式负责明确的恢复和覆盖；shadcn-vue Token 映射至 MOM Semantic Token，亮色、暗色、系统三态使用同一套语义色。
- 删除 TDesign / VXE 依赖及其生产引用，移除开发专用组件验证页和入口；用户可见品牌统一为 MOM。
- 旧依赖与业务层直接引用底层原语由 lint 阻止。语义 HTML 仍可用于结构，交互机制优先使用组件库。

## 验证与风险

静态门禁为 `pnpm lint`、`pnpm typecheck`、现有 `pnpm test`、`pnpm build` 与源码旧依赖扫描；不新增 `*.test.ts`。亮暗主题、中英文、键盘焦点、1024px 以上视口、长列表和弹窗保存由用户进行页面人工验收，未验收项不记录为通过。引入新 UI 原语后最大风险是 Preflight 与现有页面 CSS 的层叠差异，以及旧测试对已删除验证页的假设；发现时修复呈现层，不改业务规则。
