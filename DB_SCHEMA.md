# OpenClaw-Admin 数据库设计文档

> 文档版本：v1.0  
> 作者：数据库工程师  
> 日期：2026-04-12  
> 基于架构设计：ARCHITECTURE_DESIGN.md

---

## 一、设计概述

本文档基于架构师输出的 `ARCHITECTURE_DESIGN.md` 进行扩展，补充以下 P1/P2 级别的数据库表设计：

1. **会话持久化表** - 用于存储 OpenClaw 会话状态
2. **日志存储表** - 支持脱敏的审计日志
3. **双因素认证表** - TOTP 及相关安全配置
4. **WAF 规则表** - Web 应用防火墙规则存储
5. **CI/CD 扫描结果表** - 安全扫描结果存储

---

## 二、会话持久化表 (sessions)

### 2.1 表结构

```sql
CREATE TABLE IF NOT EXISTS sessions (
    id              TEXT    PRIMARY KEY,
    session_key     TEXT    NOT NULL UNIQUE,
    agent_id        TEXT    NOT NULL,
    agent_name      TEXT    NOT NULL,
    parent_id       TEXT,
    status          TEXT    DEFAULT 'active',
    context         TEXT    DEFAULT '{}',
    state           TEXT    DEFAULT '{}',
    input_tokens    INTEGER DEFAULT 0,
    output_tokens   INTEGER DEFAULT 0,
    started_at      INTEGER NOT NULL,
    updated_at      INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    completed_at    INTEGER,
    error_message   TEXT,
    created_by      TEXT,
    FOREIGN KEY (parent_id) REFERENCES sessions(id) ON DELETE SET NULL
);

CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_agent_id ON sessions(agent_id);
CREATE INDEX idx_sessions_started_at ON sessions(started_at DESC);
```

### 2.2 字段说明

| 字段 | 类型 | 说明 |
|-----|------|-----|
| id | TEXT | 主键，UUID |
| session_key | TEXT | 业务会话密钥 |
| agent_id | TEXT | 关联的 OpenClaw Agent ID |
| parent_id | TEXT | 父会话 ID，支持树状结构 |
| status | TEXT | active/paused/completed/failed |
| context | TEXT | JSON 上下文数据 |
| state | TEXT | JSON 运行时状态快照 |
| input_tokens | INTEGER | 输入 token 计数 |
| output_tokens | INTEGER | 输出 token 计数 |
| started_at | INTEGER | 开始时间（毫秒） |
| completed_at | INTEGER | 完成时间（毫秒） |
| error_message | TEXT | 错误信息 |

---

## 三、日志存储表（支持脱敏）

### 3.1 脱敏规则配置表

```sql
CREATE TABLE IF NOT EXISTS data_mask_rules (
    id              TEXT    PRIMARY KEY,
    rule_name       TEXT    NOT NULL UNIQUE,
    field_pattern   TEXT    NOT NULL,
    mask_type       TEXT    NOT NULL,
    mask_value      TEXT,
    keep_length     INTEGER,
    enabled         INTEGER DEFAULT 1,
    created_at      INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    updated_at      INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

INSERT INTO data_mask_rules (rule_name, field_pattern, mask_type, mask_value) VALUES
    ('api_key_mask', 'api[_-]?key', 'replace', '****'),
    ('token_mask', 'token', 'replace', '****'),
    ('password_mask', 'password', 'redact', NULL),
    ('email_partial', 'email', 'truncate', 5),
    ('phone_mask', 'phone', 'replace', '****');
```

### 3.2 增强审计日志表

```sql
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS sensitive_data TEXT DEFAULT '{}';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS mask_level TEXT DEFAULT 'none';
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS masked_details TEXT;
```

---

## 四、双因素认证表 (2FA)

### 4.1 TOTP 配置表

