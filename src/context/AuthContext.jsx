import { createContext, useContext, useState, useEffect } from 'react'

const ADMIN_EMAIL = 'nhantk123vip@gmail.com'
const AUTH_KEY = 'phshop-auth'
const AUTH_TTL_MS = 48 * 60 * 60 * 1000 // 48 hours

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isReady, setIsReady] = useState(false)

  // Khôi phục phiên đăng nhập từ localStorage khi mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTH_KEY)
      if (!raw) {
        setIsReady(true)
        return
      }
      const data = JSON.parse(raw)
      const now = Date.now()
      if (data && data.user && data.expiresAt && now < data.expiresAt) {
        setUser(data.user)
      } else {
        localStorage.removeItem(AUTH_KEY)
      }
    } catch {
      localStorage.removeItem(AUTH_KEY)
    } finally {
      setIsReady(true)
    }
  }, [])

  const login = (userData) => {
    const role = userData.email === ADMIN_EMAIL ? 'admin' : 'customer'
    const authUser = { ...userData, role }
    const payload = {
      user: authUser,
      expiresAt: Date.now() + AUTH_TTL_MS,
    }
    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify(payload))
    } catch {}
    setUser(authUser)
  }

  const logout = () => {
    try {
      localStorage.removeItem(AUTH_KEY)
    } catch {}
    setUser(null)
  }

  // Render children ngay cả khi đang khôi phục session (user=null tạm thời)
  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
