import React, { useState } from 'react'
import { Plus, X, ChevronDown } from 'lucide-react'
import { parsePriceInput, formatPrice } from '../utils.js'

export default function VariantTable({
  variants,
  attributes,
  basePrice,
  currency,
  onUpdate,
  errors = {},
}) {
  const [nextId, setNextId] = useState(0)
  const [expandedId, setExpandedId] = useState(null)

  const addVariant = () => {
    // Generate a new variant with all required attributes
    const newVariant = {
      id: `var_${nextId}`,
      sku: '',
      name: '',
      attributes: {},
      price: basePrice,
      stock: 0,
      active: true,
      images: [],
    }

    // Pre-fill with empty values for all required attributes
    for (const attr of attributes.filter((a) => a.required)) {
      newVariant.attributes[attr.id] = ''
    }

    setNextId((prev) => prev + 1)
    onUpdate([...variants, newVariant])
  }

  const updateVariant = (index, field, value) => {
    const next = [...variants]
    next[index] = { ...next[index], [field]: value }
    onUpdate(next)
  }

  const updateVariantAttribute = (index, attrId, value) => {
    const next = [...variants]
    next[index].attributes = { ...next[index].attributes, [attrId]: value }
    onUpdate(next)
  }

  const removeVariant = (index) => {
    onUpdate(variants.filter((_, i) => i !== index))
  }

  const getVariantSummary = (variant) => {
    const parts = Object.values(variant.attributes).filter(Boolean)
    return parts.length ? parts.join(' / ') : `Variant ${variant.id}`
  }

  const getStockColor = (stock) => {
    if (stock === 0) return 'text-red-600'
    if (stock === -1) return 'text-blue-600'
    if (stock >= 1 && stock <= 4) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getStockLabel = (stock) => {
    if (stock === -1) return 'Unlimited'
    if (stock === 0) return 'Sold out'
    return `${stock} in stock`
  }

  if (variants.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Variants</h3>
        <p className="text-sm text-gray-400 py-4 text-center">No variants added yet.</p>
        <button type="button" onClick={addVariant} className="btn-secondary text-xs w-full">
          <Plus className="w-3.5 h-3.5" />
          Add variant
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900">Variants</h3>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_80px_100px_120px] gap-0 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 sticky top-0">
          <div className="px-4 py-3">Name</div>
          <div className="px-3 py-3 text-center">SKU</div>
          <div className="px-3 py-3 text-right">Price</div>
          <div className="px-3 py-3 text-center">Stock</div>
        </div>

        {/* Table rows */}
        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
          {variants.map((variant, idx) => {
            const isExpanded = expandedId === variant.id
            const summary = getVariantSummary(variant)
            const priceInCents = typeof variant.price === 'string'
              ? parsePriceInput(variant.price)
              : variant.price

            return (
              <div key={variant.id}>
                {/* Collapsed row */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : variant.id)}
                  className="w-full hover:bg-gray-50 transition-colors"
                >
                  <div className="grid grid-cols-[1fr_80px_100px_120px] gap-0 items-center">
                    <div className="px-4 py-3 text-left text-sm">
                      <div className="flex items-center gap-2">
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                        <span className="text-gray-900 font-medium">{summary}</span>
                      </div>
                    </div>
                    <div className="px-3 py-3 text-center text-xs text-gray-500">
                      {variant.sku || '—'}
                    </div>
                    <div className="px-3 py-3 text-right text-sm text-gray-900 font-medium">
                      {formatPrice(priceInCents, currency)}
                    </div>
                    <div className={`px-3 py-3 text-center text-sm font-medium ${getStockColor(variant.stock)}`}>
                      {getStockLabel(variant.stock)}
                    </div>
                  </div>
                </button>

                {/* Expanded form */}
                {isExpanded && (
                  <div className="px-4 py-4 bg-gray-50 border-t border-gray-200 space-y-4">
                    {/* Attributes row */}
                    <div className="grid gap-3">
                      <p className="text-xs font-semibold text-gray-700">Attributes</p>
                      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                        {attributes.map((attr) => (
                          <div key={attr.id}>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">
                              {attr.name}
                              {attr.required && <span className="text-red-500"> *</span>}
                            </label>
                            {attr.input_type === 'select' ? (
                              <input
                                type="text"
                                value={variant.attributes[attr.id] ?? ''}
                                onChange={(e) => updateVariantAttribute(idx, attr.id, e.target.value)}
                                placeholder="e.g. Medium, Black"
                                className="input text-sm"
                              />
                            ) : (
                              <input
                                type="text"
                                value={variant.attributes[attr.id] ?? ''}
                                onChange={(e) => updateVariantAttribute(idx, attr.id, e.target.value)}
                                placeholder="Enter value"
                                className="input text-sm"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* SKU */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        SKU
                      </label>
                      <input
                        type="text"
                        value={variant.sku}
                        onChange={(e) => updateVariant(idx, 'sku', e.target.value)}
                        placeholder="e.g. TSHIRT-M-BLK"
                        className="input text-sm"
                      />
                      {errors[`variant_${idx}_sku`] && (
                        <p className="mt-1 text-xs text-red-500">{errors[`variant_${idx}_sku`]}</p>
                      )}
                    </div>

                    {/* Price & Stock row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">
                          Price (optional: leave blank to use base price)
                        </label>
                        <input
                          type="text"
                          value={
                            typeof variant.price === 'string'
                              ? variant.price
                              : (variant.price / 100).toFixed(2)
                          }
                          onChange={(e) => updateVariant(idx, 'price', e.target.value)}
                          placeholder={`${basePrice / 100}`}
                          className="input text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">
                          Stock
                        </label>
                        <input
                          type="number"
                          value={variant.stock}
                          onChange={(e) => updateVariant(idx, 'stock', parseInt(e.target.value, 10))}
                          min="-1"
                          step="1"
                          className="input text-sm"
                        />
                      </div>
                    </div>

                    {/* Active toggle */}
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={variant.active}
                          onChange={(e) => updateVariant(idx, 'active', e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-xs font-medium text-gray-600">Active</span>
                      </label>
                    </div>

                    {/* Delete button */}
                    <div className="flex justify-end pt-2 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => removeVariant(idx)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1.5 py-1.5 px-2 rounded hover:bg-red-50 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        Delete variant
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <button type="button" onClick={addVariant} className="btn-secondary text-xs w-full">
        <Plus className="w-3.5 h-3.5" />
        Add variant
      </button>

      {errors.variants && <p className="text-xs text-red-500">{errors.variants}</p>}
    </div>
  )
}
