import { createContext, useContext, useState } from 'react'

const ADMIN_EMAIL = 'nhantk123vip@gmail.com'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const login = (userData) => {
    const role = userData.email === ADMIN_EMAIL ? 'admin' : 'customer'
    setUser({ ...userData, role })
  }
  const logout = () => setUser(null)
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
