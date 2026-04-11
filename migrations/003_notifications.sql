-- Migration: Notifications and Alert System
-- Version: 003
-- Created: 2026-04-11
-- Author: DBA Agent

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    level TEXT DEFAULT 'info',
    is_read INTEGER DEFAULT 0,
    read_at INTEGER,
    metadata TEXT DEFAULT '{}',
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Alert rules table
CREATE TABLE IF NOT EXISTS alert_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    trigger_condition TEXT NOT NULL,
    channels TEXT NOT NULL,
    recipients TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    cooldown_minutes INTEGER DEFAULT 5,
    created_by TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Seed: Default alert rules
INSERT OR IGNORE INTO alert_rules (id, name, description, trigger_condition, channels, recipients, enabled) VALUES
    ('rule_gateway_disconnect', 'Gateway 断开告警', '当 Gateway 断开连接时发送告警', 
     '{"event": "gateway.disconnect", "threshold": 1}', 
     '["feishu", "in-app"]', '["admin"]', 1),
    ('rule_task_failure', '任务失败告警', '当任务执行失败时发送告警', 
     '{"event": "task.failed", "threshold": 1}', 
     '["feishu", "email", "in-app"]', '["admin", "operator"]', 1),
    ('rule_token_threshold', 'Token 用量告警', '当 Token 用量达到阈值时发送告警', 
     '{"event": "token.threshold", "thresholds": [80, 90, 100]}', 
     '["feishu", "in-app"]', '["admin"]', 1);
