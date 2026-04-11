/**
 * 执行历史管理控制器
 * 处理 execution_history 相关的 HTTP 请求
 */

const executionHistoryService = require('../services/executionHistory.service');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/execution-history-controller.log' }),
    new winston.transports.Console()
  ]
});

/**
 * 获取任务执行历史
 * GET /api/task-configs/:taskId/runs
 */
async function getTaskRuns(req, res) {
  try {
    const { taskId } = req.params;
    const { status, page, limit } = req.query;
    
    const result = await executionHistoryService.getExecutionHistory(parseInt(taskId), {
      status: status || undefined,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('获取任务执行历史失败:', error.message);
    res.status(500).json({
      success: false,
      error: '获取任务执行历史失败',
      message: error.message
    });
  }
}

/**
 * 获取全局执行历史
 * GET /api/execution-history
 */
async function getAllRuns(req, res) {
  try {
    const { taskId, status, startDate, endDate, page, limit } = req.query;
    
    const result = await executionHistoryService.getAllExecutionHistory({
      taskId: taskId ? parseInt(taskId) : undefined,
      status: status || undefined,
      startDate: startDate ? parseInt(startDate) : undefined,
      endDate: endDate ? parseInt(endDate) : undefined,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('获取全局执行历史失败:', error.message);
    res.status(500).json({
      success: false,
      error: '获取全局执行历史失败',
      message: error.message
    });
  }
}

/**
 * 获取单个执行记录
 * GET /api/execution-history/:runId
 */
async function getRunById(req, res) {
  try {
    const { runId } = req.params;
    
    const run = await executionHistoryService.getExecutionById(parseInt(runId));
    
    if (!run) {
      return res.status(404).json({
        success: false,
        error: '执行记录不存在'
      });
    }

    res.json({
      success: true,
      data: run
    });
  } catch (error) {
    logger.error('获取执行记录失败:', error.message);
    res.status(500).json({
      success: false,
      error: '获取执行记录失败',
      message: error.message
    });
  }
}

/**
 * 更新执行记录状态
 * PATCH /api/execution-history/:runId/status
 */
async function updateStatus(req, res) {
  try {
    const { runId } = req.params;
    const { status, stdout, stderr, exitCode, errorMessage, durationMs } = req.body;
    
    const run = await executionHistoryService.updateExecutionStatus(parseInt(runId), {
      status,
      stdout,
      stderr,
      exitCode,
      errorMessage,
      durationMs
    });
    
    if (!run) {
      return res.status(404).json({
        success: false,
        error: '执行记录不存在'
      });
    }

    res.json({
      success: true,
      data: run
    });
  } catch (error) {
    logger.error('更新执行记录状态失败:', error.message);
    res.status(500).json({
      success: false,
      error: '更新执行记录状态失败',
      message: error.message
    });
  }
}

/**
 * 记录任务执行开始
 * POST /api/execution-history/start
 */
async function recordStart(req, res) {
  try {
    const { taskId, expression, command } = req.body;
    
    if (!taskId || !command) {
      return res.status(400).json({
        success: false,
        error: '缺少必填字段：taskId, command'
      });
    }

    const runId = await executionHistoryService.recordExecutionStart({
      taskId: parseInt(taskId),
      expression: expression || '',
      command
    });

    res.status(201).json({
      success: true,
      data: { runId }
    });
  } catch (error) {
    logger.error('记录执行开始失败:', error.message);
    res.status(500).json({
      success: false,
      error: '记录执行开始失败',
      message: error.message
    });
  }
}

/**
 * 记录任务执行完成
 * POST /api/execution-history/:runId/complete
 */
async function recordComplete(req, res) {
  try {
    const { runId } = req.params;
    const { status, stdout, stderr, exitCode, errorMessage, durationMs } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        error: '缺少必填字段：status'
      });
    }

    const run = await executionHistoryService.recordExecutionComplete(parseInt(runId), {
      status,
      stdout,
      stderr,
      exitCode,
      errorMessage,
      durationMs
    });

    res.json({
      success: true,
      data: run
    });
  } catch (error) {
    logger.error('记录执行完成失败:', error.message);
    res.status(500).json({
      success: false,
      error: '记录执行完成失败',
      message: error.message
    });
  }
}

/**
 * 清理旧执行历史
 * DELETE /api/execution-history/cleanup
 */
async function cleanup(req, res) {
  try {
    const { taskId, days = 30 } = req.body;
    
    const deletedCount = await executionHistoryService.cleanupOldHistory(
      taskId ? parseInt(taskId) : null,
      parseInt(days)
    );

    res.json({
      success: true,
      data: { deletedCount }
    });
  } catch (error) {
    logger.error('清理旧执行历史失败:', error.message);
    res.status(500).json({
      success: false,
      error: '清理旧执行历史失败',
      message: error.message
    });
  }
}

/**
 * 获取执行统计信息
 * GET /api/execution-history/stats
 */
async function getStats(req, res) {
  try {
    const { taskId, startDate, endDate } = req.query;
    
    const stats = await executionHistoryService.getExecutionStats({
      taskId: taskId ? parseInt(taskId) : undefined,
      startDate: startDate ? parseInt(startDate) : undefined,
      endDate: endDate ? parseInt(endDate) : undefined
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('获取执行统计失败:', error.message);
    res.status(500).json({
      success: false,
      error: '获取执行统计失败',
      message: error.message
    });
  }
}

module.exports = {
  getTaskRuns,
  getAllRuns,
  getRunById,
  updateStatus,
  recordStart,
  recordComplete,
  cleanup,
  getStats
};
