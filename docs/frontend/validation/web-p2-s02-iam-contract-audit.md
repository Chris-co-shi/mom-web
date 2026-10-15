# Web-P2-S02 IAM 管理与当前会话契约审计

> 2026-10-04 契约修订：本文记录首次 S02 的历史决策。下文“只返回 Token 快照”、不查用户表、
> 保存权限到 sessionStorage、顶部展示 userId 的描述均已被用户否决并替换。
> 当前有效契约与验证结果以[账户自助收口记录](web-p2-account-self-service.md)为准；管理 API 审计仍有效。

- 日期：2026-10-04
- 状态：**已完成**
- 审计范围：Gateway、Mini Auth V1 Controller、Request/Response、Application、Security 与分页协议

## 1. 审计结论

现有 IAM 管理 API 已经覆盖用户、角色、Permission 及两类关系分配，可以作为后续真实页面的唯一数据源。
浏览器统一通过 Gateway 的 `/auth/**` 访问，Gateway 使用 `StripPrefix=1` 转发到 Auth；前端不应直连
Auth Server，也不应重复拼接服务内部路径。

Mini Auth 使用 Redis-backed Opaque Token，前端不能解析；因此本 Slice 已按确认后的方案 A 新增
`GET /auth/me`，只返回 `userId`、`authorities`、`expiresAt`，作为路由、菜单和按钮可见性的唯一前端来源。

## 2. Gateway 与认证边界

| 浏览器路径 | Auth 路径 | 说明 |
|---|---|---|
| `POST /auth/login` | `POST /login` | 公开登录，Gateway 单独限流 |
| `POST /auth/logout` | `POST /logout` | 需要有效 Bearer Token |
| `/auth/**` | 去掉 `/auth` 前缀后的路径 | Auth 常规 API，Gateway 统一限流 |

- Gateway 不解析或二次认证 Bearer Token，只负责路由、限流和原样转发；
- Auth Resource Server 通过 Redis 校验 Opaque Token；
- Token Principal 只有 `userId`、`authorities`、`expiresAt`；
- authorities 是登录时快照，角色或 Permission 变更不会刷新已签发 Token；
- 用户停用、角色停用、Permission 停用和密码重置均不会主动撤销既有 V1 Token；
- 注销只删除当前 Token，不是“注销该用户所有会话”。

## 3. IAM 管理 API

以下均为浏览器经 Gateway 使用的外部路径。

### 3.1 用户

| 方法与路径 | 权限 | 请求关键字段 | 成功数据 |
|---|---|---|---|
| `POST /auth/users` | `auth:user:write` | `username`、`password`、`displayName`、`enabled` | `UserResponse`，HTTP 201 |
| `POST /auth/users/search` | `auth:user:read` | `PageQuery<{}>` | `PageResult<UserResponse>` |
| `GET /auth/users/{id}` | `auth:user:read` | — | `UserResponse` |
| `PUT /auth/users/{id}` | `auth:user:write` | `displayName`、`enabled`、`version` | `UserResponse` |
| `PUT /auth/users/{id}/password` | `auth:user:write` | `newPassword`、`version` | `UserResponse` |
| `PUT /auth/users/{id}/enable` | `auth:user:write` | `version` | `UserResponse` |
| `PUT /auth/users/{id}/disable` | `auth:user:write` | `version` | `UserResponse` |
| `DELETE /auth/users/{id}` | `auth:user:write` | — | `null` |
| `GET /auth/users/{id}/roles` | `auth:user:read` | — | `RoleResponse[]` |
| `PUT /auth/users/{id}/roles` | `auth:user:write` | `roleIds`，最多 200 个 | `RoleResponse[]` |

`UserResponse`：`id`、`username`、`displayName`、`enabled`、`version`、`createdAt`、`updatedAt`。
用户 ID 必须始终按字符串处理。用户名创建时会去除两端空白并转为小写，前端不应另建不同的归一化规则。

### 3.2 角色

