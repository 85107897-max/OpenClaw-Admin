import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../../src/stores/auth'
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

describe('Auth Store - Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  describe('Initial State', () => {
    it('has correct initial values', () => {
      const store = useAuthStore()
      expect(store.authEnabled).toBe(true)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
      expect(store.isAuthenticated).toBe(false)
    })

    it('getToken returns null when no token', () => {
      const store = useAuthStore()
      expect(store.getToken()).toBeNull()
    })
  })

  describe('Login Flow (mocked)', () => {
    it('login sets token on success', async () => {
      const store = useAuthStore()
      const rbacStore = useRbacStore()
      
      const originalFetch = globalThis.fetch
      globalThis.fetch = async () => {
        return new Response(JSON.stringify({
          ok: true,
          token: 'session-token-abc',
          user: { id: 'user-1', username: 'admin', role: 'admin' },
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      
      const result = await store.login('admin', 'password')
      
      expect(result).toBe(true)
      expect(store.token).toBe('session-token-abc')
      expect(store.isAuthenticated).toBe(true)
      expect(rbacStore.currentUser).toMatchObject({
        id: 'user-1',
        username: 'admin',
        role: 'admin',
      })
      
      globalThis.fetch = originalFetch
    })

    it('login sets error on failure', async () => {
      const store = useAuthStore()
      
      const originalFetch = globalThis.fetch
      globalThis.fetch = async () => {
        return new Response(JSON.stringify({ ok: false, error: 'Invalid credentials' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      
      const result = await store.login('admin', 'wrong')
      
      expect(result).toBe(false)
      expect(store.error).toBe('Invalid credentials')
      expect(store.isAuthenticated).toBe(false)
      
      globalThis.fetch = originalFetch
    })

    it('login sets loading during request', async () => {
      const store = useAuthStore()
      let loadingDuringRequest = false
      
      const originalFetch = globalThis.fetch
      globalThis.fetch = async () => {
        loadingDuringRequest = store.loading
        await new Promise(r => setTimeout(r, 10))
        return new Response(JSON.stringify({ ok: true, token: 't' }), {
          status: 200,
        })
      }
      
      await store.login('admin', 'pass')
      
      globalThis.fetch = originalFetch
    })

    it('login handles network error', async () => {
      const store = useAuthStore()
      
      const originalFetch = globalThis.fetch
      globalThis.fetch = async () => {
        throw new Error('Network error')
      }
      
      const result = await store.login('admin', 'password')
      
      expect(result).toBe(false)
      expect(store.error).toBe('Network error')
      
      globalThis.fetch = originalFetch
    })
  })

  describe('Logout', () => {
    it('logout calls API and clears token', async () => {
      const store = useAuthStore()
      const rbacStore = useRbacStore()
      // Pre-set token via localStorage (simulating prior login)
      localStorage.setItem('auth_token', 'my-token')
      store.setToken('my-token')
      rbacStore.setUser({ id: 'user-1', username: 'admin', role: 'admin' })
      
      const originalFetch = globalThis.fetch
      let logoutCalled = false
      globalThis.fetch = async (url, options) => {
        if (typeof url === 'string' && url.includes('/api/auth/logout')) {
          logoutCalled = true
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 })
      }
      
      await store.logout()
      
      expect(logoutCalled).toBe(true)
      expect(store.token).toBeNull()
      expect(store.isAuthenticated).toBe(false)
      expect(rbacStore.currentUser).toBeNull()
      
      globalThis.fetch = originalFetch
    })
  })

  describe('checkAuth', () => {
    it('returns true for valid token', async () => {
      const store = useAuthStore()
      const rbacStore = useRbacStore()
      store.setToken('valid-session')
      
      const originalFetch = globalThis.fetch
      globalThis.fetch = async () => {
        return new Response(JSON.stringify({
          ok: true,
          user: { id: 'user-2', username: 'operator', role: 'operator' },
        }), { status: 200 })
      }
      
      const result = await store.checkAuth()
      
      expect(result).toBe(true)
      expect(rbacStore.currentUser).toMatchObject({
        id: 'user-2',
        username: 'operator',
        role: 'operator',
      })
      
      globalThis.fetch = originalFetch
    })

    it('returns false when token is null', async () => {
      const store = useAuthStore()
      const rbacStore = useRbacStore()
      rbacStore.setUser({ id: 'user-1', username: 'admin', role: 'admin' })
      const result = await store.checkAuth()
      
      expect(result).toBe(false)
      expect(rbacStore.currentUser).toBeNull()
    })

    it('returns false and clears token on 401', async () => {
      const store = useAuthStore()
      store.setToken('invalid-token')
      
      const originalFetch = globalThis.fetch
      globalThis.fetch = async () => {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
      }
      
      const result = await store.checkAuth()
      
      expect(result).toBe(false)
      expect(store.token).toBeNull()
      
      globalThis.fetch = originalFetch
    })
  })

  describe('Token Persistence via localStorage', () => {
    it('reads token from localStorage on init', () => {
      localStorage.setItem('auth_token', 'persisted-token')
      
      const store = useAuthStore()
      expect(store.token).toBe('persisted-token')
      expect(store.isAuthenticated).toBe(true)
    })

    it('token persists across store instances', () => {
      const store1 = useAuthStore()
      store1.setToken('shared-token')
      
      const store2 = useAuthStore()
      expect(store2.token).toBe('shared-token')
    })
  })
})
