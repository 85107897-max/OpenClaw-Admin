# 批量操作功能 - 高保真设计规范

## 1. 设计概述

### 1.1 功能目标
为 OpenClaw-Admin 平台提供高效、安全的批量操作能力，支持用户对多条记录进行统一处理。

### 1.2 设计原则
- **安全性优先**: 危险操作必须二次确认
- **状态可见**: 清晰显示选择状态和操作进度
- **操作便捷**: 减少用户点击次数，支持键盘快捷键
- **反馈及时**: 实时显示操作结果和错误提示

---

## 2. 组件规范

### 2.1 复选框组件 (BatchCheckbox)

```vue
<!-- 组件位置：表格第一列 -->
<!-- 尺寸：20px × 20px -->
<!-- 选中状态：主色调填充 -->
```

**样式规范**:
```css
.batch-checkbox {
  width: 20px;
  height: 20px;
  border: 2px solid #d9d9d9;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.batch-checkbox.checked {
  background-color: #1890ff;
  border-color: #1890ff;
}

.batch-checkbox:hover {
  border-color: #40a9ff;
}
```

**交互行为**:
- 点击单个复选框：选择/取消单条记录
- 点击表头复选框：全选/取消全选当前页
- 选中时行背景高亮：`#e6f7ff`

---

### 2.2 批量操作工具栏 (BatchToolbar)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ☑ 全选 (5/20)                    [批量删除] [批量状态▼] [批量导出]    │
└─────────────────────────────────────────────────────────────────────────┘
```

**布局规范**:
```css
.batch-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.selection-info {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #666;
  font-size: 14px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}
```

**按钮样式**:
```css
.btn-batch-primary {
  background: #1890ff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
}

.btn-batch-danger {
  background: #ff4d4f;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
}

.btn-batch-secondary {
  background: white;
  color: #666;
  border: 1px solid #d9d9d9;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
}

.btn-batch-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

---

