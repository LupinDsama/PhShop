import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import api from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isReady, setIsReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const mounted = useRef(true)

  useEffect(() => {
    // Phải set lại `true` mỗi lần mount: React StrictMode gọi effect 2 lần
    // (mount → cleanup → mount) nếu không set lại thì mounted.current sẽ giữ
    // giá trị false và isReady không bao giờ được bật → app kẹt ở màn loading.
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const refresh = useCallback(async () => {
    try {
      const data = await api.get('/api/auth/session')
      if (!mounted.current) return null
      setUser(data?.user || null)
      return data?.user || null
    } catch {
      if (mounted.current) setUser(null)
      return null
    } finally {
      if (mounted.current) setIsReady(true)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = useCallback(async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.post('/api/auth/login', { email, password })
      setUser(data.user)
      return data.user
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(async (payload) => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.post('/api/auth/register', payload)
      setUser(data.user)
      return data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout', {})
    } catch {
      /* vẫn xoá phiên phía client */
    }
    setUser(null)
  }, [])

  const updateProfile = useCallback(async (payload) => {
    const data = await api.patch('/api/auth/profile', payload)
    setUser(data.user)
    return data.user
  }, [])

  const changePassword = useCallback(async (payload) => {
    return api.patch('/api/auth/password', payload)
  }, [])

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
  const isStaff = isAdmin || user?.role === 'SUPPORT'

  return (
    <AuthContext.Provider
      value={{
        user,
        isReady,
        loading,
        error,
        setError,
        isAuthenticated: !!user,
        isAdmin,
        isStaff,
        isSuperAdmin: user?.role === 'SUPER_ADMIN',
        login,
        register,
        logout,
        refresh,
        updateProfile,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
