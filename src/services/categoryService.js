import apiClient from "./apiClient";

export const categoryService = {
  getAll: () => apiClient.get("/api/categories"),
  create: (data) => apiClient.post("/api/categories", data),
  delete: (id) => apiClient.delete(`/api/categories/${id}`),
};

export default categoryService;
