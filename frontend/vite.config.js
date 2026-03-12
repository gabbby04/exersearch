import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      "frontend-production-f74d.up.railway.app",
      "exersearch.online",
      "www.exersearch.online",
      "localhost",
      "127.0.0.1",
    ],
    proxy: {
      "/api": {
        target: "https://api.exersearch.online",
        changeOrigin: true,
        secure: true,
      },
    },
  },
  preview: {
    allowedHosts: [
      "frontend-production-f74d.up.railway.app",
      "exersearch.online",
      "www.exersearch.online",
    ],
  },
});