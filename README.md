<div align="center">

# MOM Web

### 工业 MOM 管理端、供应商门户与客户门户

基于 Vue 3、Vite、TypeScript、Ant Design Vue 和 Vben 5.7 构建三个独立浏览器应用，并将认证运行时、权限体验、用户流程、页面状态、原型和 API 契约作为正式设计资产。

<p>
  <a href="https://github.com/Chris-co-shi/mom-web/actions/workflows/ci.yml">
    <img alt="Web CI" src="https://github.com/Chris-co-shi/mom-web/actions/workflows/ci.yml/badge.svg?branch=main">
  </a>
  <img alt="Vue" src="https://img.shields.io/badge/Vue-3-42B883?logo=vue.js&logoColor=white">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white">
  <img alt="Status" src="https://img.shields.io/badge/Status-Phase%2002%20Ready-2563EB">
</p>

[文档中心](docs/README.md) · [全局视觉基线](docs/design/MOM-Web全局视觉基线.md) · [P1.5 Web 运行时](docs/architecture/P1.5-Web认证授权运行时基线.md) · [P1.5 Web 计划](docs/plans/P1.5-Web认证授权实施计划.md) · [前端总体架构](docs/architecture/前端总体架构.md) · [ADR](docs/adr/README.md)

</div>

---

> [!IMPORTANT]
> P1.5 Web Auth Runtime、MOM Admin、Supplier/Customer Portal 与安全 E2E 已完成并合并。当前状态为 **P1.5 Completed / Merged**，下一阶段是 Phase 02 供应商送货与到货协同。

## 🌟 项目定位

`mom-web` 负责 MOM 的浏览器运行时和交互设计：

- MOM 内部运营与权限管理工作台。
- Supplier Portal。
- Customer Portal。
- 第一方账号密码与当前标签页认证运行时。
- Gateway API Client、前端 Access Context 与错误恢复。
- 用户流程、页面状态、原型、组件和 API 映射。
- 工业领域组件、设计 Token 与批次谱系图。

后端用户、Token、Session、RBAC、Factory/Party Scope、Gateway 和业务服务最终授权，以 `mom-platform` 为唯一权威来源。

## 🔐 P1.5 Web 安全基线

| 应用 | Client ID | 允许用户类型 |
|---|---|---|
| `apps/mom-admin` | `mom-admin-web` | `INTERNAL` |
| `apps/supplier-portal` | `mom-supplier-web` | `SUPPLIER` |
| `apps/customer-portal` | `mom-customer-web` | `CUSTOMER` |

统一规则：

- 三应用使用 Gateway 下的第一方 IAM 登录、首次改密、刷新和退出接口。
- 登录 UI 位于各应用，IAM 不提供独立登录页面。
- 不建设 BFF；Gateway API 使用 Bearer Access Token。
- Access Token 与 Refresh Token 只由 `@mom/first-party-auth` 保存到当前标签页 `sessionStorage`。
- 不使用 localStorage、IndexedDB、持久化 Pinia、普通 Cookie 或跨标签 Token 同步。
- 401 使用 Single Flight Refresh，每个业务请求最多自动重试一次。
- MOM Admin 首次 403 单飞同步权限与菜单；仅 GET/HEAD 自动重试一次，写请求不自动重试。
- `/api/iam/me` 是正式权限上下文来源。
- `X-Factory-Id` 只是工作上下文，不是授权证明。
- Supplier/Customer Portal 不提供 Party 切换器。
- 前端路由、菜单和按钮只改善体验，服务端执行最终授权。

完整规则见 [P1.5 Web 认证与授权运行时基线](docs/architecture/P1.5-Web认证授权运行时基线.md)。

## 🧭 前端全景

```mermaid
flowchart LR
    Internal[INTERNAL] --> Admin[mom-admin / mom-admin-web]
    Supplier[SUPPLIER] --> SP[supplier-portal / mom-supplier-web]
    Customer[CUSTOMER] --> CP[customer-portal / mom-customer-web]

    subgraph Shared[共享前端能力]
        Auth[@mom/first-party-auth - P1.5 S08]
        API[@mom/api-client]
        Access[@mom/access]
        Tokens[@mom/design-tokens]
        CommonUI[@mom/common-ui]
        Domain[@mom/domain-components]
        Graph[@mom/traceability-graph]
    end

    Admin --> Shared
    SP --> Shared
    CP --> Shared
    Auth --> IAM[IAM / First-party Auth API]
    API --> Gateway[MOM API Gateway]
    Gateway --> Services[业务 Resource Servers]
```

## 🖥️ 三套应用

| 应用 | 用户 | V1 职责 | 默认端口 |
|---|---|---|---:|
| `apps/mom-admin` | 内部计划、生产、仓库、质量、设备、集成和安全管理人员 | MOM 内部工作台、业务处理、IAM 管理、追溯与监控 | 5555 |
| `apps/supplier-portal` | 供应商业务、物流和质量人员 | 送货、预约、单据、质量协同和状态查询 | 5556 |
| `apps/customer-portal` | 客户业务、物流和质量人员 | 订单、发运、COA、客诉与处理进度 | 5557 |

三套应用独立路由、独立构建、独立 Client、独立内存 Auth State 和独立发布。

## 🧩 共享包

