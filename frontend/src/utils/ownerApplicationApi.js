// src/utils/ownerApplicationApi.js

// ✅ Keep your working fetch-based API (DO NOT REMOVE)
const API = "https://exersearch.test";

export function getTokenMaybe() {
  return localStorage.getItem("token") || "";
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

async function request(path, options = {}) {
  const token = getTokenMaybe();
  const url = `${API}${path.startsWith("/") ? "" : "/"}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await safeJson(res);

  if (!res.ok) {
    throw new Error(data?.message || `Request failed (HTTP ${res.status})`);
  }

  return data;
}

/* ======================================================
   ADMIN — OWNER APPLICATIONS (FETCH - existing, keep)
   ====================================================== */

export function getOwnerApplications(params = {}) {
  const query = new URLSearchParams(params).toString();
  return request(
    `/api/v1/admin/owner-applications${query ? `?${query}` : ""}`
  );
}

export function getOwnerApplication(id) {
  return request(`/api/v1/admin/owner-applications/${id}`);
}

export function approveOwnerApplication(id) {
  return request(`/api/v1/admin/owner-applications/${id}/approve`, {
    method: "PATCH",
  });
}

export function rejectOwnerApplication(id, reason = null) {
  return request(`/api/v1/admin/owner-applications/${id}/reject`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reason ? { reason } : {}),
  });
}

/* ======================================================
   USER — OWNER APPLICATION (FETCH - existing, keep)
   ====================================================== */

export function submitOwnerApplication(payload) {
  return request(`/api/v1/owner-applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function getMyOwnerApplication() {
  return request(`/api/v1/owner-applications/me`);
}

/* ======================================================
   ✅ OPTIONAL: apiClient-based equivalents (ADDED, do not break existing)
   If you want to migrate later, import these instead.
   ====================================================== */

import { api } from "./apiClient";

function cleanParams(params = {}) {
  const out = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (typeof v === "string" && v.trim() === "") return;
    out[k] = v;
  });
  return out;
}

// ADMIN (apiClient)
export async function getOwnerApplicationsApi(params = {}) {
  const res = await api.get(`/admin/owner-applications`, {
    params: cleanParams(params),
  });
  return res.data;
}

export async function getOwnerApplicationApi(id) {
  if (!id) throw new Error("id is required");
  const res = await api.get(`/admin/owner-applications/${id}`);
  return res.data;
}

export async function approveOwnerApplicationApi(id) {
  if (!id) throw new Error("id is required");
  const res = await api.patch(`/admin/owner-applications/${id}/approve`);
  return res.data;
}

export async function rejectOwnerApplicationApi(id, reason = null) {
  if (!id) throw new Error("id is required");
  const res = await api.patch(
    `/admin/owner-applications/${id}/reject`,
    reason ? { reason } : {}
  );
  return res.data;
}

// USER (apiClient)
export async function submitOwnerApplicationApi(payload = {}) {
  const res = await api.post(`/owner-applications`, payload || {});
  return res.data;
}

export async function getMyOwnerApplicationApi() {
  const res = await api.get(`/owner-applications/me`);
  return res.data;
}