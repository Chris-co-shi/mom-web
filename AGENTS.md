# MOM PC Web — AI 开发与交付规则

本文件适用于整个仓库。目标是在**保留 B2 视觉基线、业务规则与质量门禁**的前提下，让 Codex 以有限上下文执行增量任务；不因页面增多而反复扫描全仓或重新设计 UI。

## 任务入口与最小上下文

1. 先确认当前 Slice、改动文件和明确不做的内容；读取相关源码、一个真实调用方和必要的现行规范，不默认打开全部 docs、历史计划或验收报告。
2. UI 入口：`docs/frontend/standards/b2-ui-contract.md`。只读取与任务相关的章节；已定型的列表 CRUD 再按需查 `docs/frontend/standards/crud-management-page-standard.md`，全局 Token/视觉变更才查 `docs/frontend/design-system.md`，架构/组件库决策才查对应 ADR。既有用户决策、后端契约、现行规范优先于历史效果图。
3. 代码遵循 Reuse → Extend → Create。优先参考现有 IAM/System/MDM 页面与 `src/shared/components/`、`src/shared/ui/`；普通管理页复用 MomManagementHeader、MomListSurface、MomDataTable、MomCrud*、MomModal，不复制页面外壳、不制造万能 CRUD 组件。
4. Skills **按实际任务启用**：新视觉方案、主题、复杂交互或无障碍设计需要时使用 `ui-ux-pro-max`；复杂设计、调试与审查才启用匹配的 Superpowers 流程。已冻结 B2 的字段调整、API 对接、样式修复、常规 CRUD 不自动重跑完整设计或方案计划。技能不能覆盖用户决策或自动扩大范围。

## 不可违反的边界

- 当前 UI 基线为 shadcn-vue / Reka UI + Tailwind CSS 4 + TanStack Table v9 与 MOM Token；不得恢复 TDesign/VXE、重新选库、随意新增依赖或绕过共享组件。
- 前端仅负责可见性与交互，后端是最终授权边界；业务字段、状态动作、危险操作、幂等及失败策略以真实 API 与权限契约为准。
- 新增/修改 CRUD 需要区分加载、空数据、筛选无结果、失败、冲突和结果未知；保留防重复提交、键盘可达、亮暗主题与 i18n。
- 仅更改当前任务涉及的业务模块；不抹除用户已有改动，不为构建通过而降低业务安全或删除必要测试。差异确需改公共组件时说明调用方影响。

## 分级验证与交付

- **局部迭代**：先验证改动文件的 lint/现有定向测试；涉及 TS 类型时执行 `pnpm typecheck`。避免每修改一处就重复运行完整 `pnpm verify`。
- **完成可交付的页面/Slice、公共组件或发布前**：执行 `pnpm verify`（lint、typecheck、test、build）；失败只聚焦对应错误与相关源码，不循环重试同一命令。
- **视觉与交互**：静态命令通过不代表真实验收。按当前改动验证相关断点、主题、键盘、长文案和真实 API；未做的检查明确标记为“未验证”。
- 最终简述修改文件、复用点、运行过的验证和遗留风险，不复制完整构建输出，不自动输出整套历史计划。

当前生效设计及详细验收条件参见 `docs/frontend/README.md`；业务规范不在根级 AGENTS.md 重复维护。
