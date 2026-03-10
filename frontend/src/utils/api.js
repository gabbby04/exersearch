// src/utils/api.js
import { api } from "./apiClient";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://exersearch.test";

export { api };