import apiClient from "./apiClient";

export const dashboardService = {
  getStats: () => apiClient.get("/api/dashboard/stats"),
};

export default dashboardService;
