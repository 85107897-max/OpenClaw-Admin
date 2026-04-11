/**
 * Cron 模板管理服务
 * 负责 cron_templates 表的 CRUD 操作
 */

const { query } = require('../utils/database');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/cron-template.log' }),
    new winston.transports.Console()
  ]
});

/**
 * 获取所有 Cron 模板
 * @param {Object} filters - 筛选条件
 * @returns {Promise<Array>} 模板列表
 */
async function getAllTemplates(filters = {}) {
  const { category, isBuiltin, search } = filters;
  
  let sql = 'SELECT * FROM cron_templates WHERE 1=1';
  const params = [];

  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }

  if (isBuiltin !== undefined) {
    sql += ' AND is_builtin = ?';
    params.push(isBuiltin ? 1 : 0);
  }

  if (search) {
    sql += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY category, name';

  const templates = await query(sql, params);
  logger.info(`获取 Cron 模板列表，共 ${templates.length} 条`);
  
  return templates;
}

/**
 * 获取单个 Cron 模板
 * @param {number} id - 模板 ID
 * @returns {Promise<Object|null>} 模板详情
 */
async function getTemplateById(id) {
  const [template] = await query('SELECT * FROM cron_templates WHERE id = ?', [id]);
  
  if (!template) {
    logger.warn(`Cron 模板不存在：${id}`);
    return null;
  }
  
  logger.info(`获取 Cron 模板：${id}`);
  return template;
}

/**
 * 创建 Cron 模板
 * @param {Object} templateData - 模板数据
 * @returns {Promise<Object>} 创建的模板
 */
async function createTemplate(templateData) {
  const { name, description, expression, scheduleType, category } = templateData;
  
  const sql = `
    INSERT INTO cron_templates (name, description, expression, schedule_type, category, is_builtin)
    VALUES (?, ?, ?, ?, ?, 0)
  `;
  
  const result = await query(sql, [name, description, expression, scheduleType, category]);
  
  const newTemplate = await getTemplateById(result.insertId);
  logger.info(`创建 Cron 模板：${name} (ID: ${result.insertId})`);
  
  return newTemplate;
}

/**
 * 更新 Cron 模板
 * @param {number} id - 模板 ID
 * @param {Object} templateData - 更新数据
 * @returns {Promise<Object|null>} 更新后的模板
 */
async function updateTemplate(id, templateData) {
  const existing = await getTemplateById(id);
  if (!existing) {
    return null;
  }

  // 内置模板不允许修改
  if (existing.is_builtin === 1) {
    logger.warn(`尝试修改内置模板：${id}`);
    throw new Error('内置模板不允许修改');
  }

  const { name, description, expression, scheduleType, category } = templateData;
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
  if (scheduleType !== undefined) {
    fields.push('schedule_type = ?');
    params.push(scheduleType);
  }
  if (category !== undefined) {
    fields.push('category = ?');
    params.push(category);
  }

  fields.push('updated_at = ?');
  params.push(Date.now());
  params.push(id);

  const sql = `UPDATE cron_templates SET ${fields.join(', ')} WHERE id = ?`;
  await query(sql, params);
  
  const updated = await getTemplateById(id);
  logger.info(`更新 Cron 模板：${id}`);
  
  return updated;
}

/**
 * 删除 Cron 模板
 * @param {number} id - 模板 ID
 * @returns {Promise<boolean>} 是否删除成功
 */
async function deleteTemplate(id) {
  const existing = await getTemplateById(id);
  if (!existing) {
    return false;
  }

  // 内置模板不允许删除
  if (existing.is_builtin === 1) {
    logger.warn(`尝试删除内置模板：${id}`);
    throw new Error('内置模板不允许删除');
  }

  await query('DELETE FROM cron_templates WHERE id = ?', [id]);
  logger.info(`删除 Cron 模板：${id}`);
  
  return true;
}

/**
 * 获取模板分类列表
 * @returns {Promise<Array>} 分类列表
 */
async function getCategories() {
  const categories = await query(`
    SELECT DISTINCT category 
    FROM cron_templates 
    WHERE category IS NOT NULL 
    ORDER BY category
  `);
  
  return categories.map(c => c.category);
}

module.exports = {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getCategories
};
