# 系统架构设计文档

**项目**: OpenClaw-Admin Cron 可视化编辑器  
**版本**: v2.0  
**作者**: 系统架构师  
**创建时间**: 2026-04-12  
**最后更新**: 2026-04-12

---

## 1. 概述

### 1.1 项目背景

本项目是一个企业级任务调度管理平台，提供 Cron 可视化编辑、任务管理、批量操作、智能搜索、配置备份等核心功能。

### 1.2 设计目标

- **高可用性**: 系统 7×24 小时稳定运行
- **可扩展性**: 支持水平扩展和模块热插拔
- **安全性**: 完善的权限控制和审计日志
- **易用性**: 直观的用户界面和友好的操作体验
- **可维护性**: 清晰的代码结构和完善的文档

---

## 2. 系统架构总览

### 2.1 技术栈

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| **前端** | Vue 3 + Vite + TypeScript | 现代化前端框架 |
| **UI 组件** | Element Plus | 企业级 UI 组件库 |
| **状态管理** | Pinia | 轻量级状态管理 |
| **后端** | Node.js + Express | 轻量级 Web 框架 |
| **数据库** | MySQL 8.0 | 关系型数据库 |
| **缓存** | Redis | 缓存和会话管理 |
| **任务队列** | Bull | 异步任务处理 |
| **监控** | Prometheus + Grafana | 性能监控 |
| **部署** | Docker + Docker Compose | 容器化部署 |

### 2.2 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        用户层                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Web 浏览器 │  │ 移动端   │  │ API 客户端│  │ 第三方集成│   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                       接入层                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Nginx (反向代理/负载均衡)                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                       应用层                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Node.js + Express 应用集群                │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐       │   │
│  │  │ 认证授权   │ │ 业务逻辑   │ │ API 网关    │       │   │
│  │  └────────────┘ └────────────┘ └────────────┘       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                       数据层                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   MySQL      │  │    Redis     │  │   文件存储   │      │
│  │  (主从复制)  │  │   (缓存)     │  │   (本地/OSS) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 核心模块设计

### 3.1 批量操作模块

#### 3.1.1 功能概述

提供对任务配置、执行历史等资源的批量操作能力，包括批量删除、批量启用/禁用、批量导出、批量分配等。

#### 3.1.2 技术选型

- **前端**: Vue 3 Composition API + Pinia
- **后端**: Express + 数据库事务
- **异步处理**: Bull + Redis (针对大批量操作)

#### 3.1.3 模块架构

```
批量操作模块
├── 前端组件层
│   ├── BatchOperationBar.vue      # 批量操作工具栏
│   ├── BatchConfirmDialog.vue     # 确认弹窗
│   ├── BatchProgressDialog.vue    # 进度弹窗
│   └── BatchOperationResult.vue   # 结果展示
├── 状态管理层
│   └── useBatchSelection.ts       # 选择状态管理
├── 服务层
│   ├── batchService.ts            # 批量操作服务
│   └── batchApi.ts                # API 调用封装
└── 后端 API 层
    ├── batch.routes.js            # 路由定义
    ├── batch.controller.js        # 业务逻辑
    └── batch.middleware.js        # 权限/限流中间件
```

#### 3.1.4 接口设计

```javascript
// 批量删除
DELETE /api/batch/:resource
Body: { ids: string[], options?: { force?: boolean } }

// 批量更新状态
PATCH /api/batch/:resource/status
Body: { ids: string[], status: string, options?: { notify?: boolean } }

// 批量导出
POST /api/batch/:resource/export
Body: { ids: string[], format?: 'csv' | 'xlsx' | 'json' }

// 批量分配
PATCH /api/batch/:resource/assign
Body: { ids: string[], assigneeId: string }

// 批量操作进度查询 (异步)
GET /api/batch/operations/:operationId
```

#### 3.1.5 安全策略

