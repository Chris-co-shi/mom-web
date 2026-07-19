# MOM Web 文档中心

本目录是 `mom-web` 的需求、计划、前端架构、认证运行时、交互设计、原型、页面状态、API 映射和架构决策权威入口。

> 文档变更使用与具体 Work/Slice 对应的任务分支。本次 P1.5 S00 使用 `feat/p15-s00-design-baseline`；历史 `agent/complete-chinese-docs` 仅作为既有文档整理分支。

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

- Web Phase 01：三应用技术骨架已具备，正式 OAuth Auth Runtime 尚未实现。
- P1.5 S00：Web 认证授权设计已对齐，实施安排在 S08～S10。

## P1.5 认证与授权

- [P1.5 Web 认证与授权运行时基线](architecture/P1.5-Web认证授权运行时基线.md)
- [P1.5 Web 认证与授权实施计划](plans/P1.5-Web认证授权实施计划.md)
- [ADR-008：P1.5 Web 认证运行时](adr/ADR-008-P1.5-Web认证运行时.md)
- [mom-platform P1.5 S00 权威 PR](https://github.com/Chris-co-shi/mom-platform/pull/15)

## 需求

- [前端产品范围](requirements/前端产品范围.md)
- [V1 页面需求](requirements/V1页面需求.md)
- [前端非功能需求](requirements/前端非功能需求.md)
- [用户角色与工作台](requirements/用户角色与工作台.md)

## 计划

- [V1 页面路线图](plans/V1页面路线图.md)
- [Phase 01：Web 技术骨架计划](plans/Phase-01-Web骨架计划.md)
- [P1.5：Web 认证与授权实施计划](plans/P1.5-Web认证授权实施计划.md)
- [VS-01：原料到成品页面设计计划](plans/VS-01-页面设计计划.md)

## 前端架构

- [前端总体架构](architecture/前端总体架构.md)
- [P1.5 Web 认证与授权运行时基线](architecture/P1.5-Web认证授权运行时基线.md)
- [Monorepo 与模块边界](architecture/Monorepo与模块边界.md)
- [三应用职责边界](architecture/三应用职责边界.md)
- [状态管理与数据流](architecture/状态管理与数据流.md)
- [权限与数据权限](architecture/权限与数据权限.md)
- [API 访问与错误处理](architecture/API访问与错误处理.md)
- [设计系统与组件分层](architecture/设计系统与组件分层.md)
- [可观测性与前端诊断](architecture/可观测性与前端诊断.md)

## 设计交付

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
