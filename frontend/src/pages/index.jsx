import { useState, useEffect, useRef } from "react";
import "./index.css";
import Header from "./user/Header";
import Footer from "./user/Footer";
import {
  MapPinned, Inbox, TrendingUp, BadgeCheck,
  Check, ArrowRight, ChevronDown,
  Sparkles, Trophy, Dumbbell, Flame, Activity,
  Target, Zap,
} from "lucide-react";
import ScrollThemeWidget from './../utils/ScrollThemeWidget';
/* ════════════════════════════════════════
   DATA
════════════════════════════════════════ */

const GOALS = [
  {
    id: "lose", chip: "Lose weight", Icon: Flame,
    tag: "Fat loss protocol",
    h1: "Burn fat.", h2: "Keep your sweets.",
    desc: "Calorie deficit dialed to your body. Filipino meals counted. No crash diets.",
    color: "#ff5a16",
    sessions: [
      { day: "MON", name: "Fat-Burn Circuit",      detail: "45 min · ~340 kcal",    pct: 88 },
      { day: "WED", name: "Low-impact Cardio",     detail: "30 min · Zone 2",       pct: 65 },
      { day: "FRI", name: "Full-Body Strength",    detail: "50 min · compound lifts", pct: 75 },
    ],
    gym: { name: "J's Fitness Gym", loc: "Pasig City · ₱800/mo", match: 97 },
    meal: { name: "Sinigang na Isda", kcal: 260, tag: "Low-cal · High protein" },
    stat: { n: "−6kg", lbl: "avg. in 12 weeks" },
  },
  {
    id: "muscle", chip: "Build muscle", Icon: Dumbbell,
    tag: "Hypertrophy program",
    h1: "Build muscle.", h2: "Track every rep.",
    desc: "Progressive overload blocks, deload weeks, TDEE-synced nutrition.",
    color: "#fc4a00",
    sessions: [
      { day: "MON", name: "Upper Push",            detail: "4 sets · 8–10 reps",    pct: 92 },
      { day: "WED", name: "Lower Pull",            detail: "4 sets · 6–8 reps",     pct: 84 },
      { day: "FRI", name: "Full-Body Power",       detail: "5 sets · 5 reps",       pct: 96 },
    ],
    gym: { name: "IronForge Pasig", loc: "Pasig City · ₱1,200/mo", match: 98 },
    meal: { name: "Chicken Adobo", kcal: 380, tag: "High protein · 38g/serving" },
    stat: { n: "+18kg", lbl: "avg. squat gain, 10 wks" },
  },
  {
    id: "fit", chip: "Stay consistent", Icon: Activity,
    tag: "Habit-first training",
    h1: "Show up 3×/week.", h2: "That's the whole plan.",
    desc: "Flexible scheduling, short sessions, no guilt when life happens.",
    color: "#ab3200",
    sessions: [
      { day: "TUE", name: "30-min Strength Express", detail: "3 sets · 12 reps",     pct: 72 },
      { day: "THU", name: "Active Recovery + Core",  detail: "20 min · bodyweight",  pct: 55 },
      { day: "SAT", name: "Cardio + Stretch",        detail: "35 min · Zone 2",      pct: 68 },
    ],
    gym: { name: "GrindHouse Fitness", loc: "Pasig City · ₱700/mo", match: 94 },
    meal: { name: "Tinolang Manok", kcal: 265, tag: "Balanced · Light on carbs" },
    stat: { n: "92%", lbl: "still active at 90 days" },
  },
  {
    id: "begin", chip: "Total beginner", Icon: Target,
    tag: "Day one friendly",
    h1: "Never lifted before.", h2: "Perfect time to start.",
    desc: "Answer questions. 60 seconds. A beginner-friendly plan that starts where you are.",
    color: "#fc4a00",
    sessions: [
      { day: "MON", name: "Beginner Full-Body A",   detail: "3 sets · 10 reps · easy", pct: 50 },
      { day: "WED", name: "Rest + 20-min Walk",     detail: "Active recovery",          pct: 30 },
      { day: "FRI", name: "Beginner Full-Body B",   detail: "3 sets · 10 reps",         pct: 50 },
    ],
    gym: { name: "PeakGains Gym", loc: "Pasig City · ₱900/mo", match: 95 },
    meal: { name: "Lugaw na Manok", kcal: 210, tag: "Easy digest · Recovery" },
    stat: { n: "64%", lbl: "of members started here" },
  },
];

