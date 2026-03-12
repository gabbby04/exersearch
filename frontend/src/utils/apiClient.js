// src/utils/apiClient.js
import axios from "axios";
import Swal from "sweetalert2";

export const RAW_API_BASE =
  import.meta.env.VITE_API_BASE_URL || "https://exersearch.test";

const TOKEN_KEY = "token";
const ROLE_KEY = "role";

function authHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

let handlingMaintenance = false;
let shownAdminMaintenanceNotice = false;

export const api = axios.create({
  baseURL: `${RAW_API_BASE}/api/v1`,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  config.headers = {
    ...(config.headers || {}),
    ...authHeaders(),
  };
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status;
    const msg = String(error?.response?.data?.message || "").toLowerCase();

    const isMaintenance =
      status === 503 ||
      msg.includes("under maintenance") ||
      msg.includes("maintenance mode") ||
      msg === "system is under maintenance.";

    if (isMaintenance && !handlingMaintenance) {
      handlingMaintenance = true;

      try {
        const token = localStorage.getItem(TOKEN_KEY);
        const role = localStorage.getItem(ROLE_KEY);
        const path = window.location.pathname;

        const isAdmin = role === "admin" || role === "superadmin";
        const isAuthPage =
          path.startsWith("/login") ||
          path.startsWith("/register") ||
          path.startsWith("/forgot-password");
        const isMaintenancePage = path.startsWith("/maintenance");

        // Not logged in: do nothing annoying
        if (!token) {
          return Promise.reject(error);
        }

        // Logged-in admin/superadmin: stay in app, no redirect
        // Show notice only once, and never on auth/maintenance pages
        if (isAdmin) {
          if (
            !shownAdminMaintenanceNotice &&
            !isAuthPage &&
            !isMaintenancePage
          ) {
            shownAdminMaintenanceNotice = true;

            await Swal.fire({
              title: "Maintenance Mode",
              text: "Maintenance is enabled. Users/owners are blocked.",
              icon: "warning",
              confirmButtonText: "OK",
            });
          }

          return Promise.reject(error);
        }

        // Non-admin logged-in users go to maintenance page
        if (!isMaintenancePage) {
          window.location.replace("/maintenance");
        }

        return Promise.reject(error);
      } finally {
        handlingMaintenance = false;
      }
    }

    return Promise.reject(error);
  }
);