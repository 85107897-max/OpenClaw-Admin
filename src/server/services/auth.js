/**
 * Auth Service
 * Handles authentication, session management, and password hashing
 */

import { createHash, pbkdf2Sync, randomBytes, randomUUID, timingSafeEqual } from 'crypto'

const SALT_BYTES = 32
const HASH_BYTES = 32
const HASH_ITERATIONS = 100000
const SALT_HEX_LENGTH = SALT_BYTES * 2
const PASSWORD_HASH_HEX_LENGTH = HASH_BYTES * 2

// Rate limiting stores
const loginAttempts = new Map()
const apiRateLimits = new Map()
const bruteForceTracker = new Map()

const LOGIN_MAX_ATTEMPTS = 5
const LOGIN_LOCKOUT_DURATION = 15 * 60 * 1000
const LOGIN_ATTEMPT_WINDOW = 15 * 60 * 1000
const API_RATE_WINDOW = 60 * 1000
const API_RATE_MAX = 100
const BRUTE_FORCE_THRESHOLD = 200
const BRUTE_FORCE_WINDOW = 5 * 60 * 1000

// In-memory session storage
const sessions = new Map()

function normalizeSalt(salt) {
  if (typeof salt === 'string' && /^[0-9a-f]{64}$/i.test(salt)) {
    return salt.toLowerCase()
  }

  if (typeof salt === 'string' && salt.length > 0) {
    return createHash('sha256').update(salt).digest('hex')
  }

  return randomBytes(SALT_BYTES).toString('hex')
}

function splitPasswordHash(hash) {
  if (typeof hash !== 'string' || hash.length !== SALT_HEX_LENGTH + PASSWORD_HASH_HEX_LENGTH) {
    return null
  }

  return {
    salt: hash.slice(0, SALT_HEX_LENGTH),
    digest: hash.slice(SALT_HEX_LENGTH)
  }
}

/**
 * Hash password with salt
 * The stored format is a fixed-width 128-char hex string:
 * 64 chars of salt + 64 chars of derived hash.
 * @param {string} password
 * @param {string=} salt
 */
export function hashPassword(password, salt = randomBytes(SALT_BYTES).toString('hex')) {
  const saltHex = normalizeSalt(salt)
  const digest = pbkdf2Sync(password, saltHex, HASH_ITERATIONS, HASH_BYTES, 'sha256').toString('hex')
  return `${saltHex}${digest}`
}

/**
 * Verify password against hash
 * @param {string} password
 * @param {string} hash
 */
export function verifyPassword(password, hash) {
  const parts = splitPasswordHash(hash)
  if (!parts) {
    return false
  }

  const computedHash = hashPassword(password, parts.salt)
  const expectedBuffer = Buffer.from(hash, 'hex')
  const computedBuffer = Buffer.from(computedHash, 'hex')

  if (expectedBuffer.length !== computedBuffer.length) {
    return false
  }

  return timingSafeEqual(expectedBuffer, computedBuffer)
}

/**
 * Generate session token
 * @param {number=} length
 */
export function generateToken(length = 64) {
  const normalizedLength = Number.isFinite(length) ? Math.max(1, Math.floor(length)) : 64
  return randomBytes(Math.ceil(normalizedLength / 2)).toString('hex').slice(0, normalizedLength)
}

/**
 * Hash token for storage
 * @param {string} token
 */
export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Create session
 * @param {string} userId
 * @param {string} ipAddress
 * @param {string} userAgent
 */
export function createSession(userId, ipAddress, userAgent) {
  const token = generateToken()
  const now = Date.now()

  const session = {
    id: randomUUID(),
    userId,
    token: hashToken(token),
    createdAt: now,
    expiresAt: now + 24 * 60 * 60 * 1000,
    ipAddress,
    userAgent
  }

  sessions.set(session.id, session)
  return { ...session, token }
}

/**
 * Validate session
 * @param {string} token
 */
export function validateSession(token) {
  const hashedToken = hashToken(token)

  for (const session of sessions.values()) {
    if (session.token === hashedToken) {
      if (Date.now() > session.expiresAt) {
        sessions.delete(session.id)
        return null
      }

      return session
    }
  }

  return null
}

/**
 * Invalidate session
 * @param {string} sessionId
 */
export function invalidateSession(sessionId) {
  return sessions.delete(sessionId)
}

/**
 * Invalidate all user sessions
 * @param {string} userId
 */
