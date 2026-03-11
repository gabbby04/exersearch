import { useEffect, useRef, useState, useCallback } from "react";
import Header from "./Header";
import Footer from "./Footer";
import "./HowItWorks.css";
import ScrollThemeWidget from '../../utils/ScrollThemeWidget';

import {
  UserPlus, Search, Brain, Dumbbell, TrendingUp, ArrowRight,
  Zap, CheckCircle, Star, ChevronRight, Play, Pause,
  MapPin, UtensilsCrossed, Trophy, Sparkles, Users, Shield,
} from "lucide-react";

/* ─── DATA ─── */
const STEPS = [
  {
    num: "01", icon: UserPlus, color: "#e8521a",
    title: "Create your profile",
    sub: "Tell us about yourself",
    body: "Sign up in under 60 seconds. Answer a few questions about your fitness level, goals, and preferences. No credit card. No commitment.",
    bullets: ["Choose your fitness goals", "Set your experience level", "Pick your preferred gym type"],
    demo: "profile",
  },
  {
    num: "02", icon: Brain, color: "#f06a22",
    title: "It builds your plan",
    sub: "Personalized in seconds",
    body: "Our program analyzes your profile and generates a fully custom workout and meal plan. Not a template — an actual plan built for you.",
    bullets: ["Custom workout schedule", "Tailored meal suggestions", "Adjusts as you progress"],
    demo: "ai",
  },
  {
    num: "03", icon: Search, color: "#d94d0f",
    title: "Discover your gym",
    sub: "Find your perfect match",
    body: "Browse verified partner gyms matched to your preferences. Filter by price, equipment, vibe, distance — then book a visit or apply for membership.",
    bullets: ["Smart gym matching", "Verified listings only", "Direct inquiry system"],
    demo: "gym",
  },
  {
    num: "04", icon: Dumbbell, color: "#e8521a",
    title: "Follow your routine",
    sub: "Execute with confidence",
    body: "Every session is guided. Log workouts, track sets, and get feedback after each session. Know exactly what to do and why.",
    bullets: ["Step-by-step guidance", "Real-time logging", "Post-session feedback"],
    demo: "workout",
  },
  {
    num: "05", icon: TrendingUp, color: "#f06a22",
    title: "Track your progress",
    sub: "Watch yourself grow",
    body: "See your streaks, personal bests, and body metrics over time. Progress becomes visible — and that makes staying consistent easier.",
    bullets: ["Visual progress charts", "Personal records", "Consistency streaks"],
    demo: "progress",
  },
];

const FEATURES = [
  { icon: Zap,            label: "Instant workout plans",       desc: "Generated in under 3 seconds" },
  { icon: Shield,         label: "Verified gyms only",     desc: "Every partner is vetted" },
  { icon: UtensilsCrossed,label: "Meal planning",          desc: "Nutrition that actually fits you" },
  { icon: Trophy,         label: "Recalibrate results",    desc: "Based on your preferences" },
  { icon: Users,          label: "Owner dashboard",        desc: "For gym businesses too" },
  { icon: MapPin,         label: "Location-based match",   desc: "Find gyms near you" },
];

const DEMO_CONTENT = {
  profile: {
    label: "Profile Setup",
    items: [
      { q: "What's your main goal?",   a: "Build strength & muscle" },
      { q: "Experience level?",        a: "Beginner (< 1 year)" },
      { q: "Days per week?",           a: "4 days" },
      { q: "Preferred gym type?",      a: "Full-service gym" },
    ],
  },
  ai: {
    label: " Generating Plan",
    lines: [
      "Analyzing your goals...",
      "Matching to 847 workout templates...",
      "Optimizing for beginner progression...",
      "Building meal plan structure...",
      "Plan ready! 12-week program created.",
    ],
  },
  gym: {
    label: "Gym Matches",
    gyms: [
      { name: "IronForge Gym",   dist: "0.8 km", match: 98, price: "₱1,200/mo" },
      { name: "Peak Performance",dist: "1.2 km", match: 94, price: "₱950/mo"  },
      { name: "FitZone Manila",  dist: "2.1 km", match: 89, price: "₱800/mo"  },
    ],
  },
  workout: {
    label: "Today's Session",
    exercises: [
      { name: "Squat",         sets: "3×8"  },
      { name: "Bench Press",   sets: "3×8"  },
      { name: "Bent-over Row", sets: "3×10" },
      { name: "Overhead Press",sets: "3×8"  },
    ],
  },
  progress: {
    label: "Your Progress",
    stats: [
      { label: "Workouts",  val: "24",  unit: "sessions"  },
      { label: "Streak",    val: "12",  unit: "days"      },
      { label: "PRs Hit",   val: "8",   unit: "records"   },
      { label: "Rating",    val: "4.9", unit: "avg score" },
    ],
  },
};

