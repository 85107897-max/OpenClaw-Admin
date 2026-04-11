/**
 * Cron Templates Controller
 * 处理 cron_templates 表的 CRUD 操作
 */

const { query, run } = require('../models/database');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// 获取模板列表
async function list(req, res) {
  try {
    const { category, isBuiltin, page = 1, limit = 20 } = req.query;
    
    let sql = 'SELECT * FROM cron_templates';
    const conditions = [];
    const params = [];

    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }

    if (isBuiltin !== undefined) {
      conditions.push('is_builtin = ?');
      params.push(isBuiltin === 'true' ? 1 : 0);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY created_at DESC';

    const offset = (page - 1) * limit;
    sql += ` LIMIT ${limit} OFFSET ${offset}`;

    const items = await query(sql, params);

    const [{ total }] = await query(
      'SELECT COUNT(*) as total FROM cron_templates' + 
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
    logger.error('获取模板列表失败:', error.message);
    res.status(500).json({
      success: false,
      error: '获取模板列表失败'
    });
  }
}

// 获取单个模板
async function get(req, res) {
  try {
    const { id } = req.params;
    
    const [item] = await query('SELECT * FROM cron_templates WHERE id = ?', [id]);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        error: '模板不存在'
      });
    }

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    logger.error('获取模板失败:', error.message);
    res.status(500).json({
      success: false,
      error: '获取模板失败'
    });
  }
}

// 创建模板
async function create(req, res) {
  try {
    const { name, description, expression, schedule_type, category, is_builtin = 0 } = req.body;

    const result = await run(
      `INSERT INTO cron_templates (name, description, expression, schedule_type, category, is_builtin)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, description, expression, schedule_type, category, is_builtin]
    );

    logger.info(`创建 Cron 模板：${name} (ID: ${result.changes})`);

    res.status(201).json({
      success: true,
      data: {
        id: result.changes,
        name,
        description,
        expression,
        schedule_type,
        category,
        is_builtin
      }
    });
  } catch (error) {
    logger.error('创建模板失败:', error.message);
    res.status(500).json({
      success: false,
      error: '创建模板失败'
    });
  }
}

// 更新模板
async function update(req, res) {
  try {
    const { id } = req.params;
    const { name, description, expression, schedule_type, category } = req.body;

    const fields = [];
    const params = [];

    if (name !== undefined) {
      fields.push('name = ?');
      params.push(name);
    }
    if (description !== undefined) {
      fields.push('description = ?');
      params.push(description);
    }
    if (expression !== undefined) {
      fields.push('expression = ?');
      params.push(expression);
    }
    if (schedule_type !== undefined) {
      fields.push('schedule_type = ?');
      params.push(schedule_type);
    }
    if (category !== undefined) {
      fields.push('category = ?');
      params.push(category);
    }

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        error: '没有可更新的字段'
      });
    }

    fields.push('updated_at = ?');
    params.push(Date.now());
    params.push(id);

    await run(`UPDATE cron_templates SET ${fields.join(', ')} WHERE id = ?`, params);

    logger.info(`更新 Cron 模板：${id}`);

    res.json({
      success: true,
      data: { id }
    });
  } catch (error) {
    logger.error('更新模板失败:', error.message);
    res.status(500).json({
      success: false,
      error: '更新模板失败'
    });
  }
}

// 删除模板
async function deleteTemplate(req, res) {
  try {
    const { id } = req.params;

    const result = await run('DELETE FROM cron_templates WHERE id = ?', [id]);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: '模板不存在'
      });
    }

    logger.info(`删除 Cron 模板：${id}`);

    res.json({
      success: true,
      deleted: true
    });
  } catch (error) {
    logger.error('删除模板失败:', error.message);
    res.status(500).json({
      success: false,
      error: '删除模板失败'
    });
  }
}

module.exports = {
  list,
  get,
  create,
  update,
  delete: deleteTemplate
};
