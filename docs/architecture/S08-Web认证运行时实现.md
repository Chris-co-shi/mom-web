# S08：Web 第一方认证运行时实现

- 状态：Current
- 决策权威：[ADR-009](../adr/ADR-009-P1.5-Web第一方认证运行时.md)

## 1. 模块边界

- `@mom/first-party-auth`：账号密码、首次改密、当前标签页 Token、Single Flight Refresh 和退出。
- `@mom/auth`：保留 OAuth/OIDC/PKCE 标准协议兼容能力，当前三个 PC 应用不直接使用。
- `@mom/access`：`/api/iam/me`、Permission 体验控制和当前 Factory。
- `@mom/api-client`：只访问 Gateway，协调 401，转换 403/404/409/429/5xx。
- 三应用 `runtime.ts`：固定 Client/user_type 并组装上述模块，不复制认证协议算法。

## 2. 三应用入口

| 应用 | Client ID | user_type | 登录 UI |
|---|---|---|---|
| MOM Admin | `mom-admin-web` | `INTERNAL` | 应用内账号密码页 |
| Supplier Portal | `mom-supplier-web` | `SUPPLIER` | 应用内账号密码页 |
| Customer Portal | `mom-customer-web` | `CUSTOMER` | 应用内账号密码页 |

IAM 是后端认证与权限微服务，不提供独立登录页面。

## 3. 浏览器存储

| 存储 | 允许内容 |
|---|---|
| JavaScript 内存 | 当前运行时 Token 快照、Refresh Flight、Access Context |
| sessionStorage | 当前标签页 Access/Refresh Token 与 Session 元数据，由 `@mom/first-party-auth` 独占 |
| localStorage | 当前 Factory、Vben Preferences 等非安全偏好；不得保存 Token 或授权结论 |
| Cookie | 应用代码不得写 Token Cookie |

关闭标签页后认证存储消失；页面刷新可从当前标签页恢复；不跨标签同步 Token。

## 4. Gateway 接口

- `POST /api/iam/auth/login`
- `POST /api/iam/auth/password/change-required`
- `POST /api/iam/auth/refresh`
- `POST /api/iam/auth/logout`
- `GET /api/iam/me`

三个应用只通过 Gateway 访问这些接口和业务 API。

## 5. 安全行为

1. 登录页只包含账号和密码，不提供验证码或短信入口。
2. Refresh Token Rotation 的新结果立即替换旧结果。
3. 同一应用实例只允许一个 Refresh Promise。
4. 401 等待 Refresh 后最多重试原请求一次。
5. `/api/iam/me` 的 Client/user_type 不匹配时 Fail Closed。
6. Supplier/Customer 的 Party 只读，不提供身份切换。
7. `X-Factory-Id` 只是工作上下文，服务端继续执行最终授权。
8. 登出网络失败也清理本地会话。
9. Token 不进入 URL、日志、错误详情、Pinia 持久化、Preferences 或长期存储。

## 6. MOM Admin 的 403 扩展

MOM Admin Vben 迁移后，403 不触发 Token Refresh，而是单飞同步 `/api/iam/me`、Permission 与菜单：

- GET/HEAD 同步后最多重试一次。
- 写请求不自动重试，要求用户确认后重新操作。
- 重试仍 403 时进入无权限页。

详见 [MOM Admin Vben 5.7 迁移架构](MOM-Admin-Vben5.7迁移架构.md)。