const BENTO = [
  { id:"ai",    type:"ai-demo",   tag:"Generating your plan",  },
  { id:"gyms",  type:"gym-count", tag:"Gym Network",  },
  { id:"meal",  type:"meal",      tag:"Nutrition",    },
  { id:"free",  type:"big-stat",  tag:"Pricing",        },
  { id:"retain",type:"progress",  tag:"Retention",    },
  { id:"local", type:"local",     tag:"Built for PH", },
];

const QUOTES = [
  { q:"I've tried four fitness apps. None gave me a plan that made sense for my actual schedule. ExerSearch did it on day one.", name:"Kyla R.", role:"College student · Quezon City", result:"−6kg", weeks:"12 weeks", bg:"or" },
  { q:"The AI noticed I hit a plateau and updated my plan automatically. That level of attention is genuinely rare.",            name:"Nico T.", role:"Personal trainer · Cebu",     result:"100kg squat", weeks:"10 weeks", bg:"dark" },
  { q:"The meal plan uses actual Filipino food. That alone made me stick to it longer than anything I've tried.",               name:"Sofia M.", role:"Designer · Pasig",            result:"Consistent",  weeks:"8 weeks",  bg:"light" },
];

const GYM_PINS = [
  { x:52, y:38, name:"IronForge Manila",  city:"BGC",         price:"₱1,200", match:98 },
  { x:34, y:28, name:"GrindHouse QC",    city:"Quezon City", price:"₱700",   match:91 },
  { x:61, y:55, name:"PeakForm Studio",  city:"Makati",      price:"₱900",   match:94 },
  { x:22, y:62, name:"LiftLab Pasig",    city:"Pasig",       price:"₱850",   match:88 },
  { x:70, y:22, name:"Core & Co.",       city:"BGC",         price:"₱1,400", match:85 },
  { x:44, y:68, name:"Apex Fitness",     city:"Parañaque",   price:"₱750",   match:87 },
];

const FAQS = [
  { q:"Is ExerSearch really free?",       a:"Yes. Profile, AI workout plan, and gym browsing are free — no card required. A Pro upgrade exists for advanced features, but the core product is free forever." },
  { q:"How does the AI build my plan?",   a:"Our AI analyzes your goal, experience, available days, and preferences to generate a week-by-week schedule — not a generic template. It recalibrates every week as you log." },
  { q:"Are the gyms actually verified?",  a:"Yes. Every partner gym goes through our listing process. We verify location, equipment, pricing, and hours before appearing in results." },
  { q:"What if I'm a complete beginner?", a:"ExerSearch is built with beginners in mind. 64% of members had zero gym experience before signing up. The AI starts gentle and builds with you." },
  { q:"Can gym owners sign up for free?", a:"Yes. Listing your gym is completely free. You get a profile, appear in member searches, and receive inquiries directly — no upfront cost." },
  { q:"Is my personal data safe?",        a:"Your data is encrypted and never sold. We are not ad-supported. You have full control over what's shared and what isn't." },
];

/* ════════════════════════════════════════
   HOOKS
════════════════════════════════════════ */

function useInView(t = 0.1) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVis(true); }, { threshold: t });
    if (ref.current) o.observe(ref.current);
    return () => o.disconnect();
  }, [t]);
  return [ref, vis];
}

function useCounter(target, visible, dec = 0, dur = 1600) {
  const [val, setVal] = useState(0);
  const done = useRef(false);
  useEffect(() => {
    if (!visible || done.current) return;
    done.current = true;
    const t0 = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - t0) / dur, 1);
      setVal(+(target * (1 - Math.pow(1 - p, 3))).toFixed(dec));
      if (p < 1) requestAnimationFrame(tick); else setVal(target);
    };
    requestAnimationFrame(tick);
  }, [visible]);
  return val;
}


