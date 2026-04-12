-- ============================================
-- 数据库工程师 - 数据库设计完成迁移脚本
-- 版本：v1.0
-- 日期：2026-04-12
-- 描述：会话持久化、2FA、WAF、CI/CD 扫描表
-- ============================================

-- 1. 会话持久化表 (sessions)
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

CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_agent_id ON sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at DESC);

-- 2. 脱敏规则配置表
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

-- 插入默认脱敏规则
INSERT OR IGNORE INTO data_mask_rules (rule_name, field_pattern, mask_type, mask_value) VALUES
    ('api_key_mask', 'api[_-]?key', 'replace', '****'),
    ('token_mask', 'token', 'replace', '****'),
    ('password_mask', 'password', 'redact', NULL),
    ('email_partial', 'email', 'truncate', 5),
    ('phone_mask', 'phone', 'replace', '****');

-- 3. 双因素认证表 (2FA)
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

-- 4. 2FA 会话验证表
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

CREATE INDEX IF NOT EXISTS idx_2fa_session_token ON two_factor_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_2fa_session_expires ON two_factor_sessions(expires_at);

-- 5. 登录尝试记录表
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

CREATE INDEX IF NOT EXISTS idx_login_attempts_user ON login_attempts(username);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);

-- 6. WAF 规则表
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

CREATE INDEX IF NOT EXISTS idx_waf_rules_enabled ON waf_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_waf_rules_type ON waf_rules(rule_type);

-- 7. WAF 白名单表
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

-- 8. WAF 拦截日志表
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

CREATE INDEX IF NOT EXISTS idx_waf_logs_ip ON waf_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_waf_logs_created ON waf_logs(created_at DESC);

-- 9. CI/CD 扫描任务表
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

CREATE INDEX IF NOT EXISTS idx_cdc_scan_status ON cdc_scan_tasks(status);
CREATE INDEX IF NOT EXISTS idx_cdc_scan_type ON cdc_scan_tasks(scan_type);

-- 10. CI/CD 扫描结果表
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

CREATE INDEX IF NOT EXISTS idx_results_task ON cdc_scan_results(task_id);
CREATE INDEX IF NOT EXISTS idx_results_severity ON cdc_scan_results(severity);

-- 11. CI/CD 扫描配置表
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

-- 12. 审计日志表（如不存在则创建基础结构）
-- 注意：如果项目已有 audit_logs 表，此创建将被跳过
CREATE TABLE IF NOT EXISTS audit_logs (
    id              TEXT    PRIMARY KEY,
    user_id         TEXT,
    action          TEXT    NOT NULL,
    resource_type   TEXT,
    resource_id     TEXT,
    old_value       TEXT,
    new_value       TEXT,
    ip_address      TEXT,
    user_agent      TEXT,
    session_id      TEXT,
    sensitive_data  TEXT    DEFAULT '{}',
    mask_level      TEXT    DEFAULT 'none',
    masked_details  TEXT,
    created_at      INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- ============================================
-- 迁移完成
-- 总计创建：11 张新表 + 3 个索引组 + 默认数据
-- ============================================
