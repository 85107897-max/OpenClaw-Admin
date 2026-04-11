# 批量操作功能需求文档

**文档版本**: v1.0  
**创建日期**: 2026-04-12  
**作者**: 产品经理  
**状态**: 待评审  
**优先级**: P0 - 最高优先级

---

## 一、需求概述

### 1.1 背景
当前系统已完成的 Cron 可视化编辑器功能支持单个任务的创建、编辑和删除。随着用户任务数量增加，缺乏批量操作能力导致管理效率低下。用户需要能够一次性对多个任务执行相同操作，提升工作效率。

### 1.2 目标
- 支持用户通过复选框选择多个任务
- 支持全选/反选功能
- 支持批量删除任务
- 支持批量状态变更（启用/禁用）
- 提供批量操作确认对话框，防止误操作
- 操作完成后提供明确的结果反馈

### 1.3 用户故事
- **作为** 系统管理员
- **我希望** 能够批量选择并删除多个不需要的定时任务
- **这样** 我可以快速清理无用任务，保持任务列表整洁

- **作为** 运维人员
- **我希望** 能够批量启用或禁用多个任务
- **这样** 我可以快速调整任务执行状态，无需逐个操作

---

## 二、功能需求

### 2.1 复选框与选择功能

#### 2.1.1 单行复选框
- **位置**: 任务列表每行最左侧
- **样式**: 标准复选框组件，选中状态明显
- **行为**:
  - 点击复选框选中/取消选中当前行
  - 选中后该行高亮显示（背景色变化）
  - 选中状态与任务 ID 关联

#### 2.1.2 全选功能
- **位置**: 任务列表表头复选框
- **行为**:
  - 点击全选复选框，选中当前页所有任务
  - 再次点击取消全选
  - 当前页无任务时，复选框置灰不可点击
  - 显示已选中数量：`已选择 X 项`

#### 2.1.3 反选功能
- **位置**: 批量操作工具栏
- **行为**: 反转当前页所有任务的选中状态

#### 2.1.4 选择状态显示
- **位置**: 批量操作工具栏
- **内容**: `已选择 X 项`（X 为选中数量）
- **样式**: 选中数量 > 0 时显示，否则隐藏

### 2.2 批量删除功能

#### 2.2.1 触发条件
- 至少选中 1 个任务
- 点击"批量删除"按钮

#### 2.2.2 确认对话框
- **标题**: `确认批量删除`
- **内容**: `确定要删除选中的 X 个任务吗？此操作不可恢复！`
- **按钮**:
  - `取消`（次要按钮）
  - `删除`（危险按钮，红色）
- **二次确认**: 当删除数量 > 5 时，要求输入删除的任务数量进行二次确认

#### 2.2.3 删除行为
- 调用后端批量删除 API
- 显示删除进度（删除中... X/Y）
- 删除完成后显示结果：
  - 成功：`成功删除 X 个任务`
  - 部分失败：`成功删除 X 个，失败 Y 个`（显示失败详情）

### 2.3 批量状态变更功能

#### 2.3.1 触发条件
- 至少选中 1 个任务
- 点击"批量启用"或"批量禁用"按钮

#### 2.3.2 确认对话框
- **标题**: `确认批量{操作类型}`
- **内容**: `确定要将选中的 X 个任务{操作类型}吗？`
- **按钮**:
  - `取消`（次要按钮）
  - `确认`（主要按钮，蓝色）

#### 2.3.3 状态变更行为
- 调用后端批量状态变更 API
- 显示变更进度
- 完成后显示结果并刷新列表

### 2.4 批量操作工具栏

#### 2.4.1 工具栏位置
- **位置**: 任务列表上方，固定显示
- **显示条件**: 有选中项时显示

#### 2.4.2 工具栏内容
```
┌─────────────────────────────────────────────────────┐
│ 已选择 3 项    [批量删除]  [批量启用]  [批量禁用]  [取消选择] │
└─────────────────────────────────────────────────────┘
```

#### 2.4.3 按钮状态
- **批量删除**: 始终可用
- **批量启用**: 仅当选中项中有禁用状态任务时可用
- **批量禁用**: 仅当选中项中有启用状态任务时可用
- **取消选择**: 始终可用

---

## 三、非功能需求

