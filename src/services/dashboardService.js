import apiClient from "./apiClient";

export const dashboardService = {
  getStats: (force = false) =>
    apiClient.get("/api/dashboard/stats", force ? { refresh: "1" } : undefined, {
      bypassCache: force,
    }),
};

export default dashboardService;
