import apiClient from "./apiClient";

export const authService = {
  login: async (email, password) => {
    return apiClient.post("/api/auth/login", { email, password });
  },
  getMe: async () => {
    return apiClient.get("/api/auth/me");
  },
};

export default authService;
