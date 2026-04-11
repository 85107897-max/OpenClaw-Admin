const express = require('express');
const router = express.Router();
const { AuditLog } = require('../models/auditLog');

/**
 * 用户行为分析 API
 */

/**
 * 获取用户行为概览
 * GET /api/user-behavior/overview/:userId
 */
router.get('/overview/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;
    
    const logs = await AuditLog.find({
      userId,
      startDate,
      endDate
    });
    
    // 计算行为统计
    const overview = {
      userId,
      totalActions: logs.length,
      uniqueResources: new Set(logs.map(l => l.resource_type)).size,
      errorCount: logs.filter(l => l.status_code >= 400).length,
      avgDuration: logs.reduce((sum, l) => sum + (l.duration || 0), 0) / (logs.length || 1),
      mostUsedAction: getMostFrequent(logs.map(l => l.action)),
      mostAccessedResource: getMostFrequent(logs.map(l => l.resource_type)),
      timeRange: {
        start: startDate || 'all',
        end: endDate || 'now'
      }
    };
    
    res.json({
      success: true,
      data: overview
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取用户行为时间线
 * GET /api/user-behavior/timeline/:userId
 */
router.get('/timeline/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const logs = await AuditLog.find({
      userId,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    const timeline = logs.map(log => ({
      timestamp: log.timestamp,
      action: log.action,
      resource: log.resource_type,
      path: log.path,
      status: log.status_code,
      duration: log.duration
    }));
    
    res.json({
      success: true,
      data: timeline
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取用户资源访问模式
 * GET /api/user-behavior/resource-pattern/:userId
 */
router.get('/resource-pattern/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;
    
    const logs = await AuditLog.find({
      userId,
      startDate,
      endDate
    });
    
    // 按资源类型分组统计
    const resourcePattern = {};
    logs.forEach(log => {
      const resource = log.resource_type || 'unknown';
      if (!resourcePattern[resource]) {
        resourcePattern[resource] = {
          resource,
          count: 0,
          errors: 0,
          totalDuration: 0
        };
      }
      resourcePattern[resource].count++;
      if (log.status_code >= 400) resourcePattern[resource].errors++;
      resourcePattern[resource].totalDuration += (log.duration || 0);
    });
    
    const patternList = Object.values(resourcePattern).map(p => ({
      ...p,
      avgDuration: p.totalDuration / p.count,
      errorRate: p.errors / p.count
    })).sort((a, b) => b.count - a.count);
    
    res.json({
      success: true,
      data: patternList
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取用户异常行为检测
 * GET /api/user-behavior/anomalies/:userId
 */
router.get('/anomalies/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;
    
    const logs = await AuditLog.find({
      userId,
      startDate,
      endDate
    });
    
    const anomalies = [];
    
    // 检测高频访问
    const actionCounts = {};
    logs.forEach(log => {
      const key = `${log.action}_${log.resource_type}`;
      actionCounts[key] = (actionCounts[key] || 0) + 1;
    });
    
    Object.entries(actionCounts).forEach(([key, count]) => {
      if (count > 100) {
        anomalies.push({
          type: 'high_frequency',
          key,
          count,
          severity: count > 500 ? 'high' : 'medium'
        });
      }
    });
    
    // 检测大量错误
    const errorLogs = logs.filter(l => l.status_code >= 400);
    if (errorLogs.length > logs.length * 0.3 && logs.length > 10) {
      anomalies.push({
        type: 'high_error_rate',
        count: errorLogs.length,
        total: logs.length,
        rate: errorLogs.length / logs.length,
        severity: 'high'
      });
    }
    
    res.json({
      success: true,
      data: {
        userId,
        anomalies,
        totalAnomalies: anomalies.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取全局用户行为统计
 * GET /api/user-behavior/global-stats
 */
router.get('/global-stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const topUsers = await AuditLog.getTopUsers({
      limit: 20,
      startDate,
      endDate
    });
    
    const statistics = await AuditLog.getStatistics({
      startDate,
      endDate,
      groupBy: 'resource_type'
    });
    
    const errorLogs = await AuditLog.getErrorLogs({
      startDate,
      endDate,
      limit: 20
    });
    
    res.json({
      success: true,
      data: {
        topUsers,
        resourceStatistics: statistics,
        recentErrors: errorLogs,
        timeRange: {
          start: startDate || 'all',
          end: endDate || 'now'
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 辅助函数：获取最频繁出现的元素
function getMostFrequent(arr) {
  if (!arr || arr.length === 0) return null;
  
  const counts = {};
  arr.forEach(item => {
    counts[item] = (counts[item] || 0) + 1;
  });
  
  return Object.entries(counts).reduce((a, b) => 
    a[1] > b[1] ? a : b
  )[0];
}

module.exports = router;
