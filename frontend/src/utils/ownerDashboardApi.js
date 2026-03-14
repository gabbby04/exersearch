// src/utils/ownerDashboardApi.js
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

function extractRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.gyms)) return payload.gyms;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

function getMeta(payload) {
  if (!payload) return {};
  if (payload?.meta) return payload.meta;
  if (payload?.data?.meta) return payload.data.meta;
  return payload;
}

function getLastPage(payload) {
  const meta = getMeta(payload);
  const lp = Number(meta?.last_page ?? meta?.lastPage ?? 1);
  return Number.isFinite(lp) && lp > 0 ? lp : 1;
}

/* -------------------------------------------
  Core Owner Dashboard calls (existing)
------------------------------------------- */

export async function getMe() {
  const res = await api.get("/me");
  return res.data;
}

export async function getMyGyms(params = {}) {
  const p = Number(params?.page ?? 1);
  const perPage = Number(params?.per_page ?? params?.perPage ?? 50);

  const res = await api.get("/my-gyms", {
    params: cleanParams({
      page: Number.isFinite(p) && p > 0 ? p : 1,
      per_page: Number.isFinite(perPage) && perPage > 0 ? perPage : 50,
      q: params?.q ?? params?.search ?? undefined,
    }),
  });

  return res.data;
}

export async function getAllMyGyms(params = {}) {
  const perPage = Number(params?.per_page ?? params?.perPage ?? 50);
  const safePerPage = Number.isFinite(perPage) && perPage > 0 ? perPage : 50;

  const firstPayload = await getMyGyms({
    ...params,
    per_page: safePerPage,
    page: 1,
  });

  const lastPage = getLastPage(firstPayload);
  let merged = [...extractRows(firstPayload)];

  if (lastPage > 1) {
    const promises = [];
    for (let p = 2; p <= lastPage; p++) {
      promises.push(
        getMyGyms({
          ...params,
          per_page: safePerPage,
          page: p,
        })
      );
    }
    const rest = await Promise.all(promises);
    for (const payload of rest) merged.push(...extractRows(payload));
  }

  return merged;
}

export async function getGymAnalytics(gymId, params = {}) {
  // Keep backwards compatibility: your old usage was getGymAnalytics(gymId)
  // If later you want ?range=30d&timeline=1 etc, just pass params.
  const res = await api.get(`/gyms/${encodeURIComponent(gymId)}/analytics`, {
    params: cleanParams(params),
  });
  return res.data;
}

export async function getOwnerActivities(params = {}) {
  const res = await api.get("/owner/activities", {
    params: cleanParams(params),
  });
  return res.data;
}


export async function getOwnerHomeCards(params = {}) {
  const res = await api.get("/owner/home/cards", {
    params: cleanParams({
      days: params?.days ?? 3, // renewals window
    }),
  });
  return res.data;
}


export const __ownerDashboardApiInternals = {
  cleanParams,
  extractRows,
  getMeta,
  getLastPage,
};

export async function getFitnessNews() {
  const res = await api.get('/news/fitness');
  return res.data?.data ?? [];
}

export async function getFitnessTrends() {
  const res = await api.get("/fitness-trends");
  return res.data.data;
}

export async function getFitnessDiscussions() {
  const res = await api.get("/fitness-discussions");
  return res.data.data;
}