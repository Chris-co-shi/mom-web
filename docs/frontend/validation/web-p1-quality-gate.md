# Web-P1 质量门禁与骨架收口报告

## 1. 结论

Web-P1 于 2026-10-04 完成质量收口。全局骨架具备可重复的 Lint、类型检查、单元/组件测试和生产构建入口，可以进入 Web-P2 IAM。

组件验证页不属于正式产品：源码作为开发期 Design Lab 保留，仅在 `import.meta.env.DEV` 为真时登记路由。生产菜单、路由和构建产物均不包含该页面，旧地址进入统一 404。

## 2. 自动化测试

测试栈：

- `vitest@5.0.3`，MIT；
- `@vue/test-utils@2.5.1`，MIT；
- `jsdom@29.1.1`，MIT；选择 29.x 是为了保持项目声明的 Node `>=24.0.0`，不使用要求 Node `>=24.15.0` 的 jsdom 30。

当前证据：5 个测试文件、21 个用例，覆盖：

- Gateway context path 与外部路径绕过保护；
- `Result<T>` 拆包、Header、409 字段错误、Correlation ID；
- GET 超时与写请求网络中断的未知结果语义；
- Locale 受控 Alias、HTML lang、静态文案和持久化；
- 主题恢复与非法持久化值回退；
- RFC 3339、显式 IANA 时区、普通计数、超长 Decimal String 和单位展示。

## 3. 生产构建

生产构建通过，720 个模块，未出现超过 500 kB 的 Chunk 警告：

| 产物 | 原始体积 | gzip |
|---|---:|---:|
| 主入口 JS | 39.67 kB | 15.50 kB |
| Locale/TDesign Provider JS | 117.30 kB | 45.21 kB |
| 主样式 | 24.35 kB | 4.77 kB |
| Foundation 页面 JS | 5.31 kB | 2.00 kB |

构建产物中没有 `TDesignValidation` 和组件验证标识。相较开发验证阶段，复杂 Table/Form/Tree/Dialog 组合不再进入生产包。

## 4. 浏览器验收

使用生产 Preview 验证：

| 场景 | 结果 |
|---|---|
| 1024px 中文基础入口 | PASS，无页面级横向溢出 |
| 1440px 英文 + 暗色 | PASS，长文案和路由标题正常 |
| 1920px | PASS，内容最大宽度保持 1500px |
| `/forbidden`、`/offline`、`/error`、未知地址 | PASS，标题和状态语义正确 |
| `/login` | PASS，认证占位布局可达 |
| `/foundation/components` | PASS，生产环境进入统一 404 |
| 键盘切换主题 | PASS，焦点、`aria-checked` 和主题同步 |
| Console Error/Warning | PASS，0 条 |

## 5. 已知限制

- 当前没有真实 IAM、System 或 MDM 联调证据；
- 尚未执行 Safari、Firefox、Edge 的跨浏览器矩阵和真实屏幕阅读器专项测试；
- Locale/TDesign Provider 是当前主框架最大的共享 Chunk，后续增长必须持续记录；
- System User Preference 是否纳入 Web-P3 仍需用户决定；
- 视觉回归截图系统只有页面稳定并出现真实回归成本时再引入。
