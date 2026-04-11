/**
 * 执行历史管理服务
 * 负责 execution_history 表的 CRUD 操作
 */

const { query } = require('../utils/database');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/execution-history.log' }),
    new winston.transports.Console()
  ]
});

/**
 * 获取任务执行历史
 * @param {number} taskId - 任务 ID
 * @param {Object} filters - 筛选条件
 * @returns {Promise<Object>} 执行历史列表和总数
 */
async function getExecutionHistory(taskId, filters = {}) {
  const { status, page = 1, limit = 20 } = filters;
  
  let sql = `
    SELECT eh.*, tc.title as task_title 
    FROM execution_history eh 
    LEFT JOIN task_configs tc ON eh.task_id = tc.id 
    WHERE eh.task_id = ?
  `;
  const params = [taskId];

  if (status) {
    sql += ' AND eh.status = ?';
    params.push(status);
  }

  sql += ' ORDER BY eh.started_at DESC';
  
  // 分页
  const offset = (page - 1) * limit;
  sql += ` LIMIT ${limit} OFFSET ${offset}`;

  const runs = await query(sql, params);

  // 获取总数
  let countSql = 'SELECT COUNT(*) as total FROM execution_history WHERE task_id = ?';
  if (status) {
    countSql += ' AND status = ?';
    params.push(status);
  }
  const [{ total }] = await query(countSql, [taskId, ...(status ? [status] : [])]);

  logger.info(`获取任务 ${taskId} 执行历史，共 ${runs.length} 条，总计 ${total}`);
  
  return {
    runs,
    total: parseInt(total),
    page: parseInt(page),
    limit: parseInt(limit)
  };
}

/**
 * 获取所有任务的执行历史（全局）
 * @param {Object} filters - 筛选条件
 * @returns {Promise<Object>} 执行历史列表和总数
 */
async function getAllExecutionHistory(filters = {}) {
  const { taskId, status, startDate, endDate, page = 1, limit = 50 } = filters;
  
  let sql = `
    SELECT eh.*, tc.title as task_title 
    FROM execution_history eh 
    LEFT JOIN task_configs tc ON eh.task_id = tc.id 
    WHERE 1=1
  `;
  const params = [];

  if (taskId) {
    sql += ' AND eh.task_id = ?';
    params.push(taskId);
  }

  if (status) {
    sql += ' AND eh.status = ?';
    params.push(status);
  }

  if (startDate) {
    sql += ' AND eh.started_at >= ?';
    params.push(startDate);
  }

  if (endDate) {
    sql += ' AND eh.started_at <= ?';
    params.push(endDate);
  }

  sql += ' ORDER BY eh.started_at DESC';
  
  // 分页
  const offset = (page - 1) * limit;
  sql += ` LIMIT ${limit} OFFSET ${offset}`;

  const runs = await query(sql, params);

  // 获取总数
  let countSql = 'SELECT COUNT(*) as total FROM execution_history WHERE 1=1';
  if (taskId) {
    countSql += ' AND task_id = ?';
    params.push(taskId);
  }
  if (status) {
    countSql += ' AND status = ?';
    params.push(status);
  }
  if (startDate) {
    countSql += ' AND started_at >= ?';
    params.push(startDate);
  }
  if (endDate) {
    countSql += ' AND started_at <= ?';
    params.push(endDate);
  }
  const [{ total }] = await query(countSql, params);

  return {
    runs,
    total: parseInt(total),
    page: parseInt(page),
    limit: parseInt(limit)
  };
}

/**
 * 获取单个执行记录
 * @param {number} runId - 运行记录 ID
 * @returns {Promise<Object|null>} 执行记录详情
 */
async function getExecutionById(runId) {
  const [run] = await query(`
    SELECT eh.*, tc.title as task_title 
    FROM execution_history eh 
    LEFT JOIN task_configs tc ON eh.task_id = tc.id 
    WHERE eh.id = ?
  `, [runId]);
  
  if (!run) {
    logger.warn(`执行记录不存在：${runId}`);
    return null;
  }
  
  return run;
}

/**
 * 更新执行记录状态
 * @param {number} runId - 运行记录 ID
 * @param {Object} updateData - 更新数据
 * @returns {Promise<Object|null>} 更新后的记录
 */
