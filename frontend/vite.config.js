import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// The frontend talks to the backend via VITE_API_BASE (see .env). In dev we
// also proxy /api to the backend so you can leave VITE_API_BASE empty.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_API_BASE || "http://localhost:5001",
        changeOrigin: true,
      },
    },
  },
});
