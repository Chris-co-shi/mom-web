# Web-P2-S03 用户管理

## 范围与编码前自查

- 目标：真实用户目录、详情、创建、编辑、启停、删除、管理员重置密码。
- 基线：Vue 3 / TypeScript / TDesign 1.20.9 / Vue Router / 统一 HTTP Client、主题与中英文资源。
- 新增目录：modules/iam 的 API、局部用例状态、页面与专用操作弹窗、测试；Auth 增加跨模块公开入口。
- 修改：路由登记、导航分组、Locale 资源及实施计划。无新增依赖、后端代码或数据库变更。
- 明确不做：筛选扩展、角色/权限维护、关系分配、批量操作、Excel 导入导出、重置全会话。
- 查询只使用 POST /users/search 的空 params 与服务端分页；ID 保持 String；时间显示 UTC。
- 用户写仍由 UserApplication 的既有本地事务持久化到 mom_auth.auth_user；前端不改变事务、索引、Entity 或删除规则。
- 权限：页面/菜单 auth:user:read；写按钮 auth:user:write，最终以后端 @PreAuthorize 为准。
- 验证：pnpm lint、pnpm typecheck、pnpm test、pnpm build；API/状态/组件失败场景测试与实际可用的 Gateway 联调。

## 设计问题登记

1. 当前后端检出 95c1cb7 没有上次验收的 /me，自助资料源码不在当前 checkout。前端 8de89f9 有 /me 调用。继续用户管理前端实现，不擅自恢复后端。
2. 当前 apiPath 生成 /api/auth，Vite 去掉 /api 到 Gateway /auth；已有 API 测试仍期望 /auth。沿用当前代码，真实生产反向代理映射需确认。
3. 既有删除 API 无 version，请求前读取详情与确认不能提供条件删除保证；删除引用保护交由后端，不假造前端并发保障。

## 实施步骤

1. 对齐 UserController / Request / Response / Gateway。
2. 用户 API、局部状态、明确失败与未知写结果处理。
3. 连续表格表面、分页、操作弹窗、权限与导航。
4. 失败测试、工程门禁、真实联调、交付审查。

状态：前端实现与定向测试完成；真实联调、浏览器视觉及键盘验收未完成。不得视为 Slice 已验收。

## IMPLEMENTATION REVIEW

1. 实现用户列表、分页、详情、创建、编辑、启停、删除与管理员重置密码。行内只保留详情、编辑，低频操作位于详情弹窗；用户 ID 不作为展示名称。
2. 核心实现分为 `api/users-api.ts`、`model/use-user-management.ts`、`pages/UserManagementPage.vue` 与 `components/UserActionDialog.vue`。通过 Auth 公开入口复用权限，不访问其内部实现。
3. 调用链：页面/弹窗 → 局部用例状态 → 用户 API → 统一 HTTP Client → `/api/auth` → Vite 去掉 `/api` → Gateway `/auth` → UserController → UserApplication → Mapper。此处是源码映射；真实已登录链路尚未验证。
4. 数据仍由既有后端写入 `mom_auth.auth_user`；没有新增存储、Token 字段、后端配置或数据库迁移。
5. 事务仍在后端 Application；前端详情读取、写入、列表刷新是独立请求，不保证跨请求原子性。删除接口没有 version，不能宣称具有乐观锁保护。
6. 页面/菜单要求 read 权限，操作入口和提交再次检查 write 权限；后端仍为授权权威。更新沿用详情版本；密码不 Trim、不记录日志，发送后清空。分页使用服务端数据，不虚构筛选条件。
7. 列表使用取消与请求序号防止旧响应覆盖；详情失败禁止使用旧版本提交；写入禁止自动重试、重复提交和写中关闭。409、未知写结果要求明确核对并刷新；保存成功但列表刷新失败分别展示。
8. 本轮没有实现角色/权限维护、关系分配、筛选、批量操作、导入导出、会话集中撤销，也未修复原有 URL 契约差异。
9. 建议亲自 Review：`users-api.ts` 的字段与路径；`use-user-management.ts` 的 submit/readTarget/loadPage；`UserActionDialog.vue` 的重置密码和删除确认；路由与导航的权限过滤。
10. 最可能出问题的位置：当前后端版本缺少 `/me`、开发/生产 URL 映射不一致、删除无版本条件、自身账号启停/删除以及 Token 快照仍有效的既有语义。

## 文件清单

本轮修改：

- `src/layouts/MainLayout.vue`
- `src/locales/zh-CN.ts`、`src/locales/en-US.ts`
- `src/router/route-names.ts`、`src/router/route-meta.d.ts`、`src/router/route-registry.ts`
- `docs/frontend/implementation-plan.md`（只补充本 Slice 状态，保留既有变更）

本轮新增：

- `src/modules/auth/index.ts`
- `src/modules/iam/index.ts`、`routes.ts`、`routes.test.ts`
- `src/modules/iam/api/users-api.ts`、`users-api.test.ts`
- `src/modules/iam/model/user-feedback.ts`、`use-user-management.ts`、`use-user-management.test.ts`
- `src/modules/iam/components/UserActionDialog.vue`
- `src/modules/iam/pages/UserManagementPage.vue`、`UserManagementPage.test.ts`、`user-management.css`
- 本验证记录。

