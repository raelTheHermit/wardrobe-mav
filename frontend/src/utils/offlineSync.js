import { loadScoped, saveScoped, getStorageUser } from './userStorage.js'

const QUEUE = 'pendingOps'
const FAILED = 'failedOps'

export function isOnline() {
  return typeof navigator === 'undefined' || navigator.onLine !== false
}

export function getPendingOperations(userId = getStorageUser()) {
  const queue = loadScoped(QUEUE, [], userId)
  return Array.isArray(queue) ? queue : []
}

export const pendingCount = () => getPendingOperations().length

// Queue entries live in the current user's namespace, so another account on this
// browser can never replay (or see) them.
export function queuePendingOperation(operation) {
  if (typeof window === 'undefined') return []
  const next = [...getPendingOperations(), { ...operation, createdAt: new Date().toISOString() }]
  saveScoped(QUEUE, next)
  return next
}

// `request` must be apiRequest (a function), NOT the wardrobeApi object.
export async function syncQueuedOperations(request) {
  const userId = getStorageUser() // capture: the user may change mid-sync
  const queue = getPendingOperations(userId)
  if (!isOnline() || typeof request !== 'function' || !queue.length) {
    return { remaining: queue.length, failed: 0, authExpired: false }
  }

  const remaining = []
  const failed = []
  let authExpired = false
  let stopped = false

  for (const entry of queue) {
    if (stopped) { remaining.push(entry); continue }
    try {
      await request(entry.path, {
        method: entry.method,
        headers: entry.headers || { 'Content-Type': 'application/json' },
        body: entry.body && typeof entry.body !== 'string' ? JSON.stringify(entry.body) : entry.body,
        _sync: true,
      })
    } catch (error) {
      const status = error?.status
      if (status === 401) {
        authExpired = true // keep everything, ask the user to log in again
        stopped = true
        remaining.push(entry)
      } else if (!status || status >= 500 || status === 408 || status === 429) {
        stopped = true // network or server trouble: retry later, keep order
        remaining.push(entry)
      } else {
        failed.push({ ...entry, status, error: error.message }) // permanent rejection (400/404/409/422)
      }
    }
  }

  saveScoped(QUEUE, remaining, userId)
  if (failed.length) saveScoped(FAILED, [...loadScoped(FAILED, [], userId), ...failed], userId)
  return { remaining: remaining.length, failed: failed.length, authExpired }
}
