-- ============================================================
-- Migration: Cron Editor Database Optimization
-- Version: 009
-- Target: SQLite
-- Author: DBA Agent
-- Created: 2026-04-12
-- Description: 索引优化、分区策略、备份恢复支持
-- ============================================================

-- ============================================================
-- SECTION 1: CRON_TEMPLATES 索引优化
-- ============================================================

-- 新增单列索引
CREATE INDEX IF NOT EXISTS idx_cron_templates_name ON cron_templates(name);
CREATE INDEX IF NOT EXISTS idx_cron_templates_category ON cron_templates(category);
CREATE INDEX IF NOT EXISTS idx_cron_templates_is_builtin ON cron_templates(is_builtin);
CREATE INDEX IF NOT EXISTS idx_cron_templates_schedule_type ON cron_templates(schedule_type);

-- 新增复合索引（常用查询组合）
CREATE INDEX IF NOT EXISTS idx_cron_templates_builtin_category 
    ON cron_templates(is_builtin, category);

-- 添加唯一约束（通过触发器实现，SQLite 不支持 ALTER TABLE ADD UNIQUE）
-- 注意：如果已有重复数据，需要先清理
CREATE TRIGGER IF NOT EXISTS trigger_cron_templates_name_unique
BEFORE INSERT ON cron_templates
BEGIN
    SELECT RAISE(ABORT, 'Duplicate template name')
    WHERE EXISTS (SELECT 1 FROM cron_templates WHERE name = NEW.name);
END;

-- ============================================================
-- SECTION 2: TASK_CONFIGS 索引优化
-- ============================================================

-- 新增单列索引
CREATE INDEX IF NOT EXISTS idx_task_configs_title ON task_configs(title);
CREATE INDEX IF NOT EXISTS idx_task_configs_created_by ON task_configs(created_by);
CREATE INDEX IF NOT EXISTS idx_task_configs_schedule_type ON task_configs(schedule_type);

-- 优化现有索引（如果不存在则创建）
CREATE INDEX IF NOT EXISTS idx_task_configs_enabled ON task_configs(enabled);
CREATE INDEX IF NOT EXISTS idx_task_configs_next_run ON task_configs(next_run_at);

-- 新增复合索引（常用查询组合）
CREATE INDEX IF NOT EXISTS idx_task_configs_enabled_next_run 
    ON task_configs(enabled, next_run_at);
CREATE INDEX IF NOT EXISTS idx_task_configs_enabled_by_user 
    ON task_configs(enabled, created_by);

-- 添加唯一约束（通过触发器实现）
CREATE TRIGGER IF NOT EXISTS trigger_task_configs_title_unique
BEFORE INSERT ON task_configs
BEGIN
    SELECT RAISE(ABORT, 'Duplicate task title')
    WHERE EXISTS (SELECT 1 FROM task_configs WHERE title = NEW.title);
END;

-- ============================================================
-- SECTION 3: EXECUTION_HISTORY 索引优化
-- ============================================================

-- 优化现有索引（如果不存在则创建）
CREATE INDEX IF NOT EXISTS idx_execution_history_task_id ON execution_history(task_id);
CREATE INDEX IF NOT EXISTS idx_execution_history_status ON execution_history(status);
CREATE INDEX IF NOT EXISTS idx_execution_history_started_at ON execution_history(started_at);

-- 新增复合索引
CREATE INDEX IF NOT EXISTS idx_execution_history_task_status 
    ON execution_history(task_id, status);
