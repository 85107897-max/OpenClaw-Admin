/**
 * RBAC Service
 * Handles role-based access control
 */

import { getAllPermissions, getRolePermissions, hasPermission } from '../middleware/rbac.js'

// In-memory storage (replace with database in production)
const users = new Map()
const roles = new Map()

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

// Initialize default roles
function initializeDefaultRoles() {
  roles.clear()

  roles.set('admin', {
    id: 'admin',
    name: 'admin',
    description: 'Administrator with full access',
    permissions: ['*:*'],
    createdAt: Date.now()
  })

  roles.set('operator', {
    id: 'operator',
    name: 'operator',
    description: 'Operator with limited write access',
    permissions: [
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
    createdAt: Date.now()
  })

  roles.set('viewer', {
    id: 'viewer',
    name: 'viewer',
    description: 'Viewer with read-only access',
    permissions: [
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
    createdAt: Date.now()
  })

  roles.set('readonly', {
    id: 'readonly',
    name: 'readonly',
    description: 'Read-only access',
    permissions: [
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
    createdAt: Date.now()
  })
}

initializeDefaultRoles()

/**
 * Get user by ID
 * @param {string} userId
 */
export function getUserById(userId) {
  return users.get(userId) || null
}

/**
 * Get user by username
 * @param {string} username
 */
export function getUserByUsername(username) {
  return Array.from(users.values()).find(user => user.username === username) || null
}

/**
 * Create user
 * @param {object} user
 */
export function createUser(user) {
  const userId = createId('user')
  const now = Date.now()
  const newUser = {
    ...user,
    id: userId,
    createdAt: now,
    updatedAt: now
  }

  users.set(userId, newUser)
  return newUser
}

/**
 * Update user
 * @param {string} userId
 * @param {object} updates
 */
export function updateUser(userId, updates) {
  const user = users.get(userId)
  if (!user) {
    return null
  }

  const updatedUser = {
    ...user,
    ...updates,
    updatedAt: Date.now()
  }

  users.set(userId, updatedUser)
  return updatedUser
}

/**
 * Delete user
 * @param {string} userId
 */
export function deleteUser(userId) {
  return users.delete(userId)
}

/**
 * Get all users
 */
export function getAllUsers() {
  return Array.from(users.values())
}

/**
 * Get user permissions
 * @param {string} userId
 */
export function getUserPermissions(userId) {
  const user = users.get(userId)
  if (!user) {
    return []
  }

  return getRolePermissions(user.role)
}

/**
 * Check if user has permission
 * @param {string} userId
 * @param {string} resource
 * @param {string} action
 */
export function userHasPermission(userId, resource, action) {
  const user = users.get(userId)
  if (!user) {
    return false
  }

  return hasPermission(user, resource, action)
}

/**
 * Check if user has any of the permissions
 * @param {string} userId
 * @param {string[]} permissions
 */
export function userHasAnyPermission(userId, permissions) {
  const user = users.get(userId)
  if (!user) {
    return false
  }

  return permissions.some(permission => {
    const [resource, action] = permission.split(':')
    return hasPermission(user, resource, action)
  })
}

/**
 * Get user roles
 * @param {string} userId
 */
export function getUserRoles(userId) {
  const user = users.get(userId)
  if (!user) {
    return []
  }

  return [user.role]
}

/**
 * Get role by ID
 * @param {string} roleId
 */
export function getRoleById(roleId) {
  return roles.get(roleId) || null
}

/**
 * Get all roles
 */
export function getAllRoles() {
  return Array.from(roles.values())
}

/**
 * Create role
 * @param {object} role
 */
export function createRole(role) {
  const roleId = createId('role')
  const now = Date.now()
  const newRole = {
    ...role,
    id: roleId,
    createdAt: now
  }

  roles.set(roleId, newRole)
  return newRole
}

/**
 * Update role permissions
 * @param {string} roleId
 * @param {string[]} permissions
 */
export function updateRolePermissions(roleId, permissions) {
  const role = roles.get(roleId)
  if (!role) {
    return null
  }

  role.permissions = permissions
  return role
}

/**
 * Delete role
 * @param {string} roleId
 */
export function deleteRole(roleId) {
  return roles.delete(roleId)
}

/**
 * Get all permissions
 */
export function getAvailablePermissions() {
  return getAllPermissions()
}

/**
 * Test helper to clear in-memory state.
 */
export function __resetRbacStateForTests() {
  users.clear()
  initializeDefaultRoles()
}
