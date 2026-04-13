import { Router } from 'express'
import { requireAuth, requirePermission } from '../auth.js'
import db from '../database.js'

const router = Router()

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function normalizePermissionIds(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string' && item.trim())
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed)
        ? parsed.filter((item) => typeof item === 'string' && item.trim())
        : []
    } catch {
      return []
    }
  }

  return []
}

function getRolePermissions(role) {
  const linkedPermissions = db.prepare(`
    SELECT p.*
    FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    WHERE rp.role_id = ?
    ORDER BY p.resource, p.action
  `).all(role.id)

  if (linkedPermissions.length > 0) {
    return linkedPermissions
  }

  const permissionIds = normalizePermissionIds(role.permissions)
  if (permissionIds.length === 0) {
    return []
  }

  const placeholders = permissionIds.map(() => '?').join(', ')
  return db.prepare(`SELECT * FROM permissions WHERE id IN (${placeholders}) ORDER BY resource, action`)
    .all(...permissionIds)
}

function replaceRolePermissions(roleId, permissionIds) {
  db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(roleId)

  if (permissionIds.length > 0) {
    const insertStmt = db.prepare(`
      INSERT INTO role_permissions (role_id, permission_id, created_at)
      VALUES (?, ?, ?)
    `)
    const now = Date.now()
    for (const permissionId of permissionIds) {
      insertStmt.run(roleId, permissionId, now)
    }
  }

  db.prepare('UPDATE roles SET permissions = ?, updated_at = ? WHERE id = ?')
    .run(JSON.stringify(permissionIds), Date.now(), roleId)
}

router.get('/permissions', requireAuth, async (req, res) => {
  try {
    const page = toPositiveInt(req.query.page, 1)
    const limit = Math.min(100, toPositiveInt(req.query.limit, 20))
    const offset = (page - 1) * limit
    const resource = typeof req.query.resource === 'string' && req.query.resource.trim()
      ? req.query.resource.trim()
      : null

    let sql = 'SELECT * FROM permissions'
    let countSql = 'SELECT COUNT(*) as total FROM permissions'
    const filterParams = []

    if (resource) {
      sql += ' WHERE resource = ?'
      countSql += ' WHERE resource = ?'
      filterParams.push(resource)
    }

    sql += ' ORDER BY resource, action LIMIT ? OFFSET ?'
    const items = db.prepare(sql).all(...filterParams, limit, offset)
    const total = db.prepare(countSql).get(...filterParams).total

    res.json({ items, total, page, limit })
  } catch (error) {
    console.error('Get permissions error:', error)
    res.status(500).json({ error: '获取权限列表失败' })
  }
})

router.post('/permissions', requireAuth, requirePermission('rbac:manage'), async (req, res) => {
  try {
    const { resource, action, description } = req.body

    if (!resource || !action) {
      return res.status(400).json({ error: 'resource 和 action 不能为空' })
    }

    const existing = db.prepare('SELECT id FROM permissions WHERE resource = ? AND action = ?').get(resource, action)
    if (existing) {
      return res.status(409).json({ error: '权限已存在' })
    }

    const id = `perm_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    const name = `${resource}:${action}`
    const createdAt = Date.now()

    db.prepare(`
      INSERT INTO permissions (id, name, resource, action, description, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, resource, action, description || '', createdAt)

    res.status(201).json({ id, name, resource, action, description: description || '', created_at: createdAt })
  } catch (error) {
    console.error('Create permission error:', error)
    res.status(500).json({ error: '创建权限失败' })
  }
})

router.put('/permissions/:id', requireAuth, requirePermission('rbac:manage'), async (req, res) => {
  try {
    const { id } = req.params
    const { description } = req.body

    const permission = db.prepare('SELECT * FROM permissions WHERE id = ?').get(id)
    if (!permission) {
      return res.status(404).json({ error: '权限不存在' })
    }

    db.prepare(`
      UPDATE permissions
      SET description = COALESCE(?, description)
      WHERE id = ?
    `).run(description, id)

    res.json({ success: true })
  } catch (error) {
    console.error('Update permission error:', error)
    res.status(500).json({ error: '更新权限失败' })
  }
})

