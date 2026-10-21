import { loadFromStorage, saveToStorage, storageKeys } from './storage.js'

export function isOnline() {
  return typeof navigator === 'undefined' || navigator.onLine !== false
}

export function queuePendingOperation(operation) {
  if (typeof window === 'undefined') return []
  const queue = Array.isArray(loadFromStorage(storageKeys.pendingOps, [])) ? loadFromStorage(storageKeys.pendingOps, []) : []
  const next = [...queue, { ...operation, createdAt: new Date().toISOString() }]
  saveToStorage(storageKeys.pendingOps, next)
  return next
}

export async function syncQueuedOperations(apiRequest) {
  if (!isOnline() || typeof window === 'undefined' || typeof apiRequest !== 'function') {
    return []
  }

  const queue = Array.isArray(loadFromStorage(storageKeys.pendingOps, [])) ? loadFromStorage(storageKeys.pendingOps, []) : []
  if (!queue.length) return []

  const remaining = []
  for (const entry of queue) {
    try {
      await apiRequest(entry.path, {
        method: entry.method,
        headers: entry.headers || { 'Content-Type': 'application/json' },
        body: entry.body && typeof entry.body !== 'string' ? JSON.stringify(entry.body) : entry.body,
        _sync: true,
      })
    } catch (error) {
      remaining.push(entry)
    }
  }

  saveToStorage(storageKeys.pendingOps, remaining)
  return remaining
}