| 包 | 职责 | 当前状态 |
|---|---|---|
| `@mom/first-party-auth` | 第一方登录、首次改密、当前标签页 Token、Single Flight Refresh、退出和恢复 | P1.5 Completed |
| `@mom/auth` | OAuth/OIDC/PKCE 标准协议兼容能力，当前三应用不直接使用 | Compatibility |
| `@mom/api-client` | Gateway HTTP、Bearer Token、Correlation ID、`X-Factory-Id`、错误与幂等 | P1.5 Completed |
| `@mom/access` | `/api/iam/me`、路由、菜单、按钮和当前 Factory 体验控制 | 已有边界，S08 完善 |
| `@mom/design-tokens` | 色彩、间距、字体和工业状态 Token | 基础骨架 |
| Vben 5.7 Workspace | MOM Admin 的 BasicLayout、菜单、页签、Preferences、Locale 与路由基础 | 固定源码快照 |
| `@mom/common-ui` | MOM 页面级公共组合 | Page 已落地 |
| `@mom/domain-components` | 批次、库存、工单、检验、设备状态等领域组件 | 基础骨架 |
| `@mom/shared` | 通用类型、格式化、校验与无业务工具 | 基础骨架 |
| `@mom/traceability-graph` | 批次谱系可视化边界 | 基础骨架 |

## 🛠️ 技术基线

| 层次 | 技术选型 |
|---|---|
| Node.js | `22.18+` 或 `24`，CI 使用 Node 24 |
| 包管理 | pnpm `11.7.0` |
| Web 框架 | Vue 3 |
| 构建工具 | Vite `8.0.10` |
| 类型系统 | TypeScript `6.0.3` |
| 状态管理 | Pinia（不得持久化 Token） |
| UI 基础 | Ant Design Vue |
| 请求边界 | Axios / Gateway-only API access |
| 工程校验 | 自定义边界校验、vue-tsc、Vite Build、GitHub Actions |

## 🏗️ 仓库结构

```text
mom-web/
├── apps/
│   ├── mom-admin/
│   ├── supplier-portal/
│   └── customer-portal/
├── packages/
│   ├── @core/
│   ├── access/
│   ├── api-client/
│   ├── common-ui/
│   ├── design-tokens/
│   ├── domain-components/
│   ├── shared/
│   ├── traceability-graph/
│   └── Vben 5.7 Workspace packages...
├── docs/
├── scripts/
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
└── package.json
```

> `packages/auth`、`packages/access`、`packages/api-client`、`packages/iam-admin`、`packages/portal-access` 与 `packages/security-e2e` 均已实现并通过 CI。

## 🚀 快速开始

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev:admin
pnpm dev:supplier
pnpm dev:customer
```

质量检查：

```bash
pnpm validate
pnpm check:type
pnpm build
```

或：

```bash
pnpm check
```

## 📚 文档导航

| 分类 | 入口 | 说明 |
|---|---|---|
| 总览 | [文档中心](docs/README.md) | 全部文档导航和维护规则 |
| 安全 | [P1.5 Web Runtime](docs/architecture/P1.5-Web认证授权运行时基线.md) | PKCE、Token、Refresh、`/api/iam/me` 和三应用边界 |
| 计划 | [P1.5 Web 计划](docs/plans/P1.5-Web认证授权实施计划.md) | S08～S10 和 S12 实施范围 |
| 设计 | [MOM Web 全局视觉基线](docs/design/MOM-Web全局视觉基线.md) | 全局布局、颜色、样式、动效及国际化边界 |\n| 架构 | [前端总体架构](docs/architecture/前端总体架构.md) | 三应用与共享包协作方式 |
| 架构 | [三应用职责边界](docs/architecture/三应用职责边界.md) | Client、user_type、Party 和应用边界 |
| 架构 | [权限与数据权限](docs/architecture/权限与数据权限.md) | Permission、Factory、Party 与前端体验控制 |
| 架构 | [API 访问与错误处理](docs/architecture/API访问与错误处理.md) | Single Flight 和 HTTP 错误语义 |
| 决策 | [ADR 索引](docs/adr/README.md) | 前端关键架构决策 |

## 🗺️ 当前路线图

| 阶段 | 目标 | 状态 |
|---|---|---|
| Web Phase 01 | Monorepo、三应用骨架、设计交付规范和共享包初始边界 | ✅ 基础完成 |
| P1.5 S00 | Web 认证授权设计对齐 | ✅ Completed / Merged |
| P1.5 S08 | Web Auth Runtime | ✅ Completed / Merged |
| P1.5 S09 | MOM Admin 权限管理页面 | ✅ Completed / Merged |
| P1.5 S10 | Supplier/Customer Portal | ✅ Completed / Merged |
| P1.5 S12 | Web 安全 E2E 与封板 | ✅ Completed / Merged |
| Phase 02 | 供应商送货与到货协同 | ⏳ Pending / Ready after preflight cleanup |

## 🧠 前端原则

1. **服务端授权为准**：前端权限只用于体验控制。
2. **Token 受控存储**：Token 只由认证运行时保存到当前标签页，不进入长期存储或 Preferences。
3. **Gateway-only**：业务请求只访问 MOM Gateway。
4. **应用隔离**：三个 Client、Token 和 Store 不混用。
5. **Party 固定**：门户不能自由切换供应商或客户主体。
6. **异常是一等状态**：401、403、404、409、429、5xx 和结果未知必须进入设计。
7. **原型先行**：用户流程、状态矩阵和原型图早于业务实现。
8. **共享有边界**：共享包只承载稳定契约。

---

<div align="center">

**MOM Web — 让工业流程、复杂状态与安全边界转化为可理解、可执行、可恢复的用户体验。**

</div>
