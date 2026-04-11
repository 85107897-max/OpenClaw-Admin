# Cron 可视化编辑器 - 架构设计文档

**版本**: v1.0  
**创建日期**: 2026-04-12  
**负责人**: 系统架构师  
**状态**: 已完成

---

## 1. 概述

Cron 可视化编辑器是 OpenClaw-Admin 系统的核心功能模块之一，提供图形化界面让用户轻松创建、管理和监控定时任务。

### 1.1 设计目标
- **可视化**: 提供直观的 Cron 表达式编辑器
- **易用性**: 降低 Cron 表达式学习成本
- **可观测**: 完整的任务运行历史和状态监控
- **批量操作**: 支持批量启用/禁用/删除任务
- **智能搜索**: 支持按名称、标签、状态搜索任务

---

## 2. API 架构设计

### 2.1 接口清单

| 接口 | 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|------|
| 任务列表 | GET | `/api/crons` | 分页获取任务列表 | `crons:read` |
| 任务统计 | GET | `/api/crons/stats` | 获取任务统计信息 | `crons:read` |
| 创建任务 | POST | `/api/crons` | 创建新任务 | `crons:create` |
| 更新任务 | PUT | `/api/crons/:id` | 更新任务配置 | `crons:update` |
| 删除任务 | DELETE | `/api/crons/:id` | 删除单个任务 | `crons:delete` |
| 批量删除 | POST | `/api/crons/batch-delete` | 批量删除任务 | `crons:delete` |
| 批量启用 | POST | `/api/crons/batch-enable` | 批量启用任务 | `crons:update` |
| 批量禁用 | POST | `/api/crons/batch-disable` | 批量禁用任务 | `crons:update` |
| 手动运行 | POST | `/api/crons/:id/run` | 手动触发任务 | `crons:run` |
| 任务状态 | GET | `/api/crons/:id/status` | 获取任务实时状态 | `crons:read` |
| 运行历史 | GET | `/api/crons/:id/runs` | 获取任务运行历史 | `crons:read` |

### 2.2 请求/响应规范

#### 2.2.1 任务列表接口

**请求**:
```http
GET /api/crons?q=backup&enabled=true&sortBy=created_at&sortOrder=desc&page=1&limit=20
```

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| q | string | 否 | 搜索关键词（标题/命令） |
| enabled | string | 否 | 启用状态 (true/false/all) |
| sortBy | string | 否 | 排序字段 (title/enabled/created_at/updated_at) |
| sortOrder | string | 否 | 排序方向 (asc/desc) |
| page | integer | 否 | 页码 (默认 1) |
| limit | integer | 否 | 每页数量 (默认 20，最大 100) |

**响应**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "1",
        "title": "每日备份",
        "scheduleType": "cron",
        "expression": "0 2 * * *",
        "command": "node scripts/backup.js",
        "description": "每天凌晨 2 点执行完整备份",
        "enabled": true,
        "created_at": "2026-04-10T10:00:00Z",
        "updated_at": "2026-04-11T15:30:00Z"
      }
    ],
    "total": 15,
    "page": 1,
    "limit": 20
  }
}
```

#### 2.2.2 创建任务接口

**请求**:
```http
POST /api/crons
Content-Type: application/json

{
  "title": "每小时清理缓存",
  "scheduleType": "every",
  "expression": "60",
  "command": "node scripts/cleanup-cache.js",
  "description": "每 60 秒清理一次临时缓存",
  "enabled": true
}
```

**请求体字段**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 任务标题 |
| scheduleType | string | 是 | 调度类型 (cron/every/at) |
| expression | string | 是 | Cron 表达式或间隔秒数 |
| command | string | 是 | 执行的命令 |
| description | string | 否 | 任务描述 |
| enabled | boolean | 否 | 是否启用 (默认 true) |

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "2",
    "title": "每小时清理缓存",
    "scheduleType": "every",
    "expression": "60",
    "command": "node scripts/cleanup-cache.js",
    "description": "每 60 秒清理一次临时缓存",
    "enabled": true
  }
}
```