/* ─── DEMO RENDERERS ─── */
function DemoProfile({ data }) {
  const [filled, setFilled] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setFilled(p => Math.min(p + 1, data.items.length)), 700);
    return () => clearInterval(t);
  }, [data]);
  return (
    <div className="hw-demo-inner">
      <p className="hw-demo-tag">{data.label}</p>
      {data.items.map((item, i) => (
        <div key={i} className={`hw-demo-row ${i < filled ? "hw-demo-row--in" : ""}`}>
          <span className="hw-demo-q">{item.q}</span>
          <span className="hw-demo-a">
            {i < filled && <><CheckCircle size={12} /> {item.a}</>}
          </span>
        </div>
      ))}
      <div className="hw-demo-prog">
        <div className="hw-demo-prog__bar" style={{ width: `${(filled / data.items.length) * 100}%` }} />
      </div>
    </div>
  );
}

function DemoAI({ data }) {
  const [lines, setLines] = useState([]);
  const [done, setDone] = useState(false);
  useEffect(() => {
    setLines([]); setDone(false);
    let i = 0;
    const t = setInterval(() => {
      if (i < data.lines.length) { setLines(p => [...p, data.lines[i]]); i++; }
      else { setDone(true); clearInterval(t); }
    }, 600);
    return () => clearInterval(t);
  }, [data]);
  return (
    <div className="hw-demo-inner hw-demo-inner--dark">
      <p className="hw-demo-tag">{data.label}</p>
      <div className="hw-demo-terminal">
        {lines.map((l, i) => (
          <div key={i} className="hw-demo-line">
            <span className="hw-demo-prompt">›</span>
            <span className={i === lines.length - 1 && done ? "hw-demo-success" : ""}>{l}</span>
          </div>
        ))}
        {!done && <span className="hw-demo-cursor" />}
      </div>
    </div>
  );
}

