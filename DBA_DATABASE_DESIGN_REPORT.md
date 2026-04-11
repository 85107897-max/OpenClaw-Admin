# 数据库设计优化报告

**项目**: OpenClaw-Admin  
**报告日期**: 2026-04-11  
**作者**: DBA Agent  
**版本**: 1.0

---

## 📊 当前状态分析

### 1. 数据库技术栈

| 项目 | 当前配置 |
|------|---------|
| 数据库类型 | SQLite |
| 驱动 | sql.js (纯 JavaScript 实现) |
| 数据文件 | `/www/wwwroot/ai-work/backend/data/wizard.db` |
| 外键支持 | 未启用 (需手动开启) |

### 2. 现有表结构

从代码和迁移文件中识别的表:

#### 核心表 (已实现)
| 表名 | 用途 | 状态 |
|------|------|------|
| `users` | 用户账户 | ✅ 已实现 |
| `sessions` | 会话管理 | ✅ 已实现 |
| `roles` | 角色定义 | ✅ 已实现 |
| `permissions` | 权限定义 | ✅ 已实现 |
| `user_roles` | 用户 - 角色关联 | ✅ 已实现 |
| `role_permissions` | 角色 - 权限关联 | ⚠️ 不一致 |
| `audit_logs` | 审计日志 | ✅ 已实现 |
| `two_factor_auth` | 双因素认证 | ✅ 已实现 |
| `env_configs` | 环境变量配置 | ✅ 已实现 |

#### 功能表 (部分实现)
| 表名 | 用途 | 状态 |
|------|------|------|
| `waf_rules` | WAF 规则 | ✅ 已实现 |
| `waf_logs` | WAF 日志 | ✅ 已实现 |
| `cicd_scans` | CI/CD 扫描任务 | ✅ 已实现 |
| `cicd_scan_results` | 扫描结果 | ✅ 已实现 |
| `agents` | Agent 配置 | ⚠️ 待确认 |
| `companies` | 公司定义 | ⚠️ 待确认 |
| `company_members` | 公司成员 | ⚠️ 待确认 |
| `notifications` | 通知 | ⚠️ 待确认 |

#### 新增功能表 (迁移文件中定义)
| 表名 | 用途 | 状态 |
|------|------|------|
| `operation_logs` | 批量操作日志 | 📝 迁移文件已定义 |
| `search_indexes` | 搜索索引 | 📝 迁移文件已定义 |
| `performance_metrics` | 性能指标 | 📝 迁移文件已定义 |
| `performance_metrics_summary` | 性能指标聚合 | 📝 迁移文件已定义 |
| `user_behavior_logs` | 用户行为日志 | 📝 迁移文件已定义 |

---

## ⚠️ 发现的问题

### 问题 1: 迁移文件不一致
- **现象**: 多个迁移文件 (`001_rbac_schema.sql`, `003_complete_schema.sql`, `003_feature_tables.sql`) 定义了不同的表结构
- **影响**: 数据库状态与迁移文件不一致，难以追踪变更历史
- **建议**: 统一使用版本化迁移策略

### 问题 2: 数据库驱动选择
- **现象**: 使用 `sql.js` (WASM 实现) 而非 `better-sqlite3`
- **影响**: 
  - `sql.js` 每次操作需同步内存，性能较差
  - 不支持并发写入
  - 不适合生产环境高并发场景
- **建议**: 生产环境考虑切换到 `better-sqlite3` 或 PostgreSQL

### 问题 3: 缺少关键索引
- **现象**: 部分查询字段缺少索引
- **影响**: 大数据量下查询性能下降
- **建议**: 添加以下索引:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_audit_created_at_desc ON audit_logs(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
  CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at);
  ```

### 问题 4: 缺少软删除支持
- **现象**: `users` 表有 `deleted_at` 字段但未在代码中实施
- **影响**: 数据完整性风险
- **建议**: 统一实施软删除模式

### 问题 5: 外键约束未启用
- **现象**: SQLite 默认不启用外键约束
- **影响**: 数据一致性无法保证
- **建议**: 在连接初始化时执行 `PRAGMA foreign_keys = ON`

---

## ✅ 优化建议

### 1. 数据库架构优化

```sql
-- 启用 WAL 模式 (提高并发性能)
PRAGMA journal_mode = WAL;

-- 设置合适的缓存大小 (64MB)
PRAGMA cache_size = -64000;

-- 启用内存映射
PRAGMA mmap_size = 268435456;

-- 启用外键约束
PRAGMA foreign_keys = ON;

