# MOM PC Web 前端工程架构

## 1. 当前基线

| 领域 | 当前事实 | 决策 |
|---|---|---|
| 应用形态 | 单 Vue 应用 | 保持单应用，不恢复 Monorepo |
| 框架 | Vue 3.5.34 | 保持 |
| 语言 | TypeScript 6，`strict: true` | 保持严格模式 |
| 构建 | Vite 8.0.10 | 保持 |
| 包管理器 | pnpm 11 | 保持 |
| Router | 用户工作区已加入 `vue-router` | Web-P1 验证后正式接线 |
| UI 组件库 | 尚未安装 | 首选验证 TDesign Vue Next |
| 状态管理 | 尚未安装 | Web-P1 只在全局状态需求明确后决定 |
| 请求层 | 尚未建立 | Web-P1 建立唯一入口 |
| 国际化 | 尚未建立 | 静态 `zh-CN`/`en-US`，按域组织 |
| 测试 | 尚未建立 | Web-P1 补最小单元/组件测试基线 |
| 样式 | 单个 `src/style.css` | Web-P1 迁移为 Token/Theme/Base 分层 |

## 2. 架构目标

- 一个应用、一套路由、一个请求入口、一个主题系统；
- 平台模块和业务模块有稳定边界；
- UI 库负责基础控件，MOM 设计系统负责语义和组合模式；
- API DTO、页面 View Model 与表单状态按真实差异分离，不机械复制类型；
- 路由、菜单、权限使用稳定标识；
- 骨架允许 IAM → System → MDM 顺序实施，不为未来模块提前创建空壳。

## 3. 目标目录

目录按 Slice 渐进创建，不一次性生成空目录。

```text
src/
├── app/                    # 启动装配、全局 Provider、应用配置
├── router/                 # 路由、守卫、路由元数据
├── layouts/                # 登录布局、主应用布局
├── modules/
│   ├── auth/               # 登录、登出、登录态
│   ├── iam/                # 用户、角色、权限
│   ├── system/             # 字典、Locale、system.* 文案
│   ├── mdm/                # MDM 页面与模块能力
│   └── <future-domain>/    # 仅在对应 Slice 创建
├── shared/
│   ├── api/                # HTTP client、错误与通用协议类型
│   ├── components/         # 跨两个以上模块稳定复用的组件
│   ├── composables/        # 跨模块组合逻辑
│   ├── directives/         # 唯一权限等通用指令入口
│   ├── formatters/         # 时间、数字、单位等格式化
│   ├── types/              # 真正跨模块的稳定类型
│   └── utils/              # 无业务假设的工具
├── locales/                # zh-CN/en-US 静态资源
├── styles/                 # tokens、themes、base、组件库映射
└── assets/                 # 本地静态资源
```

模块内部建议结构：

```text
modules/iam/
├── api/                    # IAM API 函数与 DTO
├── components/             # IAM 私有组件
├── composables/            # IAM 用例状态与组合逻辑
├── pages/                  # 路由页面
├── model/                  # 仅在 DTO 与 UI 模型确有差异时使用
├── routes.ts               # 模块公开路由
└── index.ts                # 模块公开入口
```

## 4. 依赖方向

```text
app / router / layouts
          ↓
      module pages
          ↓
module api / components / composables
          ↓
shared api / components / formatters
          ↓
Vue / TDesign / browser platform
```

规则：

- 一个业务模块不得直接导入另一个模块的内部文件；
- 跨模块协作通过公开入口或共享契约；
- `shared` 不保存具体权限码、业务状态机或模块 API；
- 底层共享代码不得反向依赖页面；
- 页面负责组合，不承载可复用的请求并发、错误映射或权限算法。

## 5. 组件复用

优先级：

1. TDesign 基础组件；
2. MOM 项目基础组件；
3. 跨业务稳定组件；
4. 模块私有组件；
5. 页面局部结构。

首批候选项目组件只在真实使用时创建：

- `PageContainer`：标题、说明、面包屑、操作区；
- `SearchPanel`：查询条件展开与重置；
- `DataState`：Loading、Empty、Error、Forbidden、No Result；
- `StatusTag`：统一状态表达；
- `ConfirmAction`：高影响操作确认；
- `PermissionGuard`：唯一按钮级权限入口。

相似能力至少出现两次，或确实需要统一权限、无障碍、错误处理时才抽象。禁止万能表格和万能表单。

## 6. 路由与导航

### 6.1 路由元数据

每条业务路由至少声明：

- 稳定 `name`；
- `titleKey`；
- 所属模块与导航分组；
- 是否需要认证；
- 所需 Permission Code（如适用）；
- 面包屑和是否在菜单显示。

