# 第三方开源声明

`mom-web` 本身采用 MIT License，并通过 npm/pnpm 依赖使用第三方开源软件。各组件继续遵循其自身许可证。

> 精确依赖版本以 `package.json`、Workspace Catalog 和 `pnpm-lock.yaml` 为准。本文件用于记录主要上游、使用方式、许可证和源码复用边界，不替代依赖锁文件或自动化许可证清单。

## Vue Vben Admin

- 上游：`vbenjs/vue-vben-admin`
- 参考基线：`v5.7.0`
- License：MIT
- 当前使用方式：架构、布局、路由、权限和工程能力参考
- 当前骨架状态：未复制完整上游演示项目

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
| Axios | `axios/axios` | MIT | HTTP Client 基础 |
| Ant Design Vue | `vueComponent/ant-design-vue` | MIT | UI 组件 |
| pnpm | `pnpm/pnpm` | MIT | 包管理与 Workspace |

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
