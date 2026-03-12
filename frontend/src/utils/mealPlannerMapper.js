// src/utils/mealPlannerMapper.js

export function normalizeDietaryToSingleValue(dietaryRestrictions = []) {
  if (!Array.isArray(dietaryRestrictions) || dietaryRestrictions.length === 0) {
    return "none";
  }

  const allowed = [
    "halal",
    "vegetarian",
    "vegan",
    "pescatarian",
    "low-carb",
    "gluten-free",
  ];

  const found = dietaryRestrictions.find((item) =>
    allowed.includes(String(item).toLowerCase())
  );

  return found ? String(found).toLowerCase() : "none";
}

export function inferPresetIdFromGoal(goal, presets = []) {
  if (!goal || !Array.isArray(presets)) return null;

  const g = String(goal).toLowerCase();

  const match = presets.find((p) => {
    const name = String(p.name || "").toLowerCase();
    const fitnessGoal = String(p.fitness_goal || "").toLowerCase();

    if (g.includes("lose")) {
      return name.includes("weight") || fitnessGoal.includes("weight");
    }

    if (g.includes("muscle") || g.includes("gain")) {
      return name.includes("muscle") || fitnessGoal.includes("muscle");
    }

    if (g.includes("maint")) {
      return name.includes("maint") || fitnessGoal.includes("maint");
    }

    if (g.includes("keto")) {
      return name.includes("keto") || fitnessGoal.includes("keto");
    }

    return false;
  });

  return match?.id ?? null;
}

export function estimateCalories(profile, preference) {
  const age = Number(profile?.age || 0);
  const weight = Number(profile?.weight || 0);
  const height = Number(profile?.height || 0);
  const gender = String(profile?.gender || "").toLowerCase();
  const activity = String(preference?.activity_level || "").toLowerCase();
  const goal = String(preference?.goal || "").toLowerCase();

  if (!age || !weight || !height || !gender) return 2000;

  let bmr = 0;

  if (gender === "male") {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  let activityMultiplier = 1.2;
  if (activity.includes("light")) activityMultiplier = 1.375;
  else if (activity.includes("moderate")) activityMultiplier = 1.55;
  else if (activity.includes("active")) activityMultiplier = 1.725;

  let calories = bmr * activityMultiplier;

  if (goal.includes("lose")) calories -= 300;
  if (goal.includes("gain") || goal.includes("muscle")) calories += 250;

  return Math.max(1200, Math.round(calories));
}

export function buildPlannerDefaults({ profileResponse, preferenceResponse, presets }) {
  const profile = profileResponse?.user_profile || null;
  const preference = preferenceResponse?.data || null;

  const calories = estimateCalories(profile, preference);
  const dietary = normalizeDietaryToSingleValue(preference?.dietary_restrictions);
  const preset_id = inferPresetIdFromGoal(preference?.goal, presets);

  return {
    budget: Number(preference?.food_budget || preference?.budget || 300),
    calories,
    dietary,
    days: 1,
    preset_id,
  };
}