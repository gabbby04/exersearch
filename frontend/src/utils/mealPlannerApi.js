// src/utils/mealPlannerApi.js
import { api } from "./apiClient";

function apiError(e, fallback = "Request failed.") {
  return (
    e?.response?.data?.message ||
    (e?.response?.data ? JSON.stringify(e.response.data, null, 2) : null) ||
    e?.message ||
    fallback
  );
}

export async function getMealPlannerBootstrap() {
  try {
    const [statsRes, presetsRes, profileRes, preferenceRes] = await Promise.all([
      api.get("/meals/stats"),
      api.get("/macro-presets"),
      api.get("/user/profile"),
      api.get("/user/preferences"),
    ]);

    return {
      stats: statsRes.data,
      presets: presetsRes.data,
      profile: profileRes.data,
      preference: preferenceRes.data,
    };
  } catch (e) {
    throw new Error(apiError(e, "Failed to load meal planner data."));
  }
}

export async function generateMealPlan(payload) {
  try {
    const res = await api.post("/meal-plan/generate", payload);
    return res.data;
  } catch (e) {
    throw new Error(apiError(e, "Failed to generate meal plan."));
  }
}