1. **权限验证**: 每个操作前验证用户权限
2. **操作上限**: 单次操作默认上限 100 条
3. **二次确认**: 危险操作需要用户确认
4. **操作日志**: 记录所有批量操作到审计日志
5. **事务保证**: 关键操作使用数据库事务

---

### 3.2 智能搜索与筛选模块

#### 3.2.1 功能概述

提供全局搜索、高级筛选、搜索历史等功能，支持跨资源类型搜索和多条件组合筛选。

#### 3.2.2 技术选型

- **前端**: Vue 3 + Element Plus Search 组件
- **后端**: MySQL 全文索引 + 自定义搜索算法
- **扩展方案**: Elasticsearch (未来升级)

#### 3.2.3 模块架构

```
智能搜索模块
├── 前端搜索组件
│   ├── GlobalSearchBar.vue        # 全局搜索栏
│   ├── AdvancedFilterPanel.vue    # 高级筛选面板
│   ├── SearchResults.vue          # 搜索结果列表
│   └── SearchHistory.vue          # 搜索历史
├── 搜索服务层
│   ├── searchService.ts           # 搜索逻辑
│   ├── searchEngine.ts            # 搜索引擎抽象
│   └── searchHighlight.ts         # 结果高亮
└── 后端 API 层
    ├── search.routes.js           # 路由定义
    ├── search.controller.js       # 搜索逻辑
    └── search.indexer.js          # 索引管理
```

#### 3.2.4 接口设计

```javascript
// 全局搜索
POST /api/search/global
Body: {
  query: string,
  types?: string[],      // 资源类型过滤
  page?: number,
  pageSize?: number
}

// 高级搜索
POST /api/search/advanced
Body: {
  conditions: [
    { field: string, operator: string, value: any }
  ],
  conjunction?: 'and' | 'or',
  sortBy?: string,
  sortOrder?: 'asc' | 'desc',
  page?: number,
  pageSize?: number
}

// 搜索历史
GET  /api/search/history
POST /api/search/history
Body: { name: string, conditions: object }
DELETE /api/search/history/:id

// 搜索建议
GET /api/search/suggestions
Query: { q: string, type: string }
```

#### 3.2.5 搜索策略

1. **全文检索**: 使用 MySQL FULLTEXT 索引
2. **模糊匹配**: LIKE + 通配符
3. **精确匹配**: 字段精确查询
4. **范围查询**: 日期、数值范围
5. **组合查询**: AND/OR 逻辑组合

---

### 3.3 配置备份与恢复模块

#### 3.3.1 功能概述

提供系统配置的备份、恢复、版本管理功能，支持定时备份和手动备份。

#### 3.3.2 技术选型

- **存储**: 本地文件系统 + 可选云存储 (OSS/S3)
- **压缩**: gzip 压缩
- **加密**: AES-256 加密敏感配置
- **调度**: Bull + Redis 定时任务

#### 3.3.3 模块架构

```
配置备份模块
├── 前端管理界面
│   ├── BackupManager.vue          # 备份管理页面
│   ├── BackupSchedule.vue         # 定时备份配置
│   ├── BackupList.vue             # 备份列表
│   └── RestoreDialog.vue          # 恢复确认弹窗
├── 备份服务层
│   ├── backupService.ts           # 备份逻辑
│   ├── backupScheduler.ts         # 定时调度
│   ├── backupEncryptor.ts         # 加密解密
│   └── backupStorage.ts           # 存储抽象
└── 后端 API 层
    ├── backup.routes.js           # 路由定义
    ├── backup.controller.js       # 备份逻辑
    └── backup.worker.js           # 后台任务
```

#### 3.3.4 接口设计

