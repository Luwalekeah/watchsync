import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // In development, proxy /api calls to the Express backend so you don't
    // need to set VITE_API_URL — just run both servers and it works.
    proxy: {
      "/api": {
        target:      "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