### 6.2 所有权

- Web 持有路由组件映射和菜单结构；
- System V1 不提供导航；
- IAM Permission 只用于过滤可见入口，后端仍独立授权；
- 路由懒加载按模块分包；
- 403、404、登录失效和 Chunk 加载失败统一处理。

## 7. 认证与权限

当前权威基线为 ADR-040：第一方用户名密码登录 + Redis-backed Opaque Access Token。

### 7.1 客户端原则

- 登录入口走 Gateway 暴露的 `/auth/login`；
- Token 仅保存在当前 Tab 的 `sessionStorage`，不进入 URL、日志、localStorage 或持久化状态；
- 登出调用 `/auth/logout`，成功或本地状态已不可用时清理客户端认证状态；
- 当前 V1 没有 Refresh Token，401 不执行自动刷新；
- 请求不解析 Opaque Token；
- 403 不触发重新登录；
- 非幂等写请求不因网络错误自动重放。

Web-P2-S01 已将上述原则落地：统一 HTTP Client 通过 Provider 获取 Token，路由守卫保护工作区，401 清除
本地会话并返回登录页。前端守卫只改善导航体验，Resource Server 仍执行最终 Token 与 Permission 校验。

### 7.2 用户上下文缺口

当前登录响应只包含 `accessToken`、`tokenType`、`expiresAt`，足以恢复当前标签页的认证凭证，但没有当前用户
展示信息。前端不得自行推导显示名、工厂范围或会话能力；后续如确有展示需求，应先由用户确认 `/me` 等真实契约。

### 7.3 权限模型

- 路由守卫、菜单过滤和按钮权限共用一个权限判断入口；
- `ROLE_*` 与细粒度 Permission Code 均作为字符串 Authority 处理；
- 前端隐藏操作不等于安全；
- 权限变化对已签发 Token 的生效语义以 IAM 后端为准，前端不伪造热更新。

## 8. 请求与错误边界

Web-P1 已建立唯一 HTTP Client：

- Base URL 由环境配置提供；
- 统一附加 Bearer Token、Locale 与 Correlation ID 策略；
- 统一解析 `Result<T>`、分页与稳定错误结构；
- 区分网络错误、超时、401、403、404、409、422、429 与 5xx；
- 支持 AbortController 取消过期查询；
- GET 查询只在明确策略下有限重试；
- 写请求默认不自动重试；
- 页面 API 文件不直接操作 Token，也不重复实现错误提示。

### 8.1 Gateway URL 与 Path 基线

| bounded context | Web 统一路径 | Gateway 现状 | 备注 |
|---|---|---|---|
| IAM/Auth | `/auth/**` | 已路由 | Gateway `StripPrefix=1`，例如外部 `/auth/login` 到 Auth `/login` |
| System | `/api/system/**` | 已路由 | Gateway 保留完整路径 |
| MDM | `/api/mdm/**` | 待接入 | MDM Controller 已使用该路径，但 Gateway 当前没有对应 Route |

- 浏览器只面向 Gateway，不直接配置各业务服务地址；
- 本地开发由 Vite 将 `/auth`、`/api` 代理到 `MOM_GATEWAY_DEV_TARGET`，默认 `http://127.0.0.1:20000`；
- 生产默认使用同源相对路径，可通过 `VITE_MOM_API_BASE_URL` 显式覆盖；
- `API_PATHS` 是 bounded context path 的唯一代码登记点，MDM 标记为契约预留，不代表已具备 Gateway 联调条件。

### 8.2 当前响应兼容策略

- IAM、System、MDM 当前 Controller 成功与业务失败主要使用 `Result<T>`：`code/message/data`，成功码为 `0`；
- 分页严格使用 `PageQuery<T>` 与 `PageResult<T>`，字段为 `params/pageNo/pageSize` 和 `records/pageNo/pageSize/total/totalPages`；
- Gateway 自身错误当前为 `{code,message}`；Client 同时识别 RFC 9457 `ProblemDetail` 的 `detail/code/correlationId/fieldErrors`，用于后端协议渐进收敛；
- Client 提供显式 `result<T>`、`json<T>`、`void` 三种响应契约，不对未来直接 DTO 响应做猜测性自动拆包；
- 每次请求生成符合 Gateway 规则的 UUID `X-Correlation-Id`，并优先读取响应 Header 中的最终值；
- HTTP Client 本身不自动重试。GET 是否重试由页面/Composable 根据 `retryable` 显式决定，写请求网络中断或超时标记为 `resultUnknown`。

