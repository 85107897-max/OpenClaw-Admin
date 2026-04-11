import { createHash, randomBytes, timingSafeEqual } from 'crypto'
import db, { createAuditLog as dbCreateAuditLog, getAuditLogs as dbGetAuditLogs, getAuditLogById as dbGetAuditLogById, getAuditLogStatistics as dbGetAuditLogStatistics } from './database.js'

// Re-export audit log functions from database.js
export { dbCreateAuditLog as createAuditLog, dbGetAuditLogs as getAuditLogs, dbGetAuditLogById as getAuditLogById, dbGetAuditLogStatistics as getAuditLogStatistics }
import { randomUUID } from 'crypto'

const SALT_LENGTH = 32
const HASH_ITERATIONS = 100000

export function hashPassword(password, salt = null) {
  salt = salt || randomBytes(SALT_LENGTH).toString('hex')
  const hash = createHash('sha512')
  let data = salt + password
  for (let i = 0; i < HASH_ITERATIONS; i++) {
    hash.update(data)
    data = hash.digest('hex')
  }
  return { hash: data.slice(0, 128), salt }
}

export function verifyPassword(password, storedHash, salt) {
  const { hash } = hashPassword(password, salt)
  try {
    const a = Buffer.from(hash, 'hex')
    const b = Buffer.from(storedHash, 'hex')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export function generateToken() {
  return randomUUID() + '-' + randomBytes(32).toString('hex')
}

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

// Get user by ID
export function getUserById(userId) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId)
  if (!user) return null
  delete user.password_hash
  return user
}

// Get user by username
export function getUserByUsername(username) {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username)
}

// Get user permissions (from roles)
export function getUserPermissions(userId) {
  const rows = db.prepare(`
    SELECT r.permissions FROM roles r
    JOIN user_roles ur ON ur.role_id = r.id
    WHERE ur.user_id = ?
  `).all(userId)
  
  const perms = new Set()
  for (const row of rows) {
    const parsed = JSON.parse(row.permissions || '[]')
    for (const p of parsed) perms.add(p)
  }
  return [...perms]
}

// Check if user has specific permission
export function userHasPermission(userId, permissionName) {
  const perms = getUserPermissions(userId)
  if (perms.includes('perm_system_admin')) return true
  return perms.includes(permissionName)
}

// Check if user has any of the given permissions
export function userHasAnyPermission(userId, permissionNames) {
  const perms = getUserPermissions(userId)
  if (perms.includes('perm_system_admin')) return true
  return permissionNames.some(p => perms.includes(p))
}

// Get user's roles
export function getUserRoles(userId) {
  const rows = db.prepare(`
    SELECT r.*, ur.granted_at, ur.granted_by,
           u.display_name as granted_by_name
    FROM roles r
    JOIN user_roles ur ON ur.role_id = r.id
    LEFT JOIN users u ON u.id = ur.granted_by
    WHERE ur.user_id = ?
  `).all(userId)
  return rows.map(r => ({ ...r, permissions: JSON.parse(r.permissions || '[]') }))
}

// Create session
export function createSession(userId, ipAddress = null, userAgent = null) {
  const token = generateToken()
  const tokenHash = hashToken(token)
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days

  db.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, ip_address, user_agent, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(randomUUID(), userId, tokenHash, ipAddress, userAgent, expiresAt)

  // Update last login
  db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(Date.now(), userId)

  return { token, expiresAt }
}

// Validate session token
export function validateSession(token) {
  if (!token) return null
  const tokenHash = hashToken(token)
  const session = db.prepare(`
    SELECT s.*, u.username, u.display_name, u.role, u.status as user_status, u.email, u.avatar
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ?
  `).get(tokenHash, Date.now())

  if (!session) return null
  if (session.user_status !== 'active') return null

  const permissions = getUserPermissions(session.user_id)
  return {
    sessionId: session.id,
    userId: session.user_id,
    username: session.username,
    displayName: session.display_name || session.username,
    role: session.role,
    userStatus: session.user_status,
    email: session.email,
    avatar: session.avatar,
    permissions,
    expiresAt: session.expires_at,
  }
}

// Invalidate session
export function invalidateSession(token) {
  if (!token) return false
  const tokenHash = hashToken(token)
  const result = db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash)
  return result.changes > 0
}

// Invalidate all sessions for a user
export function invalidateAllUserSessions(userId) {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId)
}

// Clean up expired sessions
export function cleanupExpiredSessions() {
  const result = db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now())
  return result.changes
}






// RBAC middleware factory
export function requirePermission(permissionName) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ ok: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' })
    }
    if (!userHasPermission(req.auth.userId, permissionName)) {
      createAuditLog({
        userId: req.auth.userId,
        username: req.auth.username,
        action: 'ACCESS_DENIED',
        resource: permissionName.split(':')[0],
        details: { requiredPermission: permissionName, path: req.path },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'denied'
      })
      return res.status(403).json({ ok: false, error: 'Forbidden', code: 'PERMISSION_DENIED', required: permissionName })
    }
    next()
  }
}

export function requireAnyPermission(permissionNames) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ ok: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' })
    }
    if (!userHasAnyPermission(req.auth.userId, permissionNames)) {
      createAuditLog({
        userId: req.auth.userId,
        username: req.auth.username,
        action: 'ACCESS_DENIED',
        resource: 'mixed',
        details: { requiredPermissions: permissionNames, path: req.path },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        status: 'denied'
      })
      return res.status(403).json({ ok: false, error: 'Forbidden', code: 'PERMISSION_DENIED', required: permissionNames })
    }
    next()
  }
}

export function requireRole(roleName) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ ok: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' })
    }
    if (req.auth.role !== roleName && req.auth.role !== 'admin') {
      return res.status(403).json({ ok: false, error: 'Forbidden', code: 'ROLE_REQUIRED', required: roleName })
    }
    next()
  }
}

// Attach auth info to request from Bearer token or session token
export function attachAuth(req, res, next) {
  // Multi-auth: Bearer token (JWT-like) or session token
  let token = req.headers.authorization?.replace('Bearer ', '')

  // Fallback: query param token
  if (!token && req.query && req.query.token) {
    token = req.query.token
  }

  // Fallback: cookie
  if (!token && req.cookies && req.cookies.session_token) {
    token = req.cookies.session_token
  }

  if (!token) {
    req.auth = null
    return next()
  }

  const session = validateSession(token)
  req.auth = session
  next()
}

// Require auth middleware (user must be logged in)
export function requireAuth(req, res, next) {
  if (!req.auth) {
    return res.status(401).json({ ok: false, error: 'Unauthorized', code: 'AUTH_REQUIRED' })
  }
  next()
}

// Optional auth: attach user info if available but don't block
export function optionalAuth(req, res, next) {
  attachAuth(req, res, next)
}

// Audit Log functions (stub implementations for now)
// TODO: Move to database.js or implement properly
// Note: These are now re-exported from database.js above, so we remove the stubs
