# ADR-010：MOM Admin 使用 Vben 5.7 源码快照

- 状态：Accepted
- 日期：2026-07-28
- 替代：[ADR-001：Vben 5 作为前端参考基线](ADR-001-Vben5作为参考基线.md)
- 关联架构：[MOM Admin Vben 5.7 迁移架构](../architecture/MOM-Admin-Vben5.7迁移架构.md)
- 来源台账：[Vben 5.7.0 源码快照台账](../open-source/vben-5.7.0-snapshot.md)

## 1. 背景

MOM Admin 已需要完整后台运行时能力：BasicLayout、动态路由生成、菜单与页签、Preferences、国际化、登录页结构和异常页面。继续只参考 Vben 或重复实现这些能力，会形成两套基础设施。

## 2. 决策

1. 固定 Vue Vben Admin `v5.7.0`，Commit `63a38dce49ba109f61607994e21ba921d8e970e9`。
2. 迁入 MOM Admin 运行闭包所需的 Workspace 源码包，不迁入演示业务、Mock、Vben 请求层或完整应用。
3. 上游快照保持原包名和目录语义，不批量改成 `@mom/*`。
4. MOM 认证、权限、路由、品牌、国际化和页面适配全部位于 `apps/mom-admin`。
5. 不直接修改 Vben 快照；必要兼容补丁必须登记。
6. MOM 根级构建只递归执行 `@mom/*` 项目；Vben 快照由 MOM Admin 的 Vite/TypeScript 作为源码依赖编译。
7. 后续升级必须专项评估上游差异、补丁重放、许可证和完整回归，不自动追随上游。

## 3. 迁入边界

迁入：

- `@vben/access`、`@vben/common-ui`、`@vben/constants`、`@vben/hooks`
- `@vben/icons`、`@vben/layouts`、`@vben/locales`、`@vben/preferences`
- `@vben/stores`、`@vben/styles`、`@vben/types`、`@vben/utils`
- 上述包依赖的十二个 `@vben-core/*` 包
- `@vben/tailwind-config` 与 `@vben/tsconfig`

不迁入：

- `apps/web-antd` 演示业务
- Mock 服务、演示 API 和示例通知
- `@vben/request`、`@vben/plugins`
- Vben 内部发布、Lint、Changeset 和 Turbo 工具链

## 4. 后果

- MOM Admin 获得 Vben 真实布局与 Preferences 能力。
- 仓库文件数量和依赖闭包显著增加。
- Vue、Vue Router、Tailwind 等共享版本必须与 Vben 5.7.0 兼容基线精确对齐。
- 开源来源、补丁和升级必须持续维护。

## 5. 验收

- 来源、Tag、Commit、License 和迁入目录可审计。
- MOM 适配层之外没有未登记的快照修改。
- Vben Token/Permission 不持久化。
- MOM Admin 类型检查、测试与生产构建通过。
- Supplier Portal 和 Customer Portal 不被 Vben 迁移破坏。
