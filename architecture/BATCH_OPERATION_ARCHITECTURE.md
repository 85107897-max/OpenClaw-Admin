# 批量操作功能 - 架构设计文档

**项目**: OpenClaw-Admin  
**文档版本**: v1.0  
**创建时间**: 2026-04-12 01:55  
**作者**: 系统架构师 Agent  
**状态**: ✅ 已完成

---

## 📋 概述

本文档定义了 OpenClaw-Admin 平台批量操作功能的完整架构方案，包括前后端接口规范、数据库设计、安全策略等。

---

## 1. 功能需求

### 1.1 核心功能
| 功能 | 描述 | 优先级 |
|------|------|--------|
| 多选记录 | 通过复选框选择多条记录 | P0 |
| 全选/取消全选 | 一键选择/取消当前页所有记录 | P0 |
| 批量删除 | 一次性删除多条记录 | P0 |
| 批量状态变更 | 批量更新记录状态 | P0 |
| 批量导出 | 导出选中记录为 CSV/Excel | P0 |
| 批量分配 | 批量分配任务给指定负责人 | P1 |

### 1.2 支持资源类型
- **users**: 用户管理
- **tasks**: 任务管理
- **scenarios**: 场景管理
- **audit-logs**: 审计日志
- **sessions**: 会话管理
- **backup-records**: 备份记录
- **notifications**: 通知管理

---

## 2. 架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      前端 (Vue 3)                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  BatchOperationBar (批量操作工具栏)                  │   │
│  │  - 复选框组件                                         │   │
│  │  - 选择计数显示                                       │   │
│  │  - 批量操作按钮组                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  BatchConfirmDialog (确认弹窗)                       │   │
│  │  - 操作确认                                           │   │
│  │  - 选中记录预览                                       │   │
│  │  - 风险提示                                           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    后端 (Express.js)                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  batch.routes.js (路由层)                            │   │
│  │  - DELETE /api/batch/:resource                       │   │
│  │  - PATCH /api/batch/:resource/status                 │   │
│  │  - POST /api/batch/:resource/export                  │   │
│  │  - PATCH /api/batch/:resource/assign                 │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  batch.service.js (业务逻辑层)                        │   │
│  │  - 权限验证                                           │   │
│  │  - 数据验证                                           │   │
│  │  - 事务处理                                           │   │
│  │  - 日志记录                                           │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  SQLite Database (数据层)                            │   │
│  │  - 现有表结构支持                                     │   │
│  │  - batch_operation_logs (建议新增)                   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 接口规范

### 3.1 批量删除

**请求**
```http
DELETE /api/batch/:resource
Content-Type: application/json
Authorization: Bearer <token>

{
  "ids": [1, 2, 3, 4, 5]
}
```

**参数说明**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| resource | string | 是 | 资源类型 (users/tasks/scenarios等) |
| ids | array | 是 | 记录 ID 列表，最多 100 条 |

**响应**
```json
{
  "success": true,
  "deleted_count": 5,
  "failed_ids": []
}
```

**错误响应**
```json
{
  "error": "无权限执行此操作"
}
// 或
{
  "error": "请提供要删除的记录 ID 列表"
}
```

---

### 3.2 批量状态变更

**请求**
```http
PATCH /api/batch/:resource/status
Content-Type: application/json
Authorization: Bearer <token>

{
  "ids": [1, 2, 3],
  "status": "completed"
}
```

**参数说明**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| resource | string | 是 | 资源类型 |
| ids | array | 是 | 记录 ID 列表 |
| status | string | 是 | 目标状态值 |

**响应**
```json
{
  "success": true,
  "updated_count": 3,
  "failed_ids": []
}
```

---

### 3.3 批量导出

**请求**
```http
POST /api/batch/:resource/export
Content-Type: application/json
Authorization: Bearer <token>

{
  "ids": [1, 2, 3, 4, 5],
  "format": "csv",
  "fields": ["id", "name", "status", "created_at"]
}
```

**参数说明**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| resource | string | 是 | 资源类型 |
| ids | array | 是 | 记录 ID 列表 |
| format | string | 否 | 导出格式 (csv, 默认 csv) |
| fields | array | 否 | 导出字段，不传则使用默认字段 |

**响应**
- Content-Type: `text/csv`
- Content-Disposition: `attachment; filename="resource_export_1234567890.csv"`

---

### 3.4 批量分配

**请求**
```http
PATCH /api/batch/:resource/assign
Content-Type: application/json
Authorization: Bearer <token>

{
  "ids": [1, 2, 3],
  "assignee_id": "ou_xxx"
}
```

**参数说明**
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| resource | string | 是 | 资源类型 (当前仅支持 tasks) |
| ids | array | 是 | 记录 ID 列表 |
| assignee_id | string | 是 | 分配对象 ID (用户 open_id) |