```javascript
// 创建备份
POST /api/backups
Body: {
  name?: string,
  type?: 'full' | 'partial',
  include?: string[],    // 配置类型
  encrypt?: boolean,
  storage?: 'local' | 'oss'
}

// 获取备份列表
GET /api/backups
Query: { page?, pageSize?, status?, type? }

// 获取备份详情
GET /api/backups/:id

// 恢复备份
POST /api/backups/:id/restore
Body: { confirm: boolean, dryRun?: boolean }

// 删除备份
DELETE /api/backups/:id

// 配置定时备份
POST /api/backups/schedule
Body: {
  enabled: boolean,
  cron: string,          // Cron 表达式
  type: 'full' | 'partial',
  retentionDays: number,
  storage: string
}

// 获取定时备份配置
GET /api/backups/schedule

// 手动触发定时备份
POST /api/backups/schedule/trigger
```

#### 3.3.5 备份策略

1. **全量备份**: 备份所有配置数据
2. **增量备份**: 仅备份变更部分
3. **定时备份**: 支持自定义 Cron 表达式
4. **保留策略**: 自动清理过期备份
5. **版本管理**: 保留最近 N 个版本

---

## 4. 数据库设计

### 4.1 核心表结构

#### 4.1.1 批量操作日志表

```sql
CREATE TABLE batch_operation_logs (
  id VARCHAR(36) PRIMARY KEY,
  operation_type VARCHAR(50) NOT NULL,  -- delete|enable|disable|export|assign
  resource_type VARCHAR(50) NOT NULL,   -- task_config|execution_history 等
  record_count INT NOT NULL,
  success_count INT DEFAULT 0,
  fail_count INT DEFAULT 0,
  status VARCHAR(20) NOT NULL,          -- pending|processing|completed|failed
  initiated_by VARCHAR(36) NOT NULL,    -- 用户 ID
  initiated_at DATETIME NOT NULL,
  completed_at DATETIME,
  error_message TEXT,
  result_summary JSON,                  -- 详细结果
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_initiated_by (initiated_by),
  INDEX idx_created_at (created_at)
);
```

#### 4.1.2 搜索历史表

```sql
CREATE TABLE search_history (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  search_name VARCHAR(100),
  search_type VARCHAR(50) NOT NULL,     -- global|advanced
  query_text TEXT,
  conditions JSON,
  result_count INT,
  executed_at DATETIME NOT NULL,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_executed_at (executed_at)
);
```

#### 4.1.3 备份记录表

```sql
CREATE TABLE backup_records (
  id VARCHAR(36) PRIMARY KEY,
  backup_name VARCHAR(200) NOT NULL,
  backup_type VARCHAR(20) NOT NULL,     -- full|partial|scheduled
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT,
  file_hash VARCHAR(64),
  encryption_enabled BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) NOT NULL,          -- pending|processing|completed|failed
  included_types JSON,                  -- 备份的配置类型
  record_count JSON,                    -- 各类型记录数
  created_by VARCHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  restored_at DATETIME,
  restored_by VARCHAR(36),
  error_message TEXT,
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_backup_type (backup_type)
);
```

#### 4.1.4 定时备份配置表

```sql
CREATE TABLE backup_schedules (
  id VARCHAR(36) PRIMARY KEY,
  schedule_name VARCHAR(200) NOT NULL,
  cron_expression VARCHAR(100) NOT NULL,
  backup_type VARCHAR(20) NOT NULL,
  storage_type VARCHAR(20) NOT NULL,    -- local|oss
  storage_config JSON,                  -- 存储配置
  retention_days INT DEFAULT 30,
  included_types JSON,
  encryption_enabled BOOLEAN DEFAULT FALSE,
  enabled BOOLEAN DEFAULT TRUE,
  last_run_at DATETIME,
  next_run_at DATETIME,
  last_run_status VARCHAR(20),
  created_by VARCHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_enabled (enabled),
  INDEX idx_next_run_at (next_run_at)
);
```

---

## 5. 安全设计

### 5.1 认证与授权

- **认证方式**: JWT Token
- **授权模型**: RBAC (角色基于权限)
- **会话管理**: Redis 存储会话
- **密码策略**: bcrypt 加密，最小长度 8 位

### 5.2 数据安全

