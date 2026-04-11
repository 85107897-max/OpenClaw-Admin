/**
 * Cron 相关路由
 * 包含 cron_templates, task_configs, execution_history 的路由定义
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');

// 导入控制器
const cronTemplateController = require('../controllers/cronTemplate.controller');
const taskConfigController = require('../controllers/taskConfig.controller');
const executionHistoryController = require('../controllers/executionHistory.controller');
const { authenticate, requirePermission } = require('../middleware/auth');

// ============================================
// Cron Templates 路由
// ============================================

// 获取模板列表
router.get('/templates',
  authenticate,
  query('category').optional().isString(),
  query('isBuiltin').optional().isIn(['true', 'false']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  cronTemplateController.list
);

// 获取单个模板
router.get('/templates/:id',
  authenticate,
  param('id').isInt().withMessage('无效的任务 ID'),
  cronTemplateController.get
);

// 创建模板
router.post('/templates',
  authenticate,
  requirePermission('crons:create'),
  body('name').notEmpty().withMessage('模板名称不能为空'),
  body('expression').notEmpty().withMessage('表达式不能为空'),
  body('schedule_type').isIn(['cron', 'every', 'at']).withMessage('无效的调度类型'),
  cronTemplateController.create
);

// 更新模板
router.put('/templates/:id',
  authenticate,
  requirePermission('crons:update'),
  param('id').isInt().withMessage('无效的任务 ID'),
  cronTemplateController.update
);

// 删除模板
router.delete('/templates/:id',
  authenticate,
  requirePermission('crons:delete'),
  param('id').isInt().withMessage('无效的任务 ID'),
  cronTemplateController.delete
);

// ============================================
// Task Configs 路由
// ============================================

// 获取任务配置列表
router.get('/tasks',
  authenticate,
  query('q').optional().isString(),
  query('enabled').optional().isIn(['true', 'false', 'all']),
  query('sortBy').optional().isString(),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  taskConfigController.list
);

// 获取单个任务配置
router.get('/tasks/:id',
  authenticate,
  param('id').isInt().withMessage('无效的任务 ID'),
  taskConfigController.get
);

// 创建任务配置
router.post('/tasks',
  authenticate,
  requirePermission('crons:create'),
  body('title').notEmpty().withMessage('任务标题不能为空'),
  body('expression').notEmpty().withMessage('表达式不能为空'),
  body('command').notEmpty().withMessage('命令不能为空'),
  body('schedule_type').isIn(['cron', 'every', 'at']).withMessage('无效的调度类型'),
  taskConfigController.create
);

// 更新任务配置
router.put('/tasks/:id',
  authenticate,
  requirePermission('crons:update'),
  param('id').isInt().withMessage('无效的任务 ID'),
  taskConfigController.update
);

// 删除任务配置
router.delete('/tasks/:id',
  authenticate,
  requirePermission('crons:delete'),
  param('id').isInt().withMessage('无效的任务 ID'),
  taskConfigController.delete
);

// 启用任务
router.post('/tasks/:id/enable',
  authenticate,
  requirePermission('crons:update'),
  param('id').isInt().withMessage('无效的任务 ID'),
  taskConfigController.enable
);

// 禁用任务
router.post('/tasks/:id/disable',
  authenticate,
  requirePermission('crons:update'),
  param('id').isInt().withMessage('无效的任务 ID'),
  taskConfigController.disable
);

// 手动运行任务
router.post('/tasks/:id/run',
  authenticate,
  requirePermission('crons:run'),
  param('id').isInt().withMessage('无效的任务 ID'),
  async (req, res) => {
    try {
      const { manualRunTask } = require('../services/schedulerService');
      const result = await manualRunTask(req.params.id);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// 批量删除任务
router.post('/tasks/batch-delete',
  authenticate,
  requirePermission('crons:delete'),
  body('taskIds').isArray({ min: 1 }).withMessage('至少需要一个任务 ID'),
  taskConfigController.batchDelete
);

// 批量启用任务
router.post('/tasks/batch-enable',
  authenticate,
  requirePermission('crons:update'),
  body('taskIds').isArray({ min: 1 }).withMessage('至少需要一个任务 ID'),
  taskConfigController.batchEnable
);

// 批量禁用任务
router.post('/tasks/batch-disable',
  authenticate,
  requirePermission('crons:update'),
  body('taskIds').isArray({ min: 1 }).withMessage('至少需要一个任务 ID'),
  taskConfigController.batchDisable
);

// ============================================
// Execution History 路由
// ============================================

// 获取执行历史列表
router.get('/history',
  authenticate,
  query('taskId').optional().isInt(),
  query('status').optional().isIn(['running', 'success', 'failed', 'timeout']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  executionHistoryController.list
);

// 获取单个执行记录
router.get('/history/:id',
  authenticate,
  param('id').isInt().withMessage('无效的记录 ID'),
  executionHistoryController.get
);

// 获取任务执行统计
router.get('/history/stats/:taskId',
  authenticate,
  param('taskId').isInt().withMessage('无效的任务 ID'),
  executionHistoryController.getStats
);

// 删除执行记录
router.delete('/history/:id',
  authenticate,
  requirePermission('crons:delete'),
  param('id').isInt().withMessage('无效的记录 ID'),
  executionHistoryController.delete
);

// 批量删除执行记录
router.post('/history/batch-delete',
  authenticate,
  requirePermission('crons:delete'),
  body('recordIds').isArray({ min: 1 }).withMessage('至少需要一个记录 ID'),
  executionHistoryController.batchDelete
);

// 清空任务执行历史
router.delete('/history/clear/:taskId',
  authenticate,
  requirePermission('crons:delete'),
  param('taskId').isInt().withMessage('无效的任务 ID'),
  executionHistoryController.clearHistory
);

// 验证请求参数
router.use((req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
});

module.exports = router;
