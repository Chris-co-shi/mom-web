# MOM-Web S02 UI 与 Shell 基础前置评审

> 评审日期：2026-08-03  
> 阶段：MOM Platform P1.6 / S02 Preflight  
> 前置：S00 Completed；S01 实现与本地门禁 Completed  
> 结论：**APPROVED — Chris 于 2026-08-04 独立批准 S02**  
> 授权边界：批准仅覆盖本文冻结的 S02；不构成 S03 实施授权

## 1. 结论

S02 可以在不改变产品范围、后端契约、认证和权限语义的前提下实施。原两项准入条件的状态如下：

1. **已满足**：2026-08-04 使用真实 Gateway/IAM 登录完成 `/iam/users` 的 1024px Light/Dark/Comfortable 人工视觉验收；Compact 因当前没有用户入口，采用 Admin 专项 E2E 和 Token 单元测试作为等价运行时契约证据，用户偏好入口不提前于 S07 建设；
2. **已批准**：Chris 明确批准本文对“Shell 基础”的解释：S02 启用跨应用 `AuthShell`、`PortalShell` 和 Admin 内容区语义组件，但不替换当前 Vben `BasicLayout`；Admin 顶层 Shell 与 Router 的替换仍严格属于 S04。

真实页面验收确认列表、筛选、主要操作和详情空状态正常，Light/Dark 均无横向溢出且浏览器控制台无 error。验收后已恢复 Light/Comfortable。没有伪造用户、Token、业务数据，也没有为了视觉验收提前实现 Preference。

## 2. 本轮评审边界

### 2.1 S02 目标

- 冻结 `Page`、`DataState`、`ActionBar`、`ConfirmAction` 和 Lucide Registry 的职责与公共 API；
- 建立可被三个应用真实消费的 Auth/Portal Shell 视觉基础；
- 将两个 Portal 从全量 `.use(Antd)` 调整为按需组件导入，并隔离匿名入口与已认证内容 Chunk；
- 以现有 IAM 页面和 Portal 认证入口作为真实消费者，不创建示例页面或 Future 业务页；
- 建立组件、焦点、渠道视口和 Portal Bundle 子门禁。

### 2.2 S02 明确不做

- 不替换 Admin `BasicLayout`、导航、Router、Preferences、Locales、Stores 或 Vben Styles；
- 不接入 Preference、Dynamic I18n、Catalog、ETag 或用户隔离缓存；
- 不拆分 496 行 `App.vue`，不迁移 `@mom/iam-admin`；
- 不建设 Workbench、Delivery、Order、Production、Quality 等页面；
- 不去重两个 Portal 的 Runtime、认证流程或业务文案；该治理仍属于 S11；
- 不修改 IAM/System API、DTO、Token Claim、Client/`user_type`、Party/Factory 或 403 单飞契约；
- 不升级 Vue、Vite、TypeScript、Ant Design Vue 或 Lucide；
- 不删除 Vben、Iconify/Reka 快照或历史兼容入口；
- 不提交 Git、不推送、不创建 PR。

## 3. 证据矩阵

|证据|当前事实|对 S02 的约束|
|---|---|---|
|[UI 组件库](../03-ui-component-library.md)|首批语义组合为 Page、DataState、ActionBar、ConfirmAction 和 Lucide Registry|S02 只实现这五类能力，不扩展为通用 CRUD/表单系统|
|[复用规则](../06-reuse-rules.md)|普通共享组件需要两个真实消费者；高风险横切能力可登记例外|Auth/Portal Shell 和状态组件必须在现有应用落地；ConfirmAction 以高风险一致性例外准入|
|[实施计划](../08-implementation-plan.md)|S02 包含 UI/Shell 基础；S04 替换 Admin Shell 与 Router|S02 不得提前替换 Vben `BasicLayout`|
|`packages/common-ui`|只有一个扁平 `Page`，仅依赖 Vue；`headerClass/contentClass` 暴露样式注入口|需收敛公共 API、补语义组件、测试和组件库依赖边界|
|Admin `App.vue`|六个 IAM Section 使用 `Page`；错误、Loading、Empty 和高风险确认分散|只替换表达层，不改变命令闭包、权限判断、URL 或错误映射|
|Admin `layouts/auth.vue`|继续使用 Vben `AuthPageLayout`|可在 S02 替换为 MOM `AuthShell`，不触碰已认证顶层 Shell|
|两个 Portal `main.ts`|全量 `.use(Antd)`；匿名与已认证页面静态进入同一 Chunk|必须移除全量注册，并按认证边界懒加载已认证内容|
|两个 Portal `AuthGate.vue`|结构和 scoped CSS 高度重复|S02 只复用无业务逻辑 `AuthShell`；流程去重留到 S11|
|菜单元数据|仍使用 Vben `lucide:*` 字符串和 `@vben/icons`|S02 建 MOM 静态 Registry，但不替换 Vben 菜单渲染；S04/S05 再接管|
|S01 Bundle 基线|Portal 初始约 440.1 KB gzip，最大 Chunk 约 1,450.2 KB|S02 必须让 Portal 目标单独可测并显著下降，不能提高预算|
|依赖锁文件|`lucide-vue-next@0.577.0` 已由 Vben 间接锁定|允许按冻结版本提升为 `common-ui` 直接依赖，不引入第二图标集|

