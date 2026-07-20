# API 访问与错误处理

- 当前阶段：`P1.5：认证与授权闭环`
- Auth Runtime：[P1.5 Web 认证与授权运行时基线](P1.5-Web认证授权运行时基线.md)
- 后端协议权威：[mom-platform P1.5 S00 PR #15](https://github.com/Chris-co-shi/mom-platform/pull/15)

## 1. Gateway-only 原则

浏览器应用只能访问 MOM Gateway：

```text
Browser
→ MOM Gateway
→ IAM / MDM / MES / WMS / QMS / Integration / Traceability
```

禁止直接访问内部服务、维护服务发现列表、切换内部 Base URL 或暴露 Nacos、RocketMQ、数据库地址。

不建设 BFF；Gateway API 凭证是 Bearer Access Token，不是应用 Session Cookie 或 IAM Cookie。

## 2. `@mom/api-client` 职责

负责：

- Gateway Base URL。
- 从 `@mom/auth` 获取内存 Access Token 并注入 Bearer Header。
- correlation ID。
- 当前 `X-Factory-Id`。
- Content-Type 和语言头。
- 统一响应解包和错误转换。
- 请求超时、取消和文件下载。
- 幂等键。
- 401、403、409、429 和 5xx 基础处理。
- 与 `@mom/auth` 协作执行 Single Flight Refresh。

不负责：

- 保存 Token 到 localStorage、IndexedDB、Pinia 持久化或 Cookie。
- 解析前端参数后自行认定 Factory/Party 授权。
- 业务状态机或最终授权。
- 直接访问 IAM 之外的内部服务地址。

## 3. 统一错误模型

```ts
interface MomApiError {
  category:
    | 'AUTH'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'VALIDATION'
    | 'CONFLICT'
    | 'RATE_LIMIT'
    | 'DEPENDENCY'
    | 'UNKNOWN';
  code?: string;
  message: string;
  correlationId?: string;
  traceId?: string;
  fieldErrors?: Record<string, string[]>;
  retryAfterSeconds?: number;
  details?: unknown;
}
```

不得向用户展示原始堆栈、SQL、Token、Authorization Header、内部服务异常或对象存在性推断。

## 4. 401 与 Single Flight Refresh

处理顺序：

1. 判断该业务请求是否已自动重试过。
2. 未重试且存在可刷新 Session 时，加入当前应用实例的单一 Refresh Flight。
3. 第一个请求发起 Refresh，其他请求等待同一个结果。
4. Refresh 成功后更新内存 Token。
5. 每个原业务请求最多自动重试一次。
6. Refresh 失败、Session 撤销、绝对期限到达或网络结果不确定时，拒绝等待队列并重新登录。

禁止：

- 每个 401 各自刷新。
- 无限 Refresh/业务请求循环。
- 在网络不确定时重复使用已可能被轮换的旧 Refresh Token。
- 跨应用共享 Refresh Promise 或 Token。

## 5. 403

- 不触发 Token Refresh。
- 显示无权限、应用入口不匹配或操作不允许。
- 提供安全返回路径。
- 不把 403 伪装成空数据。

## 6. 404

服务端可能对其他 Factory、Supplier 或 Customer 的对象返回 404，以避免对象枚举。

前端：

- 显示通用“对象不存在或不可访问”。
- 不推断对象在其他范围内存在。
- 不提示用户尝试其他 Party ID。

## 7. 409

常用于：

- 数据版本冲突。
- 状态已变化。
- 幂等键冲突。
- Refresh/Session 状态冲突。
- 命令结果未知。

页面应展示当前状态和可恢复动作。命令默认不自动重试。

## 8. 429

- 使用 `Retry-After` 等服务端信息。
- 显示请求过于频繁。
- 禁止立即自动重试形成放大。
- 登录和 Refresh 端点的 429 不得被普通请求重试策略吞掉。

## 9. 5xx 与网络错误

- 提示服务暂时不可用。
- 显示可排障的 correlation ID。
- 查询可按显式策略重试。
- 命令默认不自动重试。
- 超时后区分“服务端拒绝”和“结果未知”。

## 10. 查询与命令

查询：

- 可在安全条件下重试。
- 支持取消过期请求。
- 避免旧响应覆盖新结果。

命令：

- 默认不自动重试。
- 使用 idempotency key。
- 超时后进入结果确认状态。
- 必须保留一次用户意图中的稳定幂等键。

401 后的单次自动重试不改变幂等键。

## 11. 当前 Factory

- API Client 可以注入当前 `X-Factory-Id`。
- 该 Header 只表示当前工作上下文，不是授权证明。
- 启动时从 `/api/iam/me` 重新校验 Factory 偏好。
- 服务端仍需校验 JWT `factory_ids`、Party 关系和对象归属。

## 12. `/api/iam/me`

应用在 Auth Callback 和 Session 恢复后调用 `/api/iam/me`，建立：

- 用户与 `user_type`。
- Roles/Permissions。
- `factory_ids`。
- `party_type`/`party_id`。
- 当前应用访问结果。

API Client 不以本地解析 JWT 替代 `/api/iam/me`。

## 13. 文件下载

- 仍通过 Gateway。
- 使用内存 Bearer Token。
- 处理二进制成功响应和 JSON 错误响应。
- 文件名来自受信任响应并做安全处理。
- COA 等敏感文件不得使用长期公开 URL。

## 14. 验收

- 所有请求通过统一 Client。
- 浏览器产物不含内部服务地址或 Client Secret。
- 401 并发只产生一次 Refresh。
- 每个业务请求最多自动重试一次。
- 403 不刷新。
- 409、429、404 防枚举和结果未知有明确状态。
- `X-Factory-Id` 不被当作授权证明。
- Token 不进入持久化存储、日志或错误详情。
