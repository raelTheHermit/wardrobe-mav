import { useEffect, useState } from "react";

const CACHE_KEY = "wardrobe-ai.image-cache";

function readCache() {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeCache(next) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota failures.
  }
}

export function getCachedImageUrl(sourceUrl) {
  if (!sourceUrl || typeof sourceUrl !== "string") return null;
  const cache = readCache();
  return cache[sourceUrl] || null;
}

export function cacheImageUrl(sourceUrl, blobUrl) {
  if (
    !sourceUrl ||
    typeof sourceUrl !== "string" ||
    !blobUrl ||
    typeof blobUrl !== "string"
  ) {
    return null;
  }

  const cache = readCache();
  const next = { ...cache, [sourceUrl]: blobUrl };
  writeCache(next);
  return blobUrl;
}

export function resolveImageSourceSync(sourceUrl, options = {}) {
  const {
    isOffline = typeof navigator === "undefined" ? false : !navigator.onLine,
    readCache = getCachedImageUrl,
  } = options;

  if (!sourceUrl || typeof sourceUrl !== "string") return sourceUrl;
  if (isOffline) {
    const cached = readCache(sourceUrl);
    if (cached) return cached;
  }

  if (
    /^(https?:)?\/\//.test(sourceUrl) ||
    sourceUrl.startsWith("data:") ||
    sourceUrl.startsWith("blob:")
  ) {
    return sourceUrl;
  }

  return sourceUrl;
}

export async function resolveImageSource(sourceUrl, options = {}) {
  const {
    isOffline = typeof navigator === "undefined" ? false : !navigator.onLine,
    readCache = getCachedImageUrl,
    fetchUrl = async (url) => {
      const response = await fetch(url, { cache: "force-cache" });
      if (!response.ok) return null;
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      cacheImageUrl(url, blobUrl);
      return blobUrl;
    },
  } = options;

  const cached = readCache(sourceUrl);
  if (isOffline && cached) return cached;
  if (!sourceUrl || typeof sourceUrl !== "string") return sourceUrl;

  try {
    return (await fetchUrl(sourceUrl)) || sourceUrl;
  } catch {
    return cached || sourceUrl;
  }
}

export function useResolvedImageSource(sourceUrl) {
  const [resolved, setResolved] = useState(() =>
    resolveImageSourceSync(sourceUrl),
  );

  useEffect(() => {
    let active = true;
    setResolved(resolveImageSourceSync(sourceUrl));

    if (!sourceUrl) return undefined;

    const load = async () => {
      const next = await resolveImageSource(sourceUrl);
      if (active) setResolved(next);
    };

    load();
    return () => {
      active = false;
    };
  }, [sourceUrl]);

  return resolved;
}
