import { useEffect, useRef, useState } from "react";
import Header from "./Header";
import Footer from "./Footer";
import "./WhyExersearch.css";

import ScrollThemeWidget from "../../utils/ScrollThemeWidget";
import {
  Zap,
  Map,
  Brain,
  Dumbbell,
  UtensilsCrossed,
  ShieldCheck,
  TrendingUp,
  Users,
  Star,
  ArrowRight,
  Play,
} from "lucide-react";

const STATS = [
  { n: "50+",    l: "Partner Gyms" },
  { n: "1,000+", l: "Active Members" },
  { n: "5,000+", l: "Workouts Done" },
  { n: "4.9",    l: "User Rating" },
];

const PILLARS = [
  {
    num: "01",
    icon: Brain,
    title: "AI That Actually Knows Fitness",
    body: "Our AI doesn't just spit out generic plans. It understands your body, your goals, and your lifestyle — then builds something real.",
    tag: "Intelligence",
  },
  {
    num: "02",
    icon: Map,
    title: "Gym Discovery Without the Guesswork",
    body: "Stop scrolling through random listings. We match you to gyms based on what you actually care about — proximity, vibe, equipment, price.",
    tag: "Discovery",
  },
  {
    num: "03",
    icon: UtensilsCrossed,
    title: "Nutrition That Sticks",
    body: "Meal planning that fits your goals without making you miserable. Flexible, practical, and built around food you can actually find.",
    tag: "Nutrition",
  },
  {
    num: "04",
    icon: TrendingUp,
    title: "Progress You Can See",
    body: "Track workouts, milestones, and improvements over time. When you can see how far you've come, staying consistent gets easier.",
    tag: "Growth",
  },
  {
    num: "05",
    icon: ShieldCheck,
    title: "Verified, Honest Information",
    body: "Every gym listed is partner-verified. Every feature we build is tested by real users. No fluff, no inflated ratings.",
    tag: "Trust",
  },
  {
    num: "06",
    icon: Users,
    title: "Built for Real People",
    body: "Not just athletes. Not just beginners. ExerSearch works for anyone at any point in their fitness journey — including those just starting.",
    tag: "Inclusivity",
  },
];

const COMPARISONS = [
  { label: "Personalized AI plans",       us: true,  them: false },
  { label: "Verified gym listings",       us: true,  them: false },
  { label: "Integrated meal planning",    us: true,  them: false },
  { label: "Progress tracking",           us: true,  them: true  },
  { label: "Beginner-friendly onboarding",us: true,  them: false },
  { label: "Owner dashboard for gyms",    us: true,  them: false },
  { label: "Zero paid gym promotions",    us: true,  them: false },
];

