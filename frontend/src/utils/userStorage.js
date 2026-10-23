// Per-user local cache. Every key is namespaced: fitzii:<userId>:<name>
// "guest" is the namespace used when nobody is logged in.
let currentUserId = 'guest'

export const getStorageUser = () => currentUserId
export const setStorageUser = (id) => { currentUserId = id || 'guest' }

const key = (userId, name) => `fitzii:${userId}:${name}`

export function loadScoped(name, fallback = null, userId = currentUserId) {
  try {
    const raw = localStorage.getItem(key(userId, name))
    return raw == null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function saveScoped(name, value, userId = currentUserId) {
  try {
    localStorage.setItem(key(userId, name), JSON.stringify(value))
  } catch (error) {
    console.warn('Could not write local cache', error)
  }
}

// Removes everything cached for one user (call on logout).
export function clearUserData(userId = currentUserId) {
  try {
    const prefix = `fitzii:${userId}:`
    Object.keys(localStorage).filter((k) => k.startsWith(prefix)).forEach((k) => localStorage.removeItem(k))
  } catch { /* ignore */ }
}

// Last logged-in user, so the installed PWA can still open offline.
const LAST_USER = 'fitzii:lastUser'
export const rememberUser = (user) => { try { localStorage.setItem(LAST_USER, JSON.stringify(user)) } catch { /* ignore */ } }
export const forgetUser = () => { try { localStorage.removeItem(LAST_USER) } catch { /* ignore */ } }
export const getRememberedUser = () => { try { return JSON.parse(localStorage.getItem(LAST_USER)) } catch { return null } }
