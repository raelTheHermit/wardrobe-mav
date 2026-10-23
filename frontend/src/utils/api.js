
import { queuePendingOperation, isOnline } from './offlineSync.js'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '')
const MEDIA_BASE = API_BASE.replace(/\/api$/, '')
export const mediaUrl = (path) => (path?.startsWith('/media/') ? `${MEDIA_BASE}${path}` : path)

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

// App registers a callback so any 401 can send the user back to the login screen.
let unauthorizedHandler = null
export const setUnauthorizedHandler = (fn) => { unauthorizedHandler = fn }

// Flask-JWT-Extended (cookie mode) exposes a CSRF token cookie. Harmless if absent.
const csrfToken = () => {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|; )csrf_access_token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/logout', '/auth/me']

export async function apiRequest(path, options = {}) {
  const { _sync, _noQueue, ...fetchOptions } = options
  const url = `${API_BASE}${path}`
  const method = (options.method || 'GET').toUpperCase()
  const isForm = options.body instanceof FormData
  const isAuthPath = AUTH_PATHS.includes(path)
  const headers = { ...options.headers }

  if (options.body != null && !isForm && !Object.keys(headers).some((k) => k.toLowerCase() === 'content-type')) {
    headers['Content-Type'] = 'application/json'
  }

  const shouldQueue = !_sync && !_noQueue && !isAuthPath && !isForm && method !== 'GET' && method !== 'HEAD'
  const queueIt = () => {
    const body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body
    queuePendingOperation({ path, method, headers: { ...headers }, body }) // CSRF header is added at send time
  }

  if (!isOnline()) {
    if (shouldQueue) { queueIt(); return null }
    if (isForm) throw new ApiError('You’re offline. Images can only be uploaded when you’re back online.', 0)
  }

  const sendHeaders = { ...headers }
  if (method !== 'GET' && method !== 'HEAD') {
    const token = csrfToken()
    if (token) sendHeaders['X-CSRF-TOKEN'] = token
  }

  let response
  try {
    response = await fetch(url, { ...fetchOptions, headers: sendHeaders, credentials: 'include' })
  } catch (error) {
    if (shouldQueue) { queueIt(); return null }
    throw new ApiError(`Cannot reach the server at ${API_BASE}.`, 0)
  }

  if (response.status === 204) return null
  const payload = await response.json().catch(() => ({}))

  if (response.status === 401 && !isAuthPath) {
    if (shouldQueue) queueIt() // never lose an edit because the session expired
    unauthorizedHandler?.()
  }

  if (!response.ok) {
    throw new ApiError(payload.error?.message || 'The request failed.', response.status, payload.error?.details)
  }
  return payload
}

const json = (body) => ({ body: JSON.stringify(body) })

export const authApi = {
  register: (data) => apiRequest('/auth/register', { method: 'POST', ...json(data) }).then((r) => r.user),
  login: (data) => apiRequest('/auth/login', { method: 'POST', ...json(data) }).then((r) => r.user),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
  // null = not logged in. Network errors still throw so the caller can fall back to the cached user.
  me: () => apiRequest('/auth/me').then((r) => r.user).catch((e) => { if (e.status === 401) return null; throw e }),
  sync: (since) => apiRequest(`/sync${since ? `?since=${encodeURIComponent(since)}` : ''}`),
}

// Queued (offline) writes return null, so each call falls back to the value it was given.
export const wardrobeApi = {
  list: () => apiRequest('/wardrobe').then((r) => r.items),
  create: (item) => apiRequest('/wardrobe', { method: 'POST', ...json(item) }).then((r) => r?.item ?? item),
  update: (item) =>
    apiRequest(`/wardrobe/${encodeURIComponent(item.id)}`, { method: 'PATCH', ...json(item) }).then((r) => r?.item ?? item),
  remove: (id) => apiRequest(`/wardrobe/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  profile: () => apiRequest('/profile').then((r) => r.profile),
  saveProfile: (profile) => apiRequest('/profile', { method: 'PUT', ...json(profile) }).then((r) => r?.profile ?? profile),
  preferences: () => apiRequest('/preferences').then((r) => r.preferences),
  savePreferences: (preferences) =>
    apiRequest('/preferences', { method: 'PUT', ...json(preferences) }).then((r) => r?.preferences ?? preferences),
  recommendations: (data) =>
    apiRequest('/recommendations', { method: 'POST', _noQueue: true, ...json(data) }).then((r) => r.outfits),
  history: () => apiRequest('/history').then((r) => r.items),
  saveHistory: (entry) => apiRequest('/history', { method: 'POST', ...json(entry) }),
  upload: (id, file) => {
    const form = new FormData()
    form.append('image', file)
    return apiRequest(`/wardrobe/${encodeURIComponent(id)}/image`, { method: 'POST', body: form }).then((r) => r.item)
  },
}
