-- ============================================================
-- OpenClaw-Admin: Migration 007 - Performance Optimization
-- Version: 007
-- Target: SQLite
-- Author: DBA Agent
-- Created: 2026-04-11
-- Purpose: Enable performance tuning PRAGMA settings and indexes
-- ============================================================

-- ============================================================
-- SECTION 1: ENABLE PERFORMANCE PRAGMA SETTINGS
-- ============================================================

-- Enable Write-Ahead Logging (WAL) for better concurrency
-- WAL allows readers and writers to operate simultaneously
PRAGMA journal_mode = WAL;

-- Set synchronous mode to NORMAL (balance between safety and performance)
-- FULL is safer but slower; OFF is fastest but risky
PRAGMA synchronous = NORMAL;

-- Set cache size to 64MB (negative value = KB, so -64000 = 64MB)
-- This increases the amount of data cached in memory
PRAGMA cache_size = -64000;

-- Enable memory-mapped I/O for faster reads (256MB)
PRAGMA mmap_size = 268435456;

-- Store temporary tables in memory instead of disk
PRAGMA temp_store = MEMORY;

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Set busy timeout (5 seconds) to handle locked database
-- This should be set in application code, not SQL
-- PRAGMA busy_timeout = 5000;

-- ============================================================
-- SECTION 2: CREATE COVERING INDEXES
-- ============================================================

-- Covering index for user authentication (includes all needed columns)
CREATE INDEX IF NOT EXISTS idx_users_auth ON users(username, password_hash, status, role);

-- Covering index for session validation
CREATE INDEX IF NOT EXISTS idx_sessions_validate ON sessions(token_hash, is_valid, expires_at, user_id);

-- Covering index for audit log queries (most common pattern)
CREATE INDEX IF NOT EXISTS idx_audit_query ON audit_logs(created_at DESC, user_id, action, resource);

-- Covering index for unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read, created_at DESC, type, title);

-- Covering index for agent queries
CREATE INDEX IF NOT EXISTS idx_agents_query ON agents(status, type, created_by, created_at DESC);

-- ============================================================
-- SECTION 3: FULL-TEXT SEARCH INDEXES (FTS5)
-- ============================================================

-- Create FTS5 virtual tables for full-text search
-- Note: FTS5 is available in SQLite 3.9.0+

-- FTS index for audit logs
CREATE VIRTUAL TABLE IF NOT EXISTS audit_logs_fts USING fts5(
    action,
    resource,
    details,
    content='audit_logs',
    content_rowid='rowid'
);

-- FTS index for notifications
CREATE VIRTUAL TABLE IF NOT EXISTS notifications_fts USING fts5(
    title,
    message,
    content='notifications',
    content_rowid='rowid'
);

-- FTS index for agents
CREATE VIRTUAL TABLE IF NOT EXISTS agents_fts USING fts5(
    name,
    description,
    content='agents',
    content_rowid='rowid'
);

-- Trigger to keep FTS indexes in sync
-- Audit logs FTS trigger
CREATE TRIGGER IF NOT EXISTS audit_logs_ai AFTER INSERT ON audit_logs BEGIN
    INSERT INTO audit_logs_fts (rowid, action, resource, details)
    VALUES (new.rowid, new.action, new.resource, new.details);
END;

CREATE TRIGGER IF NOT EXISTS audit_logs_ad AFTER DELETE ON audit_logs BEGIN
    INSERT INTO audit_logs_fts (audit_logs_fts, rowid, action, resource, details)
    VALUES ('delete', old.rowid, old.action, old.resource, old.details);
END;

CREATE TRIGGER IF NOT EXISTS audit_logs_au AFTER UPDATE ON audit_logs BEGIN
    INSERT INTO audit_logs_fts (audit_logs_fts, rowid, action, resource, details)
    VALUES ('delete', old.rowid, old.action, old.resource, old.details);
    INSERT INTO audit_logs_fts (rowid, action, resource, details)
    VALUES (new.rowid, new.action, new.resource, new.details);
END;

-- ============================================================
-- SECTION 4: QUERY OPTIMIZATION VIEWS
-- ============================================================

