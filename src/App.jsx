import React, { createContext, useContext, useState, useCallback } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import ProductList from './pages/ProductList.jsx'
import ProductForm from './pages/ProductForm.jsx'
import Toast from './components/Toast.jsx'

// Toast context
export const ToastContext = createContext(null)

export function useToast() {
  return useContext(ToastContext)
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
    <ToastContext.Provider value={addToast}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/products" replace />} />
          <Route path="products" element={<ProductList />} />
          <Route path="products/new" element={<ProductForm />} />
          <Route path="products/:id/edit" element={<ProductForm />} />
        </Route>
      </Routes>
      <Toast toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}