错误分层：

| 层级 | 职责 |
|---|---|
| HTTP Client | 传输、超时、协议解析、稳定错误对象 |
| 模块 API | URL、DTO 和接口语义 |
| Composable/Page | 决定保留输入、重试、刷新或导航 |
| 全局边界 | 登录失效、路由加载失败、未知渲染异常 |

## 9. 状态管理

全局状态只保存：

- 认证快照与当前用户可用 Authority；
- 主题、语言等跨页面 UI 状态；
- 主布局状态；
- 真实存在且跨模块共享的上下文。

表格数据、查询条件和编辑表单默认留在页面或模块内。Web-P1 不因“后台项目通常需要”而直接引入状态库；若 Pinia 的真实需求在认证和全局偏好接线中成立，再单独说明依赖理由并安装。

## 10. 国际化与格式化

- Web 静态翻译资源按模块分为 `zh-CN` 与 `en-US`；
- 路由标题、菜单、校验、通知全部使用稳定 Key；
- `system.*` 动态文案通过 System Runtime Bundle 获取，但不取代 Web 静态资源；
- MDM、WMS、MES 等业务 namespace 由各服务拥有，不能让 System 远程代管；
- Locale 只使用 BCP 47 Tag；
- 技术时间点使用 RFC 3339/`Instant` 语义；
- 显示格式使用 ECMA-402 `Intl`，不在页面散落格式字符串；
- Decimal String、长整型字符串和 Java `String` ID 不转换成不安全的 JavaScript Number。

### 10.1 Web-P1-S05 实现基线

- `src/locales/zh-CN.ts` 是静态 Key 的类型来源，`en-US.ts` 必须通过类型检查保持 Key 完全对齐；
- `src/shared/i18n/locale.ts` 是唯一 Locale 状态入口，当前只接受 `zh-CN`、`en-US`；
- 初始选择顺序为“浏览器本地选择 → 受支持的浏览器 Locale → `zh-CN`”，仅接受受控 Alias；
- 本地键 `mom.locale.preference` 只代表当前浏览器选择，不伪装为 System 用户偏好已同步；
- 切换时同步更新 `<html lang>`、路由标题、菜单、基础页面以及 TDesign ConfigProvider；
- `src/shared/formatters/index.ts` 提供时间点、普通数值、Decimal String 和带单位数值格式化；
- 时间点必须携带 RFC 3339 Offset，默认显示时区为 `UTC`；浏览器时区不会被静默作为权威偏好；
- Decimal String 通过字符串分组与小数符号映射保持精度，格式化层不擅自舍入或写回业务值；
- 单位格式化只组合数值和稳定 Unit Code/本地化 Label，不承担量纲换算。

当前 System 后端规范已经存在 User Preference 契约，但 Web-P3 计划仍未批准接入该能力。服务端偏好加载、版本冲突和降级策略必须在 Web-P3 单独确认，S05 不提前调用。

## 11. 主题

- 支持 `light`、`dark`、`system`；
- 主题写入 `document.documentElement`，由唯一 Theme Service 管理；
- 用户主动选择当前只在浏览器本地持久化；System Preference 的真实接入范围留待 Web-P3 决策；
- 首屏脚本需避免主题闪烁；
- TDesign、MOM 组件和图表必须消费同一套 Semantic Token。

## 12. 测试与质量门禁

Web-P1-S06 已建立统一命令：

- `pnpm lint`：ESLint；
- `pnpm typecheck`：Vue/TypeScript 严格类型检查；
- `pnpm test`：Vitest + Vue Test Utils + jsdom；
- `pnpm build`：类型检查与生产构建；
- `pnpm verify`：按 Lint → Type → Test → Build 顺序执行完整前端门禁。

组件验证页只在开发模式登记路由，不进入生产菜单和构建产物。生产验收结果与已知限制见 `validation/web-p1-quality-gate.md`。真实业务模块进入后，测试继续优先覆盖权限、失败行为、并发冲突和未知写结果，不堆砌 getter 或静态快照。

视觉回归系统、跨浏览器矩阵和屏幕阅读器专项测试只有真实页面稳定且维护收益成立时再引入。

## 13. 性能预算

Web-P1 验证阶段记录而非提前承诺绝对值：

- 首屏主包与样式体积；
- TDesign 按需引入是否有效；
- IAM 首屏路由分包；
- 低端办公设备上的导航、表格和弹窗交互；
- 大数据表必须使用服务端分页，虚拟滚动只在真实数据量证明需要时引入。

任何超过预算的依赖或能力应先分析调用价值，不能用“未来可能需要”解释。