-- Create materialized-like view for dashboard statistics
-- Note: SQLite doesn't support materialized views, so this is a regular view
CREATE VIEW IF NOT EXISTS dashboard_stats AS
SELECT
    (SELECT COUNT(*) FROM users WHERE status = 'active') AS active_users,
    (SELECT COUNT(*) FROM sessions WHERE is_valid = 1 AND expires_at > strftime('%s', 'now') * 1000) AS active_sessions,
    (SELECT COUNT(*) FROM agents WHERE status = 1) AS active_agents,
    (SELECT COUNT(*) FROM audit_logs WHERE created_at > strftime('%s', 'now') * 1000 - 86400) AS today_actions,
    (SELECT COUNT(*) FROM notifications WHERE read = 0) AS unread_notifications;

-- View for recent audit logs (last 24 hours)
CREATE VIEW IF NOT EXISTS recent_audit_logs AS
SELECT
    id,
    user_id,
    username,
    action,
    resource,
    resource_id,
    status,
    created_at,
    datetime(created_at / 1000, 'unixepoch') AS formatted_time
FROM audit_logs
WHERE created_at > strftime('%s', 'now') * 1000 - 86400
ORDER BY created_at DESC;

-- View for session statistics
CREATE VIEW IF NOT EXISTS session_stats AS
SELECT
    COUNT(*) AS total_sessions,
    COUNT(CASE WHEN is_valid = 1 AND expires_at > strftime('%s', 'now') * 1000 THEN 1 END) AS valid_sessions,
    COUNT(CASE WHEN is_valid = 0 THEN 1 END) AS invalid_sessions,
    COUNT(CASE WHEN expires_at <= strftime('%s', 'now') * 1000 THEN 1 END) AS expired_sessions
FROM sessions;

-- ============================================================
-- SECTION 5: PERFORMANCE MONITORING QUERIES
-- ============================================================

-- Table to store performance metrics (for application-level monitoring)
CREATE TABLE IF NOT EXISTS db_performance_stats (
    id            TEXT    PRIMARY KEY,
    metric_name   TEXT    NOT NULL,
    metric_value  REAL    NOT NULL,
    metric_unit   TEXT,
    recorded_at   INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_db_perf_metric ON db_performance_stats(metric_name, recorded_at DESC);

-- ============================================================
-- SECTION 6: DATABASE MAINTENANCE PROCEDURES
-- ============================================================

-- Note: These are SQL comments showing maintenance commands
-- Run these periodically (e.g., weekly) via application or cron

-- Update statistics for query planner
-- ANALYZE;

-- Reclaim unused space (do during low-traffic periods)
-- VACUUM;

-- Check database integrity
-- PRAGMA integrity_check;

-- Check foreign key violations
-- PRAGMA foreign_key_check;

-- Get database info
-- PRAGMA database_list;
-- PRAGMA table_info(table_name);
-- PRAGMA index_list(table_name);

-- ============================================================
-- SECTION 7: SLOW QUERY LOGGING SETUP
-- ============================================================

-- Table to log slow queries (for application-level implementation)
CREATE TABLE IF NOT EXISTS slow_query_log (
    id            TEXT    PRIMARY KEY,
    query         TEXT    NOT NULL,
    duration_ms   REAL    NOT NULL,
    parameters    TEXT,
    timestamp     INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_slow_query_duration ON slow_query_log(duration_ms DESC);
CREATE INDEX IF NOT EXISTS idx_slow_query_time ON slow_query_log(timestamp DESC);

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
--
-- Post-migration checklist:
-- [ ] Verify WAL mode is enabled: PRAGMA journal_mode;
-- [ ] Check cache size: PRAGMA cache_size;
-- [ ] Test performance improvement with benchmark queries
-- [ ] Monitor database size (WAL files may increase temporarily)
-- [ ] Set up periodic ANALYZE job (weekly)
-- [ ] Set up periodic VACUUM job (monthly, during maintenance window)
--
-- Expected improvements:
-- - 2-5x faster concurrent reads/writes (WAL mode)
-- - 10-30% faster queries (better caching)
-- - Significantly faster full-text searches (FTS5)
--
-- ============================================================
