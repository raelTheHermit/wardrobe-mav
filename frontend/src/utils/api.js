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
  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: options.body instanceof FormData ? options.headers : { 'Content-Type': 'application/json', ...options.headers },
    })
  } catch (error) {
  console.error('API network error:', `${API_BASE}${path}`, error)

  throw new ApiError(
    `Cannot reach the API at ${API_BASE}. ${error.message || 'Network request failed.'}`
  )
  }
  if (response.status === 204) return null
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new ApiError(payload.error?.message || 'The request failed.', response.status, payload.error?.details)
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
