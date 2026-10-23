import { authApi, wardrobeApi } from './api.js';
import { loadFromStorage, saveToStorage, storageKeys } from './storage.js';
import { saveUserData, loadUserData } from './userStorage.js';

const fallbackProfile = () => loadFromStorage(storageKeys.profile, {});
const fallbackPreferences = () => loadFromStorage(storageKeys.preferences, {});
const fallbackWardrobe = () => loadFromStorage(storageKeys.wardrobe, []);
const fallbackHistory = () => loadFromStorage(storageKeys.history, []);

export async function syncUserData(user, options = {}) {
  if (!user) return null;

  const localWardrobe = options.wardrobe ?? fallbackWardrobe();
  const localProfile = options.profile ?? fallbackProfile();
  const localPreferences = options.preferences ?? fallbackPreferences();
  const localHistory = options.history ?? fallbackHistory();

  try {
    const payload = await authApi.sync();
    const wardrobe = Array.isArray(payload?.wardrobe) ? payload.wardrobe : localWardrobe;
    const profile = payload?.profile && Object.keys(payload.profile).length ? payload.profile : localProfile;
    const preferences = payload?.preferences && Object.keys(payload.preferences).length ? payload.preferences : localPreferences;
    const history = Array.isArray(payload?.history) ? payload.history : localHistory;

    saveToStorage(storageKeys.wardrobe, wardrobe);
    saveToStorage(storageKeys.profile, profile);
    saveToStorage(storageKeys.preferences, preferences);
    saveToStorage(storageKeys.history, history);
    saveUserData(user.id, 'wardrobe', wardrobe);
    saveUserData(user.id, 'profile', profile);
    saveUserData(user.id, 'preferences', preferences);
    saveUserData(user.id, 'history', history);

    return { wardrobe, profile, preferences, history };
  } catch (error) {
    const cachedWardrobe = loadUserData(user.id, 'wardrobe', localWardrobe);
    const cachedProfile = loadUserData(user.id, 'profile', localProfile);
    const cachedPreferences = loadUserData(user.id, 'preferences', localPreferences);
    const cachedHistory = loadUserData(user.id, 'history', localHistory);

    saveToStorage(storageKeys.wardrobe, cachedWardrobe);
    saveToStorage(storageKeys.profile, cachedProfile);
    saveToStorage(storageKeys.preferences, cachedPreferences);
    saveToStorage(storageKeys.history, cachedHistory);

    return {
      wardrobe: cachedWardrobe,
      profile: cachedProfile,
      preferences: cachedPreferences,
      history: cachedHistory,
    };
  }
}

export async function loadUserSession(user) {
  if (!user) return null;

  const persistedWardrobe = loadUserData(user.id, 'wardrobe', fallbackWardrobe());
  const persistedProfile = loadUserData(user.id, 'profile', fallbackProfile());
  const persistedPreferences = loadUserData(user.id, 'preferences', fallbackPreferences());
  const persistedHistory = loadUserData(user.id, 'history', fallbackHistory());

  saveToStorage(storageKeys.wardrobe, persistedWardrobe);
  saveToStorage(storageKeys.profile, persistedProfile);
  saveToStorage(storageKeys.preferences, persistedPreferences);
  saveToStorage(storageKeys.history, persistedHistory);

  try {
    const remote = await authApi.sync();
    if (remote) {
      const merged = {
        wardrobe: Array.isArray(remote.wardrobe) ? remote.wardrobe : persistedWardrobe,
        profile: remote.profile && Object.keys(remote.profile).length ? remote.profile : persistedProfile,
        preferences: remote.preferences && Object.keys(remote.preferences).length ? remote.preferences : persistedPreferences,
        history: Array.isArray(remote.history) ? remote.history : persistedHistory,
      };

      saveToStorage(storageKeys.wardrobe, merged.wardrobe);
      saveToStorage(storageKeys.profile, merged.profile);
      saveToStorage(storageKeys.preferences, merged.preferences);
      saveToStorage(storageKeys.history, merged.history);
      saveUserData(user.id, 'wardrobe', merged.wardrobe);
      saveUserData(user.id, 'profile', merged.profile);
      saveUserData(user.id, 'preferences', merged.preferences);
      saveUserData(user.id, 'history', merged.history);
      return merged;
    }
  } catch {
    // fall back to cached local data for offline mode
  }

  return {
    wardrobe: persistedWardrobe,
    profile: persistedProfile,
    preferences: persistedPreferences,
    history: persistedHistory,
  };
}

export async function refreshRecommendations(user, payload) {
  if (!user) return [];
  try {
    return await wardrobeApi.recommendations(payload);
  } catch (error) {
    return [];
  }
}
