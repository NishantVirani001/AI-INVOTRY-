// StockPilot High-Reliability Enterprise API Client
// Handles: Dynamic Backend URL routing (Vercel <-> Render), Cold-Start Auto-Retry, CORS Headers, and Resilient Storage Fallback

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

// In-memory cache for fast UI updates & deduplication
const requestCache = new Map();
const inFlightRequests = new Map();

const FRESH_TTL_MS = 1500;
const STALE_TTL_MS = 4000;

export function clearApiCache() {
  requestCache.clear();
}

/**
 * Dynamically resolves the active Backend URL.
 * Priority:
 * 1. User runtime setting in localStorage (allows instant linking to Render from UI)
 * 2. Build-time environment variable VITE_API_BASE
 * 3. Empty string "" (Vite dev server proxies /api to port 5000)
 */
export function getBackendUrl() {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("stockpilot_backend_url");
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, "");
    }
  }
  const envUrl = import.meta.env.VITE_API_BASE;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, "");
  }
  return "";
}

export function setBackendUrl(url) {
  if (typeof window === "undefined") return;
  const cleaned = (url || "").trim().replace(/\/+$/, "");
  if (cleaned) {
    localStorage.setItem("stockpilot_backend_url", cleaned);
  } else {
    localStorage.removeItem("stockpilot_backend_url");
  }
  clearApiCache();
  notifyDataChanged("backend-config");
}

/**
 * Tests connection to a given backend URL (used by UI Cloud Sync modal)
 */
