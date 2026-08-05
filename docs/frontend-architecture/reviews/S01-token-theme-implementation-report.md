# MOM-Web S01 Token 与主题实施报告

> 执行日期：2026-08-03  
> 授权：Chris 明确批准 [S01 前置评审](S01-token-theme-preflight-review.md)  
> 前置：S00 Completed，ADR-013/ADR-016 Accepted  
> 执行结论：**COMPLETED — LOCAL QUALITY GATES PASS**  
> 下一状态：停在 S02 前，等待独立 Review 与批准

## 1. 结论

S01 已建立一个机器可读的 Token 权威源，确定性生成 CSS Variables、Tailwind 4 语义映射、Ant Design Vue Theme Adapter 和 TypeScript 契约；三应用分别拥有独立 Theme Runtime，并支持 `LIGHT / DARK / SYSTEM`。Admin 支持 Comfortable/Compact，Portal 固定 Comfortable 且在 360px 认证入口不再强制桌面宽度。

本结论不表示 System Preference 已接入，也不表示 Bundle 严格产品目标完成。2026-08-04 已通过真实 Gateway/IAM 登录完成 `/iam/users` 的 1024px Light/Dark 人工视觉复核：真实列表、筛选、主要操作和详情空状态均正常，无横向溢出，浏览器控制台无 error。Compact 当前没有用户可操作入口，因此不伪造“人工已测”；其根属性、Antdv Adapter 和 32px 控件契约继续由 Admin 专项 E2E 与 Token 单元测试证明，用户偏好入口仍由 S07 建设。

## 2. 已完成范围

### 2.1 Token 单一来源

- `packages/design-tokens/tokens/mom.tokens.json` 是唯一手工维护值；
- Token 分为 Primitive、Semantic、Component、Channel；
- Node 内置模块生成四类输出，不新增 Style Dictionary 或第二套构建能力；
- Semantic Color 必须引用 Primitive，未知引用、循环引用、非法主题和 Portal Compact fail closed；
- `tokens:check` 在内存重生成后逐字比较四个仓库生成物，不再使用 S00 的文件哈希冻结；
- 自动校验正文、状态色/状态面、主操作与焦点环对比度；
- Tailwind 映射使用 `mom-` 语义前缀，不覆盖 Vben 通用 Theme 名称。

### 2.2 Theme Runtime

- 公共状态固定为 `MomThemeMode`、`MomResolvedTheme`、`MomDensity`、`MomChannel`；
- Runtime 是纯 DOM 状态机，不依赖 Vue、Pinia、Router、API、用户身份或持久化；
- Vue 挂载前同步 `data-mom-*`、`color-scheme` 和迁移期 `.dark`；
- `SYSTEM` 监听 `prefers-color-scheme`，监听器可销毁；
- Portal 收到 Compact 时回退 Comfortable 并产生可测试诊断；
- 没有新增 localStorage/IndexedDB/Token 访问，真实用户偏好恢复仍由 S03 负责。

### 2.3 三应用接入

- Admin 由 Vben `light/dark/auto` 与 Compact 状态单向驱动 MOM Runtime；
- Admin Antdv 默认使用生成 Adapter，保留 `VITE_MOM_THEME_PROVIDER=legacy` Provider 回滚入口；
- Supplier/Customer Portal 分别创建 Runtime 与 Root Provider，不共享 Store 或 Runtime 实例；
- Portal 提升 Workspace 已有 Tailwind 4 和 `@mom/design-tokens` 为直接依赖，没有新增外部生产包或升级版本；
- Portal 继续全量注册 Antdv，按需注册和 Bundle 优化仍属于 S02。

### 2.4 可见样式与示范页

- `/iam/users` 的筛选宽度、详情编辑区、页面间距和公共 Page 使用 Semantic/Channel Token；
- 两个 Portal 当前认证入口和已有骨架从硬编码色值迁移到语义 Token；
- Portal Auth 在 360px 下使用单列布局，无 1080px 强制宽度；
- 暗色状态色冻结为 Success `#34D399`、Warning `#FBBF24`、Danger `#F87171`；
- 新增样式治理门禁，MOM 自有应用和 `common-ui` 只剩一个精确登记的历史 inline style，归 S06 删除；
- 未创建新路由、菜单、组件库 Shell 或 Future 页面。

## 3. 明确未做

- 未接入 Preference、Dynamic I18n、ETag、409 或用户隔离缓存；
- 未修改 IAM/System API、DTO、权限、Token Claim、Gateway-only 或 403 单飞语义；
- 未新增主题设置页面或 Portal Theme Toggle；
- 未建设 Page/DataState/ActionBar/ConfirmAction、Lucide Registry 或新 Shell；
- 未拆分大型 `App.vue`，未迁移 `@mom/iam-admin`；
- 未删除 Vben、全量 Antdv 注册或任何认证入口；
- 未修改 `mom-platform`、`mom-mobile`；未提交、推送或创建 PR。

