import { Router } from 'express'
import { requireAuth } from '../auth.js'
import db from '../database.js'

const router = Router()

/**
 * GET /api/stats/overview
 * 系统统计概览
 */
router.get('/overview', requireAuth, async (req, res) => {
  try {
    // 用户统计
    const userTotal = db.prepare('SELECT COUNT(*) as count FROM users').get().count
    const userActive = db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'active'").get().count

    // 任务统计
    const taskTotal = db.prepare('SELECT COUNT(*) as count FROM tasks').get().count
    const taskPending = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'pending'").get().count
    const taskCompleted = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'completed'").get().count

    // 场景统计
    const scenarioTotal = db.prepare('SELECT COUNT(*) as count FROM scenarios').get().count

    // 会话统计
    const { sessions } = await import('../index.js')
    const activeSessions = sessions ? sessions.size : 0

    res.json({
      total_users: userTotal,
      active_users: userActive,
      total_tasks: taskTotal,
      pending_tasks: taskPending,
      completed_tasks: taskCompleted,
      total_scenarios: scenarioTotal,
      active_sessions: activeSessions
    })
  } catch (error) {
    console.error('Overview stats error:', error)
    res.status(500).json({ error: '获取统计概览失败' })
  }
})

/**
 * GET /api/stats/users
 * 用户统计
 */
router.get('/users', requireAuth, async (req, res) => {
  try {
    const { period = 'week' } = req.query

    // 角色分布
    const roleStmt = db.prepare(`
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role
    `)
    const roleDistribution = roleStmt.all().map(r => ({
      role: r.role,
      count: r.count
    }))

    // 状态分布
    const statusStmt = db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM users 
      GROUP BY status
    `)
    const statusDistribution = statusStmt.all().map(s => ({
      status: s.status,
      count: s.count
    }))

    // 用户增长（按天/周/月）
    const now = Date.now()
    let startDate
    if (period === 'day') {
      startDate = now - 24 * 60 * 60 * 1000
    } else if (period === 'week') {
      startDate = now - 7 * 24 * 60 * 60 * 1000
    } else {
      startDate = now - 30 * 24 * 60 * 60 * 1000
    }

    const growthStmt = db.prepare(`
      SELECT DATE(created_at / 1000, 'unixepoch') as date, COUNT(*) as count
      FROM users
      WHERE created_at >= ?
      GROUP BY DATE(created_at / 1000, 'unixepoch')
      ORDER BY date
    `)
    const userGrowth = growthStmt.all(startDate).map(g => ({
      date: g.date,
      count: g.count
    }))

    res.json({
      user_growth: userGrowth,
      role_distribution: roleDistribution,
      status_distribution: statusDistribution
    })
  } catch (error) {
    console.error('User stats error:', error)
    res.status(500).json({ error: '获取用户统计失败' })
  }
})

/**
 * GET /api/stats/tasks
 * 任务统计
 */
router.get('/tasks', requireAuth, async (req, res) => {
  try {
    // 任务状态分布
    const statusStmt = db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM tasks 
      GROUP BY status
    `)
    const taskStatus = statusStmt.all().map(s => ({
      status: s.status,
      count: s.count
    }))

    // 任务优先级分布
    const priorityStmt = db.prepare(`
      SELECT priority, COUNT(*) as count 
      FROM tasks 
      GROUP BY priority
    `)
    const taskPriority = priorityStmt.all().map(p => ({
      priority: p.priority,
      count: p.count
    }))

    // 完成率趋势
    const now = Date.now()
    const startDate = now - 7 * 24 * 60 * 60 * 1000

    const completionStmt = db.prepare(`
      SELECT DATE(updated_at / 1000, 'unixepoch') as date,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        COUNT(*) as total
      FROM tasks
      WHERE updated_at >= ?
      GROUP BY DATE(updated_at / 1000, 'unixepoch')
      ORDER BY date
    `)
    const completionRate = completionStmt.all(startDate).map(c => ({
      date: c.date,
      rate: c.total > 0 ? c.completed / c.total : 0
    }))

    res.json({
      task_status: taskStatus,
      task_priority: taskPriority,
      completion_rate: completionRate
    })
  } catch (error) {
    console.error('Task stats error:', error)
    res.status(500).json({ error: '获取任务统计失败' })
  }
})