router.delete('/permissions/:id', requireAuth, requirePermission('rbac:manage'), async (req, res) => {
  try {
    const { id } = req.params

    const permission = db.prepare('SELECT * FROM permissions WHERE id = ?').get(id)
    if (!permission) {
      return res.status(404).json({ error: '权限不存在' })
    }

    db.prepare('DELETE FROM role_permissions WHERE permission_id = ?').run(id)
    db.prepare('DELETE FROM user_permissions WHERE permission_id = ?').run(id)
    db.prepare('DELETE FROM permissions WHERE id = ?').run(id)

    res.json({ success: true })
  } catch (error) {
    console.error('Delete permission error:', error)
    res.status(500).json({ error: '删除权限失败' })
  }
})

router.get('/roles', requireAuth, async (req, res) => {
  try {
    const page = toPositiveInt(req.query.page, 1)
    const limit = Math.min(100, toPositiveInt(req.query.limit, 20))
    const offset = (page - 1) * limit

    const roles = db.prepare(`
      SELECT * FROM roles
      ORDER BY created_at
      LIMIT ? OFFSET ?
    `).all(limit, offset)
    const total = db.prepare('SELECT COUNT(*) as total FROM roles').get().total

    const items = roles.map((role) => ({
      ...role,
      permissions: getRolePermissions(role),
    }))

    res.json({ items, total, page, limit })
  } catch (error) {
    console.error('Get roles error:', error)
    res.status(500).json({ error: '获取角色列表失败' })
  }
})

