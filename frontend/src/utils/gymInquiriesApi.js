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

export const INQUIRY_STATUS = {
  OPEN: "open",
  ANSWERED: "answered",
  CLOSED: "closed",
};

export const OWNER_INQUIRY_TABS = [
  { key: "all", label: "All" },
  { key: INQUIRY_STATUS.OPEN, label: "Open" },
  { key: INQUIRY_STATUS.ANSWERED, label: "Answered" },
  { key: INQUIRY_STATUS.CLOSED, label: "Closed" },
];

export const USER_INQUIRY_TABS = [
  { key: "all", label: "All" },
  { key: INQUIRY_STATUS.OPEN, label: "Open" },
  { key: INQUIRY_STATUS.ANSWERED, label: "Answered" },
  { key: INQUIRY_STATUS.CLOSED, label: "Closed" },
];

export async function askGymInquiry(gymId, payload) {
  if (!gymId) throw new Error("gymId is required");
  const res = await api.post(`/gyms/${gymId}/inquiries`, payload);
  return res.data;
}

export async function listMyInquiries(params = {}) {
  const res = await api.get(`/me/inquiries`, { params: cleanParams(params) });
  return res.data;
}

export async function userMarkInquiryRead(inquiryId) {
  if (!inquiryId) throw new Error("inquiryId is required");
  const res = await api.post(`/me/inquiries/${inquiryId}/read`);
  return res.data;
}

export async function ownerListGymInquiries(gymId, params = {}) {
  if (!gymId) throw new Error("gymId is required");
  const res = await api.get(`/owner/gyms/${gymId}/inquiries`, {
    params: cleanParams(params),
  });
  return res.data;
}

export async function ownerAnswerInquiry(inquiryId, payload) {
  if (!inquiryId) throw new Error("inquiryId is required");
  const res = await api.post(`/owner/inquiries/${inquiryId}/answer`, payload);
  return res.data;
}

export async function ownerCloseInquiry(inquiryId) {
  if (!inquiryId) throw new Error("inquiryId is required");
  const res = await api.post(`/owner/inquiries/${inquiryId}/close`);
  return res.data;
}

export async function ownerMarkInquiryRead(inquiryId) {
  if (!inquiryId) throw new Error("inquiryId is required");
  const res = await api.post(`/owner/inquiries/${inquiryId}/read`);
  return res.data;
}

/**
 * ✅ NEW: Summary for all owned gyms
 * GET /owner/inquiries/summary
 * Returns: { data: [{ gym_id, gym_name, open_count, total_count, latest_at }, ...] }
 */
export async function ownerInquiriesSummary() {
  const res = await api.get(`/owner/inquiries/summary`);
  return res.data;
}

export function normalizeInquiryListResponse(resData) {
  if (!resData) return { rows: [], meta: null };

  if (Array.isArray(resData?.data?.data)) {
    return { rows: resData.data.data, meta: resData.data };
  }

  if (Array.isArray(resData?.data)) {
    return { rows: resData.data, meta: { ...resData } };
  }

  if (resData?.inquiries && Array.isArray(resData.inquiries.data)) {
    return { rows: resData.inquiries.data, meta: { ...resData.inquiries } };
  }

  if (Array.isArray(resData)) {
    return { rows: resData, meta: null };
  }

  const possible = resData.inquiries || resData.items || resData.results;
  if (Array.isArray(possible)) return { rows: possible, meta: null };

  return { rows: [], meta: resData.meta || null };
}

export async function listSavedGyms() {
  const res = await api.get("/user/saved-gyms");
  return res.data;
}

export async function saveGym(gym_id) {
  const res = await api.post("/user/saved-gyms", { gym_id });
  return res.data;
}

export async function unsaveGym(gym_id) {
  const res = await api.delete(`/user/saved-gyms/${gym_id}`);
  return res.data;
}