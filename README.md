# MOM Web

GEO Manufacturing Platform 的前端应用。

Web-P1 全局骨架和 Web-P2-S01 登录认证闭环已经完成，现已具备 Router、TDesign、主题、统一 HTTP Client、
`zh-CN/en-US` 国际化、自动化质量门禁与真实 Mini Auth 会话；后续继续按 IAM → System → MDM 顺序实施。

## 技术基线

- Node.js 24
- pnpm 11
- Vue 3
- TypeScript
- Vite
- Vue Router
- TDesign Vue Next

## 启动

```bash
pnpm install
pnpm dev
```

## 质量门禁

```bash
pnpm verify
```

该命令依次执行 Lint、严格类型检查、Vitest 测试和生产构建。组件验证页只在开发环境出现，不进入生产菜单与构建产物。

## 当前结构

```text
src/app        应用装配
src/router     静态路由与元数据
src/layouts    主布局与认证布局
src/modules    按业务域组织的页面
src/shared     请求、国际化、格式化、主题与共享组件
src/locales    zh-CN/en-US 静态资源
src/styles     三层 Token 与全局样式
```

当前阶段不使用 Monorepo、动态路由、全局状态库或未经真实需求证明的通用前端框架。

## 前端设计基线

PC Web 的产品设计、视觉系统、工程边界与实施顺序统一维护在
[`docs/frontend/README.md`](docs/frontend/README.md)。业务页面开始开发前，应先阅读该目录中的 Web-P0 文档。
