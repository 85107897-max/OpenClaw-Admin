import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useRbacStore, type Role, type User as RbacUser } from './rbac'

const AUTH_TOKEN_KEY = 'auth_token'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(AUTH_TOKEN_KEY))
  const authEnabled = ref(true)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value)
  const rbacStore = useRbacStore()

  function normalizeRole(role: unknown): Role | null {
    if (role === 'admin' || role === 'operator' || role === 'viewer' || role === 'readonly') {
      return role === 'viewer' ? 'readonly' : role
    }
    return null
  }

  function syncRbacUser(user: unknown) {
    const row = user as Partial<RbacUser> | null | undefined
    const normalizedRole = normalizeRole(row?.role)
    if (!row?.id || !row?.username || !normalizedRole) {
      rbacStore.setUser(null)
      return
    }

    rbacStore.setUser({
      id: String(row.id),
      username: String(row.username),
      role: normalizedRole,
      avatar: typeof row.avatar === 'string' ? row.avatar : undefined,
      createdAt: typeof row.createdAt === 'string' ? row.createdAt : undefined,
    })
  }

  function setToken(newToken: string | null) {
    token.value = newToken
    if (newToken) {
      localStorage.setItem(AUTH_TOKEN_KEY, newToken)
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY)
    }
  }

  async function checkAuthConfig() {
    try {
      const response = await fetch('/api/auth/config')
      const data = await response.json()
      authEnabled.value = data.enabled
      return data.enabled
    } catch {
      authEnabled.value = false
      return false
    }
  }

  async function checkAuth(): Promise<boolean> {
    if (!token.value) {
      rbacStore.setUser(null)
      return false
    }
    
    try {
      const response = await fetch('/api/auth/check', {
        headers: {
          'Authorization': `Bearer ${token.value}`,
        },
      })
      const data = await response.json()
      
      if (response.ok) {
        syncRbacUser(data.user)
        return true
      } else {
        setToken(null)
        rbacStore.setUser(null)
        return false
      }
    } catch {
      return false
    }
  }

  async function login(username: string, password: string): Promise<boolean> {
    loading.value = true
    error.value = null
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })
      
      const data = await response.json()
      
      if (response.ok && data.ok) {
        if (data.token) {
          setToken(data.token)
        }
        if (data.user) {
          syncRbacUser(data.user)
        }
        loading.value = false
        return true
      } else {
        error.value = data.error || 'Login failed'
        loading.value = false
        return false
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Network error'
      loading.value = false
      return false
    }
  }

  async function logout() {
    try {
      if (token.value) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token.value}`,
          },
        })
      }
    } catch {
      // ignore
    }
    setToken(null)
    rbacStore.setUser(null)
  }

  function getToken(): string | null {
    return token.value
  }

  return {
    token,
    authEnabled,
    loading,
    error,
    isAuthenticated,
    checkAuthConfig,
    checkAuth,
    login,
    logout,
    getToken,
  }
})
