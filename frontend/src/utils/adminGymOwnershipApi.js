import { api } from "./apiClient";

export async function searchOwners(params = {}) {
  const { q = "", per_page = 50 } = params;
  const { data } = await api.get("/admin/owners/search", {
    params: { q, per_page },
  });
  return data;
}

export async function assignGymOwner(gymId, ownerId) {
  const { data } = await api.patch(`/admin/gyms/${gymId}/assign-owner`, {
    owner_id: ownerId,
  });
  return data;
}