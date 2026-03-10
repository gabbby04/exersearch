import { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import "./MealPlan.css";
import "./../owner/OwnerGymsPage.scss";
import { api } from "../../utils/apiClient";
import {
  Utensils,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  Flame,
  Beef,
  Wheat,
  Droplets,
  Wallet,
  Calendar,
  ArrowLeft,
  CheckSquare,
  Square,
  Leaf,
  RotateCcw,
  TrendingUp,
  Target,
  Zap,
  Clock,
  UtensilsCrossed,
} from "lucide-react";

const DIETARY = [
  { id: "none", label: "No Restrictions" },
  { id: "halal", label: "Halal" },
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "pescatarian", label: "Pescatarian" },
  { id: "low-carb", label: "Low Carb" },
  { id: "gluten-free", label: "Gluten Free" },
];

const MEAL_TYPES = [
  { id: "breakfast", label: "Breakfast", icon: null },
  { id: "lunch", label: "Lunch", icon: null },
  { id: "dinner", label: "Dinner", icon: null },
  { id: "snack", label: "Snack", icon: null },
];

const MEAL_COLORS = {
  breakfast: { color: "#d4660a", bg: "#fff4ed" },
  lunch: { color: "#0e7490", bg: "#ecfeff" },
  dinner: { color: "#7c3aed", bg: "#f5f3ff" },
  snack: { color: "#16a34a", bg: "#f0fdf4" },
};

const MEAL_ICONS = {
  breakfast: <Sunrise size={18} />,
  lunch: <Utensils size={18} />,
  dinner: <Utensils size={18} />,
  snack: <Zap size={18} />,
};

function Sunrise({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2v8" />
      <path d="m4.93 10.93 1.41 1.41" />
      <path d="M2 18h2" />
      <path d="M20 18h2" />
      <path d="m19.07 10.93-1.41 1.41" />
      <path d="M22 22H2" />
      <path d="m16 6-4 4-4-4" />
      <path d="M16 18a4 4 0 0 0-8 0" />
    </svg>
  );
}

function AdherenceBadge({ score }) {
  const color = score >= 80 ? "#16a34a" : score >= 60 ? "#d97706" : "#dc2626";
  const label = score >= 80 ? "On Target" : score >= 60 ? "Close" : "Off Target";
  return (
    <span
      className="mp-badge"
      style={{
        color,
        background: color + "15",
        border: `1px solid ${color}30`,
      }}
    >
      <Target size={10} />
      {score}% {label}
    </span>
  );
}

function MacroBar({ protein, carbs, fats, size = "sm" }) {
  const total = protein * 4 + carbs * 4 + fats * 9;
  if (!total) return null;
  const p = Math.round((protein * 4 * 100) / total);
  const c = Math.round((carbs * 4 * 100) / total);
  const f = 100 - p - c;
  return (
    <div className={`mp-macrobar mp-macrobar--${size}`}>
      <div style={{ width: p + "%", background: "#ef4444" }} />
      <div style={{ width: c + "%", background: "#f59e0b" }} />
      <div style={{ width: f + "%", background: "#3b82f6" }} />
    </div>
  );
}

