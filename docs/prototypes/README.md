# Web 原型交付规范

## 1. 原型是正式设计资产

Web 原型不是可选效果图，而是页面实现前的必要输入。原型必须与用户流程、状态矩阵、组件映射和 API 映射一起进入 Git。

## 2. 目录约定

```text
docs/prototypes/web/<vertical-slice>/
├── README.md
├── flow.md
├── page-list.md
├── desktop-overview.png
├── desktop-detail.png
├── dialogs.png
├── states.png
└── assets/
```

复杂切片可以按应用或页面族继续拆分：

```text
docs/prototypes/web/VS-01-material-to-finished-goods/
├── mom-admin/
├── supplier-portal/
└── customer-portal/
```

## 3. `README.md` 内容

每个原型目录必须说明：

- 切片和目标。
- 关联需求编号。
- 用户角色。
- 页面清单。
- 关键业务状态。
- 原型工具或生成方式。
- 评审状态。
- 与实现的差异记录。
- 用户流程、状态矩阵、组件和 API 映射链接。

## 4. 必须交付的视图

每个页面族至少包含：

- 工作台或列表。
- 详情。
- 表单或命令对话框。
- 关键 Drawer/弹窗。
- 加载、空、无权限和失败状态。
- 冲突、重复提交或结果未知状态。
- 异步处理中、阻塞、恢复或人工接管。

## 5. 原型图片要求

- PNG 或 WebP。
- 文件名表达应用、页面和状态。
- 保持可阅读分辨率。
- 不只截取局部而缺少页面上下文。
- 原型中的文本尽量使用真实业务词汇和示例编号。
- 不使用真实客户、供应商、员工或生产数据。
- 变更后替换图片并更新评审说明。

## 6. 页面状态

适用时必须展示：

- 初始化。
- Loading。
- Empty。
- Forbidden。
- Failed。
- Rate Limited。
- Session Expired。
- Submitting。
- Conflict。
- Unknown Result。
- Async Processing。
- Blocked。
- Recovering。
- Manual Takeover。

## 7. 工业页面重点

原型必须清晰表达：

- 当前工厂和业务对象。
- 权威业务编号。
- 当前状态和更新时间。
- 责任角色。
- 下一步动作。
- 操作影响。
- 关联批次、工单、检验、库存或命令。
- 异常原因和恢复入口。

## 8. 响应式范围

V1 以桌面工作台为主。每个页面族需明确：

- 设计基准宽度。
- 最小支持宽度。
- 表格横向滚动方式。
- Drawer/Modal 在窄屏下的行为。
- 不支持的移动端场景。

PDA 场景进入 `mom-mobile`，不通过压缩桌面页面替代。

## 9. 组件标注

原型应标注关键组件类型，例如：

- Ant Design Vue Table/Form/Drawer。
- MOM Page State。
- MOM Batch Summary。
- MOM Inventory Breakdown。
- MOM Work Order Timeline。
- Traceability Graph。

最终选择记录在组件映射文档中。

## 10. 评审门禁

原型只有满足以下条件才可标记 Accepted：

- 用户流程完整。
- 页面状态覆盖完整。
- 页面操作与权限一致。
- API 和错误处理可实现。
- 组件边界清晰。
- 无虚构业务规则。
- 复杂状态和恢复路径可理解。
- 业务、产品和架构评审无阻塞项。

## 11. 实现后回看

实现完成后记录：

- 原型与实现差异。
- 差异原因。
- 是否需要更新设计系统或 ADR。
- 未完成的视觉回归项。
- 后续优化建议。