export function invalidateAllUserSessions(userId) {
  let count = 0

  for (const [id, session] of sessions.entries()) {
    if (session.userId === userId) {
      sessions.delete(id)
      count += 1
    }
  }

  return count
}

/**
 * Check login attempts
 * @param {string} username
 */
export function checkLoginAttempts(username) {
  const record = loginAttempts.get(username)
  if (!record) {
    return { locked: false, attempts: 0 }
  }

  const now = Date.now()
  if (record.lockedUntil && now > record.lockedUntil) {
    loginAttempts.delete(username)
    return { locked: false, attempts: 0 }
  }

  if (record.lockedUntil) {
    return {
      locked: true,
      attempts: record.attempts,
      lockedUntil: record.lockedUntil,
      remainingMs: record.lockedUntil - now
    }
  }

  if (record.windowStart && now > record.windowStart + LOGIN_ATTEMPT_WINDOW) {
    loginAttempts.delete(username)
    return { locked: false, attempts: 0 }
  }

  return { locked: false, attempts: record.attempts }
}

/**
 * Record failed login attempt
 * @param {string} username
 * @param {string} _ipAddress
 */
export function recordFailedLogin(username, _ipAddress) {
  const now = Date.now()
  const record = loginAttempts.get(username)

  if (!record || now > record.windowStart + LOGIN_ATTEMPT_WINDOW) {
    loginAttempts.set(username, { attempts: 1, windowStart: now })
    return
  }

  record.attempts += 1
  if (record.attempts >= LOGIN_MAX_ATTEMPTS) {
    record.lockedUntil = now + LOGIN_LOCKOUT_DURATION
  }

  loginAttempts.set(username, record)
}

/**
 * Record successful login
 * @param {string} username
 */
export function recordSuccessfulLogin(username) {
  loginAttempts.delete(username)
}

/**
 * Check API rate limit
 * @param {string} ipAddress
 * @param {string} endpoint
 */
export function checkApiRateLimit(ipAddress, endpoint) {
  const key = `${ipAddress}:${endpoint}`
  const now = Date.now()
  const record = apiRateLimits.get(key)

  if (!record || now > record.windowStart + API_RATE_WINDOW) {
    apiRateLimits.set(key, { count: 1, windowStart: now })
    return { allowed: true, remaining: API_RATE_MAX - 1 }
  }

  if (record.count >= API_RATE_MAX) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((record.windowStart + API_RATE_WINDOW - now) / 1000)
    }
  }

  record.count += 1
  apiRateLimits.set(key, record)
  return { allowed: true, remaining: API_RATE_MAX - record.count }
}

/**
 * Check brute force protection
 * @param {string} ipAddress
 */
export function checkBruteForce(ipAddress) {
  const now = Date.now()
  const record = bruteForceTracker.get(ipAddress)

  if (!record) {
    bruteForceTracker.set(ipAddress, { count: 1, windowStart: now })
    return true
  }

  if (record.releaseAt && now < record.releaseAt) {
    return false
  }

  if (record.releaseAt && now >= record.releaseAt) {
    bruteForceTracker.set(ipAddress, { count: 1, windowStart: now })
    return true
  }

  if (now > record.windowStart + BRUTE_FORCE_WINDOW) {
    bruteForceTracker.set(ipAddress, { count: 1, windowStart: now })
    return true
  }

  record.count += 1
  if (record.count >= BRUTE_FORCE_THRESHOLD) {
    record.releaseAt = now + BRUTE_FORCE_WINDOW * 2
    bruteForceTracker.set(ipAddress, record)
    return false
  }

  bruteForceTracker.set(ipAddress, record)
  return true
}

/**
 * Get session by ID
 * @param {string} sessionId
 */
export function getSession(sessionId) {
  return sessions.get(sessionId) || null
}

/**
 * Get all sessions for user
 * @param {string} userId
 */
export function getUserSessions(userId) {
  return Array.from(sessions.values()).filter(session => session.userId === userId)
}

/**
 * Cleanup expired sessions
 */
export function cleanupExpiredSessions() {
  const now = Date.now()
  let count = 0

  for (const [id, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      sessions.delete(id)
      count += 1
    }
  }

  return count
}

/**
 * Test helper to clear in-memory state between specs.
 */
export function __resetAuthStateForTests() {
  loginAttempts.clear()
  apiRateLimits.clear()
  bruteForceTracker.clear()
  sessions.clear()
}
