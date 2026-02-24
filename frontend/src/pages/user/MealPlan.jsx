import { useState } from "react";
import "./MealPlan.css";



const DIETARY = [
  { id: "none", label: "No Restrictions", emoji: "🍽️" },
  { id: "halal", label: "Halal", emoji: "☪️" },
  { id: "vegetarian", label: "Vegetarian", emoji: "🥦" },
  { id: "vegan", label: "Vegan", emoji: "🌱" },
  { id: "pescatarian", label: "Pescatarian", emoji: "🐟" },
  { id: "low-carb", label: "Low Carb", emoji: "🥩" },
  { id: "gluten-free", label: "Gluten Free", emoji: "🌾" },
];

const GOALS = [
  { id: "lose", label: "Lose Weight", emoji: "📉", hint: "Caloric deficit" },
  { id: "maintain", label: "Maintain", emoji: "⚖️", hint: "Balanced intake" },
  { id: "gain", label: "Build Muscle", emoji: "💪", hint: "High protein" },
  { id: "performance", label: "Performance", emoji: "⚡", hint: "Energy optimized" },
];

const MEAL_ICONS = { Breakfast: "🌅", Lunch: "☀️", Dinner: "🌙", Snacks: "🍎" };
const MEAL_THEMES = {
  Breakfast: { bg: "#fff7ed", accent: "#d4660a", border: "#fed7aa" },
  Lunch: { bg: "#fefce8", accent: "#92400e", border: "#fde68a" },
  Dinner: { bg: "#f0fdf4", accent: "#166534", border: "#bbf7d0" },
  Snacks: { bg: "#eff6ff", accent: "#1d4ed8", border: "#bfdbfe" },
};

