# MOM-Web 角色与任务模型

> 状态：Approved with Deferred Items  
> 批准日期：2026-08-03 · Chris Review  
> 阶段：MOM Platform P1.6  
> 核心约束：角色描述职责，Permission 控制具体操作；两者不得互相替代

## 1. 模型原则

- `user_type` 定义 INTERNAL、SUPPLIER、CUSTOMER 的安全身份边界，不是岗位角色。
- Role 是一组相对稳定的职责，Permission 是可执行动作的授权。一个内部用户可拥有多个角色，生效权限取并集。
- Factory 与 Party 是数据范围，不是靠前端筛选器实现的安全控制。
- Mobile Worker 是使用渠道/工作方式，不是新的 `user_type`。
- 工作台按“用户当前职责 + 当前 Factory 上下文 + 可处理任务”组织，不按角色名称复制多个首页。
- P1.5 不支持同一用户在不同 Factory 拥有不同角色，产品不能暗示该能力存在。

## 2. 内部用户角色

|角色|职责|目标|核心任务|数据范围|
|---|---|---|---|---|
|Platform Admin|治理平台级身份、安全与产品目录|让平台可控、可审计、可恢复|用户/角色治理、会话处置、客户端治理、安全审计、目录和 I18n 发布|平台级；高风险操作仍需独立权限|
|Factory Admin|维护工厂范围内的人员和运行配置|让本工厂用户能正确工作|工厂用户协助、范围检查、参数/字典管理、异常协调|授权 Factory；当前角色本身不能按 Factory 变化|
|Production Planner|形成并调整可执行生产计划|按需求与约束安排生产|创建/调整计划、下达工单、识别物料和产能约束|授权 Factory 及相关生产范围|
|Production Manager|对生产进度和偏差负责|让工单按目标推进|监控进度、处理阻塞、协调质量/仓储、确认异常处置|授权 Factory、产线或业务范围；细粒度范围待确认|
|Production Operator|执行现场生产任务并反馈事实|安全、正确、及时完成任务|接收任务、扫码/确认、记录结果、反馈异常|本人任务及授权现场范围；主要使用 Mobile|
|Warehouse Admin|对收货、库存和发运作业负责|保持库存准确并按时履约|到货协调、库存查询、作业安排、差异处置、发运复核|授权 Factory/仓库；仓库维度待后端确认|
|Quality Inspector|执行检验并提供可信结果|及时完成规定检验|查看检验任务、采样/录入、补充证据、提交结果|被分配任务及授权 Factory|
|Quality Manager|作出质量判定并控制风险|只让符合要求的物料和产品流转|判定、放行、不合格处置、质量反馈调查|授权 Factory/质量范围；跨工厂权限待确认|
|Equipment Engineer|支持设备与工艺过程异常分析|缩短设备相关阻塞时间|查看过程上下文、诊断异常、反馈处理结果|授权 Factory/设备范围；不直接替代 PCS 控制|
|Integration Admin|保障跨系统业务消息与接口可恢复|快速定位并恢复集成失败|查看失败、重试/补偿受控操作、关联业务对象|授权应用/Factory；不得默认读取敏感业务全文|
|Traceability & Recall Manager|管理影响分析、投诉与召回|快速确定范围并形成可审计响应|谱系查询、影响分析、调查、召回流程跟踪|授权 Factory/产品/客户范围，细则待确认|

“Group Admin”在现有需求资料中出现，但其组织层级、与 Platform Admin/Factory Admin 的差异以及数据范围尚未形成稳定后端契约。

- **Unknown**：Group 的权威模型和层级。
- **Need Product Decision**：保留 Group Admin 为独立角色，还是将其作为未来组织范围扩展。
- **Need Backend Confirmation**：仓库、产线、设备、质量范围是否作为 Factory 以下的正式授权维度。

## 3. 外部与移动角色

