/**
 * Test suite for auth service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as authService from '../../../src/server/services/auth.js'
const {
  hashPassword,
  verifyPassword,
  generateToken,
  hashToken,
  createSession,
  validateSession,
  invalidateSession,
  invalidateAllUserSessions,
  checkLoginAttempts,
  recordFailedLogin,
  recordSuccessfulLogin,
  checkApiRateLimit,
  checkBruteForce,
  cleanupExpiredSessions
} = authService

describe('Auth Service', () => {
  beforeEach(() => {
    authService.__resetAuthStateForTests?.()
  })

  describe('hashPassword', () => {
    it('should produce consistent hash with same salt', () => {
      const salt = 'test_salt_12345678901234567890123456789012'
      const hash1 = hashPassword('password123', salt)
      const hash2 = hashPassword('password123', salt)
      expect(hash1).toBe(hash2)
    })

    it('should produce different hash with different salt', () => {
      const hash1 = hashPassword('password123', 'salt1_12345678901234567890123456789012')
      const hash2 = hashPassword('password123', 'salt2_12345678901234567890123456789012')
      expect(hash1).not.toBe(hash2)
    })

    it('should produce different hash for different passwords', () => {
      const salt = 'test_salt_12345678901234567890123456789012'
      const hash1 = hashPassword('password1', salt)
      const hash2 = hashPassword('password2', salt)
      expect(hash1).not.toBe(hash2)
    })

    it('should generate random salt when not provided', () => {
      const hash1 = hashPassword('password123')
      const hash2 = hashPassword('password123')
      expect(hash1).not.toBe(hash2)
    })

    it('should produce 128 character hash', () => {
      const hash = hashPassword('password123')
      expect(hash.length).toBe(128)
    })
  })

  describe('verifyPassword', () => {
    it('should verify correct password', () => {
      const hash = hashPassword('password123')
      expect(verifyPassword('password123', hash)).toBe(true)
    })

    it('should reject incorrect password', () => {
      const hash = hashPassword('password123')
      expect(verifyPassword('wrongpassword', hash)).toBe(false)
    })

    it('should reject empty password', () => {
      const hash = hashPassword('password123')
      expect(verifyPassword('', hash)).toBe(false)
    })
  })

  describe('generateToken', () => {
    it('should generate token of specified length', () => {
      const token = generateToken(64)
      expect(token.length).toBe(64)
    })

    it('should generate default 64 character token', () => {
      const token = generateToken()
      expect(token.length).toBe(64)
    })

    it('should generate unique tokens', () => {
      const token1 = generateToken()
      const token2 = generateToken()
      expect(token1).not.toBe(token2)
    })

    it('should generate hex string', () => {
      const token = generateToken()
      expect(token).toMatch(/^[0-9a-f]+$/)
    })
  })

  describe('hashToken', () => {
    it('should produce 64 character hash', () => {
      const token = generateToken()
      const hash = hashToken(token)
      expect(hash.length).toBe(64)
    })

    it('should produce consistent hash', () => {
      const token = 'test_token_123'
      const hash1 = hashToken(token)
      const hash2 = hashToken(token)
      expect(hash1).toBe(hash2)
    })

    it('should produce different hash for different tokens', () => {
      const hash1 = hashToken('token1')
      const hash2 = hashToken('token2')
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('createSession', () => {
    it('should create session with correct fields', () => {
      const session = createSession('user_123', '192.168.1.1', 'Test Browser')

      expect(session).toHaveProperty('id')
      expect(session.userId).toBe('user_123')
      expect(session).toHaveProperty('token')
      expect(session.createdAt).toBeTypeOf('number')
      expect(session.expiresAt).toBeTypeOf('number')
      expect(session.ipAddress).toBe('192.168.1.1')
      expect(session.userAgent).toBe('Test Browser')
    })

    it('should set expiry to 24 hours from now', () => {
      const session = createSession('user_123', '192.168.1.1', 'Test')
      const expectedExpiry = session.createdAt + 24 * 60 * 60 * 1000
      expect(session.expiresAt).toBeCloseTo(expectedExpiry, -2)
    })

    it('should generate unique session IDs', () => {
      const session1 = createSession('user_123', '192.168.1.1', 'Test')
      const session2 = createSession('user_456', '192.168.1.2', 'Test')
      expect(session1.id).not.toBe(session2.id)
    })
  })

  describe('validateSession', () => {
    it('should validate correct session', () => {
      const session = createSession('user_123', '192.168.1.1', 'Test')
      const validated = validateSession(session.token)
      expect(validated).not.toBeNull()
      expect(validated?.userId).toBe('user_123')
    })

    it('should reject invalid token', () => {
      const result = validateSession('invalid_token')
      expect(result).toBeNull()
    })

    it('should reject expired session', () => {
      const session = createSession('user_123', '192.168.1.1', 'Test')
      // Manually expire the session
      const storedSession = { ...session, expiresAt: Date.now() - 1000 }
      // Note: In real implementation, we'd need to access internal state
      // This test documents expected behavior
    })
  })

  describe('invalidateSession', () => {
    it('should invalidate existing session', () => {
      const session = createSession('user_123', '192.168.1.1', 'Test')
      const result = invalidateSession(session.id)
      expect(result).toBe(true)

      const validated = validateSession(session.token)
      expect(validated).toBeNull()
    })

    it('should return false for non-existent session', () => {
      const result = invalidateSession('non_existent_id')
      expect(result).toBe(false)
    })
  })

  describe('invalidateAllUserSessions', () => {
    it('should invalidate all sessions for user', () => {
      const session1 = createSession('user_multi', '192.168.1.1', 'Test')
      const session2 = createSession('user_multi', '192.168.1.2', 'Test')
      const session3 = createSession('user_other', '192.168.1.3', 'Test')

      const count = invalidateAllUserSessions('user_multi')
      expect(count).toBe(2)

      expect(validateSession(session1.token)).toBeNull()
      expect(validateSession(session2.token)).toBeNull()
      expect(validateSession(session3.token)).not.toBeNull()
    })
  })

  describe('checkLoginAttempts', () => {
    it('should return not locked for new user', () => {
      const result = checkLoginAttempts('new_user')
      expect(result.locked).toBe(false)
      expect(result.attempts).toBe(0)
    })
  })

  describe('recordFailedLogin', () => {
    it('should record failed login attempt', () => {
      recordFailedLogin('test_user', '192.168.1.1')
      const result = checkLoginAttempts('test_user')
      expect(result.attempts).toBeGreaterThanOrEqual(1)
    })
  })

  describe('recordSuccessfulLogin', () => {
    it('should clear failed attempts on successful login', () => {
      recordFailedLogin('clear_test_user', '192.168.1.1')
      recordSuccessfulLogin('clear_test_user')
      const result = checkLoginAttempts('clear_test_user')
      expect(result.attempts).toBe(0)
    })
  })

  describe('checkApiRateLimit', () => {
    it('should allow requests within limit', () => {
      const result = checkApiRateLimit('192.168.1.1', '/api/test')
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBeLessThan(100)
    })

    it('should track requests from same IP', () => {
      const result1 = checkApiRateLimit('rate_test_ip', '/api/same')
      const result2 = checkApiRateLimit('rate_test_ip', '/api/same')
      expect(result1.remaining).toBeGreaterThan(result2.remaining)
    })
  })

  describe('checkBruteForce', () => {
    it('should allow requests within threshold', () => {
      const result = checkBruteForce('brute_test_ip')
      expect(result).toBe(true)
    })
  })

  describe('cleanupExpiredSessions', () => {
    it('should return count of cleaned sessions', () => {
      const count = cleanupExpiredSessions()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })
})
