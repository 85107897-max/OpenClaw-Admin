# 批量操作功能架构设计文档

**版本**: v1.0  
**创建日期**: 2026-04-12  
**负责人**: 系统架构师  
**状态**: 已完成

---

## 1. 需求概述

### 1.1 业务背景
OpenClaw-Admin 平台需要支持对大量记录进行批量操作，提升管理效率。当前系统已实现单条记录的 CRUD 操作，但面对批量删除、批量状态变更、批量导出等场景时，用户需要多次操作，效率低下。

### 1.2 核心需求
- **批量删除**: 一次性删除多条记录
- **批量状态变更**: 批量更新记录状态
- **批量导出**: 一次性导出多条记录
- **批量分配/转移**: 批量分配资源给多个用户
- **全选/反选**: 支持全选和反选功能
- **操作确认**: 危险操作需要二次确认
- **操作审计**: 记录所有批量操作日志

### 1.3 用户场景
1. 管理员需要删除 50 条过期任务
2. 批量将 100 个用户状态变更为"禁用"
3. 一次性导出 200 条审计日志
4. 批量分配 30 个任务给 5 个团队成员

---

## 2. 架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         前端层 (Vue 3)                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ BatchToolbar.vue│  │ BatchConfirmDlg │  │ useBatchSelect  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    stores/batch.ts                          ││
│  │  - selectedIds: Set                                        ││
│  │  - selectAll(): void                                       ││
│  │  - toggleSelect(id): void                                  ││
│  │  - clearSelection(): void                                  ││
│  │  - getSelectedCount(): number                              ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         后端层 (Express)                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              routes/batch.routes.js                         ││
│  │  POST /api/batch/delete                                     ││
│  │  POST /api/batch/update-status                              ││
│  │  POST /api/batch/export                                     ││
│  │  POST /api/batch/assign                                     ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              services/BatchService.js                       ││
│  │  - batchDelete(resource, ids, operator)                     ││
│  │  - batchUpdateStatus(resource, ids, status, operator)       ││
│  │  - batchExport(resource, ids, format, operator)             ││
│  │  - batchAssign(resource, ids, target, operator)             ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              models/OperationLog.js                         ││
│  │  - 记录批量操作详情                                          ││
│  │  - 支持审计和回溯                                            ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       数据层 (SQLite)                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              operation_logs 表                               ││
│  │  - id, operator_id, operator_name                           ││
│  │  - operation_type, target_resource, target_ids              ││
│  │  - operation_params, result, success_count, failed_count    ││
│  │  - error_details, duration_ms, created_at                   ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 组件设计

#### 2.2.1 前端组件

**BatchToolbar.vue** - 批量操作工具栏
```vue
<template>
  <div class="batch-toolbar" v-if="selectedCount > 0">
    <span class="selection-count">已选择 {{ selectedCount }} 项</span>
    <n-button @click="handleBatchDelete" type="error">批量删除</n-button>
    <n-dropdown :options="statusOptions" @command="handleStatusChange">
      <n-button>批量状态变更</n-button>
    </n-dropdown>
    <n-button @click="handleBatchExport">批量导出</n-button>
    <n-button @click="handleClearSelection">取消选择</n-button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useBatchStore } from '@/stores/batch'

const batchStore = useBatchStore()
const selectedCount = computed(() => batchStore.selectedCount)

const handleBatchDelete = () => {
  // 弹出确认对话框
}

const handleStatusChange = (status: string) => {
  // 批量状态变更
}
</script>
```

**BatchConfirmDialog.vue** - 确认弹窗
```vue
<template>
  <n-modal v-model:show="show" preset="dialog" title="批量操作确认">
    <p>您确定要对选中的 {{ count }} 项记录执行 {{ operationType }} 操作吗？</p>
    <p class="warning">⚠️ 此操作不可逆，请谨慎操作</p>
    <template #footer>
      <n-button @click="show = false">取消</n-button>
      <n-button type="error" @click="handleConfirm">确认</n-button>
    </template>
  </n-modal>
</template>
```

**useBatchSelection.ts** - 选择逻辑 Composable
```typescript
import { ref, computed } from 'vue'

export function useBatchSelection() {
  const selectedIds = ref<Set<string>>(new Set())

  const toggleSelect = (id: string) => {
    if (selectedIds.value.has(id)) {
      selectedIds.value.delete(id)
    } else {
      selectedIds.value.add(id)
    }
  }

  const selectAll = (ids: string[]) => {
    selectedIds.value = new Set(ids)
  }

  const clearSelection = () => {
    selectedIds.value.clear()
  }

  return {
    selectedIds,
    selectedCount: computed(() => selectedIds.value.size),
    toggleSelect,
    selectAll,
    clearSelection,
    isSelected: (id: string) => selectedIds.value.has(id)
  }
}
```

