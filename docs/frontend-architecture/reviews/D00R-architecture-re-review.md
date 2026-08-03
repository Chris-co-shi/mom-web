# MOM-Web D00R 架构复审报告

> 复审日期：2026-08-03  
> 前序报告：[D00 全量架构评审](D00-architecture-review.md)  
> 复审结论：**GO（仅允许进入独立 D01 决策生效阶段）**  
> 当前状态：Product Architecture 仍为 Draft；ADR-011～016 仍为 Proposed

> 后续状态：Chris 已批准并完成 D01；正式状态与验证结果见 [D01 决策生效报告](D01-decision-activation-report.md)。本报告保留 D01 前的复审快照。

## 1. 结论

D00R 已关闭首轮评审的 1 项 Blocker、6 项 Major，并把 3 项 Minor 转化为明确、可验证的架构条款。没有通过放宽安全契约、删除测试、扩大产品范围或伪造后端能力关闭问题。

本次 `GO` 只表示文档具备进入 D01 状态治理的条件，不表示 D01、S00 或任何代码 Slice 已经获准：

- Chris 仍需单独批准 D01；
- D01 只同步产品文档、ADR 状态和替代关系，不修改业务代码与 UI；
- S00 仍需独立 Slice Review；
- Workbench、Production、Quality、Portal 业务页等 Future 项继续没有实现授权。

## 2. 复审范围与方法

复审对象：

- 六份 [Product Architecture](../../product-architecture/product-positioning.md)；
- 九份 [Frontend Architecture](../README.md)；
- [ADR-011](../../adr/ADR-011-MOM自有轻量前端运行时与Vben渐进退出.md)～[ADR-016](../../adr/ADR-016-MOM样式系统与Token单一来源.md)；
- 首轮报告中 B-01、M-01～M-06、N-01～N-03 的必须修正项；
- Accepted ADR、System Catalog/Preference/Dynamic I18n 与 S19-A 跨仓库集成边界。

复审仍使用 Evidence First + Product First：Accepted 后端/安全契约优先于 Proposed 前端文档，产品任务优先于微服务和权限目录，真实验证优先于计划中的命令。

## 3. 问题关闭矩阵

|ID|级别|D00R 修订|复审结果|
|---|---|---|---|
|B-01|Blocker|删除 Catalog 旧快照降级；仅当前 200 或服务端确认 304 可驱动动态路由；失败撤销动态路由并保留静态 Core Route|Closed|
|M-01|Major|D01 改为同步将六份产品文档转 `Approved with Deferred Items`，Future/Deferred 不获实现授权|Closed|
|M-02|Major|确认 P1.6 覆盖 Preference、Catalog/Navigation、Dynamic I18n、非秘密 Parameter、Dictionary；排除其他 System 内部对象|Closed|
|M-03|Major|分离页面/数据状态与命令状态，补齐 401/403/404/409/429/5xx/网络失败映射和恢复责任|Closed|
|M-04|Major|新增 MOM 代码立即服从 Antdv/Lucide/Token；Vben/Reka/Iconify/Sass 仅为冻结、有终点的历史例外|Closed|
|M-05|Major|产品文档同步 Admin 1024px、Portal 360px；明确视口下限不替代真实设备/浏览器/网络验收|Closed|
|M-06|Major|S03/S05 增加 Gateway、认证、DTO/版本、ETag、停用/权限变化和跨仓库 E2E 协调门禁|Closed|
|N-01|Minor|S00 固定入口、依赖闭包、gzip、Source Map、CI 版本和基线报告的 Bundle 测量协议|Closed|
|N-02|Minor|视觉文档补充 Apple/WCAG 直接来源和查阅日期；产品名继续作为不阻断实现的延期决定|Closed|
|N-03|Minor|既有 package 不自动获得共享资格；补真实消费者、所有者和例外到期审计|Closed|

## 4. 关键契约复审

### 4.1 不做什么

仍然明确禁止：按微服务或 Permission 生成产品结构；通过 Role Switch 合并 Admin/Supplier/Customer；Web 替代 Mobile/PCS/WCS；Portal 复用内部 View Model；Catalog 下发可执行组件/路径/脚本；P1.6 建设 Future 制造业务页；Runtime Configuration 管理 Secret、主数据、权限事实或业务状态。

结论：边界完整，没有因 System 范围确认而形成“全部后台能力页面化”。

### 4.2 IAM/System 的位置

IAM 继续提供身份、权限和安全事实；System 提供体验治理与不可执行发布元数据。一级信息架构仍来自 User Task → Business Capability → Navigation。System 的五类 P1.6 页面被放在 Platform Governance 用户任务中，不建立以服务名命名的技术门户。

结论：通过。

### 4.3 反超级后台

三应用、Mobile 与用户任务模块边界保持；页面地图继续用 Existing/Must Build/Future/Not Build 阶段门禁；无后端契约的 Workbench 和制造域页面仍是 Future。

结论：通过。

### 4.4 Catalog / Preference / Dynamic I18n

- Catalog：无失败缓存降级，当前 200/服务端确认 304 才可用；其余情况 fail closed；
- Preference：只允许后端契约范围内的用户隔离显示偏好与受限 View 缓存，保存失败/409/结果未知显式呈现；
- Dynamic I18n：发布快照与 ETag，静态 `zh-CN/en-US` 是启动/故障回退；
- 三应用：独立 Runtime，不共享 Store、Session 或用户缓存；
- 集成声明：真实 Gateway/认证/跨仓库 E2E 完成前只能称“客户端准备完成”。

