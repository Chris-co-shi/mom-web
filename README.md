# MOM Web

GEO Manufacturing Platform 的前端应用。

当前基线目标是保持前端可解释、可掌控：先建立最小 Vue 3 + TypeScript + Vite 单应用，再由真实业务需求逐步引入 Router、状态管理、HTTP 封装和 UI 能力。

## 技术基线

- Node.js 24
- pnpm 11
- Vue 3
- TypeScript
- Vite

## 启动

```bash
pnpm install
pnpm dev
```

## 当前结构

```text
index.html
  ↓
src/main.ts
  ↓
src/App.vue
  ↓
Browser DOM
```

当前阶段不使用 Monorepo、完整 UI Framework、动态路由或通用前端基础框架。
