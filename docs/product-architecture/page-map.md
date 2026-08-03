# MOM-Web 页面地图

> 状态：Approved with Deferred Items  
> 批准日期：2026-08-03 · Chris Review  
> 阶段：MOM Platform P1.6  
> 说明：`MVP` 表示当前 P1.6 产品闭环必须建设或保留；`Future` 按平台阶段推进；`Not Build` 明确排除

## 1. 页面阶段定义

|标记|含义|
|---|---|
|MVP — Existing|当前代码已经存在，应在 P1.6 保留并纳入一致产品结构|
|MVP — Must Build|P1.6 为使已完成 IAM/System 能力可运营而必须补齐；尚未实现|
|Future — Phase 02/03/04|已有长期规划依据，但不属于 P1.6 实现范围|
|Future — Unscheduled|方向合理，但缺少排期、后端契约或产品验证|
|Not Build|明确不建设，防止产品边界膨胀|

所有 `Must Build` 均需 Chris Review 批准后才进入后续 ADR；本文不授权实现。

## 2. 全局与身份页面

|页面|应用|角色|类型|阶段|
|---|---|---|---|---|
|登录|三 Web 应用各自入口|对应 user type|Workflow|MVP — Existing|
|强制修改密码|`mom-admin`|内部用户|Workflow|MVP — Existing|
|无权限|三 Web 应用|全部登录用户|Diagnostic|MVP — Existing|
|页面不存在|三 Web 应用|全部用户|Diagnostic|MVP — Existing|
|导航/应用不可用|`mom-admin`|内部用户|Diagnostic|MVP — Existing|
|个人显示偏好|`mom-admin`|内部用户|Configuration|MVP — Must Build|
|Portal 账号自助恢复|两个 Portal|外部用户|Workflow|Future — Unscheduled；Need Product Decision|

## 3. 平台治理页面

### 3.1 身份与访问

|页面|应用|角色|类型|阶段|
|---|---|---|---|---|
|用户列表与详情|`mom-admin`|Platform Admin、Factory Admin|List / Detail|MVP — Existing|
|角色列表与详情|`mom-admin`|Platform Admin、Factory Admin|List / Detail|MVP — Existing|
|权限目录|`mom-admin`|Platform Admin|List / Detail|MVP — Existing；只读|
|会话列表与处置|`mom-admin`|Platform Admin、Factory Admin|List / Workflow|MVP — Existing|
|安全审计查询与详情|`mom-admin`|Platform Admin、审计人员|List / Detail / Diagnostic|MVP — Existing|
|OAuth 客户端列表与详情|`mom-admin`|Platform Admin|List / Configuration|MVP — Existing|
|内部委托外部协同|`mom-admin`|专门授权的内部人员|Workflow|Future — Unscheduled；需审计契约|

### 3.2 System 产品运营

|页面|应用|角色|类型|阶段|
|---|---|---|---|---|
|应用目录列表与详情|`mom-admin`|Platform Admin|List / Detail|MVP — Must Build|
|导航草稿编排|`mom-admin`|Platform Admin|Configuration / Workflow|MVP — Must Build|
|目录发布与版本记录|`mom-admin`|Platform Admin|Workflow / List|MVP — Must Build|
|动态国际化资源与消息|`mom-admin`|Platform Admin、内容维护者|List / Configuration|MVP — Must Build|
|国际化发布、回滚与版本记录|`mom-admin`|Platform Admin|Workflow / List|MVP — Must Build|
|平台参数列表与维护|`mom-admin`|Platform Admin、Factory Admin|List / Configuration|MVP — Must Build|
|受限字典列表与维护|`mom-admin`|Platform Admin、Factory Admin|List / Configuration|MVP — Must Build|
|平台治理工作台|`mom-admin`|Platform Admin|Dashboard|Future — Unscheduled；需聚合能力|

