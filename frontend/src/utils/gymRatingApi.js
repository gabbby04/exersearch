// src/utils/gymRatingApi.js
const API = "https://exersearch.test";

function getTokenMaybe() {
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

/* ------------------------------------------------------------------
 * PUBLIC
 * ------------------------------------------------------------------ */

export function getGymRatings(gymId, params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/v1/gyms/${gymId}/ratings${qs ? `?${qs}` : ""}`, {
    method: "GET",
  });
}

/* ------------------------------------------------------------------
 * AUTH
 * ------------------------------------------------------------------ */

export function getMyRatings(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/api/v1/me/ratings${qs ? `?${qs}` : ""}`, { method: "GET" });
}

export function getCanRateGym(gymId) {
  return request(`/api/v1/gyms/${gymId}/ratings/can-rate`, { method: "GET" });
}

export function upsertMyGymRating(gymId, payload) {
  return request(`/api/v1/gyms/${gymId}/ratings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/* ------------------------------------------------------------------
 * HELPERS
 * ------------------------------------------------------------------ */

export function ratingBadgeMeta(r) {
  const verified = !!r?.verified;
  if (verified) return { label: "Verified", tone: "verified" };

  // fallback for older records that only have verified_via
  if (r?.verified_via) return { label: "Verified", tone: "verified" };

  return { label: "Unverified", tone: "unverified" };
}

export function normalizeGymRatingsResponse(data) {
  const summary = data?.summary || {};
  const ratingsPaginated = data?.ratings || {};

  const rows =
    Array.isArray(ratingsPaginated?.data) ? ratingsPaginated.data : [];

  return {
    summary: {
      public_avg_stars:
        typeof summary.public_avg_stars === "number"
          ? summary.public_avg_stars
          : null,
      verified_count:
        typeof summary.verified_count === "number" ? summary.verified_count : 0,
      unverified_count:
        typeof summary.unverified_count === "number"
          ? summary.unverified_count
          : 0,
      total_count:
        typeof summary.total_count === "number" ? summary.total_count : 0,
      note: summary.note || "",
    },
    ratings: rows,
    pagination: {
      current_page: ratingsPaginated.current_page ?? 1,
      per_page: ratingsPaginated.per_page ?? rows.length,
      last_page: ratingsPaginated.last_page ?? 1,
      total: ratingsPaginated.total ?? rows.length,
      next_page_url: ratingsPaginated.next_page_url ?? null,
      prev_page_url: ratingsPaginated.prev_page_url ?? null,
    },
  };
}

export const API_BASE_URL = API;