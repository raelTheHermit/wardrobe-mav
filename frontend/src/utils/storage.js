const STORAGE_KEYS = {
  preferences: "wardrobe-ai.preferences",
  outfits: "wardrobe-ai.saved-outfits",
  history: "wardrobe-ai.history",
  wardrobe: "wardrobe-ai.wardrobe",
  profile: "wardrobe-ai.profile",
  tutorialSeen: "wardrobe-ai.tutorial-seen",
  introSeen: "wardrobe-ai.intro-seen",
  account: "wardrobe-ai.account",
  accounts: "wardrobe-ai.accounts",
  pendingOps: "wardrobe-ai.pending-ops",
};

export function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn(`Failed to read ${key}`, error);
    return fallback;
  }
}

export function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to save ${key}`, error);
  }
}

export const storageKeys = STORAGE_KEYS;
