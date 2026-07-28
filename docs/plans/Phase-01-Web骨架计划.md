# Phase 01：Web 技术骨架计划

## 1. 阶段状态

- 状态：**Foundation Complete / Superseded by P1.5**
- 后续安全阶段：[P1.5 Web 认证与授权实施计划](P1.5-Web认证授权实施计划.md)

> 本文保留 Phase 01 的历史规划。P1.5 后续已采用第一方账号密码 API 和 `@mom/first-party-auth` 完成认证闭环；本文中 PKCE/内存 Token 条目不是当前实现。

## 2. 阶段目标

建立支撑后续垂直切片的三应用 Monorepo、统一访问边界、设计交付流程和质量门禁。

本阶段不批量实现 MES/WMS/QMS 业务页面，也不把计划中的 OAuth、Token 或权限能力描述为已完成。

## 3. 已完成基础

- `mom-admin`、`supplier-portal`、`customer-portal` 三应用骨架。
- 独立构建、端口和基础运行配置。
- `@mom/api-client`、`@mom/access` 等共享包初始边界。
- Gateway-only 原则。
- 用户流程、页面状态、原型、组件和 API 映射规范。
- Node、pnpm、Vue、Vite、TypeScript 工程门禁。

## 4. 尚未完成

以下是当时转入 P1.5 的历史候选能力，最终以 ADR-009 为准：

- `@mom/first-party-auth` 第一方登录、首次改密、刷新与退出。
- `mom-admin-web`、`mom-supplier-web`、`mom-customer-web` 三个固定第一方 Client。
- Access/Refresh Token 当前标签页生命周期。
- Single Flight Refresh 与每请求最多一次自动重试。
- `/api/iam/me` 权限上下文。
- Client/user_type 入口隔离。
- MOM Admin 权限管理页面。
- Supplier/Customer Portal 认证授权闭环。
- Web 安全 E2E。

## 5. 原 Phase 01 Slice 解释

### Slice 01：Monorepo 与工程门禁

已完成基础结构和校验脚本。持续使用：

```bash
pnpm install --frozen-lockfile
pnpm validate
pnpm check:type
pnpm build
```

### Slice 02：应用 Shell 与路由边界

已具备三应用独立骨架。正式认证路由守卫、Client/user_type 校验和权限路由在 P1.5 S08 实现。

### Slice 03：OAuth2.1/OIDC Access

原计划未完成，不属于 Web Phase 01 已交付能力。P1.5 最终采用：

- 三个固定第一方 Client。
- 应用内账号密码与首次改密页面。
- Token 只由 `@mom/first-party-auth` 保存到当前标签页 `sessionStorage`。
- Single Flight Refresh。
- `/api/iam/me`。

### Slice 04：Gateway API Client

已有基础包边界，P1.5 S08 继续补齐 Bearer Token、Single Flight、401/403/404/409/429/5xx 和当前 Factory 契约。

### Slice 05：Access 与数据范围

已有前端体验控制方向，P1.5 S08 继续补齐 `/api/iam/me`、Permission、Factory 和 Party 只读上下文。

前端 Access 不执行最终授权，`X-Factory-Id` 不是授权证明，Party 不允许自由切换。

### Slice 06：设计系统与领域组件

作为 Web 基础能力继续演进，不属于 P1.5 S00 的实现范围。

### Slice 07：设计交付与测试基础

用户流程、原型、状态矩阵、组件映射和 API 映射继续作为业务页面实现门禁。

## 6. 修正后的完成定义

Web Phase 01 完成表示：

- 三应用可以独立构建和运行。
- Monorepo 与共享包初始边界存在。
- Gateway-only、前端非最终授权和设计交付原则明确。
- 工程校验脚本可用。

Web Phase 01 当时不表示认证、Token、Refresh、`/api/iam/me` 或权限管理页面已实现；这些能力随后在 P1.5 完成。

## 7. P1.5 后续

| Slice | Web 工作 |
|---|---|
| S00 | 设计对齐与状态纠偏 |
| S08 | `@mom/auth`、`@mom/access`、`@mom/api-client` 和三应用 Auth Runtime |
| S09 | MOM Admin 权限管理页面 |
| S10 | Supplier Portal 与 Customer Portal |
| S12 | Web 安全 E2E 与跨仓库封板 |

完整实施范围见 [P1.5 Web 认证与授权实施计划](P1.5-Web认证授权实施计划.md)。
