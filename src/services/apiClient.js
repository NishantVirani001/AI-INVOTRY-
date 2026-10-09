const API_BASE = import.meta.env.VITE_API_BASE || "";

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

// In-flight request deduplication and short-lived in-memory cache (3s)
const requestCache = new Map();
const inFlightRequests = new Map();

export function clearApiCache() {
  requestCache.clear();
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

  // Mutations invalidate cached GET data immediately
  if (!isGet) {
    clearApiCache();
  }

  const cacheKey = `${url}:${token || "anon"}`;

  if (isGet) {
    const cached = requestCache.get(cacheKey);
    // Return cached response if within 3000ms TTL
    if (cached && Date.now() - cached.timestamp < 3000) {
      return cached.data;
    }
    // Return existing in-flight promise to avoid duplicate concurrent HTTP requests
    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey);
    }
  }

  const execute = async () => {
    try {
      const res = await fetch(url, {
        ...options,
        headers,
      });

      const isJson = res.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await res.json() : await res.text();

      if (!res.ok) {
        const errorMsg = data?.detail || data?.message || `Request failed with status ${res.status}`;
        throw new ApiError(errorMsg, res.status, data);
      }

      if (isGet) {
        requestCache.set(cacheKey, { timestamp: Date.now(), data });
      }

      return data;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(err.message || "Network connection error", 0, null);
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
  get: (endpoint, params) => {
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
    return request(url, { method: "GET" });
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
};

export default apiClient;