### 3.1 性能要求
- 批量操作响应时间：< 2 秒（100 条以内）
- 支持单次最多操作 100 条记录
- 超过 100 条时提示分批操作

### 3.2 用户体验
- 选中状态实时反馈
- 操作进度可视化
- 操作结果明确提示
- 支持键盘操作（Ctrl/Cmd + 点击多选，Shift + 点击范围选择）

### 3.3 安全性
- 批量删除需要二次确认
- 操作前校验权限
- 记录批量操作日志（审计）

### 3.4 兼容性
- 支持主流浏览器（Chrome, Firefox, Safari, Edge）
- 响应式设计，支持平板设备

---

## 四、技术实现方案

### 4.1 前端实现

#### 4.1.1 组件结构
```
src/components/cron/
├── CronEditor.vue          # 现有编辑器组件
├── CronBatchToolbar.vue    # 批量操作工具栏（新增）
└── CronBatchConfirm.vue    # 批量操作确认对话框（新增）
```

#### 4.1.2 状态管理
```typescript
// stores/cron.ts 扩展
interface CronStore {
  // 新增：选中状态
  selectedIds: Set<string>
  
  // 新增：批量操作方法
  selectAll(): void
  deselectAll(): void
  toggleSelect(id: string): void
  selectRange(startId: string, endId: string): void
  getSelectedCount(): number
  clearSelection(): void
  
  // 新增：批量操作
  batchDelete(ids: string[]): Promise<BatchResult>
  batchEnable(ids: string[]): Promise<BatchResult>
  batchDisable(ids: string[]): Promise<BatchResult>
}
```

#### 4.1.3 API 接口
```typescript
// src/api/cron-api.ts 扩展
const cronApi = {
  // 批量删除
  batchDelete: async (ids: string[]): Promise<BatchResult> => {
    return axios.post('/api/cron/batch-delete', { ids })
  },
  
  // 批量启用
  batchEnable: async (ids: string[]): Promise<BatchResult> => {
    return axios.post('/api/cron/batch-enable', { ids })
  },
  
  // 批量禁用
  batchDisable: async (ids: string[]): Promise<BatchResult> => {
    return axios.post('/api/cron/batch-disable', { ids })
  }
}

interface BatchResult {
  success: number
  failed: number
  errors: Array<{ id: string; message: string }>
}
```

### 4.2 后端实现

#### 4.2.1 路由设计
```javascript
// backend/src/routes/cron.routes.js 扩展
router.post('/batch-delete', authMiddleware, batchDeleteController)
router.post('/batch-enable', authMiddleware, batchEnableController)
router.post('/batch-disable', authMiddleware, batchDisableController)
```

#### 4.2.2 控制器实现
```javascript
// backend/src/controllers/cron.controller.js 扩展
const batchDeleteController = async (req, res) => {
  const { ids } = req.body
  const userId = req.user.id
  
  // 参数校验
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Invalid ids parameter' })
  }
  
  // 限制单次操作数量
  if (ids.length > 100) {
    return res.status(400).json({ error: 'Maximum 100 items per batch' })
  }
  
  // 权限校验：只能删除自己的任务
  const userTasks = await CronJob.findAll({
    where: { userId, id: ids }
  })
  
  // 批量删除
  const result = await CronJob.destroy({
    where: { id: ids, userId }
  })
  
  // 记录审计日志
  await AuditLog.create({
    userId,
    action: 'batch_delete',
    resourceId: ids,
    result: 'success'
  })
  
  res.json({ success: result, failed: 0, errors: [] })
}
```

### 4.3 数据库变更
无需新增表，现有 `cron_jobs` 表已满足需求。

---

## 五、任务拆解

### 5.1 前端任务

| 任务 ID | 任务名称 | 描述 | 预估工时 | 优先级 |
|--------|----------|------|----------|--------|
| FE-001 | 复选框组件集成 | 在 Cron 列表中添加复选框 | 2h | P0 |
| FE-002 | 全选/反选功能 | 实现全选、反选、取消选择 | 2h | P0 |
| FE-003 | 批量操作工具栏 | 创建批量操作工具栏组件 | 3h | P0 |
| FE-004 | 批量操作确认对话框 | 创建确认对话框组件 | 2h | P0 |
| FE-005 | 批量删除实现 | 集成批量删除 API | 2h | P0 |
| FE-006 | 批量状态变更实现 | 集成批量启用/禁用 API | 2h | P0 |
| FE-007 | 选中状态管理 | 实现 Store 中的选中状态管理 | 3h | P0 |
| FE-008 | 键盘操作支持 | 支持 Ctrl/Cmd+ 点击、Shift+ 范围选择 | 2h | P1 |
| FE-009 | 响应式适配 | 适配移动端和平板 | 2h | P1 |

