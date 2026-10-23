import { loadFromStorage, saveToStorage } from './storage.js';

const USER_PREFIX = 'fitzii.user:';

export const getUserStorageKey = (userId, key) => {
  const safeUserId = userId || 'guest';
  return `${USER_PREFIX}${safeUserId}:${key}`;
};

export const loadUserData = (userId, key, fallback) => {
  const result = loadFromStorage(getUserStorageKey(userId, key), fallback);
  return result ?? fallback;
};

export const saveUserData = (userId, key, value) => {
  saveToStorage(getUserStorageKey(userId, key), value);
};

export const clearUserData = (userId, key) => {
  try {
    localStorage.removeItem(getUserStorageKey(userId, key));
  } catch {
    // ignore storage access problems
  }
};
