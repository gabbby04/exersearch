// src/utils/ownerAnnouncementsApi.js
import { api } from "./apiClient";

export function safeStr(v) {
  return v == null ? "" : String(v);
}

export function toInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

export function normalizeAnnouncement(a) {
  if (!a) return null;
  return {
    announcement_id: toInt(a.announcement_id),
    gym_id: toInt(a.gym_id),
    owner_id: toInt(a.owner_id),
    title: safeStr(a.title),
    body: safeStr(a.body),
    is_deleted: !!a.is_deleted,
    meta: a.meta ?? null,
    created_at: a.created_at ?? null,
    updated_at: a.updated_at ?? null,
  };
}

export function normalizePagination(paged) {
  const data = Array.isArray(paged?.data) ? paged.data : [];
  return {
    data: data.map(normalizeAnnouncement).filter(Boolean),
    current_page: toInt(paged?.current_page || 1),
    last_page: toInt(paged?.last_page || 1),
    per_page: toInt(paged?.per_page || data.length || 20),
    total: toInt(paged?.total || data.length || 0),
  };
}

export async function ownerListGymAnnouncements(gymId, { page = 1, per_page = 20 } = {}) {
  const res = await api.get(`/owner/gyms/${gymId}/announcements`, {
    params: { page, per_page },
  });
  return normalizePagination(res.data);
}

export async function ownerCreateGymAnnouncement(gymId, { title, body, meta = null, audience = null }) {
  const res = await api.post(`/owner/gyms/${gymId}/announcements`, {
    title,
    body,
    meta,
    audience,
  });
  return res.data;
}

export async function ownerDeleteGymAnnouncement(announcementId) {
  const res = await api.delete(`/owner/announcements/${announcementId}`);
  return res.data;
}

export function computeWeeklyRemaining(announcements, limit = 3) {
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  const used = (announcements || []).filter((a) => {
    if (!a || a.is_deleted) return false;
    const t = a.created_at ? new Date(a.created_at).getTime() : 0;
    return t && now - t <= sevenDaysMs;
  }).length;

  return {
    limit,
    used,
    remaining: Math.max(0, limit - used),
  };
}