import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useRbacStore } from '../../src/stores/rbac'

// Polyfill localStorage for happy-dom
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })

describe('RBAC Store - Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  describe('Role-based Permission Checks', () => {
    it('admin role has all permissions', () => {
      const store = useRbacStore()
      store.setUser({ id: '1', username: 'admin', role: 'admin' })
      
      expect(store.isAdmin).toBe(true)
      expect(store.isOperator).toBe(false)
      expect(store.isReadonly).toBe(false)
      expect(store.hasPermission('read', 'anything')).toBe(true)
      expect(store.hasPermission('write', 'anything')).toBe(true)
      expect(store.hasPermission('delete', 'anything')).toBe(true)
      expect(store.hasPermission('*', '*')).toBe(true)
    })

    it('operator role has limited permissions', () => {
      const store = useRbacStore()
      store.setUser({ id: '2', username: 'operator', role: 'operator' })
      
      expect(store.isOperator).toBe(true)
      expect(store.isAdmin).toBe(false)
      
      // Operator can read everything
      expect(store.hasPermission('read', 'session')).toBe(true)
      expect(store.hasPermission('read', 'cron')).toBe(true)
      expect(store.hasPermission('read', 'config')).toBe(true)
      
      // Operator can write to allowed resources
      expect(store.hasPermission('write', 'session')).toBe(true)
      expect(store.hasPermission('write', 'cron')).toBe(true)
      expect(store.hasPermission('write', 'chat')).toBe(true)
      
      // Operator cannot delete
      expect(store.hasPermission('delete', 'session')).toBe(false)
      expect(store.hasPermission('delete', 'backup')).toBe(false)
      
      // Operator cannot do admin-only actions
      expect(store.canDo('delete', 'system')).toBe(false)
      expect(store.canDo('config.write', 'system')).toBe(false)
    })

    it('readonly role can only read', () => {
      const store = useRbacStore()
      store.setUser({ id: '3', username: 'readonly', role: 'readonly' })
      
      expect(store.isReadonly).toBe(true)
      expect(store.hasPermission('read', 'session')).toBe(true)
      expect(store.hasPermission('write', 'session')).toBe(false)
      expect(store.hasPermission('delete', 'session')).toBe(false)
    })

    it('viewer role is treated as read-only access', () => {
      const store = useRbacStore()
      store.setUser({ id: '4', username: 'viewer', role: 'viewer' })

      expect(store.isReadonly).toBe(true)
      expect(store.hasPermission('read', 'session')).toBe(true)
      expect(store.hasPermission('write', 'session')).toBe(false)
      expect(store.hasPermission('delete', 'session')).toBe(false)
    })

    it('unauthenticated user has no permissions', () => {
      const store = useRbacStore()
      store.setUser(null)
      
      expect(store.isAuthenticated).toBe(false)
      expect(store.hasPermission('read', 'anything')).toBe(false)
      expect(store.hasPermission('write', 'anything')).toBe(false)
    })
  })

  describe('Permission Helpers', () => {
    it('canRead returns true for readable resources', () => {
      const store = useRbacStore()
      store.setUser({ id: '1', username: 'admin', role: 'admin' })
      expect(store.canRead('session')).toBe(true)
      expect(store.canRead('cron')).toBe(true)
    })

    it('canWrite checks write permission correctly', () => {
      const store = useRbacStore()
      store.setUser({ id: '2', username: 'operator', role: 'operator' })
      expect(store.canWrite('session')).toBe(true)
      // operator CAN write to backup (see ROLE_PERMISSIONS)
      expect(store.canWrite('backup')).toBe(true)
      // operator cannot write to config
      expect(store.canWrite('config')).toBe(false)
    })

    it('canDelete checks delete permission correctly', () => {
      const store = useRbacStore()
      store.setUser({ id: '1', username: 'admin', role: 'admin' })
      expect(store.canDelete('session')).toBe(true)
    })

    it('check() method works same as canDo()', () => {
      const store = useRbacStore()
      store.setUser({ id: '1', username: 'admin', role: 'admin' })
      expect(store.check('read', 'session')).toBe(store.canDo('read', 'session'))
    })
  })

  describe('Admin-Only Actions Protection', () => {
    it('blocks admin-only actions for non-admin roles', () => {
      const store = useRbacStore()
      store.setUser({ id: '2', username: 'operator', role: 'operator' })
      
      // These are ADMIN_ONLY_ACTIONS
      expect(store.canDo('delete', 'user')).toBe(false)
      expect(store.canDo('reset', 'system')).toBe(false)
      expect(store.canDo('backup.restore', 'system')).toBe(false)
    })

    it('allows admin-only actions for admin role', () => {
      const store = useRbacStore()
      store.setUser({ id: '1', username: 'admin', role: 'admin' })
      
      // Admin passes both hasPermission AND admin-only check
      expect(store.canDo('delete', 'user')).toBe(true)
      expect(store.canDo('backup.restore', 'system')).toBe(true)
    })
  })

  describe('Session Persistence', () => {
    it('persists user to localStorage', () => {
      const store = useRbacStore()
      const user = { id: '1', username: 'admin', role: 'admin' as const }
      store.setUser(user)
      
      const stored = localStorage.getItem('rbac_user')
      expect(stored).not.toBeNull()
      expect(JSON.parse(stored!)).toMatchObject(user)
    })

    it('loads user from localStorage on init', () => {
      const user = { id: '1', username: 'admin', role: 'admin' as const }
      localStorage.setItem('rbac_user', JSON.stringify(user))
      
      const store = useRbacStore()
      store.loadUser()
      
      expect(store.currentUser).toMatchObject(user)
      expect(store.isAuthenticated).toBe(true)
    })

    it('clears localStorage on logout', () => {
      const store = useRbacStore()
      store.setUser({ id: '1', username: 'admin', role: 'admin' })
      store.setUser(null)
      
      expect(localStorage.getItem('rbac_user')).toBeNull()
    })
  })

  describe('Wildcard Permission Matching', () => {
    it('resource wildcard matches all resources for given action', () => {
      const store = useRbacStore()
      store.setUser({ id: '2', username: 'operator', role: 'operator' })
      
      // operator has action:'read', resource:'*' → matches all reads
      expect(store.hasPermission('read', 'session')).toBe(true)
      expect(store.hasPermission('read', 'cron')).toBe(true)
      expect(store.hasPermission('read', 'model')).toBe(true)
    })

    it('action wildcard matches all actions for given resource', () => {
      // admin has '*':'*' which covers everything
      const store = useRbacStore()
      store.setUser({ id: '1', username: 'admin', role: 'admin' })
      expect(store.hasPermission('anyAction', 'anyResource')).toBe(true)
    })
  })
})