async function updateExecutionStatus(runId, updateData) {
  const existing = await getExecutionById(runId);
  if (!existing) {
    return null;
  }

  const { status, stdout, stderr, exitCode, errorMessage, durationMs } = updateData;
  const fields = [];
  const params = [];

  if (status !== undefined) {
    fields.push('status = ?');
    params.push(status);
  }
  if (stdout !== undefined) {
    fields.push('stdout = ?');
    params.push(stdout);
  }
  if (stderr !== undefined) {
    fields.push('stderr = ?');
    params.push(stderr);
  }
  if (exitCode !== undefined) {
    fields.push('exit_code = ?');
    params.push(exitCode);
  }
  if (errorMessage !== undefined) {
    fields.push('error_message = ?');
    params.push(errorMessage);
  }
  if (durationMs !== undefined) {
    fields.push('duration_ms = ?');
    params.push(durationMs);
  }

  // 如果状态变为完成，设置完成时间
  if (status && ['success', 'failed', 'timeout'].includes(status)) {
    fields.push('finished_at = ?');
    params.push(Date.now());
  }

  fields.push('created_at = ?');
  params.push(Date.now());
  params.push(runId);

  const sql = `UPDATE execution_history SET ${fields.join(', ')} WHERE id = ?`;
  await query(sql, params);
  
  const updated = await getExecutionById(runId);
  logger.info(`更新执行记录状态：${runId} -> ${status}`);
  
  return updated;
}

/**
 * 记录任务执行开始
 * @param {Object} runData - 运行数据
 * @returns {Promise<number>} 运行记录 ID
 */
async function recordExecutionStart(runData) {
  const { taskId, expression, command } = runData;
  
  const sql = `
    INSERT INTO execution_history (task_id, expression, command, status, started_at)
    VALUES (?, ?, ?, 'running', ?)
  `;
  
  const result = await query(sql, [taskId, expression, command, Date.now()]);
  
  logger.info(`记录任务执行开始：任务 ${taskId}, 运行 ID ${result.insertId}`);
  
  return result.insertId;
}

/**
 * 记录任务执行完成
 * @param {number} runId - 运行记录 ID
 * @param {Object} resultData - 执行结果
 * @returns {Promise<Object>} 更新后的记录
 */
async function recordExecutionComplete(runId, resultData) {
  const { status, stdout, stderr, exitCode, errorMessage } = resultData;
  
  const durationMs = resultData.durationMs || (Date.now() - (await getExecutionById(runId)).started_at);
  
  return await updateExecutionStatus(runId, {
    status,
    stdout,
    stderr,
    exitCode,
    errorMessage,
    durationMs
  });
}

/**
 * 删除旧的执行历史
 * @param {number} taskId - 任务 ID（可选，为空则删除所有）
 * @param {number} days - 保留天数
 * @returns {Promise<number>} 删除的记录数
 */
async function cleanupOldHistory(taskId = null, days = 30) {
  const cutoffDate = Date.now() - (days * 24 * 60 * 60 * 1000);
  
  let sql = 'DELETE FROM execution_history WHERE started_at < ?';
  const params = [cutoffDate];

  if (taskId) {
    sql += ' AND task_id = ?';
    params.push(taskId);
  }

  const result = await query(sql, params);
  
  logger.info(`清理旧执行历史：删除了 ${result.affectedRows} 条记录`);
  
  return result.affectedRows;
}

/**
 * 获取执行统计信息
 * @param {Object} filters - 筛选条件
 * @returns {Promise<Object>} 统计信息
 */
async function getExecutionStats(filters = {}) {
  const { taskId, startDate, endDate } = filters;
  
  let whereClause = 'WHERE 1=1';
  const params = [];

  if (taskId) {
    whereClause += ' AND task_id = ?';
    params.push(taskId);
  }

  if (startDate) {
    whereClause += ' AND started_at >= ?';
    params.push(startDate);
  }

  if (endDate) {
    whereClause += ' AND started_at <= ?';
    params.push(endDate);
  }

  const [total, success, failed, timeout, running] = await Promise.all([
    query(`SELECT COUNT(*) as total FROM execution_history ${whereClause}`, params),
    query(`SELECT COUNT(*) as total FROM execution_history ${whereClause} AND status = 'success'`, params),
    query(`SELECT COUNT(*) as total FROM execution_history ${whereClause} AND status = 'failed'`, params),
    query(`SELECT COUNT(*) as total FROM execution_history ${whereClause} AND status = 'timeout'`, params),
    query(`SELECT COUNT(*) as total FROM execution_history ${whereClause} AND status = 'running'`, params)
  ]);

  // 平均执行时间
  const avgDuration = await query(`
    SELECT AVG(duration_ms) as avg_time 
    FROM execution_history 
    ${whereClause} AND status = 'success' AND duration_ms IS NOT NULL
  `, params);

  return {
    total: parseInt(total[0].total),
    success: parseInt(success[0].total),
    failed: parseInt(failed[0].total),
    timeout: parseInt(timeout[0].total),
    running: parseInt(running[0].total),
    avgDuration: avgDuration[0].avg_time ? Math.round(avgDuration[0].avg_time) : 0,
    successRate: total[0].total > 0 
      ? Math.round((parseInt(success[0].total) / parseInt(total[0].total)) * 100) 
      : 0
  };
}

module.exports = {
  getExecutionHistory,
  getAllExecutionHistory,
  getExecutionById,
  updateExecutionStatus,
  recordExecutionStart,
  recordExecutionComplete,
  cleanupOldHistory,
  getExecutionStats
};
