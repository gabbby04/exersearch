import { api } from "./apiClient";

export function normalizeOwnerProfileResponse(resData) {
  if (!resData) return null;
  if (resData?.data && typeof resData.data === "object") return resData.data;
  if (resData?.profile) return resData.profile;
  return resData;
}

export async function getMyOwnerProfile() {
  const res = await api.get("/owner/profile");
  return normalizeOwnerProfileResponse(res.data);
}

export async function upsertMyOwnerProfile(payload = {}) {
  const res = await api.put("/owner/profile", payload);
  return normalizeOwnerProfileResponse(res.data);
}

export async function uploadOwnerAvatar(file) {
  if (!file) throw new Error("file is required");
  const fd = new FormData();
  fd.append("photo", file);
  const res = await api.post("/me/avatar/owner", fd);
  return res.data?.avatar_url || "";
}