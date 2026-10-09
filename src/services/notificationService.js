import apiClient from "./apiClient";

export const notificationService = {
  getAll: (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== "")
    );
    const qs = new URLSearchParams(cleanParams).toString();
    return apiClient.get(`/api/notifications${qs ? `?${qs}` : ""}`);
  },
  dismiss: (id) => apiClient.delete(`/api/notifications/${id}`),
  clearAll: () => apiClient.delete("/api/notifications"),
};

export default notificationService;