/**
 * GET /api/stats/audit
 * 审计统计
 */
router.get('/audit', requireAuth, async (req, res) => {
  try {
    const { period = 'week', group_by = 'action' } = req.query

    const now = Date.now()
    let startDate
    if (period === 'day') {
      startDate = now - 24 * 60 * 60 * 1000
    } else if (period === 'week') {
      startDate = now - 7 * 24 * 60 * 60 * 1000
    } else {
      startDate = now - 30 * 24 * 60 * 60 * 1000
    }

    // 操作分布
    const actionStmt = db.prepare(`
      SELECT action, COUNT(*) as count 
      FROM audit_logs 
      WHERE created_at >= ?
      GROUP BY action
      ORDER BY count DESC
    `)
    const actionDistribution = actionStmt.all(startDate).map(a => ({
      action: a.action,
      count: a.count
    }))

    // 用户活动
    const userStmt = db.prepare(`
      SELECT COALESCE(a.username, u.username) as username, COUNT(*) as action_count
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.created_at >= ?
        AND COALESCE(a.username, u.username) IS NOT NULL
      GROUP BY COALESCE(a.username, u.username)
      ORDER BY action_count DESC
      LIMIT 10
    `)
    const userActivity = userStmt.all(startDate).map(u => ({
      user_id: u.username,
      username: u.username,
      action_count: u.action_count
    }))

    // 按时间分组
    let timeGrouped = []
    if (group_by === 'time') {
      const timeStmt = db.prepare(`
        SELECT DATE(created_at / 1000, 'unixepoch') as date, COUNT(*) as count
        FROM audit_logs
        WHERE created_at >= ?
        GROUP BY DATE(created_at / 1000, 'unixepoch')
        ORDER BY date
      `)
      timeGrouped = timeStmt.all(startDate).map(t => ({
        date: t.date,
        count: t.count
      }))
    }

    res.json({
      action_distribution: actionDistribution,
      user_activity: userActivity,
      time_distribution: timeGrouped
    })
  } catch (error) {
    console.error('Audit stats error:', error)
    res.status(500).json({ error: '获取审计统计失败' })
  }
})

/**
 * GET /api/stats/resource/:type
 * 资源详细统计
 */
router.get('/resource/:type', requireAuth, async (req, res) => {
  try {
    const { type } = req.params

    const resourceMap = {
      'users': { table: 'users', idField: 'id' },
      'tasks': { table: 'tasks', idField: 'id' },
      'scenarios': { table: 'scenarios', idField: 'id' }
    }

    const config = resourceMap[type]
    if (!config) {
      return res.status(400).json({ error: '不支持的资源类型' })
    }

    const { table, idField } = config

    // 创建时间分布
    const now = Date.now()
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000

    const createdStmt = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN ${idField} IN (
          SELECT ${idField} FROM ${table} WHERE created_at >= ${now - 24 * 60 * 60 * 1000}
        ) THEN 1 ELSE 0 END), 0) as today,
        COALESCE(SUM(CASE WHEN ${idField} IN (
          SELECT ${idField} FROM ${table} WHERE created_at >= ${now - 7 * 24 * 60 * 60 * 1000} AND created_at < ${now - 24 * 60 * 60 * 1000}
        ) THEN 1 ELSE 0 END), 0) as this_week,
        COALESCE(SUM(CASE WHEN ${idField} IN (
          SELECT ${idField} FROM ${table} WHERE created_at >= ${oneMonthAgo} AND created_at < ${now - 7 * 24 * 60 * 60 * 1000}
        ) THEN 1 ELSE 0 END), 0) as last_week
      FROM ${table}
    `)
    const created = createdStmt.get()

    res.json({
      created_today: created.today,
      created_this_week: created.this_week,
      created_last_week: created.last_week
    })
  } catch (error) {
    console.error('Resource stats error:', error)
    res.status(500).json({ error: '获取资源统计失败' })
  }
})

export default router
