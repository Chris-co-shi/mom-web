# MOM Web 文档导航

先读源码和 [当前实现地图](当前实现地图.md)。默认只再读取下表命中的一个专题文档。

| 我要修改 | 必读入口 | 按需补充 |
|---|---|---|
| 当前页面、路由、API、权限 | [当前实现地图](当前实现地图.md) | 对应模块源码与测试 |
| 页面视觉、响应式、无障碍 | [B2 UI 契约](standards/b2-ui-contract.md) | [设计系统](design-system.md) |
| 列表 CRUD、分页、失败状态 | [CRUD 管理页标准](standards/crud-management-page-standard.md) | 一个真实页面 |
| 路由、请求和模块边界 | [前端架构](frontend-architecture.md) | 对应 ADR |
| 共享请求与写入结果未知 | [HTTP Client 契约](http-client.md) | 对应模块 API 与恢复页面 |
| 产品导航和用户任务 | [产品体验](product-experience.md) | 当前后端契约 |
| 当前页面与后续方向 | [当前实现地图](当前实现地图.md) | 后端路线图与当前 Slice |

## 权威顺序

1. 用户确认的当前 Slice；
2. 后端源码、接口与 Accepted ADR；
3. 本仓库源码和 [当前实现地图](当前实现地图.md)；
4. 当前前端标准与 ADR；
5. 被替代 ADR 仅作为历史决策背景。

ADR-001、ADR-002 已被 [ADR-003](decisions/ADR-003-ui-foundation-migration.md) 替代，不作为当前组件选型依据。
