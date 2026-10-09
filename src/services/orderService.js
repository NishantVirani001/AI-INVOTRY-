import apiClient from "./apiClient";

export const orderService = {
  getAll: (customer = null) => apiClient.get("/api/sales", customer ? { customer } : undefined),
  getByCustomer: (customer) => apiClient.get("/api/sales", { customer }),
  create: (data) => apiClient.post("/api/sales", data),
  accept: (orderId) => apiClient.put(`/api/sales/${orderId}/accept`),
  reject: (orderId, reason = "Rejected by supplier") =>
    apiClient.put(`/api/sales/${orderId}/reject`, { reason }),
  complete: (orderId) => apiClient.put(`/api/sales/${orderId}/complete`),
};

export default orderService;