-- 设置同步模式 (平衡性能和安全)
PRAGMA synchronous = NORMAL;
```

### 2. 新增索引 (性能优化)

```sql
-- 审计日志查询优化
CREATE INDEX IF NOT EXISTS idx_audit_created_at_desc ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user_action ON audit_logs(user_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_resource_status ON audit_logs(resource, status);

-- 会话管理优化
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON sessions(user_id, is_valid);

-- 用户查询优化
CREATE INDEX IF NOT EXISTS idx_users_status_username ON users(status, username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 通知查询优化
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read, created_at DESC);
```

### 3. 表结构完善

#### users 表补充字段
```sql
-- 添加缺失字段
ALTER TABLE users ADD COLUMN phone TEXT;
ALTER TABLE users ADD COLUMN last_login_ip TEXT;
ALTER TABLE users ADD COLUMN password_updated_at INTEGER;
ALTER TABLE users ADD COLUMN login_failed_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until INTEGER;
```

#### 新增系统配置表
```sql
CREATE TABLE IF NOT EXISTS system_settings (
    id            TEXT    PRIMARY KEY,
    category      TEXT    NOT NULL,         -- 配置类别：security, system, feature
    key           TEXT    NOT NULL,         -- 配置键
    value         TEXT,                     -- 配置值 (JSON)
    value_type    TEXT    DEFAULT 'string', -- string, number, boolean, json
    description   TEXT,
    is_sensitive  INTEGER DEFAULT 0,        -- 是否敏感数据
    updated_by    TEXT,
    updated_at    INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    UNIQUE(category, key)
);

CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
```

### 4. 数据分区策略

对于大数据量表，建议实施分区:

```sql
-- 审计日志分区 (按月份)
CREATE TABLE audit_logs_2026_04 LIKE audit_logs;
CREATE TABLE audit_logs_2026_05 LIKE audit_logs;
-- ...

-- 或使用视图统一访问
CREATE VIEW audit_logs_all AS
  SELECT * FROM audit_logs_2026_04
  UNION ALL SELECT * FROM audit_logs_2026_05
  -- ...
```

### 5. 备份策略

```sql
-- 创建备份记录表
CREATE TABLE IF NOT EXISTS backup_records (
    id            TEXT    PRIMARY KEY,
    backup_type   TEXT    NOT NULL,         -- full, incremental
    status        TEXT    NOT NULL,         -- pending, running, success, failed
    file_path     TEXT,
    file_size     INTEGER,
    start_time    INTEGER,
    end_time      INTEGER,
    error_message TEXT,
    created_at    INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_backup_status ON backup_records(status);
CREATE INDEX IF NOT EXISTS idx_backup_created ON backup_records(created_at DESC);
```

---

## 📋 迁移计划

### 迁移 006: Schema 一致性修复

**目标**: 统一数据库结构，修复不一致问题

**步骤**:
1. 添加 users 表缺失字段
2. 迁移 roles.permissions 从 JSON 到 role_permissions 表
3. 添加外键约束
4. 添加缺失索引

**执行时间**: 预计 5 分钟

### 迁移 007: 性能优化

**目标**: 提升查询性能

**步骤**:
1. 启用 WAL 模式
2. 添加复合索引
3. 配置 SQLite PRAGMA
4. 执行 VACUUM 和 ANALYZE

**执行时间**: 预计 10 分钟

### 迁移 008: 新功能表

**目标**: 支持新功能需求

**步骤**:
1. 创建 operation_logs 表
2. 创建 search_indexes 表
3. 创建 performance_metrics 表
4. 创建 user_behavior_logs 表

**执行时间**: 预计 3 分钟

---

## 📈 性能指标建议

### 监控指标

| 指标 | 阈值 | 说明 |
|------|------|------|
| 查询响应时间 | < 100ms | 95% 查询 |
| 慢查询数量 | < 10/小时 | 执行时间 > 1s |
| 数据库大小 | < 1GB | SQLite 建议上限 |
| 连接等待 | 0 | 无连接等待 |

### 优化检查清单

- [ ] 启用 WAL 模式
- [ ] 配置合适的 cache_size
- [ ] 添加缺失索引
- [ ] 实施软删除模式
- [ ] 启用外键约束
- [ ] 配置备份策略
- [ ] 实施日志轮转
- [ ] 添加慢查询监控

---

## 🔐 安全建议

1. **敏感数据加密**: 对 `env_configs` 中的敏感字段进行加密存储
2. **审计日志保留**: 实施日志保留策略 (建议 90 天)
3. **密码策略**: 强制密码复杂度，定期更换
4. **会话安全**: 实施会话轮换，限制并发会话数
5. **SQL 注入防护**: 使用参数化查询，禁用动态 SQL

---

## 📚 文档链接

- [数据库架构文档](docs/DATABASE_SCHEMA.md) - 待创建
- [迁移指南](docs/MIGRATION_GUIDE.md) - 待创建
- [备份恢复手册](docs/BACKUP_RESTORE.md) - 待创建

---

## ✅ 总结

当前数据库设计基本满足项目需求，但存在以下改进空间:

1. **立即执行**: 启用外键约束，添加关键索引
2. **短期计划**: 统一迁移文件，修复 schema 不一致
3. **中期计划**: 实施性能优化，配置监控
4. **长期计划**: 评估数据库升级 (PostgreSQL)

**建议优先级**: 高

---

*报告生成时间：2026-04-11 15:15*  
*下次审查时间：2026-04-18*