export async function testBackendConnection(targetUrl) {
  const url = (targetUrl || getBackendUrl()).trim().replace(/\/+$/, "");
  const pingUrl = url ? `${url}/api/health` : "/api/health";
  const startTime = Date.now();
  try {
    const res = await fetch(pingUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      mode: "cors",
    });
    const latency = Date.now() - startTime;
    if (res.ok) {
      const isJson = res.headers.get("content-type")?.includes("application/json");
      if (isJson) {
        return { ok: true, latency, status: res.status, message: `Connected to API in ${latency}ms` };
      }
      return { ok: false, latency, status: res.status, message: "Server returned HTML instead of API JSON (verify URL)" };
    }
    return { ok: false, latency, status: res.status, message: `Server responded with HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, latency: Date.now() - startTime, error: err.message, message: "Cannot reach backend. Render instance may be booting or offline." };
  }
}

// Global broadcast function for continuous data sync
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
  } catch {}
}

// Pre-warm backend silently on load
if (typeof window !== "undefined") {
  setTimeout(() => {
    const base = getBackendUrl();
    if (base) {
      testBackendConnection(base).then((res) => {
        window.dispatchEvent(
          new CustomEvent("stockpilot-backend-status", {
            detail: { status: res.ok ? "online" : "offline", message: res.message, url: base },
          })
        );
      });
    }
  }, 800);
}

// Client-side fallback handler for static hosting / cold starts / offline
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
            productsSupplied: 3,
          },
        ];
        localStorage.setItem("stockpilot_suppliers", JSON.stringify(stored));
      }
      if (method === "GET") return stored;
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

      if (method === "GET") return stored;
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

    // 4. CUSTOMERS
    if (path.startsWith("customers")) {
      const parts = path.split("/");
      let stored = JSON.parse(localStorage.getItem("stockpilot_customers") || "[]");
      if (stored.length === 0) {
        stored = [
          { id: "cust_1", name: "Denver Build Co.", email: "denver@buildco.com", phone: "+1 303-555-0199", ordersCount: 2, totalSpent: 2668, createdAt: "2026-03-01" },
          { id: "cust_2", name: "Apex Industrial Supplies", email: "procurement@apexind.com", phone: "+1 415-555-0142", ordersCount: 1, totalSpent: 460, createdAt: "2026-03-05" },
          { id: "cust_3", name: "Metro Hardware Hub", email: "orders@metrohardware.com", phone: "+1 212-555-0188", ordersCount: 1, totalSpent: 230, createdAt: "2026-03-08" },
        ];
        localStorage.setItem("stockpilot_customers", JSON.stringify(stored));
      }
      if (method === "GET") return stored;
      if (method === "POST") {
        const newCust = {
          id: `cust_${Date.now().toString(36)}`,
          name: body.name?.trim() || "Customer",
          email: body.email?.trim() || "",
          phone: body.phone?.trim() || "",
          ordersCount: 0,
          totalSpent: 0,
          createdAt: new Date().toISOString().slice(0, 10),
        };
        stored.push(newCust);
        localStorage.setItem("stockpilot_customers", JSON.stringify(stored));
        return newCust;
      }
      if (method === "DELETE" && parts[1]) {
        stored = stored.filter((c) => c.id !== parts[1]);
        localStorage.setItem("stockpilot_customers", JSON.stringify(stored));
        return { status: "ok" };
      }
    }

    // 5. SALES & ORDERS
    if (path.startsWith("sales") || path.startsWith("orders")) {
      const parts = path.split("/");
      let stored = JSON.parse(localStorage.getItem("stockpilot_sales") || "[]");
      if (stored.length === 0) {
        stored = [
          { id: "ord_101", invoice: "INV-101", customer: "Denver Build Co.", customerEmail: "denver@buildco.com", product: "Power Drill X", sku: "PWR-1", quantity: 5, items: 5, unitPrice: 230, total: 1150, status: "Completed", orderType: "Completed", date: "2026-03-10", notes: "In-store POS sale" },
          { id: "ord_102", invoice: "INV-102", customer: "Apex Industrial Supplies", customerEmail: "procurement@apexind.com", product: "Steel Hex Bolts", sku: "FST-2", quantity: 20, items: 20, unitPrice: 23, total: 460, status: "Accepted", orderType: "Pending", date: "2026-03-11", notes: "Awaiting dispatch" },
          { id: "ord_103", invoice: "INV-103", customer: "Denver Build Co.", customerEmail: "denver@buildco.com", product: "Copper Piping 2m", sku: "RAW-3", quantity: 2, items: 2, unitPrice: 759, total: 1518, status: "Pending", orderType: "Pending", date: "2026-03-12", notes: "Awaiting approval" },
        ];
        localStorage.setItem("stockpilot_sales", JSON.stringify(stored));
      }
      // Ensure all items conform to sales schema
      stored = stored.map((s, idx) => ({
        ...s,
        id: s.id || `ord_${idx + 1}`,
        invoice: s.invoice || s.id || `INV-${1000 + idx + 1}`,
        customer: s.customer || "General Client",
        items: s.items ?? s.quantity ?? 1,
        total: s.total ?? 0,
        status: s.status || "Completed",
        date: s.date || new Date().toISOString().slice(0, 10),
      }));

      if (method === "GET") return stored;
      if (method === "POST") {
        const prods = JSON.parse(localStorage.getItem("stockpilot_products") || "[]");
        const foundProd = prods.find((p) => p.sku === body.product || p.name === body.product);
        const unitPrice = foundProd ? Number(foundProd.price) : 100;
        const qty = Number(body.quantity) || 1;
        const newSale = {
          id: `ord_${Date.now().toString(36)}`,
          invoice: `INV-${Date.now().toString(36).slice(-4).toUpperCase()}`,
          customer: body.customer || "General Client",
          customerEmail: body.customerEmail || "",
          product: foundProd ? foundProd.name : body.product || "Product",
          sku: foundProd ? foundProd.sku : "SKU-GEN",
          quantity: qty,
          items: qty,
          unitPrice,
          total: qty * unitPrice,
          status: body.orderType === "Completed" ? "Completed" : "Pending",
          orderType: body.orderType || "Pending",
          date: new Date().toISOString().slice(0, 10),
          notes: body.notes || "",
        };
        stored.unshift(newSale);
        localStorage.setItem("stockpilot_sales", JSON.stringify(stored));
        return newSale;
      }
      if (method === "PUT" && parts[1]) {
        const orderId = parts[1];
        const action = parts[2];
        const idx = stored.findIndex((o) => o.id === orderId || o.invoice === orderId);
        if (idx !== -1) {
          if (action === "accept") stored[idx].status = "Accepted";
          else if (action === "reject") stored[idx].status = "Rejected";
          else if (action === "complete") stored[idx].status = "Completed";
          localStorage.setItem("stockpilot_sales", JSON.stringify(stored));
          return stored[idx];
        }
      }
    }

    // 6. PURCHASES
    if (path.startsWith("purchases")) {
      const parts = path.split("/");
      let stored = JSON.parse(localStorage.getItem("stockpilot_purchases") || "[]");
      if (stored.length === 0) {
        stored = [
          { id: "po_101", po: "PO-101", supplier: "Parameport Global", product: "Power Drill X", sku: "PWR-1", quantity: 50, items: 50, unitCost: 180, totalCost: 9000, total: 9000, status: "Received", date: "2026-03-01" },
          { id: "po_102", po: "PO-102", supplier: "Parameport Global", product: "Steel Hex Bolts", sku: "FST-2", quantity: 500, items: 500, unitCost: 15, totalCost: 7500, total: 7500, status: "Pending", date: "2026-03-08" },
        ];
        localStorage.setItem("stockpilot_purchases", JSON.stringify(stored));
      }
      // Ensure all items conform to purchase schema
      stored = stored.map((p, idx) => ({
        ...p,
        id: p.id || `po_${idx + 1}`,
        po: p.po || p.id || `PO-${2000 + idx + 1}`,
        supplier: p.supplier || "Parameport Global",
        items: p.items ?? p.quantity ?? 1,
        total: p.total ?? p.totalCost ?? 0,
        status: p.status || "Pending",
        date: p.date || new Date().toISOString().slice(0, 10),
      }));

      if (method === "GET") return stored;
      if (method === "POST") {
        const newPO = {
          id: `po_${Date.now().toString(36)}`,
          po: `PO-${Date.now().toString(36).slice(-4).toUpperCase()}`,
          supplier: body.supplier || "Parameport Global",
          product: body.product || "Product",
          sku: body.sku || "SKU-PO",
          quantity: Number(body.quantity) || 1,
          items: Number(body.quantity) || 1,
          unitCost: Number(body.unitCost) || 100,
          totalCost: (Number(body.quantity) || 1) * (Number(body.unitCost) || 100),
          total: (Number(body.quantity) || 1) * (Number(body.unitCost) || 100),
          status: "Pending",
          date: new Date().toISOString().slice(0, 10),
        };
        stored.unshift(newPO);
        localStorage.setItem("stockpilot_purchases", JSON.stringify(stored));
        return newPO;
      }
      if (method === "PUT" && parts[1]) {
        const poId = parts[1];
        const action = parts[2];
        const idx = stored.findIndex((o) => o.id === poId || o.po === poId);
        if (idx !== -1) {
          if (action === "receive") stored[idx].status = "Received";
          localStorage.setItem("stockpilot_purchases", JSON.stringify(stored));
          return stored[idx];
        }
      }
    }

    // 7. NOTIFICATIONS
    if (path.startsWith("notifications")) {
      let stored = JSON.parse(localStorage.getItem("stockpilot_notifications") || "[]");
      if (stored.length === 0) {
        stored = [
          { id: "n_1", title: "Low Stock Alert", message: "Copper Piping 2m is below reorder threshold (10 units remaining).", type: "warning", read: false, createdAt: new Date().toISOString() },
          { id: "n_2", title: "New Order Received", message: "Denver Build Co. submitted order for 2 units.", type: "info", read: false, createdAt: new Date().toISOString() },
        ];
        localStorage.setItem("stockpilot_notifications", JSON.stringify(stored));
      }
      if (method === "GET") return stored;
      if (method === "PUT") {
        stored = stored.map((n) => ({ ...n, read: true }));
        localStorage.setItem("stockpilot_notifications", JSON.stringify(stored));
        return { status: "ok" };
      }
    }

    // 8. DASHBOARD STATS
    if (path.startsWith("dashboard")) {
      const prods = JSON.parse(localStorage.getItem("stockpilot_products") || "[]");
      const sups = JSON.parse(localStorage.getItem("stockpilot_suppliers") || "[]");
      const cats = JSON.parse(localStorage.getItem("stockpilot_categories") || "[]");
      const sales = JSON.parse(localStorage.getItem("stockpilot_sales") || "[]");
      const totalUnits = prods.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
      const totalVal = prods.reduce((sum, p) => sum + ((Number(p.quantity) || 0) * (Number(p.price) || 0)), 0);
      const totalRev = sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
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
        totalSalesCount: sales.length,
        totalInventoryValue: Math.round(totalVal),
        totalRevenue: Math.round(totalRev),
        lowStockCount: lowCount,
        outOfStockCount: outCount,
        inStockCount: Math.max(0, prods.length - lowCount - outCount),
        reorderAlerts: lowCount + outCount,
        pendingPOs: 0,
        pendingOrders: sales.filter((s) => s.status === "Pending").length,
        categoryDistribution: catDist,
        recentActivities: [],
        salesTrend: [],
        inventoryLevels: [{ month: "Oct", level: totalUnits }],
        productStock,
      };
    }

    // 9. HEALTH
    if (path.startsWith("health")) {
      return { status: "ok", service: "StockPilot Fallback Local Engine" };
    }
  } catch (err) {
    console.error("Fallback handler error:", err);
  }
  return undefined;
}

/**
 * Robust fetch with Render Cold-Start retry & detection
 */
async function fetchWithRetry(url, options, maxRetries = 2) {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const res = await fetch(url, options);

      // Render cold-start status codes: 502 Bad Gateway / 503 Unavailable / 504 Gateway Timeout
      if ((res.status === 502 || res.status === 503 || res.status === 504) && attempt < maxRetries) {
        attempt++;
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("stockpilot-backend-status", {
              detail: { status: "waking", attempt, maxRetries, message: `Cloud backend waking up (attempt ${attempt}/${maxRetries})...` },
            })
          );
        }
        await new Promise((r) => setTimeout(r, 2200 * attempt));
        continue;
      }

      return res;
    } catch (networkErr) {
      if (attempt < maxRetries) {
        attempt++;
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("stockpilot-backend-status", {
              detail: { status: "waking", attempt, maxRetries, message: `Reconnecting to cloud backend (attempt ${attempt}/${maxRetries})...` },
            })
          );
        }
        await new Promise((r) => setTimeout(r, 2200 * attempt));
        continue;
      }
      throw networkErr;
    }
  }
}

async function request(endpoint, options = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("stockpilot-token") : null;
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const base = getBackendUrl();
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${base}${cleanEndpoint}`;
  const isGet = !options.method || options.method === "GET";
  const bypassCache = Boolean(options.bypassCache);

  if (!isGet) {
    clearApiCache();
  }

  const cacheKey = `${url}:${token || "anon"}`;

  if (isGet && !bypassCache) {
    const cached = requestCache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < FRESH_TTL_MS) {
      return cached.data;
    }

    if (cached && now - cached.timestamp < STALE_TTL_MS) {
      if (!inFlightRequests.has(cacheKey)) {
        const bgPromise = fetchWithRetry(url, { ...options, headers }, 1)
          .then((res) => (res.headers.get("content-type")?.includes("application/json") ? res.json() : null))
          .then((freshData) => {
            if (freshData !== null) {
              requestCache.set(cacheKey, { timestamp: Date.now(), data: freshData });
            }
          })
          .catch(() => {})
          .finally(() => inFlightRequests.delete(cacheKey));
        inFlightRequests.set(cacheKey, bgPromise);
      }
      return cached.data;
    }

    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey);
    }
  }

  const execute = async () => {
    try {
      let res;
      try {
        res = await fetchWithRetry(url, { ...options, headers }, 2);
      } catch (networkErr) {
        // If relative URL failed on localhost, fallback to direct port 5000
        if (!base && url.startsWith("/api") && typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
          const directUrl = `http://127.0.0.1:5000${url}`;
          res = await fetchWithRetry(directUrl, { ...options, headers }, 1);
        } else {
          throw networkErr;
        }
      }

      const contentType = res.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");

      // CRITICAL VERCEL PROTECTION:
      // If Vercel rewrote /api/* to /index.html, it returns text/html with status 200.
      // This is NOT a real API response.
      if (contentType.includes("text/html")) {
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
        throw new ApiError("Cloud backend not linked. Please configure Render backend URL in the header.", 503, null);
      }

      const data = isJson ? await res.json() : await res.text();

      if (!res.ok) {
        if (res.status === 405 || res.status === 404 || res.status === 502 || res.status === 503) {
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

      // Successful live response from real backend! Broadcast online status
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("stockpilot-backend-status", { detail: { status: "online", url: base } }));
      }

      if (isGet) {
        requestCache.set(cacheKey, { timestamp: Date.now(), data });
      } else {
        clearApiCache();
        notifyDataChanged(endpoint);
      }

      return data;
    } catch (err) {
      if (err instanceof ApiError) throw err;

      // Handle offline or static fallback seamlessly
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

      const friendlyMsg =
        err.name === "TypeError" && err.message?.toLowerCase().includes("fetch")
          ? "Cannot connect to backend server. Verify your Render backend URL or local port 5000."
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
  getUrl: getBackendUrl,
  setUrl: setBackendUrl,
  testConnection: testBackendConnection,
};

export default apiClient;
