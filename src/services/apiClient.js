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

// Client-side fallback handler for static hosting environments (Vercel without backend proxy)
function handleClientFallback(endpoint, options = {}) {
  try {
    const method = (options.method || "GET").toUpperCase();
    const body = options.body ? JSON.parse(options.body) : {};
    const path = endpoint.split("?")[0].replace(/^\/api\//, "").replace(/^\//, "");

    // 1. SUPPLIERS
    if (path.startsWith("suppliers")) {
      const parts = path.split("/");
      let stored = JSON.parse(localStorage.getItem("stockpilot_suppliers") || "[]");
      if (stored.length === 0) {
        stored = [
          {
            id: "s_1",
            name: "Parameport Global",
            contact: "Param",
            email: "param@parameport.com",
            phone: "+91 98765 43210",
            rating: 4.8,
            productsSupplied: 2,
          },
        ];
        localStorage.setItem("stockpilot_suppliers", JSON.stringify(stored));
      }

      if (method === "GET") {
        return stored;
      }
      if (method === "POST") {
        const newSup = {
          id: `s_${Date.now().toString(36)}`,
          name: body.name?.trim() || "New Supplier",
          contact: body.contact?.trim() || "",
          email: body.email?.trim() || "",
          phone: body.phone?.trim() || "",
          rating: Number(body.rating) || 4.5,
          productsSupplied: 0,
        };
        stored.push(newSup);
        localStorage.setItem("stockpilot_suppliers", JSON.stringify(stored));
        return newSup;
      }
      if (method === "DELETE" && parts[1]) {
        stored = stored.filter((s) => s.id !== parts[1]);
        localStorage.setItem("stockpilot_suppliers", JSON.stringify(stored));
        return { status: "ok" };
      }
    }

    // 2. PRODUCTS
    if (path.startsWith("products")) {
      const parts = path.split("/");
      let stored = JSON.parse(localStorage.getItem("stockpilot_products") || "[]");
      if (stored.length === 0) {
        stored = [
          {
            id: "p_1",
            sku: "PWR-1",
            name: "Power Drill X",
            category: "Power Tools",
            supplier: "Parameport Global",
            price: 230,
            cost: 180,
            quantity: 30,
            reorderLevel: 5,
            stockStatus: "in",
            velocity: "fast",
            updated: new Date().toISOString().slice(0, 10),
          },
          {
            id: "p_2",
            sku: "FST-2",
            name: "Steel Hex Bolts",
            category: "Fasteners & Hardware",
            supplier: "Parameport Global",
            price: 23,
            cost: 15,
            quantity: 300,
            reorderLevel: 50,
            stockStatus: "in",
            velocity: "fast",
            updated: new Date().toISOString().slice(0, 10),
          },
          {
            id: "p_3",
            sku: "RAW-3",
            name: "Copper Piping 2m",
            category: "Raw Materials",
            supplier: "Parameport Global",
            price: 759,
            cost: 600,
            quantity: 10,
            reorderLevel: 15,
            stockStatus: "low",
            velocity: "slow",
            updated: new Date().toISOString().slice(0, 10),
          },
        ];
        localStorage.setItem("stockpilot_products", JSON.stringify(stored));
      }

      if (method === "GET") {
        return stored;
      }
      if (method === "POST") {
        if (parts[2] === "adjust") {
          const prodId = parts[1];
          const idx = stored.findIndex((p) => p.id === prodId || p.sku === prodId);
          if (idx !== -1) {
            const newQty = Math.max(0, (stored[idx].quantity || 0) + (Number(body.delta) || 0));
            stored[idx].quantity = newQty;
            stored[idx].stockStatus = newQty <= 0 ? "out" : newQty <= stored[idx].reorderLevel ? "low" : "in";
            localStorage.setItem("stockpilot_products", JSON.stringify(stored));
            return stored[idx];
          }
        }
        const qty = Number(body.quantity) || 0;
        const reorder = Number(body.reorderLevel) || 10;
        const newProd = {
          id: `p_${Date.now().toString(36)}`,
          sku: body.sku || `SKU-${Date.now().toString(36)}`,
          name: body.name || "Product",
          category: body.category || "General",
          supplier: body.supplier || "Direct",
          price: Number(body.price) || 0,
          cost: Number(body.cost) || 0,
          quantity: qty,
          reorderLevel: reorder,
          stockStatus: qty <= 0 ? "out" : qty <= reorder ? "low" : "in",
          velocity: qty > 20 ? "fast" : "slow",
          updated: new Date().toISOString().slice(0, 10),
        };
        stored.unshift(newProd);
        localStorage.setItem("stockpilot_products", JSON.stringify(stored));
        return newProd;
      }
      if (method === "PUT" && parts[1]) {
        const prodId = parts[1];
        const idx = stored.findIndex((p) => p.id === prodId || p.sku === prodId);
        if (idx !== -1) {
          const qty = Number(body.quantity) !== undefined ? Number(body.quantity) : stored[idx].quantity;
          const reorder = Number(body.reorderLevel) !== undefined ? Number(body.reorderLevel) : stored[idx].reorderLevel;
          stored[idx] = {
            ...stored[idx],
            ...body,
            quantity: qty,
            reorderLevel: reorder,
            stockStatus: qty <= 0 ? "out" : qty <= reorder ? "low" : "in",
            updated: new Date().toISOString().slice(0, 10),
          };
          localStorage.setItem("stockpilot_products", JSON.stringify(stored));
          return stored[idx];
        }
      }
      if (method === "DELETE" && parts[1]) {
        stored = stored.filter((p) => p.id !== parts[1]);
        localStorage.setItem("stockpilot_products", JSON.stringify(stored));
        return { status: "ok" };
      }
    }

    // 3. CATEGORIES
    if (path.startsWith("categories")) {
      const parts = path.split("/");
      let stored = JSON.parse(localStorage.getItem("stockpilot_categories") || "[]");
      if (stored.length === 0) {
        stored = [
          { id: "c_1", name: "Power Tools", description: "Industrial power tools" },
          { id: "c_2", name: "Fasteners & Hardware", description: "Bolts, screws and hardware" },
          { id: "c_3", name: "Raw Materials", description: "Raw stock and piping" },
        ];
        localStorage.setItem("stockpilot_categories", JSON.stringify(stored));
      }
      if (method === "GET") return stored;
      if (method === "POST") {
        const newCat = { id: `c_${Date.now().toString(36)}`, name: body.name || "Category", description: body.description || "" };
        stored.push(newCat);
        localStorage.setItem("stockpilot_categories", JSON.stringify(stored));
        return newCat;
      }
      if (method === "DELETE" && parts[1]) {
        stored = stored.filter((c) => c.id !== parts[1]);
        localStorage.setItem("stockpilot_categories", JSON.stringify(stored));
        return { status: "ok" };
      }
    }

    // 4. DASHBOARD STATS
    if (path.startsWith("dashboard")) {
      const prods = JSON.parse(localStorage.getItem("stockpilot_products") || "[]");
      const sups = JSON.parse(localStorage.getItem("stockpilot_suppliers") || "[]");
      const cats = JSON.parse(localStorage.getItem("stockpilot_categories") || "[]");
      const totalUnits = prods.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
      const totalVal = prods.reduce((sum, p) => sum + ((Number(p.quantity) || 0) * (Number(p.price) || 0)), 0);
      const lowCount = prods.filter((p) => (Number(p.quantity) || 0) > 0 && (Number(p.quantity) || 0) <= (Number(p.reorderLevel) || 10)).length;
      const outCount = prods.filter((p) => (Number(p.quantity) || 0) <= 0).length;

      const productStock = prods.map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        quantity: Number(p.quantity) || 0,
        reorderLevel: Number(p.reorderLevel) || 10,
        stockStatus: p.stockStatus || "in",
        price: Number(p.price) || 0,
        value: (Number(p.quantity) || 0) * (Number(p.price) || 0),
      }));

      const catDist = cats.map((c) => {
        const cProds = prods.filter((p) => p.category === c.name);
        return {
          name: c.name,
          count: cProds.length,
          units: cProds.reduce((s, p) => s + (Number(p.quantity) || 0), 0),
          value: cProds.reduce((s, p) => s + ((Number(p.quantity) || 0) * (Number(p.price) || 0)), 0),
        };
      });

      return {
        totalProducts: prods.length,
        totalCategories: cats.length,
        totalSuppliers: sups.length,
        totalSalesCount: 4,
        totalInventoryValue: Math.round(totalVal),
        totalRevenue: 2596.0,
        lowStockCount: lowCount,
        outOfStockCount: outCount,
        inStockCount: Math.max(0, prods.length - lowCount - outCount),
        reorderAlerts: lowCount + outCount,
        pendingPOs: 0,
        pendingOrders: 0,
        categoryDistribution: catDist,
        recentActivities: [],
        salesTrend: [],
        inventoryLevels: [{ month: "Oct", level: totalUnits }],
        productStock,
      };
    }
  } catch (err) {
    console.error("Fallback handler error:", err);
  }
  return undefined;
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
        // Intercept 405 (Method Not Allowed from static hosts like Vercel) or 404 on API endpoints
        if (res.status === 405 || res.status === 404) {
          const fallback = handleClientFallback(endpoint, options);
          if (fallback !== undefined) {
            if (isGet) {
              requestCache.set(cacheKey, { timestamp: Date.now(), data: fallback });
            } else {
              clearApiCache();
              notifyDataChanged(endpoint);
            }
            return fallback;
          }
        }

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

      // Handle offline or static fallback
      const fallback = handleClientFallback(endpoint, options);
      if (fallback !== undefined) {
        if (isGet) {
          requestCache.set(cacheKey, { timestamp: Date.now(), data: fallback });
        } else {
          clearApiCache();
          notifyDataChanged(endpoint);
        }
        return fallback;
      }

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
