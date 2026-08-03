# 开源来源登记

## 1. 原则

- 标准运行时和 UI 库通过正式包依赖使用。
- MOM Admin 已按 [ADR-010](../adr/ADR-010-MOM-Admin-Vben5.7源码快照.md) 迁入 Vben 5.7.0 最小运行闭包；[ADR-011](../adr/ADR-011-MOM自有轻量前端运行时与Vben渐进退出.md) 现将其治理为冻结的迁移例外，零引用和全部删除门禁满足前继续保留来源、补丁与 License/NOTICE。
- 任何源码迁移必须记录上游路径、Tag、License 和 MOM 修改。
- 禁止引入前雇主、客户或未授权商业项目源码、页面、图片和数据。
- 精确安装版本以 `package.json`、Workspace Catalog 和 `pnpm-lock.yaml` 为准。

## 2. 来源清单

| 组件 | 上游 | 基线/版本来源 | License | 使用方式 | 是否复制源码 | 备注 |
|---|---|---|---|---|---|---|
| Vue Vben Admin | `vbenjs/vue-vben-admin` | `v5.7.0` / `63a38dce49ba109f61607994e21ba921d8e970e9` | MIT | MOM Admin 固定 Workspace 源码快照；P1.6 冻结迁移例外 | 是 | 历史迁入见 [ADR-010](../adr/ADR-010-MOM-Admin-Vben5.7源码快照.md)；当前退出门禁见 [ADR-011](../adr/ADR-011-MOM自有轻量前端运行时与Vben渐进退出.md)；闭包与补丁见 [Vben 5.7.0 源码快照台账](vben-5.7.0-snapshot.md) |
| Vben `Page` | `vbenjs/vue-vben-admin` | `v5.7.0` / `packages/effects/common-ui/src/components/page/{page.vue,types.ts}` | MIT | 参考重写 | 是 | 目标 `packages/common-ui/src/Page.vue`；移除 Vben 内部 Tailwind、自动高度与 Footer 依赖，保留 title/description/extra/content Slots，改用 MOM Token 与 BEM CSS；升级时对照上游 `PageProps` 和 Slots |
| Vue | `vuejs/core` | 锁文件 | MIT | 正式运行时依赖 | 否 | Vue 3 |
| Vite | `vitejs/vite` | `package.json` / 锁文件 | MIT | 构建工具 | 否 | 当前根版本 `8.0.10` |
| TypeScript | `microsoft/TypeScript` | `package.json` / 锁文件 | Apache-2.0 | 类型系统 | 否 | 当前根版本 `6.0.3` |
| Pinia | `vuejs/pinia` | Workspace Catalog / 锁文件 | MIT | 状态管理 | 否 | 仅管理明确作用域状态 |
| Axios | `axios/axios` | Workspace Catalog | MIT | 历史 Catalog 条目；不是 MOM 请求层 | 否 | `@mom/api-client` 当前使用浏览器 Fetch；不得据此引入第二请求层 |
| Ant Design Vue | `vueComponent/ant-design-vue` | Workspace Catalog / 锁文件 | MIT | 基础 UI 组件 | 否 | MOM Design Token 统一视觉语义 |
| Lucide | `lucide-icons/lucide` | Workspace Catalog / 锁文件 | ISC | 当前 Vben 快照依赖；P1.6 接受的 MOM 图标来源 | 否 | MOM 静态 `iconKey` Registry 在 S02 实施；Vben 现有引用仍属迁移例外 |
| Vue Router | `vuejs/router` | Workspace Catalog / 锁文件 | MIT | 应用路由 | 否 | 各应用独立路由 |
| pnpm | `pnpm/pnpm` | `packageManager` | MIT | 包管理与 Workspace | 否 | 当前 `11.7.0` |

## 3. Vben 源码迁移登记模板

| 字段 | 内容 |
|---|---|
| 上游仓库 | `vbenjs/vue-vben-admin` |
| 上游 Tag/Commit |  |
| 原始路径 |  |
| MOM 目标路径 |  |
| 复用方式 | 参考重写 / 源码迁移 |
| 修改摘要 |  |
| License/NOTICE |  |
| 引入 PR |  |
| 后续升级策略 |  |

## 4. 禁止事项

- 批量复制完整 Vben 演示应用后改名；ADR-010 已登记且受 ADR-011 冻结退出治理的最小运行闭包除外。
- 复制其他开源后台的权限、用户和业务模型作为 MOM 模型。
- 引入来源不明的图标、图片和字体。
- 使用真实客户页面截图作为公开原型。
- 删除上游版权或许可证信息。
- 使用宽松版本范围绕过锁文件治理。

## 5. 核验时机

以下情况必须更新本文件和 `THIRD-PARTY-NOTICES.md`：

- 新增运行时依赖。
- 引入新的 UI、图形、编辑器或图表库。
- 迁移 Vben 或其他上游源码。
- 修改参考版本。
- 引入字体、图标或图片资源。
- 发布第一个可部署版本。
