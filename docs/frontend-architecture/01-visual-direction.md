# 01 · 视觉方向

> 状态：Accepted · Chris Review 2026-08-03

## 1. 目标气质

MOM-Web 采用 macOS 生产力应用所代表的设计原则，而不是复制 Apple 商标、素材或平台控件。视觉关键词为：**精确、克制、清晰、可信、内容优先**。

该方向服务于制造协同中的长时间工作、异常判断和高风险操作：信息必须易扫读，层级必须稳定，装饰不能与业务状态争夺注意力。

参考依据（查阅日期：2026-08-03）：[Apple Design Principles](https://developer.apple.com/design/human-interface-guidelines/design-principles)、[Apple Materials](https://developer.apple.com/design/human-interface-guidelines/materials) 和 [WCAG 2.2](https://www.w3.org/TR/WCAG22/)。这些资料只提供层级、材质、反馈和无障碍原则，不构成对 Apple 品牌资产或平台控件的复制授权。

## 2. 共享语言与渠道差异

|维度|Admin|Supplier / Customer Portal|
|---|---|---|
|主要场景|桌面端持续工作、配置、审计、复杂列表|跨组织协同、状态确认、文档和轻量操作|
|信息密度|中高；支持 Comfortable / Compact|中等；优先 Comfortable|
|导航|稳定的工作域导航与任务上下文|浅层、任务导向、减少内部术语|
|响应式|完整能力目标为 1024px 及以上|从 360px 移动浏览器开始可用|
|视觉重量|工具性更强、层级紧凑|留白更多、触控目标更大|

三个应用共享颜色语义、排版、状态、焦点、动效和基础组件行为，但不共享包含内部字段的 View Model，也不把 Portal 包装成 Admin 的角色视图。

## 3. 构图原则

1. 页面标题、当前任务、主要操作和业务状态优先于品牌装饰。
2. 使用清晰的平面层级；半透明材质仅限 Shell、悬浮层和短暂上下文，不进入高密度表格或表单主体。
3. 以稳定分区、分隔线和间距组织信息，避免“每块内容都是卡片”的卡片墙。
4. Dashboard 必须支持角色任务或决策，不展示无行动价值的技术指标。
5. 破坏性、高风险和结果未知操作必须有明确文案、原因输入或二次确认，不依赖颜色表达。

## 4. 品牌与主题

- 中性灰构成主要画布，MOM Indigo 只承担焦点、选择、主操作和有限强调。
- 亮色为默认主线；从首个代码 Slice 起支持 `LIGHT`、`DARK`、`SYSTEM`，避免后补暗色造成 Token 分叉。
- Dark 主题保持表面层级和对比度，不采用纯黑大面积背景。
- 图标只使用 Lucide，并通过静态 `iconKey` Registry 映射，Catalog 不得传入可执行图标组件。

## 5. 无障碍与动效

目标为 WCAG 2.2 AA：

- 全部核心任务可用键盘完成，并具有清晰、持续可见的焦点样式；
- 表单控件具有可访问名称、错误关联和非颜色唯一提示；
- Dialog 打开后正确管理焦点，关闭后返回触发元素；
- 支持 200% 文本缩放，Portal 在 360px 宽度下不丢失核心操作；
- 遵循 `prefers-reduced-motion`，非必要转场可被关闭；
- 动效用于解释状态变化，不用于持续吸引注意力。

## 6. 明确不做

- 不复刻 Finder、System Settings 或 Apple 控件外观。
- 不采用大面积“Liquid Glass”、高模糊、炫光、渐变描边或玻璃卡片墙。
- 不以大字号营销式 Hero 替代企业任务界面。
- 不用图标代替关键操作文案，不为追求简洁隐藏必要上下文。
- 不在 D00 产出页面稿、Design Token 代码、组件或 CSS。

## 7. 后续验收证据

视觉实现阶段至少以 Admin 1024/1280/1600、Portal 360/768/1280 三组视口评审；覆盖 Light/Dark/System、Comfortable/Compact、中文/英文、键盘、200% 文本缩放和减少动效。具体像素稿必须经过独立 UI Review，本文件不构成页面实现授权。
