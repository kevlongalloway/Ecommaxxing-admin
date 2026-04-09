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

  console.log('[adminFetch] →', options.method || 'GET', url)
  console.log('[adminFetch] token in storage:', token ? `"${token.slice(0, 20)}…" (${token.length} chars)` : 'MISSING')

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  const response = await fetch(url, { ...options, headers })

  console.log('[adminFetch] ←', response.status, url)

  if (response.status === 401) {
    console.error('[adminFetch] 401 — clearing token and redirecting to /login')
    console.error('[adminFetch] token that was sent:', token)
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
  const url = `${getBaseUrl()}/admin/login`
  console.log('[login] POST', url)

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })

  console.log('[login] response status:', res.status)

  const body = await res.json()
  console.log('[login] response body:', JSON.stringify(body))

  if (!res.ok || !body.ok) {
    console.error('[login] login rejected — res.ok:', res.ok, 'body.ok:', body.ok)
    throw new AdminApiError(body.error ?? 'Login failed', res.status, body.details)
  }

  // Support both { data: { token } } and { data: "token-string" } response shapes
  const data = body.data
  console.log('[login] body.data type:', typeof data, '— value:', JSON.stringify(data))

  const token = typeof data === 'string' ? data : data?.token
  console.log('[login] extracted token:', token ? `"${token.slice(0, 20)}…" (${token.length} chars)` : 'MISSING (undefined/null)')

  if (!token) {
    console.error('[login] no token found in response — full body:', JSON.stringify(body))
    throw new AdminApiError('Login failed: no token in response', res.status, body)
  }

  return token
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