function MealCard({ meal, index = 0 }) {
  const [open, setOpen] = useState(false);
  const [ingOpen, setIngOpen] = useState(false);
  const theme = MEAL_COLORS[meal.meal_type] || MEAL_COLORS.breakfast;
  const calories = meal.total_calories ?? meal.calories ?? 0;
  const protein = meal.total_protein ?? meal.protein ?? 0;
  const carbs = meal.total_carbs ?? meal.carbs ?? 0;
  const fats = meal.total_fats ?? meal.fats ?? 0;

  return (
    <div
      className="mp-meal"
      style={{ "--meal-accent": theme.color, animationDelay: `${index * 0.06}s` }}
    >
      <button className="mp-meal__top" onClick={() => setOpen((o) => !o)}>
        <div className="mp-meal__badge-wrap">
          <div className="mp-meal__type-icon" style={{ color: theme.color, background: theme.bg }}>
            {MEAL_ICONS[meal.meal_type] || <Utensils size={18} />}
          </div>
          <span className="mp-meal__type-label" style={{ color: theme.color }}>
            {meal.meal_type}
          </span>
        </div>
        <div className="mp-meal__center">
          <p className="mp-meal__name">{meal.name}</p>
        </div>
        <div className="mp-meal__right">
          <p className="mp-meal__cost">₱{Number(meal.estimated_cost).toFixed(0)}</p>
          <p className="mp-meal__kcal">{Math.round(calories)} kcal</p>
        </div>
        <div className="mp-meal__toggle-icon">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      <div className="mp-meal__macros">
        {[
          { icon: <Beef size={11} />, label: "P", val: protein, color: "#ef4444" },
          { icon: <Wheat size={11} />, label: "C", val: carbs, color: "#f59e0b" },
          { icon: <Droplets size={11} />, label: "F", val: fats, color: "#3b82f6" },
        ].map(({ icon, label, val, color }) => (
          <span
            key={label}
            className="mp-macro-pill"
            style={{ color, background: color + "12", border: `1px solid ${color}25` }}
          >
            {icon} {label}: {Number(val).toFixed(1)}g
          </span>
        ))}
      </div>

      <MacroBar protein={protein} carbs={carbs} fats={fats} size="sm" />

      {open && (
        <div className="mp-meal__body">
          {meal.diet_tags?.length > 0 && (
            <div className="mp-meal__tags">
              {meal.diet_tags.map((tag, i) => (
                <span key={i} className="mp-tag">
                  <Leaf size={10} /> {tag}
                </span>
              ))}
            </div>
          )}

          {meal.ingredients?.length > 0 && (
            <div className="mp-ings">
              <button className="mp-ings__toggle" onClick={() => setIngOpen((o) => !o)}>
                <span className="mp-ings__toggle-left">
                  <ShoppingCart size={13} />
                  Ingredients ({meal.ingredients.length})
                </span>
                {ingOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
              {ingOpen && (
                <div className="mp-ings__list">
                  {meal.ingredients.map((ing, i) => (
                    <div key={i} className="mp-ing">
                      <div className="mp-ing__left">
                        <span className="mp-ing__name">{ing.name}</span>
                        <span className="mp-ing__amt">
                          {ing.display_amount} {ing.display_unit} · {ing.amount_grams}g
                        </span>
                      </div>
                      <div className="mp-ing__right">
                        <span className="mp-ing__kcal">{Math.round(ing.calories ?? 0)} kcal</span>
                        <div className="mp-ing__macros">
                          <span style={{ color: "#ef4444" }}>
                            P:{Number(ing.protein ?? 0).toFixed(1)}
                          </span>
                          <span style={{ color: "#f59e0b" }}>
                            C:{Number(ing.carbs ?? 0).toFixed(1)}
                          </span>
                          <span style={{ color: "#3b82f6" }}>
                            F:{Number(ing.fats ?? 0).toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ShoppingList({ data }) {
  const [open, setOpen] = useState(false);
  if (!data) return null;
  return (
    <div className="mp-shop">
      <button className="mp-shop__header" onClick={() => setOpen((o) => !o)}>
        <div className="mp-shop__header-left">
          <div className="mp-shop__icon-wrap">
            <ShoppingCart size={16} />
          </div>
          <div>
            <p className="mp-shop__title">Shopping List</p>
            <p className="mp-shop__sub">
              {data.total_items} items · Est. ₱{data.total_cost}
            </p>
          </div>
        </div>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <div className="mp-shop__body">
          {Object.entries(data.by_category || {}).map(([cat, items]) => (
            <div key={cat} className="mp-shop__cat">
              <p className="mp-shop__cat-label">{cat}</p>
              {items.map((item, i) => (
                <div key={i} className="mp-shop__item">
                  <div className="mp-shop__item-left">
                    <Square size={14} className="mp-shop__check" />
                    <span className="mp-shop__item-name">{item.name}</span>
                  </div>
                  <div className="mp-shop__item-right">
                    <span className="mp-shop__item-amt">{item.amount}</span>
                    <span className="mp-shop__item-cost">₱{item.estimated_cost}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatBar({ label, value, sub, pct, color, icon }) {
  return (
    <div className="mp-statbar">
      <div className="mp-statbar__top">
        <div className="mp-statbar__icon" style={{ color }}>
          {icon}
        </div>
        <div className="mp-statbar__info">
          <p className="mp-statbar__label">{label}</p>
          <p className="mp-statbar__value">{value}</p>
          <p className="mp-statbar__sub">{sub}</p>
        </div>
        <span className="mp-statbar__pct" style={{ color }}>
          {pct}%
        </span>
      </div>
      <div className="mp-statbar__track">
        <div
          className="mp-statbar__fill"
          style={{
            width: Math.min(pct, 100) + "%",
            background: pct > 110 ? "#ef4444" : color,
          }}
        />
      </div>
    </div>
  );
}

function DayView({ dayData, targets }) {
  const totals = dayData.totals || {};
  const adherence = dayData.adherence || {};
  const breakdown = dayData.macro_breakdown || {};

  const budgetPct = Math.min(150, Math.round((totals.cost / targets.budget) * 100));
  const calPct = Math.min(150, Math.round((totals.calories / targets.calories) * 100));
  const proteinPct = Math.min(150, Math.round((totals.protein / targets.protein) * 100));
  const carbsPct = Math.min(150, Math.round((totals.carbs / targets.carbs) * 100));

  return (
    <div className="mp-day">
      <div className="mp-day__stats">
        <StatBar
          label="Budget"
          value={`₱${totals.cost}`}
          sub={`of ₱${targets.budget}`}
          pct={budgetPct}
          color="#d4660a"
          icon={<Wallet size={16} />}
        />
        <StatBar
          label="Calories"
          value={`${totals.calories}`}
          sub={`of ${targets.calories} kcal`}
          pct={calPct}
          color="#7c3aed"
          icon={<Flame size={16} />}
        />
        <StatBar
          label="Protein"
          value={`${totals.protein}g`}
          sub={`of ${targets.protein}g`}
          pct={proteinPct}
          color="#ef4444"
          icon={<Beef size={16} />}
        />
        <StatBar
          label="Carbs"
          value={`${totals.carbs}g`}
          sub={`of ${targets.carbs}g`}
          pct={carbsPct}
          color="#f59e0b"
          icon={<Wheat size={16} />}
        />
      </div>

      <div className="mp-day__meta">
        {(breakdown.protein || breakdown.carbs || breakdown.fats) && (
          <div className="mp-day__split">
            <p className="mp-day__split-label">
              <TrendingUp size={12} /> Macro Split
            </p>
            <MacroBar
              protein={breakdown.protein / 4}
              carbs={breakdown.carbs / 4}
              fats={breakdown.fats / 9}
              size="lg"
            />
            <div className="mp-day__legend">
              <span style={{ color: "#ef4444" }}>Protein {breakdown.protein}%</span>
              <span style={{ color: "#f59e0b" }}>Carbs {breakdown.carbs}%</span>
              <span style={{ color: "#3b82f6" }}>Fats {breakdown.fats}%</span>
            </div>
          </div>
        )}
        {adherence.overall !== undefined && (
          <div className="mp-day__adherence">
            <p className="mp-day__split-label">
              <Target size={12} /> Adherence
            </p>
            <AdherenceBadge score={adherence.overall} />
            <div className="mp-day__adh-detail">
              {[
                ["Cal", adherence.calories],
                ["Prot", adherence.protein],
                ["Carbs", adherence.carbs],
                ["Fats", adherence.fats],
              ].map(([l, v]) => (
                <span key={l} className="mp-day__adh-item">
                  {l} <strong>{v}%</strong>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mp-day__meals">
        {dayData.meals?.map((m, i) => (
          <MealCard key={i} meal={m} index={i} />
        ))}
      </div>
    </div>
  );
}

function PresetCard({ preset, selected, onSelect }) {
  const goalColors = {
    "Weight Loss": "#d4660a",
    "Muscle Gain": "#ef4444",
    Maintenance: "#0e7490",
    Performance: "#7c3aed",
    Keto: "#16a34a",
  };
  const color = goalColors[preset.fitness_goal] || "#d4660a";

  return (
    <button
      className={`mp-preset ${selected ? "mp-preset--active" : ""}`}
      onClick={() => onSelect(preset.id)}
      style={selected ? { borderColor: color, background: color + "08" } : {}}
    >
      <div className="mp-preset__top">
        <span className="mp-preset__name" style={selected ? { color } : {}}>
          {preset.name}
        </span>
        {selected && <CheckSquare size={14} style={{ color }} />}
      </div>
      <div className="mp-preset__bars">
        {[
          ["P", preset.protein_percent, "#ef4444"],
          ["C", preset.carbs_percent, "#f59e0b"],
          ["F", preset.fats_percent, "#3b82f6"],
        ].map(([l, v, c]) => (
          <div key={l} className="mp-preset__row">
            <span style={{ color: c }}>{l}</span>
            <div className="mp-preset__track">
              <div className="mp-preset__fill" style={{ width: v + "%", background: c }} />
            </div>
            <span>{v}%</span>
          </div>
        ))}
      </div>
      <p className="mp-preset__goal" style={selected ? { color } : {}}>
        {preset.fitness_goal}
      </p>
    </button>
  );
}

function SingleMealResult({ meal, onBack, onRegenerate, loading, singleForm }) {
  const theme = MEAL_COLORS[meal.meal_type] || MEAL_COLORS.breakfast;
  const calories = meal.total_calories ?? meal.calories ?? 0;
  const protein = meal.total_protein ?? meal.protein ?? 0;
  const carbs = meal.total_carbs ?? meal.carbs ?? 0;
  const fats = meal.total_fats ?? meal.fats ?? 0;
  const [ingOpen, setIngOpen] = useState(true);

  return (
    <div className="mp-app">
      <div className="mp-result-header">
        <div className="mp-result-header__inner">
          <div className="mp-result-header__left">
            <div style={{ color: theme.color }}>
              {MEAL_ICONS[meal.meal_type] || <Utensils size={16} />}
            </div>
            <div>
              <p className="mp-result-header__title">Single Meal</p>
              <p className="mp-result-header__sub">
                {meal.meal_type} · ₱{singleForm.budget} budget · {singleForm.calories} kcal
              </p>
            </div>
          </div>
          <div className="mp-result-header__actions">
            <button className="mp-btn-ghost" onClick={onBack}>
              <ArrowLeft size={14} /> Edit
            </button>
            <button className="mp-btn-orange" onClick={onRegenerate} disabled={loading}>
              {loading ? <span className="mp-spinner mp-spinner--dark" /> : <RotateCcw size={14} />}
              Regenerate
            </button>
          </div>
        </div>
      </div>

      <div className="mp-result-body">
        <div className="mp-solo-hero" style={{ "--solo-color": theme.color, "--solo-bg": theme.bg }}>
          <div className="mp-solo-hero__top">
            <div className="mp-solo-hero__icon" style={{ color: theme.color, background: theme.bg }}>
              {MEAL_ICONS[meal.meal_type] || <Utensils size={28} />}
            </div>
            <div className="mp-solo-hero__info">
              <span className="mp-solo-hero__type" style={{ color: theme.color }}>
                {meal.meal_type}
              </span>
              <h2 className="mp-solo-hero__name">{meal.name}</h2>
            </div>
            <div className="mp-solo-hero__cost">
              <span className="mp-solo-hero__cost-val">₱{Number(meal.estimated_cost).toFixed(0)}</span>
              <span className="mp-solo-hero__cost-label">estimated cost</span>
            </div>
          </div>

          <div className="mp-solo-stats">
            {[
              {
                icon: <Flame size={14} />,
                label: "Calories",
                val: `${Math.round(calories)}`,
                unit: "kcal",
                color: "#7c3aed",
              },
              {
                icon: <Beef size={14} />,
                label: "Protein",
                val: Number(protein).toFixed(1),
                unit: "g",
                color: "#ef4444",
              },
              {
                icon: <Wheat size={14} />,
                label: "Carbs",
                val: Number(carbs).toFixed(1),
                unit: "g",
                color: "#f59e0b",
              },
              {
                icon: <Droplets size={14} />,
                label: "Fats",
                val: Number(fats).toFixed(1),
                unit: "g",
                color: "#3b82f6",
              },
            ].map(({ icon, label, val, unit, color }) => (
              <div key={label} className="mp-solo-stat">
                <div className="mp-solo-stat__icon" style={{ color }}>
                  {icon}
                </div>
                <p className="mp-solo-stat__val" style={{ color }}>
                  {val}
                  <span>{unit}</span>
                </p>
                <p className="mp-solo-stat__label">{label}</p>
              </div>
            ))}
          </div>

          <MacroBar protein={protein} carbs={carbs} fats={fats} size="lg" />

          {meal.diet_tags?.length > 0 && (
            <div className="mp-meal__tags" style={{ marginTop: "0.75rem" }}>
              {meal.diet_tags.map((tag, i) => (
                <span key={i} className="mp-tag">
                  <Leaf size={10} /> {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {meal.ingredients?.length > 0 && (
          <div className="mp-shop">
            <button className="mp-shop__header" onClick={() => setIngOpen((o) => !o)}>
              <div className="mp-shop__header-left">
                <div className="mp-shop__icon-wrap">
                  <ShoppingCart size={16} />
                </div>
                <div>
                  <p className="mp-shop__title">Ingredients</p>
                  <p className="mp-shop__sub">{meal.ingredients.length} items needed</p>
                </div>
              </div>
              {ingOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {ingOpen && (
              <div className="mp-shop__body">
                <div className="mp-ings__list" style={{ padding: "0" }}>
                  {meal.ingredients.map((ing, i) => (
                    <div key={i} className="mp-ing">
                      <div className="mp-ing__left">
                        <span className="mp-ing__name">{ing.name}</span>
                        <span className="mp-ing__amt">
                          {ing.display_amount} {ing.display_unit} · {ing.amount_grams}g
                        </span>
                      </div>
                      <div className="mp-ing__right">
                        <span className="mp-ing__kcal">{Math.round(ing.calories ?? 0)} kcal</span>
                        <div className="mp-ing__macros">
                          <span style={{ color: "#ef4444" }}>
                            P:{Number(ing.protein ?? 0).toFixed(1)}
                          </span>
                          <span style={{ color: "#f59e0b" }}>
                            C:{Number(ing.carbs ?? 0).toFixed(1)}
                          </span>
                          <span style={{ color: "#3b82f6" }}>
                            F:{Number(ing.fats ?? 0).toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MealPlanGenerator() {
  const [mode, setMode] = useState("plan");
  const [step, setStep] = useState("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mealStats, setMealStats] = useState(null);
  const [loadingMeals, setLoadingMeals] = useState(true);
  const [presets, setPresets] = useState([]);
  const [loadingPresets, setLoadingPresets] = useState(true);

  const [plan, setPlan] = useState(null);
  const [activeDay, setActiveDay] = useState(0);
  const [form, setForm] = useState({
    budget: 300,
    calories: 2000,
    dietary: "none",
    days: 1,
    preset_id: null,
  });
  const [macroTargets, setMacroTargets] = useState({ protein: 150, carbs: 200, fats: 65 });

  const [singleMeal, setSingleMeal] = useState(null);
  const [singleForm, setSingleForm] = useState({
    meal_type: "breakfast",
    budget: 150,
    calories: 500,
    dietary: "none",
    preset_id: null,
  });
  const [singleMacros, setSingleMacros] = useState({ protein: 30, carbs: 60, fats: 15 });

  const [showLanding, setShowLanding] = useState(true);
  const [landingAction, setLandingAction] = useState(null);
  const [contentReady, setContentReady] = useState(false);
  const [contentMounted, setContentMounted] = useState(false);
  const [transitioningToContent, setTransitioningToContent] = useState(false);

  const mountRef = useRef(null);
  const introRef = useRef(null);
  const pageRevealRef = useRef(null);
  const landingOverlayRef = useRef(null);

  const cameraRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const planeRef = useRef(null);

  const rafRef = useRef(0);
  const timerRef = useRef(0);

  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef({ x: 0, y: -180 });

  const nearStarsRef = useRef(null);
  const farStarsRef = useRef(null);
  const farthestStarsRef = useRef(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setS = (k, v) => setSingleForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, presetsRes] = await Promise.all([
          api.get("/meals/stats"),
          api.get("/macro-presets"),
        ]);
        if (statsRes.data.success) setMealStats(statsRes.data.data);
        if (presetsRes.data.success) setPresets(presetsRes.data.data);
      } catch {
        setError("Could not connect to database.");
      } finally {
        setLoadingMeals(false);
        setLoadingPresets(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (form.preset_id && presets.length > 0) {
      const preset = presets.find((p) => p.id === form.preset_id);
      if (preset) {
        const cal = form.calories;
        setMacroTargets({
          protein: Math.round((cal * preset.protein_percent) / 100 / 4),
          carbs: Math.round((cal * preset.carbs_percent) / 100 / 4),
          fats: Math.round((cal * preset.fats_percent) / 100 / 9),
        });
      }
    }
  }, [form.preset_id, form.calories, presets]);

  useEffect(() => {
    if (singleForm.preset_id && presets.length > 0) {
      const preset = presets.find((p) => p.id === singleForm.preset_id);
      if (preset) {
        const cal = singleForm.calories;
        setSingleMacros({
          protein: Math.round((cal * preset.protein_percent) / 100 / 4),
          carbs: Math.round((cal * preset.carbs_percent) / 100 / 4),
          fats: Math.round((cal * preset.fats_percent) / 100 / 9),
        });
      }
    }
  }, [singleForm.preset_id, singleForm.calories, presets]);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const body = {
        days: form.days,
        total_calories: form.calories,
        budget: form.budget,
        meal_types: ["breakfast", "lunch", "dinner", "snack"],
        diet_tags: form.dietary === "none" ? [] : [form.dietary],
      };
      if (form.preset_id) body.preset_id = form.preset_id;
      const res = await api.post("/meal-plan/generate", body);
      if (!res.data.success) throw new Error(res.data.message || "Generation failed");
      setPlan(res.data.data);
      setActiveDay(0);
      setStep("result");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to generate.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateSingle() {
    setLoading(true);
    setError(null);
    try {
      const body = {
        days: 1,
        total_calories: singleForm.calories,
        budget: singleForm.budget,
        meal_types: [singleForm.meal_type],
        diet_tags: singleForm.dietary === "none" ? [] : [singleForm.dietary],
      };
      if (singleForm.preset_id) body.preset_id = singleForm.preset_id;

      const res = await api.post("/meal-plan/generate", body);
      if (!res.data.success) throw new Error(res.data.message || "Generation failed");

      const meals = res.data.data?.days?.[0]?.meals;
      if (!meals?.length) throw new Error("No meal returned.");
      setSingleMeal(meals[0]);
      setStep("single-result");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to generate meal.");
    } finally {
      setLoading(false);
    }
  }

  function switchMode(m) {
    setMode(m);
    setStep("form");
    setError(null);
  }

  useEffect(() => {
    if (!showLanding) return;

    const mountEl = mountRef.current;
    if (!mountEl) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 50;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setClearColor("#070707", 1.0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;

    mountEl.appendChild(renderer.domElement);

    const topLight = new THREE.DirectionalLight(0xffb14a, 1.1);
    topLight.position.set(0, 1, 1).normalize();
    scene.add(topLight);

    const bottomLight = new THREE.DirectionalLight(0xff6a00, 0.35);
    bottomLight.position.set(1, -1, 1).normalize();
    scene.add(bottomLight);

    const fillA = new THREE.DirectionalLight(0x331100, 0.25);
    fillA.position.set(-1, -0.5, 0.2).normalize();
    scene.add(fillA);

    const fillB = new THREE.DirectionalLight(0x220a00, 0.18);
    fillB.position.set(1, -0.8, 0.1).normalize();
    scene.add(fillB);

    const geometry = new THREE.PlaneGeometry(400, 400, 70, 70);

    if (geometry.vertices) {
      geometry.vertices.forEach((v) => {
        v.x += (Math.random() - 0.5) * 4;
        v.y += (Math.random() - 0.5) * 4;
        v.z += (Math.random() - 0.5) * 4;

        v.dx = Math.random() - 0.5;
        v.dy = Math.random() - 0.5;
        v.randomDelay = Math.random() * 5;
      });
    }

    const TOP = { r: 255, g: 168, b: 60 };
    const MID = { r: 255, g: 106, b: 0 };
    const BOT = { r: 0, g: 0, b: 0 };

    const clamp01 = (n) => Math.max(0, Math.min(1, n));
    const lerp = (a, b, t) => a + (b - a) * t;

    const yMin = -200;
    const yMax = 200;

    const colorAtT = (t) => {
      if (t < 0.55) {
        const tt = t / 0.55;
        return {
          r: Math.round(lerp(BOT.r, MID.r, tt)),
          g: Math.round(lerp(BOT.g, MID.g, tt)),
          b: Math.round(lerp(BOT.b, MID.b, tt)),
        };
      }
      const tt = (t - 0.55) / 0.45;
      return {
        r: Math.round(lerp(MID.r, TOP.r, tt)),
        g: Math.round(lerp(MID.g, TOP.g, tt)),
        b: Math.round(lerp(MID.b, TOP.b, tt)),
      };
    };

    const faceCenterY = (face) => {
      const a = geometry.vertices[face.a];
      const b = geometry.vertices[face.b];
      const c = geometry.vertices[face.c];
      return (a.y + b.y + c.y) / 3;
    };

    if (geometry.faces) {
      for (let i = 0; i < geometry.faces.length; i++) {
        const face = geometry.faces[i];
        const cy = faceCenterY(face);

        const tLinear = (cy - yMin) / (yMax - yMin);
        const t = clamp01(Math.pow(tLinear, 2.6));
        const c = colorAtT(t);
        face.color.setStyle(`rgb(${c.r},${c.g},${c.b})`);
        face.baseColor = { ...c };
      }
    }

    const material = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      vertexColors: THREE.FaceColors,
      flatShading: true,
      shininess: 12,
    });

    const plane = new THREE.Mesh(geometry, material);
    planeRef.current = plane;
    plane.position.y = 40;
    plane.rotation.x = -0.12;
    scene.add(plane);

    function createStars(amount, yDistance, color = "#ff8c1a") {
      const starGeometry = new THREE.Geometry();

      const starMaterial = new THREE.PointsMaterial({
        color,
        opacity: 0.7,
        transparent: true,
        size: 2.2,
        sizeAttenuation: true,
      });

      for (let i = 0; i < amount; i++) {
        const vertex = new THREE.Vector3();
        vertex.z = (Math.random() - 0.5) * 1500;
        vertex.y = yDistance;
        vertex.x = (Math.random() - 0.5) * 1500;
        starGeometry.vertices.push(vertex);
      }

      return new THREE.Points(starGeometry, starMaterial);
    }

    const farthestStars = createStars(900, 420, "#ff6a00");
    const farStars = createStars(900, 370, "#ff8c1a");
    const nearStars = createStars(900, 290, "#ffb14a");

    farStars.rotation.x = 0.25;
    nearStars.rotation.x = 0.25;

    farthestStarsRef.current = farthestStars;
    farStarsRef.current = farStars;
    nearStarsRef.current = nearStars;

    scene.add(farthestStars);
    scene.add(farStars);
    scene.add(nearStars);

    const renderLoop = () => {
      rafRef.current = requestAnimationFrame(renderLoop);

      timerRef.current += 0.01;
      const t = timerRef.current;

      const verts = plane.geometry.vertices || [];
      for (let i = 0; i < verts.length; i++) {
        verts[i].x -= (Math.sin(t + verts[i].randomDelay) / 40) * verts[i].dx;
        verts[i].y += (Math.sin(t + verts[i].randomDelay) / 40) * verts[i].dy;
      }

      const raycaster = raycasterRef.current;
      const normalizedMouse = mouseRef.current;

      raycaster.setFromCamera(normalizedMouse, camera);
      const intersects = raycaster.intersectObjects([plane]);

      if (intersects.length > 0 && plane.geometry.faces) {
        plane.geometry.faces.forEach((face) => {
          const base = face.baseColor || { r: 0, g: 0, b: 0 };

          face.color.r *= 255;
          face.color.g *= 255;
          face.color.b *= 255;

          face.color.r += (base.r - face.color.r) * 0.02;
          face.color.g += (base.g - face.color.g) * 0.02;
          face.color.b += (base.b - face.color.b) * 0.02;

          face.color.setStyle(
            `rgb(${Math.floor(face.color.r)},${Math.floor(face.color.g)},${Math.floor(
              face.color.b
            )})`
          );
        });

        intersects[0].face.color.setStyle("#ffb14a");
        plane.geometry.colorsNeedUpdate = true;
      }

      plane.geometry.verticesNeedUpdate = true;
      plane.geometry.elementsNeedUpdate = true;

      farthestStars.rotation.y -= 0.00001;
      farStars.rotation.y -= 0.00005;
      nearStars.rotation.y -= 0.00011;

      renderer.render(scene, camera);
    };

    renderLoop();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const onMouseMove = (event) => {
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMouseMove);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);

      cancelAnimationFrame(rafRef.current);

      try {
        scene.remove(plane);
        plane.geometry.dispose();
        plane.material.dispose();

        [nearStars, farStars, farthestStars].forEach((s) => {
          scene.remove(s);
          s.geometry.dispose();
          s.material.dispose();
        });

        renderer.dispose();
        if (renderer.domElement?.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      } catch {}
    };
  }, [showLanding]);

  const animateIntoContent = async () => {
    if (transitioningToContent) return;

    setLandingAction("meal-plan");
    setTransitioningToContent(true);

    const camera = cameraRef.current;
    const plane = planeRef.current;
    const intro = introRef.current;
    const overlay = landingOverlayRef.current;

    if (!camera || !plane || !intro) {
      if (overlay) {
        gsap.set(overlay, { opacity: 1, pointerEvents: "auto" });
      }

      setContentMounted(true);
      setShowLanding(false);

      requestAnimationFrame(() => {
        setContentReady(true);

        if (pageRevealRef.current) {
          gsap.fromTo(
            pageRevealRef.current,
            { opacity: 0, y: 28, scale: 0.985 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.8,
              ease: "power3.out",
            }
          );
        }

        if (overlay) {
          gsap.to(overlay, {
            opacity: 0,
            duration: 0.6,
            ease: "power2.out",
            onComplete: () => {
              setTransitioningToContent(false);
              setLandingAction(null);
            },
          });
        } else {
          setTransitioningToContent(false);
          setLandingAction(null);
        }
      });

      return;
    }

    if (overlay) {
      gsap.set(overlay, { opacity: 0, pointerEvents: "auto" });
    }

    await new Promise((resolve) => {
      const tl = gsap.timeline({ onComplete: resolve });

      tl.to(intro, { duration: 0.45, opacity: 0, y: -24, ease: "power3.in" }, 0);
      tl.to(camera.rotation, { duration: 2.4, x: Math.PI / 2, ease: "power3.inOut" }, 0);
      tl.to(camera.position, { duration: 2.2, z: 20, ease: "power3.inOut" }, 0);
      tl.to(camera.position, { duration: 2.6, y: 120, ease: "power3.inOut" }, 0);
      tl.to(plane.scale, { duration: 2.4, x: 2, ease: "power3.inOut" }, 0);

      if (overlay) {
        tl.to(
          overlay,
          {
            opacity: 1,
            duration: 0.5,
            ease: "power2.inOut",
          },
          1.75
        );
      }
    });

    setContentMounted(true);
    setShowLanding(false);

    requestAnimationFrame(() => {
      setContentReady(true);

      if (pageRevealRef.current) {
        gsap.fromTo(
          pageRevealRef.current,
          { opacity: 0, y: 32, scale: 0.985 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.82,
            ease: "power3.out",
          }
        );
      }

      if (overlay) {
        gsap.to(overlay, {
          opacity: 0,
          duration: 0.7,
          ease: "power2.out",
          onComplete: () => {
            setTransitioningToContent(false);
            setLandingAction(null);
          },
        });
      } else {
        setTransitioningToContent(false);
        setLandingAction(null);
      }
    });
  };

  const PageHeader = () => (
    <div className="mp-page-header">
      <div className="mp-page-header__inner">
        <div>
          <div className="mp-page-header__eyebrow">
            <Utensils size={14} />
            AI Meal Planner
          </div>
          <h1 className="mp-page-header__title">
            {mode === "plan" ? "Build Your Meal Plan" : "Generate a Single Meal"}
          </h1>
          <p className="mp-page-header__sub">
            {loadingMeals
              ? "Connecting to database..."
              : `${mealStats?.total_meals || 0} Filipino meals available`}
          </p>
        </div>

        {!loadingMeals && mealStats && (
          <div className="mp-db-strip">
            {[
              { label: "Breakfast", val: mealStats.by_type.breakfast },
              { label: "Lunch", val: mealStats.by_type.lunch },
              { label: "Dinner", val: mealStats.by_type.dinner },
              { label: "Snacks", val: mealStats.by_type.snack },
            ].map(({ label, val }) => (
              <div key={label} className="mp-db-strip__item">
                <span className="mp-db-strip__val">{val}</span>
                <span className="mp-db-strip__label">{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mp-page-header__inner" style={{ paddingTop: 0 }}>
        <div className="mp-mode-tabs">
          <button
            className={`mp-mode-tab ${mode === "plan" ? "mp-mode-tab--active" : ""}`}
            onClick={() => switchMode("plan")}
          >
            <Calendar size={15} />
            Meal Plan
          </button>
          <button
            className={`mp-mode-tab ${mode === "single" ? "mp-mode-tab--active" : ""}`}
            onClick={() => switchMode("single")}
          >
            <UtensilsCrossed size={15} />
            Single Meal
          </button>
        </div>
      </div>
    </div>
  );

  const renderPageContent = () => {
    if (step === "single-result" && singleMeal) {
      return (
        <SingleMealResult
          meal={singleMeal}
          singleForm={singleForm}
          loading={loading}
          onBack={() => setStep("form")}
          onRegenerate={handleGenerateSingle}
        />
      );
    }

    if (step === "result" && plan) {
      const days = plan.days || [];
      const shoppingList = plan.shopping_list;
      const targets = {
        budget: form.budget,
        calories: form.calories,
        protein: macroTargets.protein,
        carbs: macroTargets.carbs,
        fats: macroTargets.fats,
      };
      const activePreset = form.preset_id ? presets.find((p) => p.id === form.preset_id) : null;

      return (
        <div className="mp-app">
          <div className="mp-result-header">
            <div className="mp-result-header__inner">
              <div className="mp-result-header__left">
                <Utensils size={16} className="mp-result-header__icon" />
                <div>
                  <p className="mp-result-header__title">Your Meal Plan</p>
                  <p className="mp-result-header__sub">
                    {days.length} day{days.length > 1 ? "s" : ""} · ₱{form.budget}/day ·{" "}
                    {form.calories} kcal
                    {activePreset && ` · ${activePreset.name}`}
                  </p>
                </div>
              </div>
              <div className="mp-result-header__actions">
                <button className="mp-btn-ghost" onClick={() => setStep("form")}>
                  <ArrowLeft size={14} /> Edit
                </button>
                <button className="mp-btn-orange" onClick={handleGenerate} disabled={loading}>
                  {loading ? <span className="mp-spinner mp-spinner--dark" /> : <RotateCcw size={14} />}
                  Regenerate
                </button>
              </div>
            </div>
          </div>

          <div className="mp-result-body">
            <div className="mp-tips-banner">
              <div className="mp-tips-banner__icon">
                <Clock size={14} />
              </div>
              <div className="mp-tips-banner__content">
                <p className="mp-tips-banner__title">Tips for your plan</p>
                <ul className="mp-tips-banner__list">
                  <li>Prep ingredients the night before to save time</li>
                  <li>Buy ingredients in bulk at the wet market for better prices</li>
                  <li>Store leftovers properly to reduce food waste</li>
                </ul>
              </div>
            </div>

            <ShoppingList data={shoppingList} />

            {days.length > 1 && (
              <div className="mp-day-tabs">
                {days.map((d, i) => (
                  <button
                    key={i}
                    className={`mp-day-tab ${activeDay === i ? "mp-day-tab--active" : ""}`}
                    onClick={() => setActiveDay(i)}
                  >
                    Day {d.day}
                  </button>
                ))}
              </div>
            )}

            {days[activeDay] && (
              <DayView key={activeDay} dayData={days[activeDay]} targets={targets} />
            )}
          </div>
        </div>
      );
    }

    if (mode === "single") {
      return (
        <div className="mp-app">
          <PageHeader />
          <div className="mp-form-body">
            <div className="mp-card">
              <div className="mp-card__head">
                <div className="mp-card__head-left">
                  <span className="mp-card__num">01</span>
                  <div>
                    <p className="mp-card__title">Meal Type</p>
                    <p className="mp-card__sub">Which meal are you generating?</p>
                  </div>
                </div>
              </div>
              <div className="mp-meal-type-grid">
                {MEAL_TYPES.map(({ id, label }) => {
                  const theme = MEAL_COLORS[id];
                  const isActive = singleForm.meal_type === id;
                  return (
                    <button
                      key={id}
                      className={`mp-meal-type-btn ${isActive ? "mp-meal-type-btn--active" : ""}`}
                      onClick={() => setS("meal_type", id)}
                      style={
                        isActive
                          ? {
                              borderColor: theme.color,
                              background: theme.bg,
                              color: theme.color,
                            }
                          : {}
                      }
                    >
                      <div
                        className="mp-meal-type-btn__icon"
                        style={{
                          color: isActive ? theme.color : undefined,
                          background: isActive ? theme.color + "20" : undefined,
                        }}
                      >
                        {MEAL_ICONS[id]}
                      </div>
                      <span className="mp-meal-type-btn__label">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mp-card">
              <div className="mp-card__head">
                <div className="mp-card__head-left">
                  <span className="mp-card__num">02</span>
                  <p className="mp-card__title">Meal Budget</p>
                </div>
                <p className="mp-budget-display">₱{singleForm.budget}</p>
              </div>
              <div className="mp-quick-row">
                {[50, 100, 150, 250].map((v) => (
                  <button
                    key={v}
                    className={`mp-quick-chip ${singleForm.budget === v ? "mp-quick-chip--active" : ""}`}
                    onClick={() => setS("budget", v)}
                  >
                    ₱{v}
                  </button>
                ))}
              </div>
              <input
                type="range"
                className="mp-range mp-range--orange"
                min={20}
                max={500}
                step={10}
                value={singleForm.budget}
                onChange={(e) => setS("budget", +e.target.value)}
              />
              <div className="mp-range-hints">
                <span>₱20</span>
                <span>₱500</span>
              </div>
            </div>

            <div className="mp-card">
              <div className="mp-card__head">
                <div className="mp-card__head-left">
                  <span className="mp-card__num">03</span>
                  <p className="mp-card__title">Calorie Target</p>
                </div>
                <div className="mp-cal-input-wrap">
                  <input
                    type="number"
                    className="mp-cal-input"
                    value={singleForm.calories}
                    onChange={(e) => setS("calories", +e.target.value)}
                  />
                  <span className="mp-cal-unit">kcal</span>
                </div>
              </div>
              <div className="mp-quick-row" style={{ marginBottom: "1rem" }}>
                {[300, 500, 700, 900].map((v) => (
                  <button
                    key={v}
                    className={`mp-quick-chip ${
                      singleForm.calories === v ? "mp-quick-chip--active mp-quick-chip--purple" : ""
                    }`}
                    onClick={() => setS("calories", v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <input
                type="range"
                className="mp-range mp-range--purple"
                min={100}
                max={1500}
                step={50}
                value={singleForm.calories}
                onChange={(e) => setS("calories", +e.target.value)}
              />
            </div>

            <div className="mp-card">
              <div className="mp-card__head">
                <div className="mp-card__head-left">
                  <span className="mp-card__num">04</span>
                  <div>
                    <p className="mp-card__title">Macro Preset</p>
                    <p className="mp-card__sub">Optional — guides macro scoring</p>
                  </div>
                </div>
              </div>
              {loadingPresets ? (
                <div className="mp-skeleton-row">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="mp-skeleton" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="mp-presets-grid">
                    <button
                      className={`mp-preset ${!singleForm.preset_id ? "mp-preset--active" : ""}`}
                      onClick={() => setS("preset_id", null)}
                      style={
                        !singleForm.preset_id
                          ? { borderColor: "#d4660a", background: "#d4660a08" }
                          : {}
                      }
                    >
                      <div className="mp-preset__top">
                        <span
                          className="mp-preset__name"
                          style={!singleForm.preset_id ? { color: "#d4660a" } : {}}
                        >
                          None
                        </span>
                        {!singleForm.preset_id && <CheckSquare size={14} style={{ color: "#d4660a" }} />}
                      </div>
                      <p
                        className="mp-preset__goal"
                        style={!singleForm.preset_id ? { color: "#d4660a" } : {}}
                      >
                        No preference
                      </p>
                    </button>
                    {presets.map((p) => (
                      <PresetCard
                        key={p.id}
                        preset={p}
                        selected={singleForm.preset_id === p.id}
                        onSelect={(id) => setS("preset_id", id)}
                      />
                    ))}
                  </div>
                  {singleForm.preset_id && (
                    <div className="mp-preset-preview">
                      <span className="mp-preset-preview__label">
                        <Zap size={12} /> At {singleForm.calories} kcal:
                      </span>
                      <span className="mp-preset-preview__macro" style={{ color: "#ef4444" }}>
                        <Beef size={11} /> P <strong>{singleMacros.protein}g</strong>
                      </span>
                      <span className="mp-preset-preview__macro" style={{ color: "#f59e0b" }}>
                        <Wheat size={11} /> C <strong>{singleMacros.carbs}g</strong>
                      </span>
                      <span className="mp-preset-preview__macro" style={{ color: "#3b82f6" }}>
                        <Droplets size={11} /> F <strong>{singleMacros.fats}g</strong>
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="mp-card">
              <div className="mp-card__head">
                <div className="mp-card__head-left">
                  <span className="mp-card__num">05</span>
                  <p className="mp-card__title">Dietary Restrictions</p>
                </div>
              </div>
              <div className="mp-chips-wrap">
                {DIETARY.map((d) => (
                  <button
                    key={d.id}
                    className={`mp-chip ${singleForm.dietary === d.id ? "mp-chip--active" : ""}`}
                    onClick={() => setS("dietary", d.id)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {error && <div className="mp-error">{error}</div>}

            <button className="mp-generate-btn" onClick={handleGenerateSingle} disabled={loading || loadingMeals}>
              {loading ? (
                <>
                  <span className="mp-spinner" /> Finding Your Meal...
                </>
              ) : (
                <>
                  <UtensilsCrossed size={18} /> Generate{" "}
                  {singleForm.meal_type.charAt(0).toUpperCase() + singleForm.meal_type.slice(1)}
                </>
              )}
            </button>

            <p className="mp-generate-note">
              {singleForm.preset_id
                ? `${presets.find((p) => p.id === singleForm.preset_id)?.name} preset`
                : "No macro preset"}{" "}
              · {mealStats?.by_type?.[singleForm.meal_type] || 0} {singleForm.meal_type} options
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="mp-app">
        <PageHeader />
        <div className="mp-form-body">
          <div className="mp-card">
            <div className="mp-card__head">
              <div className="mp-card__head-left">
                <span className="mp-card__num">01</span>
                <div>
                  <p className="mp-card__title">Macro Preset</p>
                  <p className="mp-card__sub">Choose a goal — macros are calculated automatically</p>
                </div>
              </div>
            </div>
            {loadingPresets ? (
              <div className="mp-skeleton-row">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="mp-skeleton" />
                ))}
              </div>
            ) : (
              <>
                <div className="mp-presets-grid">
                  <button
                    className={`mp-preset ${!form.preset_id ? "mp-preset--active" : ""}`}
                    onClick={() => set("preset_id", null)}
                    style={!form.preset_id ? { borderColor: "#d4660a", background: "#d4660a08" } : {}}
                  >
                    <div className="mp-preset__top">
                      <span className="mp-preset__name" style={!form.preset_id ? { color: "#d4660a" } : {}}>
                        Custom
                      </span>
                      {!form.preset_id && <CheckSquare size={14} style={{ color: "#d4660a" }} />}
                    </div>
                    <p className="mp-preset__goal" style={!form.preset_id ? { color: "#d4660a" } : {}}>
                      Set your own macros
                    </p>
                  </button>
                  {presets.map((p) => (
                    <PresetCard
                      key={p.id}
                      preset={p}
                      selected={form.preset_id === p.id}
                      onSelect={(id) => set("preset_id", id)}
                    />
                  ))}
                </div>
                {form.preset_id && (
                  <div className="mp-preset-preview">
                    <span className="mp-preset-preview__label">
                      <Zap size={12} /> At {form.calories} kcal your targets:
                    </span>
                    <span className="mp-preset-preview__macro" style={{ color: "#ef4444" }}>
                      <Beef size={11} /> P <strong>{macroTargets.protein}g</strong>
                    </span>
                    <span className="mp-preset-preview__macro" style={{ color: "#f59e0b" }}>
                      <Wheat size={11} /> C <strong>{macroTargets.carbs}g</strong>
                    </span>
                    <span className="mp-preset-preview__macro" style={{ color: "#3b82f6" }}>
                      <Droplets size={11} /> F <strong>{macroTargets.fats}g</strong>
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="mp-card">
            <div className="mp-card__head">
              <div className="mp-card__head-left">
                <span className="mp-card__num">02</span>
                <p className="mp-card__title">Daily Budget</p>
              </div>
              <p className="mp-budget-display">₱{form.budget}</p>
            </div>
            <div className="mp-quick-row">
              {[150, 250, 350, 500].map((v) => (
                <button
                  key={v}
                  className={`mp-quick-chip ${form.budget === v ? "mp-quick-chip--active" : ""}`}
                  onClick={() => set("budget", v)}
                >
                  ₱{v}
                </button>
              ))}
            </div>
            <input
              type="range"
              className="mp-range mp-range--orange"
              min={50}
              max={1000}
              step={25}
              value={form.budget}
              onChange={(e) => set("budget", +e.target.value)}
            />
            <div className="mp-range-hints">
              <span>₱50</span>
              <span>₱1,000</span>
            </div>
          </div>

          <div className="mp-card">
            <div className="mp-card__head">
              <div className="mp-card__head-left">
                <span className="mp-card__num">03</span>
                <p className="mp-card__title">Calorie Target</p>
              </div>
              <div className="mp-cal-input-wrap">
                <input
                  type="number"
                  className="mp-cal-input"
                  value={form.calories}
                  onChange={(e) => set("calories", +e.target.value)}
                />
                <span className="mp-cal-unit">kcal</span>
              </div>
            </div>
            <div className="mp-quick-row" style={{ marginBottom: "1rem" }}>
              {[1500, 2000, 2500, 3000].map((v) => (
                <button
                  key={v}
                  className={`mp-quick-chip ${form.calories === v ? "mp-quick-chip--active mp-quick-chip--purple" : ""}`}
                  onClick={() => set("calories", v)}
                >
                  {v}
                </button>
              ))}
            </div>
            <input
              type="range"
              className="mp-range mp-range--purple"
              min={800}
              max={5000}
              step={50}
              value={form.calories}
              onChange={(e) => set("calories", +e.target.value)}
            />

            {!form.preset_id && (
              <div className="mp-macros-grid">
                {[
                  {
                    label: "Protein",
                    key: "protein",
                    color: "#ef4444",
                    icon: <Beef size={13} />,
                    max: 400,
                  },
                  {
                    label: "Carbs",
                    key: "carbs",
                    color: "#f59e0b",
                    icon: <Wheat size={13} />,
                    max: 600,
                  },
                  {
                    label: "Fats",
                    key: "fats",
                    color: "#3b82f6",
                    icon: <Droplets size={13} />,
                    max: 200,
                  },
                ].map(({ label, key, color, icon, max }) => (
                  <div key={key} className="mp-macro-slider-box">
                    <div className="mp-macro-slider-box__top">
                      <span className="mp-macro-slider-box__label" style={{ color }}>
                        {icon} {label}
                      </span>
                      <span className="mp-macro-slider-box__val" style={{ color }}>
                        {macroTargets[key]}g
                      </span>
                    </div>
                    <input
                      type="range"
                      className="mp-range"
                      style={{ "--range-color": color }}
                      min={0}
                      max={max}
                      step={5}
                      value={macroTargets[key]}
                      onChange={(e) =>
                        setMacroTargets((t) => ({ ...t, [key]: +e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mp-card">
            <div className="mp-card__head">
              <div className="mp-card__head-left">
                <span className="mp-card__num">04</span>
                <p className="mp-card__title">Dietary Restrictions</p>
              </div>
            </div>
            <div className="mp-chips-wrap">
              {DIETARY.map((d) => (
                <button
                  key={d.id}
                  className={`mp-chip ${form.dietary === d.id ? "mp-chip--active" : ""}`}
                  onClick={() => set("dietary", d.id)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mp-card">
            <div className="mp-card__head">
              <div className="mp-card__head-left">
                <span className="mp-card__num">05</span>
                <p className="mp-card__title">Plan Duration</p>
              </div>
            </div>
            <div className="mp-days-grid">
              {[1, 3, 5, 7].map((d) => (
                <button
                  key={d}
                  className={`mp-day-btn ${form.days === d ? "mp-day-btn--active" : ""}`}
                  onClick={() => set("days", d)}
                >
                  <Calendar size={16} />
                  <span>
                    {d} {d === 1 ? "Day" : "Days"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {error && <div className="mp-error">{error}</div>}

          <button className="mp-generate-btn" onClick={handleGenerate} disabled={loading || loadingMeals}>
            {loading ? (
              <>
                <span className="mp-spinner" /> Generating Meal Plan...
              </>
            ) : (
              <>
                <Zap size={18} /> Generate {form.days === 1 ? "1-Day" : `${form.days}-Day`} Meal Plan
              </>
            )}
          </button>

          <p className="mp-generate-note">
            {form.preset_id
              ? `${presets.find((p) => p.id === form.preset_id)?.name} preset`
              : "Custom macros"}{" "}
            · {mealStats?.total_meals || 0} meals available
          </p>
        </div>
      </div>
    );
  };

  return (
    <>
      {showLanding && (
        <div
          className="find-gyms-page"
          style={{
            position: "fixed",
            inset: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 20,
            overflow: "hidden",
            background: "#070707",
          }}
        >
          <div className="star-intro-root" style={{ width: "100%", height: "100%" }}>
            <div className="three-mount" ref={mountRef} />

            <div
              ref={landingOverlayRef}
              style={{
                position: "fixed",
                inset: 0,
                background: "#0a0a0a",
                opacity: 0,
                pointerEvents: "none",
                zIndex: 8,
              }}
            />

            <div className="intro-container" ref={introRef} style={{ zIndex: 10 }}>
              <h2 className="fancy-text">Exersearch</h2>
              <h1>
                BUILD YOUR MEAL
                <br />
                PLAN
              </h1>

              <div
                style={{
                  display: "flex",
                  gap: "14px",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <div className="button shift-camera-button" onClick={animateIntoContent}>
                  <div className="border">
                    <div className="left-plane" />
                    <div className="right-plane" />
                  </div>
                  <div className="text">
                    {landingAction === "meal-plan" ? "Loading..." : "Meal Plan"}
                  </div>
                </div>
              </div>

              {error ? (
                <div style={{ marginTop: 16, color: "#ffb4a2", fontWeight: 700 }}>{error}</div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {contentMounted && (
        <div
          ref={pageRevealRef}
          style={{
            opacity: contentReady ? 1 : 0,
            transform: contentReady ? "translateY(0)" : "translateY(12px)",
          }}
        >
          {renderPageContent()}
        </div>
      )}
    </>
  );
}