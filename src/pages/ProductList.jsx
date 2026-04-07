import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCw, ChevronLeft, ChevronRight, Search, Package } from 'lucide-react'
import { api } from '../api.js'
import { formatPrice } from '../utils.js'
import { StatusBadge, StockBadge } from '../components/Badge.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import { useToast } from '../App.jsx'

const LIMIT = 50

export default function ProductList() {
  const navigate = useNavigate()
  const addToast = useToast()

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [totalLoaded, setTotalLoaded] = useState(0)

  const [selected, setSelected] = useState(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  const [search, setSearch] = useState('')

  const [deleteModal, setDeleteModal] = useState({ open: false, product: null, loading: false })

  const fetchProducts = useCallback(async (newOffset = 0) => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.listProducts({ limit: LIMIT, offset: newOffset })
      const envelope = data?.data ?? data
      const items = Array.isArray(envelope) ? envelope : []
      setProducts(items)
      setHasMore(items.length === LIMIT)
      setTotalLoaded(newOffset + items.length)
      setSelected(new Set())
    } catch (err) {
      setError(err.message || 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts(0)
  }, [fetchProducts])

  const goToPage = (newOffset) => {
    setOffset(newOffset)
    fetchProducts(newOffset)
  }

  // Filtered products (client-side search)
  const filtered = products.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  )

  // Select helpers
  const allSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id))
  const someSelected = selected.size > 0

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((p) => p.id)))
    }
  }

  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Bulk deactivate
  const handleBulkDeactivate = async () => {
    setBulkLoading(true)
    let success = 0
    let failed = 0
    for (const id of selected) {
      try {
        await api.updateProduct(id, { active: false })
        success++
      } catch {
        failed++
      }
    }
    setBulkLoading(false)
    setSelected(new Set())
    await fetchProducts(offset)
    if (failed === 0) {
      addToast(`${success} product${success !== 1 ? 's' : ''} deactivated.`, 'success')
    } else {
      addToast(`${success} deactivated, ${failed} failed.`, 'error')
    }
  }

  // Delete
  const openDelete = (e, product) => {
    e.stopPropagation()
    setDeleteModal({ open: true, product, loading: false })
  }

  const confirmDelete = async () => {
    setDeleteModal((prev) => ({ ...prev, loading: true }))
    try {
      await api.deleteProduct(deleteModal.product.id)
      setDeleteModal({ open: false, product: null, loading: false })
      addToast('Product deleted.', 'success')
      await fetchProducts(offset)
    } catch (err) {
      setDeleteModal((prev) => ({ ...prev, loading: false }))
      addToast(err.message || 'Failed to delete product.', 'error')
    }
  }

  return (
    <div className="p-6 space-y-5">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {someSelected && (
            <button
              onClick={handleBulkDeactivate}
              disabled={bulkLoading}
              className="btn-secondary text-xs"
            >
              {bulkLoading ? (
                <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              ) : null}
              Deactivate selected ({selected.size})
            </button>
          )}
          <button
            onClick={() => fetchProducts(offset)}
            className="btn-secondary"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => navigate('/products/new')} className="btn-primary">
            <Plus className="w-4 h-4" />
            Add product
          </button>
        </div>
      </div>

      {/* Table card */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-[#008060] rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <p className="text-red-600 text-sm">{error}</p>
            <button onClick={() => fetchProducts(offset)} className="btn-secondary text-xs">
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <Package className="w-10 h-10" />
            <p className="text-sm">
              {search ? 'No products match your search.' : 'No products yet.'}
            </p>
            {!search && (
              <button onClick={() => navigate('/products/new')} className="btn-primary mt-1">
                <Plus className="w-4 h-4" />
                Add your first product
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded border-gray-300 text-[#008060] focus:ring-[#008060]"
                    />
                  </th>
                  <th className="w-12 px-2 py-3" />
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Product</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Price</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Stock</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((product) => (
                  <tr
                    key={product.id}
                    onClick={() => navigate(`/products/${product.id}/edit`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors group"
                  >
                    {/* Checkbox */}
                    <td
                      className="px-4 py-3"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleOne(product.id)
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(product.id)}
                        onChange={() => toggleOne(product.id)}
                        className="w-4 h-4 rounded border-gray-300 text-[#008060] focus:ring-[#008060]"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>

                    {/* Thumbnail */}
                    <td className="px-2 py-3">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-10 h-10 object-cover rounded-lg border border-gray-200"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                          <Package className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                    </td>

                    {/* Name + description */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 truncate max-w-[260px]">
                        {product.name}
                      </p>
                      {product.description && (
                        <p className="text-xs text-gray-400 truncate max-w-[260px] mt-0.5">
                          {product.description}
                        </p>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge active={product.active} />
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3 text-gray-700 font-medium">
                      {formatPrice(product.price, product.currency)}
                    </td>

                    {/* Stock */}
                    <td className="px-4 py-3">
                      <StockBadge stock={product.stock} />
                    </td>

                    {/* Actions */}
                    <td
                      className="px-4 py-3 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => openDelete(e, product)}
                        className="opacity-0 group-hover:opacity-100 text-xs text-red-500 hover:text-red-700 transition-all px-2 py-1 rounded hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && products.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50 text-sm text-gray-500">
            <span>
              Showing {offset + 1}–{offset + products.length}
              {hasMore ? `+` : ''} products
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(Math.max(0, offset - LIMIT))}
                disabled={offset === 0}
                className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => goToPage(offset + LIMIT)}
                disabled={!hasMore}
                className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, product: null, loading: false })}
        onConfirm={confirmDelete}
        isLoading={deleteModal.loading}
        title="Delete product?"
        message={`"${deleteModal.product?.name}" will be permanently removed. This cannot be undone. Consider deactivating instead to keep past references intact.`}
        confirmLabel="Delete"
      />
    </div>
  )
}
