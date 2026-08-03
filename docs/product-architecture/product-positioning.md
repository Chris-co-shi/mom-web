# MOM-Web 产品定位

> 状态：Approved with Deferred Items  
> 批准日期：2026-08-03 · Chris Review  
> 阶段：MOM Platform P1.6  
> 决策范围：产品定位，不构成 Frontend Architecture ADR，也不决定 Vben 去留

## 1. 结论摘要

推荐将 MOM-Web 定位为：**面向制造协同任务的多渠道工作空间**。

它不是后端服务的菜单投影，也不是容纳所有角色的“超级后台”。内部用户、供应商、客户与现场人员通过不同渠道完成同一业务链条中的不同任务：PC 负责计划、配置、判断与分析；Portal 负责受限的外部协同；Mobile 负责现场执行与采集。

当前证据足以支持这一方向，但不足以冻结全部工作台指标和 Phase 02 之后的页面优先级。相关缺口均在本文标记。

## 2. 证据与事实基线

### 2.1 当前三应用

|应用|当前定位|当前用户|已存在页面/能力|明显缺失|
|---|---|---|---|---|
|`mom-admin`|内部管理入口，当前实质是 IAM 管理台|内部管理员|登录、强制改密、用户、角色、权限只读、会话、安全审计、OAuth 客户端、403/404/菜单错误|System 管理界面、制造业务任务、角色工作台、跨域业务导航|
|`supplier-portal`|供应商隔离的外部入口骨架|供应商联系人|登录、身份/Party/Factory 边界校验、状态与规划能力占位|交货、来料检验、文档协同等业务页面均未启用|
|`customer-portal`|客户隔离的外部入口骨架|客户联系人|登录、身份/Party/Factory 边界校验、状态与规划能力占位|订单、发运、质量反馈等业务页面均未启用|

当前 Portal 代码把供应商的交货、来料检验、文档，以及客户的订单、发运、质量反馈标为 `planned`，不能视为已交付能力。

### 2.2 IAM/System 能力输入

- IAM 已提供 User、Role、Permission、Application/OAuth Client、Session、Audit 等身份与安全能力。
- System 已提供 Parameter、Dictionary、Dynamic I18n、User Preference、Application Catalog、Navigation 及发布/runtime 能力。
- IAM 的 Role 与 Permission 不等价；一个用户可拥有多个角色，权限取并集。
- System Application Catalog 是产品导航元数据，不等于 OAuth Client；客户端仍拥有可执行页面与路由。
- System 后端完成不代表 mom-web 已完成接入。当前 mom-web 未发现 System 产品页面或 runtime 导航接入。

这些能力是产品运行基础，不直接转换为一级菜单。

### 2.3 MOM 长期业务链

现有规划给出的主链为：供应商交货 → 来料检验 → 原料入库 → 生产工单 → PCS 投料/混合/灌装 → 成品检验与放行 → WCS 入库 → 客户发运 → 投诉、追溯与召回。

明确边界：MOM 不承担 PLC/DCS 硬实时控制、安全联锁、运动控制、ERP 财务与采购结算、完整 APS；PCS/WCS 保持独立系统边界；现场扫码和离线命令由 `mom-mobile` 承担。

### 2.4 证据置信度

|结论|置信度|说明|
|---|---|---|
|三应用当前实现状态|高|来自当前代码与现有应用文档|
|IAM/System 能力与安全边界|高|来自 P1.5/P1.6 计划、ADR 与后端实现资料|
|长期制造链与系统非目标|高|来自平台 README 与 V1 规划|
|角色每日任务排序|中|来自需求文档，尚无访谈、使用数据或现场观察|
|页面数量和产品性能阈值|低至中|需在后续产品决策与真实数据中确认|

### 2.5 证据索引

本轮采用的主要仓库证据如下，评审时应优先回到原文和当前代码：

