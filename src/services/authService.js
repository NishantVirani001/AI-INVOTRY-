import apiClient from "./apiClient";

export const authService = {
  login: async (email, password) => {
    return apiClient.post("/api/auth/login", { email, password });
  },
  signup: async (userData) => {
    return apiClient.post("/api/auth/signup", userData);
  },
  getMe: async () => {
    return apiClient.get("/api/auth/me");
  },
};

export default authService;
