import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['frontend-production-f74d.up.railway.app'],
    proxy: {
      "/api": {
        target: "https://exersearch.test",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});