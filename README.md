# MOM Web

GEO Manufacturing Platform 的前端应用。

当前目标不是建设前端框架，而是以真实业务 Slice 驱动 Vue 3 应用演进，并保持每一层都可解释、可掌控。

## 当前 Slice

```text
Login
  ↓
App Layout
  ↓
User List
```

前端通过 Vite 开发代理访问本地 Gateway：

```text
Browser → /auth/** → Vite proxy → http://localhost:20000 → mom-gateway → mom-auth-server
```

## 技术基线

- Node.js 24
- pnpm 11
- Vue 3
- TypeScript
- Vite
- Vue Router
- Pinia
- Browser Fetch API
- 原生 CSS

当前没有引入 Axios、完整 UI 组件库、Tailwind、i18n 或 Monorepo。

## Token

当前 Slice 只在 Pinia 内存中保存 Access Token。刷新页面会回到登录页。

Token 是否进入 `sessionStorage`、`localStorage` 或其他持久化机制属于后续安全决策，不在当前 Slice 中提前确定。

## 本地启动

先确保 `mom-gateway` 与 `mom-auth-server` 可用，然后：

```bash
pnpm install
pnpm dev
```

默认前端地址：`http://localhost:5173`。