export default function WhyExerSearch() {
  const heroRef  = useRef(null);
  const [activeTab, setActiveTab] = useState(0);
  const [inView, setInView] = useState({});

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setInView((p) => ({ ...p, [e.target.dataset.id]: true }));
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll("[data-id]").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  // Parallax on hero
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const onMove = (e) => {
      const { clientX, clientY } = e;
      const cx = window.innerWidth  / 2;
      const cy = window.innerHeight / 2;
      const dx = (clientX - cx) / cx;
      const dy = (clientY - cy) / cy;
      hero.style.setProperty("--mx", dx);
      hero.style.setProperty("--my", dy);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <>
      <Header />

      <div className="wy">

        {/* ── HERO ── */}
        <section className="wy-hero" ref={heroRef}>
          <div className="wy-hero__bg">
            <div className="wy-hero__orb wy-hero__orb--1" />
            <div className="wy-hero__orb wy-hero__orb--2" />
            <div className="wy-hero__grid" />
          </div>

          <div className="wy-wrap wy-hero__inner">
            <div className="wy-hero__left">
              <span className="wy-eyebrow">
                <Zap size={11} /> Why ExerSearch
              </span>
              <h1 className="wy-hero__h1">
                Fitness tools that<br />
                <em>don't make</em><br />
                you feel stupid.
              </h1>
              <p className="wy-hero__sub">
                Most fitness apps assume you already know what you're doing.
                ExerSearch is built for everyone else — people who want real
                guidance, not just a place to log reps.
              </p>
              <div className="wy-hero__actions">
                <a href="/register" className="wy-btn wy-btn--or">
                  Get started free <ArrowRight size={14} />
                </a>
                <a href="#pillars" className="wy-btn wy-btn--ghost">
                  <Play size={12} /> See how it works
                </a>
              </div>
            </div>

            <div className="wy-hero__right">
              <div className="wy-stat-grid">
                {STATS.map((s, i) => (
                  <div className="wy-stat" key={i} style={{ "--i": i }}>
                    <span className="wy-stat__n">{s.n}</span>
                    <span className="wy-stat__l">{s.l}</span>
                  </div>
                ))}
              </div>
              <div className="wy-hero__card">
                <div className="wy-hero__card-row">
                  <Star size={13} fill="currentColor" />
                  <Star size={13} fill="currentColor" />
                  <Star size={13} fill="currentColor" />
                  <Star size={13} fill="currentColor" />
                  <Star size={13} fill="currentColor" />
                </div>
                <p className="wy-hero__card-quote">
                  "Finally an app that doesn't assume I know everything about fitness."
                </p>
                <span className="wy-hero__card-author">— Active ExerSearch Member</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── INTRO STRIP ── */}
        <section className="wy-intro">
          <div className="wy-wrap wy-intro__inner">
            <p className="wy-intro__text" data-id="intro">
              ExerSearch exists because fitness shouldn't feel like a privilege
              reserved for people who already know all the rules.
            </p>
          </div>
        </section>

        {/* ── PILLARS ── */}
        <section className="wy-pillars" id="pillars">
          <div className="wy-wrap">
            <div className="wy-sec-hdr" data-id="pillars-hdr">
              <span className="wy-eyebrow wy-eyebrow--dk">
                <Dumbbell size={11} /> What we do differently
              </span>
              <h2 className="wy-sec-title">
                Six reasons people choose<br /><em>ExerSearch</em>
              </h2>
            </div>

            <div className="wy-pillars__grid">
              {PILLARS.map((p, i) => {
                const Icon = p.icon;
                return (
                  <article
                    key={i}
                    className={`wy-pillar ${inView[`p${i}`] ? "wy-pillar--in" : ""}`}
                    data-id={`p${i}`}
                    style={{ "--delay": `${i * 0.08}s` }}
                  >
                    <div className="wy-pillar__top">
                      <span className="wy-pillar__num">{p.num}</span>
                      <span className="wy-pillar__tag">{p.tag}</span>
                    </div>
                    <div className="wy-pillar__ico">
                      <Icon size={20} />
                    </div>
                    <h3 className="wy-pillar__title">{p.title}</h3>
                    <p className="wy-pillar__body">{p.body}</p>
                    <div className="wy-pillar__bar" />
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── SPLIT FEATURE ── */}
        <section className="wy-split">
          <div className="wy-wrap wy-split__inner">
            <div className="wy-split__text" data-id="split">
              <span className="wy-eyebrow">The ExerSearch difference</span>
              <h2 className="wy-split__title">
                We built this for people, <em>not metrics.</em>
              </h2>
              <p className="wy-split__body">
                A lot of fitness platforms optimize for engagement — they want you
                scrolling, not sweating. We measure success differently: did you
                find a gym you actually liked? Did your plan work for your real
                schedule? Did you come back not because of notifications, but
                because it helped?
              </p>
              <p className="wy-split__body">
                That's the bar we hold ourselves to. Every feature we ship has
                to answer yes to those questions first.
              </p>
            </div>

            <div className="wy-split__visual" data-id="split-v">
              <div className="wy-split__card wy-split__card--a">
                <span className="wy-split__card-label">Other apps</span>
                <p>Maximize time-in-app</p>
                <p>Generic recommendations</p>
                <p>Paid gym placements</p>
              </div>
              <div className="wy-split__card wy-split__card--b">
                <span className="wy-split__card-label">ExerSearch</span>
                <p>Help you reach your goal faster</p>
                <p>AI-matched to your needs</p>
                <p>Zero paid promotions</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── COMPARISON ── */}
        <section className="wy-compare">
          <div className="wy-wrap">
            <div className="wy-sec-hdr" data-id="compare-hdr">
              <span className="wy-eyebrow wy-eyebrow--dk">Comparison</span>
              <h2 className="wy-sec-title">
                ExerSearch vs <em>everything else</em>
              </h2>
            </div>

            <div className="wy-compare__table" data-id="compare-table">
              <div className="wy-compare__head">
                <div />
                <div className="wy-compare__col-hd wy-compare__col-hd--us">ExerSearch</div>
                <div className="wy-compare__col-hd">Others</div>
              </div>
              {COMPARISONS.map((row, i) => (
                <div
                  key={i}
                  className="wy-compare__row"
                  style={{ "--delay": `${i * 0.06}s` }}
                >
                  <span className="wy-compare__label">{row.label}</span>
                  <span className={`wy-compare__cell wy-compare__cell--us ${row.us ? "yes" : "no"}`}>
                    {row.us ? "✓" : "✗"}
                  </span>
                  <span className={`wy-compare__cell ${row.them ? "yes" : "no"}`}>
                    {row.them ? "✓" : "✗"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TESTIMONIAL MARQUEE ── */}
        <section className="wy-marquee">
          <div className="wy-marquee__track">
            {[...Array(3)].map((_, gi) => (
              <div className="wy-marquee__group" key={gi}>
                {[
                  "Found my gym in 10 minutes.",
                  "My workout plan actually fits my life.",
                  "Best fitness discovery I've made.",
                  "Meal plans that don't feel like punishment.",
                  "Finally — fitness without the overwhelm.",
                  "Matched me to a gym I actually love.",
                ].map((t, i) => (
                  <span className="wy-marquee__item" key={i}>
                    {t} <Star size={11} fill="currentColor" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* ── TABS: FOR USERS / FOR OWNERS ── */}
        <section className="wy-tabs-section">
          <div className="wy-wrap">
            <div className="wy-tabs__hd">
              <button
                className={`wy-tab-btn ${activeTab === 0 ? "active" : ""}`}
                onClick={() => setActiveTab(0)}
              >
                For Users
              </button>
              <button
                className={`wy-tab-btn ${activeTab === 1 ? "active" : ""}`}
                onClick={() => setActiveTab(1)}
              >
                For Gym Owners
              </button>
            </div>

            <div className="wy-tab-content">
              {activeTab === 0 ? (
                <div className="wy-tab-panel">
                  {[
                    { icon: Brain,           title: "Smart AI plans",         body: "Personalized workout and meal plans built around your goals." },
                    { icon: Map,             title: "Gym matching",           body: "Find gyms that fit your preferences, budget, and schedule." },
                    { icon: TrendingUp,      title: "Progress visibility",    body: "Track every session and watch your improvement over time." },
                    { icon: ShieldCheck,     title: "Verified content",       body: "Every gym listed meets our quality and accuracy standards." },
                  ].map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div className="wy-tab-item" key={i}>
                        <div className="wy-tab-item__ico"><Icon size={18} /></div>
                        <div>
                          <h4>{item.title}</h4>
                          <p>{item.body}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="wy-tab-panel">
                  {[
                    { icon: Users,           title: "More visibility",        body: "Get discovered by people actively searching for a gym like yours." },
                    { icon: ShieldCheck,     title: "Verified listing",       body: "Stand out with a verified partner badge that builds trust." },
                    { icon: TrendingUp,      title: "Owner dashboard",        body: "Manage your gym profile, inquiries, and applications in one place." },
                    { icon: Zap,             title: "Direct connections",     body: "Reach users who match your gym's type — no middlemen." },
                  ].map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div className="wy-tab-item" key={i}>
                        <div className="wy-tab-item__ico"><Icon size={18} /></div>
                        <div>
                          <h4>{item.title}</h4>
                          <p>{item.body}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="wy-cta">
          <div className="wy-wrap wy-cta__inner">
            <div className="wy-cta__noise" />
            <p className="wy-cta__overline">Ready when you are</p>
            <h2 className="wy-cta__title">
              Stop searching for fitness.<br />
              <em>Let it find you.</em>
            </h2>
            <div className="wy-cta__actions">
              <a href="/register" className="wy-btn wy-btn--white">
                Create free account <ArrowRight size={14} />
              </a>
              <a href="/gyms" className="wy-btn wy-btn--outline-white">
                Browse gyms
              </a>
            </div>
          </div>
        </section>

      </div>

      <Footer />
      <ScrollThemeWidget />
    </>
  );
}