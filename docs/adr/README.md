# MOM Web 架构决策记录

ADR 用于记录影响多个应用、共享包、页面交付或长期维护的重要决策。

## 状态

- `Proposed`：已提出，尚未正式接受。
- `Accepted`：当前有效。
- `Rejected`：评估后未采用。
- `Deprecated`：不再推荐，但保留历史。
- `Superseded`：已被新 ADR 替代。

## 决策索引

| ADR | 标题 | 状态 | 主要范围 |
|---|---|---|---|
| [ADR-001](ADR-001-Vben5作为参考基线.md) | Vben 5 作为前端参考基线 | Accepted | 工程与上游复用 |
| [ADR-002](ADR-002-三应用Monorepo.md) | 三应用 Monorepo | Accepted | 应用与发布边界 |
| [ADR-003](ADR-003-原型先行交付.md) | 原型先行交付 | Accepted | 页面设计门禁 |
| [ADR-004](ADR-004-浏览器仅访问Gateway.md) | 浏览器仅访问 MOM Gateway | Accepted | API 与安全边界 |
| [ADR-005](ADR-005-API模型与ViewModel隔离.md) | API 模型与 View Model 隔离 | Accepted | 类型与组件边界 |
| [ADR-006](ADR-006-共享组件准入边界.md) | 共享组件准入边界 | Accepted | 设计系统与共享包 |
| [ADR-007](ADR-007-批次谱系图独立边界.md) | 批次谱系图独立边界 | Accepted | 追溯可视化 |

## 创建规则

1. 一个 ADR 只记录一个核心决策。
2. 使用 [ADR 模板](ADR-模板.md)。
3. 文件名采用 `ADR-NNN-中文标题.md`。
4. 结论改变时创建新 ADR，并将旧 ADR 标记为 `Superseded`。
5. ADR 必须链接相关需求、架构、计划或设计规范。
6. 技术选型需记录许可证、升级和替代条件。

## 需要新增 ADR 的典型情况

- 更换前端框架、构建工具或包管理器。
- 拆分或合并应用/仓库。
- 改变 OAuth、Token 或 Gateway 访问方式。
- 引入新的状态管理或 API 数据框架。
- 选择批次谱系图库或服务端布局。
- 建立运行时配置、微前端或独立组件发布。
- 修改原型先行和页面交付门禁。
