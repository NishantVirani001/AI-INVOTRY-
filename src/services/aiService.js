import apiClient from "./apiClient";

export const aiService = {
  getInsights: () => apiClient.get("/api/ai/insights"),
  getAnomalies: () => apiClient.get("/api/ai/anomalies"),
  chat: (prompt = "", action = null) => apiClient.post("/api/ai/chat", { prompt, action }),
};

export default aiService;
