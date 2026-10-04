# Web-P2-S01 登录与认证闭环验证记录

- 日期：2026-10-04
- 状态：**已完成**
- 后端契约：Mini Auth V1 / Redis-backed Opaque Token

## 1. 真实契约

| 能力 | Gateway 路径 | Auth 路径 | 响应 |
|---|---|---|---|
| 登录 | `POST /auth/login` | `POST /login` | `Result<{ accessToken, tokenType, expiresAt }>` |
| 退出 | `POST /auth/logout` | `POST /logout` | `Result<void>` |

Gateway 使用 `StripPrefix=1`，浏览器只调用 Gateway 路径。前端不解析 Opaque Token，不伪造 `/me`，
也不实现 Mini Auth V1 范围外的 Refresh Token、Session 列表或 SSO。

## 2. 前端实现

- 完整登录表单、加载、字段校验、账号错误、停用、限流和服务不可用状态；
- Token 仅保存至当前标签页的 `sessionStorage`；
- 应用启动时恢复未过期会话，损坏或过期数据直接清除；
- 受保护路由在无凭证时跳转 `/login`，并保留安全的站内回跳地址；
- 全局 401 清理本地凭证并返回登录页；
- 退出调用真实 `/auth/logout`，无论远端结果如何都停止浏览器继续复用该 Token；
- 登录页遵循现有主题、Locale、圆角和无障碍规范。

## 3. 自动化验证

`pnpm test` 覆盖登录/退出协议、密码原样传递、Token 存储、过期清理、退出失败、路由回跳、
开放重定向防护和统一 401 处理。sessionStorage 不保存用户名和密码。

## 4. 真实服务证据

### Auth 直连

| 场景 | 结果 |
|---|---|
| `POST http://127.0.0.1:20001/login`，有效账号 | 200，返回 `code=0`、Bearer Token 和 `expiresAt` |
| 携带该 Token调用 `POST /logout` | 200，返回 `code=0` |
| 错误密码 | 401，返回 `auth.invalid_credentials` |

验证输出只记录 Token 是否存在，不记录原始 Token。

### Gateway

| 场景 | 结果 |
|---|---|
| `GET http://127.0.0.1:20000/actuator/health` | 200 / UP |
| 错误密码登录 | 401，`auth.invalid_credentials` |
| 正确账号登录 | 200，返回 Bearer Token 与 `expiresAt` |
| 携带 Token 查询受保护用户 | 200，Resource Server 与权限校验通过 |
| 携带 Token 退出 | 200，Token Store 删除成功 |
| 旧 Token 再访问受保护用户 | 401，`AUTHENTICATION_REQUIRED` |

Gateway 重启并恢复服务发现后完成以上验证，证明浏览器统一 URL、Gateway `StripPrefix=1`、Auth 登录、
Redis Token Store、Resource Server、权限和注销链路均已实际连通。

## 5. 浏览器检查

- 中文/英文标题和表单文案同步切换；
- 亮色/暗色主题正常；
- 原生 input 与 label、错误提示通过 `id`/`aria-describedby` 关联；
- 空表单显示字段错误；
- Gateway 503 显示“认证服务暂时不可用”，不泄露下游响应细节；
- 正确账号经 Gateway 登录后进入受保护工作台；
- 刷新页面仍停留在工作台，证明当前标签页会话已恢复；
- 退出后返回登录页，再直接访问受保护页面会重新跳转登录；
- 浏览器控制台无新增错误。

PC Web 的目标宽度仍为 1024–1920px；窄于 1024px 不属于当前产品响应式范围。

## 6. 结论

Web-P2-S01 已满足完成条件。当前没有 `/me` 契约，因此本 Slice 不展示或伪造当前用户显示名；用户、角色、
权限管理及前端 Authority 可见性判断进入后续 IAM Slice。
