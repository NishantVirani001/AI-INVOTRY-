import apiClient from "./apiClient";

export const orderService = {
  getAll: () => apiClient.get("/api/sales"),
  create: (data) => apiClient.post("/api/sales", data),
  accept: (orderId) => apiClient.put(`/api/sales/${orderId}/accept`),
  reject: (orderId, reason = "Rejected by supplier") =>
    apiClient.put(`/api/sales/${orderId}/reject`, { reason }),
  complete: (orderId) => apiClient.put(`/api/sales/${orderId}/complete`),
};

export default orderService;
