/**
 * Cron 相关数据库表结构定义
 * 用于初始化 cron_templates, task_configs, execution_history 表
 */

const { getDb } = require('./database');

/**
 * 初始化 Cron 相关表结构
 */
async function initCronTables() {
  const db = await getDb();
  
  // cron_templates 表 - Cron 表达式模板
  db.run(`
    CREATE TABLE IF NOT EXISTS cron_templates (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      description   TEXT,
      expression    TEXT    NOT NULL,
      schedule_type TEXT    NOT NULL,  -- 'cron', 'every', 'at'
      category      TEXT,
      is_builtin    INTEGER DEFAULT 1,
      created_at    INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000),
      updated_at    INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000)
    )
  `);

  // task_configs 表 - 任务配置
  db.run(`
    CREATE TABLE IF NOT EXISTS task_configs (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      title         TEXT    NOT NULL,
      description   TEXT,
      template_id   INTEGER,
      expression    TEXT    NOT NULL,
      command       TEXT    NOT NULL,
      schedule_type TEXT    NOT NULL,
      enabled       INTEGER DEFAULT 1,
      timeout       INTEGER DEFAULT 300,
      retry_count   INTEGER DEFAULT 3,
      notify_on_fail INTEGER DEFAULT 1,
      last_run_at   INTEGER,
      next_run_at   INTEGER,
      created_by    TEXT,
      created_at    INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000),
      updated_at    INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000),
      FOREIGN KEY (template_id) REFERENCES cron_templates(id) ON DELETE SET NULL
    )
  `);

  // execution_history 表 - 执行历史
  db.run(`
    CREATE TABLE IF NOT EXISTS execution_history (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id       INTEGER NOT NULL,
      expression    TEXT,
      command       TEXT    NOT NULL,
      status        TEXT    NOT NULL,  -- 'running', 'success', 'failed', 'timeout'
      stdout        TEXT,
      stderr        TEXT,
      exit_code     INTEGER,
      started_at    INTEGER NOT NULL,
      finished_at   INTEGER,
      duration_ms   INTEGER,
      error_message TEXT,
      created_at    INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000),
      FOREIGN KEY (task_id) REFERENCES task_configs(id) ON DELETE CASCADE
    )
  `);

  // 创建索引
  db.run('CREATE INDEX IF NOT EXISTS idx_task_configs_enabled ON task_configs(enabled)');
  db.run('CREATE INDEX IF NOT EXISTS idx_task_configs_next_run ON task_configs(next_run_at)');
  db.run('CREATE INDEX IF NOT EXISTS idx_execution_history_task_id ON execution_history(task_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_execution_history_status ON execution_history(status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_execution_history_started_at ON execution_history(started_at)');

  // 插入内置 Cron 模板
  const builtinTemplates = [
    { name: '每分钟', description: '每分钟执行一次', expression: '* * * * *', schedule_type: 'cron', category: '高频' },
    { name: '每小时', description: '每小时执行一次', expression: '0 * * * *', schedule_type: 'cron', category: '中频' },
    { name: '每天', description: '每天执行一次', expression: '0 0 * * *', schedule_type: 'cron', category: '低频' },
    { name: '每周', description: '每周执行一次', expression: '0 0 * * 0', schedule_type: 'cron', category: '低频' },
    { name: '每月', description: '每月执行一次', expression: '0 0 1 * *', schedule_type: 'cron', category: '低频' },
    { name: '每 5 分钟', description: '每 5 分钟执行一次', expression: '*/5 * * * *', schedule_type: 'cron', category: '高频' },
    { name: '每 10 分钟', description: '每 10 分钟执行一次', expression: '*/10 * * * *', schedule_type: 'cron', category: '高频' },
    { name: '每 30 分钟', description: '每 30 分钟执行一次', expression: '*/30 * * * *', schedule_type: 'cron', category: '中频' },
    { name: '工作日每天', description: '工作日每天执行一次', expression: '0 9 * * 1-5', schedule_type: 'cron', category: '中频' },
    { name: '每天凌晨 2 点', description: '每天凌晨 2 点执行', expression: '0 2 * * *', schedule_type: 'cron', category: '低频' }
  ];

  // 检查是否已有数据
  const existing = db.exec('SELECT COUNT(*) as count FROM cron_templates');
  if (existing[0] && existing[0].values && existing[0].values[0][0] === 0) {
    const stmt = db.prepare('INSERT INTO cron_templates (name, description, expression, schedule_type, category) VALUES (?, ?, ?, ?, ?)');
    for (const template of builtinTemplates) {
      stmt.run([template.name, template.description, template.expression, template.schedule_type, template.category]);
    }
    stmt.free();
  }

  console.log('Cron tables initialized successfully');
}

module.exports = {
  initCronTables
};