router.post('/roles', requireAuth, requirePermission('rbac:manage'), async (req, res) => {
  try {
    const { name, description, permission_ids = [] } = req.body

    if (!name) {
      return res.status(400).json({ error: '角色名称不能为空' })
    }

    const existing = db.prepare('SELECT id FROM roles WHERE name = ?').get(name)
    if (existing) {
      return res.status(409).json({ error: '角色名称已存在' })
    }

    const id = `role_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    const now = Date.now()
    const permissionIds = normalizePermissionIds(permission_ids)

    db.prepare(`
      INSERT INTO roles (id, name, description, permissions, is_system, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, ?, ?)
    `).run(id, name, description || '', JSON.stringify(permissionIds), now, now)

    replaceRolePermissions(id, permissionIds)

    res.status(201).json({ id, name, description: description || '', created_at: now })
  } catch (error) {
    console.error('Create role error:', error)
    res.status(500).json({ error: '创建角色失败' })
  }
})

router.get('/roles/:id', requireAuth, async (req, res) => {
  try {
    const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(req.params.id)
    if (!role) {
      return res.status(404).json({ error: '角色不存在' })
    }

    res.json({
      ...role,
      permissions: getRolePermissions(role),
    })
  } catch (error) {
    console.error('Get role error:', error)
    res.status(500).json({ error: '获取角色详情失败' })
  }
})

router.put('/roles/:id', requireAuth, requirePermission('rbac:manage'), async (req, res) => {
  try {
    const { id } = req.params
    const { name, description } = req.body

    const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(id)
    if (!role) {
      return res.status(404).json({ error: '角色不存在' })
    }

    if (name && name !== role.name) {
      const existing = db.prepare('SELECT id FROM roles WHERE name = ? AND id != ?').get(name, id)
      if (existing) {
        return res.status(409).json({ error: '角色名称已存在' })
      }
    }

    db.prepare(`
      UPDATE roles
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          updated_at = ?
      WHERE id = ?
    `).run(name, description, Date.now(), id)

    res.json({ success: true })
  } catch (error) {
    console.error('Update role error:', error)
    res.status(500).json({ error: '更新角色失败' })
  }
})

router.delete('/roles/:id', requireAuth, requirePermission('rbac:manage'), async (req, res) => {
  try {
    const { id } = req.params

    const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(id)
    if (!role) {
      return res.status(404).json({ error: '角色不存在' })
    }

    db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(id)
    db.prepare('DELETE FROM user_roles WHERE role_id = ?').run(id)
    db.prepare('DELETE FROM roles WHERE id = ?').run(id)

    res.json({ success: true })
  } catch (error) {
    console.error('Delete role error:', error)
    res.status(500).json({ error: '删除角色失败' })
  }
})

router.put('/roles/:id/permissions', requireAuth, requirePermission('rbac:manage'), async (req, res) => {
  try {
    const { id } = req.params
    const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(id)
    if (!role) {
      return res.status(404).json({ error: '角色不存在' })
    }

    const permissionIds = normalizePermissionIds(req.body.permission_ids)
    replaceRolePermissions(id, permissionIds)

    res.json({ success: true })
  } catch (error) {
    console.error('Update role permissions error:', error)
    res.status(500).json({ error: '更新角色权限失败' })
  }
})

router.get('/users/:userId/permissions', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params

    const directPermissions = db.prepare(`
      SELECT DISTINCT p.*
      FROM permissions p
      JOIN user_permissions up ON p.id = up.permission_id
      WHERE up.user_id = ?
    `).all(userId)

    const inheritedPermissions = db.prepare(`
      SELECT DISTINCT p.*
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = ?
    `).all(userId)

    const permissionIds = [...new Set([
      ...directPermissions.map((permission) => permission.id),
      ...inheritedPermissions.map((permission) => permission.id),
    ])]

    const allPermissions = permissionIds.length > 0
      ? db.prepare(`SELECT * FROM permissions WHERE id IN (${permissionIds.map(() => '?').join(', ')})`)
          .all(...permissionIds)
      : []

    res.json({
      direct_permissions: directPermissions,
      inherited_permissions: inheritedPermissions,
      all_permissions: allPermissions,
    })
  } catch (error) {
    console.error('Get user permissions error:', error)
    res.status(500).json({ error: '获取用户权限失败' })
  }
})

router.post('/check', requireAuth, async (req, res) => {
  try {
    const { user_id, permission } = req.body
    if (!user_id || !permission) {
      return res.status(400).json({ error: '用户 ID 和权限不能为空' })
    }

    const [resource, action] = String(permission).split(':')
    if (!resource || !action) {
      return res.status(400).json({ error: '权限格式无效' })
    }

    const hasPermission = db.prepare(`
      SELECT 1
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = ? AND p.resource = ? AND p.action = ?
      UNION
      SELECT 1
      FROM permissions p
      JOIN user_permissions up ON p.id = up.permission_id
      WHERE up.user_id = ? AND p.resource = ? AND p.action = ?
      LIMIT 1
    `).get(user_id, resource, action, user_id, resource, action)

    res.json({ has_permission: Boolean(hasPermission) })
  } catch (error) {
    console.error('Check permission error:', error)
    res.status(500).json({ error: '权限检查失败' })
  }
})

router.get('/users/:userId/roles', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params
    const roles = db.prepare(`
      SELECT r.*
      FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = ?
    `).all(userId)

    res.json({
      roles: roles.map((role) => ({
        ...role,
        permissions: getRolePermissions(role),
      })),
    })
  } catch (error) {
    console.error('Get user roles error:', error)
    res.status(500).json({ error: '获取用户角色失败' })
  }
})

router.put('/users/:userId/roles', requireAuth, requirePermission('rbac:manage'), async (req, res) => {
  try {
    const { userId } = req.params
    const roleIds = normalizePermissionIds(req.body.role_ids)

    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId)
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    db.prepare('DELETE FROM user_roles WHERE user_id = ?').run(userId)

    if (roleIds.length > 0) {
      const insertStmt = db.prepare(`
        INSERT INTO user_roles (user_id, role_id, granted_by, granted_at)
        VALUES (?, ?, ?, ?)
      `)
      const now = Date.now()

      for (const roleId of roleIds) {
        const role = db.prepare('SELECT id FROM roles WHERE id = ?').get(roleId)
        if (role) {
          insertStmt.run(userId, roleId, req.auth?.userId || null, now)
        }
      }
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Update user roles error:', error)
    res.status(500).json({ error: '更新用户角色失败' })
  }
})

export default router