P1.6 的 System 页面属于平台治理任务，不新增 “System” 技术门户。Application Catalog 只管理产品元数据，不能直接上传或执行页面代码。

本组 Must Build 范围已经确认：个人显示偏好、Application Catalog/Navigation、Dynamic I18n、非秘密 Parameter、Dictionary/Dictionary Item 均属于 P1.6。建设顺序由后续实施 Slice 控制；Secret、主数据、权限事实、业务状态和 System 内部技术对象不是页面范围。

## 4. 内部业务页面

### 4.1 我的工作

|页面|应用|角色|类型|阶段|
|---|---|---|---|---|
|角色化工作台|`mom-admin`|全部内部角色|Dashboard|Future — Unscheduled；Need Backend Confirmation|
|我的待处理|`mom-admin`|全部内部角色|List|Future — Unscheduled|
|异常与风险队列|`mom-admin`|主管/经理角色|List / Diagnostic|Future — Unscheduled|
|需要我决策|`mom-admin`|主管/经理角色|List / Workflow|Future — Unscheduled|

### 4.2 供应与来料

|页面|应用|角色|类型|阶段|
|---|---|---|---|---|
|交货协同列表与详情|`mom-admin`|仓储、质量、Factory Admin|List / Detail|Future — Phase 02|
|收货任务与差异详情|`mom-admin`|仓储|List / Detail / Workflow|Future — Phase 02|
|来料检验任务与详情|`mom-admin`|质量检验员、质量经理|List / Detail / Workflow|Future — Phase 02|
|原料入库确认与结果|`mom-admin`|仓储|Workflow / Detail|Future — Phase 02|

### 4.3 制造运营

|页面|应用|角色|类型|阶段|
|---|---|---|---|---|
|生产计划列表与详情|`mom-admin`|Production Planner|List / Detail / Workflow|Future — Phase 03|
|生产工单列表与详情|`mom-admin`|计划员、生产主管|List / Detail|Future — Phase 03|
|工单下达与调整|`mom-admin`|计划员、生产主管|Workflow|Future — Phase 03|
|生产执行概览|`mom-admin`|生产主管、Factory Admin|Dashboard / List|Future — Phase 03|
|生产异常处置|`mom-admin`|生产主管、质量、设备工程师|Workflow / Diagnostic|Future — Phase 03|
|PCS 过程状态引用|`mom-admin`|生产主管、设备工程师|Detail / Diagnostic|Future — Phase 03；只读上下文|

### 4.4 质量决策

|页面|应用|角色|类型|阶段|
|---|---|---|---|---|
|检验任务列表与详情|`mom-admin`|质量检验员、质量经理|List / Detail|Future — Phase 02/03|
|检验结果复核|`mom-admin`|质量检验员、质量经理|Workflow|Future — Phase 02/03|
|质量判定与放行|`mom-admin`|Quality Manager|Workflow / Detail|Future — Phase 02/03|
|不合格列表与处置|`mom-admin`|质量、生产、仓储|List / Workflow|Future — Phase 02/03|
|客户质量反馈调查|`mom-admin`|质量经理、追溯负责人|List / Workflow|Future — Phase 04|

### 4.5 库存、履约与追溯

|页面|应用|角色|类型|阶段|
|---|---|---|---|---|
|库存查询与批次详情|`mom-admin`|仓储、生产、计划、质量|List / Detail|Future — Phase 02|
|仓内作业任务与结果|`mom-admin`|Warehouse Admin|List / Detail|Future — Phase 02；执行在 Mobile|
|成品入库状态|`mom-admin`|仓储、质量|List / Detail|Future — Phase 04|
|发运计划、复核与详情|`mom-admin`|仓储、客户协同人员|List / Workflow / Detail|Future — Phase 04|
|批次谱系探索|`mom-admin`|质量经理、追溯负责人|Detail / Diagnostic|Future — Phase 04|
|影响分析|`mom-admin`|质量经理、追溯负责人|Workflow / Diagnostic|Future — Phase 04|
|投诉与召回处置|`mom-admin`|质量、追溯负责人|List / Workflow|Future — Phase 04|

