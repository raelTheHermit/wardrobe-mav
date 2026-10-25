import { queuePendingOperation, isOnline } from "./offlineSync.js";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
).replace(/\/$/, "");
const MEDIA_BASE = API_BASE.replace(/\/api$/, "");
export const mediaUrl = (path) => {
  if (!path || typeof path !== "string") return path;
  if (
    /^(https?:)?\/\//.test(path) ||
    path.startsWith("data:") ||
    path.startsWith("blob:")
  ) {
    return path;
  }
  return path.startsWith("/media/") ? `${MEDIA_BASE}${path}` : path;
};

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

let unauthorizedHandler = null;
export const setUnauthorizedHandler = (fn) => {
  unauthorizedHandler = fn;
};

const csrfToken = () => {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )csrf_access_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

const AUTH_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/logout",
  "/auth/me",
];

export async function apiRequest(path, options = {}) {
  const { _sync, _noQueue, ...fetchOptions } = options;
  const url = `${API_BASE}${path}`;
  const method = (options.method || "GET").toUpperCase();
  const isForm = options.body instanceof FormData;
  const isAuthPath = AUTH_PATHS.includes(path);
  const headers = { ...options.headers };

  if (
    options.body != null &&
    !isForm &&
    !Object.keys(headers).some((key) => key.toLowerCase() === "content-type")
  ) {
    headers["Content-Type"] = "application/json";
  }

  const shouldQueue =
    !_sync &&
    !_noQueue &&
    !isAuthPath &&
    !isForm &&
    method !== "GET" &&
    method !== "HEAD";

  const queueIt = () => {
    const body =
      typeof options.body === "string"
        ? JSON.parse(options.body)
        : options.body;
    queuePendingOperation({
      path,
      method,
      headers: { ...headers },
      body,
    });
  };

  if (!isOnline()) {
    if (shouldQueue) {
      queueIt();
      return null;
    }
    if (isForm) {
      throw new ApiError(
        "You’re offline. Images can only be uploaded when you’re back online.",
        0,
      );
    }
  }

  const sendHeaders = { ...headers };
  if (method !== "GET" && method !== "HEAD") {
    const token = csrfToken();
    if (token) sendHeaders["X-CSRF-TOKEN"] = token;
  }

  let response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers: sendHeaders,
      credentials: "include",
    });
  } catch (error) {
    if (shouldQueue) {
      queueIt();
      return null;
    }
    throw new ApiError(`Cannot reach the server at ${API_BASE}.`, 0);
  }

  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));

  if (response.status === 401 && !isAuthPath) {
    if (shouldQueue) queueIt();
    unauthorizedHandler?.();
  }

  if (!response.ok) {
    throw new ApiError(
      payload.error?.message || "The request failed.",
      response.status,
      payload.error?.details,
    );
  }

  return payload;
}

const json = (body) => ({ body: JSON.stringify(body) });

export const authApi = {
  register: (data) =>
    apiRequest("/auth/register", { method: "POST", ...json(data) }).then(
      (result) => result.user,
    ),
  login: (data) =>
    apiRequest("/auth/login", { method: "POST", ...json(data) }).then(
      (result) => result.user,
    ),
  logout: () => apiRequest("/auth/logout", { method: "POST" }),
  me: () =>
    apiRequest("/auth/me")
      .then((result) => result.user)
      .catch((error) => {
        if (error.status === 401) return null;
        throw error;
      }),
  sync: () => apiRequest("/sync"),
};

export const wardrobeApi = {
  list: () => apiRequest("/wardrobe").then((result) => result.items),
  create: (item) =>
    apiRequest("/wardrobe", { method: "POST", ...json(item) }).then(
      (result) => result?.item ?? item,
    ),
  update: (item) =>
    apiRequest(`/wardrobe/${encodeURIComponent(item.id)}`, {
      method: "PATCH",
      ...json(item),
    }).then((result) => result?.item ?? item),
  remove: (id) =>
    apiRequest(`/wardrobe/${encodeURIComponent(id)}`, { method: "DELETE" }),
  profile: () => apiRequest("/profile").then((result) => result.profile),
  saveProfile: (profile) =>
    apiRequest("/profile", { method: "PUT", ...json(profile) }).then(
      (result) => result?.profile ?? profile,
    ),
  preferences: () =>
    apiRequest("/preferences").then((result) => result.preferences),
  savePreferences: (preferences) =>
    apiRequest("/preferences", { method: "PUT", ...json(preferences) }).then(
      (result) => result?.preferences ?? preferences,
    ),
  recommendations: (data) =>
    apiRequest("/recommendations", {
      method: "POST",
      _noQueue: true,
      ...json(data),
    }).then((result) => result.outfits),
  history: () => apiRequest("/history").then((result) => result.items),
  saveHistory: (entry) =>
    apiRequest("/history", { method: "POST", ...json(entry) }),
  upload: (id, file) => {
    const form = new FormData();
    form.append("image", file);
    return apiRequest(`/wardrobe/${encodeURIComponent(id)}/image`, {
      method: "POST",
      body: form,
    }).then((result) => result.item);
  },
};
