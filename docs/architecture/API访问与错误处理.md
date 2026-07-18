# API 访问与错误处理

## 1. Gateway-only 原则

浏览器应用只能访问 MOM Gateway：

```text
Browser
→ MOM Gateway
→ IAM / MDM / MES / WMS / QMS / Integration / Traceability
```

禁止：

- 直接访问内部服务地址。
- 在前端维护服务发现列表。
- 根据业务模块切换内部 Base URL。
- 暴露 Nacos、RocketMQ 或数据库地址。

## 2. API Client 职责

`@mom/api-client` 负责：

- Base URL。
- Token 注入。
- correlation ID。
- Content-Type 和语言头。
- 统一响应解包。
- 统一错误转换。
- 请求超时与取消。
- 幂等键。
- 文件下载。
- 401、403、409、429 和 5xx 的基础处理。

页面负责：

- 将错误转换为业务上下文中的用户提示。
- 决定刷新、重试、重新确认或返回。
- 展示受影响的业务对象。

## 3. 统一错误模型

建议前端错误至少包含：

```ts
interface MomApiError {
  category: 'AUTH' | 'FORBIDDEN' | 'VALIDATION' | 'CONFLICT' | 'RATE_LIMIT' | 'DEPENDENCY' | 'UNKNOWN';
  code?: string;
  message: string;
  correlationId?: string;
  traceId?: string;
  fieldErrors?: Record<string, string[]>;
  retryAfterSeconds?: number;
  details?: unknown;
}
```

不得直接向用户展示原始堆栈、SQL 或内部服务异常。

## 4. HTTP 状态处理

### 401

- 尝试统一会话恢复。
- 恢复失败后进入重新登录。
- 防止多个请求触发并发刷新循环。

### 403

- 展示无权限状态。
- 保留安全返回路径。
- 不把 403 伪装成“数据为空”。

### 409

常用于：

- 数据版本冲突。
- 状态已变化。
- 幂等键冲突。

页面应展示当前状态和可恢复动作。

### 429

- 显示请求过于频繁。
- 使用 `Retry-After` 等服务端信息。
- 禁止立即自动重试形成放大。

### 5xx

- 提示服务暂时不可用。
- 显示可用于排障的 correlation ID。
- 根据操作类型决定是否允许重试。

## 5. 命令与查询区别

查询请求：

- 可以在安全条件下重试。
- 支持取消过期请求。
- 筛选变化时避免旧响应覆盖新结果。

命令请求：

- 默认不自动重试。
- 使用 idempotency key。
- 超时后进入结果确认状态。
- 必须区分“服务端拒绝”和“结果未知”。

## 6. 幂等键

幂等键应：

- 在一次用户意图内保持稳定。
- 重复点击不产生新键。
- 用户明确重新发起新操作时生成新键。
- 在超时结果确认过程中保留。

具体 Header 名和格式以 Gateway 契约为准。

## 7. Correlation ID

- API Client 为请求传播或生成 correlation ID。
- 服务端返回的标识优先作为最终排障依据。
- 错误页面、通知和诊断抽屉可展示短格式参考编号。
- correlation ID 不是业务主键。

## 8. 文件下载

- 下载请求仍通过 Gateway。
- 处理二进制成功响应和 JSON 错误响应。
- 文件名来自受信任响应并进行安全处理。
- 下载失败显示错误码和关联 ID。
- COA 等敏感文件不得长期公开 URL。

## 9. API DTO 映射

```text
API DTO
→ Parser / Validator
→ Boundary Mapper
→ Page View Model
```

页面不应依赖未验证的任意 JSON，也不应将后端字段原样贯穿所有组件。

## 10. 验收

- 所有请求通过统一 Client。
- 内部服务地址不进入浏览器产物。
- 401 不发生刷新风暴。
- 409、429 和未知结果有专门状态。
- 命令不自动盲目重试。
- 错误包含排障参考标识。
