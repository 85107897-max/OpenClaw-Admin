const express = require('express');
const router = express.Router();
const { AuditLog } = require('../models/auditLog');

/**
 * 获取审计日志列表
 * GET /api/audit-logs
 */
router.get('/', async (req, res) => {
  try {
    const {
      userId,
      action,
      resourceType,
      startDate,
      endDate,
      statusCode,
      limit = 100,
      offset = 0
    } = req.query;
    
    const logs = await AuditLog.find({
      userId,
      action,
      resourceType,
      startDate,
      endDate,
      statusCode,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      success: true,
      data: logs,
      total: logs.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取审计统计信息
 * GET /api/audit-logs/statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'resource_type' } = req.query;
    
    const statistics = await AuditLog.getStatistics({
      startDate,
      endDate,
      groupBy
    });
    
    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取活跃用户列表
 * GET /api/audit-logs/top-users
 */
router.get('/top-users', async (req, res) => {
  try {
    const { limit = 10, startDate, endDate } = req.query;
    
    const topUsers = await AuditLog.getTopUsers({
      limit: parseInt(limit),
      startDate,
      endDate
    });
    
    res.json({
      success: true,
      data: topUsers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取错误日志
 * GET /api/audit-logs/errors
 */
router.get('/errors', async (req, res) => {
  try {
    const { startDate, endDate, limit = 50 } = req.query;
    
    const errorLogs = await AuditLog.getErrorLogs({
      startDate,
      endDate,
      limit: parseInt(limit)
    });
    
    res.json({
      success: true,
      data: errorLogs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取单个审计日志详情
 * GET /api/audit-logs/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const logs = await AuditLog.find({});
    const log = logs.find(l => l.id === parseInt(id));
    
    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'Audit log not found'
      });
    }
    
    res.json({
      success: true,
      data: log
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
