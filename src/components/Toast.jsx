import React from 'react'
import { CheckCircle, XCircle, X } from 'lucide-react'

function ToastItem({ toast, onRemove }) {
  const isSuccess = toast.type === 'success'

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border max-w-sm w-full pointer-events-auto transition-all ${
        isSuccess
          ? 'bg-white border-green-200'
          : 'bg-white border-red-200'
      }`}
    >
      <div className="flex-shrink-0 mt-0.5">
        {isSuccess ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : (
          <XCircle className="w-5 h-5 text-red-500" />
        )}
      </div>
      <p className="flex-1 text-sm text-gray-800 leading-snug">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors mt-0.5"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export default function Toast({ toasts, onRemove }) {
  if (!toasts.length) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  )
}
