# 04 · 目录结构

> 状态：Accepted · Chris Review 2026-08-03

## 1. 应用结构

```text
apps/<app>/src/
├── app/          # Bootstrap、Provider、该应用独立 Runtime
├── router/       # Core Route、静态 Registry、Guard
├── layouts/      # Admin、Portal、Auth Shell
├── modules/      # 用户任务模块
├── locales/      # 启动和故障回退资源
├── styles/       # 应用入口与渠道覆盖
└── assets/
```

目录表达运行时责任，而不是框架模板或后端服务。只在存在真实实现时创建目录，不预建空的 Workbench、MES、WMS、QMS 或“未来能力”占位结构。

## 2. 模块结构

```text
modules/<capability>/
├── api/          # DTO 适配与模块用例客户端
├── model/        # View Model、显式页面状态
├── pages/        # 路由页面
├── components/   # 模块私有组件
├── composables/  # 模块私有编排
├── routes.ts     # 模块公开路由声明
└── index.ts      # 唯一公共入口
```

以上子目录按需存在。模块内部允许按用户任务继续分组，但不得从其他模块深层导入；跨模块使用 `index.ts` 暴露的最小契约。

## 3. 跨应用包目标

|包|边界|
|---|---|
|`first-party-auth`|认证协议、Session 与刷新契约|
|`access`|客户端访问判断与既有安全同步|
|`api-client`|唯一 Fetch 请求实现、错误与追踪契约|
|`system-client`|Catalog、Preference、Dynamic I18n 客户端协议|
|`portal-access`|外部渠道 Client、Party 与数据范围约束|
|`design-tokens`|Token 来源、生成产物和类型|
|`common-ui`|通过准入的无业务基础设施依赖语义组件|
|`traceability-graph`|已由 ADR 明确的独立可视化边界|

`@mom/iam-admin` 迁回 Admin 的 People & Access 模块；无真实消费者的 `@mom/shared`、`@mom/domain-components` 占位包按消费者收敛。迁移不是一次性改名，必须逐 Slice 保持公开入口和回归证据。

## 4. Vben 目录退出

`internal/`、`packages/@core/`、`packages/effects/` 以及顶层快照包在 S05 前保持不动。只有零引用和完整退场门禁通过后才删除，禁止先删目录再通过别名或复制代码补洞。

## 5. 导入约束

- 应用不得导入另一个应用；
- 模块不得导入另一个模块的私有文件；
- package 不得反向依赖应用；
- `common-ui`、`design-tokens` 和纯工具不得依赖业务模块；
- 禁止循环依赖、跨应用 Store 和全局可变单例；
- 别名必须映射到公开入口，不能掩盖深层导入；
- 路由页面按任务边界懒加载，Core/Auth 保持可预测的最小启动闭包。

## 6. 迁移完成判据

目标结构不是通过空目录验收，而是通过依赖图、公开入口、测试和构建产物验收。每次移动必须核对 Router、CSS、i18n、测试、静态资源和动态导入引用；未完成的兼容层必须登记所属 Slice 和删除条件。