## 4. 问题分级

### 4.1 Blocker

没有产品、后端架构或视觉验收 Blocker。Chris 已于 2026-08-04 独立批准 S02；该批准不延伸到 S03，也不改变 Future 页面状态。

### 4.2 Major

|ID|问题|影响|S02 必须采取的修正|
|---|---|---|---|
|S02-M1|S02“Admin Shell”与 S04“替换 Admin Shell”文字重叠|可能提前引发 Vben Router/Layout 迁移|S02 只建设 Admin 内容区基础和 AuthShell；`BasicLayout` 替换留在 S04|
|S02-M2|`common-ui` 只有 Page 且公共 API 允许注入任意 CSS Class|调用方可绕过语义 Token，组件职责不稳定|移除无消费者的 `headerClass/contentClass`，改用具名插槽和稳定语义 Props|
|S02-M3|页面状态与命令状态混杂|Error/Empty 可能吞掉 409、429 或结果未知|DataState 只表达页面/数据；命令状态由模块显式传入 ConfirmAction/页面|
|S02-M4|高风险确认由 `Modal.confirm` 页面函数直接编排|原因、焦点、提交中和结果未知体验会分叉|建立受控 ConfirmAction；操作闭包和 API 调用继续留在 Admin 页面|
|S02-M5|Portal 全量注册 Antdv，匿名与认证内容同 Chunk|Portal 初始包远超 250 KB，未使用组件进入闭包|SFC 直接具名导入；认证后 App 使用显式异步边界；禁止新增自动导入插件|
|S02-M6|Lucide 只存在于 Vben 间接依赖和 Iconify 字符串|Catalog 后续可能形成动态可执行图标入口|`common-ui` 建静态 Map，未知键回退；不接受组件名、URL 或动态 import|
|S02-M7|Auth Shell 在 Admin 与两个 Portal 中分叉|主题、焦点、移动布局和长文案行为不一致|共享纯视觉 AuthShell；各应用继续拥有认证状态与提交逻辑|
|S02-M8|整体 `bundle:target` 会被 Admin Vben Chunk 持续阻断|无法证明 Portal 在 S02 是否达到自身目标|Bundle 工具增加不放宽预算的应用过滤参数，新增 Portal 目标命令|

### 4.3 Minor

|ID|问题|处理|
|---|---|---|
|S02-m1|两个 Portal App/AuthGate 仍重复|只迁移到相同语义组件；Runtime 与流程去重留给 S11|
|S02-m2|Portal 可见文案尚未进入 i18n|S03/S11 处理；S02 不借 Shell 重写全部文案|
|S02-m3|Roles 页面仍有一个 inline style 例外|保持精确台账，S06 删除|
|S02-m4|Vben 菜单仍使用 Iconify|S02 不扩大引用；S04/S05 接入 MOM Registry 后删除|
|S02-m5|Admin `App.vue` 结构过大|S02 只替换局部语义表达，S06 才拆模块|

## 5. 冻结组件契约

### 5.1 `Page`

职责：页面标题、说明、面包屑/上下文、主要操作和内容区语义；不读取 Router、Store、Permission 或 API。

```ts
export interface PageProps {
  title?: string;
  description?: string;
  labelledBy?: string;
}
```

具名插槽固定为 `title`、`description`、`context`、`actions` 和默认内容。现有无消费者的 `headerClass/contentClass` 在 S02 删除，不提供任意样式透传替代。

### 5.2 `DataState`

```ts
export type DataStateKind =
  | 'LOADING'
  | 'EMPTY'
  | 'NO_RESULT'
  | 'ERROR'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'PARTIAL';

export interface DataStateProps {
  kind: DataStateKind;
  title: string;
  description?: string;
  correlationId?: string;
  actionLabel?: string;
}
```

只在 `actionLabel` 存在时发出 `action` 事件。组件不判断 HTTP Status、不自动刷新、不清除 Token，也不把 `CONFLICT / RATE_LIMITED / RESULT_UNKNOWN` 伪装成普通 Error。

### 5.3 `ActionBar`

