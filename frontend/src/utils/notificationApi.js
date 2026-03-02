// src/utils/notificationApi.js
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

export async function listNotifications(params = {}) {
  const res = await api.get(`/notifications`, { params: cleanParams(params) });
  return res.data;
}

export async function markNotificationRead(id) {
  if (!id) throw new Error("id is required");
  const res = await api.post(`/notifications/${id}/read`);
  return res.data;
}

export async function markAllNotificationsRead() {
  const res = await api.post(`/notifications/read-all`);
  return res.data;
}

/* Helpers (optional, safe) */
export function normalizeNotificationsResponse(payload) {
  // supports: paginator { data: [...], ... } or plain array
  if (!payload) return { rows: [], meta: null };
  if (Array.isArray(payload)) return { rows: payload, meta: null };
  if (Array.isArray(payload?.data)) return { rows: payload.data, meta: payload };
  if (Array.isArray(payload?.notifications?.data))
    return { rows: payload.notifications.data, meta: payload.notifications };
  return { rows: [], meta: payload?.meta || null };
}