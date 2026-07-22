# S08：Web 认证运行时实现

## 1. 模块边界

- `@mom/auth`：OAuth 2.0/OIDC、PKCE、内存 Token、Single Flight Refresh 和退出。
- `@mom/access`：`/api/iam/me`、Permission 体验控制和当前 Factory。
- `@mom/api-client`：只访问 Gateway，协调 401，转换 403/404/409/429/5xx。
- 三应用 `runtime.ts`：固定 Client/user_type 并组装三个模块，不复制协议算法。

## 2. 浏览器存储

| 存储 | 允许内容 |
|---|---|
| JavaScript 内存 | Access Token、Refresh Token、必要 ID Token、最小认证状态 |
| sessionStorage | 单次 `state`、`nonce`、`code_verifier`、`returnUrl` |
| localStorage | 当前 Factory 偏好；不得保存 Token 或授权结论 |
| Cookie | 仅 IAM 自身 HttpOnly 登录 Cookie；应用代码不得写 Token Cookie |

## 3. 环境配置

- `VITE_MOM_IAM_ISSUER`：ID Token `iss` 权威值。
- `VITE_MOM_IAM_BASE_URL`：浏览器访问 IAM 的地址，默认 `/iam`。
- `VITE_MOM_GATEWAY_URL`：Gateway Base URL，默认同源。
- `VITE_MOM_AUTH_REDIRECT_URI`：精确 Callback URI。
- `VITE_MOM_POST_LOGOUT_REDIRECT_URI`：退出后回跳 URI。
- `MOM_IAM_PROXY_TARGET`、`MOM_GATEWAY_PROXY_TARGET`：Vite 开发代理目标。

## 4. 安全行为

1. PKCE verifier 使用 Web Crypto 高熵随机数，challenge 固定 S256。
2. Callback 校验 state；ID Token 校验 RS256 签名、kid、issuer、audience、expiry 与 nonce。
3. Token Endpoint 使用 Public Client，不发送 `client_secret`。
4. Refresh 成功后立即用旋转结果替换内存旧 Refresh Token。
5. 同一应用实例只允许一个 Refresh Promise。
6. 401 等待 Refresh 后最多重试一次；403 永不刷新。
7. `/api/iam/me` 的 Client/user_type 不匹配时拒绝进入应用。
8. Supplier/Customer 的 Party 只读，不提供身份切换。
9. `X-Factory-Id` 只是工作上下文，服务端继续执行最终授权。
