/**
 * Task Configs Controller
 * 处理 task_configs 表的 CRUD 操作
 */

const { query, run } = require('../models/database');
const { calculateNextRun } = require('../utils/cronParser');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// 获取任务配置列表
async function list(req, res) {
  try {
    const { q, enabled, sortBy = 'created_at', sortOrder = 'desc', page = 1, limit = 20 } = req.query;
    
    let sql = 'SELECT * FROM task_configs';
    const conditions = [];
    const params = [];

    if (q) {
      conditions.push('(title LIKE ? OR command LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }

    if (enabled !== undefined && enabled !== 'all') {
      conditions.push('enabled = ?');
      params.push(enabled === 'true' ? 1 : 0);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    const allowedSortFields = ['title', 'enabled', 'created_at', 'updated_at', 'next_run_at'];
    if (!allowedSortFields.includes(sortBy)) {
      sortBy = 'created_at';
    }
    sql += ` ORDER BY ${sortBy} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}`;

    const offset = (page - 1) * limit;
    sql += ` LIMIT ${limit} OFFSET ${offset}`;

    const items = await query(sql, params);

    const [{ total }] = await query(
      'SELECT COUNT(*) as total FROM task_configs' + 
      (conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '')
    );

    res.json({
      success: true,
      data: {
        items,
        total: parseInt(total),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    logger.error('获取任务配置列表失败:', error.message);
    res.status(500).json({
      success: false,
      error: '获取任务配置列表失败'
    });
  }
}

// 获取单个任务配置
async function get(req, res) {
  try {
    const { id } = req.params;
    
    const [item] = await query('SELECT * FROM task_configs WHERE id = ?', [id]);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    logger.error('获取任务配置失败:', error.message);
    res.status(500).json({
      success: false,
      error: '获取任务配置失败'
    });
  }
}

// 创建任务配置
async function create(req, res) {
  try {
    const { 
      title, description, template_id, expression, command, 
      schedule_type, enabled = true, timeout = 300, 
      retry_count = 3, notify_on_fail = 1 
    } = req.body;

    const nextRunAt = calculateNextRun(expression);

    const result = await run(
      `INSERT INTO task_configs 
       (title, description, template_id, expression, command, schedule_type, 
        enabled, timeout, retry_count, notify_on_fail, next_run_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description, template_id || null, expression, command, schedule_type,
       enabled ? 1 : 0, timeout, retry_count, notify_on_fail, nextRunAt, Date.now(), Date.now()]
    );

    logger.info(`创建任务配置：${title} (ID: ${result.changes})`);

    res.status(201).json({
      success: true,
      data: {
        id: result.changes,
        title,
        description,
        template_id,
        expression,
        command,
        schedule_type,
        enabled,
        timeout,
        retry_count,
        notify_on_fail,
        next_run_at: nextRunAt
      }
    });
  } catch (error) {
    logger.error('创建任务配置失败:', error.message);
    res.status(500).json({
      success: false,
      error: '创建任务配置失败'
    });
  }
}

// 更新任务配置
async function update(req, res) {
  try {
    const { id } = req.params;
    const body = req.body;

    const allowedFields = ['title', 'description', 'template_id', 'expression', 'command', 
                          'schedule_type', 'enabled', 'timeout', 'retry_count', 'notify_on_fail'];
    
    const fields = [];
    const params = [];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        const dbField = field === 'enabled' ? 'enabled' : field;
        fields.push(`${dbField} = ?`);
        params.push(field === 'enabled' ? (body[field] ? 1 : 0) : body[field]);
      }
    }

    if (body.expression !== undefined) {
      const nextRunAt = calculateNextRun(body.expression);
      fields.push('next_run_at = ?');
      params.push(nextRunAt);
    }

    fields.push('updated_at = ?');
    params.push(Date.now());
    params.push(id);

    if (fields.length === 1) {
      return res.status(400).json({
        success: false,
        error: '没有可更新的字段'
      });
    }

    await run(`UPDATE task_configs SET ${fields.join(', ')} WHERE id = ?`, params);

    logger.info(`更新任务配置：${id}`);

    res.json({
      success: true,
      data: { id }
    });
  } catch (error) {
    logger.error('更新任务配置失败:', error.message);
    res.status(500).json({
      success: false,
      error: '更新任务配置失败'
    });
  }
}

// 删除任务配置
async function deleteTask(req, res) {
  try {
    const { id } = req.params;

    const result = await run('DELETE FROM task_configs WHERE id = ?', [id]);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }

    logger.info(`删除任务配置：${id}`);

    res.json({
      success: true,
      deleted: true
    });
  } catch (error) {
    logger.error('删除任务配置失败:', error.message);
    res.status(500).json({
      success: false,
      error: '删除任务配置失败'
    });
  }
}

// 启用任务
async function enable(req, res) {
  try {
    const { id } = req.params;

    const [task] = await query('SELECT * FROM task_configs WHERE id = ?', [id]);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: '任务不存在'
      });
    }

    const nextRunAt = calculateNextRun(task.expression);
    await run(
      'UPDATE task_configs SET enabled = 1, next_run_at = ?, updated_at = ? WHERE id = ?',
      [nextRunAt, Date.now(), id]
    );

    logger.info(`启用任务配置：${id}`);

    res.json({
      success: true,
      data: { id, next_run_at: nextRunAt }
    });
  } catch (error) {
    logger.error('启用任务配置失败:', error.message);
    res.status(500).json({
      success: false,
      error: '启用任务配置失败'
    });
  }
}

// 禁用任务
async function disable(req, res) {
  try {
    const { id } = req.params;

    await run('UPDATE task_configs SET enabled = 0, updated_at = ? WHERE id = ?', [Date.now(), id]);

    logger.info(`禁用任务配置：${id}`);

    res.json({
      success: true,
      data: { id }
    });
  } catch (error) {
    logger.error('禁用任务配置失败:', error.message);
    res.status(500).json({
      success: false,
      error: '禁用任务配置失败'
    });
  }
}

// 批量删除任务
async function batchDelete(req, res) {
  try {
    const { taskIds } = req.body;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: '无效的任务 ID 列表'
      });
    }

    const placeholders = taskIds.map(() => '?').join(',');
    const result = await run(`DELETE FROM task_configs WHERE id IN (${placeholders})`, taskIds);

    logger.info(`批量删除任务配置：删除了 ${result.changes} 个任务`);

    res.json({
      success: true,
      deletedCount: result.changes
    });
  } catch (error) {
    logger.error('批量删除任务配置失败:', error.message);
    res.status(500).json({
      success: false,
      error: '批量删除任务配置失败'
    });
  }
}

// 批量启用任务
async function batchEnable(req, res) {
  try {
    const { taskIds } = req.body;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: '无效的任务 ID 列表'
      });
    }

    const placeholders = taskIds.map(() => '?').join(',');
    const result = await run(
      `UPDATE task_configs SET enabled = 1, updated_at = ? WHERE id IN (${placeholders})`,
      [Date.now(), ...taskIds]
    );

    logger.info(`批量启用任务配置：启用了 ${result.changes} 个任务`);

    res.json({
      success: true,
      enabledCount: result.changes
    });
  } catch (error) {
    logger.error('批量启用任务配置失败:', error.message);
    res.status(500).json({
      success: false,
      error: '批量启用任务配置失败'
    });
  }
}

// 批量禁用任务
async function batchDisable(req, res) {
  try {
    const { taskIds } = req.body;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: '无效的任务 ID 列表'
      });
    }

    const placeholders = taskIds.map(() => '?').join(',');
    const result = await run(
      `UPDATE task_configs SET enabled = 0, updated_at = ? WHERE id IN (${placeholders})`,
      [Date.now(), ...taskIds]
    );

    logger.info(`批量禁用任务配置：禁用了 ${result.changes} 个任务`);

    res.json({
      success: true,
      disabledCount: result.changes
    });
  } catch (error) {
    logger.error('批量禁用任务配置失败:', error.message);
    res.status(500).json({
      success: false,
      error: '批量禁用任务配置失败'
    });
  }
}

module.exports = {
  list,
  get,
  create,
  update,
  delete: deleteTask,
  enable,
  disable,
  batchDelete,
  batchEnable,
  batchDisable
};