function DemoGym({ data }) {
  return (
    <div className="hw-demo-inner">
      <p className="hw-demo-tag">{data.label}</p>
      {data.gyms.map((g, i) => (
        <div key={i} className="hw-demo-gym" style={{ "--delay": `${i * 0.15}s` }}>
          <div className="hw-demo-gym__left">
            <span className="hw-demo-gym__name">{g.name}</span>
            <span className="hw-demo-gym__meta"><MapPin size={10} /> {g.dist}</span>
          </div>
          <div className="hw-demo-gym__right">
            <span className="hw-demo-gym__match">{g.match}%</span>
            <span className="hw-demo-gym__price">{g.price}</span>
          </div>
          <div className="hw-demo-gym__bar">
            <div className="hw-demo-gym__fill" style={{ width: `${g.match}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function DemoWorkout({ data }) {
  const [checked, setChecked] = useState([0, 1]);
  return (
    <div className="hw-demo-inner">
      <p className="hw-demo-tag">{data.label}</p>
      {data.exercises.map((ex, i) => (
        <div
          key={i}
          className={`hw-demo-ex ${checked.includes(i) ? "hw-demo-ex--done" : ""}`}
          onClick={() => setChecked(p => p.includes(i) ? p.filter(x => x !== i) : [...p, i])}
        >
          <div className="hw-demo-ex__check">
            {checked.includes(i) && <CheckCircle size={14} />}
          </div>
          <span className="hw-demo-ex__name">{ex.name}</span>
          <span className="hw-demo-ex__sets">{ex.sets}</span>
        </div>
      ))}
      <p className="hw-demo-hint">Click to toggle ↑</p>
    </div>
  );
}

function DemoProgress({ data }) {
  const [count, setCount] = useState(data.stats.map(() => 0));
  useEffect(() => {
    const targets = data.stats.map(s => parseFloat(s.val));
    const t = setInterval(() => {
      setCount(p => p.map((v, i) => {
        const diff = targets[i] - v;
        if (Math.abs(diff) < 0.1) return targets[i];
        return +(v + diff * 0.12).toFixed(1);
      }));
    }, 30);
    return () => clearInterval(t);
  }, [data]);
  return (
    <div className="hw-demo-inner">
      <p className="hw-demo-tag">{data.label}</p>
      <div className="hw-demo-stats">
        {data.stats.map((s, i) => (
          <div key={i} className="hw-demo-stat">
            <span className="hw-demo-stat__val">{count[i] % 1 === 0 ? count[i] : count[i].toFixed(1)}</span>
            <span className="hw-demo-stat__label">{s.label}</span>
            <span className="hw-demo-stat__unit">{s.unit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DemoRenderer({ type, data }) {
  switch (type) {
    case "profile":  return <DemoProfile data={data} />;
    case "ai":       return <DemoAI data={data} />;
    case "gym":      return <DemoGym data={data} />;
    case "workout":  return <DemoWorkout data={data} />;
    case "progress": return <DemoProgress data={data} />;
    default: return null;
  }
}

/* ─── FLIP CARDS ─── */
const FLIP_CARDS = [
  {
    tag: "The lost beginner",
    front: "You want to get fit but every YouTube video says something different. You don't know where to start.",
    back:  "ExerSearch asks 8 questions and hands you a day-by-day plan built for your exact level. No research needed.",
    accent: "#e8521a",
  },
  {
    tag: "The gym-less",
    front: "You keep meaning to find a gym but price, location, and vibe all feel like a gamble.",
    back:  "Browse verified gyms matched to your preferences. Read real info, compare prices, and inquire directly — no surprises.",
    accent: "#d94d0f",
  },
  {
    tag: "The ghost member",
    front: "You've paid for gym memberships before and stopped showing up after week two.",
    back:  "Your plan tells you exactly what to do each session. Showing up becomes the easy part when you're never guessing.",
    accent: "#f06a22",
  },
  {
    tag: "The plateau",
    front: "You've been training for months but nothing is changing. You're doing the same thing on repeat.",
    back:  "ExerSearch logs your sessions and adapts. When progress stalls, your plan adjusts — automatically.",
    accent: "#c4400e",
  },
  {
    tag: "The nutrition void",
    front: "You work out consistently but your diet is chaos. You know it matters but have no idea what to eat.",
    back:  "Your plan includes a meal structure built around your goal and schedule. Not a rigid diet — a practical guide.",
    accent: "#e8521a",
  },
];

function FlipCards({ inView }) {
  const [flipped, setFlipped] = useState(new Set());
  const sectionRef = useRef(null);
  const [vis, setVis] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); }, { threshold: 0.1 });
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  const toggle = (i) => setFlipped(prev => {
    const next = new Set(prev);
    next.has(i) ? next.delete(i) : next.add(i);
    return next;
  });

  return (
    <section className="hw-flip" ref={sectionRef}>
      <div className="hw-wrap">
        <div className={`hw-flip__hdr ${vis ? "hw-flip__hdr--in" : ""}`}>
          <span className="hw-eyebrow hw-eyebrow--lt"><Sparkles size={11} /> Sound familiar?</span>
          <h2 className="hw-flip__title">
            We built this for<br /><em>real problems.</em>
          </h2>
          <p className="hw-flip__sub">Flip each card to see how ExerSearch answers it.</p>
        </div>

        <div className="hw-flip__grid">
          {FLIP_CARDS.map((card, i) => (
            <div
              key={i}
              className={`hw-fc ${flipped.has(i) ? "hw-fc--flipped" : ""} ${vis ? "hw-fc--in" : ""}`}
              style={{ "--delay": `${i * 0.08}s`, "--accent": card.accent }}
              onClick={() => toggle(i)}
            >
              <div className="hw-fc__inner">
                <div className="hw-fc__face hw-fc__face--front">
                  <span className="hw-fc__tag">{card.tag}</span>
                  <p className="hw-fc__text">{card.front}</p>
                  <span className="hw-fc__cue">Tap to see the fix →</span>
                </div>
                <div className="hw-fc__face hw-fc__face--back">
                  <div className="hw-fc__check"><CheckCircle size={18} /></div>
                  <p className="hw-fc__text hw-fc__text--back">{card.back}</p>
                  <span className="hw-fc__cue hw-fc__cue--back">← Flip back</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── PLAN BUILDER ─── */
const PLAN_DB = {
  strength: {
    beginner: {
      3: ["Push (chest/shoulders/triceps)", "Pull (back/biceps)", "Legs & core"],
      4: ["Chest & triceps", "Back & biceps", "Legs", "Shoulders & core"],
      5: ["Chest", "Back", "Legs", "Shoulders", "Arms & core"],
    },
    intermediate: {
      3: ["Upper body A", "Lower body", "Upper body B"],
      4: ["Push", "Pull", "Legs A", "Legs B + core"],
      5: ["Chest & triceps", "Back & biceps", "Legs", "Push variation", "Pull + core"],
    },
    advanced: {
      3: ["Heavy push", "Heavy pull", "Heavy legs"],
      4: ["Chest/shoulders", "Back/traps", "Quads/calves", "Hams/glutes + arms"],
      5: ["Chest", "Back", "Legs", "Shoulders", "Arms/weak points"],
    },
  },
  cardio: {
    beginner:     { 3: ["30 min walk/jog", "Rest or stretch", "30 min bike or swim"], 4: ["Easy jog 25 min", "Cross-train", "Intervals 20 min", "Long walk 40 min"], 5: ["Jog 30 min", "Cycle 25 min", "Intervals", "Swim or walk", "Easy jog 20 min"] },
    intermediate: { 3: ["Tempo run 35 min", "Cross-train 30 min", "Long run 45 min"], 4: ["Intervals", "Easy 40 min", "Tempo 35 min", "Long run 50 min"], 5: ["Intervals", "Recovery jog", "Tempo", "Cross-train", "Long run"] },
    advanced:     { 3: ["Speed work", "Threshold run 45 min", "Long run 70 min"], 4: ["VO2 max intervals", "Easy 50 min", "Tempo 45 min", "Long run 80 min"], 5: ["Speed", "Easy", "Threshold", "Cross-train", "Long run"] },
  },
  hybrid: {
    beginner:     { 3: ["Full body lift", "Cardio 25 min", "Full body lift B"], 4: ["Upper lift", "Cardio", "Lower lift", "Active recovery"], 5: ["Push lift", "Cardio 30 min", "Pull lift", "Cardio 25 min", "Legs"] },
    intermediate: { 3: ["Strength A + cardio finisher", "Cardio 35 min", "Strength B + core"], 4: ["Push + HIIT", "Pull", "Legs + jog", "Full body + cardio"], 5: ["Upper A + run", "Lower", "Cardio 40 min", "Upper B", "Legs + HIIT"] },
    advanced:     { 3: ["Heavy strength + MetCon", "Endurance 50 min", "Strength + intervals"], 4: ["Strength A + HIIT", "Long cardio", "Strength B", "MetCon"], 5: ["Heavy push", "Run 50 min", "Heavy pull", "Legs + intervals", "Full MetCon"] },
  },
  weightloss: {
    beginner:     { 3: ["Full body circuit", "Walk 40 min", "Full body circuit B"], 4: ["Circuit A", "Cardio 30 min", "Circuit B", "Walk + core"], 5: ["Circuit", "Cardio", "Circuit", "Walk 45 min", "Active recovery"] },
    intermediate: { 3: ["HIIT 30 min", "Strength circuit", "Cardio 40 min"], 4: ["HIIT", "Strength A", "Cardio 35 min", "Strength B + core"], 5: ["HIIT", "Strength", "Cardio", "Strength + HIIT finisher", "Long walk/jog"] },
    advanced:     { 3: ["MetCon 40 min", "Heavy lift + intervals", "HIIT + core"], 4: ["MetCon", "Strength A", "HIIT 40 min", "Strength B"], 5: ["MetCon", "Strength", "HIIT", "Strength", "Long endurance"] },
  },
};

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function PlanBuilder() {
  const [goal, setGoal]   = useState("strength");
  const [level, setLevel] = useState("beginner");
  const [days, setDays]   = useState(4);
  const [built, setBuilt] = useState(false);
  const [key, setKey]     = useState(0);
  const sectionRef = useRef(null);
  const [vis, setVis] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); }, { threshold: 0.1 });
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  const sessions = PLAN_DB[goal]?.[level]?.[days] ?? [];

  // Spread sessions across the week
  const schedule = DAYS_OF_WEEK.map((d, i) => {
    const sessionIdx = Math.floor((i / 7) * sessions.length);
    const ratio = i / (7 - 1);
    const spreadIdx = Math.round(ratio * (sessions.length - 1));
    if (sessions.length === 0) return { day: d, session: null };
    // distribute evenly
    const assigned = (() => {
      if (sessions.length >= 7) return sessions[i] ?? null;
      const slots = [...Array(7)].map((_, si) => {
        const t = sessions.length;
        return Math.floor((si * t) / 7) !== Math.floor(((si - 1) * t) / 7) ? Math.floor((si * t) / 7) : null;
      });
      return slots[i] !== null ? sessions[slots[i]] : null;
    })();
    return { day: d, session: assigned };
  });

  const handleBuild = () => {
    setBuilt(false);
    setKey(k => k + 1);
    setTimeout(() => setBuilt(true), 100);
  };

  return (
    <section className="hw-builder" ref={sectionRef}>
      <div className="hw-wrap">
        <div className={`hw-builder__hdr ${vis ? "hw-builder__hdr--in" : ""}`}>
          <span className="hw-eyebrow"><Zap size={11} /> Try it now</span>
          <h2 className="hw-builder__title">
            Build your week<br /><em>right here.</em>
          </h2>
          <p className="hw-builder__sub">
            Pick your goal, level, and days — see your real schedule generated instantly.
          </p>
        </div>

        <div className={`hw-builder__card ${vis ? "hw-builder__card--in" : ""}`}>
          {/* controls */}
          <div className="hw-builder__controls">
            <div className="hw-builder__group">
              <label className="hw-builder__label">Your goal</label>
              <div className="hw-builder__btns">
                {[["strength","Strength"],["cardio","Cardio"],["hybrid","Hybrid"],["weightloss","Fat loss"]].map(([v, l]) => (
                  <button key={v} className={`hw-builder__btn ${goal === v ? "hw-builder__btn--on" : ""}`} onClick={() => { setGoal(v); setBuilt(false); }}>{l}</button>
                ))}
              </div>
            </div>

            <div className="hw-builder__group">
              <label className="hw-builder__label">Experience level</label>
              <div className="hw-builder__btns">
                {[["beginner","Beginner"],["intermediate","Intermediate"],["advanced","Advanced"]].map(([v, l]) => (
                  <button key={v} className={`hw-builder__btn ${level === v ? "hw-builder__btn--on" : ""}`} onClick={() => { setLevel(v); setBuilt(false); }}>{l}</button>
                ))}
              </div>
            </div>

            <div className="hw-builder__group">
              <label className="hw-builder__label">Days per week — <strong>{days}</strong></label>
              <input
                type="range" min="3" max="5" value={days}
                className="hw-builder__range"
                onChange={e => { setDays(+e.target.value); setBuilt(false); }}
              />
              <div className="hw-builder__range-labels"><span>3</span><span>4</span><span>5</span></div>
            </div>

            <button className="hw-builder__generate" onClick={handleBuild}>
              Generate my week <ArrowRight size={14} />
            </button>
          </div>

          {/* week grid */}
          <div className="hw-builder__week" key={key}>
            {schedule.map(({ day, session }, i) => (
              <div
                key={i}
                className={`hw-builder__day ${session ? "hw-builder__day--active" : "hw-builder__day--rest"} ${built ? "hw-builder__day--built" : ""}`}
                style={{ "--di": i }}
              >
                <span className="hw-builder__day-label">{day}</span>
                {session
                  ? <span className="hw-builder__day-session">{session}</span>
                  : <span className="hw-builder__day-rest">Rest</span>
                }
              </div>
            ))}
          </div>

          {built && (
            <p className="hw-builder__note">
              <CheckCircle size={12} /> This is a preview. Your real plan is fully guided with sets, reps, and video cues.
            </p>
          )}
          {!built && (
            <p className="hw-builder__note hw-builder__note--muted">
              Adjust the options above and hit Generate to see your week.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ─── MAIN PAGE ─── */
export default function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);
  const [inView, setInView]         = useState({});
  const [cursor, setCursor]         = useState({ x: 0, y: 0 });
  const [isPlaying, setIsPlaying]   = useState(true);
  const [demoKey, setDemoKey]       = useState(0);
  const heroRef = useRef(null);
  const playRef = useRef(null);

  /* cursor spotlight */
  const onMouseMove = useCallback((e) => {
    setCursor({ x: e.clientX, y: e.clientY });
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, [onMouseMove]);

  /* intersection observer for reveal animations */
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) setInView(p => ({ ...p, [e.target.dataset.id]: true }));
      }),
      { threshold: 0.1 }
    );
    document.querySelectorAll("[data-id]").forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  /* auto-advance active step */
  useEffect(() => {
    if (!isPlaying) return;
    playRef.current = setInterval(() => {
      setActiveStep(p => (p + 1) % STEPS.length);
      setDemoKey(p => p + 1);
    }, 4000);
    return () => clearInterval(playRef.current);
  }, [isPlaying]);

  const goToStep = (i) => {
    setActiveStep(i);
    setDemoKey(p => p + 1);
    setIsPlaying(false);
  };

  const step = STEPS[activeStep];
  const StepIcon = step.icon;

  return (
    <>
      <Header />

      {/* global cursor spotlight */}
      <div
        className="hw-spotlight"
        style={{ "--cx": `${cursor.x}px`, "--cy": `${cursor.y}px` }}
      />

      <div className="hw">

        {/* ══ HERO ══ */}
        <section className="hw-hero" ref={heroRef}>
          <div className="hw-hero__bg">
            <div className="hw-hero__rings">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="hw-hero__ring" style={{ "--ri": i }} />
              ))}
            </div>
            <div className="hw-hero__grid" />
          </div>

          <div className="hw-wrap hw-hero__inner">
            <div className="hw-hero__badge" data-id="h-badge">
              <Sparkles size={11} /> How It Works
            </div>
            <h1 className="hw-hero__title" data-id="h-title">
              From zero to <em>thriving</em><br />in five steps.
            </h1>
            <p className="hw-hero__sub" data-id="h-sub">
              ExerSearch takes you from "where do I even start" to a real routine,
              a real gym, and real results — guided every step of the way.
            </p>

            {/* STEP DOTS NAV */}
            <div className="hw-hero__steps" data-id="h-steps">
              {STEPS.map((s, i) => (
                <button
                  key={i}
                  className={`hw-stepdot ${activeStep === i ? "hw-stepdot--on" : ""}`}
                  onClick={() => goToStep(i)}
                >
                  <span className="hw-stepdot__num">{s.num}</span>
                  <span className="hw-stepdot__label">{s.title}</span>
                </button>
              ))}
              <div
                className="hw-stepdot__track"
                style={{ "--prog": `${(activeStep / (STEPS.length - 1)) * 100}%` }}
              />
            </div>

            {/* INTERACTIVE PREVIEW */}
            <div className="hw-preview" data-id="h-preview">
              <div className="hw-preview__left">
                <div className="hw-preview__step-badge" style={{ background: step.color }}>
                  {step.num}
                </div>
                <h2 className="hw-preview__title">{step.title}</h2>
                <p className="hw-preview__sub">{step.sub}</p>
                <p className="hw-preview__body">{step.body}</p>
                <ul className="hw-preview__bullets">
                  {step.bullets.map((b, i) => (
                    <li key={i}><CheckCircle size={13} /> {b}</li>
                  ))}
                </ul>
                <div className="hw-preview__nav">
                  <button
                    className="hw-play-btn"
                    onClick={() => setIsPlaying(p => !p)}
                  >
                    {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                    {isPlaying ? "Pause" : "Play"}
                  </button>
                  <button
                    className="hw-next-btn"
                    onClick={() => goToStep((activeStep + 1) % STEPS.length)}
                  >
                    Next step <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              <div className="hw-preview__right">
                <div className="hw-preview__phone">
                  <div className="hw-preview__notch" />
                  <div className="hw-preview__screen">
                    <DemoRenderer
                      key={`${activeStep}-${demoKey}`}
                      type={step.demo}
                      data={DEMO_CONTENT[step.demo]}
                    />
                  </div>
                  <div className="hw-preview__home-bar" />
                </div>
                {/* floating badges */}
                <div className="hw-preview__badge hw-preview__badge--a">
                  <Star size={11} fill="currentColor" /> 4.9 rated
                </div>
                <div className="hw-preview__badge hw-preview__badge--b">
                  <Zap size={11} /> Smart - Adapts
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══ FLIP CARDS ══ */}
        <FlipCards />

        {/* ══ PLAN BUILDER ══ */}
        <PlanBuilder />

        {/* ══ FEATURE GRID ══ */}
        <section className="hw-features">
          <div className="hw-wrap">
            <div className="hw-features__hdr" data-id="feat-hdr">
              <span className="hw-eyebrow"><Zap size={11} /> Everything included</span>
              <h2 className="hw-features__title">
                One platform.<br /><em>Everything you need.</em>
              </h2>
            </div>
            <div className="hw-features__grid">
              {FEATURES.map((f, i) => {
                const Icon = f.icon;
                return (
                  <div
                    key={i}
                    className={`hw-feat ${inView[`f${i}`] ? "hw-feat--in" : ""}`}
                    data-id={`f${i}`}
                    style={{ "--delay": `${i * 0.07}s` }}
                  >
                    <div className="hw-feat__ico"><Icon size={18} /></div>
                    <div>
                      <h4 className="hw-feat__label">{f.label}</h4>
                      <p className="hw-feat__desc">{f.desc}</p>
                    </div>
                    <div className="hw-feat__arrow"><ChevronRight size={14} /></div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ══ TIMELINE ══ */}
        <section className="hw-timeline">
          <div className="hw-wrap">
            <div className="hw-timeline__hdr" data-id="tl-hdr">
              <span className="hw-eyebrow hw-eyebrow--lt">Your first week</span>
              <h2 className="hw-timeline__title">
                What happens after<br />you <em>sign up</em>
              </h2>
            </div>

            <div className="hw-tl">
              {[
                { day: "Day 1",  event: "Profile created",    detail: "You answer 8 quick questions. Done." },
                { day: "Day 1",  event: "Your own plan generated",  detail: "Your 12-week program is ready instantly." },
                { day: "Day 2",  event: "Gym matched",        detail: "Top 3 gyms near you, ranked by fit." },
                { day: "Day 3",  event: "First workout",      detail: "Guided session with step-by-step instructions." },
                { day: "Day 5",  event: "First check-in",     detail: "You can review your sessions and make adjustments" },
                { day: "Day 7",  event: "7-day streak ",    detail: "Your first milestone. Many more coming." },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`hw-tl__item ${inView[`tl${i}`] ? "hw-tl__item--in" : ""}`}
                  data-id={`tl${i}`}
                  style={{ "--delay": `${i * 0.12}s` }}
                >
                  <div className="hw-tl__day">{item.day}</div>
                  <div className="hw-tl__dot" />
                  <div className="hw-tl__content">
                    <h4>{item.event}</h4>
                    <p>{item.detail}</p>
                  </div>
                </div>
              ))}
              <div className="hw-tl__line" />
            </div>
          </div>
        </section>

        {/* ══ CTA ══ */}
        <section className="hw-cta" data-id="cta">
          <div className="hw-cta__bg">
            <div className="hw-cta__orb" />
          </div>
          <div className="hw-wrap hw-cta__inner">
            <p className="hw-cta__over">Ready to start?</p>
            <h2 className="hw-cta__title">
              Step one takes<br /><em>60 seconds.</em>
            </h2>
            <p className="hw-cta__sub">
              No gym required. No equipment needed. Just you and a goal.
            </p>
            <div className="hw-cta__actions">
              <a href="/register" className="hw-cta-btn hw-cta-btn--or">
                Create free account <ArrowRight size={15} />
              </a>
              <a href="/gyms" className="hw-cta-btn hw-cta-btn--ghost">
                Browse gyms first
              </a>
            </div>
          </div>
        </section>

      </div>

      <Footer />
      <ScrollThemeWidget/>
    </>
  );
}