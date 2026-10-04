# MOM PC Web 分阶段实施计划

## 1. 总体顺序

```text
Web-P0 整体设计（本阶段）
  ↓
Web-P1 全局前端骨架
  ↓
Web-P2 IAM
  ↓
Web-P3 System
  ↓
Web-P4 MDM
  ↓
Web-P5+ WMS / QMS / MES 等业务 Slice
```

顺序是依赖关系，不是按页面数量衡量的里程碑。上一阶段必须达到验收标准，下一阶段才可以复用其能力。

## 2. Web-P0：整体设计

### 目标

冻结整个 PC Web 的产品方向、信息架构、设计系统、工程边界、组件库候选和实施顺序。

### 范围

- 仓库审计；
- 产品体验原则和全局信息架构；
- 视觉与 Design Token 规范；
- 路由、模块、请求、状态、权限、错误、国际化和主题边界；
- TDesign Vue Next 决策记录；
- IAM → System → MDM → 业务模块路线。

### 不在范围

- 生产代码和依赖安装；
- 页面原型实现；
- 真实接口联调；
- 供应商门户、客户门户与移动端。

### 验收标准

- 文档之间无范围冲突；
- System 范围与 ADR-043 一致；
- IAM 认证与 ADR-040 一致；
- MDM 只列当前 V1 已有能力；
- 下一阶段能够直接按文档建立骨架。

### 验证

```bash
git diff --check
pnpm lint
pnpm typecheck
pnpm build
```

## 3. Web-P1：全局前端骨架

Web-P1 必须拆成可独立验证的小 Slice，不一次性生成所有基础设施。

### P1-S01：TDesign 薄技术验证与依赖冻结

状态：**已完成（2026-10-03）**。验证结论见
[TDesign Vue Next 1.20.9 薄技术验证报告](validation/tdesign-vue-next-1.20.9.md)。

目标：只验证一个首选组件库，不制作三套 PoC。

验证矩阵：

- Vue 3.5、TypeScript 6、Vite 8 与生产构建；
- 按需引入、样式引入和包体积；
- Theme Token 与亮/暗主题；
- Table：分页、固定列、树表、加载与空状态；
- Form：校验、禁用、错误、键盘操作；
- Tree、Dialog、Drawer、Notification；
- 中文与英文 Locale；
- 基础无障碍与焦点行为。

退出条件：

- 全部关键项通过：正式采用并锁定精确版本；
- 存在可控缺口：记录局部适配方式后采用；
- 存在阻断缺口：停止接入，按 Naive UI → Element Plus 顺序验证下一个候选。

本 Slice 不是业务页面，也不同时保留多套 UI 组件库。

### P1-S02：应用启动、目录与路由

状态：**已完成（2026-10-03）**。

- 建立 `app`、`router`、`layouts`、`modules`、`shared` 边界；
- 接入 Vue Router；
- 建立登录布局、主布局和 403/404/异常页；
- 建立静态 Route Registry 与模块懒加载；
- 不创建未实施业务模块的空目录和假路由。

实际落地说明：`shared` 的依赖方向已在架构文档冻结，但当前 Slice 没有产生真实共享运行时代码，
因此没有创建空目录或占位导出；待请求、错误或国际化能力进入对应 Slice 时再按需建立。

### P1-S03：Design Token、主题与全局布局

状态：**已完成（2026-10-03）**。

- 落地 Primitive/Semantic/Component Token；
- 建立亮色、暗色、跟随系统；
- 映射 TDesign 主题变量；
- 实现顶栏、侧栏、页面容器；
- 实现减少动画和焦点样式。

### P1-S04：请求、错误与协议类型

状态：**已完成（2026-10-04）**。

- 建立唯一 HTTP Client；
- 接入 `Result<T>` 与分页协议；
- 建立超时、取消、401/403/409/429/5xx 语义；
- 写请求默认不自动重试；
- 建立 Error/Forbidden/Offline 等页面状态。

### P1-S05：国际化与格式化

状态：**已完成（2026-10-04）**。

- 接入静态 `zh-CN`/`en-US`；
- 按模块组织 Key；
- 建立时间、时区、数字、Decimal String 和单位格式化入口；
- 验证长英文、主题切换和首屏无闪烁。

### P1-S06：质量门禁与骨架收口

状态：**已完成（2026-10-04）**。证据见
[Web-P1 质量门禁与骨架收口报告](validation/web-p1-quality-gate.md)。

- 单元/组件测试基线；
- 关键路由浏览器检查；
- 可访问性检查；
- 记录构建体积和已知限制；
- 更新文档使其与实际代码一致。

Web-P1 已完成，但不等于 IAM 完成。当前只提供真实可复用的地基，下一阶段进入 Web-P2。

## 4. Web-P2：IAM

### P2-S01：登录与认证闭环

状态：**已完成（2026-10-04）**。证据见
[Web-P2-S01 登录与认证闭环验证记录](validation/web-p2-s01-auth-login.md)。

- 登录页已按整体 PC Web 设计系统落地；
- 已接入真实 `/auth/login`、`/auth/logout`；
- 已实现 sessionStorage、刷新恢复、认证路由守卫、统一 401 清理和退出入口；
- Gateway → Auth → Redis Token Store → Resource Server 真实闭环验证通过。

