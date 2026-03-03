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

export async function getMyMemberships(params = {}) {
  const res = await api.get("/me/memberships", { params: cleanParams(params) });
  return res.data;
}

export async function createOrUpdateMembershipIntent(gymId, payload = {}) {
  if (!gymId) throw new Error("gymId is required");
  const res = await api.post(`/gyms/${gymId}/membership/intent`, payload);
  return res.data;
}

export async function listApprovedGyms(params = {}) {
  const res = await api.get("/gyms", { params: cleanParams(params) });
  return res.data;
}


// (update) membership util constants section only — add NEEDS_INFO + tabs if you want it visible
export const MEMBERSHIP_STATUS = {
  INTENT: "intent",
  NEEDS_INFO: "needs_info",
  ACTIVE: "active",
  EXPIRED: "expired",
  CANCELLED: "cancelled",
  REJECTED: "rejected",
};

export const OWNER_TABS = [
  { key: MEMBERSHIP_STATUS.INTENT, label: "Intent" },
  { key: MEMBERSHIP_STATUS.NEEDS_INFO, label: "Needs Info" },
  { key: MEMBERSHIP_STATUS.ACTIVE, label: "Active" },
  { key: MEMBERSHIP_STATUS.EXPIRED, label: "Expired" },
];

export const OWNER_MEMBER_TABS = [
  { key: "all", label: "All" },
  { key: MEMBERSHIP_STATUS.INTENT, label: "Intent" },
  { key: MEMBERSHIP_STATUS.NEEDS_INFO, label: "Needs Info" },
  { key: MEMBERSHIP_STATUS.ACTIVE, label: "Active" },
  { key: MEMBERSHIP_STATUS.EXPIRED, label: "Expired" },
];