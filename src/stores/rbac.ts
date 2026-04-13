import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export type Role = 'admin' | 'operator' | 'viewer' | 'readonly'

export interface Permission {
  action: string
  resource: string
}

export interface User {
  id: string
  username: string
  role: Role
  avatar?: string
  createdAt?: string
}

// Role permissions mapping
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    // All actions allowed
    { action: '*', resource: '*' },
  ],
  operator: [
    // Read operations
    { action: 'read', resource: '*' },
    // Write operations except sensitive ones
    { action: 'write', resource: 'session' },
    { action: 'write', resource: 'cron' },
    { action: 'write', resource: 'chat' },
    { action: 'write', resource: 'model' },
    { action: 'write', resource: 'channel' },
    { action: 'write', resource: 'skill' },
    { action: 'write', resource: 'agent' },
    { action: 'write', resource: 'memory' },
    { action: 'write', resource: 'file' },
    { action: 'write', resource: 'terminal' },
    { action: 'write', resource: 'backup' },
    // No delete operations
    // No system config changes
  ],
  readonly: [
    // Read only
    { action: 'read', resource: '*' },
  ],
  viewer: [
    // Read only
    { action: 'read', resource: '*' },
  ],
}

// Actions that require admin role
const ADMIN_ONLY_ACTIONS = new Set([
  'delete',
  'reset',
  'system.write',
  'config.write',
  'user.write',
  'user.delete',
  'backup.restore',
])

const AUTH_TOKEN_KEY = 'rbac_user'

export const useRbacStore = defineStore('rbac', () => {
  const currentUser = ref<User | null>(null)
  const users = ref<User[]>([])
  const loading = ref(false)

  const isAuthenticated = computed(() => !!currentUser.value)

  const role = computed<Role | null>(() => currentUser.value?.role || null)

  const isAdmin = computed(() => role.value === 'admin')
  const isOperator = computed(() => role.value === 'operator')
  const isReadonly = computed(() => role.value === 'readonly' || role.value === 'viewer')

  function setUser(user: User | null) {
    currentUser.value = user
    if (user) {
      localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY)
    }
  }

  function loadUser() {
    const stored = localStorage.getItem(AUTH_TOKEN_KEY)
    if (stored) {
      try {
        currentUser.value = JSON.parse(stored)
      } catch {
        localStorage.removeItem(AUTH_TOKEN_KEY)
      }
    }
  }

  function hasPermission(action: string, resource: string): boolean {
    const userRole = role.value
    if (!userRole) return false

    const perms = ROLE_PERMISSIONS[userRole]
    if (!perms) return false

    // Admin role has all permissions
    if (userRole === 'admin') return true

    // Check wildcard
    const wildcardIdx = perms.findIndex(p => p.action === '*' && p.resource === '*')
    if (wildcardIdx !== -1) return true

    // Check specific permission
    const matchIdx = perms.findIndex(p => p.action === action && p.resource === resource)
    if (matchIdx !== -1) return true

    // Check resource wildcard (e.g., action: 'read', resource: '*')
    const resourceWildcardIdx = perms.findIndex(p => p.action === action && p.resource === '*')
    if (resourceWildcardIdx !== -1) return true

    // Check action wildcard (e.g., action: '*', resource: 'session')
    const actionWildcardIdx = perms.findIndex(p => p.action === '*' && p.resource === resource)
    if (actionWildcardIdx !== -1) return true

    return false
  }

  function canDo(action: string, resource: string): boolean {
    // Admin-only actions check
    const isAdminOnly = ADMIN_ONLY_ACTIONS.has(`${action}.${resource}`) ||
      ADMIN_ONLY_ACTIONS.has(resource) ||
      ADMIN_ONLY_ACTIONS.has(action)

    if (isAdminOnly && role.value !== 'admin') {
      return false
    }

    return hasPermission(action, resource)
  }

  function canRead(resource: string): boolean {
    return canDo('read', resource)
  }

  function canWrite(resource: string): boolean {
    return canDo('write', resource)
  }

  function canDelete(resource: string): boolean {
    return canDo('delete', resource)
  }

  // Permission check helper for template use
  function check(action: string, resource: string): boolean {
    return canDo(action, resource)
  }

  return {
    currentUser,
    users,
    loading,
    isAuthenticated,
    role,
    isAdmin,
    isOperator,
    isReadonly,
    setUser,
    loadUser,
    hasPermission,
    canDo,
    canRead,
    canWrite,
    canDelete,
    check,
  }
})
