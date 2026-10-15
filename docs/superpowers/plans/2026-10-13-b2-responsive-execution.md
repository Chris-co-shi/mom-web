# B2 自适应治理执行记录

权威范围：用户批准的「MOM 全站 UI/UX 统一治理计划 — B2 自适应版」。不生成效果图，不执行 Git 写操作，不新增生产依赖。

## 任务与验收

1. 基线与故障：审查已有修改、权限草稿、MDM 路径及 Runtime；以实际请求和测试区分故障，禁止把界面更新当作联调通过。
2. 共享布局：Shell、Modal、表格、目录、表单适配；视口不是业务最小宽度。键盘与焦点、主题、内部滚动验收。
3. 模块：权限目录分页/跨资源草稿/一次整体保存；System 主从；MDM 上下文、详情、引用、Tab、Decimal String。
4. 登录品牌与文案：圆润 M SVG，删除工程宣传，保留 Runtime 文案所有权，仅新增迁移。
5. 验证：lint/typecheck/test/build、迁移静态门禁、真实浏览器与最终审查。无法执行项明确列出。

## 基线证据

- 全局 base.css 固定 min-width:1024px，是自适应阻碍。
- 权限 selectedIds 独立于当前权限页，已具备跨资源草稿；资源目录 loadResourceCatalog 存在无界分页循环。
- 现有未提交改动包含侧栏、弹层层级、MDM 页面与测试，保留并接续验证。

## 裁定

- 用户明确禁止 Git 写操作：不使用技能中的 worktree/commit/分支收口步骤，执行记录保留在本文件。
- 共享接口先保持默认兼容：Modal 增加可选 footer 和侧边展示能力；业务状态不进入共享组件。
- 已批准的 B2 优先于历史文档的 1024px 和旧圆角基线；不重新选择 UI 技术栈。

## 进度

- 共享布局、Shell、权限草稿目录、System 主从、MDM 部分治理及品牌资产已实施。
- 最新质量门禁：31 个测试文件、116 项测试通过，lint/typecheck/build 成功。
- 真实浏览器已检查角色页七档宽度、权限跨资源草稿与窄屏切换、菜单弹窗焦点恢复、字典选择保留、中英文及主题切换；未提交业务写入。
- 后端三个文案迁移未应用；MDM 实际读取失败、Maven 版本不足；还有独立前端缺口，不能宣称计划全部完成。
- 完整证据、待办与风险统一维护在 `docs/frontend/validation/web-foundation-v1.md` 第5节，避免另建重复报告。

## 实际技能

2026-10-14 视觉收尾：统一IAM/System目录选中态、MDM筛选/Tab/错误区、登录控件及共享面板；修正窄屏规则覆盖和长文案布局。`pnpm verify` 27文件99测试及lint/typecheck/build通过。按用户要求未打开浏览器，视觉交由用户手动验收；具体文件和风险见验证报告5.7。不宣称完整B2计划验收通过。

2026-10-13 接口恢复后续作：UOM/结构引用详情与当前父级名称补齐、System 主从焦点、MDM 提交错误定位、登录字段可访问性已更新。最新 `pnpm verify` 为27文件99测试通过；未恢复用户删除的测试，遵循当前 AGENTS 的常规页面不新增测试要求。真实物料空列表/新增入口恢复，空表单与模态下拉验证通过；System 浏览器导航被客户端阻止，未绕过。详细边界与剩余项见验证报告5.6。

- using-superpowers：确定现有工作流和技能边界。
- executing-plans：按已批准 B2 方案连续实施；不重复生成设计方案。
- ui-ux-pro-max：自适应、目录层级、内部滚动和无障碍审查，保持项目 Token/技术栈。
- test-driven-development：行为回归先失败再修复。
- systematic-debugging：定位 Select 属性、Decimal String、物料辅助403、菜单焦点及错误遮蔽。
- verification-before-completion：以真实命令和浏览器证据限定结论。
- requesting-code-review：一次独立集中审查；审查因额度中断，已收到确定问题已修复，不记为完整通过。
- 未调用 worktree/分支收口技能；本轮已有批准计划，未伪称重新调用 brainstorming/writing-plans。
