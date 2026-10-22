# 共享 HTTP Client 与失败语义

所有业务模块通过 `src/shared/api/http-client.ts` 发起请求，由各自 `src/modules/*/api` 封装类型化契约。API 前缀见 `src/shared/api/config.ts`，开发代理见 `vite.config.ts`。共享层附加当前 Bearer、Locale、Correlation ID，处理 JSON、`Result<T>` 解包和网络/HTTP 错误；业务模块不自行 `fetch`、读取 Token 或拼接 Authorization Header。

## 调用入口

`httpClient.result<T>({ path, method, query, body, headers, signal, timeoutMs })` 返回 `Promise<T>`。`path` 使用 `apiPath(owner, suffix)`；`method` 缺省为 GET。真实例子见 `src/modules/auth/api/auth-api.ts` 的登录调用。HTTP 204 返回 `undefined`；401 触发注册的 unauthorized handler。后端错误体可能不同，共享层兼容解析常见字段，业务代码以 `ApiError` 的 `kind`、`status`、`fieldErrors`、`retryable`、`resultUnknown` 处理反馈；Correlation ID 回显仍依赖服务端。

## 写入失败

Client 不自动重试。非 GET 的连接中断、超时等无法确认提交结果的失败标记 `resultUnknown`；业务页面使用 `classifyWriteFailure` 区分 `failed`、`conflict`、`unknown`，不能用 HTTP Method 单独推断业务副作用。未知结果要保留原请求标识并阻断危险重写；只有后端按原标识返回可核对的提交事实，才能恢复为已提交。WMS 盘点创建页的 `findCountByRequestKey` 是当前实际案例。明确失败或冲突按对应业务契约提示，不把刷新失败误当作写入失败。

## 边界与验证

共享 Client 不决定后端权限、业务幂等或状态机。接入新 API 时核查路径、方法、请求/响应 DTO、Decimal String、401/403/409/5xx、超时与响应损坏；写入还需核对重复请求和恢复契约。前端总原则见[架构](frontend-architecture.md)和[CRUD 管理页标准](standards/crud-management-page-standard.md)。
