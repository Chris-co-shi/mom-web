# MOM Web

MOM Platform 的 PC 管理端。当前已提供 IAM、System 和 MDM 管理页面，仍处于持续建设阶段。

## 技术基线

- Node.js 24、pnpm 11
- Vue 3、TypeScript、Vite、Vue Router、Pinia
- Reka UI/shadcn-vue、Tailwind CSS 4、TanStack Table v9
- Vue I18n、Vitest、ESLint

精确版本以 `package.json` 为准；页面、API 和权限范围见 [当前实现地图](docs/frontend/当前实现地图.md)。

## 启动与验证

```bash
pnpm install
pnpm dev
pnpm verify
```

## 目录

```text
src/app        应用装配
src/router     路由与菜单注册
src/layouts    主布局与认证布局
src/modules    IAM、System、MDM 等业务模块
src/shared     API、i18n、主题和共享组件
src/styles     Design Token 与全局样式
```

- [前端任务导航](docs/frontend/README.md)
- [当前实现地图](docs/frontend/当前实现地图.md)
- [B2 UI 执行契约](docs/frontend/standards/b2-ui-contract.md)
- [CRUD 管理页标准](docs/frontend/standards/crud-management-page-standard.md)
