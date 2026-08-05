# MOM-Web S04A Admin 页面布局契约实施报告

> 日期：2026-08-04  
> 阶段：MOM Platform P1.6 / S04A  
> 授权：Chris 已批准 S04 前置评审并授权 S04A  
> Review：**Accepted · Chris Review 2026-08-04**  
> 结论：**ACCEPTED / E2E FOLLOW-UP REGISTERED**

## 1. 总体结论

S04A 已按批准边界完成 Admin 页面布局契约：新增应用私有的筛选条、内容分区和主从布局，六个现有 IAM 任务页统一采用这些契约；Admin Comfortable/Compact 页面外边距从权威 Token Source 冻结为 24px/20px。

本切片没有修改 Router、导航、Vben Shell、认证、API、Permission、DTO 或后端。导航重组、Tabbar 删除和 MOM Shell 仍属于 S04B，不能因本报告自动进入实施。

实现已通过组件、契约、类型、样式、构建与 Bundle 基线。新浏览器标签页因既有认证契约只在当前标签页保存会话，访问已登录页面时回到登录页，因此本报告不把匿名页 Token 检查冒充为 Codex 独立的已认证六页面截图证据。Chris 已在登录后明确完成 Review 并批准 S04A；本切片据此转为 Accepted，自动化视觉矩阵继续作为 S04D 前必须关闭的证据项。

## 2. 实施内容

### 2.1 Admin 私有布局组件

新增 `apps/mom-admin/src/layouts/page/`：

- `AdminFilterBar`：提供 `role=search`、显式可访问名称、筛选字段区、相邻动作区和原生提交语义；只发出 `submit`，不拥有筛选模型或请求；
- `AdminContentSection`：使用具名 `section + h2` 表达平面内容区，支持局部动作，不引入业务 Card 语义；
- `AdminMasterDetail`：无选中对象时只渲染目录；有选中对象时才渲染详情，并依据实际内容容器宽度通过 Container Query 切换单/双栏；
- `index.ts`：仅作为 Admin 应用内公开入口，不提升到 `@mom/common-ui`。

验证脚本新增边界门禁，禁止这三个组件依赖 `@mom/access`、`@mom/api-client`、`@mom/iam-admin`、Router 或应用 Runtime。

### 2.2 六页面采用结果

|页面|布局结果|主操作与局部操作|
|---|---|---|
|用户与授权|Filter + Master/Detail + 两个 Content Section|新增用户留在 `Page.actions`；查询与筛选相邻；未选择用户时目录满宽|
|角色配置|Master/Detail + 两个 Content Section|新增角色从目录 Card 迁回 `Page.actions`；未选择角色时不渲染空详情|
|Permission 目录|单一 Content Section|刷新保留为目录局部操作|
|Session 管理|Filter + Content Section|查询使用表单提交；撤销仍为行操作|
|安全审计|Filter + Content Section|查询使用表单提交|
|OAuth Client|Content Section|审计原因仍是命令上下文，不错误伪装为筛选器|

被替代的 `.filter-card`、`.split-grid`、`.split-grid--single`、`.directory-card` 和相关媒体查询已删除。客户端命令上下文、编辑器字段宽度等业务局部样式保持不变。

### 2.3 Token

仅修改 `mom.tokens.json` 权威源并重新生成四个产物：

|渠道密度|旧值|新值|
|---|---:|---:|
|Admin Comfortable|20px|24px|
|Admin Compact|16px|20px|

未在页面或组件硬编码第二套 Gutter。

## 3. 明确未实施

- People & Access / Security Operations 导航重组；
- MOM Admin Shell、Header、Sidebar、Breadcrumb 或 Tabbar 删除；
- Router Registry、Guard、Core Route 或 Catalog；
- Vben 应用级引用删除或 Workspace 源码删除；
- `App.vue` 业务模块拆分；
- IAM API、错误语义、高风险确认、权限模型或 DTO 变更；
- Empty/No Result 等业务状态策略重写；现有全局 Forbidden 与错误处理保持，模块级状态完善仍随 S06 业务模块化实施；
- Portal 或 Mobile 变更；
- 新生产依赖。

