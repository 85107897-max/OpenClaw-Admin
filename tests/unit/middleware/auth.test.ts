/**
 * Test suite for auth middleware
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Request, Response } from 'express'
import * as authMiddleware from '../../../src/server/middleware/auth.js'
const { requireAuth, requirePermission, requireAnyPermission, requireRole } = authMiddleware

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

  const next = vi.fn()

  return { req, res, next }
}

describe('Auth Middleware', () => {
  describe('requireAuth', () => {
    it('should call next if user is authenticated', () => {
      const { req, res, next } = createMockReqRes({
        id: 'user_123',
        username: 'test',
        role: 'admin',
        permissions: ['*:*']
      })

      requireAuth(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    it('should return 401 if user is not authenticated', () => {
      const { req, res, next } = createMockReqRes()

      requireAuth(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'Unauthorized'
      }))
      expect(next).not.toHaveBeenCalled()
    })
  })

  describe('requirePermission', () => {
    it('should call next if user has permission', () => {
      const { req, res, next } = createMockReqRes({
        id: 'user_123',
        username: 'test',
        role: 'admin',
        permissions: ['*:*']
      })

      const middleware = requirePermission('agents:manage')
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

      const middleware = requirePermission('agents:delete')
      middleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'Forbidden'
      }))
    })

    it('should return 401 if user is not authenticated', () => {
      const { req, res, next } = createMockReqRes()

      const middleware = requirePermission('agents:manage')
      middleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
    })
  })

  describe('requireAnyPermission', () => {
    it('should call next if user has any of the permissions', () => {
      const { req, res, next } = createMockReqRes({
        id: 'user_123',
        username: 'test',
        role: 'operator',
        permissions: ['agents:read', 'agents:write']
      })

      const middleware = requireAnyPermission(['agents:delete', 'agents:write'])
      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
    })

    it('should return 403 if user has none of the permissions', () => {
      const { req, res, next } = createMockReqRes({
        id: 'user_123',
        username: 'test',
        role: 'viewer',
        permissions: ['agents:read']
      })

      const middleware = requireAnyPermission(['agents:delete', 'users:write'])
      middleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
    })
  })

  describe('requireRole', () => {
    it('should call next if user has required role', () => {
      const { req, res, next } = createMockReqRes({
        id: 'user_123',
        username: 'test',
        role: 'admin',
        permissions: ['*:*']
      })

      const middleware = requireRole('admin')
      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
    })

    it('should return 403 if user has different role', () => {
      const { req, res, next } = createMockReqRes({
        id: 'user_123',
        username: 'test',
        role: 'operator',
        permissions: ['agents:write']
      })

      const middleware = requireRole('admin')
      middleware(req, res, next)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: 'Forbidden',
        message: 'Admin role required'
      }))
    })
  })
})