### 2.3 批量删除确认对话框 (BatchDeleteModal)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🗑️ 批量删除确认                                            [×]        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  您确定要删除选中的 5 项记录吗？                                          │
│                                                                         │
│  ⚠️ 警告：此操作不可逆，请谨慎操作                                      │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 选中的记录：                                                      │   │
│  │ • 任务 A (ID: 001) - 状态：进行中                                 │   │
│  │ • 任务 B (ID: 002) - 状态：待处理                                 │   │
│  │ • 任务 C (ID: 003) - 状态：已完成                                 │   │
│  │ • 任务 D (ID: 004) - 状态：进行中                                 │   │
│  │ • 任务 E (ID: 005) - 状态：待处理                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────────────┐              ┌──────────────────┐                │
│  │     取消         │              │    确认删除       │                │
│  └──────────────────┘              └──────────────────┘                │
└─────────────────────────────────────────────────────────────────────────┘
```

**样式规范**:
```css
.modal-batch-delete {
  width: 560px;
  max-height: 80vh;
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-warning {
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 4px;
  padding: 12px 16px;
  margin: 16px 24px;
  color: #ff4d4f;
  font-size: 14px;
}

.record-list {
  max-height: 300px;
  overflow-y: auto;
  margin: 16px 24px;
  padding: 12px;
  background: #fafafa;
  border-radius: 4px;
}

.record-item {
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
  color: #666;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 12px 24px;
  border-top: 1px solid #f0f0f0;
}
```

---

### 2.4 批量状态变更下拉菜单 (BatchStatusDropdown)

```
┌─────────────────────────────────────────┐
│  批量状态变更 ▼                         │
├─────────────────────────────────────────┤
│  📋 待处理                               │
│  ▶ 进行中                                │
│  ✅ 已完成                               │
│  ❌ 已取消                               │
│  ─────────────────────────────────────  │
│  ⚙️ 自定义状态...                        │
└─────────────────────────────────────────┘
```

**状态选项**:
| 状态 | 颜色 | 图标 |
|------|------|------|
| 待开始 | #999 | 📋 |
| 进行中 | #1890ff | ▶ |
| 已完成 | #52c41a | ✅ |
| 已取消 | #ff4d4f | ❌ |
| 准备中 | #faad14 | ⏳ |

---

## 3. 交互流程

### 3.1 批量删除完整流程

```
用户操作                    系统响应                    状态变化
─────────────────────────────────────────────────────────────────
1. 勾选记录 1, 3, 5         更新选中列表               工具栏显示 "已选择 3 项"
2. 点击"批量删除"          弹出确认对话框             对话框显示选中记录
3. 点击"确认删除"          发送 API 请求               显示加载状态
4. 等待响应                后端处理删除               禁用操作按钮
5. 返回成功                刷新列表                   显示成功提示
6. 列表更新                清空选中状态               工具栏隐藏
```

### 3.2 批量状态变更流程

```
用户操作                    系统响应                    状态变化
─────────────────────────────────────────────────────────────────
1. 勾选记录 2, 4            更新选中列表               工具栏显示 "已选择 2 项"
2. 点击"批量状态▼"         展开下拉菜单               显示所有状态选项
3. 选择"已完成"            弹出确认对话框             显示变更详情
4. 点击"确认"              发送 API 请求               显示进度条
5. 返回成功                更新列表状态               显示成功统计
```

---

## 4. 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl/Cmd + A` | 全选/取消全选 |
| `Space` | 选中当前行 |
| `Shift + ↑/↓` | 连续选择多行 |
| `Esc` | 取消所有选择 |
| `Delete` | 批量删除（需确认） |

---

## 5. 响应式设计

### 5.1 桌面端 (≥1200px)
- 完整工具栏显示
- 所有按钮可见
- 对话框宽度 560px

### 5.2 平板端 (768px - 1199px)
- 工具栏按钮压缩显示
- 下拉菜单优先
- 对话框宽度 90%

### 5.3 移动端 (<768px)
- 工具栏折叠为图标按钮
- 底部弹出对话框
- 复选框尺寸增大至 24px

---

## 6. 错误处理

### 6.1 错误提示样式
```css
.error-toast {
  background: #fff2f0;
  border: 1px solid #ffccc7;
  color: #ff4d4f;
  padding: 12px 16px;
  border-radius: 4px;
  margin-bottom: 8px;
}

.success-toast {
  background: #f6ffed;
  border: 1px solid #d9f7be;
  color: #52c41a;
  padding: 12px 16px;
  border-radius: 4px;
  margin-bottom: 8px;
}
```

### 6.2 常见错误场景
| 场景 | 提示文案 | 处理方式 |
|------|----------|----------|
| 部分删除失败 | "成功删除 X 项，Y 项失败" | 显示失败项列表 |
| 网络错误 | "网络异常，请重试" | 提供重试按钮 |
| 权限不足 | "无权限执行此操作" | 禁用操作按钮 |
| 数据已变更 | "部分数据已被修改，请刷新后重试" | 刷新列表 |

---

## 7. 组件文件结构

```
src/components/business/batch/
├── BatchCheckbox.vue          # 复选框组件
├── BatchToolbar.vue           # 批量操作工具栏
├── BatchDeleteModal.vue       # 批量删除确认对话框
├── BatchStatusDropdown.vue    # 批量状态变更下拉菜单
├── BatchExportModal.vue       # 批量导出对话框
└── index.js                   # 统一导出
```

---

## 8. 国际化支持

```javascript
// src/i18n/locales/zh-CN.js
batch: {
  selectAll: '全选',
  selected: '已选择 {count} 项',
  batchDelete: '批量删除',
  batchStatus: '批量状态变更',
  batchExport: '批量导出',
  deleteConfirm: '您确定要删除选中的 {count} 项记录吗？',
  warning: '此操作不可逆，请谨慎操作',
  confirm: '确认删除',
  cancel: '取消',
  success: '成功删除 {count} 项',
  partialFailure: '成功 {success} 项，失败 {failed} 项'
}
```

---

**设计版本**: v1.0  
**最后更新**: 2026-04-12  
**设计人**: UI 设计师  
**状态**: ✅ 设计完成
