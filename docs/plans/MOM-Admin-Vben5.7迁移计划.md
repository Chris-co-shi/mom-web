# MOM Admin Vben 5.7 迁移计划

- 状态：Completed
- 分支：`phase/p1.5-auth-authorization`
- Base：远程阶段分支最新 Head
- 顺序：文档 → 代码 → 测试

## 1. 文档门禁

- [x] 冻结第一方认证权威 ADR。
- [x] 冻结 Vben 5.7.0 源码快照 ADR。
- [x] 记录迁移架构、来源、补丁和升级策略。
- [x] 建立用户偏好后端待办。
- [x] 建立动态菜单国际化后端待办。
- [x] 代码完成后回填文件清单、实际差异和最终状态。

## 2. 实现范围

- 迁入 Vben 5.7.0 最小运行闭包。
- 接入 Vben Bootstrap、BasicLayout、Preferences、Locale 和路由管线。
- 使用 MOM 第一方账号密码登录。
- 使用稳定菜单注册表生成六个 IAM 路由。
- 保留现有业务 URL、IAM API 与 Permission。
- 实现菜单加载失败、403、404 和安全默认跳转。
- 实现 403 权限 Single Flight，同步后仅自动重试 GET/HEAD。
- 完成简体中文和英文文案。

## 3. 非范围

- 不改 IAM 后端。
- 不虚构动态菜单或用户偏好接口。
- 不迁移 Supplier/Customer Portal 到 Vben。
- 不改变 Client/user_type、Token、Factory、Party 或服务端授权协议。
- 不引入 Vben Mock、演示业务、请求层或插件包。

## 4. 最终门禁

```bash
pnpm install --frozen-lockfile
pnpm validate
pnpm check:type
pnpm test
pnpm build
```

所有门禁必须在同一最终提交候选上通过。失败必须修复并从相关门禁重跑，不得关闭类型检查或删除安全测试。

最终结果（2026-07-28）：

- 固定迁入 24 个 Vben 运行时包与 2 个构建配置包，共 782 个上游文件。
- 快照差异仅为补丁台账 P-004、P-005 所列 8 个文件；构建适配位于 MOM 应用层。
- `pnpm install --frozen-lockfile` 通过。
- 43 项仓库边界与安全不变量校验通过。
- 13 个 `@mom/*` 项目类型检查通过。
- 29 项认证、授权与安全测试通过。
- MOM Admin、Supplier Portal、Customer Portal 三应用生产构建通过。

## 5. GitHub 交付

- 只提交到现有 `phase/p1.5-auth-authorization`。
- 推送前再次确认远程 Head 未发生并发变化。
- 禁止强推、禁止提交到 `main`、禁止新建远程分支。
- 更新或创建 Head 为阶段分支、Base 为 `main` 的 Draft PR。
- 推送后核对 GitHub Actions。
