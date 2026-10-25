import wardrobeSeed from "../data/wardrobe.json";
import guestWardrobeSeed from "../data/guestWardrobe.json";

const DB_NAME = "wardrobe-ai-db";
const STORE_NAME = "garments";
const PROFILE_KEY = "wardrobe-ai.profile";

function hasLocalStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function isBrowser() {
  return typeof window !== "undefined";
}

function getStoredAccount() {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem("wardrobe-ai.account");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getSeedGarments() {
  if (typeof window !== "undefined") {
    const account = getStoredAccount();
    if (!account) {
      const guestSource = Array.isArray(guestWardrobeSeed?.items)
        ? guestWardrobeSeed.items
        : guestWardrobeSeed;
      return Array.isArray(guestSource) ? guestSource : [];
    }
  }

  const source = Array.isArray(wardrobeSeed?.items)
    ? wardrobeSeed.items
    : wardrobeSeed;
  return Array.isArray(source) ? source : [];
}

function validateGarmentRecord(item) {
  if (!item || typeof item !== "object") return false;
  if (!item.id || !item.name || !item.category) return false;

  const validFamilies = [
    "top",
    "bottom",
    "outerwear",
    "accessory",
    "footwear",
    "shoe",
  ];
  const family = String(item.category).toLowerCase();
  if (
    !validFamilies.includes(family) &&
    !validFamilies.includes(String(item.category?.family || "").toLowerCase())
  ) {
    return false;
  }

  if (
    item.formality !== undefined &&
    (!Number.isFinite(Number(item.formality)) ||
      Number(item.formality) < 0 ||
      Number(item.formality) > 1)
  ) {
    return false;
  }

  if (Array.isArray(item.measurements)) {
    for (const measurement of item.measurements) {
      if (
        measurement?.value !== undefined &&
        (!Number.isFinite(Number(measurement.value)) ||
          Number(measurement.value) < 0)
      ) {
        return false;
      }
    }
  }

  return true;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!isBrowser()) {
      reject(new Error("IndexedDB is unavailable in this environment."));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error("Unable to open wardrobe database."));
  });
}

function readAllRecords() {
  return new Promise((resolve, reject) => {
    openDatabase()
      .then((database) => {
        const transaction = database.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () =>
          reject(request.error || new Error("Unable to load wardrobe."));
      })
      .catch(reject);
  });
}

export async function loadWardrobe() {
  if (!isBrowser()) return getSeedGarments();

  try {
    const records = await readAllRecords();
    if (records.length > 0) return records;

    const seed = getSeedGarments().map((item) => ({
      ...item,
      status: item.status || "available",
    }));
    await saveWardrobe(seed);
    return seed;
  } catch (error) {
    console.warn("IndexedDB load failed, using seed wardrobe.", error);
    return getSeedGarments();
  }
}

// Migration-only read that does not seed the server with sample wardrobe.json data.
export async function loadExistingWardrobe() {
  if (!isBrowser()) return [];
  try {
    return await readAllRecords();
  } catch {
    return [];
  }
}

export async function saveWardrobe(items) {
  if (!isBrowser()) return items;

  const cleaned = Array.isArray(items) ? items.filter(Boolean) : [];
  const records = cleaned.filter(validateGarmentRecord);

  try {
    const database = await openDatabase();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    store.clear();
    for (const item of records) {
      store.put({ ...item, status: item.status || "available" });
    }

    return records;
  } catch (error) {
    console.warn("Save wardrobe failed.", error);
    return records;
  }
}

export async function addGarment(item) {
  const current = await loadWardrobe();
  const next = [...current, item];
  await saveWardrobe(next);
  return next;
}

export async function updateGarment(item) {
  const current = await loadWardrobe();
  const next = current.map((entry) =>
    entry.id === item.id ? { ...entry, ...item } : entry,
  );
  await saveWardrobe(next);
  return next;
}

export async function deleteGarment(garmentId) {
  const current = await loadWardrobe();
  const next = current.filter((item) => item.id !== garmentId);
  await saveWardrobe(next);
  return next;
}

export function normalizeImportRecord(item) {
  return item && typeof item === "object" ? { ...item } : item;
}

export function upsertGarmentImage(items, garmentId, imageRecord) {
  if (
    !Array.isArray(items) ||
    !garmentId ||
    !imageRecord ||
    typeof imageRecord !== "object"
  ) {
    return items;
  }

  return items.map((item) =>
    item.id === garmentId ? { ...item, ...imageRecord } : item,
  );
}

export async function importWardrobeRecords(payload) {
  const garments = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload)
      ? payload
      : [];
  const validGarments = garments.filter(validateGarmentRecord);
  if (validGarments.length !== garments.length) {
    throw new Error("Some wardrobe records are invalid and were not imported.");
  }

  const current = await loadWardrobe();
  const currentMap = new Map(current.map((item) => [item.id, item]));
  const nextMap = new Map(validGarments.map((item) => [item.id, item]));

  const newIds = [];
  const updatedIds = [];
  const conflictingIds = [];

  for (const garment of validGarments) {
    if (!currentMap.has(garment.id)) {
      newIds.push(garment.id);
    } else if (
      JSON.stringify(currentMap.get(garment.id)) !== JSON.stringify(garment)
    ) {
      updatedIds.push(garment.id);
    }
  }

  for (const id of [...currentMap.keys(), ...nextMap.keys()]) {
    if (
      currentMap.has(id) &&
      nextMap.has(id) &&
      JSON.stringify(currentMap.get(id)) !== JSON.stringify(nextMap.get(id))
    ) {
      conflictingIds.push(id);
    }
  }

  return {
    garments: validGarments,
    summary: { newIds, updatedIds, conflictingIds },
  };
}

export async function replaceWardrobeRecords(garments) {
  const valid = Array.isArray(garments)
    ? garments.filter(validateGarmentRecord)
    : [];
  await saveWardrobe(valid);
  return valid;
}

export function exportWardrobePayload(items) {
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    garments: Array.isArray(items) ? items.map((item) => ({ ...item })) : [],
  };
}

export function saveProfile(profile) {
  if (!hasLocalStorage()) return profile;
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.warn("Failed to save profile", error);
  }
  return profile;
}

export function loadProfile() {
  if (!hasLocalStorage()) return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn("Failed to load profile", error);
    return null;
  }
}

export function clearProfile() {
  if (!hasLocalStorage()) return null;
  window.localStorage.removeItem(PROFILE_KEY);
  return null;
}