删除文件：无。新增依赖：无。后端修改：无。未执行提交或推送。
工作区已有 architecture、P2-S02、自助账户记录等文档变更不计为本轮实现。

## 验证证据

| 命令/检查 | 结果 |
|---|---|
| `pnpm exec vitest run src/modules/iam` | 4 文件、21 项通过 |
| `pnpm lint` | 通过 |
| `pnpm typecheck` | 通过 |
| `pnpm build` | 通过；IAM 异步 JS 443.81 kB，gzip 119.18 kB |
| `pnpm test` | 64 项中 59 通过、5 失败；非全绿 |
| `git diff --check` | 通过 |
| 开发代理与 Gateway 用户详情匿名 GET | 均返回 401，只证明链路可达，不证明登录及业务成功 |
| 后端 `bash scripts/codex-doctor.sh` | JDK/Docker/静态基线通过，默认 Maven 3.9.0 版本检查失败；本轮无后端修改，未执行 Maven 测试 |
| 真实登录写入及浏览器视觉/键盘验收 | 未执行，缺可用测试身份与一致的后端源码基线 |

全量失败位于既有 `auth-api.test.ts`（4 项）和 `config.test.ts`（1 项）：测试期望 `/auth/...`，当前实现生成 `/api/auth/...`。本轮未修改这些断言、请求配置或 Vite 配置。

21 项定向测试覆盖 API 字段和权限请求、分页乱序、最后一页删除后的分页恢复、详情失败/迟到、版本冲突保留草稿、未知写结果清空密码且不重试、写成功读失败、引用阻止删除、重复提交、提交时权限再次检查、表单校验、真实 TDesign 表格/弹窗和中英文资源。组件测试使用模拟 API，不冒充真实 E2E。

## DESIGN PRESSURE TEST

- A（当前必须）：防止异步旧响应覆盖、防止旧详情版本误写、写失败不自动重试、区分保存成功与刷新失败；已有定向测试。
- A（验收待完成）：确认已验收 `/me` 的后端目录/分支与代理部署契约，使用专用账号验证读写权限、CRUD、409/引用删除失败，并完成明暗主题、视口和键盘检查。
- B（V1 边界）：删除无版本、权限为 Token 快照、重置密码不等于立即撤销所有会话；需要按既有后端语义告知操作者，不能用前端模拟安全保证。
- B（后续）：用户量增长后再按真实查询需求讨论筛选，不提前扩展接口。
- C（当前过度设计）：通用 CRUD 框架、多组织权限平台、审批流、集中会话管理等不属于本 Slice。

## 未完成事项与后续

需要确认已验收自助账户功能所在后端目录/分支，并提供专用测试账号或由用户登录配合验收。不得猜测管理员密码、重置现有管理员、伪造权限或使用 Mock 宣称联调完成。
前端骨架技能促使本轮沿用既有路由、HTTP、权限和双语入口；UI 技能用于保持连续表格表面、柔和圆角与低频操作收纳，没有引入新的设计系统。
本 Slice 尚未验收，暂不推进下一模块或宣称完成 Interview Mode。

## 2026-10-04 续验记录

- 用户报告 `/me` 已合并 main。本轮实际核对本地 HEAD 与 `git ls-remote origin refs/heads/main`，均为 `95c1cb7968a2c8bd5d75f169ad237ee1069b85b9`；AuthenticationController 仍只有 login/logout。运行服务可能来自其他代码位置，需提交号确认，不能把截图当作当前源码证据。
- 已核对浏览器 Auth 路径 `/api/auth`、Vite 去掉 `/api`、Gateway 匹配 `/auth/**` 并 StripPrefix=1。依据这条已有链路修正旧 Auth 测试的精确 URL 预期，保留方法、密码原文、Bearer 等断言；补充空端点、MDM 路径和模块非法路径断言。
- 修改文件：`src/modules/auth/api/auth-api.test.ts`、`src/shared/api/config.test.ts`、`src/shared/api/config.ts`（仅注释）、`docs/frontend/implementation-plan.md`、本记录。新增/删除文件均无；无运行时代码行为、数据库、事务、权限或依赖变更。
- 执行 `pnpm verify`：Lint、类型检查、15 文件 64 项测试、生产构建全部通过。上述上一轮 5 项失败已解决，不代表真实业务验收通过。
- 执行 `git diff --check` 通过；doctor 仍因默认 Maven 3.9.0 不满足 >=3.9.9 失败，本轮无后端改动，未运行 Maven。
- 浏览器直接访问 `/iam/users`，正确跳转到 `/login?redirect=/iam/users`；目前没有已登录标签页，已请用户在内置浏览器登录，不要求在聊天中提供密码。
- 未完成：已登录 CRUD、权限与冲突真实验收，以及用户管理页视觉、键盘、多视口和主题检查。没有操作任何真实账户。
- Review 重点：Auth 精确 URL 断言、模块路径边界、Vite 与 Gateway 的转换关系。技能要求将工程测试与真实验收分开记录，未用模拟 API 替代后者。
- DESIGN PRESSURE TEST：A—运行服务与当前源码基线必须对齐；A—System 当前 `/api/system` 经通用去前缀代理后成为 `/system`，与 Gateway `/api/system/**` 不一致，System 开始前必须处理，本轮未更改路由；B—生产反向代理必须明确路径转换，Vite 开发行为不是生产部署证据；C—无需为此次契约核对引入新的请求框架。