## 4. 关键实现契约

|契约|实现|
|---|---|
|权威源|`packages/design-tokens/tokens/mom.tokens.json`|
|生成命令|`pnpm tokens:generate`|
|漂移门禁|`pnpm tokens:check`，四输出零差异|
|Theme 默认|Light / Comfortable|
|Theme 模式|`LIGHT / DARK / SYSTEM`|
|Admin 密度|Comfortable 36px / Compact 32px|
|Portal 密度|Comfortable 44px；Compact fail closed|
|根属性|`data-mom-theme-mode/theme/density/channel`|
|Vben 兼容|单向状态桥和 `.dark`；S04 删除|
|回滚|`VITE_MOM_THEME_PROVIDER=legacy` + Slice 级代码回退|
|持久化|S01 无新增持久化；S03 注入可信用户偏好|

## 5. 测试与视觉证据

### 5.1 自动测试

- Token Source 四层、两主题、Portal 密度边界；
- 四个生成物权威来源标记；
- Antdv Adapter 的 Light/Dark、Admin/Portal、Comfortable/Compact 映射；
- Runtime 根属性、Dark 类、System 媒体变化、监听销毁和应用隔离；
- 三应用真实开发入口根契约、Dark Provider 生效和密度；
- 两个 Portal 360px 横向溢出；
- 既有 29 个认证/API/Portal 安全契约、2 个 Admin Runtime 和 7 个 UI 回归测试保留。

### 5.2 视觉抽查

|场景|结果|说明|
|---|---|---|
|Supplier Portal 360px Light Auth|PASS|单列、表单标签、焦点和触控尺寸可用，无横向溢出|
|Supplier Portal 1280px Dark Auth|PASS|Canvas/Card/Input/文本由同一 Theme Provider 更新|
|Customer Portal|PASS（E2E 等价契约）|与 Supplier 使用相同 Token/Provider 契约但独立实例|
|Admin 匿名 Auth|PASS（E2E）|Light/Dark 与 Comfortable/Compact 根契约和 Antdv Input 生效|
|Admin `/iam/users` 已认证视觉|PASS（Light/Dark + Comfortable）|真实 Gateway/IAM 登录；1024×800；列表、筛选、主要操作和空详情区可见；`scrollWidth = viewportWidth = 1024`；控制台 error 为 0|
|Admin Compact 密度|PASS（自动契约）|`shell-smoke.spec.ts` 的 Admin 项目验证 Light/Comfortable 切换到 Dark/Compact；Token 测试验证 32px 控件高度。当前无用户可操作入口，人工切换延后到 S07|

## 6. Bundle 结果

S01 保持 S00 baseline 门禁通过；测量仍使用 manifest 静态闭包和 Node level 9 gzip：

|应用|初始 JS gzip|最大 minified JS|Source Map|Baseline|
|---|---:|---:|---:|---|
|Admin|约 80.3 KB|约 1,325.9 KB|0|PASS|
|Supplier Portal|约 440.1 KB|约 1,450.2 KB|0|PASS|
|Customer Portal|约 440.1 KB|约 1,450.2 KB|0|PASS|

严格目标仍未完成：Portal 初始 250 KB 与单 Chunk 500 KB、Admin 单 Chunk 500 KB 继续为红灯。Portal 全量 Antdv 的缺口由 S02 治理，Admin Vben Chunk 由 S04/S05 治理；没有提高产品目标或把 baseline 通过描述为性能达标。

## 7. 验证命令

正式门禁使用 Node 24.0.0 与 pnpm 11.7.0：

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
pnpm test:e2e
```

严格目标单独审计并预期失败：

```bash
pnpm bundle:target
```

2026-08-04 的补充验收执行：

```bash
pnpm exec playwright test tests/e2e/shell-smoke.spec.ts --project=mom-admin-chromium
```

结果为 2 passed、1 skipped。三项目同跑时，Supplier 项目被本机 5556 端口上已存在的 Admin 实例错误复用而出现渠道断言失败；该运行不作为代码回归通过证据，也未停止或重建用户已有进程。

## 8. 风险与后续

- Admin 仍存在 Vben Preferences/Styles/Shell，双栈仅由单向桥约束；S04 前不得增加新的 Vben 主题消费者；
- S01 没有用户偏好持久化。S03 必须以 `clientId + userId` 隔离、版本/ETag 和失败可见语义接入；
- 两个 Portal 的 Theme/Style 结构仍有重复，S11 才做渠道骨架去重；
- 一个 Roles 页面 inline style 保留在精确例外台账，S06 必须删除；
- `/iam/users` 的 1024px Light/Dark/Comfortable 真实视觉缺口已关闭；Compact 的用户可操作入口仍属于 S07，S02 不得为通过验收而提前建设 Preference；
- S02 未经 Chris 独立批准不得开始。

完成本报告后停止在 S02 前。
