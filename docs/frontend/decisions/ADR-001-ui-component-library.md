# ADR-001：PC Web UI 组件库选择

- 状态：已由 ADR-003 取代；仅保留历史决策记录
- 日期：2026-10-03
- 适用范围：`mom-web` MOM PC 管理端
- 决策人：用户

## 1. 背景

MOM PC Web 需要支撑中高密度表格、复杂表单、树结构、弹窗、抽屉、状态反馈、亮暗主题和中英文。组件库选择需要同时考虑视觉质量、技术前沿性、文档、社区维护和长期治理成本。

候选方案已经收敛为：

1. TDesign Vue Next；
2. Naive UI；
3. Element Plus。

不再为三个候选分别制作完整 PoC。重复实现同一套页面会产生较高成本，而当前资料已经足够确定验证顺序。

## 2. 决策

选择 **TDesign Vue Next 1.20.9** 作为 MOM PC Web 的 UI 组件库基线。

只实施一次薄技术验证，覆盖：

- Vue 3.5、TypeScript 6、Vite 8；
- Table、Tree、Form、Dialog、Drawer、Notification；
- 亮色、暗色与 Semantic Token 映射；
- 按需引入和生产构建；
- 中英文 Locale；
- 键盘、焦点与基础无障碍；
- MOM 中高密度视觉要求。

Web-P1-S01 已完成薄技术验证并锁定精确版本。后续用户验收决定逐步退出 TDesign；数据表格与首个无 TDesign 页面见 [ADR-002](ADR-002-data-table-and-utility-css.md)。存量页面在迁移验收前继续运行，不以全站即时删除依赖替代渐进验证。

## 3. 选择理由

| 维度 | 判断 |
|---|---|
| 美观 | 桌面端视觉克制、现代，适合通过 Token 塑造工业智能感 |
| 组件完整度 | 覆盖企业管理端常用表格、树、表单、弹层和反馈能力 |
| 技术 | 原生 Vue 3、内置 TypeScript 声明、支持暗色和主题定制、支持 Tree Shaking |
| 文档 | 官方中文文档和示例适合当前团队使用 |
| 社区维护 | 官方仓库持续发布；验证时 npm 稳定版本为 1.20.9 |
| 许可 | MIT |
| 治理成本 | 一套组件库即可覆盖当前平台模块，减少自研基础控件 |

## 4. 为什么不制作三套完整 PoC

- 三套页面会重复实现布局、数据、交互和主题；
- 视觉差异可以通过官方文档、示例和 Token 能力先完成大部分判断；
- 真正剩余风险是与当前技术栈的兼容性，薄验证更直接；
- 完整 PoC 容易形成不可维护的临时代码和多组件库残留。

## 5. 备选方案

### Naive UI

作为第一备选。优点是 Vue 3/TypeScript 体验和主题能力强；代价是部分企业后台组合模式需要项目承担更多封装。

### Element Plus

作为第二备选。优点是生态、熟悉度和资料覆盖广；代价是默认视觉辨识度和定制治理需要更多投入。

## 6. 风险与控制

| 风险 | 控制方式 |
|---|---|
| 与 TypeScript 6 或 Vite 8 存在类型/构建问题 | P1-S01 使用生产构建和严格类型检查验证 |
| 组件库主题变量与 MOM Token 混乱 | 只允许在集中主题适配文件映射 |
| 全量引入导致包体积增加 | 验证按需引入和路由分包 |
| 表格复杂功能存在边界缺陷 | 验证固定列、树表、编辑、分页和键盘行为 |
| 后续模块绕过组件库自建控件 | 执行组件复用层级和 Review 清单 |

## 7. 版本策略

当前仓库已精确锁定 `tdesign-vue-next@1.20.9`。升级时：

1. 核对目标版本的 Release Notes 与许可；
2. 使用精确版本进入锁文件；
3. 重跑类型、构建、主题、组件、无障碍和视觉验证；
4. 记录构建体积变化、已知缺口和回滚方式；
5. 不使用无边界自动升级。

## 8. 验证结论

Web-P1-S01 证明 Table、Tree、Form、Select、Dialog、Tag、亮暗主题和中英文组件文案可以在当前 Vue 3.5、TypeScript 6、Vite 8 基线上运行。

存在三个需要由项目统一适配的非阻断缺口：

1. Locale 声明的只读数组与 `ConfigProvider` 类型存在不一致；
2. Input/Select 的原生输入标签关联需要基础组件补齐；
3. Dialog 的语义、初始焦点、焦点循环和关闭后焦点恢复需要统一封装。

完整证据见 [TDesign Vue Next 1.20.9 验证报告](../validation/tdesign-vue-next-1.20.9.md)。

## 9. 官方资料

- [TDesign Vue Next 官方仓库](https://github.com/Tencent/tdesign-vue-next)
- [TDesign Vue Next npm](https://www.npmjs.com/package/tdesign-vue-next)
- [TDesign 设计体系](https://github.com/Tencent/tdesign)
