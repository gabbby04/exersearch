// src/utils/notificationApi.js
import { api } from "./apiClient";

export function safeStr(v) {
  return v == null ? "" : String(v);
}

export function toInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function toBool(v) {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").toLowerCase().trim();
  if (s === "true" || s === "1") return true;
  if (s === "false" || s === "0") return false;
  return !!v;
}

function cleanParams(params = {}) {
  const out = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (typeof v === "string" && v.trim() === "") return;
    out[k] = v;
  });
  return out;
}

export function normalizeNotification(n) {
  if (!n) return null;

  const id = toInt(n.notification_id ?? n.id);

  // Backend uses "message"; your older code used "body"
  const msg = safeStr(n.message ?? n.body ?? "");

  return {
    // ids
    notification_id: id,
    id, // keep compatibility
    recipient_id: toInt(n.recipient_id),
    recipient_role: safeStr(n.recipient_role),

    // content
    type: safeStr(n.type),
    title: safeStr(n.title),

    // IMPORTANT: keep BOTH so UI works regardless of which it reads
    message: msg,
    body: msg,

    url: safeStr(n.url ?? ""),
    gym_id: toInt(n.gym_id ?? 0),
    actor_id: toInt(n.actor_id ?? 0),

    // read flags
    is_read: toBool(n.is_read),
    // keep old "unread" convention your header uses
    unread: !toBool(n.is_read),
    read_at: n.read_at ?? null,

    // collapse fields from NotificationController
    collapsed: toBool(n.collapsed),
    collapsed_count: toInt(n.collapsed_count ?? 0),
    collapsed_title: safeStr(n.collapsed_title ?? ""),
    collapsed_message: safeStr(n.collapsed_message ?? ""),

    meta: n.meta ?? n.data ?? null,
    created_at: n.created_at ?? null,
    updated_at: n.updated_at ?? null,
  };
}

export function normalizePagination(paged) {
  const dataArr = Array.isArray(paged?.data) ? paged.data : [];
  return {
    data: dataArr.map(normalizeNotification).filter(Boolean),
    current_page: toInt(paged?.current_page || 1),
    last_page: toInt(paged?.last_page || 1),
    per_page: toInt(paged?.per_page || dataArr.length || 20),
    total: toInt(paged?.total || dataArr.length || 0),
  };
}

/**
 * Defaults:
 * - user header should call with { role: "user" }
 * - owner header should call with { role: "owner" }
 */
export async function listNotifications(params = {}) {
  // Your backend route looks like /notifications (no /api/v1 here because apiClient probably prefixes)
  const res = await api.get(`/notifications`, { params: cleanParams(params) });
  return normalizePagination(res.data);
}

export async function getUnreadNotificationsCount(params = {}) {
  const res = await api.get(`/notifications/unread-count`, {
    params: cleanParams(params),
  });
  return toInt(res.data?.unread);
}

export async function markNotificationRead(id, params = {}) {
  if (!id) throw new Error("id is required");
  const res = await api.post(`/notifications/${id}/read`, null, {
    params: cleanParams(params),
  });

  // controller returns { message: "...", notification?: ... } OR just message
  const payload = res.data?.notification ?? res.data;
  return normalizeNotification(payload);
}

export async function markAllNotificationsRead(params = {}) {
  // Support both possible route names so your current routes won’t break.
  // Prefer mark-all-read if it exists; fall back to read-all.
  try {
    const res = await api.post(`/notifications/mark-all-read`, null, {
      params: cleanParams(params),
    });
    return res.data;
  } catch (e) {
    const res2 = await api.post(`/notifications/read-all`, null, {
      params: cleanParams(params),
    });
    return res2.data;
  }
}

export async function deleteNotification(id, params = {}) {
  if (!id) throw new Error("id is required");
  const res = await api.delete(`/notifications/${id}`, {
    params: cleanParams(params),
  });
  return res.data;
}

export const NOTIF_TYPES = {
  MEMBERSHIP_REQUESTED: "MEMBERSHIP_REQUESTED",
  MEMBERSHIP_APPROVED: "MEMBERSHIP_APPROVED",
  MEMBERSHIP_REJECTED: "MEMBERSHIP_REJECTED",
  MEMBERSHIP_NEEDS_INFO: "MEMBERSHIP_NEEDS_INFO",
  MEMBERSHIP_CANCELLED: "MEMBERSHIP_CANCELLED",
  MEMBERSHIP_EXPIRED: "MEMBERSHIP_EXPIRED",
  MEMBERSHIP_UPDATED: "MEMBERSHIP_UPDATED",
  GYM_ANNOUNCEMENT: "GYM_ANNOUNCEMENT",
  GYM_ANNOUNCEMENT_CREATED: "GYM_ANNOUNCEMENT_CREATED",
};

export const NOTIF_TYPE_LABEL = {
  [NOTIF_TYPES.MEMBERSHIP_REQUESTED]: "New membership request",
  [NOTIF_TYPES.MEMBERSHIP_APPROVED]: "Membership approved",
  [NOTIF_TYPES.MEMBERSHIP_REJECTED]: "Membership rejected",
  [NOTIF_TYPES.MEMBERSHIP_NEEDS_INFO]: "Membership needs info",
  [NOTIF_TYPES.MEMBERSHIP_CANCELLED]: "Membership cancelled",
  [NOTIF_TYPES.MEMBERSHIP_EXPIRED]: "Membership expired",
  [NOTIF_TYPES.MEMBERSHIP_UPDATED]: "Membership updated",
  [NOTIF_TYPES.GYM_ANNOUNCEMENT]: "Gym announcement",
  [NOTIF_TYPES.GYM_ANNOUNCEMENT_CREATED]: "Announcement posted",
};

export function getNotificationUrl(n) {
  if (!n) return "";
  const url = safeStr(n.url ?? "");
  if (url) return url;

  switch (safeStr(n.type)) {
    case NOTIF_TYPES.MEMBERSHIP_APPROVED:
    case NOTIF_TYPES.MEMBERSHIP_REJECTED:
    case NOTIF_TYPES.MEMBERSHIP_NEEDS_INFO:
    case NOTIF_TYPES.MEMBERSHIP_CANCELLED:
    case NOTIF_TYPES.MEMBERSHIP_EXPIRED:
    case NOTIF_TYPES.MEMBERSHIP_UPDATED:
      return "/home/memberships";

    case NOTIF_TYPES.MEMBERSHIP_REQUESTED: {
      const gid = toInt(n.gym_id ?? n?.meta?.gym_id ?? 0);
      return gid ? `/owner/memberships?gym_id=${gid}` : "/owner/memberships";
    }

    default:
      return "";
  }
}