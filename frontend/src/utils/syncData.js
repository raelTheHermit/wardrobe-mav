import { apiRequest, authApi } from './api.js'
import { syncQueuedOperations } from './offlineSync.js'
import { loadScoped, saveScoped, getStorageUser } from './userStorage.js'

// What the UI renders from. Always the CURRENT user's cache.
export function readCache() {
  return {
    garments: loadScoped('wardrobe', []),
    profile: loadScoped('profile', null),
    preferences: loadScoped('preferences', null),
    history: loadScoped('history', []),
  }
}

// 1) push queued local edits, 2) pull the server's copy into this user's cache.
// If edits are still queued (offline / server error) we skip the pull so unsynced
// local changes are never overwritten by older server data.
export async function syncNow() {
  const userId = getStorageUser()
  const push = await syncQueuedOperations(apiRequest)
  if (push.authExpired || push.remaining > 0) return { ...push, data: null }

  const server = await authApi.sync() // full pull; add `since` later for incremental sync
  const data = {
    garments: (server.garments || []).filter((g) => !g.deleted_at),
    profile: server.profile || null,
    preferences: server.preferences || null,
    history: server.history || [],
  }
  saveScoped('wardrobe', data.garments, userId)
  saveScoped('profile', data.profile, userId)
  saveScoped('preferences', data.preferences, userId)
  saveScoped('history', data.history, userId)
  saveScoped('lastSync', new Date().toISOString(), userId)
  return { ...push, data }
}
