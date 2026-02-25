// src/utils/gymFreeVisitApi.js
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

/* ============================= */
/* ========== USER ============= */
/* ============================= */

export function claimFreeVisit(gymId) {
  if (gymId == null) throw new Error("gymId is required");

  return request(`/api/v1/gyms/${gymId}/free-visit/claim`, {
    method: "POST",
  });
}

export function getMyFreeVisits({ page = 1, perPage = 20 } = {}) {
  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("per_page", String(perPage));

  return request(`/api/v1/me/free-visits?${qs.toString()}`, {
    method: "GET",
  });
}

/* Helper: always safely extract rows */
export function normalizeFreeVisitList(response) {
  if (!response) return [];

  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;

  return [];
}

export function findMyFreeVisitForGym(response, gymId) {
  const rows = normalizeFreeVisitList(response);

  return (
    rows.find((r) => String(r?.gym_id) === String(gymId)) || null
  );
}

/* ============================= */
/* ========== OWNER ============ */
/* ============================= */

export function ownerListFreeVisits(
  gymId,
  { status, q, page = 1, perPage = 20 } = {}
) {
  if (gymId == null) throw new Error("gymId is required");

  const qs = new URLSearchParams();
  if (status) qs.set("status", status);
  if (q) qs.set("q", q);
  qs.set("page", String(page));
  qs.set("per_page", String(perPage));

  return request(
    `/api/v1/owner/gyms/${gymId}/free-visits?${qs.toString()}`,
    { method: "GET" }
  );
}

export function ownerMarkFreeVisitUsed(freeVisitId) {
  if (freeVisitId == null)
    throw new Error("freeVisitId is required");

  return request(
    `/api/v1/owner/free-visits/${freeVisitId}/use`,
    { method: "POST" }
  );
}

export function ownerSetFreeVisitEnabled(gymId, enabled) {
  if (gymId == null) throw new Error("gymId is required");

  return request(
    `/api/v1/owner/gyms/${gymId}/free-visit-enabled`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: Boolean(enabled) }),
    }
  );
}

export const API_BASE_URL = API;  