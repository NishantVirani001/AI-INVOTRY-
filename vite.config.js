import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite config — dev server proxies /api to backend, allow Render preview hosts
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    allowedHosts: ["ai-invotry.onrender.com", ".onrender.com", "localhost", "127.0.0.1"],
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
    host: true,
    allowedHosts: ["ai-invotry.onrender.com", ".onrender.com", "localhost", "127.0.0.1"],
  },
});

