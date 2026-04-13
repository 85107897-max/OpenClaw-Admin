import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import AdmZip from 'adm-zip'
import fs from 'fs/promises'
import path from 'path'
import { hashPassword, requireAuth, requirePermission } from '../auth.js'
import db from '../database.js'

const router = Router()
const exportDir = path.join(process.cwd(), 'data/exports')

async function ensureExportDir() {
  await fs.mkdir(exportDir, { recursive: true })
}

router.post('/users/import', requireAuth, requirePermission('users:manage'), async (req, res) => {
  try {
    const { data } = req.body

    if (!Array.isArray(data)) {
      return res.status(400).json({ error: '请提供有效的用户数据数组' })
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [],
    }

    for (const user of data) {
      try {
        const { username, password, display_name, email, role = 'viewer' } = user

        if (!username || !password) {
          results.failed += 1
          results.errors.push({ username, error: '缺少必填字段：username 或 password' })
          continue
        }

        const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
        if (existing) {
          results.failed += 1
          results.errors.push({ username, error: '用户名已存在' })
          continue
        }

        const id = uuidv4()
        const { hash: passwordHash, salt } = hashPassword(password)

        db.prepare(`
          INSERT INTO users (id, username, password_hash, salt, display_name, email, role, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
        `).run(id, username, passwordHash, salt, display_name || username, email || null, role, Date.now())

        results.success += 1
      } catch (error) {
        results.failed += 1
        results.errors.push({
          username: user?.username || 'unknown',
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    res.json({ ok: true, results })
  } catch (error) {
    console.error('User import error:', error)
    res.status(500).json({ error: '导入失败' })
  }
})

router.post('/tasks/import', requireAuth, requirePermission('wizard:manage'), async (req, res) => {
  try {
    const { data } = req.body

    if (!Array.isArray(data)) {
      return res.status(400).json({ error: '请提供有效的任务数据数组' })
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [],
    }

    for (const task of data) {
      try {
        const { title, description, scenario_id, status = 'pending', priority = 'medium' } = task

        if (!title) {
          results.failed += 1
          results.errors.push({ title: task?.title || 'unknown', error: '缺少必填字段：title' })
          continue
        }

        const id = uuidv4()
        db.prepare(`
          INSERT INTO tasks (id, scenario_id, title, description, status, priority, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, scenario_id || null, title, description || '', status, priority, Date.now(), Date.now())

        results.success += 1
      } catch (error) {
        results.failed += 1
        results.errors.push({
          title: task?.title || 'unknown',
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    res.json({ ok: true, results })
  } catch (error) {
    console.error('Task import error:', error)
    res.status(500).json({ error: '导入失败' })
  }
})

router.post('/scenarios/import', requireAuth, requirePermission('wizard:manage'), async (req, res) => {
  try {
    const { data } = req.body

    if (!Array.isArray(data)) {
      return res.status(400).json({ error: '请提供有效的场景数据数组' })
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [],
    }

    for (const scenario of data) {
      try {
        const { name, description, status = 'draft' } = scenario

        if (!name) {
          results.failed += 1
          results.errors.push({ name: scenario?.name || 'unknown', error: '缺少必填字段：name' })
          continue
        }

        const id = uuidv4()
        db.prepare(`
          INSERT INTO scenarios (id, name, description, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, name, description || '', status, Date.now(), Date.now())

        results.success += 1
      } catch (error) {
        results.failed += 1
        results.errors.push({
          name: scenario?.name || 'unknown',
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    res.json({ ok: true, results })
  } catch (error) {
    console.error('Scenario import error:', error)
    res.status(500).json({ error: '导入失败' })
  }
})

router.post('/full/export', requireAuth, async (_req, res) => {
  try {
    await ensureExportDir()

    const timestamp = Date.now()
    const zip = new AdmZip()

    zip.addFile('users.json', Buffer.from(JSON.stringify(db.prepare('SELECT * FROM users').all(), null, 2)))
    zip.addFile('tasks.json', Buffer.from(JSON.stringify(db.prepare('SELECT * FROM tasks').all(), null, 2)))
    zip.addFile('scenarios.json', Buffer.from(JSON.stringify(db.prepare('SELECT * FROM scenarios').all(), null, 2)))
    zip.addFile('audit_logs.json', Buffer.from(JSON.stringify(
      db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 1000').all(),
      null,
      2
    )))
    zip.addFile('roles.json', Buffer.from(JSON.stringify(db.prepare('SELECT * FROM roles').all(), null, 2)))
    zip.addFile('permissions.json', Buffer.from(JSON.stringify(db.prepare('SELECT * FROM permissions').all(), null, 2)))

    const zipPath = path.join(exportDir, `backup_${timestamp}.zip`)
    zip.writeZip(zipPath)

    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="backup_${timestamp}.zip"`)
    res.sendFile(zipPath)

    setTimeout(() => {
      fs.unlink(zipPath).catch(() => {})
    }, 60 * 60 * 1000)
  } catch (error) {
    console.error('Full export error:', error)
    res.status(500).json({ error: '导出失败' })
  }
})

router.post('/restore', requireAuth, requirePermission('system:admin'), async (req, res) => {
  try {
    const { mode = 'merge' } = req.body

    if (mode === 'replace') {
      db.prepare('DELETE FROM audit_logs').run()
      db.prepare('DELETE FROM sessions').run()
      db.prepare('DELETE FROM user_permissions').run()
      db.prepare('DELETE FROM role_permissions').run()
      db.prepare('DELETE FROM user_roles').run()
      db.prepare('DELETE FROM tasks').run()
      db.prepare('DELETE FROM scenarios').run()
      db.prepare('DELETE FROM users WHERE role != "admin"').run()
    }

    res.json({
      ok: true,
      message: '数据恢复完成',
    })
  } catch (error) {
    console.error('Restore error:', error)
    res.status(500).json({ error: '恢复失败' })
  }
})

router.get('/history', requireAuth, async (_req, res) => {
  try {
    await ensureExportDir()

    const files = await fs.readdir(exportDir)
    const exports = await Promise.all(
      files
        .filter((filename) => filename.endsWith('.zip'))
        .map(async (filename) => {
          const fullPath = path.join(exportDir, filename)
          const stat = await fs.stat(fullPath)
          return {
            filename,
            timestamp: Number(filename.match(/_(\d+)\.zip$/)?.[1] || 0),
            size: stat.size,
          }
        })
    )

    exports.sort((a, b) => b.timestamp - a.timestamp)
    res.json({ ok: true, exports })
  } catch (error) {
    console.error('Export history error:', error)
    res.status(500).json({ error: '获取历史记录失败' })
  }
})

export default router
