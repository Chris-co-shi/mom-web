# 第三方开源声明

`mom-web` 本身采用 MIT License，并通过 npm/pnpm 依赖使用第三方开源软件。各组件继续遵循其自身许可证。

> 精确依赖版本以 `package.json`、Workspace Catalog 和 `pnpm-lock.yaml` 为准。本文件用于记录主要上游、使用方式、许可证和源码复用边界，不替代依赖锁文件或自动化许可证清单。

## Vue Vben Admin

- 上游：`vbenjs/vue-vben-admin`
- 参考基线：`v5.7.0`
- License：MIT
- 当前使用方式：MOM Admin 仍使用固定的 Workspace 最小运行闭包；P1.6 将其冻结为迁移例外并按 ADR-011 渐进退出；`Page` 组件此前按 MOM 包边界参考重写
- 快照 Commit：`63a38dce49ba109f61607994e21ba921d8e970e9`
- 排除：上游演示业务、Mock、`@vben/request`、`@vben/plugins` 与发布工具链
- 完整目录和补丁：[Vben 5.7.0 源码快照台账](docs/open-source/vben-5.7.0-snapshot.md)
- 当前治理：[ADR-011：MOM 自有轻量前端运行时与 Vben 渐进退出](docs/adr/ADR-011-MOM自有轻量前端运行时与Vben渐进退出.md)

`packages/common-ui/src/Page.vue` 来源边界：

- 上游 Tag/Commit：`v5.7.0` / `63a38dce49ba109f61607994e21ba921d8e970e9`
- 上游路径：`packages/effects/common-ui/src/components/page/page.vue`、`types.ts`
- MOM 修改：移除 Vben 内部 Tailwind、自动高度和 Footer 依赖；保留页面标题、说明、操作区和内容 Slots；使用 MOM Design Token 与 BEM 样式
- License：MIT

任何 Vben 源码迁移必须在 [开源来源登记](docs/open-source/source-origin.md) 中记录：

- 上游 Tag 或 Commit。
- 原始路径。
- MOM 目标路径。
- 修改摘要。
- License/NOTICE 要求。
- 引入 PR。

## 主要运行时和工程依赖

| 组件 | 上游 | License | 用途 |
|---|---|---|---|
| Vue | `vuejs/core` | MIT | Web 运行时 |
| Vue Router | `vuejs/router` | MIT | 应用路由 |
| Pinia | `vuejs/pinia` | MIT | 状态管理 |
| Vite | `vitejs/vite` | MIT | 构建工具 |
| TypeScript | `microsoft/TypeScript` | Apache-2.0 | 类型系统 |
| Axios | `axios/axios` | MIT | Workspace Catalog 历史条目；MOM 请求层实际使用 Fetch |
| Ant Design Vue | `vueComponent/ant-design-vue` | MIT | UI 组件 |
| Lucide | `lucide-icons/lucide` | ISC | Vben 快照依赖；P1.6 接受的 MOM 图标来源 |
| pnpm | `pnpm/pnpm` | MIT | 包管理与 Workspace |

## S00 质量工具依赖

以下依赖只用于开发和 CI，不进入浏览器生产运行时：

| 组件 | 上游 | License | 用途 |
|---|---|---|---|
| ESLint / `@eslint/js` / typescript-eslint / eslint-plugin-vue | `eslint/eslint`、`typescript-eslint/typescript-eslint`、`vuejs/eslint-plugin-vue` | MIT | TypeScript 与 Vue 静态检查 |
| Stylelint / Standard / Recommended Vue Config | `stylelint/stylelint`、`stylelint/stylelint-config-standard`、`ota-meshi/stylelint-config-recommended-vue` | MIT | CSS 与 Vue Style 静态检查 |
| Vitest | `vitest-dev/vitest` | MIT | 单元与组件测试运行器 |
| Vue Test Utils | `vuejs/test-utils` | MIT | Vue 组件测试 |
| jsdom | `jsdom/jsdom` | MIT | 组件测试 DOM 环境 |
| Playwright Test | `microsoft/playwright` | Apache-2.0 | 三应用浏览器烟测 |

精确版本与传递依赖以 `pnpm-lock.yaml` 为准。S00 没有新增生产依赖，也没有处理已冻结 Vben 快照中的 `lucide-vue-next` 迁移问题。

## 图标、字体、图片与未来图形库

引入以下资产前必须登记其来源和许可证：

- 图标包。
- Web Font。
- 插图、照片和背景图。
- 批次谱系图库。
- 图表库。
- 编辑器或文件预览组件。

禁止将来源不明、商业授权不明确或客户项目中的资源提交到本仓库。

## 发布前检查

每个可部署版本至少完成：

- 使用冻结锁文件安装。
- 生成依赖清单。
- 核验生产依赖许可证。
- 检查新增源码复制或静态资源。
- 保留必要版权和 NOTICE。
- 更新 [开源来源登记](docs/open-source/source-origin.md)。

## 项目代码来源边界

以下内容不得进入本仓库：

- 前雇主或客户的私有源码。
- 真实客户页面、Logo、生产截图和数据。
- 未授权商业模板。
- 通过删除版权信息伪装来源的代码。
- 完整复制其他开源管理后台后仅改包名的代码。
