-- Migration: Cron Jobs
-- Version: 004
-- Created: 2026-04-11
-- Author: DBA Agent

-- Cron jobs table
CREATE TABLE IF NOT EXISTS cron_jobs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    cron_expression TEXT NOT NULL,
    command TEXT NOT NULL,
    args TEXT DEFAULT '[]',
    status TEXT DEFAULT 'disabled',
    last_run_at INTEGER,
    next_run_at INTEGER,
    run_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    last_output TEXT,
    last_error TEXT,
    created_by TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cron_jobs_status ON cron_jobs(status);
CREATE INDEX IF NOT EXISTS idx_cron_jobs_next_run ON cron_jobs(next_run_at);
CREATE INDEX IF NOT EXISTS idx_cron_jobs_created_by ON cron_jobs(created_by);

-- Seed: Default cron jobs
INSERT OR IGNORE INTO cron_jobs (id, name, description, cron_expression, command, args, status) VALUES
    ('job_cleanup_notifications', '清理已读通知', '清理 30 天前的已读通知', 
     '0 0 * * *', 'node scripts/cleanup-notifications.js', '[]', 'enabled'),
    ('job_backup_daily', '每日备份', '每天凌晨 2 点执行完整备份', 
     '0 2 * * *', 'node scripts/backup.js --type=full', '[]', 'enabled'),
    ('job_audit_cleanup', '审计日志清理', '清理 90 天前的审计日志', 
     '0 3 * * *', 'node scripts/cleanup-audit-logs.js', '[]', 'enabled');