#### 2.2.3 批量操作接口

**批量删除**:
```http
POST /api/crons/batch-delete
Content-Type: application/json

{
  "jobIds": ["1", "2", "3"]
}

Response:
{
  "success": true,
  "deletedCount": 3,
  "failedCount": 0
}
```

**批量启用**:
```http
POST /api/crons/batch-enable
Content-Type: application/json

{
  "jobIds": ["4", "5"]
}

Response:
{
  "success": true,
  "enabledCount": 2,
  "failedCount": 0
}
```

---

## 3. 数据库设计

### 3.1 表结构

#### crons 表
```sql
CREATE TABLE IF NOT EXISTS crons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    schedule_type TEXT NOT NULL CHECK (schedule_type IN ('cron', 'every', 'at')),
    expression TEXT NOT NULL,
    command TEXT NOT NULL,
    description TEXT,
    enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_crons_enabled ON crons(enabled);
CREATE INDEX IF NOT EXISTS idx_crons_schedule_type ON crons(schedule_type);
CREATE INDEX IF NOT EXISTS idx_crons_created_at ON crons(created_at);
```

#### cron_runs 表（运行历史）
```sql
CREATE TABLE IF NOT EXISTS cron_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cron_id INTEGER NOT NULL,
    command TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed')),
    started_at DATETIME NOT NULL,
    finished_at DATETIME,
    output TEXT,
    error TEXT,
    exit_code INTEGER,
    FOREIGN KEY (cron_id) REFERENCES crons(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_cron_runs_cron_id ON cron_runs(cron_id);
CREATE INDEX IF NOT EXISTS idx_cron_runs_status ON cron_runs(status);
CREATE INDEX IF NOT EXISTS idx_cron_runs_started_at ON cron_runs(started_at);
```

### 3.2 数据字典

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| title | TEXT | 任务标题 |
| schedule_type | TEXT | 调度类型：cron(标准 cron)/every(固定间隔)/at(一次性) |
| expression | TEXT | Cron 表达式或间隔秒数 |
| command | TEXT | 执行的系统命令 |
| description | TEXT | 任务描述 |
| enabled | INTEGER | 是否启用：1=启用，0=禁用 |
| status | TEXT | 运行状态：running/success/failed |
| output | TEXT | 标准输出内容 |
| error | TEXT | 错误信息 |
| exit_code | INTEGER | 命令退出码 |

---

## 4. 技术选型

### 4.1 后端技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| 框架 | Express 5.x | 轻量级 REST API 框架 |
| 数据库 | SQLite (better-sqlite3) | 零配置嵌入式数据库 |
| 调度 | node-cron | Cron 表达式解析和执行 |
| 验证 | express-validator | 请求参数验证 |
| 日志 | Winston | 结构化日志记录 |

### 4.2 前端技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| 框架 | Vue 3 + TypeScript | 现代化前端框架 |
| UI 组件 | Naive UI | 组件库 |
| Cron 编辑器 | vue3-cron-editor | Cron 表达式可视化编辑器 |
| 状态管理 | Pinia | 轻量级状态管理 |
| HTTP 客户端 | Axios | HTTP 请求库 |

### 4.3 关键依赖

```json
{
  "dependencies": {
    "node-cron": "^3.0.0",
    "better-sqlite3": "^12.0.0",
    "express-validator": "^7.0.0",
    "winston": "^3.0.0"
  },
  "devDependencies": {
    "vue3-cron-editor": "^1.0.0"
  }
}
```

---

## 5. 架构设计原则

### 5.1 分层架构
```
前端组件 → API 路由 → 控制器 → 服务层 → 数据访问层
```

### 5.2 安全性
- **权限控制**: 所有操作需经过 JWT 认证和 RBAC 权限检查
- **输入验证**: 使用 express-validator 验证所有输入参数
- **SQL 注入防护**: 使用参数化查询
- **命令注入防护**: 命令白名单校验

