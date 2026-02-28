// ════════════════════════════════════════════════════════════
// ENHANCED MEAL GENERATOR - OPTIMIZED & ACCURATE
// ════════════════════════════════════════════════════════════

// Cache for filtered meals to avoid recomputing
const filterCache = new Map();

/**
 * Generate cache key from options
 */
function getCacheKey(meals, options) {
  return JSON.stringify({
    length: meals.length,
    mealType: options.mealType,
    calories: options.calories,
    budget: options.budget,
    dietTags: options.dietTags?.sort(),
    goal: options.goal,
  });
}

/**
 * Enhanced filtering with progressive relaxation
 */
function filterMeals(meals, options, strictness = 'strict') {
  // Check cache first
  const cacheKey = getCacheKey(meals, options) + strictness;
  if (filterCache.has(cacheKey)) {
    return filterCache.get(cacheKey);
  }

  const filtered = meals.filter((meal) => {
    // ALWAYS require active meals
    if (meal.is_active === false) return false;

    // ALWAYS require correct meal type
    const dbType = (meal.meal_type || '').toLowerCase().trim();
    const wantedType = (options.mealType || '').toLowerCase().trim();
    if (dbType !== wantedType) return false;

    // Strictness levels
    if (strictness === 'strict') {
      // Strict calorie limit (within 20%)
      if (options.calories) {
        const maxCal = options.calories * 1.2;
        if (meal.total_calories > maxCal) return false;
      }

      // Strict budget limit (within 30%)
      if (options.budget) {
        const maxBudget = options.budget * 1.3;
        if (meal.estimated_cost > maxBudget) return false;
      }

      // ALL diet tags must match
      if (options.dietTags?.length) {
        const mealTags = meal.diet_tags || [];
        const hasAll = options.dietTags.every((tag) =>
          mealTags.some((mt) => mt.toLowerCase() === tag.toLowerCase())
        );
        if (!hasAll) return false;
      }
    } else if (strictness === 'relaxed') {
      // Relaxed calorie (within 50%)
      if (options.calories && meal.total_calories > options.calories * 1.5) {
        return false;
      }

      // Relaxed budget (within 80%)
      if (options.budget && meal.estimated_cost > options.budget * 1.8) {
        return false;
      }

      // AT LEAST ONE diet tag matches
      if (options.dietTags?.length) {
        const mealTags = meal.diet_tags || [];
        const hasAny = options.dietTags.some((tag) =>
          mealTags.some((mt) => mt.toLowerCase() === tag.toLowerCase())
        );
        if (!hasAny) return false;
      }
    }
    // strictness === 'loose' -> only meal type and is_active matter

    return true;
  });

  // Cache result
  filterCache.set(cacheKey, filtered);
  return filtered;
}

/**
 * Smart meal selection based on goal
 */
