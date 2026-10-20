const STORAGE_KEYS = {
  preferences: 'wardrobe-ai.preferences',
  outfits: 'wardrobe-ai.saved-outfits',
  history: 'wardrobe-ai.history',
  tutorialSeen: 'wardrobe-ai.tutorial-seen',
}

export function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch (error) {
    console.warn(`Failed to read ${key}`, error)
    return fallback
  }
}

export function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn(`Failed to save ${key}`, error)
  }
}

export const storageKeys = STORAGE_KEYS
