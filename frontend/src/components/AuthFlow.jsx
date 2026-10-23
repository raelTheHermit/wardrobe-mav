import { useEffect, useRef, useState } from 'react'
import { authApi, apiRequest } from '../utils/api.js'
import { syncQueuedOperations } from '../utils/offlineSync.js'
import { getStorageUser, loadScoped, saveScoped } from '../utils/userStorage.js'

export function readCache() {
  return {
    garments: loadScoped('wardrobe', []),
    profile: loadScoped('profile', null),
    preferences: loadScoped('preferences', null),
    history: loadScoped('history', []),
  }
}

export async function syncNow() {
  const userId = getStorageUser()
  const push = await syncQueuedOperations(apiRequest)
  if (push.authExpired || push.remaining > 0) {
    return { ...push, data: null }
  }

  const server = await authApi.sync()
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
