import { getToken, clearToken } from './auth.js'

export class AdminApiError extends Error {
  constructor(message, status, details) {
    super(message)
    this.name = 'AdminApiError'
    this.status = status
    this.details = details
  }
}

function getBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL || ''
}

async function adminFetch(path, options = {}) {
  const token = getToken()
  const url = `${getBaseUrl()}${path}`

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  const response = await fetch(url, { ...options, headers })

  if (response.status === 401) {
    clearToken()
    // Hard redirect so the React tree re-mounts cleanly on login
    window.location.href = '/login'
    throw new AdminApiError('Session expired — please log in again', 401, null)
  }

  if (!response.ok) {
    let details = null
    try {
      details = await response.json()
    } catch {
      // ignore parse errors
    }
    const message =
      details?.error ||
      details?.message ||
      `Request failed with status ${response.status}`
    throw new AdminApiError(message, response.status, details)
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return null
  }

  const text = await response.text()
  if (!text) return null

  const body = JSON.parse(text)
  // Unwrap the { ok, data } envelope when present
  return body?.data !== undefined ? body.data : body
}

// ── Auth ───────────────────────────────────────────────────────────────────

export async function login(username, password) {
  const res = await fetch(`${getBaseUrl()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const body = await res.json()
  if (!res.ok || !body.ok) {
    throw new AdminApiError(body.error ?? 'Login failed', res.status, body.details)
  }
  return body.data // { token, expiresIn }
}

// ── Products ───────────────────────────────────────────────────────────────

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
