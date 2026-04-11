# 批量操作 API 接口规范

**版本**: v1.0  
**创建日期**: 2026-04-12  
**负责人**: 系统架构师  
**状态**: 已完成

---

## 1. 概述

本文档定义 OpenClaw-Admin 平台批量操作功能的 API 接口规范。

### 1.1 基础信息
- **Base URL**: `/api/batch`
- **Content-Type**: `application/json`
- **认证方式**: JWT Token (Header: `Authorization: Bearer <token>`)
- **响应格式**: 统一 JSON 格式

### 1.2 响应格式规范

**成功响应**
```json
{
  "success": true,
  "data": {
    // 业务数据
  },
  "message": "操作成功"
}
```

**失败响应**
```json
{
  "success": false,
  "error": "错误描述",
  "data": {
    // 错误详情（可选）
  },
  "message": "操作失败"
}
```

**部分成功响应**
```json
{
  "success": true,
  "data": {
    "total": 10,
    "success_count": 8,
    "failed_count": 2,
    "failed_items": [
      { "id": "id2", "error": "权限不足" },
      { "id": "id5", "error": "记录不存在" }
    ]
  },
  "message": "部分操作成功"
}
```

---

## 2. API 接口列表

### 2.1 批量删除

#### 接口定义
```http
POST /api/batch/delete
```

#### 请求参数
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| resource | string | 是 | 资源类型：tasks, users, roles, agents, configs 等 |
| ids | string[] | 是 | 要删除的记录 ID 数组，最多 500 条 |
| force | boolean | 否 | 是否强制删除（跳过确认），默认 false |

#### 请求示例
```json
{
  "resource": "tasks",
  "ids": ["task_001", "task_002", "task_003", "task_004", "task_005"],
  "force": false
}
```

#### 成功响应
```json
{
  "success": true,
  "data": {
    "resource": "tasks",
    "total": 5,
    "success_count": 5,
    "failed_count": 0,
    "failed_items": [],
    "duration_ms": 125
  },
  "message": "批量删除成功"
}
```

#### 部分成功响应
```json
{
  "success": true,
  "data": {
    "resource": "tasks",
    "total": 5,
    "success_count": 3,
    "failed_count": 2,
    "failed_items": [
      { "id": "task_004", "error": "记录不存在" },
      { "id": "task_005", "error": "无权删除该记录" }
    ],
    "duration_ms": 156
  },
  "message": "部分删除成功"
}
```

#### 错误响应
```json
{
  "success": false,
  "error": "参数验证失败",
  "data": {
    "field": "ids",
    "message": "ids 数组不能超过 500 条"
  },
  "message": "请求参数错误"
}
```

#### 状态码
| 状态码 | 说明 |
|--------|------|
| 200 | 操作成功（包括部分成功） |
| 400 | 参数验证失败 |
| 401 | 未授权 |
| 403 | 无权限 |
| 500 | 服务器错误 |

---

### 2.2 批量状态变更

#### 接口定义
```http
POST /api/batch/update-status
```

#### 请求参数
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| resource | string | 是 | 资源类型 |
| ids | string[] | 是 | 要更新的记录 ID 数组 |
| status | string | 是 | 目标状态值 |
| reason | string | 否 | 变更原因（用于审计） |

#### 请求示例
```json
{
  "resource": "users",
  "ids": ["user_001", "user_002", "user_003"],
  "status": "disabled",
  "reason": "批量禁用过期账户"
}
```

#### 成功响应
```json
{
  "success": true,
  "data": {
    "resource": "users",
    "total": 3,
    "success_count": 3,
    "failed_count": 0,
    "failed_items": [],
    "previous_status": "active",
    "new_status": "disabled",
    "duration_ms": 98
  },
  "message": "批量状态变更成功"
}
```

---

### 2.3 批量导出

#### 接口定义
```http
POST /api/batch/export
```

#### 请求参数
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| resource | string | 是 | 资源类型 |
| ids | string[] | 是 | 要导出的记录 ID 数组 |
| format | string | 否 | 导出格式：xlsx, csv, json（默认 xlsx） |
| fields | string[] | 否 | 要导出的字段列表（不填则导出全部） |
| filename | string | 否 | 自定义文件名（不含扩展名） |

#### 请求示例
```json
{
  "resource": "audit_logs",
  "ids": ["log_001", "log_002", "log_003", "log_004", "log_005"],
  "format": "xlsx",
  "fields": ["id", "operator", "action", "created_at"],
  "filename": "audit_logs_export"
}
```

#### 成功响应
```http
HTTP/1.1 200 OK
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="audit_logs_export_20260412.xlsx"
Content-Length: 45678

[二进制文件内容]
```

