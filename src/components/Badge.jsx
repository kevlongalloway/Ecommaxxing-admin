import React from 'react'
import { formatStock, getStockStatus } from '../utils.js'

/**
 * StatusBadge — Active (green) or Draft (gray)
 */
export function StatusBadge({ active }) {
  if (active) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
        Active
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
      Draft
    </span>
  )
}

/**
 * StockBadge — color-coded based on stock conventions
 */
export function StockBadge({ stock }) {
  const status = getStockStatus(stock)
  const label = formatStock(stock)

  const styles = {
    unlimited: 'bg-gray-100 text-gray-600',
    sold_out: 'bg-red-100 text-red-700',
    low: 'bg-yellow-100 text-yellow-800',
    in_stock: 'bg-green-100 text-green-800',
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.in_stock}`}
    >
      {label}
    </span>
  )
}