## 2026-10-05 用户表单交互调整

用户确认的交互：详情只读；编辑表单状态按钮即时启停；删除放在编辑表单操作区，超过三个操作时收纳到“更多操作”；创建按钮采用柔和圆角与轻量加号。

- 修改：`src/modules/iam/components/UserActionDialog.vue`、`src/modules/iam/model/use-user-management.ts`、`src/modules/iam/pages/UserManagementPage.vue`、`user-management.css`、中英文资源以及模型/组件测试。本次无新增、删除文件，无新增依赖或后端改动。
- 实际调用链：编辑状态按钮 → `toggleEnabled` → `PUT /api/auth/users/{id}/enable|disable` → Gateway/Auth；返回的用户资料更新局部版本和列表行。显示名草稿保留，用户仍需单独保存，避免把即时状态写入误认为整张表单已保存。
- 更多操作仅显示重置密码和删除；删除进入原有二次确认表单，选择菜单项不发送删除请求。详情只显示状态标签和关闭按钮；创建状态随创建请求提交。
- 写入失败维持原状态并呈现后端错误；冲突、结果未知与用户不存在禁止直接重试，须读取最新详情。权限仍由既有前端门禁和后端校验共同约束，事务与最终写入 `mom_auth.auth_user` 的位置未变。
- `pnpm verify` 通过：Lint、类型检查、15 个测试文件共 68 项测试、生产构建均通过。`git diff --check` 通过。测试新增即时启停保留草稿、冲突阻止重试、更多操作进入删除确认与详情只读。
- 当前内置浏览器登录标签已不在可访问的本轮浏览器会话中；未宣称这版的真实浏览器视觉验收或真实启停请求再次通过。2026-10-05 旧版真实启停证据只覆盖调整前交互。

### IMPLEMENTATION REVIEW 与压力测试补充

最值得 Review：即时启停成功后目标版本与显示名草稿的关系、冲突后重读语义、更多操作到删除确认的路径、亮暗主题状态对比度。A：如果启停请求结果未知，必须停在核对状态；A：状态写成功而显示名仍是草稿时，关闭表单会丢弃草稿，界面已标明分开保存；B：后端删除无版本条件，仍需核对目标；C：为本页引入第二套表格库属于当前过度设计。

## 2026-10-05 管理页基线收口

用户按实际页面截图提出最后两处调整：弹窗关闭按钮应固定于右上角；启停不应位于编辑表单，应从表格状态列点击后独立保存。上述旧记录保留为历史，本节是当前生效的交互基线。

- 弹窗头部标题居左，VXE 关闭按钮靠右；编辑表单只修改显示名，详情中的状态仍为只读摘要。创建用户默认启用。
- 有写权限时状态列显示可点击的 VXE 按钮；只读权限只显示标签。启停调用原有版本条件接口，成功时更新服务端返回的行与版本，不打开编辑弹窗。
- 写入冲突或结果不明时保持原行状态、禁用再次点击，并提供刷新核对入口；刷新成功后恢复操作，刷新失败不解除阻断。删除与重置密码仍维持确认流程。
- 后续 PC 管理页参照 `docs/frontend/design-system.md` 的管理页基线；业务状态能否即时切换必须逐项确认，不由 UI 范式决定。

## 2026-10-05 列表与保存遮罩补充

- 用户列表的首次加载、刷新、翻页、页大小变化及写入后重读共用 `loadPage` 的 `loading` 状态，列表区域显示 VXE Loading 遮罩和本地化文案；请求成功或失败均解除。遮罩期间列表工具、行操作与分页不可重复操作。
- 弹窗写入期间使用 `saving` 驱动局部 VXE Loading 遮罩，关闭和提交按钮禁用；用例层 `canSubmit`/`saving` 仍负责拒绝重复写入，失败后解除遮罩并保留错误反馈。

## 2026-10-05 弹窗外壳纠偏

实际页面截图显示编辑弹窗标题栏与关闭按钮错位。原因是业务弹窗覆盖了 VXE 的整个 `header` 插槽，又在其内自绘标题和关闭按钮，和组件库的固定头部尺寸冲突。已将标题布局交还 VXE，项目级 `MomModal` 只通过右侧 `corner` 位放置可访问的关闭按钮，并统一头部尺寸、主题、焦点与保存遮罩；IAM 弹窗仅保留业务内容。结构测试覆盖原生标题区、右侧关闭位及保存禁关；未进行浏览器视觉验收。
