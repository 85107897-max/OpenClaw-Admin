/**
 * 任务配置管理服务
 * 负责 task_configs 表的 CRUD 操作和调度执行
 */

const { query } = require('../utils/database');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/task-config.log' }),
    new winston.transports.Console()
  ]
});

/**
 * 获取所有任务配置
 * @param {Object} filters - 筛选条件
 * @returns {Promise<Array>} 任务配置列表
 */
async function getAllTasks(filters = {}) {
  const { q, enabled, sortBy = 'created_at', sortOrder = 'desc', page = 1, limit = 20 } = filters;
  
  let sql = 'SELECT * FROM task_configs WHERE 1=1';
  const params = [];

  if (q) {
    sql += ' AND (title LIKE ? OR command LIKE ? OR description LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  if (enabled !== undefined && enabled !== 'all') {
    sql += ' AND enabled = ?';
    params.push(enabled === 'true' ? 1 : 0);
  }

  // 排序
  const allowedSortFields = ['title', 'enabled', 'created_at', 'updated_at', 'next_run_at'];
  if (!allowedSortFields.includes(sortBy)) {
    sortBy = 'created_at';
  }
  sql += ` ORDER BY ${sortBy} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}`;

  // 分页
  const offset = (page - 1) * limit;
  sql += ` LIMIT ${limit} OFFSET ${offset}`;

  const tasks = await query(sql, params);

  // 获取总数
  let countSql = 'SELECT COUNT(*) as total FROM task_configs WHERE 1=1';
  if (q) {
    countSql += ' AND (title LIKE ? OR command LIKE ? OR description LIKE ?)';
    params.splice(0, 0, `%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (enabled !== undefined && enabled !== 'all') {
    countSql += ' AND enabled = ?';
    params.push(enabled === 'true' ? 1 : 0);
  }
  const [{ total }] = await query(countSql, params.slice(-3));

  logger.info(`获取任务配置列表，共 ${tasks.length} 条，总计 ${total}`);
  
  return {
    items: tasks,
    total: parseInt(total),
    page: parseInt(page),
    limit: parseInt(limit)
  };
}

/**
 * 获取单个任务配置
 * @param {number} id - 任务 ID
 * @returns {Promise<Object|null>} 任务详情
 */
async function getTaskById(id) {
  const [task] = await query(`
    SELECT tc.*, ct.name as template_name 
    FROM task_configs tc 
    LEFT JOIN cron_templates ct ON tc.template_id = ct.id 
    WHERE tc.id = ?
  `, [id]);
  
  if (!task) {
    logger.warn(`任务配置不存在：${id}`);
    return null;
  }
  
  logger.info(`获取任务配置：${id}`);
  return task;
}

/**
 * 创建任务配置
 * @param {Object} taskData - 任务数据
 * @returns {Promise<Object>} 创建的任务
 */
async function createTask(taskData) {
  const { title, description, templateId, expression, command, scheduleType, 
          enabled = true, timeout = 300, retryCount = 3, notifyOnFail = true, createdBy } = taskData;
  
  // 计算下次运行时间
  const nextRunAt = calculateNextRunTime(expression, scheduleType);
  
  const sql = `
    INSERT INTO task_configs 
    (title, description, template_id, expression, command, schedule_type, 
     enabled, timeout, retry_count, notify_on_fail, next_run_at, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const now = Date.now();
  const result = await query(sql, [
    title, description, templateId, expression, command, scheduleType,
    enabled ? 1 : 0, timeout, retryCount, notifyOnFail ? 1 : 0,
    nextRunAt, createdBy, now, now
  ]);
  
  const newTask = await getTaskById(result.insertId);
  logger.info(`创建任务配置：${title} (ID: ${result.insertId})`);
  
  return newTask;
}

/**
 * 更新任务配置
 * @param {number} id - 任务 ID
 * @param {Object} taskData - 更新数据
 * @returns {Promise<Object|null>} 更新后的任务
 */
async function updateTask(id, taskData) {
  const existing = await getTaskById(id);
  if (!existing) {
    return null;
  }

  const { title, description, templateId, expression, command, scheduleType, 
          enabled, timeout, retryCount, notifyOnFail } = taskData;
  
  const fields = [];
  const params = [];

  if (title !== undefined) {
    fields.push('title = ?');
    params.push(title);
  }
  if (description !== undefined) {
    fields.push('description = ?');
    params.push(description);
  }
  if (templateId !== undefined) {
    fields.push('template_id = ?');
    params.push(templateId);
  }
  if (expression !== undefined) {
    fields.push('expression = ?');
    params.push(expression);
  }
  if (command !== undefined) {
    fields.push('command = ?');
    params.push(command);
  }
  if (scheduleType !== undefined) {
    fields.push('schedule_type = ?');
    params.push(scheduleType);
  }
  if (enabled !== undefined) {
    fields.push('enabled = ?');
    params.push(enabled ? 1 : 0);
  }
  if (timeout !== undefined) {
    fields.push('timeout = ?');
    params.push(timeout);
  }
  if (retryCount !== undefined) {
    fields.push('retry_count = ?');
    params.push(retryCount);
  }
  if (notifyOnFail !== undefined) {
    fields.push('notify_on_fail = ?');
    params.push(notifyOnFail ? 1 : 0);
  }

  // 如果表达式或调度类型改变，重新计算下次运行时间
  if (expression !== undefined || scheduleType !== undefined) {
    const newExpression = expression !== undefined ? expression : existing.expression;
    const newScheduleType = scheduleType !== undefined ? scheduleType : existing.schedule_type;
    fields.push('next_run_at = ?');
    params.push(calculateNextRunTime(newExpression, newScheduleType));
  }

  fields.push('updated_at = ?');
  params.push(Date.now());
  params.push(id);

  const sql = `UPDATE task_configs SET ${fields.join(', ')} WHERE id = ?`;
  await query(sql, params);
  
  const updated = await getTaskById(id);
  logger.info(`更新任务配置：${id}`);
  
  return updated;
}

/**
 * 删除任务配置
 * @param {number} id - 任务 ID
 * @returns {Promise<boolean>} 是否删除成功
 */
async function deleteTask(id) {
  const existing = await getTaskById(id);
  if (!existing) {
    return false;
  }

  await query('DELETE FROM task_configs WHERE id = ?', [id]);
  logger.info(`删除任务配置：${id}`);
  
  return true;
}

/**
 * 批量删除任务配置
 * @param {Array} ids - 任务 ID 列表
 * @returns {Promise<Object>} 删除结果
 */
async function batchDelete(ids) {
  const placeholders = ids.map(() => '?').join(',');
  const sql = `DELETE FROM task_configs WHERE id IN (${placeholders})`;
  const result = await query(sql, ids);
  
  logger.info(`批量删除任务配置：删除了 ${result.affectedRows} 个任务`);
  
  return {
    deletedCount: result.affectedRows,
    failedCount: 0
  };
}

/**
 * 批量启用任务
 * @param {Array} ids - 任务 ID 列表
 * @returns {Promise<Object>} 启用结果
 */
async function batchEnable(ids) {
  const placeholders = ids.map(() => '?').join(',');
  const sql = `UPDATE task_configs SET enabled = 1, updated_at = ? WHERE id IN (${placeholders})`;
  const result = await query(sql, [Date.now(), ...ids]);
  
  logger.info(`批量启用任务：启用了 ${result.affectedRows} 个任务`);
  
  return {
    enabledCount: result.affectedRows,
    failedCount: 0
  };
}

/**
 * 批量禁用任务
 * @param {Array} ids - 任务 ID 列表
 * @returns {Promise<Object>} 禁用结果
 */
async function batchDisable(ids) {
  const placeholders = ids.map(() => '?').join(',');
  const sql = `UPDATE task_configs SET enabled = 0, updated_at = ? WHERE id IN (${placeholders})`;
  const result = await query(sql, [Date.now(), ...ids]);
  
  logger.info(`批量禁用任务：禁用了 ${result.affectedRows} 个任务`);
  
  return {
    disabledCount: result.affectedRows,
    failedCount: 0
  };
}

/**
 * 手动运行任务
 * @param {number} id - 任务 ID
 * @returns {Promise<Object>} 运行结果
 */
async function runTask(id) {
  const task = await getTaskById(id);
  if (!task) {
    throw new Error('任务不存在');
  }

  // 记录运行开始
  const runId = await query(
    'INSERT INTO execution_history (task_id, expression, command, status, started_at) VALUES (?, ?, ?, "running", ?)',
    [id, task.expression, task.command, Date.now()]
  );

  logger.info(`手动运行任务：${id} (运行 ID: ${runId.insertId})`);
  
  return {
    runId: runId.insertId,
    message: '任务已添加到执行队列'
  };
}

/**
 * 计算下次运行时间（简化版）
 * @param {string} expression - Cron 表达式
 * @param {string} scheduleType - 调度类型
 * @returns {number} 下次运行时间戳
 */
function calculateNextRunTime(expression, scheduleType) {
  const now = Date.now();
  
  // 简化计算：根据常见模式估算
  if (scheduleType === 'every') {
    // 每 X 分钟/小时/天
    const match = expression.match(/^(\d+)/);
    if (match) {
      const interval = parseInt(match[1]) * 60 * 1000; // 假设是分钟
      return now + interval;
    }
  }
  
  // 默认：1 小时后
  return now + 60 * 60 * 1000;
}

/**
 * 获取任务统计信息
 * @returns {Promise<Object>} 统计信息
 */
async function getTaskStats() {
  const [total, enabled, disabled] = await Promise.all([
    query('SELECT COUNT(*) as total FROM task_configs'),
    query('SELECT COUNT(*) as total FROM task_configs WHERE enabled = 1'),
    query('SELECT COUNT(*) as total FROM task_configs WHERE enabled = 0')
  ]);

  const byScheduleType = await query(`
    SELECT schedule_type, COUNT(*) as count 
    FROM task_configs 
    GROUP BY schedule_type
  `);

  const byStatus = await query(`
    SELECT 
      (SELECT COUNT(*) FROM task_configs WHERE enabled = 1) as active,
      (SELECT COUNT(*) FROM task_configs WHERE enabled = 0) as inactive
  `);

  return {
    total: parseInt(total[0].total),
    enabled: parseInt(enabled[0].total),
    disabled: parseInt(disabled[0].total),
    byScheduleType: byScheduleType.reduce((acc, row) => {
      acc[row.schedule_type] = parseInt(row.count);
      return acc;
    }, {}),
    byStatus: byStatus[0]
  };
}

module.exports = {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  batchDelete,
  batchEnable,
  batchDisable,
  runTask,
  getTaskStats
};
