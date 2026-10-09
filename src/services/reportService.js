import apiClient from "./apiClient";

export const reportService = {
  getAnalytics: () => apiClient.get("/api/reports/analytics"),
  exportCsvUrl: "/api/reports/export",
};

export default reportService;
