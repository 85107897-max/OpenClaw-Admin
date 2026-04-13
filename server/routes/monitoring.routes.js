import { Router } from 'express'
import { requireAuth } from '../auth.js'
import db from '../database.js'
import { buildSystemAlerts, collectLocalSystemMetrics } from '../system-metrics.js'

const router = Router()

router.get('/system', requireAuth, async (_req, res) => {
  try {
    res.json({
      ok: true,
      data: collectLocalSystemMetrics({ includeTimestamp: true })
    })
  } catch (error) {
    console.error('[Monitoring] System stats error:', error)
    res.status(500).json({ error: 'Failed to get system stats' })
  }
})

router.get('/database', requireAuth, (_req, res) => {
  try {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count
    const taskCount = db.prepare('SELECT COUNT(*) as count FROM tasks').get().count
    const scenarioCount = db.prepare('SELECT COUNT(*) as count FROM scenarios').get().count
    const auditLogCount = db.prepare('SELECT COUNT(*) as count FROM audit_logs').get().count

    const recentUsers = db.prepare(`
      SELECT username, display_name, last_login_at
      FROM users
      WHERE last_login_at IS NOT NULL
      ORDER BY last_login_at DESC
      LIMIT 5
    `).all()

    const recentTasks = db.prepare(`
      SELECT title, status, updated_at
      FROM tasks
      ORDER BY updated_at DESC
      LIMIT 5
    `).all()

    res.json({
      ok: true,
      data: {
        stats: {
          users: userCount,
          tasks: taskCount,
          scenarios: scenarioCount,
          auditLogs: auditLogCount
        },
        recentActivity: {
          users: recentUsers,
          tasks: recentTasks
        },
        timestamp: Date.now()
      }
    })
  } catch (error) {
    console.error('[Monitoring] Database stats error:', error)
    res.status(500).json({ error: 'Failed to get database stats' })
  }
})

router.get('/api', requireAuth, (_req, res) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTimestamp = today.getTime()

    const todayLogs = db.prepare(`
      SELECT action, COUNT(*) as count
      FROM audit_logs
      WHERE created_at >= ?
      GROUP BY action
      ORDER BY count DESC
      LIMIT 20
    `).all(todayTimestamp)

    const totalToday = db.prepare(`
      SELECT COUNT(*) as count
      FROM audit_logs
      WHERE created_at >= ?
    `).get(todayTimestamp).count

    const errorLogs = db.prepare(`
      SELECT COUNT(*) as count
      FROM audit_logs
      WHERE status = 'failure' AND created_at >= ?
    `).get(todayTimestamp).count

    res.json({
      ok: true,
      data: {
        today: {
          totalRequests: totalToday,
          errors: errorLogs,
          errorRate: totalToday > 0 ? Math.round((errorLogs / totalToday) * 1000) / 10 : 0
        },
        topActions: todayLogs,
        timestamp: Date.now()
      }
    })
  } catch (error) {
    console.error('[Monitoring] API stats error:', error)
    res.status(500).json({ error: 'Failed to get API stats' })
  }
})

router.get('/history', requireAuth, (req, res) => {
  try {
    const rawHours = Number.parseInt(String(req.query.hours ?? 24), 10)
    const hours = Number.isFinite(rawHours) && rawHours > 0 ? rawHours : 24
    const startTime = Date.now() - hours * 60 * 60 * 1000

    const history = db.prepare(`
      SELECT
        DATE(created_at / 1000, 'unixepoch') as date,
        COUNT(*) as requests,
        SUM(CASE WHEN status = 'failure' THEN 1 ELSE 0 END) as errors
      FROM audit_logs
      WHERE created_at >= ?
      GROUP BY DATE(created_at / 1000, 'unixepoch')
      ORDER BY date
    `).all(startTime)

    res.json({
      ok: true,
      data: {
        period: { hours, startTime, endTime: Date.now() },
        history
      }
    })
  } catch (error) {
    console.error('[Monitoring] History error:', error)
    res.status(500).json({ error: 'Failed to get monitoring history' })
  }
})

router.get('/alerts', requireAuth, async (_req, res) => {
  try {
    const alerts = buildSystemAlerts(collectLocalSystemMetrics())

    res.json({
      ok: true,
      data: {
        alerts,
        count: alerts.length,
        timestamp: Date.now()
      }
    })
  } catch (error) {
    console.error('[Monitoring] Alerts error:', error)
    res.status(500).json({ error: 'Failed to get alerts' })
  }
})

export default router