- **传输加密**: HTTPS/TLS
- **存储加密**: AES-256 (敏感配置)
- **数据脱敏**: 日志中脱敏敏感信息
- **备份加密**: 可选加密备份文件

### 5.3 审计日志

- **操作审计**: 记录所有关键操作
- **登录审计**: 记录登录/登出事件
- **异常审计**: 记录异常和错误
- **审计保留**: 审计日志保留 90 天

---

## 6. 性能设计

### 6.1 缓存策略

| 缓存类型 | 缓存内容 | 过期时间 | 说明 |
|----------|----------|----------|------|
| **会话缓存** | 用户会话 | 24 小时 | Redis |
| **配置缓存** | 系统配置 | 5 分钟 | Redis |
| **权限缓存** | 用户权限 | 10 分钟 | Redis |
| **搜索缓存** | 搜索结果 | 1 分钟 | Redis |

### 6.2 数据库优化

- **索引优化**: 为查询字段建立索引
- **查询优化**: 避免 N+1 查询
- **分页查询**: 大数据量分页返回
- **连接池**: 数据库连接池管理

### 6.3 异步处理

- **批量操作**: 超过 50 条使用异步
- **文件导出**: 异步生成下载链接
- **备份任务**: 异步执行备份
- **通知发送**: 异步发送通知

---

## 7. 部署架构

### 7.1 开发环境

```
docker-compose.yml (单容器)
├── app (Node.js)
├── mysql (数据库)
└── redis (缓存)
```

### 7.2 生产环境

```
┌─────────────────────────────────────────┐
│              Nginx 负载均衡               │
├─────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │  App 1  │  │  App 2  │  │  App 3  │ │
│  └─────────┘  └─────────┘  └─────────┘ │
├─────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐              │
│  │  MySQL  │  │  Redis  │              │
│  │ (主从)  │  │ (集群)  │              │
│  └─────────┘  └─────────┘              │
└─────────────────────────────────────────┘
```

### 7.3 监控告警

- **应用监控**: Prometheus + Grafana
- **日志收集**: ELK Stack
- **告警通知**: 飞书 webhook
- **健康检查**: 定期健康检查

---

## 8. 实施路线图

### Phase 1: 批量操作模块 (2 周)
- [x] 后端 API 开发
- [ ] 前端组件开发
- [ ] 集成测试
- [ ] 文档编写

### Phase 2: 智能搜索模块 (2 周)
- [ ] 搜索服务开发
- [ ] 前端搜索组件
- [ ] 索引优化
- [ ] 性能测试

### Phase 3: 配置备份模块 (2 周)
- [ ] 备份服务开发
- [ ] 定时任务实现
- [ ] 前端管理界面
- [ ] 恢复功能测试

---

## 9. 风险与应对

| 风险项 | 等级 | 影响 | 应对措施 |
|--------|------|------|----------|
| 批量操作性能 | 中 | 大批量超时 | 异步处理 + 进度查询 |
| 搜索性能 | 中 | 大数据量慢 | Elasticsearch 升级 |
| 备份存储 | 低 | 本地存储不足 | 支持云存储扩展 |
| 安全漏洞 | 高 | 数据泄露 | 定期安全审计 |

---

## 10. 附录

### 10.1 相关文档

- [批量操作架构设计](./BATCH_OPERATION_ARCHITECTURE.md)
- [后端 API 完成报告](../BACKEND_CRON_API_COMPLETION.md)
- [数据库设计报告](../DBA_DATABASE_DESIGN_REPORT.md)
- [架构评审报告](../ARCHITECTURE_REVIEW_REPORT.md)

### 10.2 版本历史

| 版本 | 日期 | 作者 | 变更说明 |
|------|------|------|----------|
| v1.0 | 2026-04-12 | 系统架构师 | 初始版本 |
| v2.0 | 2026-04-12 | 系统架构师 | 补充智能搜索和配置备份模块 |

---

**文档状态**: ✅ 已完成  
**审核状态**: ✅ 已通过  
**最后更新**: 2026-04-12 08:19
