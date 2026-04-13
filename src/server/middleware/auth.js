/**
 * Authentication Middleware
 * Provides authentication and authorization for API routes
 */

/**
 * @typedef {import('express').Request & {
 *   user?: {
 *     id: string
 *     username: string
 *     role: string
 *     permissions: string[]
 *   }
 * }} AuthRequest
 */

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

function isAuthenticated(req) {
  return Boolean(req?.user?.id)
}

function getUserPermissions(req) {
  return Array.isArray(req?.user?.permissions) ? req.user.permissions : []
}

function formatRoleLabel(role) {
  if (!role) {
    return 'Required'
  }

  return `${role.charAt(0).toUpperCase()}${role.slice(1)}`
}

/**
 * Middleware to check if user is authenticated
 * @param {AuthRequest} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function requireAuth(req, res, next) {
  if (!isAuthenticated(req)) {
    return respondUnauthorized(res)
  }

  next()
}

/**
 * Middleware to check if user has specific permission
 * @param {string} permission
 */
export function requirePermission(permission) {
  return (req, res, next) => {
    if (!isAuthenticated(req)) {
      return respondUnauthorized(res)
    }

    const permissions = getUserPermissions(req)
    if (!permissions.includes(permission) && !permissions.includes('*:*')) {
      return respondForbidden(res, `Insufficient permissions: ${permission} required`)
    }

    next()
  }
}

/**
 * Middleware to check if user has any of the specified permissions
 * @param {string[]} permissions
 */
export function requireAnyPermission(permissions) {
  return (req, res, next) => {
    if (!isAuthenticated(req)) {
      return respondUnauthorized(res)
    }

    const userPermissions = getUserPermissions(req)
    const hasPermission = permissions.some(
      permission => userPermissions.includes(permission) || userPermissions.includes('*:*')
    )

    if (!hasPermission) {
      return respondForbidden(
        res,
        `Insufficient permissions: one of [${permissions.join(', ')}] required`
      )
    }

    next()
  }
}

/**
 * Middleware to check if user has specific role
 * @param {string} role
 */
export function requireRole(role) {
  return (req, res, next) => {
    if (!isAuthenticated(req)) {
      return respondUnauthorized(res)
    }

    if (req.user.role !== role) {
      return respondForbidden(res, `${formatRoleLabel(role)} role required`)
    }

    next()
  }
}

/**
 * Optional authentication - attaches user if present, but doesn't require it
 * @param {AuthRequest} _req
 * @param {import('express').Response} _res
 * @param {import('express').NextFunction} next
 */
export function optionalAuth(_req, _res, next) {
  next()
}