**前端总计**: 20 小时

### 5.2 后端任务

| 任务 ID | 任务名称 | 描述 | 预估工时 | 优先级 |
|--------|----------|------|----------|--------|
| BE-001 | 批量删除 API | 实现批量删除接口 | 2h | P0 |
| BE-002 | 批量启用 API | 实现批量启用接口 | 1h | P0 |
| BE-003 | 批量禁用 API | 实现批量禁用接口 | 1h | P0 |
| BE-004 | 权限校验增强 | 确保只能操作自己的任务 | 1h | P0 |
| BE-005 | 审计日志记录 | 记录批量操作日志 | 1h | P1 |
| BE-006 | API 单元测试 | 编写批量操作 API 测试 | 2h | P1 |

**后端总计**: 8 小时

### 5.3 测试任务

| 任务 ID | 任务名称 | 描述 | 预估工时 | 优先级 |
|--------|----------|------|----------|--------|
| QA-001 | 前端功能测试 | 测试所有批量操作功能 | 3h | P0 |
| QA-002 | 后端 API 测试 | 测试 API 接口和权限 | 2h | P0 |
| QA-003 | 集成测试 | 前后端联调测试 | 2h | P0 |
| QA-004 | 边界测试 | 测试最大值、空值等边界情况 | 2h | P1 |

**测试总计**: 9 小时

---

## 六、验收标准

### 6.1 功能验收
- [ ] 能够选中/取消选中单个任务
- [ ] 全选功能正常工作
- [ ] 反选功能正常工作
- [ ] 批量删除功能正常，有确认对话框
- [ ] 批量启用功能正常
- [ ] 批量禁用功能正常
- [ ] 操作结果有明确提示
- [ ] 超过 100 条时正确提示

### 6.2 性能验收
- [ ] 100 条数据批量操作响应时间 < 2 秒
- [ ] 选中状态切换无卡顿
- [ ] 工具栏显示/隐藏流畅

### 6.3 安全验收
- [ ] 只能删除/操作自己的任务
- [ ] 批量删除需要二次确认
- [ ] 操作日志正确记录

---

## 七、开发计划

### 7.1 第一阶段（Day 1）
- 前端：FE-001, FE-002, FE-003, FE-007
- 后端：BE-001, BE-002, BE-003, BE-004

### 7.2 第二阶段（Day 2）
- 前端：FE-004, FE-005, FE-006
- 后端：BE-005
- 测试：QA-001, QA-002

### 7.3 第三阶段（Day 3）
- 前后端联调
- 测试：QA-003, QA-004
- 修复问题
- 代码审查

---

## 八、风险评估

| 风险项 | 影响 | 概率 | 应对措施 |
|--------|------|------|----------|
| 大量数据选中导致性能问题 | 中 | 中 | 限制单次操作数量，分页处理 |
| 批量操作失败部分数据 | 中 | 低 | 返回详细错误信息，支持重试 |
| 权限校验遗漏 | 高 | 低 | 代码审查，安全测试 |

---

## 九、附录

### 9.1 相关文档
- [Cron 可视化编辑器需求](./004-cron-visual-editor.md)
- [系统架构设计](../../ARCHITECTURE_DESIGN.md)
- [前端技术规范](../../FRONTEND_TECH_STACK.md)

### 9.2 接口定义
```typescript
// 批量操作请求
interface BatchOperationRequest {
  ids: string[]  // 任务 ID 列表
}

// 批量操作响应
interface BatchOperationResponse {
  success: number   // 成功数量
  failed: number    // 失败数量
  errors: Array<{   // 错误详情
    id: string
    message: string
  }>
}
```

---

**文档审批**:
- [ ] 产品经理评审
- [ ] 技术负责人评审
- [ ] 测试负责人评审

**变更历史**:
| 版本 | 日期 | 作者 | 变更内容 |
|------|------|------|----------|
| v1.0 | 2026-04-12 | 产品经理 | 初始版本 |
