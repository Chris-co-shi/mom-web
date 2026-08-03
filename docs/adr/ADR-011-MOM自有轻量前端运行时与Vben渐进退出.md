# ADR-011：MOM 自有轻量前端运行时与 Vben 渐进退出

- 状态：Accepted
- 日期：2026-08-02
- 接受日期：2026-08-03
- 决策人：Chris
- 关联架构：[技术架构](../frontend-architecture/02-technical-architecture.md)
- 替代：[ADR-010：MOM Admin 使用 Vben 5.7 源码快照](ADR-010-MOM-Admin-Vben5.7源码快照.md)

## 1. 背景

Vben 5.7 源码快照为 Admin 提供了 Shell、Preferences、Locales、Stores 和访问路由，但其运行闭包、构建适配和升级治理超过 MOM 当前三应用所需。MOM 已有第一方认证、访问控制和 Fetch 客户端，具备逐步收回前端运行时所有权的基础。

## 2. 问题

需要降低运行时重量和上游耦合，同时保持现有 URL、深链、认证、安全、权限和错误行为。此决策不授权一次性重写、创建 `mom-admin-next`、升级基础框架或建设新业务页面。

## 3. 候选方案

### A. 永久保留 Vben 快照

迁移成本低，但长期维护、依赖闭包和产品约束持续受上游架构影响。

### B. 一次性重写 Admin

目标结构直接，但回归面、双轨维护和安全行为漂移风险最高。

### C. 原位渐进替换

按能力建立 MOM Runtime 并逐项替换，回归和回滚粒度最小，但需要临时兼容层治理。

## 4. 决策

选择 C。保留 Vue 3、Vite、TypeScript strict、Router、Pinia、vue-i18n 和 pnpm；使用 Strangler 顺序替换 Vben Layout、Preferences、Locales、Stores、Access Route、Types、Utils 与 Styles。禁止并行新应用。

Vben 仅在零引用、三应用构建、安全回归、关键 E2E、License/NOTICE 全部通过后删除。本 ADR 自 D01 起生效，ADR-010 转为 Superseded；其来源、补丁和许可证台账在源码实际删除前继续有效。

## 5. 决策理由

该方案能用 Slice 级证据保护已完成的安全契约，并让 MOM 只拥有真实需要的运行时能力；失败时可按能力回滚，不需要维护两个 Admin。

## 6. 正向后果

- MOM 获得 Shell、Router、Runtime 和样式的演进控制权。
- Vben 退出条件可验证，不依赖主观“迁移完成”。
- 三应用可共享协议和设计语言，同时保持独立运行时。

## 7. 负向后果与风险

- 过渡期存在两套能力与 Bundle 重叠。
- 兼容层可能变成永久层。
- 路由、权限和错误语义容易在替换中发生隐性回归。

## 8. 实施约束

- 不修改后端 API、权限模型、Token Claim 或 Gateway-only 规则。
- 兼容层登记消费者、所属 Slice 和删除条件。
- 不新增第二请求层、第二状态库、微前端或远程组件。
- 不同时升级 Vue、Vite、Router、TypeScript 或 Antdv。
- ADR-013/016 生效后，新增或实质修改的 MOM 自有代码立即遵守其组件、图标和样式规则；现有 Vben/Reka/Iconify/Sass 仅是冻结的迁移例外，不得扩大调用面或复制到 `@mom/*`，并随 S05 零引用删除而终止。

## 9. 验证方式

- 冻结三应用认证、安全、URL、深链和错误契约；
- 每个替换 Slice 通过类型、契约、组件、E2E、构建和 Bundle 门禁；
- 删除前执行零引用扫描并核对开源台账。

## 10. 替代或回滚条件

若原位替换无法保持安全或路由语义，停止当前 Slice 并恢复旧能力，不降低断言。只有新的 ADR 证明另一方案具有更小风险时才替代本决策。