function PlanCard({ goal }) {
  const [shown, setShown] = useState(0);
  const [gymVis, setGymVis] = useState(false);
  const [mealVis, setMealVis] = useState(false);

  useEffect(() => {
    setShown(0); setGymVis(false); setMealVis(false);
    const ts = goal.sessions.map((_, i) =>
      setTimeout(() => setShown(p => p < i + 1 ? i + 1 : p), i * 170 + 60)
    );
    ts.push(setTimeout(() => setGymVis(true),  goal.sessions.length * 170 + 100));
    ts.push(setTimeout(() => setMealVis(true), goal.sessions.length * 170 + 340));
    return () => ts.forEach(clearTimeout);
  }, [goal.id]);

  return (
    <div className="pc">
      {/* chrome bar */}
      <div className="pc-bar">
        <span className="pc-dot pc-dot--r"/><span className="pc-dot pc-dot--y"/><span className="pc-dot pc-dot--g"/>
        <span className="pc-title"><Sparkles size={10} style={{color:"#fc4a00"}}/> ExerSearch</span>
        <span className="pc-tag-pill" style={{background: goal.color + "22", color: goal.color, border:`1px solid ${goal.color}44`}}>{goal.tag}</span>
      </div>

      {/* week rail */}
      <div className="pc-week">
        <span className="pc-week-lbl">Week 1 of 12</span>
        <div className="pc-week-track"><div className="pc-week-fill" style={{width:"8%", background: goal.color}}/></div>
        <span className="pc-week-pct">8%</span>
      </div>

      {/* sessions */}
      <div className="pc-sessions">
        {goal.sessions.map((s, i) => (
          <div key={`${goal.id}-${i}`} className={`pc-sess${shown > i ? " pc-sess--in" : ""}`}>
            <div className="pc-sess-day" style={{color: goal.color}}>{s.day}</div>
            <div className="pc-sess-mid">
              <div className="pc-sess-name">{s.name}</div>
              <div className="pc-sess-detail">{s.detail}</div>
            </div>
            <div className="pc-sess-bar-wrap">
              <div className="pc-sess-bar" style={{width: shown > i ? `${s.pct}%` : "0%", background: goal.color}}/>
            </div>
          </div>
        ))}
      </div>

      {/* gym match */}
      <div className={`pc-gym${gymVis?" pc-gym--in":""}`}>
        <MapPinned size={13} style={{color:"#fc4a00",flexShrink:0}}/>
        <div className="pc-gym-info">
          <div className="pc-gym-name">{goal.gym.name}</div>
          <div className="pc-gym-loc">{goal.gym.loc}</div>
        </div>
        <div className="pc-gym-match">{goal.gym.match}<span>%</span></div>
      </div>

      {/* meal */}
      <div className={`pc-meal${mealVis?" pc-meal--in":""}`}>
        <div className="pc-meal-left">
          <div className="pc-meal-eyebrow">Today's meal</div>
          <div className="pc-meal-name">{goal.meal.name}</div>
          <div className="pc-meal-tag">{goal.meal.tag}</div>
        </div>
        <div className="pc-meal-kcal">{goal.meal.kcal}<span>kcal</span></div>
      </div>

      {/* stat badge */}
      <div className={`pc-stat${mealVis?" pc-stat--in":""}`} style={{borderColor: goal.color + "44", background: goal.color + "11"}}>
        <div className="pc-stat-n" style={{color: goal.color}}>{goal.stat.n}</div>
        <div className="pc-stat-lbl">{goal.stat.lbl}</div>
      </div>
    </div>
  );
}

