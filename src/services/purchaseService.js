import apiClient from "./apiClient";

export const purchaseService = {
  getAll: () => apiClient.get("/api/purchases"),
  create: (data) => apiClient.post("/api/purchases", data),
  receive: (id) => apiClient.put(`/api/purchases/${id}/receive`),
};

export default purchaseService;