结论：与现有 System/安全边界一致。

### 4.5 Vben、Token、组件与回滚

迁移期已经区分“新 MOM 代码规范”和“冻结历史例外”，避免 ADR 接受即造成全仓违规。Vben 例外只能缩小，S05 删除仍受零引用、三应用构建、安全回归、关键 E2E 和 License/NOTICE 门禁约束。Token 类别、共享包消费者审计、Bundle 测量和 Slice 回滚均有明确入口。

结论：具备执行约束；实际通过仍需 S00～S05 证据，D00R 不声称代码已经符合目标态。

## 5. Product Architecture 复审建议

|文档|D01 建议|延期项是否受控|
|---|---|---|
|[product-positioning.md](../../product-architecture/product-positioning.md)|Approved with Deferred Items|产品名、真实用户研究和 Future 聚合契约继续延期|
|[information-architecture.md](../../product-architecture/information-architecture.md)|Approved with Deferred Items|域命名/排序和 Workbench 聚合继续验证|
|[role-task-model.md](../../product-architecture/role-task-model.md)|Approved with Deferred Items|Factory 以下范围、收藏/常用视图不提前实现|
|[page-map.md](../../product-architecture/page-map.md)|Approved with Deferred Items|Future 页面保持原阶段，不因批准自动建设|
|[channel-boundaries.md](../../product-architecture/channel-boundaries.md)|Approved with Deferred Items|真实设备、弱网、附件和通知仍待验证/决定|
|[frontend-architecture-input.md](../../product-architecture/frontend-architecture-input.md)|Approved with Deferred Items|3 秒 P75 网络条件和服务端预算仍未批准|

## 6. ADR-011～016 复审建议

|ADR|D01 建议|复审说明|
|---|---|---|
|[ADR-011](../../adr/ADR-011-MOM自有轻量前端运行时与Vben渐进退出.md)|Accept|原位渐进退出与迁移例外、删除门禁一致|
|[ADR-012](../../adr/ADR-012-System-Catalog、Preference与Dynamic-I18n客户端边界.md)|Accept|Catalog 已改为严格重验证/fail-closed，并补跨仓库门禁|
|[ADR-013](../../adr/ADR-013-Ant-Design-Vue作为MOM基础组件库.md)|Accept|唯一基础库/图标与有终点的 Vben 历史例外兼容|
|[ADR-014](../../adr/ADR-014-用户任务模块与依赖方向.md)|Accept|用户任务模块和单向依赖保持完整|
|[ADR-015](../../adr/ADR-015-MOM组件复用与共享包准入.md)|Accept|既有包、单消费者例外和到期审计已明确|
|[ADR-016](../../adr/ADR-016-MOM样式系统与Token单一来源.md)|Accept|Token 契约类别、生成边界和迁移例外已补齐|

所有 `Accept` 都是 D01 的状态变更建议；本报告不直接把 ADR 改成 Accepted。

## 7. 保留的 Deferred / Unknown

以下事项不阻断 D01，但继续阻断对应功能实现：

- **Need Product Decision**：正式产品中英文名、Workbench 聚合、Portal 通知、Mobile 离线任务风险分级；
- **Need Backend Confirmation**：Factory 以下数据范围、Phase 02～04 业务状态机、ERP/MOM 边界、对外质量发布、附件安全；
- **Unknown**：真实用户任务频率、Portal 设备/浏览器/网络分布、关键旅程容量；
- **Pending Measurement Decision**：3 秒 P75 的企业网络条件、关键旅程和服务端预算。

规则不变：这些事项只能保持延期或触发停止，不能由通用 MES/ERP 经验、Mock、前端状态机或技术目录补齐。

## 8. D01 前置与停止线

D01 可以被单独提请 Chris 批准，但尚未自动开始。获批后只允许：

1. 将六份 Product Architecture 改为 `Approved with Deferred Items`；
2. 将 ADR-011～016 改为 `Accepted`；
3. 记录 ADR-011 取代 ADR-010、ADR-015 取代 ADR-006，并保留历史；
4. 更新 ADR 索引、Frontend README、旧架构说明和开源/许可证台账交叉引用；
5. 执行链接、状态、`pnpm validate` 和越界检查。

D01 不修改应用代码、包、依赖、锁文件或配置，不开始 S00。若 D01 发现状态或替代关系无法一致更新，应保持 Proposed 并停止。

## 9. D00R 验证记录

|检查|当前记录|
|---|---|
|本地 Markdown 链接|PASS：检查 23 份相关 Markdown，本地链接全部可解析|
|Product/Frontend/ADR 状态|PASS：Product=Draft，Frontend/ADR-011～016=Proposed，ADR-006/010=Accepted|
|D00 问题关闭扫描|PASS：候选生效文档中不存在 Catalog 最后成功快照降级、D01 保持 Product Draft、System/视口仍未决等旧表述|
|`pnpm validate`|PASS：验证 46 项项目边界与 P1.5 安全不变量；本机 Node 25.9.0 产生非 CI 基线 engine 警告|
|代码/依赖越界|PASS：`apps/`、`packages/`、依赖、锁文件和 workspace 配置无新增差异|

## 10. 最终建议

D00R 结论为 **GO（仅 D01）**。完成本报告后停止，等待 Chris 是否批准 D01。未经明确批准，不修改状态，不进入 S00 或实现。