/* ══════════════════════════════════════════════════════
   COMPONENTS
══════════════════════════════════════════════════════ */
function MealCard({ meal }) {
  const [open, setOpen] = useState(false);
  const theme = MEAL_THEMES[meal.type] || MEAL_THEMES.Breakfast;
  const icon = MEAL_ICONS[meal.type] || "🍴";

  return (
    <div className="mpai-card mpai-meal-card">
      <button className="mpai-meal-card__btn" onClick={() => setOpen((o) => !o)}>
        <div className="mpai-meal-card__icon" style={{ background: theme.bg }}>
          {icon}
        </div>

        <div className="mpai-meal-card__info">
          <div className="mpai-meal-card__type-row">
            <span
              className="mpai-meal-card__type-badge"
              style={{ color: theme.accent, background: theme.bg, borderColor: theme.border }}
            >
              {meal.type}
            </span>
            {meal.prepTime && <span className="mpai-meal-card__prep">⏱ {meal.prepTime}</span>}
          </div>
          <p className="mpai-meal-card__name">{meal.name}</p>
          <p className="mpai-meal-card__desc">{meal.description}</p>
        </div>

        <div className="mpai-meal-card__right">
          <p className="mpai-meal-card__cost">₱{meal.cost}</p>
          <p className="mpai-meal-card__kcal">{meal.calories} kcal</p>
          <p className="mpai-meal-card__chevron">{open ? "▲" : "▼"}</p>
        </div>
      </button>

      <div className="mpai-meal-card__pills">
        {[
          ["P", meal.protein, "#ef4444"],
          ["C", meal.carbs, "#f59e0b"],
          ["F", meal.fats, "#3b82f6"],
        ].map(([l, v, c]) => (
          <span
            key={l}
            className="mpai-pill"
            style={{ background: c + "18", color: c, border: `1px solid ${c}35` }}
          >
            {l}: {v}g
          </span>
        ))}
      </div>

      {open && (
        <div className="mpai-meal-card__detail">
          <p className="mpai-ingredients-label">Ingredients</p>
          <div className="mpai-ingredients-grid">
            {meal.ingredients?.map((ing, i) => (
              <div key={i} className="mpai-ingredient-item">
                <div>
                  <p className="mpai-ingredient-item__name">{ing.name}</p>
                  <p className="mpai-ingredient-item__amount">{ing.amount}</p>
                </div>
                {ing.cost > 0 && <span className="mpai-ingredient-item__cost">₱{ing.cost}</span>}
              </div>
            ))}
          </div>
          {meal.instructions && (
            <div className="mpai-instructions-box">
              <p className="mpai-instructions-label">How to prepare</p>
              <p className="mpai-instructions-text">{meal.instructions}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DayView({ dayData, targets }) {
  const [shopOpen, setShopOpen] = useState(false);
  const shopTotal = dayData.shoppingList?.reduce((s, i) => s + i.estimatedCost, 0) || 0;
  const budgetPct = Math.min(100, Math.round((dayData.totalCost / targets.budget) * 100));
  const calPct = Math.min(100, Math.round((dayData.totalCalories / targets.calories) * 100));
  const proteinPct = Math.min(100, Math.round((dayData.totalProtein / targets.protein) * 100));
  const carbsPct = Math.min(100, Math.round((dayData.totalCarbs / targets.carbs) * 100));

  const stats = [
    {
      label: "Cost",
      value: `₱${dayData.totalCost}`,
      sub: `of ₱${targets.budget}`,
      pct: budgetPct,
      color: budgetPct > 110 ? "#ef4444" : "#d4660a",
    },
    {
      label: "Calories",
      value: `${dayData.totalCalories}`,
      sub: `kcal of ${targets.calories}`,
      pct: calPct,
      color: "#8b5cf6",
    },
    {
      label: "Protein",
      value: `${dayData.totalProtein}g`,
      sub: `of ${targets.protein}g`,
      pct: proteinPct,
      color: "#ef4444",
    },
    {
      label: "Carbs",
      value: `${dayData.totalCarbs}g`,
      sub: `of ${targets.carbs}g`,
      pct: carbsPct,
      color: "#f59e0b",
    },
  ];

  return (
    <div>
      {/* Day summary */}
      <div className="mpai-card mpai-day-summary">
        <div className="mpai-day-stats">
          {stats.map(({ label, value, sub, pct, color }) => (
            <div key={label} className="mpai-day-stat">
              <p className="mpai-day-stat__label">{label}</p>
              <p className="mpai-day-stat__value">{value}</p>
              <p className="mpai-day-stat__sub">{sub}</p>
              <div className="mpai-progress-track">
                <div className="mpai-progress-fill" style={{ width: pct + "%", background: color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Meals */}
      <div className="mpai-meals-list">
        {dayData.meals?.map((m, i) => <MealCard key={i} meal={m} />)}
      </div>

      {/* Shopping list */}
      {dayData.shoppingList && dayData.shoppingList.length > 0 && (
        <>
          <button
            className={`mpai-shop-toggle ${shopOpen ? "open" : ""}`}
            onClick={() => setShopOpen((o) => !o)}
          >
            <span>🛒 Shopping List · Day {dayData.day}</span>
            <span className="mpai-shop-toggle__hint">{shopOpen ? "Hide ▲" : "Show ▼"}</span>
          </button>

          {shopOpen && (
            <div className="mpai-shop-panel">
              <div className="mpai-shop-list">
                {dayData.shoppingList.map((item, i) => (
                  <div key={i} className="mpai-shop-item">
                    <div>
                      <p className="mpai-shop-item__name">{item.item}</p>
                      <p className="mpai-shop-item__meta">
                        {item.amount} · {item.store || "Palengke / Wet Market"}
                      </p>
                    </div>
                    <span className="mpai-shop-item__cost">₱{item.estimatedCost}</span>
                  </div>
                ))}
              </div>
              <div className="mpai-shop-total">
                <span className="mpai-shop-total__label">Estimated Total</span>
                <span className="mpai-shop-total__value">₱{shopTotal}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
export default function MealPlanGeneratorAI() {
  const [step, setStep] = useState("form");
  const [plan, setPlan] = useState(null);
  const [activeDay, setActiveDay] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    budget: 300,
    calories: 2000,
    protein: 150,
    carbs: 200,
    fats: 65,
    dietary: "none",
    goal: "maintain",
    days: 1,
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    const dietaryLabel = DIETARY.find((d) => d.id === form.dietary)?.label || "No Restrictions";
    const goalLabel = GOALS.find((g) => g.id === form.goal)?.label || "Maintain";

    const prompt = `You are a Filipino meal planning expert. Create a ${form.days}-day meal plan with these requirements:

BUDGET: ₱${form.budget} per day (Philippine Pesos)
CALORIES: ${form.calories} kcal per day
PROTEIN: ${form.protein}g per day
CARBS: ${form.carbs}g per day
FATS: ${form.fats}g per day
DIETARY: ${dietaryLabel}
GOAL: ${goalLabel}

IMPORTANT RULES:
1. Use ONLY Filipino meals and ingredients available in Philippine markets
2. Stay within the daily budget of ₱${form.budget}
3. Each day should have: Breakfast, Lunch, Dinner, and 1 Snack
4. All costs in Philippine Pesos (₱)
5. Provide realistic Filipino ingredient costs from palengke/wet markets
6. Include preparation times
7. Generate shopping list with estimated costs per ingredient

Return ONLY valid JSON in this EXACT format (no markdown, no code blocks):
{
  "summary": {
    "totalDays": ${form.days},
    "tips": ["tip1", "tip2", "tip3"]
  },
  "days": [
    {
      "day": 1,
      "totalCost": 285,
      "totalCalories": 1980,
      "totalProtein": 145,
      "totalCarbs": 195,
      "totalFats": 63,
      "meals": [
        {
          "id": "b1",
          "type": "Breakfast",
          "name": "Sinangag at Itlog",
          "description": "Garlic fried rice with sunny side up eggs",
          "calories": 420,
          "protein": 14,
          "carbs": 58,
          "fats": 16,
          "cost": 35,
          "prepTime": "10 mins",
          "ingredients": [
            {"name": "Day-old rice", "amount": "1 cup", "cost": 8},
            {"name": "Eggs", "amount": "2 pcs", "cost": 18}
          ],
          "instructions": "Sauté garlic in oil. Add rice, stir-fry 3 mins. Fry eggs separately."
        }
      ],
      "shoppingList": [
        {"item": "Day-old rice", "amount": "1 cup", "estimatedCost": 8, "store": "Palengke"}
      ]
    }
  ]
}

Generate realistic Filipino meal plan now:`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY || "",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 8000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.content?.[0]?.text;

      if (!content) {
        throw new Error("No response from AI");
      }

      // Clean and parse JSON
      let jsonText = content.trim();
      // Remove markdown code blocks if present
      jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      
      const planData = JSON.parse(jsonText);
      setPlan(planData);
      setActiveDay(0);
      setStep("result");
    } catch (err) {
      console.error("Error generating meal plan:", err);
      setError(err.message || "Failed to generate meal plan. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  /* ── FORM ── */
  if (step === "form")
    return (
      <div className="mpai-app">
        {/* Header */}
        <div className="mpai-header">
          <div className="mpai-header__inner">
            <div className="mpai-header__eyebrow">
              <span>🤖</span>
              <span>AI-Powered Meal Planner</span>
            </div>
            <h1 className="mpai-header__title">Build Your Meal Plan</h1>
            <p className="mpai-header__sub">
              Intelligent Filipino meal plans powered by Claude AI
            </p>
          </div>
        </div>

        <div className="mpai-form-body">
          {/* Budget */}
          <div className="mpai-card mpai-budget-card mpai-fade-up mpai-fade-up-1">
            <div className="mpai-budget-card__top">
              <div>
                <p className="mpai-section-label" style={{ marginBottom: 6 }}>
                  Daily Food Budget
                </p>
                <p className="mpai-budget-card__amount">₱{form.budget}</p>
              </div>
              <div className="mpai-budget-card__quick">
                <p className="mpai-budget-card__quick-label">Quick select</p>
                <div className="mpai-budget-card__quick-btns">
                  {[150, 250, 350, 500].map((v) => (
                    <button
                      key={v}
                      className={`mpai-quick-btn mpai-quick-btn--orange ${
                        form.budget === v ? "active" : ""
                      }`}
                      onClick={() => set("budget", v)}
                    >
                      ₱{v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <input
              type="range"
              min={50}
              max={1000}
              step={25}
              value={form.budget}
              onChange={(e) => set("budget", +e.target.value)}
            />
            <div className="mpai-range-hints">
              <span className="mpai-range-hint">₱50 — tight</span>
              <span className="mpai-range-hint">₱1,000 — generous</span>
            </div>
          </div>

          {/* Calories + Macros */}
          <div className="mpai-card mpai-cal-card mpai-fade-up mpai-fade-up-2">
            <p className="mpai-section-label">Calorie &amp; Macro Targets</p>

            <div className="mpai-cal-range-wrap">
              <div className="mpai-cal-row">
                <span className="mpai-cal-row__label">Daily Calories</span>
                <div className="mpai-cal-row__controls">
                  {[1500, 2000, 2500, 3000].map((v) => (
                    <button
                      key={v}
                      className={`mpai-quick-btn ${form.calories === v ? "active" : ""}`}
                      onClick={() => set("calories", v)}
                    >
                      {v}
                    </button>
                  ))}
                  <div className="mpai-cal-input-box">
                    <input
                      type="number"
                      value={form.calories}
                      onChange={(e) => set("calories", +e.target.value)}
                    />
                    <span>kcal</span>
                  </div>
                </div>
              </div>
              <input
                type="range"
                min={800}
                max={5000}
                step={50}
                value={form.calories}
                onChange={(e) => set("calories", +e.target.value)}
                style={{ accentColor: "#8b5cf6" }}
              />
            </div>

            <div className="mpai-macros-grid">
              {[
                { label: "🥩 Protein", key: "protein", color: "#ef4444", max: 400 },
                { label: "🍚 Carbs", key: "carbs", color: "#f59e0b", max: 600 },
                { label: "🥑 Fats", key: "fats", color: "#3b82f6", max: 200 },
              ].map(({ label, key, color, max }) => (
                <div key={key} className="mpai-macro-box">
                  <p className="mpai-macro-box__label">{label}</p>
                  <div className="mpai-macro-box__value-row">
                    <input
                      type="number"
                      value={form[key]}
                      onChange={(e) => set(key, +e.target.value)}
                      style={{ color }}
                    />
                    <span className="mpai-macro-box__unit">g</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={max}
                    step={5}
                    value={form[key]}
                    onChange={(e) => set(key, +e.target.value)}
                    style={{ accentColor: color }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Goal */}
          <div className="mpai-card mpai-goal-card mpai-fade-up mpai-fade-up-3">
            <p className="mpai-section-label">Fitness Goal</p>
            <div className="mpai-goals-grid">
              {GOALS.map((g) => (
                <button
                  key={g.id}
                  className={`mpai-goal-btn ${form.goal === g.id ? "active" : ""}`}
                  onClick={() => set("goal", g.id)}
                >
                  <p className="mpai-goal-btn__emoji">{g.emoji}</p>
                  <p className="mpai-goal-btn__label">{g.label}</p>
                  <p className="mpai-goal-btn__hint">{g.hint}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Dietary */}
          <div className="mpai-card mpai-dietary-card mpai-fade-up mpai-fade-up-4">
            <p className="mpai-section-label">Dietary Restrictions</p>
            <div className="mpai-dietary-chips">
              {DIETARY.map((d) => (
                <button
                  key={d.id}
                  className={`mpai-dietary-chip ${form.dietary === d.id ? "active" : ""}`}
                  onClick={() => set("dietary", d.id)}
                >
                  {d.emoji} {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Days */}
          <div className="mpai-card mpai-days-card mpai-fade-up mpai-fade-up-5">
            <p className="mpai-section-label">Plan Duration</p>
            <div className="mpai-days-row">
              {[1, 3, 5, 7].map((d) => (
                <button
                  key={d}
                  className={`mpai-day-btn ${form.days === d ? "active" : ""}`}
                  onClick={() => set("days", d)}
                >
                  {d} {d === 1 ? "Day" : "Days"}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mpai-error-box">
              <p className="mpai-error-title">⚠️ Error</p>
              <p className="mpai-error-text">{error}</p>
            </div>
          )}

          {/* CTA */}
          <div className="mpai-cta-block mpai-fade-up mpai-fade-up-6">
            <div className="mpai-cta-block__summary">
              {[
                { label: "Budget", value: `₱${form.budget}/day` },
                { label: "Calories", value: `${form.calories} kcal` },
                { label: "Protein", value: `${form.protein}g` },
                { label: "Carbs", value: `${form.carbs}g` },
                { label: "Fats", value: `${form.fats}g` },
              ].map(({ label, value }) => (
                <div key={label} className="mpai-cta-block__stat">
                  <p className="mpai-cta-block__stat-label">{label}</p>
                  <p className="mpai-cta-block__stat-value">{value}</p>
                </div>
              ))}
            </div>

            <button
              className="mpai-btn-orange mpai-btn-orange--full"
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="mpai-spinner"></span> Generating AI Meal Plan...
                </>
              ) : (
                <>✨ Generate My {form.days === 1 ? "1-Day" : `${form.days}-Day`} Meal Plan</>
              )}
            </button>

            <p className="mpai-cta-block__note">
              🤖 Powered by Claude AI · Real Filipino meals · Budget-optimized
            </p>
          </div>
        </div>
      </div>
    );

  /* ── RESULT ── */
  if (step === "result" && plan) {
    const dayCount = plan.days?.length || 0;
    return (
      <div className="mpai-app">
        {/* Sticky header */}
        <div className="mpai-header mpai-header--sticky">
          <div className="mpai-header__inner">
            <div>
              <div className="mpai-header__eyebrow">
                <span>🤖</span>
                <span>AI Meal Plan</span>
              </div>
              <h1 className="mpai-header__title" style={{ fontSize: 20 }}>
                {dayCount}-Day · ₱{form.budget}/day · {form.calories} kcal ·{" "}
                {DIETARY.find((d) => d.id === form.dietary)?.label}
              </h1>
            </div>
            <div className="mpai-header__actions">
              <button className="mpai-btn-ghost" onClick={() => setStep("form")}>
                ← Edit
              </button>
              <button
                className="mpai-btn-orange mpai-btn-orange--sm"
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? "..." : "🔄 Regenerate"}
              </button>
            </div>
          </div>
        </div>

        <div className="mpai-result-body">
          {/* Tips */}
          {plan.summary?.tips && plan.summary.tips.length > 0 && (
            <div className="mpai-tips mpai-fade-up">
              <span className="mpai-tips__icon">💡</span>
              <div>
                <p className="mpai-tips__label">Tips for your plan</p>
                <ul className="mpai-tips__list">
                  {plan.summary.tips.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Day tabs */}
          {dayCount > 1 && (
            <div className="mpai-day-tabs">
              {plan.days.map((d, i) => (
                <button
                  key={i}
                  className={`mpai-day-tab ${activeDay === i ? "active" : ""}`}
                  onClick={() => setActiveDay(i)}
                >
                  Day {d.day}
                </button>
              ))}
            </div>
          )}

          {/* Active day */}
          {plan.days[activeDay] && (
            <DayView
              key={activeDay}
              dayData={plan.days[activeDay]}
              targets={{
                budget: form.budget,
                calories: form.calories,
                protein: form.protein,
                carbs: form.carbs,
                fats: form.fats,
              }}
            />
          )}
        </div>
      </div>
    );
  }

  return null;
}