|角色|职责|目标|核心任务|数据范围|
|---|---|---|---|---|
|Supplier Contact|代表一个供应商与工厂协同交货和质量事项|减少线下沟通并掌握交付结果|交货通知、到货状态、来料检验结果、文档补充|固定 Supplier Party + 授权 Factory；不得切换到其他 Party|
|Customer Contact|代表一个客户查看履约和提交质量反馈|掌握订单/发运并获得可控质量响应|订单/发运查看、质量证明查看、反馈/投诉协同|固定 Customer Party + 授权 Factory；不得切换到其他 Party|
|Mobile Worker|在现场完成被分配的执行与采集|用最少步骤准确完成现场任务|扫码、收货、上架、拣选、生产确认、检验采集、异常反馈|其内部账号的任务与 Factory 范围；不是外部身份|

当前 Portal 只有身份边界和规划占位，以上外部业务任务属于产品目标，不代表现有页面已经交付。

## 4. 多角色用户策略

### 4.1 内部多角色

一个内部账号可以同时拥有 Factory Admin、Quality Manager 等多个角色。推荐策略：

1. 使用一个内部账号和一个统一工作台。
2. 待办与异常按任务聚合并去重，不创建“角色 A 首页”“角色 B 首页”。
3. 允许切换当前 Factory Context，但不提供 Role Switch。
4. 页面与操作由实际权限决定，工作台排序由职责和任务相关性决定。
5. 当用户拥有高风险管理能力时，用清晰的操作确认和审计标识区分，不创建第二套身份。

### 4.2 内外部身份组合

`Factory Admin + Quality Manager + Supplier Contact` 不应作为一个账号的三个可切换身份处理。已确定的安全基线要求：

- INTERNAL、SUPPLIER、CUSTOMER 使用不同安全身份边界和客户端。
- 一个外部账号固定绑定一个 Supplier Party 或 Customer Party。
- 同一外部账号不同时绑定供应商与客户主体。
- 内部人员代供应商/客户操作时使用 MOM Admin 内受审计的委托能力，并需要专门权限；不通过 Portal Role Switch。

若现实中同一个自然人同时承担内部与供应商职责，应创建独立账号和独立登录上下文。账号关联、通知合并等便利性属于未来议题，不能削弱安全边界。

### 4.3 Context 切换

|Context|是否支持|规则|
|---|---|---|
|Factory|支持，用户有多个授权 Factory 时|切换只改变当前工作上下文；后端仍校验数据范围；`X-Factory-Id` 不是授权证明|
|Role|不支持|角色可叠加，不作为模拟身份或菜单模式|
|Supplier Party|不支持|账号固定一个 Party|
|Customer Party|不支持|账号固定一个 Party|
|Admin/Supplier/Customer|不支持|不同应用、客户端和账号边界|

## 5. 角色与工作台关系

工作台内容由任务类型决定：

- 执行型用户优先显示本人任务、截止时间和继续操作入口。
- 主管型用户优先显示跨任务阻塞、异常、需要决策和责任归属。
- 管理员优先显示安全事件、发布风险和配置影响。
- 外部用户只在各自 Portal 查看本 Party 的协同任务，不进入内部统一工作台。
- 多角色用户看到合并后的任务，不看到多个互相重复的 Dashboard。

## 6. 禁止事项

- 不用角色名称直接生成菜单。
- 不把所有 Permission 暴露为角色产品语言。
- 不允许前端 Factory 筛选替代后端数据范围校验。
- 不允许外部账号通过切换角色扩大 Party 范围。
- 不把 Mobile Worker 新建为 SUPPLIER/CUSTOMER 之外的第四类外部身份。
- 不向用户展示“你有角色所以一定能操作”；最终操作能力由权限、数据范围和业务状态共同决定。

## 7. 待验证假设

- **Unknown**：各角色任务频率、峰值负载、交接方式和移动/PC 时间占比。
- **Need Product Decision**：内部用户的默认工作台是按最近 Factory、用户偏好还是组织默认进入。
- **Need Product Decision**：是否允许用户固定常用视图；System Preference 当前明确未包含 Dashboard/Favorites。
- **Need Backend Confirmation**：任务责任人、代理、转交、团队队列和升级机制。
- **Need Backend Confirmation**：Factory 以下数据范围模型。
