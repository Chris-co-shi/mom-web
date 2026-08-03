# 03 · UI 组件库

> 状态：Accepted · Chris Review 2026-08-03
>
> 关联决策：[ADR-013](../adr/ADR-013-Ant-Design-Vue作为MOM基础组件库.md)

## 1. 选择

Ant Design Vue 4.2.6 作为三个 Web 应用唯一基础组件库，迁移期间不升级版本。它提供表单、表格、弹层、反馈与无障碍基础；MOM 通过集中 Theme Adapter 和语义组合形成自己的产品语言，而不是逐页覆盖样式。

Lucide 是唯一图标集。业务元数据只保存静态 `iconKey`，由客户端 Registry 映射到已打包图标。

## 2. 组件分层

```text
Ant Design Vue Primitives
          ↓
MOM Semantic Composites
          ↓
Stable Cross-app Domain Components
          ↓
Module-private Components
          ↓
Page-local Composition
```

MOM 首批语义组合只覆盖重复且高风险的交互：

- `Page`：标题、说明、面包屑、主操作和内容区；
- `DataState`：Loading、Empty、No Result、Error、Forbidden、Not Found、Partial；
- `ActionBar`：主次操作、溢出和响应式行为；
- `ConfirmAction`：高风险确认、审计原因、提交中和结果未知；
- Lucide Registry：受控图标键解析和未知键回退。

具体 API 在 S02 通过示范页和组件测试冻结，D00 不提前设计 Props。

`DataState` 只统一页面/数据表达，不拥有业务命令状态机。Idle、Submitting、Processing、Succeeded、Conflict、Rate Limited、Result Unknown 由模块用例建模并显式传给语义组件；共享组件不得根据 HTTP 状态或超时自行猜测业务结果。

## 3. 使用规则

1. 业务页面可以直接使用 Antdv 原语；只有稳定语义才进入 `common-ui`。
2. Theme 只通过 Antdv Theme Adapter 和语义 Token 调整，禁止在业务页面深层选择器覆盖内部 DOM。
3. Portal 必须按需使用组件，避免全量注册形成单块加载。
4. 共享组件不调用 API、不读取 Router/Store、不硬编码 Permission，只接收 View Model、状态和事件。
5. 表格、表单和弹层必须沿用 Antdv 可访问语义，不以纯 `div` 重造控件。
6. 高风险操作使用统一确认模式，但确认文案、原因要求和幂等行为由用例显式传入。

## 4. 不引入与例外

当前不引入第二套 UI 库、Reka、AG Grid、另一个图标集或通用 Headless 组件层。只有当现有组件无法满足经测量的复杂度、性能或无障碍要求时，才可提交新 ADR；ADR 必须说明消费者、Bundle 影响、许可证、替代方案和退出条件。

现有 Vben 快照中的 Reka/Iconify 是 S05 前冻结的迁移例外，不是 MOM 新组件的可选基础。新增或实质修改的 MOM 自有代码不得增加这些依赖、调用或复制；例外仅随 Vben 旧调用面缩小，并在零引用删除门禁后终止。

## 5. 验收

- 三应用只有一个基础组件库和一个图标来源；
- Light/Dark/System 与两种密度通过同一 Adapter 生效；
- Portal 初始加载不包含未使用的 Antdv 全量组件；
- 页面/数据状态与命令状态均有类型和恢复路径；语义组件覆盖键盘、焦点、加载、禁用、错误、限流、冲突、结果未知和重复提交测试；
- 页面无未登记的 Antdv 深层覆盖或任意颜色值；
- 版本与许可证在第三方台账中可追溯。
