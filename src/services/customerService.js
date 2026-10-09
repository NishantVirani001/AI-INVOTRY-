import apiClient from "./apiClient";

export const customerService = {
  getAll: (params) => apiClient.get("/api/customers", params),
  create: (data) => apiClient.post("/api/customers", data),
  delete: (id) => apiClient.delete(`/api/customers/${id}`),
};

export default customerService;