| 方法与路径 | 权限 | 请求关键字段 | 成功数据 |
|---|---|---|---|
| `POST /auth/roles` | `auth:role:write` | `code`、`name`、`description?`、`enabled` | `RoleResponse`，HTTP 201 |
| `POST /auth/roles/search` | `auth:role:read` | `PageQuery<{}>` | `PageResult<RoleResponse>` |
| `GET /auth/roles/{id}` | `auth:role:read` | — | `RoleResponse` |
| `PUT /auth/roles/{id}` | `auth:role:write` | `name`、`description?`、`enabled`、`version` | `RoleResponse` |
| `PUT /auth/roles/{id}/enable` | `auth:role:write` | `version` | `RoleResponse` |
| `PUT /auth/roles/{id}/disable` | `auth:role:write` | `version` | `RoleResponse` |
| `DELETE /auth/roles/{id}` | `auth:role:write` | — | `null` |
| `GET /auth/roles/{id}/permissions` | `auth:role:read` | — | `PermissionResponse[]` |
| `PUT /auth/roles/{id}/permissions` | `auth:role:write` | `permissionIds`，最多 200 个 | `PermissionResponse[]` |

`RoleResponse`：`id`、`code`、`name`、`description`、`enabled`、`version`、`createdAt`、`updatedAt`。

### 3.3 Permission

| 方法与路径 | 权限 | 请求关键字段 | 成功数据 |
|---|---|---|---|
| `POST /auth/permissions` | `auth:permission:write` | `code`、`name`、`description?`、`enabled` | `PermissionResponse`，HTTP 201 |
| `POST /auth/permissions/search` | `auth:permission:read` | `PageQuery<{}>` | `PageResult<PermissionResponse>` |
| `GET /auth/permissions/{id}` | `auth:permission:read` | — | `PermissionResponse` |
| `PUT /auth/permissions/{id}` | `auth:permission:write` | `name`、`description?`、`enabled`、`version` | `PermissionResponse` |
| `PUT /auth/permissions/{id}/enable` | `auth:permission:write` | `version` | `PermissionResponse` |
| `PUT /auth/permissions/{id}/disable` | `auth:permission:write` | `version` | `PermissionResponse` |
| `DELETE /auth/permissions/{id}` | `auth:permission:write` | — | `null` |

`PermissionResponse` 与 `RoleResponse` 字段结构一致。当前 IAM 管理页面需要的稳定权限码是：

- `auth:user:read`、`auth:user:write`；
- `auth:role:read`、`auth:role:write`；
- `auth:permission:read`、`auth:permission:write`。

`PLATFORM_ADMIN` 没有硬编码旁路，仍通过显式 Permission 获得能力。前端也不得基于角色编码实现管理员特权。

## 4. 分页、并发与关系规则

分页查询请求必须显式发送：

```json
{
  "params": {},
  "pageNo": 1,
  "pageSize": 20
}
```

`params` 不能省略或传 `null`；`pageNo` 从 1 开始，`pageSize` 必须为正数且不能超过后端配置上限。
响应统一为 `records`、`pageNo`、`pageSize`、`total`、`totalPages`。当前三个目录没有搜索过滤条件，
前端不能自行假设 keyword、status 等字段。用户按 `username,id`，角色和 Permission 按 `code,id` 稳定排序。

- 更新、启停和密码重置必须提交最近读取的 `version`；409 后不能静默覆盖，应刷新数据后让用户重试；
- 用户角色和角色 Permission 使用“整体替换”语义，不是增量追加；重复 ID 会由后端去重；
- 只能分配已存在且启用的角色或 Permission；
- 用户有角色引用、角色有用户或 Permission 引用、Permission 有角色引用时，删除会被拒绝；
- 关系替换在 Application 本地事务中完成，前端不得将其拆成多个并行写请求。

## 5. 失败契约

| HTTP | 稳定 code 或类别 | 前端行为 |
|---|---|---|
| 400 | `request.validation_failed` | 映射 `data[]` 中的字段错误 |
| 400 | `request.invalid_body` | 显示请求格式错误，不重试写请求 |
| 400 | `request.pagination_invalid` | 修正分页参数后重新查询 |
| 400 | `auth.relation_selection_too_large` | 保留选择并提示最多 200 个 |
| 401 | `AUTHENTICATION_REQUIRED` / `auth.invalid_credentials` | 前者清理会话；后者只用于登录反馈 |
| 403 | `ACCESS_DENIED` / `auth.account_disabled` | 前者展示无权限；后者只用于登录反馈 |
| 404 | `auth.resource_not_found` | 提示资源已不存在并刷新列表 |
| 409 | 唯一冲突、引用冲突、禁用关系、乐观锁冲突 | 保留用户输入，按 code 给出可恢复动作 |
| 429 | Gateway 限流 | 禁止自动重放写请求，提示稍后重试 |
| 503 | `auth.authentication_service_unavailable` / `auth.token_store_unavailable` | 显示服务暂不可用，不伪造成功 |