```sql
CREATE TABLE IF NOT EXISTS two_factor_auth (
    id              TEXT    PRIMARY KEY,
    user_id         TEXT    NOT NULL UNIQUE,
    enabled         INTEGER DEFAULT 0,
    secret_key      TEXT    NOT NULL,
    backup_codes    TEXT    DEFAULT '[]',
    method          TEXT    DEFAULT 'totp',
    phone_masked    TEXT,
    email_masked    TEXT,
    last_used_at    INTEGER,
    created_at      INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    updated_at      INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 4.2 2FA 会话验证表

```sql
CREATE TABLE IF NOT EXISTS two_factor_sessions (
    id              TEXT    PRIMARY KEY,
    user_id         TEXT    NOT NULL,
    session_token   TEXT    NOT NULL UNIQUE,
    verified        INTEGER DEFAULT 0,
    expires_at      INTEGER NOT NULL,
    ip_address      TEXT,
    created_at      INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_2fa_session_token ON two_factor_sessions(session_token);
CREATE INDEX idx_2fa_session_expires ON two_factor_sessions(expires_at);
```

### 4.3 登录尝试记录表

```sql
CREATE TABLE IF NOT EXISTS login_attempts (
    id              TEXT    PRIMARY KEY,
    user_id         TEXT,
    username        TEXT    NOT NULL,
    ip_address      TEXT    NOT NULL,
    attempt_type    TEXT    NOT NULL,
    success         INTEGER NOT NULL,
    failed_count    INTEGER DEFAULT 0,
    locked_until    INTEGER,
    created_at      INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

CREATE INDEX idx_login_attempts_user ON login_attempts(username);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address);
```

---

## 五、WAF 规则存储表

### 5.1 WAF 规则表

```sql
CREATE TABLE IF NOT EXISTS waf_rules (
    id              TEXT    PRIMARY KEY,
    rule_name       TEXT    NOT NULL UNIQUE,
    rule_type       TEXT    NOT NULL,
    pattern         TEXT    NOT NULL,
    field           TEXT    DEFAULT 'all',
    action          TEXT    NOT NULL,
    severity        TEXT    DEFAULT 'medium',
    description     TEXT,
    enabled         INTEGER DEFAULT 1,
    hit_count       INTEGER DEFAULT 0,
    last_hit_at     INTEGER,
    created_by      TEXT,
    created_at      INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    updated_at      INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

CREATE INDEX idx_waf_rules_enabled ON waf_rules(enabled);
CREATE INDEX idx_waf_rules_type ON waf_rules(rule_type);
```

### 5.2 WAF 白名单表

```sql
CREATE TABLE IF NOT EXISTS waf_whitelist (
    id              TEXT    PRIMARY KEY,
    name            TEXT    NOT NULL,
    type            TEXT    NOT NULL,
    value           TEXT    NOT NULL,
    description     TEXT,
    expires_at      INTEGER,
    enabled         INTEGER DEFAULT 1,
    created_at      INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);
```

### 5.3 WAF 拦截日志表

```sql
CREATE TABLE IF NOT EXISTS waf_logs (
    id              TEXT    PRIMARY KEY,
    rule_id         TEXT,
    rule_name       TEXT,
    ip_address      TEXT    NOT NULL,
    method          TEXT    NOT NULL,
    url             TEXT    NOT NULL,
    user_agent      TEXT,
    request_body    TEXT,
    action_taken    TEXT    NOT NULL,
    response_code   INTEGER,
    blocked         INTEGER NOT NULL,
    created_at      INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

CREATE INDEX idx_waf_logs_ip ON waf_logs(ip_address);
CREATE INDEX idx_waf_logs_created ON waf_logs(created_at DESC);
```

---

## 六、CI/CD 扫描结果表

### 6.1 扫描任务表

```sql
CREATE TABLE IF NOT EXISTS cdc_scan_tasks (
    id              TEXT    PRIMARY KEY,
    task_name       TEXT    NOT NULL,
    scan_type       TEXT    NOT NULL,
    target          TEXT    NOT NULL,
    branch          TEXT,
    commit_hash     TEXT,
    status          TEXT    DEFAULT 'pending',
    triggered_by    TEXT,
    started_at      INTEGER,
    completed_at    INTEGER,
    duration_ms     INTEGER,
    error_message   TEXT,
    created_at      INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

CREATE INDEX idx_cdc_scan_status ON cdc_scan_tasks(status);
CREATE INDEX idx_cdc_scan_type ON cdc_scan_tasks(scan_type);
```

### 6.2 扫描结果表

```sql
CREATE TABLE IF NOT EXISTS cdc_scan_results (
    id              TEXT    PRIMARY KEY,
    task_id         TEXT    NOT NULL,
    severity        TEXT    NOT NULL,
    category        TEXT,
    title           TEXT    NOT NULL,
    description     TEXT,
    file_path       TEXT,
    line_number     INTEGER,
    cwe_id          TEXT,
    cve_id          TEXT,
    cvss_score      REAL,
    remediation     TEXT,
    confidence      TEXT,
    false_positive  INTEGER DEFAULT 0,
    created_at      INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    FOREIGN KEY (task_id) REFERENCES cdc_scan_tasks(id) ON DELETE CASCADE
);

CREATE INDEX idx_results_task ON cdc_scan_results(task_id);
CREATE INDEX idx_results_severity ON cdc_scan_results(severity);
```

### 6.3 扫描配置表

```sql
CREATE TABLE IF NOT EXISTS cdc_scan_configs (
    id              TEXT    PRIMARY KEY,
    config_name     TEXT    NOT NULL UNIQUE,
    scan_type       TEXT    NOT NULL,
    config          TEXT    NOT NULL,
    schedule        TEXT,
    enabled         INTEGER DEFAULT 1,
    notify_on       TEXT    DEFAULT '[]',
    created_by      TEXT,
    created_at      INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    updated_at      INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);
```

---

## 七、迁移脚本

```bash
# 按顺序执行迁移
for file in /www/wwwroot/ai-work/migrations/00*.sql; do
    echo "Executing $file..."
    sqlite3 /www/wwwroot/ai-work/wizard.db < "$file"
done
```

---

*文档版本：v1.0 | 状态：已完成*
*最后更新：2026-04-12*
