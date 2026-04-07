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
  const token = localStorage.getItem('admin_token')

  const url = `${baseUrl}${path}`

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_token_expires')
    window.dispatchEvent(new Event('auth:logout'))
  }

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
  login: async (username, password) => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    let data = null
    try {
      data = await response.json()
    } catch {
      // ignore parse errors
    }
    if (!response.ok) {
      throw new AdminApiError(
        data?.message || data?.error || 'Login failed',
        response.status,
        data,
      )
    }
    return data
  },

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
