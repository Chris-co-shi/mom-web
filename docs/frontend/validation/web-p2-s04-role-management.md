# Web-P2-S04 角色管理

## 范围与编码前自查

- 目标：按已验收用户管理页的 PC 交互基线，实现角色目录、详情、创建、编辑、启停和删除。
- 所有权：角色及 User-Role、Role-Permission 引用均由 Auth 服务持有；Web 仅调用现有 API，不改数据库、事务、权限或 Token。
- 契约：Gateway `/auth/**` 去掉首段转发；角色 Controller 使用 `/roles`，`search` 只接受空 `params` 与服务端分页，按 `code,id` 排序。创建含 `code/name/description/enabled`；编辑只含 `name/description/enabled/version`；启停使用 `version`；删除不带版本，关联存在时后端拒绝。
- 复用：统一 HTTP Client、Auth 权限入口、PageContainer、VXE 表格和 `MomModal`；角色特有的状态与错误语义保留在 IAM 模块，不建万能 CRUD。
- 不做：角色权限关系分配、用户角色关系分配、服务端尚不支持的关键词/状态搜索、批量操作、权限热更新、后端代码或生产依赖。
- 验证：角色 API/状态/组件定向测试，`pnpm verify`，`git diff --check`。模拟 API 测试不算真实联调。

## DESIGN ISSUE

角色停用将影响后续登录和新关系分配，但 V1 不撤销已签发 Token。若像普通用户状态一样单击即提交，管理员可能误停用关键角色。建议及本轮实现：状态列仍提供入口，但进入 `MomModal` 核对角色编码、名称、当前状态与 Token 语义后，确认才写入。当前方案可实现：**YES**。不额外阻断特定角色编码，避免前端自造安全规则；后端授权仍为最终权威。

## 实施与证据

- 调用链：角色页面/弹窗 → `useRoleManagement` → `roles-api` → 统一 HTTP Client → `/api/auth/roles/**` → Vite `/api` 转换 → Gateway `/auth/**` → Auth `RoleController` → `RoleApplication` → `mom_auth` 角色表。
- 页面和菜单仅对 `auth:role:read` 可见；写入口和提交再检查 `auth:role:write`，最终由后端 `@PreAuthorize` 授权。
- 列表/详情使用 AbortController 与序号防乱序；写入防重复和禁关，不自动重试。冲突锁定当前提交，要求读取最新资料核对；未知写结果即使关闭弹窗也保持页面级写阻断，列表重读成功后才解除，管理员仍须自行核对是否已生效。保存成功而列表读取失败分开反馈。
- 删除先读取详情并确认；没有条件删除能力，不能声称前端确认提供并发保证。引用保护由后端完成。
- 列表首次加载、刷新、翻页、页大小切换和写后重读显示局部遮罩；弹窗保存显示局部遮罩。角色创建默认启用；编码创建后不可编辑。
- 视觉沿用用户管理页的层级、间距、圆角、表格密度与双语文案。公共弹窗直接复用 VXE 原生标题区的 `MomModal`，没有自绘第二套框架。

## 验收状态

前端实现与自动化测试完成：`pnpm exec vitest run src/modules/iam/api/roles-api.test.ts src/modules/iam/model/use-role-management.test.ts src/modules/iam/routes.test.ts` 通过 16 项；角色页面 5 项组件测试通过；`pnpm verify` 通过，18 个测试文件、95 项测试全绿，Lint、类型检查和生产构建通过；`git diff --check` 通过。构建仍有超过 500 kB 的既有共享 VXE 资源警告。

真实已登录 Gateway/Auth 读写、明暗主题、多视口和键盘视觉验收未执行，不能宣称 S04 已最终验收。用户此前要求写完后停止，不在本轮反复操作测试页面。

## 2026-10-05 角色页视觉一致性修正

用户页面截图显示角色页按钮呈组件库默认方角、品牌按钮为深色文字、状态和操作列呈默认边框按钮，与已验收的用户页不同。原因是角色页使用 `VxeButton` 后只复用了按原生按钮编写的低优先级样式，VXE 的 `type--button`/文字色/圆角规则覆盖了 MOM Token。角色页现显式使用 VXE `round` 与 `mode="text"` 语义，集中在角色页样式映射 VXE 状态类；刷新/创建与弹窗操作按用户页圆角和品牌色，状态显示圆点，行操作恢复轻量文字形态。没有改变用户页或角色业务调用链。
