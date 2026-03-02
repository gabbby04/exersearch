// src/utils/adminAnnouncementApi.js
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

    gym_name: safeStr(a.gym_name),
    owner_name: safeStr(a.owner_name),
    owner_email: safeStr(a.owner_email),

    is_deleted: !!a.is_deleted,
    meta: a.meta ?? null,
    created_at: a.created_at ?? null,
    updated_at: a.updated_at ?? null,
  };
}

export function normalizePagination(paged) {
  const dataArr = Array.isArray(paged?.data) ? paged.data : [];

  return {
    data: dataArr.map(normalizeAnnouncement).filter(Boolean),
    current_page: toInt(paged?.current_page || 1),
    last_page: toInt(paged?.last_page || 1),
    per_page: toInt(paged?.per_page || dataArr.length || 20),
    total: toInt(paged?.total || dataArr.length || 0),
  };
}

export async function adminListAnnouncements({ page = 1, per_page = 50 } = {}) {
  const res = await api.get(`/admin/announcements`, { params: { page, per_page } });
  return normalizePagination(res.data);
}

export async function adminDeleteAnnouncement(announcementId) {
  if (!announcementId) throw new Error("Missing announcementId.");
  const res = await api.delete(`/admin/announcements/${announcementId}`);
  return res.data;
}