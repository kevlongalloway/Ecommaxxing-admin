import React, { createContext, useContext, useState, useCallback } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import ProductList from './pages/ProductList.jsx'
import ProductForm from './pages/ProductForm.jsx'
import Toast from './components/Toast.jsx'
import { isLoggedIn, clearToken } from './auth.js'

// ── Toast context ──────────────────────────────────────────────────────────

export const ToastContext = createContext(null)

export function useToast() {
  return useContext(ToastContext)
}

// ── Auth context ───────────────────────────────────────────────────────────

export const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

// ── Protected route wrapper ────────────────────────────────────────────────

function RequireAuth({ children }) {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />
  }
  return children
}

// ── App ────────────────────────────────────────────────────────────────────

export default function App() {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const logout = useCallback(() => {
    clearToken()
    window.location.href = '/login'
  }, [])

  return (
    <AuthContext.Provider value={{ logout }}>
      <ToastContext.Provider value={addToast}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/products" replace />} />
            <Route path="products" element={<ProductList />} />
            <Route path="products/new" element={<ProductForm />} />
            <Route path="products/:id/edit" element={<ProductForm />} />
          </Route>
          {/* Catch-all: redirect to home (which will go to /login if not authed) */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toast toasts={toasts} onRemove={removeToast} />
      </ToastContext.Provider>
    </AuthContext.Provider>
  )
}