function Hero() {
  const [idx, setIdx] = useState(0);

  const [count, setCount] = useState(
    () => 1000 + Math.floor(Math.random() * 900)
);

  const [userPicked, setUserPicked] = useState(false);
  const timerRef = useRef(null);
  const goal = GOALS[idx];

  /* auto-cycle */
  useEffect(() => {
    if (userPicked) return;
    timerRef.current = setInterval(() => setIdx(p => (p+1) % GOALS.length), 4200);
    return () => clearInterval(timerRef.current);
  }, [userPicked]);

  /* member counter */
  useEffect(() => {
    const t = setInterval(() => setCount(p => p + Math.floor(Math.random() * 2 + 1)), 3200);
    return () => clearInterval(t);
  }, []);

  const pick = i => {
    setIdx(i); setUserPicked(true);
    clearInterval(timerRef.current);
    timerRef.current = setTimeout(() => setUserPicked(false), 14000);
  };

  return (
    <section className="hero">
      <div className="hero-noise"/>
      <div className="hero-glow"/>

      <div className="hero-inner wrap">
        {/* LEFT */}
        <div className="hero-copy">
          <div className="hero-eyebrow">
            <span className="hero-pip"/>
           Fitness Platform · Pasig City 
          </div>

          {/* morphing headline */}
          <h1 className="hero-h1" key={goal.id}>
            <span className="hero-h1-a">{goal.h1}</span>
            <span className="hero-h1-b">{goal.h2}</span>
          </h1>

          <p className="hero-desc">{goal.desc}</p>

          {/* goal chips */}
          <div className="hero-chips-wrap">
            <p className="hero-chips-lbl">Pick your goal — watch it build your plan:</p>
            <div className="hero-chips">
              {GOALS.map((g, i) => (
                <button
                  key={g.id}
                  className={`hchip${idx===i?" hchip--on":""}`}
                  onClick={() => pick(i)}
                  style={idx===i ? {borderColor: g.color, color: g.color, background: g.color+"18"} : {}}
                  data-h
                >
                  <g.Icon size={13} strokeWidth={2}/>
                  {g.chip}
                </button>
              ))}
            </div>
          </div>

          <div className="hero-actions">
            <a href="/login" className="btn-primary" data-h>
              Start free — ₱0 <ArrowRight size={15} strokeWidth={2.5}/>
            </a>
            <a href="#what" className="btn-ghost" data-h>See what's inside</a>
          </div>

          <div className="hero-social">
            <div className="hero-avs">
              {["KR","MD","BL","NT","CM"].map((ini,i)=>(
                <div key={i} className={`hero-av${i===2?" or":""}`}>{ini}</div>
              ))}
            </div>
            <span className="hero-proof">
              <strong>{count.toLocaleString()}</strong> people started their fitness journey
            </span>
          </div>
        </div>

        {/* RIGHT — live plan card */}
        <div className="hero-right" aria-hidden="true">
          <div className="hero-ring hero-ring--1"/>
          <div className="hero-ring hero-ring--2"/>
          <PlanCard goal={goal}/>
        </div>
      </div>

      <a href="#manifesto" className="hero-scroll" aria-label="Scroll down">
        <ChevronDown size={18} strokeWidth={1.5}/>
      </a>
    </section>
  );
}

/* ════════════════════════════════════════
   S2 — MANIFESTO
════════════════════════════════════════ */

