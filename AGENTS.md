# MOM Web — Codex 入口

本文件只负责全局边界和任务路由。当前页面、路由、API 与权限见 `docs/frontend/当前实现地图.md`。

## 工作闭环

1. 先读本文件、相关源码和下表中一个专题入口；参考一个真实页面或共享组件。
2. 修改前说明目标、改动范围、不改内容和验证命令；保留用户已有改动。
3. 遵循 Reuse → Extend → Create，不新增第二套路由、请求、权限、主题或 CRUD 框架。
4. 前端只负责可见性和交互；后端是最终授权与业务规则边界。

## 任务路由

| 任务 | 先读 |
|---|---|
| 当前页面、路由、API、权限 | `docs/frontend/当前实现地图.md` |
| 页面视觉、布局、响应式、无障碍 | `docs/frontend/standards/b2-ui-contract.md` |
| 列表 CRUD、分页、写入失败 | `docs/frontend/standards/crud-management-page-standard.md` |
| 全局 Token 或主题 | `docs/frontend/design-system.md` |
| 路由、请求、模块边界 | `docs/frontend/frontend-architecture.md` |
| 组件库或全局架构决策 | 对应 `docs/frontend/decisions/ADR-*` |

普通任务不要批量读取全部 frontend 文档或历史 ADR。

## 不变量

- UI 基线为 Reka UI/shadcn-vue、Tailwind CSS 4、TanStack Table v9 和 MOM Token；不得恢复 TDesign/VXE。
- 普通管理页优先复用 `MomManagementHeader`、`MomListSurface`、`MomDataTable`、`MomCrud*`、`MomModal`。
- 服务端分页是权威；未知写入结果禁止自动重试，必须要求用户刷新核对。
- 保留加载、空数据、筛选无结果、失败、冲突、防重复提交、键盘可达、主题和 i18n 状态。
- 不主动新增生产依赖，不为构建通过删除必要测试或降低业务约束。

## 验证

- 局部改动先运行相关测试和 lint；涉及类型时运行 `pnpm typecheck`。
- 完整页面、公共组件或发布前运行 `pnpm verify`。
- 纯文档改动检查 Diff、相对链接和陈旧事实，不运行前端构建。
- 最终说明修改/新增/删除文件、验证结果、未完成事项和风险。
