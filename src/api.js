export class AdminApiError extends Error {
  constructor(message, status, details) {
    super(message)
    this.name = 'AdminApiError'
    this.status = status
    this.details = details
  }
}

async function adminFetch(path, options = {}) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL
  const apiKey = import.meta.env.VITE_ADMIN_API_KEY

  const url = `${baseUrl}${path}`

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    ...(options.headers || {}),
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    let details = null
    try {
      details = await response.json()
    } catch {
      // ignore parse errors
    }
    const message =
      details?.message ||
      details?.error ||
      `Request failed with status ${response.status}`
    throw new AdminApiError(message, response.status, details)
  }

  // 204 No Content or DELETE responses may have no body
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return null
  }

  const text = await response.text()
  if (!text) return null

  return JSON.parse(text)
}

export const api = {
  listProducts: (params = {}) =>
    adminFetch(`/admin/products?${new URLSearchParams(params)}`),

  getProduct: (id) =>
    adminFetch(`/admin/products/${id}`),

  createProduct: (data) =>
    adminFetch('/admin/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateProduct: (id, data) =>
    adminFetch(`/admin/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteProduct: (id) =>
    adminFetch(`/admin/products/${id}`, {
      method: 'DELETE',
    }),
}
