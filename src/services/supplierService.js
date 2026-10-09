import apiClient from "./apiClient";

export const supplierService = {
  getAll: () => apiClient.get("/api/suppliers"),
  create: (data) => apiClient.post("/api/suppliers", data),
  delete: (id) => apiClient.delete(`/api/suppliers/${id}`),
};

export default supplierService;