### 4.6 集成诊断

|页面|应用|角色|类型|阶段|
|---|---|---|---|---|
|业务集成异常队列|`mom-admin`|Integration Admin|List / Diagnostic|Future — Phase 04|
|集成事件详情与关联业务对象|`mom-admin`|Integration Admin|Detail / Diagnostic|Future — Phase 04|
|受控重试/补偿|`mom-admin`|Integration Admin|Workflow|Future — Phase 04；Need Backend Confirmation|

## 5. Portal 页面

### 5.1 Supplier Portal

|页面|应用|角色|类型|阶段|
|---|---|---|---|---|
|Portal 状态/边界页|`supplier-portal`|Supplier Contact|Diagnostic|MVP — Existing；非业务首页|
|供应商工作台|`supplier-portal`|Supplier Contact|Dashboard|Future — Phase 02|
|交货列表、创建与详情|`supplier-portal`|Supplier Contact|List / Workflow / Detail|Future — Phase 02|
|到货与来料检验状态|`supplier-portal`|Supplier Contact|List / Detail|Future — Phase 02|
|协同文档|`supplier-portal`|Supplier Contact|List / Workflow|Future — Phase 02 候选|
|供应商切换|`supplier-portal`|Supplier Contact|Configuration|Not Build|

### 5.2 Customer Portal

|页面|应用|角色|类型|阶段|
|---|---|---|---|---|
|Portal 状态/边界页|`customer-portal`|Customer Contact|Diagnostic|MVP — Existing；非业务首页|
|客户工作台|`customer-portal`|Customer Contact|Dashboard|Future — Phase 04|
|订单/履约列表与详情|`customer-portal`|Customer Contact|List / Detail|Future — Phase 04|
|发运与质量证明|`customer-portal`|Customer Contact|List / Detail|Future — Phase 04|
|质量反馈/投诉|`customer-portal`|Customer Contact|List / Workflow / Detail|Future — Phase 04|
|客户切换|`customer-portal`|Customer Contact|Configuration|Not Build|

## 6. 明确不建设的页面

|页面|应用|角色|类型|阶段|
|---|---|---|---|---|
|按微服务自动生成的功能大厅|任何|任何|Configuration|Not Build|
|权限即菜单生成器|`mom-admin`|管理员|Configuration|Not Build|
|Admin/Supplier/Customer 角色切换器|任何|任何|Configuration|Not Build|
|PLC/DCS/PCS/WCS 实时控制台|`mom-admin`|内部用户|Workflow|Not Build|
|ERP 财务与采购结算|任何|内部/外部用户|Workflow|Not Build|
|完整 APS|`mom-admin`|计划员|Workflow|Not Build|
|通用低代码/页面生成器|`mom-admin`|管理员|Configuration|Not Build|
|通用 BI 与报表设计器|`mom-admin`|分析用户|Configuration|Not Build|
|用于替代 Mobile 的 Admin 扫码全功能页|`mom-admin`|现场人员|Workflow|Not Build|
|完整内部谱系对外公开页|两个 Portal|外部用户|Detail|Not Build|

## 7. 页面进入实现前的门槛

每个 Future 页面在转为 MVP 前必须具备：用户任务与责任人、权威业务状态、可执行动作、数据范围、冲突与错误语义、审计要求、后端契约和验收场景。仅有后端 Controller 或微服务模块不构成页面建设理由。

- **Product Decision — Confirmed**：P1.6 按本文 Must Build 集合完成平台治理闭环；页面必须按独立 Slice 交付和评审，不要求一次性大包上线。
- **Need Backend Confirmation**：Future 页面对应的状态机、权限、数据范围与跨域标识。
- **Unknown**：真实任务频率和页面容量，暂不据此冻结分页、批量与 Dashboard 细节。
