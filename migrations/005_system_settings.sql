-- Migration: Backup Enhancement and System Settings
-- Version: 005
-- Created: 2026-04-11
-- Author: DBA Agent

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    updated_by TEXT,
    updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Seed: Backup settings
INSERT OR IGNORE INTO system_settings (id, key, value, description) VALUES
    ('setting_backup_retention', 'backup.retention_days', '{"days": 30}', '备份保留天数'),
    ('setting_backup_path', 'backup.path', '"/data/backups"', '备份存储路径'),
    ('setting_backup_compression', 'backup.compression', '{"enabled": true, "level": 6}', '压缩配置'),
    ('setting_audit_retention', 'audit.retention_days', '{"days": 90}', '审计日志保留天数'),
    ('setting_notification_retention', 'notification.retention_days', '{"days": 30}', '通知保留天数');

-- Create backup directory if not exists (handled by application)
-- Note: This is a reminder for the application to create the backup directory