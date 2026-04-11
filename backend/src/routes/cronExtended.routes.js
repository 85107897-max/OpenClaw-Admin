/**
 * Cron 相关路由
 * 包含模板管理、任务配置、执行历史的所有接口
 */

const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');

// 导入控制器
const cronTemplateController = require('../controllers/cronTemplate.controller');
const taskConfigController = require('../controllers/taskConfig.controller');
const executionHistoryController = require('../controllers/executionHistory.controller');
const { authenticate, requirePermission } = require('../middleware/auth');

// ========================================
// Cron 模板管理路由
// ========================================

// 获取所有模板
router.get('/templates',
  authenticate,
  query('category').optional().isString(),
  query('isBuiltin').optional().isBoolean(),
  query('search').optional().isString(),
  cronTemplateController.getAll
);

// 获取模板分类
router.get('/templates/categories',
  authenticate,
  cronTemplateController.getCategories
);

// 获取单个模板
router.get('/templates/:id',
  authenticate,
  param('id').isInt({ min: 1 }).withMessage('无效的用户 ID'),
  cronTemplateController.getById
);

// 创建模板
router.post('/templates',
  authenticate,
  requirePermission('cron-templates:create'),
  body('name').notEmpty().withMessage('模板名称不能为空'),
  body('expression').notEmpty().withMessage('表达式不能为空'),
  body('scheduleType').isIn(['cron', 'every', 'at']).withMessage('无效的调度类型'),
  cronTemplateController.create
);

// 更新模板
router.put('/templates/:id',
  authenticate,
  requirePermission('cron-templates:update'),
  param('id').isInt({ min: 1 }).withMessage('无效的用户 ID'),
  cronTemplateController.update
);

// 删除模板
router.delete('/templates/:id',
  authenticate,
  requirePermission('cron-templates:delete'),
  param('id').isInt({ min: 1 }).withMessage('无效的用户 ID'),
  cronTemplateController.delete
);

// ========================================
// 任务配置管理路由
// ========================================

// 获取所有任务配置
router.get('/configs',
  authenticate,
  query('q').optional().isString(),
  query('enabled').optional().isIn(['true', 'false', 'all']),
  query('sortBy').optional().isString(),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  taskConfigController.getAll
);

// 获取任务统计
router.get('/configs/stats',
  authenticate,
  taskConfigController.getStats
);

// 获取单个任务配置
router.get('/configs/:id',
  authenticate,
  param('id').isInt({ min: 1 }).withMessage('无效的任务 ID'),
  taskConfigController.getById
);

// 创建任务配置
router.post('/configs',
  authenticate,
  requirePermission('tasks:create'),
  body('title').notEmpty().withMessage('标题不能为空'),
  body('scheduleType').isIn(['cron', 'every', 'at']).withMessage('无效的调度类型'),
  body('expression').notEmpty().withMessage('表达式不能为空'),
  body('command').notEmpty().withMessage('命令不能为空'),
  taskConfigController.create
);

// 更新任务配置
router.put('/configs/:id',
  authenticate,
  requirePermission('tasks:update'),
  param('id').isInt({ min: 1 }).withMessage('无效的任务 ID'),
  taskConfigController.update
);

// 删除任务配置
router.delete('/configs/:id',
  authenticate,
  requirePermission('tasks:delete'),
  param('id').isInt({ min: 1 }).withMessage('无效的任务 ID'),
  taskConfigController.delete
);

// 批量删除任务配置
router.post('/configs/batch-delete',
  authenticate,
  requirePermission('tasks:delete'),
  body('jobIds').isArray({ min: 1 }).withMessage('至少需要一个任务 ID'),
  taskConfigController.batchDelete
);

// 批量启用任务
router.post('/configs/batch-enable',
  authenticate,
  requirePermission('tasks:update'),
  body('jobIds').isArray({ min: 1 }).withMessage('至少需要一个任务 ID'),
  taskConfigController.batchEnable
);

// 批量禁用任务
router.post('/configs/batch-disable',
  authenticate,
  requirePermission('tasks:update'),
  body('jobIds').isArray({ min: 1 }).withMessage('至少需要一个任务 ID'),
  taskConfigController.batchDisable
);

// 手动运行任务
router.post('/configs/:id/run',
  authenticate,
  requirePermission('tasks:run'),
  param('id').isInt({ min: 1 }).withMessage('无效的任务 ID'),
  taskConfigController.run
);

// 获取任务执行历史
router.get('/configs/:taskId/runs',
  authenticate,
  param('taskId').isInt({ min: 1 }).withMessage('无效的任务 ID'),
  query('status').optional().isIn(['running', 'success', 'failed', 'timeout']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  executionHistoryController.getTaskRuns
);

// ========================================
// 执行历史管理路由
// ========================================

// 获取全局执行历史
router.get('/history',
  authenticate,
  query('taskId').optional().isInt({ min: 1 }),
  query('status').optional().isIn(['running', 'success', 'failed', 'timeout']),
  query('startDate').optional().isInt(),
  query('endDate').optional().isInt(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  executionHistoryController.getAllRuns
);

// 获取执行统计
router.get('/history/stats',
  authenticate,
  query('taskId').optional().isInt({ min: 1 }),
  query('startDate').optional().isInt(),
  query('endDate').optional().isInt(),
  executionHistoryController.getStats
);

// 获取单个执行记录
router.get('/history/:runId',
  authenticate,
  param('runId').isInt({ min: 1 }).withMessage('无效的运行记录 ID'),
  executionHistoryController.getRunById
);

// 更新执行记录状态
router.patch('/history/:runId/status',
  authenticate,
  requirePermission('tasks:update'),
  param('runId').isInt({ min: 1 }).withMessage('无效的运行记录 ID'),
  body('status').isIn(['running', 'success', 'failed', 'timeout']).withMessage('无效的状态'),
  executionHistoryController.updateStatus
);

// 记录执行开始
router.post('/history/start',
  authenticate,
  body('taskId').isInt({ min: 1 }).withMessage('无效的任务 ID'),
  body('command').notEmpty().withMessage('命令不能为空'),
  executionHistoryController.recordStart
);

// 记录执行完成
router.post('/history/:runId/complete',
  authenticate,
  requirePermission('tasks:update'),
  param('runId').isInt({ min: 1 }).withMessage('无效的运行记录 ID'),
  body('status').isIn(['success', 'failed', 'timeout']).withMessage('无效的状态'),
  executionHistoryController.recordComplete
);

// 清理旧执行历史
router.delete('/history/cleanup',
  authenticate,
  requirePermission('tasks:delete'),
  body('taskId').optional().isInt({ min: 1 }),
  body('days').optional().isInt({ min: 1 }),
  executionHistoryController.cleanup
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