#### 2.2.2 后端服务

**BatchService.js** - 批量操作服务
```javascript
const db = require('../database');
const OperationLog = require('../models/OperationLog');

class BatchService {
  async batchDelete(resource, ids, operator) {
    const startTime = Date.now();
    const results = { success: [], failed: [] };

    try {
      const transaction = db.transaction((ids) => {
        for (const id of ids) {
          try {
            const row = db.prepare(`DELETE FROM ${resource} WHERE id = ?`).run(id);
            if (row.changes > 0) {
              results.success.push(id);
            } else {
              results.failed.push({ id, error: '记录不存在' });
            }
          } catch (error) {
            results.failed.push({ id, error: error.message });
          }
        }
      });

      transaction(ids);

      // 记录操作日志
      await OperationLog.create({
        operator_id: operator.id,
        operator_name: operator.name,
        operation_type: 'batch_delete',
        target_resource: resource,
        target_ids: JSON.stringify(ids),
        result: results.failed.length === 0 ? 'success' : 'partial_success',
        success_count: results.success.length,
        failed_count: results.failed.length,
        error_details: results.failed.length > 0 ? JSON.stringify(results.failed) : null,
        duration_ms: Date.now() - startTime
      });

      return results;
    } catch (error) {
      // 记录失败日志
      await OperationLog.create({
        operator_id: operator.id,
        operator_name: operator.name,
        operation_type: 'batch_delete',
        target_resource: resource,
        target_ids: JSON.stringify(ids),
        result: 'failed',
        success_count: 0,
        failed_count: ids.length,
        error_details: JSON.stringify([{ error: error.message }]),
        duration_ms: Date.now() - startTime
      });
      throw error;
    }
  }

  async batchUpdateStatus(resource, ids, status, operator) {
    // 类似实现
  }

  async batchExport(resource, ids, format, operator) {
    // 类似实现
  }
}

module.exports = new BatchService();
```

---

## 3. 数据库设计

### 3.1 现有表分析
当前数据库已定义 `operation_logs` 表（见 `db/migrations/003_feature_tables.sql`），满足批量操作日志需求。

### 3.2 新增索引建议
```sql
-- 优化批量查询性能
CREATE INDEX IF NOT EXISTS idx_batch_resource_id ON {resource}(id);
CREATE INDEX IF NOT EXISTS idx_batch_resource_status ON {resource}(status);

-- operation_logs 表已有索引，无需新增
```

### 3.3 数据量评估
- 单批次操作上限：建议 500 条
- 日批量操作量：预计 100-500 次
- operation_logs 表月增长量：约 1-5 万条
- 建议保留策略：保留 90 天，之后归档或删除

---

## 4. API 接口规范

### 4.1 批量删除

**请求**
```http
POST /api/batch/delete
Content-Type: application/json

{
  "resource": "tasks",
  "ids": ["id1", "id2", "id3", "id4", "id5"],
  "force": false
}
```

**响应**
```json
{
  "success": true,
  "data": {
    "total": 5,
    "success_count": 5,
    "failed_count": 0,
    "failed_items": []
  },
  "message": "批量删除成功"
}
```

**错误响应**
```json
{
  "success": false,
  "error": "部分删除失败",
  "data": {
    "total": 5,
    "success_count": 3,
    "failed_count": 2,
    "failed_items": [
      { "id": "id4", "error": "记录不存在" },
      { "id": "id5", "error": "权限不足" }
    ]
  }
}
```

### 4.2 批量状态变更

**请求**
```http
POST /api/batch/update-status
Content-Type: application/json

{
  "resource": "users",
  "ids": ["id1", "id2", "id3"],
  "status": "disabled",
  "reason": "批量禁用过期账户"
}
```

**响应**
```json
{
  "success": true,
  "data": {
    "total": 3,
    "success_count": 3,
    "failed_count": 0
  },
  "message": "批量状态变更成功"
}
```

### 4.3 批量导出

**请求**
```http
POST /api/batch/export
Content-Type: application/json

{
  "resource": "audit_logs",
  "ids": ["id1", "id2", "id3", "id4", "id5"],
  "format": "xlsx",
  "fields": ["id", "operator", "action", "created_at"]
}
```

**响应**
```http
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="export_20260412.xlsx"

[二进制文件]
```

