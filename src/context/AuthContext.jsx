import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api } from '../api.js'

const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('admin_token'))
  const [expiresAt, setExpiresAt] = useState(() => {
    const exp = localStorage.getItem('admin_token_expires')
    return exp ? Number(exp) : null
  })

  const logout = useCallback(() => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_token_expires')
    setToken(null)
    setExpiresAt(null)
  }, [])

  const login = useCallback(async (username, password) => {
    const result = await api.login(username, password)
    const { token: newToken, expiresIn } = result.data
    const exp = Date.now() + expiresIn * 1000
    localStorage.setItem('admin_token', newToken)
    localStorage.setItem('admin_token_expires', String(exp))
    setToken(newToken)
    setExpiresAt(exp)
  }, [])

  // Listen for 401 events dispatched by adminFetch
  useEffect(() => {
    window.addEventListener('auth:logout', logout)
    return () => window.removeEventListener('auth:logout', logout)
  }, [logout])

  // Auto-logout when token expires
  useEffect(() => {
    if (!expiresAt) return
    const remaining = expiresAt - Date.now()
    if (remaining <= 0) {
      logout()
      return
    }
    const timer = setTimeout(logout, remaining)
    return () => clearTimeout(timer)
  }, [expiresAt, logout])

  return (
    <AuthContext.Provider value={{ token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}
