/**
 * Audit Logging Middleware
 * Provides audit trail for all API operations
 */

import { randomUUID } from 'crypto'

/**
 * Get client IP address
 * @param {import('express').Request} req
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim()
  }

  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0]
  }

  const realIp = req.headers['x-real-ip']
  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim()
  }

  if (Array.isArray(realIp) && realIp.length > 0) {
    return realIp[0]
  }

  return req.socket?.remoteAddress || req.ip || 'unknown'
}

/**
 * Middleware to log API operations
 * @param {string} action
 * @param {string} resource
 */
export function auditLog(action, resource) {
  return async (req, res, next) => {
    const startTime = Date.now()
    const user = req?.user
    const logEntry = {
      id: randomUUID(),
      userId: user?.id,
      username: user?.username,
      action,
      resource,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'],
      status: 'success',
      createdAt: startTime
    }

    let logFlushed = false
    const originalSend = res.send.bind(res)
    res.send = function sendWithAudit(data) {
      if (res.statusCode >= 400) {
        logEntry.status = 'failure'
        logEntry.errorMessage = res.statusCode === 401
          ? 'Unauthorized'
          : res.statusCode === 403
            ? 'Forbidden'
            : res.statusCode === 404
              ? 'Not Found'
              : `HTTP ${res.statusCode}`
      }

      if (!logFlushed) {
        addAuditLog(logEntry)
        logFlushed = true
      }

      return originalSend(data)
    }

    if (req.params?.id) {
      logEntry.resourceId = req.params.id
    }

    next()
  }
}

/**
 * Simple in-memory audit log store (replace with database in production)
 */
const auditLogs = []
const MAX_AUDIT_LOGS = 10000

/**
 * Add audit log entry
 * @param {object} log
 */
export function addAuditLog(log) {
  auditLogs.unshift(log)
  if (auditLogs.length > MAX_AUDIT_LOGS) {
    auditLogs.pop()
  }
}

/**
 * Get audit logs with pagination
 * @param {{
 *   userId?: string
 *   resource?: string
 *   action?: string
 *   status?: string
 *   page?: number
 *   limit?: number
 *   startTime?: number
 *   endTime?: number
 * }=} options
 */
export function getAuditLogs(options = {}) {
  let logs = [...auditLogs]

  if (options.userId) {
    logs = logs.filter(log => log.userId === options.userId)
  }
  if (options.resource) {
    logs = logs.filter(log => log.resource === options.resource)
  }
  if (options.action) {
    logs = logs.filter(log => log.action === options.action)
  }
  if (options.status) {
    logs = logs.filter(log => log.status === options.status)
  }
  if (typeof options.startTime === 'number') {
    logs = logs.filter(log => log.createdAt >= options.startTime)
  }
  if (typeof options.endTime === 'number') {
    logs = logs.filter(log => log.createdAt <= options.endTime)
  }

  const page = options.page || 1
  const limit = options.limit || 50
  const start = (page - 1) * limit
  const end = start + limit

  return logs.slice(start, end)
}

/**
 * Get audit log count
 * @param {{
 *   userId?: string
 *   resource?: string
 *   action?: string
 *   status?: string
 * }=} options
 */
export function getAuditLogsCount(options = {}) {
  let logs = [...auditLogs]

  if (options.userId) {
    logs = logs.filter(log => log.userId === options.userId)
  }
  if (options.resource) {
    logs = logs.filter(log => log.resource === options.resource)
  }
  if (options.action) {
    logs = logs.filter(log => log.action === options.action)
  }
  if (options.status) {
    logs = logs.filter(log => log.status === options.status)
  }

  return logs.length
}

/**
 * Export audit logs as CSV
 * @param {Array<{
 *   id: string
 *   userId?: string
 *   username?: string
 *   action: string
 *   resource: string
 *   resourceId?: string
 *   status: string
 *   ipAddress?: string
 *   createdAt: number
 * }>} logs
 */
export function exportAuditLogsAsCSV(logs) {
  const headers = ['ID', 'User ID', 'Username', 'Action', 'Resource', 'Resource ID', 'Status', 'IP Address', 'Timestamp']
  const rows = logs.map(log => [
    log.id,
    log.userId || '',
    log.username || '',
    log.action,
    log.resource,
    log.resourceId || '',
    log.status,
    log.ipAddress || '',
    new Date(log.createdAt).toISOString()
  ])

  return [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n')
}