#### JSON 格式响应（当 format=json 时）
```json
{
  "success": true,
  "data": {
    "resource": "audit_logs",
    "total": 5,
    "format": "json",
    "records": [
      { "id": "log_001", "operator": "admin", "action": "login", "created_at": "2026-04-12T01:00:00Z" },
      { "id": "log_002", "operator": "user1", "action": "update", "created_at": "2026-04-12T01:05:00Z" }
    ]
  },
  "message": "导出成功"
}
```

---

### 2.4 批量分配

#### 接口定义
```http
POST /api/batch/assign
```

#### 请求参数
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| resource | string | 是 | 资源类型（如 tasks） |
| ids | string[] | 是 | 要分配的资源 ID 数组 |
| target_type | string | 是 | 目标类型：user, team, role |
| target_id | string | 是 | 目标 ID（用户/团队/角色 ID） |

#### 请求示例
```json
{
  "resource": "tasks",
  "ids": ["task_001", "task_002", "task_003", "task_004", "task_005"],
  "target_type": "user",
  "target_id": "user_123"
}
```

#### 成功响应
```json
{
  "success": true,
  "data": {
    "resource": "tasks",
    "total": 5,
    "success_count": 5,
    "failed_count": 0,
    "failed_items": [],
    "target_type": "user",
    "target_id": "user_123",
    "duration_ms": 145
  },
  "message": "批量分配成功"
}
```

---

### 2.5 批量更新（通用）

#### 接口定义
```http
POST /api/batch/update
```

#### 请求参数
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| resource | string | 是 | 资源类型 |
| ids | string[] | 是 | 要更新的记录 ID 数组 |
| fields | object | 是 | 要更新的字段及值 |

#### 请求示例
```json
{
  "resource": "tasks",
  "ids": ["task_001", "task_002", "task_003"],
  "fields": {
    "priority": "high",
    "tags": ["urgent", "review"]
  }
}
```

#### 成功响应
```json
{
  "success": true,
  "data": {
    "resource": "tasks",
    "total": 3,
    "success_count": 3,
    "failed_count": 0,
    "updated_fields": ["priority", "tags"],
    "duration_ms": 112
  },
  "message": "批量更新成功"
}
```

---

## 3. 错误码规范

### 3.1 通用错误码
| 错误码 | 说明 | HTTP 状态码 |
|--------|------|------------|
| BATCH_001 | 参数验证失败 | 400 |
| BATCH_002 | ID 数组为空 | 400 |
| BATCH_003 | ID 数组超过限制 | 400 |
| BATCH_004 | 资源类型不存在 | 400 |
| BATCH_005 | 未授权 | 401 |
| BATCH_006 | 无操作权限 | 403 |
| BATCH_007 | 部分操作失败 | 200（带部分成功数据） |
| BATCH_008 | 服务器内部错误 | 500 |
| BATCH_009 | 操作超时 | 504 |

### 3.2 错误响应示例
```json
{
  "success": false,
  "error_code": "BATCH_003",
  "error": "ID 数组超过限制",
  "data": {
    "limit": 500,
    "received": 750
  },
  "message": "批量操作 ID 数组不能超过 500 条"
}
```

---

## 4. 安全规范

### 4.1 认证与授权
- 所有接口必须携带 JWT Token
- 用户需具备对应资源的批量操作权限
- 权限校验在每条记录级别执行

### 4.2 频率限制
| 操作类型 | 限制 |
|----------|------|
| 批量删除 | 10 次/分钟/IP |
| 批量状态变更 | 10 次/分钟/IP |
| 批量导出 | 5 次/分钟/IP |
| 批量分配 | 10 次/分钟/IP |

### 4.3 审计日志
所有批量操作记录到 `operation_logs` 表，包含：
- 操作人信息
- 操作类型
- 目标资源及 ID 列表
- 操作参数
- 执行结果（成功/失败数量）
- 错误详情
- 执行耗时
- IP 地址

---

## 5. 性能要求

| 指标 | 要求 |
|------|------|
| 单次操作上限 | 500 条记录 |
| 响应时间（100 条） | < 500ms |
| 响应时间（500 条） | < 3000ms |
| 并发支持 | 至少 10 个并发请求 |
| 超时设置 | 30 秒 |

---

## 6. 版本历史

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v1.0 | 2026-04-12 | 初始版本 |

---

**文档状态**: 已完成  
**下一步**: 后端开发实现

**最后更新**: 2026-04-12 02:19  
**更新人**: 系统架构师  
**文档版本**: v1.0
