# Vben 5.7.0 源码快照台账

> 治理状态：冻结的 P1.6 迁移例外。历史迁入依据为 [ADR-010](../adr/ADR-010-MOM-Admin-Vben5.7源码快照.md)，当前退出与删除门禁由 [ADR-011](../adr/ADR-011-MOM自有轻量前端运行时与Vben渐进退出.md) 管理。源码实际删除前，本台账和 License/NOTICE 持续有效。

## 1. 上游

| 字段 | 内容 |
|---|---|
| 仓库 | `https://github.com/vbenjs/vue-vben-admin` |
| Tag | `v5.7.0` |
| Commit | `63a38dce49ba109f61607994e21ba921d8e970e9` |
| License | MIT |
| 引入方式 | 固定 Workspace 源码快照 |
| 升级方式 | 专项升级，不自动追随上游 |

## 2. 迁入目录

### `@vben/*`

- `packages/constants`
- `packages/effects/access`
- `packages/effects/common-ui`
- `packages/effects/hooks`
- `packages/effects/layouts`
- `packages/icons`
- `packages/locales`
- `packages/preferences`
- `packages/stores`
- `packages/styles`
- `packages/types`
- `packages/utils`

### `@vben-core/*`

- `packages/@core/base/design`
- `packages/@core/base/icons`
- `packages/@core/base/shared`
- `packages/@core/base/typings`
- `packages/@core/composables`
- `packages/@core/preferences`
- `packages/@core/ui-kit/form-ui`
- `packages/@core/ui-kit/layout-ui`
- `packages/@core/ui-kit/menu-ui`
- `packages/@core/ui-kit/popup-ui`
- `packages/@core/ui-kit/shadcn-ui`
- `packages/@core/ui-kit/tabs-ui`

> 最终迁入以各目录 `package.json` 的真实包名和 Git 差异为准；若上游目录名与包名不一，以包名为审计主键。

### 构建配置

- `internal/tailwind-config`
- `internal/tsconfig`

## 3. 排除

- `apps/web-antd` 演示应用
- Mock 与演示 API
- `@vben/request`
- `@vben/plugins`
- 上游发布、Lint、Turbo、Changeset 和文档工具链

## 4. MOM 适配位置

所有 MOM 行为放在：

- `apps/mom-admin/src/bootstrap.ts`
- `apps/mom-admin/src/router/**`
- `apps/mom-admin/src/layouts/**`
- `apps/mom-admin/src/locales/**`
- `apps/mom-admin/src/views/**`
- `apps/mom-admin/src/runtime.ts`
- `packages/api-client/**`

## 5. 补丁台账

| 编号 | 范围 | 处理 | 原因 |
|---|---|---|---|
| P-001 | Workspace 根脚本 | 根递归任务仅筛选 `@mom/*` | 快照作为源码依赖，不执行上游发布脚本 |
| P-002 | Vue / Vue Router | 对齐上游锁定兼容版本 | 避免同一 Workspace 多套 Vue/Router 类型 |
| P-003 | Tailwind | 对齐上游 `4.3.0` | 保持 Vben 组件 `@apply` 构建行为 |
| P-004 | Vben Access Store | MOM Bootstrap 不写 Token；持久化配置排除 Access/Permission | 防止认证与权限数据进入长期存储 |
| P-005 | TypeScript 6 / Vue Router 5 | 删除 8 个已失效的模板变量 `@ts-expect-error`；菜单重定向仅接受字符串路径 | 保持严格类型检查，并适配 Router 5 扩展后的重定向类型 |
| P-006 | MOM Vite 适配 | 复用上游 Tailwind `@reference` 注入逻辑，并提供 `sass-embedded` | 使快照组件的 `@apply` 与 SCSS 按 Vben 5.7 构建语义处理 |
| P-007 | Preferences 自定义触发器 | 向默认 Slot 暴露 `open`，Header 齿轮显式绑定 Drawer 打开动作 | 修复自定义按钮替换默认触发器后点击无反馈，并保留固定按钮与用户菜单调用方式 |

代码完成后若出现新的兼容补丁，必须追加到本表。

## 6. 核验

- 快照文件不得混入 MOM 业务逻辑。
- 快照修改必须能通过 `git diff` 与本台账对应。
- `THIRD-PARTY-NOTICES.md` 保留上游、Tag、Commit 和 License。
- 后续升级先比较上游 Tag，再重放 MOM 适配与补丁。