## 6. 已决策：当前会话读取契约

**问题**：前端不能从 Opaque Token 读取 `userId` 和 authorities，登录响应也不包含这些字段，后端不存在
当前会话查询端点。

**影响**：页面刷新后虽然能恢复 Token，但不能可靠恢复当前用户展示信息、权限菜单、路由和按钮状态。
直接按角色编码或固定管理员权限渲染会形成安全语义漂移。

采用方案 A：新增 `GET /auth/me`，只返回 Token 快照。

```json
{
  "userId": "字符串 ID",
  "authorities": ["auth:user:read"],
  "expiresAt": "RFC 3339 时间点"
}
```

- 数据直接来自已验证的 `BearerTokenAuthentication` / `MomTokenPrincipal`，不额外查数据库；
- 与 V1“Token 是登录时权限快照”的语义一致，Redis 或 Auth 不可用时继续 fail-closed；
- 页面如需显示名，可使用 `userId` 调用已有 `GET /auth/users/{id}`，但该请求要求 `auth:user:read`，
  因而普通无用户读取权限的账号无法得到显示名。

未采用方案 B：返回 Token 快照和最小显示资料。

```json
{
  "userId": "字符串 ID",
  "username": "operator",
  "displayName": "操作员",
  "authorities": ["auth:user:read"],
  "expiresAt": "RFC 3339 时间点"
}
```

- 用户菜单体验完整，不依赖 `auth:user:read`；
- 需要 Auth 查询用户表，并明确“Token 仍有效但用户已停用/删除”与数据库不可用时的失败语义；
- 返回的 authorities 仍必须来自 Token 快照，不能悄悄改成实时权限，否则会改变 ADR-040 的 V1 语义。

未采用方案 C：只扩展登录响应。

- 实现改动最小，但只能覆盖刚登录；刷新后只能信任浏览器缓存，无法用服务端重新建立当前会话上下文；
- 不能独立满足 P2-S02，除非同时接受前端在整个 Token 生命周期内使用本地快照。

## 7. 实现结果

- Auth `GET /me` 直接读取已经验证的 `BearerTokenAuthentication`，不解析 Header、不访问数据库；
- 登录后必须完成 `/me` 同步才建立完整前端会话，刷新恢复时也会重新同步一次；
- Token、`userId`、authorities 和 `expiresAt` 保存在当前标签页 `sessionStorage`；
- `hasAuthority` / `hasAuthorities` 是路由、菜单和 `AuthorityGuard` 的统一权限判断入口；
- 路由缺少权限进入 403；`/me` 401 清理会话；网络、超时、429 或 5xx 进入离线页并保留 Token；
- Vite 开发代理按真实 Gateway 契约分别转发 `/auth` 与 `/api`，不重写 bounded context path；
- 主布局只展示稳定 `userId`，不伪造 username 或 displayName。

## 8. 验证证据

| 验证 | 结果 |
|---|---|
| Auth Controller 定向测试 | PASS |
| Auth 模块测试 | PASS |
| 前端 Lint / TypeScript | PASS |
| 前端 10 个测试文件、36 项测试 | PASS |
| 前端生产构建 | PASS |
| 未认证 `GET /auth/me` | 401 |
| 登录后 `GET /auth/me` | 200，返回字符串 ID、8 个 authorities 和过期时间 |
| 同 Token 用户查询 | 200 |
| 注销后旧 Token 再访问 `/auth/me` | 401 |
| 浏览器登录、刷新恢复、身份展示、退出 | PASS |

## 9. 保留限制与下一步

- authorities 是登录时快照；角色或 Permission 变化后需要重新登录，V1 不做热更新；
- 当前会话不查询数据库，因此没有 username/displayName；这是方案 A 的明确取舍，不是遗漏；
- 下一 Slice 进入 IAM 用户管理页面，按 `auth:user:read/write` 实现真实列表、创建、编辑、启停、删除与密码重置。
