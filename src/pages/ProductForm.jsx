import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ChevronRight, Plus, X, Save, Trash2, ExternalLink } from 'lucide-react'
import { api } from '../api.js'
import { formatPrice, parsePriceInput, calculateProductStock } from '../utils.js'
import { useToast } from '../App.jsx'
import VariantAttributeManager from '../components/VariantAttributeManager.jsx'
import VariantTable from '../components/VariantTable.jsx'

const CURRENCIES = ['usd', 'eur', 'gbp', 'cad', 'aud', 'jpy']

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  currency: 'usd',
  images: [],
  metadata: [],
  has_variants: false,
  variant_attributes: [],
  variants: [],
  stock: '-1',
  active: true,
}

function metadataToList(obj) {
  if (!obj || typeof obj !== 'object') return []
  return Object.entries(obj).map(([key, value]) => ({
    key,
    value: typeof value === 'object' ? JSON.stringify(value) : String(value),
    id: Math.random(),
  }))
}

function listToMetadata(list) {
  const obj = {}
  for (const row of list) {
    const k = row.key.trim()
    if (k) obj[k] = row.value
  }
  return obj
}

export default function ProductForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = Boolean(id)
  const addToast = useToast()

  const [form, setForm] = useState(EMPTY_FORM)
  const [loadingProduct, setLoadingProduct] = useState(isEditing)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [errors, setErrors] = useState({})
  const [productName, setProductName] = useState('')

  // Stripe read-only fields
  const [stripeProductId, setStripeProductId] = useState(null)
  const [stripePriceId, setStripePriceId] = useState(null)
  const [createdAt, setCreatedAt] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)

  // Delete confirm inline state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const loadProduct = useCallback(async () => {
    setLoadingProduct(true)
    try {
      const res = await api.getProduct(id)
      const p = res?.data ?? res
      setProductName(p.name)
      setStripeProductId(p.stripe_product_id)
      setStripePriceId(p.stripe_price_id)
      setCreatedAt(p.created_at)
      setUpdatedAt(p.updated_at)

      const hasVariants = (p.variants?.length ?? 0) > 0
      setForm({
        name: p.name ?? '',
        description: p.description ?? '',
        price: p.price != null ? (p.price / 100).toFixed(2) : '',
        currency: p.currency ?? 'usd',
        images: p.images ?? [],
        metadata: metadataToList(p.metadata),
        has_variants: hasVariants,
        variant_attributes: p.variant_attributes ?? [],
        variants: p.variants ?? [],
        stock: String(p.stock ?? -1),
        active: p.active ?? true,
      })
    } catch (err) {
      addToast(err.message || 'Failed to load product.', 'error')
      navigate('/products')
    } finally {
      setLoadingProduct(false)
    }
  }, [id, navigate, addToast])

  useEffect(() => {
    if (isEditing) loadProduct()
  }, [isEditing, loadProduct])

  // ── Field helpers ──────────────────────────────────────────────────────────

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }))
  }

  // Images
  const addImage = () => setForm((prev) => ({ ...prev, images: [...prev.images, ''] }))
  const updateImage = (i, val) =>
    setForm((prev) => {
      const next = [...prev.images]
      next[i] = val
      return { ...prev, images: next }
    })
  const removeImage = (i) =>
    setForm((prev) => ({ ...prev, images: prev.images.filter((_, idx) => idx !== i) }))

  // Metadata rows
  const addMeta = () =>
    setForm((prev) => ({
      ...prev,
      metadata: [...prev.metadata, { key: '', value: '', id: Math.random() }],
    }))
  const updateMeta = (i, field, val) =>
    setForm((prev) => {
      const next = [...prev.metadata]
      next[i] = { ...next[i], [field]: val }
      return { ...prev, metadata: next }
    })
  const removeMeta = (i) =>
    setForm((prev) => ({ ...prev, metadata: prev.metadata.filter((_, idx) => idx !== i) }))

  // ── Validation ─────────────────────────────────────────────────────────────

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Name is required.'
    const priceVal = parsePriceInput(form.price)
    if (isNaN(priceVal) || priceVal < 1) errs.price = 'Enter a valid price (e.g. 29.99).'
    if (!form.currency || form.currency.length !== 3) errs.currency = 'Currency must be 3 characters.'

    if (form.has_variants) {
      // Validate variant mode
      if (!form.variant_attributes.length) {
        errs.variant_attributes = 'Define at least one attribute.'
      }
      if (!form.variants.length) {
        errs.variants = 'Add at least one variant.'
      }

      // Validate each variant
      form.variants.forEach((v, idx) => {
        if (!v.sku?.trim()) {
          errs[`variant_${idx}_sku`] = 'SKU is required.'
        }

        const requiredAttrs = form.variant_attributes.filter((a) => a.required)
        for (const attr of requiredAttrs) {
          if (!v.attributes?.[attr.id]?.trim?.()) {
            errs[`variant_${idx}_attr_${attr.id}`] = `${attr.name} is required.`
          }
        }
      })
    } else {
      // Legacy stock validation
      const stockVal = parseInt(form.stock, 10)
      if (isNaN(stockVal) || (stockVal !== -1 && stockVal < 0))
        errs.stock = 'Stock must be -1 (unlimited) or 0 or higher.'
    }

    return errs
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: parsePriceInput(form.price),
        currency: form.currency.toLowerCase(),
        images: form.images.map((u) => u.trim()).filter(Boolean),
        metadata: listToMetadata(form.metadata),
        active: form.active,
      }

      // Add variant data or legacy stock based on mode
      if (form.has_variants) {
        payload.variant_attributes = form.variant_attributes
        payload.variants = form.variants.map((v) => ({
          ...v,
          price: v.price ? parsePriceInput(String(v.price)) : payload.price,
          stock: parseInt(v.stock, 10),
        }))
      } else {
        payload.stock = parseInt(form.stock, 10)
      }

      if (isEditing) {
        await api.updateProduct(id, payload)
        addToast('Product updated.', 'success')
      } else {
        const res = await api.createProduct(payload)
        addToast('Product created.', 'success')
        const newId = (res?.data ?? res)?.id
        if (newId) navigate(`/products/${newId}/edit`, { replace: true })
        else navigate('/products')
      }
    } catch (err) {
      if (err.details?.fieldErrors) {
        const mapped = {}
        for (const [field, msgs] of Object.entries(err.details.fieldErrors)) {
          mapped[field] = Array.isArray(msgs) ? msgs[0] : msgs
        }
        setErrors(mapped)
        addToast('Please fix the errors below.', 'error')
      } else {
        addToast(err.message || 'Failed to save product.', 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.deleteProduct(id)
      addToast('Product deleted.', 'success')
      navigate('/products')
    } catch (err) {
      addToast(err.message || 'Failed to delete product.', 'error')
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (loadingProduct) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-[#008060] rounded-full animate-spin" />
      </div>
    )
  }

  const pageTitle = isEditing ? (productName || 'Edit product') : 'New product'

  return (
    <form onSubmit={handleSave} noValidate>
      {/* Breadcrumb + top actions */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <nav className="flex items-center gap-1.5 text-sm">
          <Link to="/products" className="text-[#008060] hover:underline font-medium">
            Products
          </Link>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-gray-700 font-medium truncate max-w-[200px]">{pageTitle}</span>
        </nav>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="btn-secondary"
          >
            Discard
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isEditing ? 'Save changes' : 'Create product'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex gap-6 items-start">
          {/* ── Left column (main) ── */}
          <div className="flex-1 space-y-5 min-w-0">
            {/* Title + description */}
            <div className="card p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Product title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  placeholder="Short sleeve t-shirt"
                  className={`input ${errors.name ? 'border-red-400 focus:ring-red-400' : ''}`}
                />
                {errors.name && <p className="mt-1.5 text-xs text-red-500">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  placeholder="Describe this product…"
                  rows={5}
                  className="input resize-y"
                  maxLength={5000}
                />
                <p className="mt-1 text-xs text-gray-400 text-right">
                  {form.description.length} / 5000
                </p>
              </div>
            </div>

            {/* Images */}
            <div className="card p-5 space-y-3">
              <h2 className="text-sm font-semibold text-gray-900">Images</h2>
              {form.images.length === 0 && (
                <p className="text-sm text-gray-400">No images added yet.</p>
              )}
              <div className="space-y-2">
                {form.images.map((url, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {url && (
                      <img
                        src={url}
                        alt=""
                        className="w-10 h-10 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                    )}
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => updateImage(i, e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="input flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addImage}
                className="btn-secondary text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add image URL
              </button>
            </div>

            {/* Variant Attributes */}
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.has_variants}
                    onChange={(e) => {
                      setField('has_variants', e.target.checked)
                      if (e.target.checked) {
                        // Clear stock when enabling variants
                        setField('stock', '-1')
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">This product has variations</span>
                </label>
              </div>

              {form.has_variants && (
                <VariantAttributeManager
                  attributes={form.variant_attributes}
                  onUpdate={(attrs) => setField('variant_attributes', attrs)}
                  errors={errors}
                />
              )}
            </div>

            {/* Variants Table */}
            {form.has_variants && (
              <div className="card p-5">
                <VariantTable
                  variants={form.variants}
                  attributes={form.variant_attributes}
                  basePrice={parsePriceInput(form.price)}
                  currency={form.currency}
                  onUpdate={(vars) => setField('variants', vars)}
                  errors={errors}
                />
              </div>
            )}

            {/* Metadata */}
            <div className="card p-5 space-y-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Metadata</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Internal key-value pairs: SKU, weight, tags, etc.
                </p>
              </div>
              {form.metadata.length === 0 && (
                <p className="text-sm text-gray-400">No metadata added yet.</p>
              )}
              <div className="space-y-2">
                {form.metadata.map((row, i) => (
                  <div key={row.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={row.key}
                      onChange={(e) => updateMeta(i, 'key', e.target.value)}
                      placeholder="Key (e.g. sku)"
                      className="input w-36 flex-shrink-0"
                    />
                    <input
                      type="text"
                      value={row.value}
                      onChange={(e) => updateMeta(i, 'value', e.target.value)}
                      placeholder="Value"
                      className="input flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeMeta(i)}
                      className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addMeta}
                className="btn-secondary text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add entry
              </button>
            </div>
          </div>

          {/* ── Right sidebar ── */}
          <div className="w-72 flex-shrink-0 space-y-5">
            {/* Status */}
            <div className="card p-5 space-y-3">
              <h2 className="text-sm font-semibold text-gray-900">Status</h2>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setField('active', true)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    form.active
                      ? 'bg-green-50 border-green-300 text-green-800'
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setField('active', false)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    !form.active
                      ? 'bg-gray-100 border-gray-400 text-gray-700'
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  Draft
                </button>
              </div>
              <p className="text-xs text-gray-400">
                {form.active
                  ? 'Visible in the public catalog.'
                  : 'Hidden from the public catalog.'}
              </p>
            </div>

            {/* Pricing */}
            <div className="card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-900">Pricing</h2>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Price <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                      {form.currency === 'jpy' ? '¥' : form.currency === 'eur' ? '€' : form.currency === 'gbp' ? '£' : '$'}
                    </span>
                    <input
                      type="text"
                      value={form.price}
                      onChange={(e) => setField('price', e.target.value)}
                      placeholder="0.00"
                      className={`input pl-7 ${errors.price ? 'border-red-400 focus:ring-red-400' : ''}`}
                    />
                  </div>
                  <select
                    value={form.currency}
                    onChange={(e) => setField('currency', e.target.value)}
                    className="input w-20 flex-shrink-0 px-2"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.price && <p className="mt-1.5 text-xs text-red-500">{errors.price}</p>}
                {!errors.price && form.price && !isNaN(parsePriceInput(form.price)) && (
                  <p className="mt-1.5 text-xs text-gray-400">
                    Stored as {parsePriceInput(form.price)} minor units
                  </p>
                )}
              </div>
            </div>

            {/* Stock / Inventory */}
            <div className="card p-5 space-y-3">
              <h2 className="text-sm font-semibold text-gray-900">Inventory</h2>

              {form.has_variants ? (
                // Variants mode: show aggregate stock
                <>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-700">
                      {form.variants.length === 0
                        ? 'Add variants to manage inventory per size/color.'
                        : `${form.variants.length} variant${form.variants.length !== 1 ? 's' : ''} active`}
                    </p>
                    {form.variants.length > 0 && (
                      <div className="mt-2 space-y-1 text-xs text-blue-600">
                        <p>
                          Total:{' '}
                          {(() => {
                            const stock = calculateProductStock({ variants: form.variants, active: true })
                            if (stock === -1) return 'Unlimited'
                            if (stock === 0) return 'Sold out'
                            return `${stock} in stock`
                          })()}
                        </p>
                        <p>
                          Breakdown: {form.variants.filter((v) => v.stock > 0).length} in stock,{' '}
                          {form.variants.filter((v) => v.stock === 0).length} sold out
                        </p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                // Legacy mode: simple stock input
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Stock quantity
                    </label>
                    <input
                      type="number"
                      value={form.stock}
                      onChange={(e) => setField('stock', e.target.value)}
                      min="-1"
                      step="1"
                      className={`input ${errors.stock ? 'border-red-400 focus:ring-red-400' : ''}`}
                    />
                    {errors.stock && <p className="mt-1.5 text-xs text-red-500">{errors.stock}</p>}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[{ label: 'Unlimited', value: '-1' }, { label: 'Sold out', value: '0' }, { label: '100', value: '100' }].map(
                      ({ label, value }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setField('stock', value)}
                          className={`text-xs py-1.5 px-2 rounded border transition-colors ${
                            form.stock === value
                              ? 'bg-gray-100 border-gray-400 text-gray-700 font-medium'
                              : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {label}
                        </button>
                      )
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    Set to <code className="bg-gray-100 px-1 rounded">-1</code> for unlimited / not tracked.
                  </p>
                </>
              )}
            </div>

            {/* Stripe info (edit only) */}
            {isEditing && (
              <div className="card p-5 space-y-3">
                <h2 className="text-sm font-semibold text-gray-900">Stripe</h2>
                <div className="space-y-2 text-xs">
                  <div>
                    <p className="text-gray-500 mb-0.5">Product ID</p>
                    <p className="font-mono text-gray-700 break-all">
                      {stripeProductId || <span className="text-gray-400 italic">Not synced yet</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-0.5">Price ID</p>
                    <p className="font-mono text-gray-700 break-all">
                      {stripePriceId || <span className="text-gray-400 italic">Not synced yet</span>}
                    </p>
                  </div>
                  {createdAt && (
                    <div>
                      <p className="text-gray-500 mb-0.5">Created</p>
                      <p className="text-gray-700">{new Date(createdAt).toLocaleString()}</p>
                    </div>
                  )}
                  {updatedAt && (
                    <div>
                      <p className="text-gray-500 mb-0.5">Last updated</p>
                      <p className="text-gray-700">{new Date(updatedAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bottom save */}
            <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
              {saving ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isEditing ? 'Save changes' : 'Create product'}
            </button>

            {/* Delete (edit only) */}
            {isEditing && (
              <div className="card p-4">
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full text-sm text-red-500 hover:text-red-700 flex items-center justify-center gap-2 py-1 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete product
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-600 text-center">
                      Permanently delete <strong>{productName}</strong>?
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="btn-secondary flex-1 text-xs justify-center"
                        disabled={deleting}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="btn-danger flex-1 text-xs justify-center"
                        disabled={deleting}
                      >
                        {deleting ? (
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </form>
  )
}
