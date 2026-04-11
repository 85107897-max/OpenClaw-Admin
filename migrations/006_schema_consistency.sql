-- ============================================================
-- OpenClaw-Admin: Migration 006 - Schema Consistency Fixes
-- Version: 006
-- Target: SQLite (sql.js / better-sqlite3)
-- Author: DBA Agent
-- Created: 2026-04-11
-- Purpose: Fix schema inconsistencies, add missing columns, enable FK
-- ============================================================

-- ============================================================
-- SECTION 1: ENABLE FOREIGN KEY CONSTRAINTS
-- ============================================================
PRAGMA foreign_keys = ON;

-- ============================================================
-- SECTION 2: ADD MISSING COLUMNS TO USERS TABLE
-- ============================================================

-- Add phone column (if not exists)
-- Note: SQLite doesn't support 'IF NOT EXISTS' for ALTER TABLE
-- Check with: PRAGMA table_info(users);
ALTER TABLE users ADD COLUMN phone TEXT;

-- Add last_login_ip column
ALTER TABLE users ADD COLUMN last_login_ip TEXT;

-- Add password_updated_at column
ALTER TABLE users ADD COLUMN password_updated_at INTEGER;

-- Add login_failed_count column
ALTER TABLE users ADD COLUMN login_failed_count INTEGER DEFAULT 0;

-- Add locked_until column (for account lockout)
ALTER TABLE users ADD COLUMN locked_until INTEGER;

-- ============================================================
-- SECTION 3: FIX ROLES.PERMISSIONS INCONSISTENCY
-- ============================================================

-- Check if roles table has permissions column (JSON format)
-- If exists, migrate data to role_permissions table

-- Step 1: Create temporary migration table
CREATE TABLE IF NOT EXISTS role_permissions_temp (
    role_id         TEXT    NOT NULL,
    permission_id   TEXT    NOT NULL,
    granted_by      TEXT,
    granted_at      INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id)       REFERENCES roles(id)       ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- Step 2: Migrate data from JSON to junction table (if permissions column exists)
-- This is a placeholder - actual migration depends on current data format
-- INSERT INTO role_permissions_temp (role_id, permission_id)
-- SELECT id, value FROM roles, json_each(permissions);

-- Step 3: Drop old permissions column (if exists)
-- ALTER TABLE roles DROP COLUMN permissions;

-- Step 4: Rename temp table to final name
-- DROP TABLE role_permissions;
-- ALTER TABLE role_permissions_temp RENAME TO role_permissions;

-- ============================================================
-- SECTION 4: ADD MISSING INDEXES
-- ============================================================

-- Users table
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at);
CREATE INDEX IF NOT EXISTS idx_users_display_name ON users(display_name);
CREATE INDEX IF NOT EXISTS idx_users_status_username ON users(status, username);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Sessions table
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON sessions(user_id, is_valid);

-- Roles table
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);

-- Permissions table
CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions(resource, action);

-- User-Roles junction
CREATE INDEX IF NOT EXISTS idx_user_roles_granted_by ON user_roles(granted_by);

-- Audit logs
CREATE INDEX IF NOT EXISTS idx_audit_created_at_desc ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user_action ON audit_logs(user_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_resource_status ON audit_logs(resource, status);
CREATE INDEX IF NOT EXISTS idx_audit_ip ON audit_logs(ip_address);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);

-- Agents
CREATE INDEX IF NOT EXISTS idx_agents_name ON agents(name);
CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(type);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_created_by ON agents(created_by);
CREATE INDEX IF NOT EXISTS idx_agents_created_desc ON agents(created_at DESC);

-- Agent templates
CREATE INDEX IF NOT EXISTS idx_templates_name ON agent_templates(name);
CREATE INDEX IF NOT EXISTS idx_templates_category ON agent_templates(category);

-- Companies
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_owner_id ON companies(owner_id);
CREATE INDEX IF NOT EXISTS idx_companies_created_desc ON companies(created_at DESC);

-- Company members
CREATE INDEX IF NOT EXISTS idx_members_user_id ON company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_role ON company_members(role);

-- ============================================================
-- SECTION 5: ADD SYSTEM_SETTINGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS system_settings (
    id            TEXT    PRIMARY KEY,
    category      TEXT    NOT NULL,
    key           TEXT    NOT NULL,
    value         TEXT,
    value_type    TEXT    DEFAULT 'string',
    description   TEXT,
    is_sensitive  INTEGER DEFAULT 0,
    updated_by    TEXT,
    updated_at    INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    UNIQUE(category, key)
);

CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);

-- ============================================================
-- SECTION 6: ADD BACKUP_RECORDS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS backup_records (
    id            TEXT    PRIMARY KEY,
    backup_type   TEXT    NOT NULL,
    status        TEXT    NOT NULL,
    file_path     TEXT,
    file_size     INTEGER,
    start_time    INTEGER,
    end_time      INTEGER,
    error_message TEXT,
    metadata      TEXT    DEFAULT '{}',
    created_at    INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_backup_status ON backup_records(status);
CREATE INDEX IF NOT EXISTS idx_backup_created ON backup_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_type ON backup_records(backup_type);

-- ============================================================
-- SECTION 7: SEED SYSTEM SETTINGS
-- ============================================================

INSERT OR IGNORE INTO system_settings (id, category, key, value, value_type, description) VALUES
    ('setting_security_password_min_length', 'security', 'password.min_length', '12', 'number', 'Minimum password length'),
    ('setting_security_password_require_special', 'security', 'password.require_special', 'true', 'boolean', 'Require special characters in password'),
    ('setting_security_session_timeout', 'security', 'session.timeout', '604800', 'number', 'Session timeout in seconds'),
    ('setting_security_max_login_attempts', 'security', 'security.max_login_attempts', '5', 'number', 'Maximum login attempts before lockout'),
    ('setting_security_lockout_duration', 'security', 'security.lockout_duration', '900', 'number', 'Lockout duration in seconds'),
    ('setting_system_backup_retention_days', 'system', 'backup.retention_days', '90', 'number', 'Backup retention days'),
    ('setting_system_audit_log_retention_days', 'system', 'audit_log.retention_days', '90', 'number', 'Audit log retention days');

-- ============================================================
-- SECTION 8: DATABASE MAINTENANCE
-- ============================================================

-- Run ANALYZE to update query planner statistics
ANALYZE;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
-- 
-- Post-migration steps:
-- 1. Verify all indexes created successfully
-- 2. Test foreign key constraints: PRAGMA foreign_key_check;
-- 3. Run VACUUM to reclaim space (optional)
-- 4. Update application code to use new columns
--
-- Rollback (if needed):
-- DROP TABLE IF EXISTS system_settings;
-- DROP TABLE IF EXISTS backup_records;
-- DROP TABLE IF EXISTS role_permissions_temp;
-- -- Note: Cannot rollback ALTER TABLE ADD COLUMN in SQLite
--
-- ============================================================