- Web 产品范围与非目标：[前端产品范围](../requirements/前端产品范围.md)
- 角色与工作台假设：[用户角色与工作台](../requirements/用户角色与工作台.md)
- 已规划页面与阶段：[V1 页面需求](../requirements/V1页面需求.md)、[V1 页面路线图](../plans/V1页面路线图.md)
- 三应用职责：[三应用职责边界](../architecture/三应用职责边界.md)、[前端总体架构](../architecture/前端总体架构.md)
- 当前实现：`apps/mom-admin/src/App.vue`、`apps/supplier-portal/src/App.vue`、`apps/customer-portal/src/App.vue`、`packages/portal-access/src/index.ts`
- 平台总目标与长期业务链：[MOM Platform README](../../../mom-platform/README.md)
- 身份与外部边界：[P1.5 认证与授权设计基线](../../../mom-platform/docs/security/P1.5-认证与授权设计基线.md)
- P1.6 能力状态：[P1.6 IAM 与 System 平台治理计划](../../../mom-platform/docs/plans/P1.6-IAM与System平台治理计划.md)
- System 能力：[mom-system-platform README](../../../mom-platform/mom-system-platform/README.md)
- Catalog/IAM/客户端职责：[ADR-030](../../../mom-platform/docs/adr/ADR-030-System应用目录导航发布与IAM权限引用边界.md)
- System 交付证据：[S16 用户偏好报告](../../../mom-platform/docs/engineering/P1.6-S16-System用户偏好与视图设置能力报告.md)、[S17 目录导航报告](../../../mom-platform/docs/engineering/P1.6-S17-System应用目录导航与权限引用能力报告.md)、[S18 生命周期报告](../../../mom-platform/docs/engineering/P1.6-S18-System运行时缓存变更通知与IAM权限引用生命周期报告.md)

发现一处状态漂移：mom-web 既有路线图与部分平台概览仍把 System Client 集成描述为较早状态，而 P1.6 计划和 S16—S18 报告显示后端能力已经完成、客户端集成仍延后。本文采用“后端能力已存在；Web 产品未接入”的拆分表述，不把任何一方静默改写为另一方。

## 3. 产品定位候选

### 方案 A：平台治理控制台

**产品名称**：MOM Platform Console  
**产品目标**：让平台管理员完成身份、安全、应用目录、国际化和平台参数治理。  
**目标用户**：以 Platform Admin、Factory Admin、Integration Admin 为主；生产、质量、仓储、供应商、客户不是主要用户。  
**核心价值**：管理员每天能处理账号、授权、会话、安全审计与配置发布问题。  
**覆盖范围**：包含 IAM、System 和有限诊断；不包含 Production、Quality、Inventory、供应商/客户业务协同。  
**建设成本**：产品复杂度低至中；页面量较小；长期维护成本较低。  
**风险**：与 MOM 的制造协同目标脱节；绝大多数工厂用户没有每日使用理由；Portal 和 Mobile 失去统一产品语义。

### 方案 B：面向制造协同任务的多渠道工作空间（推荐）

**产品名称**：MOM Operations Workspace  
**产品目标**：围绕用户任务贯通供应、来料、生产、质量、库存、履约和追溯，同时把 IAM/System 放在平台治理层支撑所有任务。  
**目标用户**：内部管理员、工厂管理人员、计划与生产人员、质量与仓储人员、供应商、客户，以及使用 Mobile 的现场人员。  
**核心价值**：用户每天可以知道“现在要处理什么、哪里异常、需要作出什么决定、处理后业务状态如何变化”。  
**覆盖范围**：分阶段包含 IAM、System、Inbound、Production、Quality、Inventory/Fulfillment、Traceability；Portal 仅覆盖外部协同切面，Mobile 仅覆盖现场执行。不包含硬实时控制、ERP 结算、完整 APS、通用 BI/报表设计器。  
**建设成本**：产品复杂度中至高；页面随业务阶段增长；需要维护角色任务模型、渠道边界和跨域上下文，但可按 Phase 逐步交付。  
**风险**：若没有任务优先级与明确非目标，仍可能膨胀成超级后台；跨域状态与工作台聚合依赖后端确认；角色模型需现场验证。

