# Monorepo 与模块边界

## 1. 目录模型

```text
apps
├── mom-admin
├── supplier-portal
└── customer-portal

packages
├── access
├── api-client
├── design-tokens
├── domain-components
├── shared
└── traceability-graph
```

## 2. 依赖方向

```text
apps
  ↓
packages
  ↓
Vue / Pinia / Axios / Ant Design Vue 等基础依赖
```

禁止：

```text
packages → apps
app A → app B
领域组件 → API Client
设计 Token → 业务类型
```

## 3. 应用边界

应用负责：

- 路由与布局。
- 页面组合。
- 应用私有 Store。
- 应用私有 API 编排。
- OAuth Client 配置。
- 独立构建和发布。

应用之间不得：

- 直接导入页面或 Store。
- 共享运行时全局变量。
- 假设相同发布版本。
- 使用同一个 Client ID 规避配置。

## 4. 共享包准入

代码进入共享包必须满足至少一项：

- 多个应用稳定复用。
- 多个领域页面稳定复用。
- 属于明确的跨应用契约。
- 属于设计系统或工程基础能力。

不能因为两处代码相似就立即抽取。

## 5. 包职责

### `@mom/api-client`

- HTTP 客户端。
- 请求头和关联 ID。
- 统一响应与错误。
- 超时、取消和重试边界。
- 幂等键和文件下载。

### `@mom/access`

- 登录状态契约。
- 权限码。
- 路由元数据。
- 菜单和按钮判断。
- 工厂/组织上下文。

### `@mom/design-tokens`

- 色彩和状态 Token。
- 字体、间距和布局。
- 表格、表单和密度约定。
- 工业状态视觉语义。

### `@mom/domain-components`

- 工作项。
- 批次、库存、工单和检验。
- 设备/任务状态。
- 时间线和状态摘要。

只接收 View Model 和事件，不直接调用后端。

### `@mom/shared`

- 无业务格式化。
- 基础类型。
- 通用校验。
- 可复用但不依赖业务领域的工具。

### `@mom/traceability-graph`

- 谱系节点、边和交互模型。
- 图形布局适配。
- 选择、定位、筛选和详情事件。

不拥有谱系事实和影响计算规则。

## 6. 类型边界

建议区分：

```text
API DTO
→ Boundary Mapper
→ View Model
→ Component Props
```

不得把 API DTO 直接贯穿所有组件，否则后端字段变化会污染 UI 层。

## 7. 验证规则

`scripts/validate.mjs` 后续应校验：

- 应用间非法依赖。
- 共享包反向依赖应用。
- 未登记的 Workspace 包。
- 目录与命名约定。
- 禁止的源码来源。
- 原型和设计文档必备文件。

## 8. 变更原则

- 新包必须有明确职责、消费者和维护边界。
- 拆包或合包需要 ADR 或架构文档更新。
- 临时实验优先留在应用内，不直接污染共享包。
- 删除包前必须处理消费者、迁移方案和版本影响。
