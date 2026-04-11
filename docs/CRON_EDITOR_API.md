# Cron 可视化编辑器 API 文档

**版本**: 1.0.0  
**最后更新**: 2026-04-12  
**状态**: ✅ 已完成

---

## 概述

Cron 可视化编辑器提供完整的定时任务管理功能，支持任务的创建、编辑、删除、批量操作和运行监控。

### 基础信息

- **Base URL**: `/api/crons`
- **认证方式**: JWT Token (Header: `Authorization: Bearer <token>`)
- **数据格式**: JSON
- **字符编码**: UTF-8

---

## API 列表

### 1. 获取 Cron 任务列表

**接口**: `GET /api/crons`

**描述**: 获取分页的任务列表，支持搜索、筛选和排序

**查询参数**:

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| q | string | 否 | - | 搜索关键词（匹配标题或命令） |
| enabled | string | 否 | all | 启用状态筛选：`true`/`false`/`all` |
| sortBy | string | 否 | created_at | 排序字段：`title`/`enabled`/`created_at`/`updated_at` |
| sortOrder | string | 否 | desc | 排序方式：`asc`/`desc` |
| page | number | 否 | 1 | 页码（最小值：1） |
| limit | number | 否 | 20 | 每页数量（1-100） |

**请求示例**:
```http
GET /api/crons?q=备份&enabled=true&page=1&limit=20
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "title": "数据库备份任务",
        "schedule_type": "cron",
        "expression": "0 2 * * *",
        "command": "/usr/local/bin/backup.sh",
        "description": "每天凌晨 2 点执行数据库备份",
        "enabled": true,
        "created_at": "2026-04-10 10:00:00",
        "updated_at": "2026-04-11 15:30:00"
      }
    ],
    "total": 15,
    "page": 1,
    "limit": 20
  }
}
```

---

### 2. 获取 Cron 统计信息

**接口**: `GET /api/crons/stats`

**描述**: 获取任务统计信息，包括总数、启用/禁用数量和按调度类型分类

**请求示例**:
```http
GET /api/crons/stats
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "total": 25,
    "enabled": 18,
    "disabled": 7,
    "byScheduleType": {
      "cron": 15,
      "every": 6,
      "at": 4
    }
  }
}
```

---

### 3. 创建 Cron 任务

**接口**: `POST /api/crons`

**描述**: 创建新的定时任务

**权限要求**: `crons:create`

**请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 任务标题 |
| scheduleType | string | 是 | 调度类型：`cron`/`every`/`at` |
| expression | string | 是 | Cron 表达式或时间间隔 |
| command | string | 是 | 要执行的命令 |
| description | string | 否 | 任务描述 |
| enabled | boolean | 否 | 是否启用（默认：true） |

**请求示例**:
```http
POST /api/crons
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "title": "日志清理任务",
  "scheduleType": "cron",
  "expression": "0 3 * * *",
  "command": "/usr/local/bin/cleanup-logs.sh",
  "description": "每天凌晨 3 点清理过期日志",
  "enabled": true
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": 26,
    "title": "日志清理任务",
    "scheduleType": "cron",
    "expression": "0 3 * * *",
    "command": "/usr/local/bin/cleanup-logs.sh",
    "description": "每天凌晨 3 点清理过期日志",
    "enabled": true
  }
}
```

---

### 4. 更新 Cron 任务

**接口**: `PUT /api/crons/:id`

**描述**: 更新现有任务的信息

**权限要求**: `crons:update`

**路径参数**:
- `id`: 任务 ID

**请求体** (所有字段可选):

| 字段 | 类型 | 说明 |
|------|------|------|
| title | string | 任务标题 |
| scheduleType | string | 调度类型 |
| expression | string | Cron 表达式 |
| command | string | 执行命令 |
| description | string | 任务描述 |
| enabled | boolean | 启用状态 |

**请求示例**:
```http
PUT /api/crons/26
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "title": "日志清理任务 - 优化版",
  "enabled": false
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": 26
  }
}
```

---

### 5. 删除 Cron 任务

**接口**: `DELETE /api/crons/:id`

**描述**: 删除单个任务

**权限要求**: `crons:delete`

**路径参数**:
- `id`: 任务 ID