**响应**
```json
{
  "success": true,
  "assigned_count": 3,
  "failed_ids": []
}
```

---

## 4. 数据库设计

### 4.1 现有表支持

批量操作功能基于现有表结构，无需额外表结构变更：

| 资源类型 | 表名 | 状态字段 | 分配字段 |
|----------|------|----------|----------|
| users | users | status | - |
| tasks | tasks | status | assigned_agents |
| scenarios | scenarios | status | - |
| audit-logs | audit_logs | - | - |
| sessions | sessions | is_valid | - |
| backup-records | backup_records | status | - |

### 4.2 建议新增表：batch_operation_logs

用于审计追踪批量操作记录：

```sql
CREATE TABLE IF NOT EXISTS batch_operation_logs (
    id            TEXT    PRIMARY KEY,
    operation_type TEXT   NOT NULL,  -- delete/update/export/assign
    resource_type  TEXT   NOT NULL,  -- users/tasks/scenarios等
    record_ids     TEXT   NOT NULL,  -- JSON 数组，如 "[1,2,3]"
    target_value   TEXT,             -- 目标状态/分配人等
    operator_id    TEXT   NOT NULL,  -- 操作人 ID
    result_status  TEXT   NOT NULL,  -- success/failed/partial
    success_count  INTEGER DEFAULT 0,
    failed_count   INTEGER DEFAULT 0,
    error_message  TEXT,
    created_at     INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_batch_logs_operator ON batch_operation_logs(operator_id);
CREATE INDEX IF NOT EXISTS idx_batch_logs_resource ON batch_operation_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_batch_logs_created ON batch_operation_logs(created_at DESC);
```

---

## 5. 安全设计

### 5.1 权限控制

每个批量操作都需要对应的 RBAC 权限：

| 操作 | 权限名称 | 说明 |
|------|----------|------|
| 批量删除用户 | users:delete | 删除用户权限 |
| 批量删除任务 | tasks:delete | 删除任务权限 |
| 批量更新用户状态 | users:update | 更新用户权限 |
| 批量更新任务状态 | tasks:update | 更新任务权限 |
| 批量导出 | *:export | 导出权限 |
| 批量分配任务 | tasks:assign | 任务分配权限 |

### 5.2 安全策略

1. **二次确认机制**: 危险操作 (删除) 必须前端弹窗确认
2. **操作上限**: 单次操作最多 100 条记录
3. **操作日志**: 所有批量操作记录审计日志
4. **事务保证**: 批量操作使用事务，保证数据一致性
5. **错误处理**: 部分失败时返回失败记录 ID，不影响成功记录

---

## 6. 前端组件设计

### 6.1 组件结构

```
src/components/batch/
├── BatchOperationBar.vue    # 批量操作工具栏
├── BatchConfirmDialog.vue   # 确认弹窗
├── BatchProgressDialog.vue  # 进度弹窗
└── hooks/
    └── useBatchSelection.ts # 选择状态管理
```

### 6.2 状态管理

```typescript
// useBatchSelection.ts
interface BatchSelectionState {
  selectedIds: Set<number>;
  isAllSelected: boolean;
  totalCount: number;
  
  toggleSelect(id: number): void;
  selectAll(): void;
  clearSelection(): void;
  getSelectedCount(): number;
}
```

---

## 7. 实施计划

### Phase 1: 后端实现 (已完成)
- ✅ 路由定义 (`server/routes/batch.routes.js`)
- ✅ 基础 CRUD 操作
- ✅ 权限验证
- ⏳ 批量操作日志记录

### Phase 2: 前端实现 (待开始)
- [ ] BatchOperationBar 组件
- [ ] BatchConfirmDialog 组件
- [ ] 复选框集成
- [ ] 状态管理 hook

### Phase 3: 联调测试 (待开始)
- [ ] API 接口测试
- [ ] 前端组件测试
- [ ] E2E 测试

### Phase 4: 优化完善 (待开始)
- [ ] 性能优化 (大批量操作)
- [ ] 错误处理完善
- [ ] 文档完善

---

## 8. 参考文档

- [UI 设计稿](../../designs/BATCH_OPERATION_UI.md)
- [数据库设计报告](../../DBA_DATABASE_DESIGN_REPORT.md)
- [后端路由实现](../../server/routes/batch.routes.js)

---

## 9. 变更记录

| 版本 | 日期 | 作者 | 变更内容 |
|------|------|------|----------|
| v1.0 | 2026-04-12 | 系统架构师 | 初始版本，架构设计完成 |

---

**文档状态**: ✅ 已完成  
**评审状态**: ⏳ 待评审  
**下一步**: 传递给开发团队实施
