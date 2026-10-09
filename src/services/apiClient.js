const API_BASE = import.meta.env.VITE_API_BASE || "";

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

// High-throughput in-memory cache with ultra-fast freshness (1.5s fresh TTL for in-page deduplication)
const requestCache = new Map();
const inFlightRequests = new Map();

const FRESH_TTL_MS = 1500; // 1.5s fresh TTL (prevents duplicate requests on component mount)
const STALE_TTL_MS = 4000; // 4s stale-while-revalidate

export function clearApiCache() {
  requestCache.clear();
}

// Global broadcast function for immediate real-time sync
export function notifyDataChanged(endpoint = "") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("stockpilot-data-updated", { detail: { endpoint } }));
  try {
    if (window.BroadcastChannel) {
      const bc = new BroadcastChannel("stockpilot-sync");
      bc.postMessage({ type: "DATA_UPDATED", endpoint, ts: Date.now() });
      bc.close();
    }
    localStorage.setItem("stockpilot-sync-ts", Date.now().toString());
  } catch {
    // Ignore cross-origin / private mode limitations
  }
}

async function request(endpoint, options = {}) {
  const token = localStorage.getItem("stockpilot-token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const isGet = !options.method || options.method === "GET";
  const bypassCache = Boolean(options.bypassCache);

  // Mutations invalidate cached GET data immediately across the entire app
  if (!isGet) {
    clearApiCache();
  }

  const cacheKey = `${url}:${token || "anon"}`;

  if (isGet && !bypassCache) {
    const cached = requestCache.get(cacheKey);
    const now = Date.now();

    // 1. Fresh cache hit: Instant return!
    if (cached && now - cached.timestamp < FRESH_TTL_MS) {
      return cached.data;
    }

    // 2. Stale cache hit: Return immediately, revalidate silently in background!
    if (cached && now - cached.timestamp < STALE_TTL_MS) {
      if (!inFlightRequests.has(cacheKey)) {
        // Trigger background fetch
        const bgPromise = fetch(url, { ...options, headers })
          .then((res) => (res.headers.get("content-type")?.includes("application/json") ? res.json() : res.text()))
          .then((freshData) => {
            requestCache.set(cacheKey, { timestamp: Date.now(), data: freshData });
          })
          .catch(() => {})
          .finally(() => inFlightRequests.delete(cacheKey));
        inFlightRequests.set(cacheKey, bgPromise);
      }
      return cached.data;
    }

    // 3. In-flight request deduplication: reuse active network promise
    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey);
    }
  }

  const execute = async () => {
    try {
      let res;
      try {
        res = await fetch(url, { ...options, headers });
      } catch (networkErr) {
        // If relative URL failed (Vite proxy issue or IPv6 resolution), retry direct connection to 127.0.0.1:5000
        if (!API_BASE && url.startsWith("/api")) {
          const directUrl = `http://127.0.0.1:5000${url}`;
          res = await fetch(directUrl, { ...options, headers });
        } else {
          throw networkErr;
        }
      }

      const isJson = res.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await res.json() : await res.text();

      if (!res.ok) {
        const errorMsg = data?.detail || data?.message || `Request failed with status ${res.status}`;
        throw new ApiError(errorMsg, res.status, data);
      }

      if (isGet) {
        requestCache.set(cacheKey, { timestamp: Date.now(), data });
      } else {
        // Mutation succeeded! Immediately trigger continuous live updates
        clearApiCache();
        notifyDataChanged(endpoint);
      }

      return data;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      const friendlyMsg = (err.name === "TypeError" && err.message?.toLowerCase().includes("fetch"))
        ? "Cannot connect to backend server. Please verify that the API server is running on port 5000."
        : err.message || "Network connection error";
      throw new ApiError(friendlyMsg, 0, null);
    } finally {
      if (isGet) {
        inFlightRequests.delete(cacheKey);
      }
    }
  };

  if (isGet) {
    const promise = execute();
    inFlightRequests.set(cacheKey, promise);
    return promise;
  }

  return execute();
}

export const apiClient = {
  get: (endpoint, params, options = {}) => {
    let url = endpoint;
    if (params) {
      const search = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          search.append(k, v);
        }
      });
      const qs = search.toString();
      if (qs) url += (url.includes("?") ? "&" : "?") + qs;
    }
    return request(url, { method: "GET", ...options });
  },
  post: (endpoint, body) =>
    request(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  put: (endpoint, body) =>
    request(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: (endpoint) =>
    request(endpoint, {
      method: "DELETE",
    }),
  clearCache: clearApiCache,
  notify: notifyDataChanged,
};

export default apiClient;
