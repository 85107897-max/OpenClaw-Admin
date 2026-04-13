/**
 * Test suite for RBAC middleware
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import * as rbacMiddleware from '../../../src/server/middleware/rbac.js'
const {
  hasPermission,
  canDo,
  hasRoleOrHigher,
  requirePermissionMiddleware,
  requireAdmin,
  requireOperator,
  getRolePermissions,
  getAllPermissions
} = rbacMiddleware

// Mock Express request/response
function createMockReqRes(user?: { id: string; username: string; role: string; permissions: string[] }) {
  const req = {
    user,
    headers: {},
    params: {},
    query: {}
  } as unknown as Request

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn()
  } as unknown as Response

  const next = vi.fn() as NextFunction

  return { req, res, next }
}

describe('RBAC Middleware', () => {
  describe('hasPermission', () => {
    it('should return true for admin with wildcard permission', () => {
      const user = { role: 'admin', permissions: ['*:*'] }
      expect(hasPermission(user, 'agents', 'delete')).toBe(true)
      expect(hasPermission(user, 'users', 'write')).toBe(true)
    })

    it('should return true for user with specific permission', () => {
      const user = { role: 'operator', permissions: ['agents:read', 'agents:write'] }
      expect(hasPermission(user, 'agents', 'read')).toBe(true)
      expect(hasPermission(user, 'agents', 'write')).toBe(true)
      expect(hasPermission(user, 'agents', 'delete')).toBe(false)
    })

    it('should return false for user without permission', () => {
      const user = { role: 'viewer', permissions: ['agents:read'] }
      expect(hasPermission(user, 'agents', 'write')).toBe(false)
      expect(hasPermission(user, 'agents', 'delete')).toBe(false)
    })

    it('should return false for null user', () => {
      expect(hasPermission(null as any, 'agents', 'read')).toBe(false)
    })
  })

  describe('canDo', () => {
    it('should delegate to hasPermission', () => {
      const user = { role: 'admin', permissions: ['*:*'] }
      expect(canDo(user, 'sessions', 'delete')).toBe(true)
    })
  })

  describe('hasRoleOrHigher', () => {
    it('should return true for same role', () => {
      expect(hasRoleOrHigher({ role: 'admin' }, 'admin')).toBe(true)
      expect(hasRoleOrHigher({ role: 'operator' }, 'operator')).toBe(true)
    })

    it('should return true for higher role', () => {
      expect(hasRoleOrHigher({ role: 'admin' }, 'operator')).toBe(true)
      expect(hasRoleOrHigher({ role: 'operator' }, 'viewer')).toBe(true)
    })

    it('should return false for lower role', () => {
      expect(hasRoleOrHigher({ role: 'viewer' }, 'operator')).toBe(false)
      expect(hasRoleOrHigher({ role: 'operator' }, 'admin')).toBe(false)
    })
  })

  describe('requirePermissionMiddleware', () => {
    it('should call next if user has permission', () => {
      const { req, res, next } = createMockReqRes({
        id: 'user_123',
        username: 'test',
        role: 'admin',
        permissions: ['*:*']
      })

      const middleware = requirePermissionMiddleware('agents:delete')
      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
    })

    it('should return 403 if user lacks permission', () => {
      const { req, res, next } = createMockReqRes({
        id: 'user_123',
        username: 'test',
        role: 'viewer',
        permissions: ['agents:read']
      })

      const middleware = requirePermissionMiddleware('agents:delete')
      middleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'Forbidden'
      }))
    })

    it('should return 401 if user is not authenticated', () => {
      const { req, res, next } = createMockReqRes()

      const middleware = requirePermissionMiddleware('agents:delete')
      middleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
    })
  })

  describe('requireAdmin', () => {
    it('should call next for admin user', () => {
      const { req, res, next } = createMockReqRes({
        id: 'user_123',
        username: 'test',
        role: 'admin',
        permissions: ['*:*']
      })

      requireAdmin(req, res, next)

      expect(next).toHaveBeenCalled()
    })

    it('should return 403 for non-admin user', () => {
      const { req, res, next } = createMockReqRes({
        id: 'user_123',
        username: 'test',
        role: 'operator',
        permissions: ['agents:write']
      })

      requireAdmin(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
    })
  })

  describe('requireOperator', () => {
    it('should call next for operator user', () => {
      const { req, res, next } = createMockReqRes({
        id: 'user_123',
        username: 'test',
        role: 'operator',
        permissions: ['agents:write']
      })

      requireOperator(req, res, next)

      expect(next).toHaveBeenCalled()
    })

    it('should call next for admin user', () => {
      const { req, res, next } = createMockReqRes({
        id: 'user_123',
        username: 'test',
        role: 'admin',
        permissions: ['*:*']
      })

      requireOperator(req, res, next)

      expect(next).toHaveBeenCalled()
    })

    it('should return 403 for viewer user', () => {
      const { req, res, next } = createMockReqRes({
        id: 'user_123',
        username: 'test',
        role: 'viewer',
        permissions: ['agents:read']
      })

      requireOperator(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
    })
  })

  describe('getRolePermissions', () => {
    it('should return permissions for admin role', () => {
      const permissions = getRolePermissions('admin')
      expect(permissions).toContain('*:*')
    })

    it('should return permissions for operator role', () => {
      const permissions = getRolePermissions('operator')
      expect(permissions).toContain('agents:read')
      expect(permissions).toContain('agents:write')
      expect(permissions).not.toContain('agents:delete')
    })

    it('should return empty array for unknown role', () => {
      const permissions = getRolePermissions('unknown')
      expect(permissions).toEqual([])
    })
  })

  describe('getAllPermissions', () => {
    it('should return all available permissions', () => {
      const permissions = getAllPermissions()
      expect(permissions).toContain('users:read')
      expect(permissions).toContain('users:write')
      expect(permissions).toContain('users:delete')
      expect(permissions).toContain('agents:manage')
    })
  })
})