CREATE INDEX IF NOT EXISTS idx_execution_history_task_time 
    ON execution_history(task_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_execution_history_status_time 
    ON execution_history(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_execution_history_time_range 
    ON execution_history(started_at DESC, status);

-- 覆盖索引（避免回表，用于高频查询）
CREATE INDEX IF NOT EXISTS idx_execution_history_task_status_time 
    ON execution_history(task_id, status, started_at DESC, duration_ms);

-- 限制 stdout/stderr 长度（通过触发器）
CREATE TRIGGER IF NOT EXISTS trigger_execution_history_truncate_output
BEFORE INSERT ON execution_history
BEGIN
    SELECT RAISE(ABORT, 'Output too large')
    WHEN length(NEW.stdout) > 100000 OR length(NEW.stderr) > 100000;
END;

-- ============================================================
-- SECTION 4: 分区支持 - 滚动清理触发器
-- ============================================================

-- 启用自动清理 90 天前的执行历史
CREATE TRIGGER IF NOT EXISTS trigger_cleanup_old_execution_history
AFTER INSERT ON execution_history
BEGIN
    DELETE FROM execution_history 
    WHERE started_at < (CAST(strftime('%s', 'now') AS INTEGER) * 1000) - (90 * 24 * 60 * 60 * 1000);
END;

-- ============================================================
-- SECTION 5: 归档表支持
-- ============================================================

-- 创建归档表（用于存储 30-90 天的历史数据）
CREATE TABLE IF NOT EXISTS execution_history_archive (
    id            INTEGER PRIMARY KEY,
    task_id       INTEGER NOT NULL,
    expression    TEXT,
    command       TEXT    NOT NULL,
    status        TEXT    NOT NULL,
    stdout        TEXT,
    stderr        TEXT,
    exit_code     INTEGER,
    started_at    INTEGER NOT NULL,
    finished_at   INTEGER,
    duration_ms   INTEGER,
    error_message TEXT,
    created_at    INTEGER,
    archived_at   INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000)
);

-- 归档表索引
CREATE INDEX IF NOT EXISTS idx_archive_task_id ON execution_history_archive(task_id);
CREATE INDEX IF NOT EXISTS idx_archive_started_at ON execution_history_archive(started_at);
CREATE INDEX IF NOT EXISTS idx_archive_archived_at ON execution_history_archive(archived_at);

-- ============================================================
-- SECTION 6: 统一视图（可选，用于跨分区查询）
-- ============================================================

-- 创建统一视图（如果使用了分区表）
CREATE VIEW IF NOT EXISTS execution_history_all AS
    SELECT *, 'current' as partition_source FROM execution_history
    UNION ALL
    SELECT *, 'archive' as partition_source FROM execution_history_archive;

-- ============================================================
-- SECTION 7: 性能分析查询
-- ============================================================

-- 创建统计视图
CREATE VIEW IF NOT EXISTS v_execution_stats AS
SELECT 
    task_id,
    COUNT(*) as total_runs,
    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
    SUM(CASE WHEN status = 'timeout' THEN 1 ELSE 0 END) as timeout_count,
    AVG(duration_ms) as avg_duration_ms,
    MAX(duration_ms) as max_duration_ms,
    MIN(duration_ms) as min_duration_ms,
    MAX(started_at) as last_run_at
FROM execution_history
GROUP BY task_id;

-- ============================================================
-- SECTION 8: 数据清理脚本（手动执行）
-- ============================================================

-- 清理 90 天前的数据（手动执行）
-- DELETE FROM execution_history 
-- WHERE started_at < (CAST(strftime('%s', 'now') AS INTEGER) * 1000) - (90 * 24 * 60 * 60 * 1000);

-- 归档 30-90 天的数据（手动执行）
-- INSERT INTO execution_history_archive 
-- SELECT * FROM execution_history 
-- WHERE started_at < (CAST(strftime('%s', 'now') AS INTEGER) * 1000) - (30 * 24 * 60 * 60 * 1000)
--   AND started_at >= (CAST(strftime('%s', 'now') AS INTEGER) * 1000) - (90 * 24 * 60 * 60 * 1000);

-- DELETE FROM execution_history 
-- WHERE started_at < (CAST(strftime('%s', 'now') AS INTEGER) * 1000) - (30 * 24 * 60 * 60 * 1000)
--   AND started_at >= (CAST(strftime('%s', 'now') AS INTEGER) * 1000) - (90 * 24 * 60 * 60 * 1000);

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================

-- 更新统计信息
ANALYZE;

-- 验证索引创建
SELECT 
    'cron_templates' as table_name, 
    COUNT(*) as index_count 
FROM sqlite_master 
WHERE type='index' AND tbl_name='cron_templates'
UNION ALL
SELECT 
    'task_configs' as table_name, 
    COUNT(*) as index_count 
FROM sqlite_master 
WHERE type='index' AND tbl_name='task_configs'
UNION ALL
SELECT 
    'execution_history' as table_name, 
    COUNT(*) as index_count 
FROM sqlite_master 
WHERE type='index' AND tbl_name='execution_history';