### 5.3 可观测性
- **审计日志**: 记录所有任务创建/更新/删除操作
- **运行日志**: 记录每次任务执行的输出和错误
- **监控指标**: 任务成功率、平均执行时间等

### 5.4 可扩展性
- **插件机制**: 预留自定义调度器接口
- **命令执行器**: 支持多种命令执行方式（本地/远程/Docker）
- **通知渠道**: 支持多种告警通知方式

---

## 6. 批量操作架构

### 6.1 设计目标
- **高效**: 支持一次操作最多 100 条记录
- **可靠**: 部分失败不影响整体结果
- **可追溯**: 记录批量操作详情

### 6.2 实现方案

```javascript
// 批量操作通用模式
async function batchOperation(ids, operationFn) {
  const results = {
    success: true,
    successCount: 0,
    failedCount: 0,
    failedIds: []
  };

  for (const id of ids) {
    try {
      await operationFn(id);
      results.successCount++;
    } catch (error) {
      results.failedCount++;
      results.failedIds.push(id);
      results.success = false;
    }
  }

  return results;
}
```

### 6.3 批量操作类型

| 操作类型 | 接口 | 权限 | 说明 |
|---------|------|------|------|
| 批量删除 | POST /batch-delete | crons:delete | 物理删除任务 |
| 批量启用 | POST /batch-enable | crons:update | 设置 enabled=1 |
| 批量禁用 | POST /batch-disable | crons:update | 设置 enabled=0 |

---

## 7. 智能搜索架构

### 7.1 搜索功能
- **全文搜索**: 支持按标题、描述、命令搜索
- **筛选**: 按启用状态、调度类型筛选
- **排序**: 按创建时间、更新时间、标题排序
- **分页**: 支持分页浏览

### 7.2 搜索优化

#### 7.2.1 数据库索引
```sql
-- 复合索引优化常用查询
CREATE INDEX IF NOT EXISTS idx_crons_search 
ON crons(enabled, schedule_type, created_at DESC);

-- 全文搜索索引（可选）
CREATE VIRTUAL TABLE IF NOT EXISTS crons_fts USING fts5(
  title, description, command,
  content='crons', content_rowid='id'
);
```

#### 7.2.2 查询优化
```javascript
// 防抖处理（前端）
const search = debounce(async (query) => {
  const result = await fetch(`/api/crons?q=${query}`);
  return result.data;
}, 300);
```

---

## 8. 部署架构

### 8.1 开发环境
```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=development
```

### 8.2 生产环境
```yaml
# 使用 GitHub Actions 自动部署
# Docker 镜像 + Nginx 反向代理
```

---

## 9. 风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|---------|
| 命令注入攻击 | 高 | 命令白名单校验，禁用危险字符 |
| 任务执行超时 | 中 | 设置超时时间，异步执行 |
| 数据库锁竞争 | 中 | 使用 WAL 模式，优化索引 |
| 大量任务并发 | 中 | 任务队列限流，最大并发数控制 |

---

## 10. 附录

### 10.1 Cron 表达式参考

| 字段 | 允许值 | 特殊字符 |
|------|--------|---------|
| 秒 | 0-59 | , - * / |
| 分钟 | 0-59 | , - * / |
| 小时 | 0-23 | , - * / |
| 日期 | 1-31 | , - * ? / L W |
| 月份 | 1-12 | , - * / |
| 星期 | 0-6 (0=周日) | , - * ? / L # |

### 10.2 相关文档
- [Cron 编辑器需求文档](./requirements/004-cron-visual-editor.md)
- [后端开发报告](../BACKEND_DEVELOPMENT_REPORT.md)
- [API 参考文档](../backend/src/routes/cron.routes.js)

---

**文档状态**: 已完成  
**下一步**: 等待前端开发联调

**最后更新**: 2026-04-12 01:57  
**更新人**: 系统架构师  
**文档版本**: v1.0