### P2-S02：IAM 契约审计与当前会话决策

状态：**已完成（2026-10-04）**。实现与验证结论见
[Web-P2-S02 IAM 管理与当前会话契约审计](validation/web-p2-s02-iam-contract-audit.md)。

- 已核对 Gateway `/auth/**`、Auth Controller、Request/Response、Application 事务与权限码；
- 已确认用户、角色、Permission 和关系分配 API 足以支撑真实管理页面；
- 已新增真实 `GET /auth/me` Token 快照契约，不扩展 Token、不查询用户表；
- 已完成登录后及刷新时的权限恢复、权限路由、菜单过滤和 `AuthorityGuard`；
- 已验证 401、403、服务不可用、刷新恢复与注销失效语义，不硬编码管理员权限。

### 实施顺序

1. 登录、Token 保存、刷新恢复策略与登出；
2. 权限判断入口、路由守卫、菜单和按钮可见性；
3. 用户列表、详情、创建、编辑、启停、删除、重置密码；
4. 角色列表、详情、创建、编辑、启停、删除；
5. 权限列表、详情、创建、编辑、启停、删除；
6. 用户角色分配、角色权限分配；
7. 401、403、Redis/Auth 不可用、版本冲突和未知结果验证。

### 关键约束

- 当前没有 Refresh Token；
- Opaque Token 不在前端解析；
- Token 使用 `sessionStorage`；
- 权限前端过滤不替代后端授权；
- 当前用户展示信息不足时先记录接口缺口，不伪造 `/me` 或 Token Claim。

### 完成标准

以真实 IAM API 和权限运行，不使用 Mock 冒充联调；认证和管理写失败场景可解释、可恢复。

## 5. Web-P3：System

### 实施顺序

1. 平台字典类型与字典项；
2. Supported Locale 管理与唯一默认项切换；
3. `system.*` Message Definition；
4. Translation 编辑；
5. Runtime Bundle 加载与 SSE 失效后重新拉取。

### 明确不做

- Parameter；
- User Preference；
- Application Catalog；
- Navigation Metadata；
- 发布快照和回滚；
- System 作为全平台翻译中心。

### 完成标准

范围与 ADR-043 一致；默认 Locale、Placeholder 一致性、409 冲突、SSE 断线重连和数据库不可用行为均有验证。

## 6. Web-P4：MDM V1 管理端真实联调

MDM 放在 IAM 和 System 之后，避免 MDM 页面反向承担认证、权限、主题和国际化骨架验证。

### 页面组

- 工厂结构：Plant、Workshop、Production Line、Workstation；
- 仓储结构：Warehouse、Warehouse Area；
- 库位：Location Type、Location；
- 物料：Material Category、Material；
- 计量：Dimension、UOM Category、UOM、Conversion Rule；
- 换算：Convert、Replay、Compatibility。

页面顺序应按 MDM 内部依赖和后端契约另行形成 Slice，不在 Web-P0 替用户决定聚合和业务边界。

### 完成标准

- 使用真实 MDM V1 API；
- CRUD、查询、启停、关系和换算均覆盖主要失败场景；
- ID 保持字符串；
- 分页、乐观锁、审计字段和权限语义与后端一致；
- 不把 MDM 页面扩展为未批准的组织、供应商、客户或动态属性平台。

## 7. Web-P5+：业务模块

MDM 完成后再按照用户确认的业务 Slice 推进 WMS、QMS、MES 等模块。每个模块开始前必须重新确认：

- 业务目标与真实闭环位置；
- 数据所有权与 Source of Truth；
- API、权限、状态机和失败模型；
- 页面范式和与其他模块的只读引用；
- 当前范围与明确不做；
- 真实联调与验收证据。

不提前一次性生成所有业务菜单、页面和 DTO。

## 8. 每个 Slice 的固定交付格式

### 开始前

1. 本次目标；
2. 修改文件；
3. 明确不修改；
4. 新增依赖及替代方案（如有）；
5. 验证命令。

### 完成后

1. 修改、新增、删除文件；
2. 核心实现和实际调用链；
3. 权限、状态与失败行为；
4. 执行的验证命令与结果；
5. 未完成事项和风险；
6. 下一 Slice。

## 9. 当前风险登记

| 风险 | 影响 | 处理阶段 |
|---|---|---|
| Locale/TDesign Provider 是当前最大的共享 Chunk | 后续 Locale 或 UI 能力增加可能影响首屏与缓存 | 持续记录 |
| Mini Auth `/me` 只返回用户 ID 与 Token 权限快照 | 当前不展示 displayName，权限变化需重新登录 | V1 明确接受 |
| System 历史文档能力多于当前 V1 | 容易误建页面 | 以 ADR-043 为唯一当前范围 |
| System 后端已存在 User Preference，但 Web-P3 当前明确不做 | Locale/时区/Theme 服务端同步范围尚未决策 | Web-P3 前确认 |
| 用户工作区已有未提交依赖变更 | 后续安装需避免覆盖来源 | 每个修改依赖的 Slice |
