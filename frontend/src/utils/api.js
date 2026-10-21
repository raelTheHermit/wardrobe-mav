import { queuePendingOperation, isOnline } from './offlineSync.js'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '')
const MEDIA_BASE = API_BASE.replace(/\/api$/, '')
export const mediaUrl = (path) => path?.startsWith('/media/') ? `${MEDIA_BASE}${path}` : path

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}


export async function apiRequest(path, options = {}) {
  const url = `${API_BASE}${path}`
  const headers = { ...options.headers }
  const method = (options.method || 'GET').toUpperCase()
  const shouldQueue = !options._sync && method !== 'GET' && method !== 'HEAD' && !(options.body instanceof FormData)

  // Only set JSON Content-Type when sending a JSON body.
  // Do not set it for GET requests or FormData uploads.
  if (
    options.body != null &&
    !(options.body instanceof FormData) &&
    !Object.keys(headers).some(
      (key) => key.toLowerCase() === 'content-type'
    )
  ) {
    headers['Content-Type'] = 'application/json'
  }

  if (!isOnline() && shouldQueue) {
    const queuedBody = typeof options.body === 'string' ? JSON.parse(options.body) : options.body
    queuePendingOperation({ path, method, headers, body: queuedBody })
    return null
  }

  let response

  try {
    response = await fetch(url, {
      ...options,
      headers,
    })
  } catch (error) {
    if (shouldQueue) {
      const queuedBody = typeof options.body === 'string' ? JSON.parse(options.body) : options.body
      queuePendingOperation({ path, method, headers, body: queuedBody })
      return null
    }

    console.error('API network error:', {
      url,
      message: error.message,
      error,
    })

    throw new ApiError(
      `Cannot reach ${url}. Check the browser console for the network error.`
    )
  }

  if (response.status === 204) return null

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new ApiError(
      payload.error?.message || 'The request failed.',
      response.status,
      payload.error?.details
    )
  }

  return payload
}

const json = (body) => ({ body: JSON.stringify(body) })
export const wardrobeApi = {
  list: () => apiRequest('/wardrobe').then((result) => result.items),
  create: (item) => apiRequest('/wardrobe', { method: 'POST', ...json(item) }).then((result) => result.item),
  update: (item) => apiRequest(`/wardrobe/${encodeURIComponent(item.id)}`, { method: 'PATCH', ...json(item) }).then((result) => result.item),
  remove: (id) => apiRequest(`/wardrobe/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  profile: () => apiRequest('/profile').then((result) => result.profile),
  saveProfile: (profile) => apiRequest('/profile', { method: 'PUT', ...json(profile) }).then((result) => result.profile),
  preferences: () => apiRequest('/preferences').then((result) => result.preferences),
  savePreferences: (preferences) => apiRequest('/preferences', { method: 'PUT', ...json(preferences) }).then((result) => result.preferences),
  recommendations: (data) => apiRequest('/recommendations', { method: 'POST', ...json(data) }).then((result) => result.outfits),
  history: () => apiRequest('/history').then((result) => result.items),
  saveHistory: (entry) => apiRequest('/history', { method: 'POST', ...json(entry) }),
  upload: (id, file) => {
    const form = new FormData(); form.append('image', file)
    return apiRequest(`/wardrobe/${encodeURIComponent(id)}/image`, { method: 'POST', body: form }).then((result) => result.item)
  },
}
