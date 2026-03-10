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

      const role = localStorage.getItem(ROLE_KEY);
      const isAdmin = role === "admin" || role === "superadmin";

      if (!isAdmin) {
        if (window.location.pathname !== "/maintenance") {
          window.location.replace("/maintenance");
        }
        return Promise.reject(error);
      }

      await Swal.fire({
        title: "Maintenance Mode",
        text: "Maintenance is enabled. Users/owners are blocked.",
        icon: "warning",
        confirmButtonText: "OK",
        allowOutsideClick: false,
        allowEscapeKey: false,
      });

      handlingMaintenance = false;
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);  