**请求示例**:
```http
DELETE /api/crons/26
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**响应示例**:
```json
{
  "success": true,
  "deleted": true
}
```

---

### 6. 批量删除 Cron 任务

**接口**: `POST /api/crons/batch-delete`

**描述**: 批量删除多个任务

**权限要求**: `crons:delete`

**请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| jobIds | array | 是 | 任务 ID 列表（至少 1 个） |

**请求示例**:
```http
POST /api/crons/batch-delete
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "jobIds": [26, 27, 28]
}
```

**响应示例**:
```json
{
  "success": true,
  "deletedCount": 3,
  "failedCount": 0
}
```

---

### 7. 批量启用 Cron 任务

**接口**: `POST /api/crons/batch-enable`

**描述**: 批量启用多个任务

**权限要求**: `crons:update`

**请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| jobIds | array | 是 | 任务 ID 列表（至少 1 个） |

**请求示例**:
```http
POST /api/crons/batch-enable
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "jobIds": [26, 27, 28]
}
```

**响应示例**:
```json
{
  "success": true,
  "enabledCount": 3,
  "failedCount": 0
}
```

---

### 8. 批量禁用 Cron 任务

**接口**: `POST /api/crons/batch-disable`

**描述**: 批量禁用多个任务

**权限要求**: `crons:update`

**请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| jobIds | array | 是 | 任务 ID 列表（至少 1 个） |

**请求示例**:
```http
POST /api/crons/batch-disable
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "jobIds": [26, 27, 28]
}
```

**响应示例**:
```json
{
  "success": true,
  "disabledCount": 3,
  "failedCount": 0
}
```

---

### 9. 手动运行 Cron 任务

**接口**: `POST /api/crons/:id/run`

**描述**: 立即手动执行指定任务

**权限要求**: `crons:run`

**路径参数**:
- `id`: 任务 ID

**请求示例**:
```http
POST /api/crons/26/run
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**响应示例**:
```json
{
  "success": true,
  "message": "任务已添加到执行队列"
}
```

---

### 10. 获取任务状态

**接口**: `GET /api/crons/:id/status`

**描述**: 获取单个任务的详细信息和最近运行状态

**路径参数**:
- `id`: 任务 ID

**请求示例**:
```http
GET /api/crons/26/status
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": 26,
    "title": "日志清理任务",
    "enabled": true,
    "lastRun": {
      "id": 1001,
      "cron_id": 26,
      "command": "/usr/local/bin/cleanup-logs.sh",
      "status": "success",
      "started_at": "2026-04-11 03:00:00",
      "finished_at": "2026-04-11 03:05:23",
      "output": "清理完成，删除了 150 个日志文件"
    }
  }
}
```

---

### 11. 获取任务运行历史

**接口**: `GET /api/crons/:id/runs`

**描述**: 获取任务的历史运行记录

**路径参数**:
- `id`: 任务 ID

**查询参数**:

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | number | 否 | 1 | 页码 |
| limit | number | 否 | 20 | 每页数量（1-100） |

**请求示例**:
```http
GET /api/crons/26/runs?page=1&limit=10
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "runs": [
      {
        "id": 1001,
        "cron_id": 26,
        "command": "/usr/local/bin/cleanup-logs.sh",
        "status": "success",
        "started_at": "2026-04-11 03:00:00",
        "finished_at": "2026-04-11 03:05:23",
        "output": "清理完成，删除了 150 个日志文件"
      },
      {
        "id": 1000,
        "cron_id": 26,
        "command": "/usr/local/bin/cleanup-logs.sh",
        "status": "success",
        "started_at": "2026-04-10 03:00:00",
        "finished_at": "2026-04-10 03:04:56",
        "output": "清理完成，删除了 145 个日志文件"
      }
    ],
    "total": 30,
    "page": 1,
    "limit": 10
  }
}
```

---

## 错误处理

### HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### 错误响应格式

```json
{
  "success": false,
  "error": "错误描述信息"
}
```

### 参数验证错误

```json
{
  "success": false,
  "errors": [
    {
      "msg": "标题不能为空",
      "param": "title",
      "location": "body"
    }
  ]
}
```

---

## 安全说明

1. **认证要求**: 所有接口都需要 JWT Token 认证
2. **权限控制**: 写操作需要对应的权限（`crons:create`/`crons:update`/`crons:delete`）
3. **SQL 注入防护**: 所有查询都使用参数化查询
4. **请求限制**: 分页参数限制了最大返回数量（limit ≤ 100）
5. **批量操作限制**: 批量操作建议单次不超过 100 条记录

---

## 调度类型说明

### 1. Cron 类型 (`cron`)
使用标准的 Cron 表达式：
- `* * * * *` - 分钟 小时 日 月 星期
- 示例：`0 2 * * *` - 每天凌晨 2 点

### 2. 间隔类型 (`every`)
指定时间间隔：
- 示例：`1h` - 每小时
- 示例：`30m` - 每 30 分钟
- 示例：`1d` - 每天

### 3. 定时类型 (`at`)
指定具体执行时间：
- 示例：`2026-04-12 10:00:00` - 指定时间点执行一次

---

## 最佳实践

1. **任务命名**: 使用描述性标题，便于识别
2. **命令路径**: 使用绝对路径，避免环境变量问题
3. **日志记录**: 命令输出应记录到日志文件
4. **错误处理**: 命令应包含错误处理逻辑
5. **超时设置**: 长时间运行的任务应设置超时
6. **权限最小化**: 使用最小权限运行任务

---

## 更新日志

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| 1.0.0 | 2026-04-12 | 初始版本，完成所有 API 接口文档 |

---

**文档负责人**: 技术文档工程师 📝  
**最后更新**: 2026-04-12