function Manifesto() {
  const [ref, vis] = useInView(0.15);
  return (
    <section className="manifesto" id="manifesto" ref={ref}>
      <div className="manifesto-noise"/>
      <div className={`manifesto-inner wrap${vis?" in":""}`}>
        <div className="manifesto-tag">Why this exists</div>
        <p className="manifesto-txt">
          We built ExerSearch for the <span className="manifesto-em">64%</span> who had zero gym experience —<br/>
          and the <span className="manifesto-em">52%</span> who quit by week three because<br/>
          <span className="manifesto-stroke">the plan wasn't built for their life.</span>
        </p>
        <div className="manifesto-rule"/>
        <div className="manifesto-foot">
          <a href="/register" className="btn-white" data-h>
            This was built for you <ArrowRight size={14} strokeWidth={2.5}/>
          </a>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════
   S3 — BENTO
════════════════════════════════════════ */

function AIDemoCell() {
  const [line, setLine] = useState(0);
  const lines = ["Analyzing your schedule…","Setting progressive overload…","Calibrating recovery days…","Building workout plan…","Plan ready. 12 weeks."];
  useEffect(() => { const t=setInterval(()=>setLine(p=>(p+1)%lines.length),1400); return ()=>clearInterval(t); },[]);
  return (
    <div className="bc-ai">
      <div className="bc-ai-tag"><Sparkles size={11}/> Preparing...</div>
      <div className="bc-ai-line" key={line}><span className="bc-ai-cursor"/>{lines[line]}</div>
      <div className="bc-ai-bars">
        {[70,45,82,60,93,55,78].map((h,i)=>(
          <div key={i} className="bc-ai-bar" style={{height:`${h}%`,background:i===6?"#fc4a00":i===4?"#ff5a16":"rgba(252,74,0,.22)"}}/>
        ))}
      </div>
    </div>
  );
}

function GymCountCell() {
  const [ref, vis] = useInView(0.2);
  const n = useCounter(50, vis, 0, 1400); 

  return (
    <div className="bc-gyms" ref={ref}>
      <div className="bc-gyms-n">{n}+</div> 
      <div className="bc-gyms-lbl">Verified gyms</div>
      <div className="bc-gyms-sub">across Pasig City</div>
      <div className="bc-gyms-ring"/>
    </div>
  );
}

function MealCell() {
  const dishes = ["Chicken Adobo","Sinigang","Tinola","Lugaw","Kare-kare","Caldereta", "Sisig"];
  const [active,setActive] = useState(0);
  useEffect(()=>{ const t=setInterval(()=>setActive(p=>(p+1)%dishes.length),1700); return ()=>clearInterval(t); },[]);
  return (
    <div className="bc-meal">
      <div className="bc-meal-dish" key={active}>{dishes[active]}</div>
      <div className="bc-meal-tag">Filipino food · Real macros</div>
      <div className="bc-meal-compliance">
        <span className="bc-meal-n">3.8×</span>
        <span>better compliance than Western meal plans</span>
      </div>
    </div>
  );
}

function FreeCell() {
  return (
    <div className="bc-free">
      <div className="bc-free-n">₱0</div>
      <div className="bc-free-lbl">to start</div>
      <div className="bc-free-pts">
        {["No credit card","No trial","Free forever"].map((t,i)=>(
          <div key={i} className="bc-free-pt"><Check size={11} strokeWidth={3}/>{t}</div>
        ))}
      </div>
    </div>
  );
}

function RetainCell() {
  const [ref, vis] = useInView(0.2);
  const n = useCounter(96, vis, 0, 1400);

  return (
    <div className="bc-retain" ref={ref}>
      <div className="bc-retain-n">{n} <span>%</span></div> 
      <div className="bc-retain-lbl">still active at 60 days</div>
      <div className="bc-retain-track">
        <div
          className="bc-retain-fill"
          style={{
            width: vis ? "92%" : "0%",
            transition: "width 1.6s cubic-bezier(.22,1,.36,1)",
          }}
        />
      </div>
      <div className="bc-retain-note">Industry avg: 38%</div>
    </div>
  );
}

function LocalCell() {
  return (
    <div className="bc-local">
      <div className="bc-local-flag">🇵🇭</div>
      <div className="bc-local-h">Made in Pasig.<br/>Not adapted for it.</div>
      <div className="bc-local-tags">
        {["Filipino meals","PHP pricing","Pasig gyms","Local schedules"].map((t,i)=>(
          <span key={i} className="bc-local-tag">{t}</span>
        ))}
      </div>
    </div>
  );
}

const CELL_MAP = {"ai-demo":AIDemoCell,"gym-count":GymCountCell,meal:MealCell,"big-stat":FreeCell,progress:RetainCell,local:LocalCell};

function Bento() {
  const [ref,vis] = useInView(0.06);
  return (
    <section className="bento" id="what" ref={ref}>
      <div className="wrap bento-head">
        <div className="bento-eyebrow">Everything included</div>
        <h2 className="bento-h">One app.<br/><em>Everything you need.</em></h2>
      </div>
      <div className="bento-grid">
        {BENTO.map((cell,i)=>{
          const Comp = CELL_MAP[cell.type];
          return (
            <div key={cell.id} className={`bc bc--${cell.type}${vis?" bc--in":""}`} style={{transitionDelay:`${i*.07}s`}}>
              <div className="bc-tag">{cell.tag}</div>
              <Comp/>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ════════════════════════════════════════
   S4 — REAL TALK
════════════════════════════════════════ */

function QuoteRow({ data, idx }) {
  const [ref,vis] = useInView(0.1);
  return (
    <div className={`qr qr--${data.bg}${vis?" qr--in":""}`} ref={ref}>
      <div className={`qr-inner wrap${idx%2!==0?" qr-inner--flip":""}`}>
        <blockquote className="qr-q"><span className="qr-mark">"</span>{data.q}</blockquote>
        <div className="qr-meta">
          <div className="qr-result">{data.result}</div>
          <div className="qr-name">{data.name}</div>
          <div className="qr-role">{data.role}</div>
          <div className="qr-weeks">{data.weeks}</div>
        </div>
      </div>
    </div>
  );
}

function RealTalk() {
  return (
    <section className="realtalk">
      <div className="realtalk-head wrap">
        <div className="realtalk-eyebrow">Member voices</div>
        <h2 className="realtalk-h">Don't take<br/><em>our word for it.</em></h2>
      </div>
      {QUOTES.map((q,i)=><QuoteRow key={i} data={q} idx={i}/>)}
    </section>
  );
}

/* ════════════════════════════════════════
   S5 — GYM MAP
════════════════════════════════════════ */

function GymMap() {
  const [hover,setHover] = useState(null);
  const [ref,vis] = useInView(0.1);
  return (
    <section className="gmap" ref={ref}>
      <div className="gmap-inner wrap">
        <div className={`gmap-copy${vis?" in":""}`}>
          <div className="gmap-eyebrow">Gym network</div>
          <h2 className="gmap-h">50+ verified gyms.<br/><em>One matches you.</em></h2>
          <p className="gmap-sub">Filter by price, equipment, amenities, and distance. Every gym verified before it appears.</p>
          <div className="gmap-stats">
            {[["50+","Partner gyms"],["Pasig","coverage"],["₱500","Starting price/mo"]].map(([n,l],i)=>(
              <div key={i} className="gmap-stat">
                <div className="gmap-stat-n">{n}</div>
                <div className="gmap-stat-l">{l}</div>
              </div>
            ))}
          </div>
          <a href="/login" className="btn-primary" data-h>Find my gym <ArrowRight size={14} strokeWidth={2.5}/></a>
        </div>
        <div className={`gmap-map${vis?" in":""}`} aria-hidden="true">
          <div className="gmap-grid">
            {Array.from({length:5}).map((_,i)=><div key={i} className="gmap-grid-h" style={{top:`${20+i*15}%`}}/>)}
            {Array.from({length:5}).map((_,i)=><div key={i} className="gmap-grid-v" style={{left:`${15+i*17}%`}}/>)}
          </div>
          {GYM_PINS.map((pin,i)=>(
            <div key={i} className={`gmap-pin${hover===i?" gmap-pin--h":""}${pin.match>=94?" gmap-pin--hot":""}`}
              style={{left:`${pin.x}%`,top:`${pin.y}%`,animationDelay:`${i*.12}s`}}
              onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)} data-h>
              <div className="gmap-pin-dot"/>
              <div className="gmap-pin-pulse"/>
              {hover===i&&(
                <div className="gmap-pin-card">
                  <div className="gmap-pin-name">{pin.name}</div>
                  <div className="gmap-pin-meta">{pin.city} · {pin.price}/mo</div>
                  <div className="gmap-pin-match">{pin.match}% match</div>
                </div>
              )}
            </div>
          ))}
          <div className="gmap-badge"><span>+50</span> more gyms</div>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════
   S6 — OWNER STRIP
════════════════════════════════════════ */

function OwnerStrip() {
  const [ref,vis] = useInView(0.1);
  return (
    <section className="owners" ref={ref}>
      <div className="owners-noise"/>
      <div className="owners-inner wrap">
        <div className={`owners-copy${vis?" in":""}`}>
          <div className="owners-eyebrow">For gym owners</div>
          <h2 className="owners-h">Grow your gym.<br/>Zero upfront cost.</h2>
          <p className="owners-sub">List free. Get matched to members actively looking for exactly what you offer. Real inquiries from real people.</p>
          <div className="owners-pts">
            {[[MapPinned,"Get discovered by the right members"],[Inbox,"All inquiries in one dashboard"],[TrendingUp,"Track views, inquiries, conversions"],[BadgeCheck,"Free to list — no upfront cost"]].map(([Icon,t],i)=>(
              <div key={i} className="owners-pt">
                <Icon size={14} strokeWidth={2} style={{color:"rgba(255,255,255,.85)",flexShrink:0}}/><span>{t}</span>
              </div>
            ))}
          </div>
          <a href="become-an-owner" className="btn-white" data-h>List my gym free <ArrowRight size={14} strokeWidth={2.5}/></a>
        </div>
        <div className={`owners-mock${vis?" in":""}`}>
          <div className="mock">
            <div className="mock-bar">
              <span className="md r"/><span className="md y"/><span className="md g"/>
              <span className="mock-url">exersearch.online/owner/view-gyms</span>
            </div>
            <div className="mock-body">
              <div className="mock-head">Pasig Fitness Gym</div>
              <div className="mock-kpis">
                {[["847","Views"],["34","Inquiries"],["12","Members"]].map(([v,l],i)=>(
                  <div key={i} className="mock-kpi"><div className="mock-kv">{v}</div><div className="mock-kl">{l}</div></div>
                ))}
              </div>
              <div className="mock-line"/><div className="mock-sec">Recent inquiries</div>
              {[{ini:"AJ",n:"Arnie Javier",m:"98%",c:"#fc4a00"},{ini:"DP",n:"Daniel Pontiga",m:"94%",c:"#ab3200"},{ini:"MH",n:"Mark H.",m:"89%",c:"#ff5a16"}].map((r,i)=>(
                <div key={i} className="mock-row" data-h>
                  <div className="mock-av" style={{background:r.c}}>{r.ini}</div>
                  <span className="mock-nm">{r.n}</span><span className="mock-mt">{r.m} match</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════
   S7 — FAQ
════════════════════════════════════════ */

function FAQ() {
  const [open,setOpen] = useState(null);
  const [ref,vis] = useInView(0.08);
  return (
    <section className="faq" ref={ref}>
      <div className="wrap faq-inner">
        <div className="faq-left">
          <div className="faq-eyebrow">FAQ</div>
          <h2 className="faq-h">Questions<br/><em>answered.</em></h2>
          <p className="faq-sub">Still stuck? <a href="mailto:hello@exersearch.ph" className="faq-link" data-h>hello@exersearch.ph</a></p>
          <div className="faq-orb">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
        <div className={`faq-list${vis?" in":""}`}>
          {FAQS.map((faq,i)=>(
            <div key={i} className={`faq-item${open===i?" open":""}`}>
              <button className="faq-btn" onClick={()=>setOpen(open===i?null:i)} data-h>
                <span className="faq-num">0{i+1}</span>
                <span className="faq-q">{faq.q}</span>
                <span className="faq-ico">{open===i?"−":"+"}</span>
              </button>
              <div className="faq-panel"><p className="faq-a">{faq.a}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════
   S8 — CTA
════════════════════════════════════════ */

function CTA() {
  const [ref,vis] = useInView(0.12);
  return (
    <section className="cta" ref={ref}>
      <div className="cta-noise"/>
      <div className="wrap cta-inner">
        <div className={`cta-kicker${vis?" in":""}`}><span className="cta-pip"/>Free forever · No credit card · Setup in 60 seconds</div>
        <h2 className={`cta-h${vis?" in":""}`}>Start<br/><span className="cta-em">right now.</span></h2>
        <div className={`cta-actions${vis?" in":""}`}>
          <a href="/login" className="btn-white" data-h>Create free account <ArrowRight size={16} strokeWidth={2.5}/></a>
          <a href="/login" className="btn-outline-white" data-h>Browse gyms</a>
        </div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════
   ROOT
════════════════════════════════════════ */

export default function Index() {
  return (
    <div className="es">
      <div className="es-spot"/>
      <Header/>
      <main>
        <Hero/>
        <Manifesto/>
        <Bento/>
        <RealTalk/>
        <GymMap/>
        <OwnerStrip/>
        <FAQ/>
        <CTA/>
      </main>
      <Footer/>
      <ScrollThemeWidget/>
    </div>
  );
}
