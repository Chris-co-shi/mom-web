# MOM Web 文档中心

本目录是 `mom-web` 的需求、计划、前端架构、认证运行时、交互设计、原型、页面状态、API 映射和架构决策权威入口。

> P1.6 Product Architecture 与 Frontend Architecture 已生效，S01 Token 与主题已完成。MOM Admin 的 Vben 5.7 快照保留为有期限的迁移例外；当前停在 S02 前，不自动进入 Shell、System Runtime、IAM 后端或 `mom-mobile`。

## 文档使用原则

1. 需求文档说明用户需要完成什么任务，不从数据库表或接口字段反推页面。
2. 计划文档说明按什么顺序交付、每阶段如何验收。
3. 架构文档说明三应用、共享包、状态、权限和 API 的边界。
4. 用户流程、原型图、状态矩阵、组件映射和 API 映射是正式设计资产。
5. ADR 记录关键技术与交互决策，不使用口头约定替代。
6. 代码与文档不一致时，必须明确是实现偏离还是决策变化。
7. 同一事实只维护一个权威来源，其他文档通过链接引用。
8. 前端权限只改善体验，服务端授权是安全边界。
9. 计划能力不得描述为已实现能力。

## 当前阶段

- Web Phase 01：三应用技术骨架已完成。
- P1.5：**Completed / Merged**，Web Auth Runtime、MOM Admin、Supplier/Customer Portal 与安全 E2E 全部完成。
- P1.6 D01：**Completed / Accepted**，产品架构、前端架构和 ADR-011～016 已生效。
- S00：**Completed**，质量门禁与契约/Bundle 基线已建立；严格 Bundle 产品目标仍按 S02/S05 治理。
- S01：**Completed**，单一 Token Source、三主题、渠道密度与三应用 Provider 已建立。
- S02：**Not Started / Awaiting explicit approval**，不得自动进入 UI 与 Shell 基础实现。

## P1.6 产品与前端架构

- [产品定位](product-architecture/product-positioning.md)
- [信息架构](product-architecture/information-architecture.md)
- [角色任务模型](product-architecture/role-task-model.md)
- [页面地图](product-architecture/page-map.md)
- [渠道边界](product-architecture/channel-boundaries.md)
- [前端架构产品输入](product-architecture/frontend-architecture-input.md)
- [P1.6 前端架构入口](frontend-architecture/README.md)
- [D01 决策生效报告](frontend-architecture/reviews/D01-decision-activation-report.md)
- [S00 质量安全网报告](frontend-architecture/reviews/S00-quality-safety-net-report.md)
- [S01 Token 与主题实施报告](frontend-architecture/reviews/S01-token-theme-implementation-report.md)

## P1.5 认证与授权

- [P1.5 Web 认证与授权运行时基线](architecture/P1.5-Web认证授权运行时基线.md)
- [S08 Web 第一方认证运行时实现](architecture/S08-Web认证运行时实现.md)
- [P1.5 Web 认证与授权实施计划](plans/P1.5-Web认证授权实施计划.md)
- [ADR-009：P1.5 Web 第一方认证运行时](adr/ADR-009-P1.5-Web第一方认证运行时.md)
- [mom-platform P1.5 S00 权威 PR](https://github.com/Chris-co-shi/mom-platform/pull/15)

## MOM Admin Vben 5.7 历史与退出治理

- [历史迁移架构](architecture/MOM-Admin-Vben5.7迁移架构.md)
- [历史迁移计划](plans/MOM-Admin-Vben5.7迁移计划.md)
- [ADR-010：Vben 5.7 源码快照（Superseded）](adr/ADR-010-MOM-Admin-Vben5.7源码快照.md)
- [ADR-011：MOM 自有运行时与 Vben 渐进退出](adr/ADR-011-MOM自有轻量前端运行时与Vben渐进退出.md)
- [Vben 5.7.0 来源与补丁台账](open-source/vben-5.7.0-snapshot.md)
- [IAM 用户偏好后端待办](backlog/iam-user-preferences-backend.md)
- [IAM 动态菜单与国际化待办](backlog/iam-menu-internationalization.md)

## 需求

- [前端产品范围](requirements/前端产品范围.md)
- [V1 页面需求](requirements/V1页面需求.md)
- [前端非功能需求](requirements/前端非功能需求.md)
- [用户角色与工作台](requirements/用户角色与工作台.md)

## 计划

- [V1 页面路线图](plans/V1页面路线图.md)
- [Phase 01：Web 技术骨架计划](plans/Phase-01-Web骨架计划.md)
- [P1.5：Web 认证与授权实施计划](plans/P1.5-Web认证授权实施计划.md)
- [MOM Admin Vben 5.7 迁移计划](plans/MOM-Admin-Vben5.7迁移计划.md)
- [VS-01：原料到成品页面设计计划](plans/VS-01-页面设计计划.md)

## 前端架构

- [前端总体架构](architecture/前端总体架构.md)
- [P1.5 Web 认证与授权运行时基线](architecture/P1.5-Web认证授权运行时基线.md)
- [MOM Admin Vben 5.7 迁移架构](architecture/MOM-Admin-Vben5.7迁移架构.md)
- [Monorepo 与模块边界](architecture/Monorepo与模块边界.md)
- [三应用职责边界](architecture/三应用职责边界.md)
- [状态管理与数据流](architecture/状态管理与数据流.md)
- [权限与数据权限](architecture/权限与数据权限.md)
- [API 访问与错误处理](architecture/API访问与错误处理.md)
- [设计系统与组件分层](architecture/设计系统与组件分层.md)
- [可观测性与前端诊断](architecture/可观测性与前端诊断.md)

## 设计交付

- [MOM Web 全局视觉基线](design/MOM-Web全局视觉基线.md)
- [用户流程规范](user-flows/README.md)
- [Web 原型交付规范](prototypes/README.md)
- [页面状态矩阵规范](page-state-matrix/README.md)
- [组件映射规范](component-mapping/README.md)
- [API 与权限映射规范](api-mapping/README.md)

## 测试与发布

- [前端测试策略](testing/前端测试策略.md)
- [构建发布与环境配置](release/构建发布与环境配置.md)

## 架构决策

- [ADR 索引](adr/README.md)
- [ADR 模板](adr/ADR-模板.md)

## 开源合规

- [开源来源登记](open-source/source-origin.md)
- [第三方声明](../THIRD-PARTY-NOTICES.md)