职责：稳定组织上下文、主操作、次操作和窄屏收纳。插槽固定为 `context`、`primary`、`secondary`、`overflow`；组件不读取 Permission，也不把隐藏按钮当成后端授权。

S02 不实现配置化 Actions 数组、动态权限码或 Universal Toolbar。Admin 使用中高密度行为；Portal 保持 44px 触控目标。

### 5.4 `ConfirmAction`

```ts
export type ConfirmActionState = 'IDLE' | 'SUBMITTING' | 'RESULT_UNKNOWN';

export interface ConfirmActionProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  state: ConfirmActionState;
  danger?: boolean;
  requireReason?: boolean;
  reason?: string;
  reasonLabel?: string;
  reasonError?: string;
}
```

事件固定为 `update:open`、`update:reason`、`confirm`、`cancel`。组件不接收 API Client、Permission、Promise 操作函数或完整 DTO；父页面负责命令状态、幂等、409/429、结果未知与重载策略。Dialog 必须验证初始焦点、Tab 约束、Escape/Cancel 和关闭后焦点返回。

ConfirmAction 以“安全确认一致性”进入 `common-ui` 的单消费者高风险例外；当前消费者为 Admin People & Access，最晚 S08 复审第二消费者，不以 Future 页面伪造消费者。

### 5.5 Lucide Registry

```ts
export type MomIconKey =
  | 'users'
  | 'shield-check'
  | 'key-round'
  | 'monitor-smartphone'
  | 'scroll-text'
  | 'app-window'
  | 'settings';

export function resolveMomIcon(iconKey: string): {
  component: Component;
  known: boolean;
};
```

- Registry 只具名导入已批准图标；
- 未知 Key 返回固定 `circle-help` 回退并令 `known=false`；
- 不执行动态 import、不解析 URL、不接受组件源码；
- 现有 Vben `lucide:*` 仅作为冻结迁移输入，不成为 Catalog 契约；
- S05 的 Catalog 未知 `routeKey` 仍 fail closed，不能因图标有回退而放宽路由契约。

## 6. Shell 边界

### 6.1 `AuthShell`

`AuthShell` 是纯视觉布局，允许 brand、title、description、form、footer、toolbar 插槽和可选静态 artwork；不拥有登录状态、密码、Client、重定向或错误映射。

真实消费者：Admin Login/Password Change、Supplier Portal Auth、Customer Portal Auth。Portal 360px 单列，Admin 1024px 保持双区构图；200% 文本缩放不隐藏表单和提交按钮。

### 6.2 `PortalShell`

`PortalShell` 只表达 Portal Header、身份上下文、主内容与渠道宽度。Supplier/Customer 各自保留 App、Runtime、Party 类型和业务文案；不得通过 `portalType` 大型布尔分支把两个应用合并。

### 6.3 Admin Shell

S02 对 Admin 的交付仅包括：

- 已认证内容区使用 Page/DataState/ActionBar/ConfirmAction；
- Auth Route 使用 MOM AuthShell；
- Theme/密度和 Lucide 契约可供 S04 接管。

`apps/mom-admin/src/layouts/basic.vue` 继续使用 Vben `BasicLayout`。导航、用户菜单、Factory Context、深链和 Route Guard 不在 S02 修改。

## 7. Portal 按需 Antdv 与 Chunk 方案

实施顺序冻结为：

1. 删除两个 Portal `main.ts` 的默认 `Antd` 导入和 `.use(Antd)`；
2. 每个 SFC 只具名导入实际使用的 Antdv 组件，禁止新增自动导入生产插件；
3. `AuthGate` 不再静态导入已认证 `App.vue`，只在 `READY/ERROR` 阶段加载认证内容 Chunk；
4. AuthShell 与匿名表单只进入 Portal 初始闭包；已认证 Descriptions/Table/业务骨架不进入匿名入口；
5. 生产构建后以 manifest 静态闭包重新测量，不使用开发服务器网络面板代替；
6. 若仍超过预算，先检查错误的聚合导入和静态依赖，再决定是否需要稳定 vendor 分块；不得通过提高预算或隐藏文件通过。

Bundle 脚本可增加 `--application=<name>` 过滤，但必须继续读取同一 `quality/bundle-targets.json`，不得建立较宽松的 S02 专用预算。

## 8. 预计文件范围

### 8.1 `common-ui`

```text
packages/common-ui/
├── package.json
└── src/
    ├── components/
    │   ├── Page.vue
    │   ├── DataState.vue
    │   ├── ActionBar.vue
    │   └── ConfirmAction.vue
    ├── layouts/
    │   ├── AuthShell.vue
    │   └── PortalShell.vue
    ├── icons/
    │   ├── MomIcon.vue
    │   └── registry.ts
    ├── index.ts
    ├── styles.css
    └── types.ts
```

