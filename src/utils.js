/**
 * Format integer cents to a human-readable price string.
 * formatPrice(2999, 'usd') → "$29.99"
 * formatPrice(1000, 'eur') → "€10.00"
 */
export function formatPrice(cents, currency = 'usd') {
  if (cents == null || isNaN(cents)) return '—'
  const amount = cents / 100
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    // Fallback for unknown currencies
    return `${currency.toUpperCase()} ${amount.toFixed(2)}`
  }
}

/**
 * Parse a price input string to integer cents.
 * parsePriceInput("$29.99") → 2999
 * parsePriceInput("29.99") → 2999
 * parsePriceInput("2999") → 299900  (treated as dollars, not cents)
 * If the string contains a decimal point we treat it as a dollar amount.
 * If it's a plain integer string with no decimal we also treat it as dollars.
 * Returns NaN if the input cannot be parsed.
 */
export function parsePriceInput(value) {
  if (value == null) return NaN
  const cleaned = String(value).replace(/[^0-9.]/g, '')
  if (!cleaned) return NaN
  const parsed = parseFloat(cleaned)
  if (isNaN(parsed)) return NaN
  return Math.round(parsed * 100)
}

/**
 * Format a stock integer to a label.
 * -1 → "Unlimited"
 *  0 → "Sold Out"
 *  1–4 → "Low Stock (N)"
 *  5+ → "In Stock (N)"
 */
export function formatStock(stock) {
  if (stock === -1) return 'Unlimited'
  if (stock === 0) return 'Sold Out'
  if (stock >= 1 && stock <= 4) return `Low Stock (${stock})`
  return `In Stock (${stock})`
}

/**
 * Return a stock status string for badge rendering.
 */
export function getStockStatus(stock) {
  if (stock === -1) return 'unlimited'
  if (stock === 0) return 'sold_out'
  if (stock >= 1 && stock <= 4) return 'low'
  return 'in_stock'
}

/**
 * Calculate product-level stock from variants.
 * If product has variants: returns sum of active variant stocks (or -1 if any unlimited)
 * If no variants: returns product.stock
 */
export function calculateProductStock(product) {
  if (!product.variants?.length) {
    return product.stock ?? -1
  }

  const activeVariants = product.variants.filter((v) => v.active)
  if (!activeVariants.length) return 0

  // If any active variant is unlimited, product is unlimited
  if (activeVariants.some((v) => v.stock === -1)) return -1

  // If all active variants are sold out, product is sold out
  if (activeVariants.every((v) => v.stock === 0)) return 0

  // Sum of all active variant stocks
  return activeVariants.reduce((sum, v) => {
    return v.stock === -1 ? sum : sum + v.stock
  }, 0)
}

/**
 * Generate variant display name from attributes object.
 * {size: "M", color: "Blue"} → "M / Blue"
 */
export function generateVariantName(attributes) {
  if (!attributes || !Object.keys(attributes).length) return 'Variant'
  return Object.values(attributes).join(' / ')
}

/**
 * Check if variant is available for purchase.
 */
export function isVariantAvailable(variant) {
  return variant.active && (variant.stock > 0 || variant.stock === -1)
}
