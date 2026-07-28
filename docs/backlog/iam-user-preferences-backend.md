# IAM 用户偏好后端能力待办

- 状态：Pending
- 本轮前端行为：Vben 本地持久化
- 本轮禁止：调用或 Mock 不存在的后端接口

## 1. 目标

为主题、明暗模式、布局、侧栏、页签等非敏感偏好提供跨设备同步，同时保持服务端默认值、前端版本和用户个性化配置可合并。

## 2. 建议模型

| 字段 | 说明 |
|---|---|
| `userId` | 当前用户，只能访问自己的偏好 |
| `application` | 固定为 `mom-admin` 等应用标识 |
| `schemaVersion` | 偏好结构版本 |
| `version` | 乐观锁版本 |
| `preferences` | 白名单 JSON，不允许 Token、Permission 或安全结论 |
| `updatedAt` | 服务端时间 |

## 3. 待提供接口

- `GET /api/iam/me/preferences/{application}`
- `PUT /api/iam/me/preferences/{application}`
- `DELETE /api/iam/me/preferences/{application}`

接口路径需由 IAM 正式契约确认；上述仅作为待办候选，不是当前可调用 API。

## 4. 规则

- 用户只能读写自己的偏好。
- 服务端与前端都执行字段白名单、大小限制和 Schema Version 校验。
- 使用乐观锁避免多设备静默覆盖。
- 默认值由前端版本提供，服务端只保存用户覆盖项。
- 新版本删除未知或不安全字段，保留可迁移字段。
- 不保存 Token、Refresh Token、Permission、Role、Factory 授权或 Party 绑定。
- 更新和重置写安全审计，不记录完整敏感 JSON。

## 5. 前端预留

- `LocalPreferencesSource`：本轮实现。
- `RemotePreferencesSource`：后端契约冻结后实现。
- 合并顺序：Vben 默认值 → MOM 默认预设 → 服务端用户覆盖 → 当前会话临时值。

## 6. 验收

- 跨设备同步与冲突可重复验证。
- 后端不可被用作任意 JSON 存储。
- 登出不会泄露另一用户的本地偏好。
- 版本升级可迁移或安全重置。
- API、权限、审计和 OpenAPI 文档完整。
