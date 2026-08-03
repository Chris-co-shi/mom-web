# 07 · 样式系统

> 状态：Accepted · Chris Review 2026-08-03
>
> 关联决策：[ADR-016](../adr/ADR-016-MOM样式系统与Token单一来源.md)

## 1. 样式职责

Tailwind 4 是布局、间距、排版、响应式和少量状态样式的主要工具；CSS Custom Properties 承载运行时语义 Token；Antdv Theme Adapter 把同一 Token 映射到组件库；仅在复杂局部结构无法清晰表达时使用少量 scoped CSS。

不新增 Sass。现有 Vben Sass、`@reference` 和兼容样式随对应 Slice 退出，不能在 D00 或零引用前删除。

## 2. Token 单一来源

```text
Authoritative Token Source
        ├── CSS Variables
        ├── Tailwind Semantic Mapping
        ├── Antdv Theme Adapter
        `── TypeScript Types
```

生成物提交仓库并由 CI 检查漂移。禁止在四个输出中分别维护同名值。

Token 分层为：

1. Primitive：色阶、尺寸、字重等原始值；
2. Semantic：`surface-canvas`、`text-primary`、`action-primary` 等用途；
3. Component：仅限无法由语义 Token 表达的组件契约；
4. Channel：Admin/Portal 的密度和布局覆盖，不复制基础色板。

业务代码优先使用 Semantic Token，禁止直接消费 Primitive 色阶。

权威 Token Source 至少覆盖以下契约类别：

- color：品牌、中性、语义、表面、文本、边框、焦点和数据可视化；
- font：字体族、字号、字重、行高和字距；
- space / size：页面与组件间距、控件高度、图标尺寸、容器宽度；
- radius / shadow / border：圆角、浮层关系、边框宽度/样式/颜色；
- z-index：页面、吸顶、下拉/浮层、Modal、Notification；
- motion：时长、缓动、进入/退出和 reduced motion；
- breakpoint：渠道支持范围与响应式断点。

S01 已在 `packages/design-tokens/tokens/mom.tokens.json` 冻结每类 Token 的名称、单位、允许覆盖层和生成映射；页面不得自行补充缺失尺度。四类输出由 `pnpm tokens:generate` 生成，并由 `pnpm tokens:check` 阻断漂移。

## 3. 初始视觉基线

|Token|Light|Dark|
|---|---|---|
|Canvas|`#F5F5F7`|`#111113`|
|Surface|`#FFFFFF`|`#1C1C1E`|
|Primary text|`#1D1D1F`|`#F5F5F7`|
|Secondary text|`#5F6368`|`#A1A1AA`|
|Accent|`#4F46E5`|`#818CF8`|
|Success|`#207A4B`|`#34D399`|
|Warning|`#A15C00`|`#FBBF24`|
|Danger|`#B42318`|`#F87171`|

这些值已由 S01 冻结到权威 Token Source。生成器自动校验正文、状态色/状态面、主操作和焦点环组合；页面仍必须按实际字号、背景和交互状态验证，不能只凭色值表通过 AA。

## 4. 尺度基线

- 间距：4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64；
- 字号：12 / 13 / 14 / 16 / 20 / 24 / 32；Admin 正文默认 14，Portal 正文默认 16；
- 排版：字体族、字重、行高和字距由 S01 统一冻结，正文与标题不得只靠字号区分层级；
- 控件尺寸：Admin Comfortable/Compact 与 Portal 触控高度分别建模，不能通过页面任意像素缩放；
- 圆角：控件 8、卡片 12、Modal 16；
- 阴影：只用于浮层、弹层和需要表达遮挡关系的表面；
- 边框：宽度、样式与语义颜色统一映射，不使用局部灰色常量；
- 层级：Page < Sticky < Dropdown/Popover < Modal < Notification，具体数值由 S01 适配 Antdv 后冻结；
- 动效：140 / 180 / 220ms，并支持 reduced motion；
- 断点：480 / 768 / 1024 / 1280 / 1600；
- Admin 完整桌面体验从 1024 开始；Portal 从 360 开始可用。

Comfortable 是默认密度；Compact 主要服务 Admin 高密度列表。Portal 维持触控目标下限，不能仅缩小间距来复用 Compact。

## 5. 主题启动

主题值严格为 `LIGHT / DARK / SYSTEM`。Bootstrap 在 Vue 挂载前根据可信启动值或系统媒体查询设置根属性，运行时监听 System 变化。S01 不创建跨用户共享的偏好缓存；S03 接入用户隔离缓存和 System Preference 后，服务端不可用时继续使用明确回退，但保存失败必须可见。

## 6. 样式治理

禁止：

- 业务文件新增任意 Hex、RGB、未登记像素值或 `!important`；
- 深层覆盖 Antdv 私有 DOM、哈希类名或实现细节；
- 页面级复制 Theme 配置；
- 使用颜色作为状态唯一表达；
- 将 Portal 响应式等同于缩放 Admin。

S00/S01 建立 Token 漂移、禁用值、样式规则和可访问对比度门禁；确需例外时必须使用具名 Token，并在代码评审说明用途与退出条件。

迁移期适用范围：新增或实质修改的 MOM 自有样式立即遵守本文件；现有 Vben Sass、任意值和深层覆盖仅作为冻结历史例外，不得扩大或复制。每个替换 Slice 必须减少例外清单，S05 零引用并完成视觉/构建回归后终止该例外。

## 7. 验收

- 四类生成输出来源一致且 `tokens:check` 无漂移；
- Light/Dark/System、Comfortable/Compact 首屏无明显闪烁；
- Antdv 与自有组件使用同一语义颜色、圆角、字体和焦点环；
- 关键文本和交互状态满足 WCAG 2.2 AA；
- 360px Portal、1024px Admin、200% 文本缩放和 reduced motion 可完成核心任务。
