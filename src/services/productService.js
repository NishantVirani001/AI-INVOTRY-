import apiClient from "./apiClient";

export const productService = {
  getAll: (params) => apiClient.get("/api/products", params),
  getById: (id) => apiClient.get(`/api/products/${id}`),
  create: (data) => apiClient.post("/api/products", data),
  update: (id, data) => apiClient.put(`/api/products/${id}`, data),
  delete: (id) => apiClient.delete(`/api/products/${id}`),
  adjustStock: (id, delta, reason) => apiClient.post(`/api/products/${id}/adjust`, { delta, reason }),
  shelfAudit: (sku, detected_count, auto_reconcile = false, notes) =>
    apiClient.post("/api/products/shelf-audit", { sku, detected_count, auto_reconcile, notes }),
};

export default productService;
