import apiClient from "./apiClient";

export const notificationService = {
  getAll: () => apiClient.get("/api/notifications"),
  dismiss: (id) => apiClient.delete(`/api/notifications/${id}`),
  clearAll: () => apiClient.delete("/api/notifications"),
};

export default notificationService;
