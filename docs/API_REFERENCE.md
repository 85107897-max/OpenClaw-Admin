# OpenClaw-Admin API 参考文档

> **文档版本**: v1.0  
> **最后更新**: 2026-04-11  
> **维护者**: 技术文档工程师

---

## 概述

OpenClaw-Admin 提供 RESTful API 和 WebSocket RPC 两种通信方式：

- **REST API**: 用于 HTTP 请求，适合前端页面和数据操作
- **WebSocket RPC**: 用于实时通信，适合会话管理、消息推送等场景

---

## 认证方式

所有 API 请求都需要在 Header 中携带认证 Token：

```http
Authorization: Bearer <token>
```

Token 通过登录接口获取：

### POST /api/auth/login

用户登录接口

**请求体**:
```json
{
  "username": "admin",
  "password": "admin"
}
```

**响应**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_123",
    "username": "admin",
    "display_name": "管理员",
    "role": "admin",
    "avatar": null,
    "email": "admin@example.com"
  }
}
```

---

## 认证模块 (Auth)

### POST /api/auth/login
用户登录

### POST /api/auth/logout
用户登出（需要认证）

### GET /api/auth/me
获取当前用户信息（需要认证）

### POST /api/auth/change-password
修改密码（需要认证）

**请求体**:
```json
{
  "oldPassword": "old123",
  "newPassword": "new123"
}
```

### POST /api/auth/register
用户注册

**请求体**:
```json
{
  "username": "newuser",
  "password": "password123",
  "display_name": "新用户",
  "email": "user@example.com"
}
```

---

## 会话管理 (Sessions)

### GET /api/sessions
获取会话列表

**查询参数**:
- `q`: 搜索关键词
- `agentId`: 智能体 ID 筛选
- `channel`: 频道筛选
- `page`: 页码（默认 1）
- `limit`: 每页数量（默认 20）

### GET /api/sessions/:id
获取会话详情

### POST /api/sessions/reset
重置会话

### DELETE /api/sessions/:id
删除会话

### POST /api/sessions/export
导出会话

---

## 定时任务 (Cron)

### GET /api/crons
获取 Cron 任务列表

**查询参数**:
- `q`: 搜索关键词
- `enabled`: 状态筛选（true/false/all）
- `sortBy`: 排序字段
- `sortOrder`: 排序方向（asc/desc）
- `page`: 页码
- `limit`: 每页数量

**响应**:
```json
{
  "ok": true,
  "items": [
    {
      "id": "cron_123",
      "name": "每日晨报",
      "description": "每天早上 8 点发送晨报",
      "schedule": "0 8 * * *",
      "enabled": true,
      "agentId": "main",
      "nextRun": "2026-04-11T08:00:00Z",
      "lastRun": "2026-04-10T08:00:00Z"
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 20
}
```

### POST /api/crons/batch-delete
批量删除 Cron 任务

**请求体**:
```json
{
  "jobIds": ["cron_123", "cron_456"]
}
```

### POST /api/crons/batch-enable
批量启用 Cron 任务

### POST /api/crons/batch-disable
批量禁用 Cron 任务

### GET /api/crons/stats
获取 Cron 统计信息

**响应**:
```json
{
  "ok": true,
  "stats": {
    "total": 10,
    "enabled": 8,
    "disabled": 2,
    "schedulerEnabled": true,
    "nextWakeAt": 1712822400000,
    "byScheduleType": {
      "cron": 6,
      "every": 2,
      "at": 2
    }
  }
}
```

---

## 用户管理 (User)

### GET /api/users
获取用户列表（需要 admin 权限）

### GET /api/users/:id
获取用户详情

### POST /api/users
创建用户（需要 admin 权限）

### PUT /api/users/:id
更新用户信息（需要 admin 权限或修改自己）

### DELETE /api/users/:id
删除用户（需要 admin 权限）

---

## RBAC 权限管理

### GET /api/rbac/roles
获取角色列表

### POST /api/rbac/roles
创建角色（需要 admin 权限）

### PUT /api/rbac/roles/:id
更新角色

### DELETE /api/rbac/roles/:id
删除角色

### GET /api/rbac/permissions
获取权限列表

### GET /api/rbac/users/:id/permissions
获取用户权限

---

## 审计日志 (Audit)

### GET /api/audit/logs
获取审计日志列表

**查询参数**:
- `userId`: 用户 ID 筛选
- `action`: 操作类型筛选
- `resource`: 资源类型筛选
- `startTime`: 开始时间
- `endTime`: 结束时间
- `page`: 页码
- `limit`: 每页数量

---

## 批量操作 (Batch)

### POST /api/batch/sessions/delete
批量删除会话

### POST /api/batch/sessions/enable
批量启用会话

### POST /api/batch/sessions/disable
批量禁用会话

---

## 统计信息 (Stats)

### GET /api/stats/overview
获取系统概览统计

**响应**:
```json
{
  "ok": true,
  "stats": {
    "totalSessions": 150,
    "activeSessions": 25,
    "totalUsers": 50,
    "totalAgents": 10,
    "totalCronJobs": 20,
    "tokenUsage": {
      "input": 1000000,
      "output": 500000,
      "total": 1500000
    }
  }
}
```

### GET /api/stats/token-usage
获取 Token 使用统计

---

## 主题配置 (Themes)

### GET /api/themes
获取主题列表

### POST /api/themes
创建主题

### PUT /api/themes/:id
更新主题

### DELETE /api/themes/:id
删除主题

---

## 搜索 (Search)

### GET /api/search
全局搜索

**查询参数**:
- `q`: 搜索关键词
- `type`: 搜索类型（sessions/users/agents/crons）
- `page`: 页码
- `limit`: 每页数量

---

## WebSocket RPC 接口

OpenClaw-Admin 通过 WebSocket 与 OpenClaw Gateway 通信，支持以下 RPC 方法：

### 会话管理
- `sessions.list` - 列出会话
- `sessions.get` - 获取会话详情
- `sessions.reset` - 重置会话
- `sessions.delete` - 删除会话
- `sessions.spawn` - 创建会话
- `sessions.history` - 获取历史记录
- `sessions.usage` - 获取用量统计

### 频道管理
- `channels.status` - 获取频道状态
- `channel.auth` - 频道认证
- `channel.pair` - 频道配对

### 智能体管理
- `agents.list` - 列出智能体
- `agents.create` - 创建智能体
- `agents.update` - 更新智能体
- `agents.delete` - 删除智能体
- `agents.files.list` - 列出文件
- `agents.files.get` - 获取文件
- `agents.files.set` - 设置文件

### 模型管理
- `models.list` - 列出模型

### 定时任务
- `cron.list` - 列出任务
- `cron.add` - 添加任务
- `cron.update` - 更新任务
- `cron.delete` - 删除任务
- `cron.run` - 执行任务

### 系统监控
- `health` - 健康检查
- `status` - 状态查询
- `system-presence` - 实例状态
- `logs.tail` - 日志查看

---

## 错误码

| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 400 | bad_request | 请求参数错误 |
| 401 | unauthorized | 未认证 |
| 403 | forbidden | 无权限 |
| 404 | not_found | 资源不存在 |
| 409 | conflict | 资源冲突 |
| 500 | internal_error | 服务器内部错误 |

---

## 附录

### A. Cron 表达式格式

支持以下三种调度类型：

1. **Cron 表达式**: `分 时 日 月 周`
   - 示例：`0 8 * * *`（每天早上 8 点）
   - 示例：`*/15 * * * *`（每 15 分钟）

2. **固定间隔**: `every`
   - 示例：`every: 1h`（每小时）
   - 示例：`every: 30m`（每 30 分钟）

3. **指定时间**: `at`
   - 示例：`at: 2026-04-11T08:00:00+08:00`

### B. 角色权限矩阵

| 权限 | 管理员 | 操作员 | 只读 |
|------|--------|--------|------|
| 用户管理 | ✅ | ❌ | ❌ |
| 会话管理 | ✅ | ✅ | ❌ |
| 定时任务 | ✅ | ✅ | ❌ |
| 模型管理 | ✅ | ✅ | ❌ |
| 频道管理 | ✅ | ✅ | ❌ |
| 查看数据 | ✅ | ✅ | ✅ |

---

**文档结束**

*📝 技术文档工程师 出品*
