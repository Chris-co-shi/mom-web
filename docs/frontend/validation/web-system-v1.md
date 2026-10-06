# System V1 管理端实现记录

- 范围：平台字典、支持语言、`system` / `system.*` 文案与 Translation；仅 `mom-web`。
- 契约来源：`mom-platform` 的 `DictionaryController`、`SupportedLocaleController`、`I18nManagementController` 及 Gateway `/api/system/**` 路由（只读核对，未修改）。
- 权限：字典 `system:dictionary:read/write`；Locale 与文案 `system:i18n:read/write`。菜单和操作入口按权限隐藏，后端仍是授权权威。

## 与通用 CRUD 标准的显式差异

1. System V1 的三个管理接口返回完整列表，无服务端分页或全局搜索。本页只筛选、分页已加载数据，并在界面标明范围；不伪造服务端总数。
2. 字典类型/条目、Locale、Message/Translation 均无删除接口，因此不展示删除入口。类型停用不级联修改条目；默认 Locale 不可直接停用。
3. 字典类型/条目与 Message 各采用主从布局；主列表在左、当前选中项的数据在右。Locale 为单表列表。状态变更影响后续读取，采用确认弹窗，不照搬 IAM 用户的即时启停例外。
4. 开发代理只对 System 保留 `/api` 前缀，以匹配 Gateway 和 System Controller；Auth 等既有路由继续使用原重写方式。

## 请求与失败语义

- 列表读取在相应区域显示遮罩；切换主项取消上一项请求，防止乱序回写。
- 写入期间弹窗显示遮罩并阻止重复提交与关闭；写入成功后重读失败仍显示“保存成功”和单独的列表读取错误。
- `409` 冲突和网络/超时导致的未知写入结果会阻止直接重复提交；保留草稿，要求先读取最新列表核对。Translation 新建传 `version: null`，更新传当前版本。
- 文案仅允许精确 `system` 或合法 `system.*` namespace；纯文本、数字占位符格式与其他 Locale 的占位符集合先行校验，服务端最终裁决。

## 验证状态

- `pnpm lint`、`pnpm typecheck`、现有 `pnpm test`（49 个测试）、`pnpm build` 已通过；未新增 `*.test.ts`。
- 真实 Gateway/System 联调未完成。需 System 服务可达，且测试账号已获上述现有 IAM 权限。未使用假数据。
- 亮/暗主题、中英文、键盘焦点、1024px 及以上视口、长列表和弹窗保存由用户人工验收；本记录不将其标为通过。
- Web 界面文案入库与动态加载、Auth 异常文案迁移均不在本 Slice，继续使用现有静态中英文切换。