function pickMeal(meals, goal, options) {
  if (!meals.length) return null;

  // Score-based selection
  const scored = meals.map((meal) => {
    let score = 0;

    // Goal-based scoring
    if (goal === 'high_protein') {
      score += (meal.total_protein || 0) * 10;
    } else if (goal === 'low_carb' || goal === 'keto') {
      score += Math.max(0, 50 - (meal.total_carbs || 0)) * 5;
      score += (meal.total_fats || 0) * 3;
    } else if (goal === 'balanced') {
      const proteinRatio = (meal.total_protein || 0) / (meal.total_calories || 1) * 4;
      const carbRatio = (meal.total_carbs || 0) / (meal.total_calories || 1) * 4;
      const fatRatio = (meal.total_fats || 0) / (meal.total_calories || 1) * 9;
      
      // Ideal ratios: 25% protein, 50% carbs, 25% fats
      const proteinDiff = Math.abs(proteinRatio - 0.25);
      const carbDiff = Math.abs(carbRatio - 0.50);
      const fatDiff = Math.abs(fatRatio - 0.25);
      
      score += Math.max(0, 100 - (proteinDiff + carbDiff + fatDiff) * 200);
    } else if (goal === 'budget') {
      // Favor cheaper meals
      score += Math.max(0, 100 - (meal.estimated_cost || 50));
    }

    // Calorie proximity bonus (closer to target = higher score)
    if (options.calories) {
      const calorieTarget = options.calories;
      const calorieDiff = Math.abs((meal.total_calories || 0) - calorieTarget);
      score += Math.max(0, 50 - calorieDiff / 10);
    }

    // Budget proximity bonus
    if (options.budget) {
      const budgetTarget = options.budget;
      const budgetDiff = Math.abs((meal.estimated_cost || 0) - budgetTarget);
      score += Math.max(0, 30 - budgetDiff / 2);
    }

    // Diet tag match bonus
    if (options.dietTags?.length) {
      const mealTags = meal.diet_tags || [];
      const matchCount = options.dietTags.filter((tag) =>
        mealTags.some((mt) => mt.toLowerCase() === tag.toLowerCase())
      ).length;
      score += matchCount * 20;
    }

    return { meal, score };
  });

  // Sort by score (highest first)
  scored.sort((a, b) => b.score - a.score);

  // Pick from top 5 with weighted randomness (higher scores more likely)
  const topN = Math.min(5, scored.length);
  const top = scored.slice(0, topN);
  
  // Weighted random selection
  const totalScore = top.reduce((sum, item) => sum + item.score, 0);
  let random = Math.random() * totalScore;
  
  for (const item of top) {
    random -= item.score;
    if (random <= 0) {
      return item.meal;
    }
  }
  
  // Fallback to best score
  return top[0].meal;
}

/**
 * Main generation function with progressive fallback
 */
export function generateSingleMeal(meals, options) {
  // Validation
  if (!Array.isArray(meals) || meals.length === 0) {
    console.error('[mealGenerator] ❌ No meals provided');
    return null;
  }

  if (!options.mealType) {
    console.error('[mealGenerator] ❌ No meal type specified');
    return null;
  }

  // Log first time only
  if (!generateSingleMeal._logged) {
    const sample = meals[0];
    console.log('[mealGenerator] 📊 Sample meal:', {
      name: sample?.name,
      meal_type: sample?.meal_type,
      total_calories: sample?.total_calories,
      estimated_cost: sample?.estimated_cost,
      diet_tags: sample?.diet_tags,
      is_active: sample?.is_active,
    });
    console.log(`[mealGenerator] 📦 Total meals in database: ${meals.length}`);
    generateSingleMeal._logged = true;
  }

  // Progressive fallback strategy
  const strategies = [
    { name: 'strict', strictness: 'strict' },
    { name: 'relaxed', strictness: 'relaxed' },
    { name: 'loose', strictness: 'loose' },
  ];

  for (const strategy of strategies) {
    const filtered = filterMeals(meals, options, strategy.strictness);
    
    console.log(
      `[mealGenerator] 🔍 ${options.mealType} [${strategy.name}]: ${filtered.length}/${meals.length} meals`
    );

    if (filtered.length > 0) {
      const selected = pickMeal(filtered, options.goal, options);
      
      if (selected) {
        console.log(
          `[mealGenerator] ✅ Selected [${strategy.name}]: ${selected.name}`,
          `(₱${selected.estimated_cost}, ${selected.total_calories} kcal,`,
          `${selected.total_protein}g protein)`
        );
        return selected;
      }
    }
  }

  // Last resort: any meal of correct type
  console.warn(`[mealGenerator] 🚨 Last resort for ${options.mealType}`);
  const anyType = meals.filter((m) => {
    const dbType = (m.meal_type || '').toLowerCase().trim();
    const wantedType = (options.mealType || '').toLowerCase().trim();
    return dbType === wantedType;
  });

  if (anyType.length > 0) {
    const selected = anyType[Math.floor(Math.random() * anyType.length)];
    console.warn(
      `[mealGenerator] ⚠️ Last resort: ${selected.name}`,
      '(may not meet requirements)'
    );
    return selected;
  }

  // Complete failure
  console.error(`[mealGenerator] ❌ NO ${options.mealType} MEALS FOUND`);
  const breakdown = {
    total: meals.length,
    breakfast: meals.filter((m) => m.meal_type === 'breakfast').length,
    lunch: meals.filter((m) => m.meal_type === 'lunch').length,
    dinner: meals.filter((m) => m.meal_type === 'dinner').length,
    snack: meals.filter((m) => m.meal_type === 'snack').length,
  };
  console.error('[mealGenerator] 📊 Database:', breakdown);
  
  return null;
}

