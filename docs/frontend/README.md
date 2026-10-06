# MOM PC Web 设计与实施基线

## 1. 文档定位

本目录是 `mom-web` 的 PC 管理端前端基线，适用于 IAM、System、MDM 以及后续 WMS、QMS、MES 等业务模块。
它不是 MDM 专属设计，也不包含供应商门户、客户门户或 PDA 设计。

当前 **Web-P0、Web-P1 与 Web-P2-S01 登录认证闭环均已完成**，下一步继续 IAM 权限和管理能力。当前仍不通过演示数据伪造业务联调结果。

## 2. 已冻结的方向

- 产品形态：单一 MOM PC 管理端应用；
- 视觉气质：专业、克制、现代、精确，具有适度科技感和智能感；
- 信息密度：中高密度，优先保障制造管理任务的扫描与操作效率；
- 实施顺序：`整体设计 → 全局骨架 → IAM → System → MDM → 业务模块`；
- UI 基线：Reka UI + shadcn-vue + Tailwind CSS 4 + TanStack Table v9；先复用 MOM 共享组件；
- 主题：亮色、暗色、跟随系统三种模式；
- 国际化：静态资源由 Web 持有，初始支持 `zh-CN` 与 `en-US`；
- 权限：前端只做可见性与体验控制，后端始终是最终授权边界；
- 导航：由 Web 源码维护可执行路由与菜单映射，不依赖已经退出 System V1 的历史导航能力。

## 3. 文档索引

1. [产品体验与信息架构](product-experience.md)
2. [视觉与设计系统](design-system.md)
3. [前端工程架构](frontend-architecture.md)
4. [分阶段实施计划](implementation-plan.md)
5. [ADR-001：PC Web UI 组件库选择](decisions/ADR-001-ui-component-library.md)
6. [TDesign Vue Next 1.20.9 验证报告](validation/tdesign-vue-next-1.20.9.md)
7. [Web-P1 质量门禁与骨架收口报告](validation/web-p1-quality-gate.md)
8. [Web-P2-S01 登录与认证闭环验证记录](validation/web-p2-s01-auth-login.md)
9. [CRUD 管理页项目级交互标准](standards/crud-management-page-standard.md)
10. [ADR-003：全站 UI 基线迁移](decisions/ADR-003-ui-foundation-migration.md)

## 4. 权威关系

发生冲突时按以下优先级处理：

1. 用户明确确认的当前 Slice 决策；
2. `mom-platform` 当前 Accepted ADR 与接口契约；
3. 本目录已经冻结的前端决策；
4. 历史代码、历史报告和候选方案。

后端范围变化不会自动扩展前端范围。新增页面必须进入对应 Slice，并说明 API、权限、失败模型和验收证据。

## 5. 变更规则

- 修改全局视觉语言、模块边界、认证模型、UI 组件库或国际化所有权时，必须更新本目录和对应 ADR；
- 新业务模块只能复用全局骨架，不得自建第二套路由、请求、权限、主题或组件库；
- 文档中的“计划”不能描述为“已实现”；
- ADR-001 与 ADR-002 以及 Web-P1 验证报告保留历史证据；当前生产 UI 以 ADR-003 为准。
