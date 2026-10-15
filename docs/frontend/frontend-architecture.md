# MOM Web 前端架构

> 适用于路由、请求、认证、模块边界和全局状态修改。普通页面样式任务只读 B2 UI 契约。

## 依赖方向

```text
app/router/layouts
      ↓
business modules
      ↓
shared components / api / i18n / theme
      ↓
shared ui primitives
```

- 业务模块不得相互导入页面内部实现。
- `shared` 不依赖具体业务模块。
- 路由注册表是可执行菜单的唯一来源；System 不下发前端路由。
- 页面负责业务字段、权限、API 和失败语义；共享组件只负责可复用交互结构。

## 路由与权限

- 静态路由由各模块导出，在 `route-registry.ts` 汇总。
- 路由 Meta 描述标题、模块、导航分组、顺序、权限和 i18n Owner。
- 路由守卫与 `AuthorityGuard` 只改善体验，后端仍执行最终授权。
- 当前模块和路由见 [当前实现地图](当前实现地图.md)。

## API

- 所有请求通过 `src/shared/api/http-client.ts`。
- 模块前缀集中在 `src/shared/api/config.ts`；开发代理规则在 `vite.config.ts`。
- API 模块返回类型化数据并保留稳定错误码、HTTP 分类和 Correlation ID。
- 写请求默认不自动重试；网络中断或超时导致结果未知时，页面要求刷新核对。

## 状态

- 认证、主题等真正跨页面状态可使用 Pinia 或专用共享模块。
- 表格查询、分页、详情和编辑草稿默认留在页面/业务模块。
- 不因页面相似建立配置驱动的全局 CRUD Store。

## i18n 与主题

- Web 持有 Key 与 Owner 映射；业务译文从对应服务 Runtime 获取。
- 本地应急文案只用于关键失败恢复，不形成第二套业务译文。
- Design Token 数值权威位于 `src/styles/`；组件和业务页面不得复制独立色板。

## 测试边界

- API 测试覆盖路径、方法、请求体和错误分类。
- 组件测试覆盖权限、加载/空/失败/冲突、重复提交和键盘交互。
- `pnpm verify` 是完整质量门禁；模拟 API 的组件测试不等于真实 Gateway/后端联调。
