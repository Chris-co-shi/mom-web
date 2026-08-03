# ADR-016：MOM 样式系统与 Token 单一来源

- 状态：Accepted
- 日期：2026-08-02
- 接受日期：2026-08-03
- 决策人：Chris
- 关联架构：[样式系统](../frontend-architecture/07-style-system.md)
- 替代：无

## 1. 背景

三应用需要共享视觉语义、主题和状态，同时保留 Admin 高密度与 Portal 移动浏览差异。逐页颜色覆盖、多个 Theme 配置或独立 Tailwind 值会造成主题漂移。

## 2. 问题

需要确定 Token 权威来源、生成目标、样式职责和例外机制。本 ADR 不在 D00 创建 Token、CSS 或主题代码。

## 3. 候选方案

### A. 每个应用独立维护样式

局部自由，但主题、无障碍和品牌语义持续分叉。

### B. 仅依赖 Antdv Theme

组件库一致，但无法完整覆盖自有布局、渠道与非 Antdv 内容。

### C. 单一 Token 来源生成多适配层

CSS、Tailwind、Antdv 与 TypeScript 保持一致；需要生成和漂移门禁。

## 4. 决策

选择 C。建立权威 Token Source，生成 CSS Variables、Tailwind 语义映射、Antdv Theme Adapter 和 TypeScript 类型。Tailwind 4 为主要样式工具，辅以少量 scoped CSS；不新增 Sass。

Token 分为 Primitive、Semantic、Component、Channel。业务代码使用 Semantic Token。首日起支持 `LIGHT/DARK/SYSTEM` 和 Comfortable/Compact，Portal 保持触控目标。

权威来源至少覆盖 color、font family/size/weight/line-height、space、control/icon/container size、radius、shadow、border、z-index、motion 和 breakpoint。S01 冻结名称、单位、层级与四类生成映射；页面不得自行补充缺失尺度。

## 5. 决策理由

运行时主题、工具类、组件库与类型只有一个事实来源，才能通过自动门禁防止三应用视觉和可访问性漂移。

## 6. 正向后果

- 主题、密度和渠道覆盖可追溯。
- Antdv 与自有界面共享同一设计语义。
- 生成物漂移可在 CI 阻断。

## 7. 负向后果与风险

- Token 命名和生成器成为治理基础设施。
- 过度创建 Component Token 会重新形成局部常量。
- 暗色与高密度必须从首个 Slice 持续测试。

## 8. 实施约束

- 禁止业务文件新增任意色值、未登记像素值、`!important` 和 Antdv 私有深层选择器。
- 生成物提交仓库但不得手改。
- Channel Token 只表达密度和布局差异，不复制基础色板。
- 颜色不能作为状态唯一表达，动效遵循 reduced motion。
- 新增或实质修改的 MOM 自有样式立即遵守本 ADR；现有 Vben Sass、任意值和深层覆盖仅为冻结历史例外，不得扩大或复制。
- 每个替换 Slice 必须减少例外清单；S05 零引用、视觉/构建回归和 License/NOTICE 门禁完成后终止迁移例外。

## 9. 验证方式

执行 Token 漂移、禁用值、对比度、主题首屏、密度、响应式、200% 文本缩放和 reduced-motion 测试，并在三应用构建中检查相同语义输出。

## 10. 替代或回滚条件

若生成链无法保持确定性或显著阻塞开发，先退回已生成的 CSS Variables 与 Adapter，不允许回到每应用各自维护；新的方案必须通过 ADR 保持单一事实来源。