允许把现有扁平 `Page.vue` 移入 `components/`，但必须保留 `@mom/common-ui` 公共导出，不增加深层公开入口。

### 8.2 应用与测试

- Admin：`layouts/auth.vue`、Login/Password Change 组合、`App.vue` 的语义组件接入；`layouts/basic.vue` 原则上不修改；
- Supplier/Customer：`main.ts`、`root.vue`、`AuthGate.vue`、`App.vue` 的按需导入和 Shell 组合；
- 测试：`tests/component/` 新增各语义组件、焦点和 Shell 测试；`tests/e2e/` 增加渠道视口、深链、主题和匿名 Chunk 契约；
- 质量：`scripts/check-bundle.mjs` 与根脚本增加 Portal 目标过滤，不改变目标数值；
- 文档：S02 实施报告和本计划状态，不提前改 S03/S04 为进行中。

## 9. 验收矩阵

|能力|必须证明|禁止替代证据|
|---|---|---|
|Page|三个应用真实页面/骨架消费，标题层级和操作区稳定|只挂 Story/示例页面|
|DataState|Loading、Empty、No Result、Error、Forbidden、Partial 有独立 DOM/文案/操作|用一个 Spinner 或空白页覆盖全部状态|
|ActionBar|Admin 1024 与 Portal 360 的操作顺序、收纳和触控尺寸|只测宽屏截图|
|ConfirmAction|原因必填、提交禁用、结果未知、键盘和焦点返回|只断言 Modal 存在|
|Lucide|已知键、未知回退、无动态执行、Tree-shaking|继续把 Iconify 当 MOM Registry|
|AuthShell|三应用认证入口、密码改密、英文长文案和 200% 缩放|只测 Supplier Light|
|Portal Shell|360/768/1280，Light/Dark/System，无横向溢出|缩放 Admin Shell|
|Portal Bundle|两个 Portal 初始 gzip ≤250 KB、单 Chunk ≤500 KB、Source Map 0|提高预算或仅通过 baseline|
|Admin Bundle|Baseline 不回归；Vben 大 Chunk 继续显式红灯|声称 S02 已关闭 Admin 500 KB 目标|

## 10. 验证命令

正式使用 Node 24.0.0、pnpm 11.7.0：

```bash
pnpm install --frozen-lockfile
pnpm validate
pnpm lint
pnpm stylelint
pnpm tokens:check
pnpm check:type
pnpm test
pnpm test:component
pnpm build
pnpm bundle:check
pnpm bundle:target:portal
pnpm test:e2e
```

`bundle:target:portal` 必须由 S02 建立并继续使用 Accepted 250/500 KB 目标。整体 `pnpm bundle:target` 在 Admin Vben 退场前仍可因 Admin 最大 Chunk 失败，但两个 Portal 不得继续失败。

浏览器验收至少覆盖：

- Admin `/auth/login`、`/auth/change-password`、`/iam/users`：1024/1280/1600；
- Portal Auth/Shell：360/768/1280；
- Light/Dark/System、Admin Comfortable/Compact；
- 键盘顺序、Focus Ring、Dialog 焦点、200% 文本缩放、`prefers-reduced-motion`；
- 控制台无新增 Error，真实后端失败不展示敏感堆栈。

## 11. 回滚与停止条件

- `common-ui` 公共导出保持单一入口，应用可按组件逐个回退；
- Portal 按需导入与认证 Chunk 作为独立回滚面，不与 Runtime 或认证协议改动混合；
- Admin AuthShell 可回退到当前 Vben AuthPageLayout，已认证 `BasicLayout` 始终不动；
- ConfirmAction 若无法保持现有 API 调用、审计原因或结果未知语义，立即回退旧确认入口并停止；
- 如 Portal 250/500 KB 目标无法在不新增生产依赖、不改变业务范围的条件下达到，报告真实依赖证据并重新 Review，不提高预算；
- 出现权限/数据范围放宽、后端契约未知、新业务页面、Vben 删除或需要升级基础依赖时立即停止。

## 12. 准入清单

- [x] S02 产品范围与禁止事项已明确；
- [x] 组件职责、公共 API、消费者和共享例外已冻结；
- [x] Portal 按需 Antdv 与 Chunk 边界已冻结；
- [x] Admin Shell 与 S04 的所有权冲突已消解；
- [x] 文件范围、测试、Bundle、回滚和停止条件已冻结；
- [x] 真实 IAM `/iam/users` 的 1024px Light/Dark/Comfortable 视觉验收已通过并更新报告；Compact 由 Admin 专项 E2E 与 Token 契约覆盖；
- [ ] Chris 已明确批准 S02。

最后一项完成前，只允许评审和文档修订，不得修改 S02 应用代码、共享包、依赖、锁文件或构建配置。
