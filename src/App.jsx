import React, { createContext, useContext, useState, useCallback } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import ProductList from './pages/ProductList.jsx'
import ProductForm from './pages/ProductForm.jsx'
import Login from './pages/Login.jsx'
import Toast from './components/Toast.jsx'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'

// Toast context
export const ToastContext = createContext(null)

export function useToast() {
  return useContext(ToastContext)
}

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

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

  return (
    <AuthProvider>
      <ToastContext.Provider value={addToast}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/products" replace />} />
            <Route path="products" element={<ProductList />} />
            <Route path="products/new" element={<ProductForm />} />
            <Route path="products/:id/edit" element={<ProductForm />} />
          </Route>
        </Routes>
        <Toast toasts={toasts} onRemove={removeToast} />
      </ToastContext.Provider>
    </AuthProvider>
  )
}
