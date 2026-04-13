/**
 * RBAC Middleware
 * Provides role-based access control for API routes
 */

// Role hierarchy (higher number = more permissions)
const ROLE_HIERARCHY = {
  readonly: 10,
  viewer: 10,
  operator: 20,
  admin: 30
}

/**
 * Permission definitions by resource
 */
const PERMISSIONS = {
  users: ['read', 'write', 'delete'],
  agents: ['read', 'write', 'delete', 'manage'],
  sessions: ['read', 'write', 'delete'],
  channels: ['read', 'write', 'delete'],
  config: ['read', 'write'],
  backup: ['read', 'write', 'restore'],
  audit: ['read'],
  notifications: ['read', 'write', 'delete'],
  office: ['read', 'write', 'execute'],
  myworld: ['read', 'write', 'manage'],
  roles: ['read', 'write', 'delete'],
  permissions: ['read']
}

/**
 * Role to permissions mapping
 */
const ROLE_PERMISSIONS = {
  admin: ['*:*'],
  operator: [
    'users:read',
    'agents:read', 'agents:write',
    'sessions:read', 'sessions:write',
    'channels:read', 'channels:write',
    'config:read', 'config:write',
    'backup:read',
    'audit:read',
    'notifications:read', 'notifications:write', 'notifications:delete',
    'office:read', 'office:write', 'office:execute',
    'myworld:read', 'myworld:write'
  ],
  viewer: [
    'users:read',
    'agents:read',
    'sessions:read',
    'channels:read',
    'config:read',
    'backup:read',
    'audit:read',
    'notifications:read',
    'office:read',
    'myworld:read'
  ],
  readonly: [
    'users:read',
    'agents:read',
    'sessions:read',
    'channels:read',
    'config:read',
    'backup:read',
    'audit:read',
    'notifications:read',
    'office:read',
    'myworld:read'
  ]
}

function getUserPermissions(user) {
  if (!user?.role) {
    return []
  }

  if (Array.isArray(user.permissions) && user.permissions.length > 0) {
    return user.permissions
  }

  return ROLE_PERMISSIONS[user.role] || []
}

function getRequestUser(req) {
  return req?.user
}

function respondUnauthorized(res) {
  return res.status(401).json({
    success: false,
    error: 'Unauthorized',
    message: 'Authentication required'
  })
}

function respondForbidden(res, message) {
  return res.status(403).json({
    success: false,
    error: 'Forbidden',
    message
  })
}

/**
 * Check if user has permission
 * @param {{ role?: string, permissions?: string[] } | null | undefined} user
 * @param {string} resource
 * @param {string} action
 */
export function hasPermission(user, resource, action) {
  if (!user?.role) {
    return false
  }

  const userPermissions = getUserPermissions(user)
  if (userPermissions.includes('*:*')) {
    return true
  }

  return userPermissions.includes(`${resource}:${action}`)
}

/**
 * Check if user can perform action on resource
 * @param {{ role?: string, permissions?: string[] } | null | undefined} user
 * @param {string} resource
 * @param {string} action
 */
export function canDo(user, resource, action) {
  return hasPermission(user, resource, action)
}

/**
 * Check if user has role or higher
 * @param {{ role?: string } | null | undefined} user
 * @param {string} requiredRole
 */
export function hasRoleOrHigher(user, requiredRole) {
  if (!user?.role) {
    return false
  }

  const userLevel = ROLE_HIERARCHY[user.role] || 0
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0
  return userLevel >= requiredLevel
}

/**
 * Middleware to require specific permission
 * @param {string} permission
 */
export function requirePermissionMiddleware(permission) {
  return (req, res, next) => {
    const user = getRequestUser(req)
    if (!user?.id) {
      return respondUnauthorized(res)
    }

    const [resource, action] = permission.split(':')
    if (!hasPermission(user, resource, action)) {
      return respondForbidden(res, `Insufficient permissions: ${permission} required`)
    }

    next()
  }
}

/**
 * Middleware to require admin role
 */
export function requireAdmin(req, res, next) {
  const user = getRequestUser(req)
  if (!user?.id) {
    return respondUnauthorized(res)
  }

  if (user.role !== 'admin') {
    return respondForbidden(res, 'Admin role required')
  }

  next()
}

/**
 * Middleware to require operator role or higher
 */
export function requireOperator(req, res, next) {
  const user = getRequestUser(req)
  if (!user?.id) {
    return respondUnauthorized(res)
  }

  if (!hasRoleOrHigher(user, 'operator')) {
    return respondForbidden(res, 'Operator role or higher required')
  }

  next()
}

/**
 * Get all permissions for a role
 * @param {string} role
 */
export function getRolePermissions(role) {
  return [...(ROLE_PERMISSIONS[role] || [])]
}

/**
 * Get all available permissions
 */
export function getAllPermissions() {
  const permissions = []

  for (const [resource, actions] of Object.entries(PERMISSIONS)) {
    for (const action of actions) {
      permissions.push(`${resource}:${action}`)
    }
  }

  return permissions
}