### 4.4 批量分配

**请求**
```http
POST /api/batch/assign
Content-Type: application/json

{
  "resource": "tasks",
  "ids": ["id1", "id2", "id3", "id4", "id5"],
  "target_type": "user",
  "target_id": "user_123"
}
```

**响应**
```json
{
  "success": true,
  "data": {
    "total": 5,
    "success_count": 5,
    "failed_count": 0
  },
  "message": "批量分配成功"
}
```

---

## 5. 技术风险评估

### 5.1 性能风险

| 风险点 | 影响程度 | 缓解措施 |
|--------|---------|---------|
| 大批量操作超时 | 中 | 设置超时限制（30s），超过则异步处理 |
| 数据库锁竞争 | 中 | 使用事务，控制单次操作数量（≤500） |
| 内存占用过高 | 低 | 流式处理导出，避免一次性加载 |
| 前端渲染卡顿 | 低 | 虚拟列表，分页加载 |

### 5.2 安全风险

| 风险点 | 影响程度 | 缓解措施 |
|--------|---------|---------|
| 批量删除误操作 | 高 | 强制二次确认，显示选中记录详情 |
| 权限绕过 | 高 | 每条记录单独校验权限 |
| 批量导出敏感数据 | 中 | 敏感字段脱敏，记录导出日志 |
| 恶意批量操作 | 中 | 频率限制（10 次/分钟），IP 黑名单 |

### 5.3 数据一致性风险

| 风险点 | 影响程度 | 缓解措施 |
|--------|---------|---------|
| 部分失败导致数据不一致 | 中 | 使用事务，支持回滚 |
| 并发操作冲突 | 中 | 乐观锁，版本号控制 |
| 日志记录失败 | 低 | 异步日志，失败重试机制 |

---

## 6. 性能优化建议

### 6.1 数据库优化
```sql
-- 启用 WAL 模式
PRAGMA journal_mode = WAL;

-- 批量操作时使用事务
BEGIN TRANSACTION;
-- 执行批量操作
COMMIT;
```

### 6.2 前端优化
- 虚拟列表渲染（超过 100 条时使用）
- 防抖处理（选择操作 300ms 防抖）
- 懒加载详情（仅加载选中项详情）

### 6.3 后端优化
- 批量操作分批次处理（每批 100 条）
- 异步处理耗时操作（导出、复杂计算）
- 缓存常用查询结果

---

## 7. 实施计划

### 7.1 阶段一：后端 API 开发（3 天）
- [ ] 创建 `routes/batch.routes.js`
- [ ] 实现 `services/BatchService.js`
- [ ] 完善 `models/OperationLog.js`
- [ ] 编写单元测试

### 7.2 阶段二：前端组件开发（4 天）
- [ ] 开发 `BatchToolbar.vue`
- [ ] 开发 `BatchConfirmDialog.vue`
- [ ] 实现 `useBatchSelection.ts`
- [ ] 集成到现有列表页面

### 7.3 阶段三：联调与测试（2 天）
- [ ] 前后端联调
- [ ] 性能测试（1000 条数据）
- [ ] 安全测试（权限绕过、SQL 注入）
- [ ] 用户验收测试

### 7.4 阶段四：上线与监控（1 天）
- [ ] 灰度发布
- [ ] 监控批量操作日志
- [ ] 收集用户反馈

---

## 8. 验收标准

- [ ] 支持批量删除、状态变更、导出、分配操作
- [ ] 单次操作支持最多 500 条记录
- [ ] 危险操作需要二次确认
- [ ] 所有批量操作记录到 `operation_logs` 表
- [ ] 部分失败时返回详细错误信息
- [ ] 1000 条数据批量操作响应时间 < 3s
- [ ] 单元测试覆盖率 ≥ 90%
- [ ] 通过安全扫描，无高危漏洞

---

## 9. 附录

### 9.1 相关文件
- [UI 设计稿](../designs/BATCH_OPERATION_UI.md)
- [数据库设计报告](../DBA_DATABASE_DESIGN_REPORT.md)
- [迁移文件](../db/migrations/003_feature_tables.sql)

### 9.2 术语表
- **批量操作**: 对多条记录同时执行相同操作
- **部分成功**: 批量操作中部分记录成功，部分失败
- **软删除**: 标记删除而非物理删除

---

**文档状态**: 已完成  
**下一步**: 等待产品经理确认优先级后启动开发

**最后更新**: 2026-04-12 02:19  
**更新人**: 系统架构师  
**文档版本**: v1.0
