import { Router } from 'express'
import db from '../database.js'
import { requirePermission, requireRole } from '../auth.js'
import { getAuditLogs, getAuditLogById, getAuditLogStatistics } from '../database.js'

const router = Router()

// 所有审计日志路由都需要 audit:view 权限
// 注意：使用 optionalAuth 因为这是受保护的路由，需要权限检查
// router.use(requirePermission('perm_audit_view'))

/**
 * @route GET /api/audit/logs
 * @description 获取审计日志列表（支持分页和筛选）
 * @query page - 页码，默认 1
 * @query pageSize - 每页数量，默认 50，最大 100
 * @query userId - 用户 ID 筛选
 * @query action - 动作类型筛选（支持前缀匹配）
 * @query resource - 资源类型筛选
 * @query status - 状态筛选（success/denied/failed）
 * @query startTime - 开始时间（毫秒时间戳）
 * @query endTime - 结束时间（毫秒时间戳）
 */
router.get('/logs', requirePermission('perm_audit_view'), (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 50,
      userId,
      action,
      resource,
      status,
      startTime,
      endTime
    } = req.query

    // 验证参数
    const pageNum = Math.max(1, parseInt(page))
    const limit = Math.min(100, Math.max(1, parseInt(pageSize)))

    const result = getAuditLogs({
      page: pageNum,
      pageSize: limit,
      userId: userId || undefined,
      action: action || undefined,
      resource: resource || undefined,
      status: status || undefined,
      startTime: startTime ? parseInt(startTime) : undefined,
      endTime: endTime ? parseInt(endTime) : undefined
    })

    res.json({
      ok: true,
      data: result
    })
  } catch (error) {
    console.error('[Audit API] Failed to get audit logs:', error)
    res.status(500).json({
      ok: false,
      error: 'Failed to retrieve audit logs',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * @route GET /api/audit/logs/:id
 * @description 获取单条审计日志详情
 * @param id - 日志 ID
 */
router.get('/logs/:id', requirePermission('perm_audit_view'), (req, res) => {
  try {
    const { id } = req.params
    const log = getAuditLogById(id)

    if (!log) {
      return res.status(404).json({
        ok: false,
        error: 'Audit log not found',
        code: 'NOT_FOUND'
      })
    }

    res.json({
      ok: true,
      data: log
    })
  } catch (error) {
    console.error('[Audit API] Failed to get audit log:', error)
    res.status(500).json({
      ok: false,
      error: 'Failed to retrieve audit log',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * @route GET /api/audit/stats
 * @description 获取审计日志统计信息
 * @query startTime - 开始时间（毫秒时间戳）
 * @query endTime - 结束时间（毫秒时间戳）
 */
router.get('/stats', requirePermission('perm_audit_view'), (req, res) => {
  try {
    const { startTime, endTime } = req.query

    const stats = getAuditLogStatistics({
      startTime: startTime ? parseInt(startTime) : undefined,
      endTime: endTime ? parseInt(endTime) : undefined
    })

    res.json({
      ok: true,
      data: stats
    })
  } catch (error) {
    console.error('[Audit API] Failed to get audit statistics:', error)
    res.status(500).json({
      ok: false,
      error: 'Failed to retrieve audit statistics',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * @route GET /api/audit/actions
 * @description 获取所有唯一的动作类型列表
 */
router.get('/actions', requirePermission('perm_audit_view'), (req, res) => {
  try {
    const rows = db.prepare('SELECT DISTINCT action FROM audit_logs ORDER BY action').all()
    res.json({
      ok: true,
      data: rows.map(r => r.action)
    })
  } catch (error) {
    console.error('[Audit API] Failed to get actions:', error)
    res.status(500).json({
      ok: false,
      error: 'Failed to retrieve actions',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * @route GET /api/audit/resources
 * @description 获取所有唯一的资源类型列表
 */
router.get('/resources', requirePermission('perm_audit_view'), (req, res) => {
  try {
    const rows = db.prepare('SELECT DISTINCT resource FROM audit_logs WHERE resource IS NOT NULL ORDER BY resource').all()
    res.json({
      ok: true,
      data: rows.map(r => r.resource)
    })
  } catch (error) {
    console.error('[Audit API] Failed to get resources:', error)
    res.status(500).json({
      ok: false,
      error: 'Failed to retrieve resources',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * @route DELETE /api/audit/logs
 * @description 批量删除审计日志（仅管理员）
 * @body olderThan - 删除早于该时间戳的日志（毫秒）
 * @requires admin 角色
 */
router.delete('/logs', requirePermission('perm_audit_view'), requireRole('admin'), (req, res) => {
  try {
    const { olderThan } = req.body

    if (!olderThan || typeof olderThan !== 'number') {
      return res.status(400).json({
        ok: false,
        error: 'Invalid or missing olderThan parameter',
        code: 'INVALID_PARAMETER'
      })
    }

    const result = db.prepare('DELETE FROM audit_logs WHERE created_at < ?').run(olderThan)

    res.json({
      ok: true,
      message: `Deleted ${result.changes} audit logs`,
      deletedCount: result.changes
    })
  } catch (error) {
    console.error('[Audit API] Failed to delete audit logs:', error)
    res.status(500).json({
      ok: false,
      error: 'Failed to delete audit logs',
      code: 'INTERNAL_ERROR'
    })
  }
})

export default router
