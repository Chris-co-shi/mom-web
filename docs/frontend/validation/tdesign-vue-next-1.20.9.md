# TDesign Vue Next 1.20.9 薄技术验证报告

## 1. 结论

`tdesign-vue-next@1.20.9` 在当前 Vue 3.5.34、TypeScript 6.0.3、Vite 8.0.10、Node 25.9.0、pnpm 11.7.0 环境下通过基础兼容性验证，正式作为 MOM PC Web 的 UI 组件库基线。

本次结论只覆盖组件库和当前前端工具链，不代表 IAM、System、MDM 或任何后端接口已经联调。

## 2. 验证范围

| 领域 | 验证内容 | 结果 |
|---|---|---|
| 依赖 | 精确安装、MIT、Vue/Node Peer/Engine | PASS |
| TypeScript | `strict: true`、公开类型、Vue 模板检查 | PASS，存在可控类型适配 |
| 构建 | Vite 8 Production Build | PASS，存在单块体积警告 |
| Table | 列定义、数据、分页、桌面密度 | PASS |
| Tree | 层级、展开、亮暗主题 | PASS |
| Form | Input、Select、可视标签和原生输入可访问名称 | PASS，需要项目适配 |
| Dialog | 打开、确认、语义、焦点进入/循环/恢复 | PASS，需要项目适配 |
| Theme | 亮色、暗色、跟随系统、MOM Token 映射 | PASS |
| Locale | TDesign `zh-CN`/`en-US` 文案切换 | PASS |
| 响应式 | 1440px 与最低 1024px 桌面宽度 | PASS |
| Console | 浏览器错误与警告 | PASS，0 条 |

## 3. 实际验证页面

验证页位于：

- `src/validation/TDesignValidation.vue`；
- `src/validation/validation.css`；
- `src/style.css` 中的最小 MOM/TDesign Token 映射。

页面明确标注为技术验证页，不请求后端、不持久化业务数据，也不作为正式 MOM 工作台。

## 4. 发现与处理

### 4.1 Locale 类型不一致

TDesign 1.20.9 的内置 Locale 对象包含只读数组，而 `ConfigProvider` 的 `GlobalConfigProvider` 仍要求可变数组。严格类型检查会直接失败。

Web-P1-S05 已在 `src/shared/i18n/locale.ts` 通过 `structuredClone` 和 `DeepMutable<T>` 集中生成可变配置，没有使用 `any`、`@ts-ignore` 或关闭严格模式。顶层 `ConfigProvider` 统一消费该配置，验证页不再保留第二套 Locale 状态。

业务页面不得复制该转换，也不得自行嵌套全局 Locale Provider。

### 4.2 Table 模板泛型无法透传

`PrimaryTableCol<CapabilityRow>` 在 Vue 模板中不能传递给组件默认 `TableRowData`，会出现两个泛型实例不兼容。验证页使用公开的默认 `PrimaryTableCol` 类型，行数据仍保持显式业务接口。

后续要求：公共表格封装必须优先保持简单，只有真实单元格扩展需要时再设计泛型边界。

### 4.3 Input/Select 标签关联

TDesign Input 1.20.9 不会把组件上的 `id`、`aria-label` 自动透传到内部原生 `<input>`。仅使用 `FormItem for` 时，可视标签不能形成程序化关联。

验证页使用局部 `v-native-input-label` 指令补齐原生 `id` 和 `aria-label`，浏览器 `getByLabel` 验证从 0 个匹配提升为 1 个匹配。

后续要求：Web-P1 公共表单适配层统一承担该职责，业务页面不得依赖局部 DOM 查询。

### 4.4 Dialog 焦点管理

TDesign Dialog 默认没有满足当前基线要求的完整焦点进入与循环行为，且弹窗语义需要显式传入。

验证页补齐：

- `role="dialog"`；
- `aria-modal="true"`；
- 可访问名称；
- 打开后聚焦第一个操作；
- `Tab` / `Shift+Tab` 在弹窗内循环；
- 关闭后焦点回到触发按钮。

后续要求：统一 Dialog/Confirm 封装承载该逻辑，禁止每个业务页面自行实现。

### 4.5 构建体积

当前验证页同时引入 Table、Tree、Form、Select、Dialog 等复杂组件，构建结果为：

```text
CSS 189.19 kB，gzip 22.56 kB
JS  686.01 kB，gzip 198.47 kB
```

生产构建通过，但原始 JS 单块超过 Vite 500 kB 默认警戒线。根导入与组件级 ESM 导入结果接近，说明主要成本来自复杂组件组合，而不是简单导入错误。

处理决策：

- 不提高 `chunkSizeWarningLimit` 掩盖问题；
- Web-P1-S02 必须通过路由懒加载验证主框架、IAM 页面和复杂组件 Chunk；
- 在真实页面稳定前不引入额外图表、编辑器或大屏依赖；
- 记录 gzip 与原始体积变化，超过当前结果时必须说明新增价值。

该项是可控风险，不阻断采用 TDesign，但属于下一 Slice 的质量门禁。

## 5. 浏览器验证证据

- 1440px：顶栏、Hero、表格、树与表单布局正常；
- 1024px：无页面级横向溢出，表格内容保持可读；
- 暗色：表面、表格、输入、状态标签和弹窗可读；
- Locale：分页由“共 5 条数据 / 5 条每页”切换为“5 items / 5 per page”；
- Dialog：焦点依次验证为取消 → 确认 → 取消，关闭后返回触发按钮；
- Console：无错误和警告。

## 6. 验证命令

```bash
pnpm lint
pnpm typecheck
pnpm build
git diff --check
```

浏览器使用 Vite 开发服务器，在 1440×1000 和 1024×800 视口下人工与可访问性树联合检查。

## 7. 未覆盖事项

- 真实路由懒加载与 Chunk 分布；
- 正式主布局、导航和异常页；
- 大数据量、虚拟滚动与复杂可编辑表格；
- 屏幕阅读器专项测试；
- Safari、Firefox、Edge 的跨浏览器矩阵；
- 自动化单元、组件和 E2E 测试。

这些事项分别进入 Web-P1-S02～S06，不在本次薄验证中伪造完成。