## 4. 验证结果

|验证|结果|
|---|---|
|`pnpm validate`|通过；含新增布局存在性和依赖边界门禁|
|`pnpm lint`|通过|
|`pnpm stylelint`|通过；Token 样式治理无新增例外|
|`pnpm tokens:check`|通过；4 个生成物无漂移|
|`pnpm check:type`|14 个 MOM Workspace 范围全部通过|
|`pnpm test`|通过；31 个 Auth/API/IAM 契约、2 个 Admin Runtime、9 个 Admin UI、15 个 Unit 测试|
|`pnpm test:component`|通过；3 个文件、20 个测试，含 3 个 Admin 布局契约测试|
|`pnpm build`|三应用通过|
|`pnpm bundle:check`|Baseline 通过；公开 Source Map 为 0|
|Admin 隔离 E2E 子集|通过；AuthShell 1024/1280/1600 与强制改密深链 2/2|
|浏览器只读 Token 检查|通过；Admin/Comfortable 为 24px，登录页无横向溢出|

本机 Node 为 25.9.0，所有 pnpm 命令均出现预期 Engine 警告；正式 CI Node 24 仍是最终证据来源。

## 5. 未关闭证据与既存风险

### 5.1 已认证页面视觉 Review 与自动化证据

Chris 已确认登录并批准当前页面视觉结果，产品 Review 已关闭。Codex 新浏览器标签页访问 `/iam/users` 时仍按当前 `sessionStorage` 会话隔离契约重定向到登录页，因此尚未取得以下独立自动化证据：

- 1024/1280/1600 下六页面布局；
- 选中用户/角色后的 Container Query 单/双栏；
- Light/Dark、Comfortable/Compact；
- 200% 文本缩放下表格、筛选器和详情操作换行。

关闭条件：在 S04D 前通过可复用认证状态或受控 E2E Fixture 自动验证上述矩阵；不得在测试代码中硬编码 Chris 凭据，也不得弱化当前标签页会话隔离契约。

### 5.2 全量 E2E 环境不是绿色

默认端口执行得到 20 passed / 5 failed / 5 skipped：本机 `5556` 已有 Admin Vite 服务，Supplier 项目命中了 Admin 页面；Admin Dark 根状态已变化但认证页 Antdv 输入框仍为白色，属于既有主题桥缺口。

隔离端口执行时 Supplier/Customer 正常，但 Admin 在 `6555` 下 Bootstrap 为空，得到 19 passed / 6 failed / 5 skipped。使用实际 Admin `5555` 独立执行与 S04A 相关的匿名响应式/深链子集为 2 passed。

本切片未修改 Playwright 编排、Admin Theme Provider 或 Bootstrap，不通过改断言掩盖问题。完整 E2E 绿色必须在 S04C/S04D 前关闭；当前不能宣称 S04A 已完成全部视觉验收。

### 5.3 Bundle 遗留

Baseline 通过，但 Admin 最大 Chunk 仍约 1.32 MB minified，超过最终 500 KB 目标。该 Chunk 来自尚未退出的 Vben/Editor 依赖面，归属 S04C/S05，不在 S04A 通过调整门限规避。

## 6. 回滚

1. 六页面恢复原 Card、筛选和 `.split-grid` 组合；
2. 删除 `layouts/page` 三个应用私有组件及相应测试/验证规则；
3. Admin Gutter Token 恢复 20px/16px并重新生成产物；
4. Router、认证、Vben Shell 和业务命令无需回滚，因为本切片未触及。

## 7. Review 建议

Chris 已对 S04A 给出 **Accept**：

- S04A 状态为 `Accepted`；
- 下一轮可单独开展 S04B 编码前自查；
- S04A 的通过不授权 S04C、S05 或业务模块化。