### 方案 C：全角色一体化超级后台

**产品名称**：MOM Unified Admin  
**产品目标**：在单一应用中暴露所有平台和制造功能，由角色权限决定每个人看到的菜单。  
**目标用户**：内部管理员、工厂人员、供应商、客户和移动人员全部进入同一产品。  
**核心价值**：表面上统一入口和建设方式。  
**覆盖范围**：IAM、System 和所有制造域全部纳入单应用；不主动建立 Portal/Mobile 产品边界。  
**建设成本**：初期看似较低，长期产品复杂度、页面数量、导航治理与回归成本最高。  
**风险**：权限被错误当成产品结构；外部身份与内部身份混合；形成大量菜单；移动场景被响应式页面替代；安全、认知和维护边界同时恶化。

## 4. 推荐决策

选择方案 B，原因是它同时满足三类已知事实：MOM 长期价值来自制造链协同；当前已有明确的三应用安全边界；现场执行已有独立 `mom-mobile`。该方案允许 P1.6 先补齐平台治理产品面，再按 Phase 02—04 扩展业务任务，而无需假装所有业务已经可用。

P1.6 的平台治理产品面确定覆盖：个人显示偏好、Application Catalog 与 Navigation 治理、Dynamic I18n 治理、非秘密 Parameter、Dictionary 与 Dictionary Item。该范围是已完成 IAM/System 能力的产品运营闭环，不代表所有 System 内部能力都要暴露为页面，也不新增独立 “System” 技术门户。Secret、主数据、权限事实和业务状态不进入这些治理页面。

不选择方案 A，是因为它只能解释当前 `mom-admin`，无法解释 MOM-Web 长期存在的业务价值和两个 Portal。  
不选择方案 C，是因为它与 P1.5 已确定的 user type、OAuth Client、Party 隔离和 Mobile 边界冲突，也会把权限配置退化成产品设计。

## 5. 产品边界：明确不做什么

- 不把 IAM、System、MES、WMS、QMS 等微服务名称直接作为导航结构。
- 不把权限集合自动生成为菜单；权限只参与可见性和操作授权。
- 不让供应商、客户通过内部角色切换进入 `mom-admin`。
- 不让内部用户通过角色切换伪装成供应商或客户；代理操作必须走受审计的委托机制。
- 不由 MOM-Web 承担现场实时采集、离线扫码和设备动作执行；这些属于 `mom-mobile` 或 PCS/WCS。
- 不承担 PLC/DCS 硬实时控制、安全联锁、运动控制。
- 不承担 ERP 财务、采购结算和完整 APS。
- 不在本阶段决定 Vue 架构、组件库、Design Token、CSS 方案或 Vben 去留。
- 不在 P1.6 虚构尚无聚合接口支撑的业务工作台。

## 6. 待决策与待确认

- **Unknown**：尚无真实用户访谈、任务频率、页面使用数据和工厂现场观察。
- **Need Product Decision**：产品对外名称是否采用 “MOM Operations Workspace”，以及中文名称。
- **Product Decision — Confirmed**：P1.6 建设个人显示偏好、Catalog/Navigation、Dynamic I18n、非秘密 Parameter 与 Dictionary 五类平台治理产品能力；除此之外的 System 内部能力不自动形成页面。
- **Need Backend Confirmation**：工作台所需的待办、异常、告警、责任人、优先级和数据新鲜度是否已有统一契约。
- **Need Backend Confirmation**：Phase 02—04 各业务域的用例 API、状态机和跨域关联标识何时冻结。

## 7. 批准范围与停止线

本文与同目录其他产品架构文档已经 Chris Review 批准，可作为 Frontend Architecture 的产品输入。该批准不授权 Deferred/Future 页面实施；所有技术 Slice 仍须遵守 [P1.6 前端实施计划](../frontend-architecture/08-implementation-plan.md) 的独立 Review 与停止线。