/**
 * Validate meal data structure
 */
export function validateMealData(meals) {
  const issues = [];

  if (!Array.isArray(meals)) {
    issues.push('meals is not an array');
    return { valid: false, issues };
  }

  if (meals.length === 0) {
    issues.push('meals array is empty');
    return { valid: false, issues };
  }

  // Check meal type distribution
  const byType = {
    breakfast: meals.filter((m) => m.meal_type === 'breakfast').length,
    lunch: meals.filter((m) => m.meal_type === 'lunch').length,
    dinner: meals.filter((m) => m.meal_type === 'dinner').length,
    snack: meals.filter((m) => m.meal_type === 'snack').length,
  };

  Object.entries(byType).forEach(([type, count]) => {
    if (count === 0) {
      issues.push(`No ${type} meals found`);
    } else if (count < 3) {
      issues.push(`Only ${count} ${type} meals (recommend at least 10)`);
    }
  });

  // Check required fields
  const sample = meals[0];
  const requiredFields = [
    'name',
    'meal_type',
    'total_calories',
    'total_protein',
    'total_carbs',
    'total_fats',
    'estimated_cost',
  ];
  
  requiredFields.forEach((field) => {
    if (!(field in sample)) {
      issues.push(`Missing required field: ${field}`);
    }
  });

  // Check for inactive meals
  const inactive = meals.filter((m) => m.is_active === false).length;
  if (inactive > 0) {
    console.warn(`[validateMealData] ⚠️ ${inactive} inactive meals found`);
  }

  return {
    valid: issues.length === 0,
    issues,
    warnings: inactive > 0 ? [`${inactive} inactive meals`] : [],
    stats: {
      total: meals.length,
      byType,
      active: meals.filter((m) => m.is_active !== false).length,
      withDietTags: meals.filter((m) => m.diet_tags?.length > 0).length,
      avgCalories: Math.round(
        meals.reduce((sum, m) => sum + (m.total_calories || 0), 0) / meals.length
      ),
      avgCost: Math.round(
        meals.reduce((sum, m) => sum + (m.estimated_cost || 0), 0) / meals.length
      ),
    },
  };
}

/**
 * Clear filter cache (call when meals data changes)
 */
export function clearMealCache() {
  filterCache.clear();
  console.log('[mealGenerator] 🗑️ Cache cleared');
}

/**
 * Generate full day meal plan
 */
export function generateDayPlan(meals, dailyOptions) {
  const { totalCalories, totalBudget, dietTags, goal } = dailyOptions;

  // Distribute calories and budget across meals
  const distribution = {
    breakfast: 0.25,
    lunch: 0.35,
    snack: 0.15,
    dinner: 0.25,
  };

  const plan = {};
  let actualTotal = { calories: 0, cost: 0, protein: 0 };

  for (const [mealType, ratio] of Object.entries(distribution)) {
    const mealOptions = {
      mealType,
      calories: totalCalories * ratio,
      budget: totalBudget * ratio,
      dietTags,
      goal,
    };

    const meal = generateSingleMeal(meals, mealOptions);
    
    if (meal) {
      plan[mealType] = meal;
      actualTotal.calories += meal.total_calories || 0;
      actualTotal.cost += meal.estimated_cost || 0;
      actualTotal.protein += meal.total_protein || 0;
    } else {
      console.error(`[generateDayPlan] ❌ Failed to generate ${mealType}`);
    }
  }

  return {
    plan,
    totals: actualTotal,
    targets: {
      calories: totalCalories,
      budget: totalBudget,
    },
    accuracy: {
      calories: Math.round((actualTotal.calories / totalCalories) * 100),
      budget: Math.round((actualTotal.cost / totalBudget) * 100),
    },
  };
}