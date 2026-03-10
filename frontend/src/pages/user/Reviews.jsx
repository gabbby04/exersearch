import React, { useEffect, useRef, useState } from "react";
import Header from "./Header";
import Footer from "./Footer";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  MessageSquareQuote,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Star,
  MapPinned,
  Dumbbell,
  Users,
  ThumbsUp,
  Eye,
  Clock,
  ChevronDown,
  Filter,
} from "lucide-react";
import "./Reviews.css";
import ScrollThemeWidget from "../../utils/ScrollThemeWidget";
import { useTheme } from "./ThemeContext";

gsap.registerPlugin(ScrollTrigger);

/* ─── DATA ─── */
const FEEDBACK = [
  {
    quote: "The map makes it much easier to compare gyms around me.",
    author: "Early tester",
    stars: 5,
    tag: "Gym discovery",
  },
  {
    quote: "I like being able to see amenities before visiting.",
    author: "Beta user",
    stars: 5,
    tag: "Amenities",
  },
  {
    quote: "It feels simpler to narrow down options without opening lots of separate pages.",
    author: "First-wave user",
    stars: 4,
    tag: "UX",
  },
];

const TABS = ["For gym seekers", "For reviewers"];

const HIGHLIGHTS = {
  "For gym seekers": [
    { icon: ShieldCheck, title: "Trusted Feedback",  desc: "Real experiences from real gym-goers so users can compare options with more confidence." },
    { icon: Dumbbell,    title: "Equipment & Space",  desc: "Reviews highlight cleanliness, crowd levels, equipment quality, and overall workout environment." },
    { icon: MapPinned,   title: "Local Insight",      desc: "Members share what a gym really feels like before someone visits for the first time." },
    { icon: MessageSquareQuote, title: "Helpful Details", desc: "From staff friendliness to peak-hour experience, small details make choosing easier." },
  ],
  "For reviewers": [
    { icon: ThumbsUp, title: "Share Your Experience", desc: "Help others in your area find gyms that actually suit them — your review makes a difference." },
    { icon: Eye,      title: "Be Seen",               desc: "Your insights become part of a growing community resource that real people rely on." },
    { icon: Clock,    title: "Quick to Write",        desc: "Leave a short honest review in under two minutes — no lengthy forms, no account walls." },
    { icon: Users,    title: "Build the Community",   desc: "Early reviewers shape the standard for what quality gym feedback looks like on ExerSearch." },
  ],
};

const USER_REVIEWS = [
  {
    id: 1,
    gym: "Iron Peak Fitness",
    location: "Quezon City",
    author: "Marcus T.",
    initials: "MT",
    date: "Feb 2025",
    stars: 5,
    tag: "Equipment",
    body: "Honestly one of the best gym experiences I've had. The equipment is well-maintained, the floor plan makes sense, and it never feels overcrowded even during peak hours. The staff are approachable and actually know their stuff. Been coming here for three months and I don't see myself leaving.",
    helpful: 24,
    verified: true,
  },
  {
    id: 2,
    gym: "CoreZone Gym",
    location: "Makati",
    author: "Lena R.",
    initials: "LR",
    date: "Jan 2025",
    stars: 4,
    tag: "Amenities",
    body: "Great facilities overall — the showers are clean and there's always enough lockers. My only gripe is that the AC on the second floor barely works in the afternoon. Otherwise it's a solid gym with good variety in equipment. Would recommend to beginners especially.",
    helpful: 18,
    verified: true,
  },
  {
    id: 3,
    gym: "UrbanLift Studio",
    location: "BGC, Taguig",
    author: "Daniel F.",
    initials: "DF",
    date: "Mar 2025",
    stars: 3,
    tag: "Value",
    body: "The gym looks great and the location is convenient, but the membership price is hard to justify given the limited free weights section. It feels like it caters more to cardio people. The classes are good though, and the trainers seem knowledgeable.",
    helpful: 9,
    verified: false,
  },
  {
    id: 4,
    gym: "PrimeForm Athletic",
    location: "Mandaluyong",
    author: "Sofia M.",
    initials: "SM",
    date: "Feb 2025",
    stars: 5,
    tag: "Staff",
    body: "The staff here genuinely care about helping you. I came in with zero experience and one of the trainers spent 20 minutes showing me around and explaining how to use the machines safely. No upselling, just genuine help. The gym itself is clean and the vibe is welcoming.",
    helpful: 31,
    verified: true,
  },
  {
    id: 5,
    gym: "HardSet Training Center",
    location: "Pasig",
    author: "Kevin L.",
    initials: "KL",
    date: "Jan 2025",
    stars: 4,
    tag: "Equipment",
    body: "Solid powerlifting setup — multiple squat racks, a deadlift platform, and a good selection of barbells. Gets busy on weekday evenings so you might have to wait, but overall it's one of the better options if you're serious about lifting. Parking can be tricky.",
    helpful: 15,
    verified: true,
  },
  {
    id: 6,
    gym: "FlexBase Wellness",
    location: "Ortigas",
    author: "Anya C.",
    initials: "AC",
    date: "Mar 2025",
    stars: 2,
    tag: "Cleanliness",
    body: "Disappointed with how the bathrooms are maintained. Equipment is decent but some machines have been broken for weeks. The staff don't seem to follow up on maintenance requests. For the price point they're charging, I expected more. Might look elsewhere when my contract ends.",
    helpful: 7,
    verified: false,
  },
];

const STAR_FILTERS = [0, 5, 4, 3, 2, 1];
const SORT_OPTIONS = ["Most Recent", "Highest Rated", "Most Helpful"];

/* ── star display ── */
function StarRow({ n, size = 11 }) {
  return (
    <div className="rv-stars" aria-label={`${n} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          fill={i <= n ? "currentColor" : "none"}
          strokeWidth={i <= n ? 0 : 1.5}
          className={`rv-star ${i <= n ? "rv-star--on" : "rv-star--off"}`}
        />
      ))}
    </div>
  );
}

/* ── single review card ── */
function ReviewCard({ review }) {
  const [expanded, setExpanded] = useState(false);
  const [voted, setVoted] = useState(false);
  const [votes, setVotes] = useState(review.helpful);
  const isLong = review.body.length > 180;
  const displayBody = !isLong || expanded ? review.body : review.body.slice(0, 180) + "…";

  const handleVote = () => {
    if (voted) return;
    setVoted(true);
    setVotes((v) => v + 1);
  };

  return (
    <article className="rvc">
      <div className="rvc__hdr">
        <div className="rvc__avatar">{review.initials}</div>
        <div className="rvc__meta">
          <span className="rvc__author">
            {review.author}
            {review.verified && <span className="rvc__verified">✓ Verified</span>}
          </span>
          <span className="rvc__gym">
            {review.gym} · <span className="rvc__loc">{review.location}</span>
          </span>
        </div>
        <div className="rvc__right">
          <StarRow n={review.stars} size={13} />
          <span className="rvc__date">{review.date}</span>
        </div>
      </div>

      <div className="rvc__body-wrap">
        <span className="rv-tag rv-tag--dark">{review.tag}</span>
        <p className="rvc__body">{displayBody}</p>
        {isLong && (
          <button className="rvc__expand" onClick={() => setExpanded((e) => !e)}>
            {expanded ? "Show less" : "Read more"}
            <ChevronDown size={13} className={expanded ? "rvc__chev--up" : ""} />
          </button>
        )}
      </div>

      <div className="rvc__footer">
        <span className="rvc__helpful-label">Helpful?</span>
        <button
          className={`rvc__helpful-btn ${voted ? "rvc__helpful-btn--voted" : ""}`}
          onClick={handleVote}
          disabled={voted}
        >
          <ThumbsUp size={13} />
          <span>{votes}</span>
        </button>
      </div>
    </article>
  );
}

/* ── mouse-tilt card ── */
function TiltCard({ children, className = "", style }) {
  const ref = useRef(null);

  const onMouseMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    const rx = ((e.clientY - top)  / height - 0.5) * -10;
    const ry = ((e.clientX - left) / width  - 0.5) *  10;
    el.style.setProperty("--rx", `${rx}deg`);
    el.style.setProperty("--ry", `${ry}deg`);
    el.style.setProperty("--ox", `${((e.clientX - left) / width)  * 100}%`);
    el.style.setProperty("--oy", `${((e.clientY - top)  / height) * 100}%`);
    el.classList.add("rv-tilt--active");
  };
  const onMouseLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.classList.remove("rv-tilt--active");
  };

  return (
    <div
      ref={ref}
      className={`rv-tilt ${className}`}
      style={style}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
}

/* ─── PAGE ─── */
export default function ReviewsPage() {
  const { isDark } = useTheme();
  const sectionRef  = useRef(null);
  const logoPathRef = useRef(null);
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [tabFading, setTabFading] = useState(false);
  const [starFilter, setStarFilter] = useState(0);
  const [sortBy, setSortBy] = useState(SORT_OPTIONS[0]);

  const filteredReviews = USER_REVIEWS
    .filter((r) => starFilter === 0 || r.stars === starFilter)
    .sort((a, b) => {
      if (sortBy === "Highest Rated") return b.stars - a.stars;
      if (sortBy === "Most Helpful")  return b.helpful - a.helpful;
      return b.id - a.id;
    });

  const avgRating = (USER_REVIEWS.reduce((s, r) => s + r.stars, 0) / USER_REVIEWS.length).toFixed(1);
  const breakdown = [5,4,3,2,1].map((s) => ({
    star: s,
    count: USER_REVIEWS.filter((r) => r.stars === s).length,
    pct: Math.round((USER_REVIEWS.filter((r) => r.stars === s).length / USER_REVIEWS.length) * 100),
  }));

  const switchTab = (tab) => {
    if (tab === activeTab) return;
    setTabFading(true);
    setTimeout(() => { setActiveTab(tab); setTabFading(false); }, 160);
  };

  useEffect(() => {
    let heightRatio = window.innerWidth / window.innerHeight;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "+=200%",
          pin: true,
          scrub: true,
          invalidateOnRefresh: true,
        },
      });

      tl.fromTo(
        ".reviews-hero-content",
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.25 }
      )
        .fromTo(
          logoPathRef.current,
          {
            scaleX: 0.16,
            scaleY: () => 0.22 * heightRatio,
            x: 0,
            transformOrigin: "center center",
          },
          {
            scaleX: 18.2,
            scaleY: () => 14.6 * heightRatio,
            x: -0.22,
            transformOrigin: "center center",
            duration: 1,
            ease: "power2.in",
          }
        )
        .to({}, { duration: 0.25 });

      gsap.fromTo(".rv-stat",
        { y: 20, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.55, stagger: 0.08, ease: "power3.out",
          scrollTrigger: { trigger: ".rv-stats-band", start: "top 88%" } }
      );

      gsap.fromTo(".reviews-feedback-card",
        { y: 44, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.75, stagger: 0.13, ease: "power3.out",
          scrollTrigger: { trigger: ".reviews-feedback-grid", start: "top 82%" } }
      );

      gsap.fromTo(".rv-invite-inner",
        { y: 50, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.9, ease: "power3.out",
          scrollTrigger: { trigger: ".reviews-invite", start: "top 80%" } }
      );
    });

    const handleResize = () => {
      heightRatio = window.innerWidth / window.innerHeight;
      ScrollTrigger.refresh();
    };
    window.addEventListener("resize", handleResize);
    return () => { window.removeEventListener("resize", handleResize); ctx.revert(); };
  }, []);

  return (
    <>
      <Header />
      <div className="reviews-page" data-theme={isDark ? "dark" : "light"}>

        {/* ══ HERO ══ */}
        <section className="reviews-hero-section" ref={sectionRef}>
          <div className="reviews-hero-container">
            <svg className="reviews-hero-bg-svg" viewBox="0 0 1200 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="reviewsSwirlGradient" cx="50%" cy="50%" r="80%">
                  <stop offset="0%"   stopColor="#ff5a16" />
                  <stop offset="55%"  stopColor="#fc4a00" />
                  <stop offset="100%" stopColor="#ab3200" />
                </radialGradient>
                <filter id="reviewsSwirl" x="0" y="0">
                  <feTurbulence type="turbulence" baseFrequency="0.012 0.018" numOctaves="2" seed="8" result="turb" />
                  <feDisplacementMap in2="turb" in="SourceGraphic" scale="120" xChannelSelector="R" yChannelSelector="G" />
                </filter>
              </defs>
              <circle cx="600" cy="450" r="800" fill="url(#reviewsSwirlGradient)" filter="url(#reviewsSwirl)" />
            </svg>

            <div className="reviews-hero-content">
              <p className="reviews-hero-kicker">What people say</p>
              <h1>REVIEWS</h1>
              <p>Early impressions from users exploring gyms, amenities, and fitness options with Exersearch.</p>
            </div>
          </div>
        </section>

        <svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" className="reviews-clip-container">
          <clipPath id="reviews-clip-path" clipPathUnits="objectBoundingBox">
            <path ref={logoPathRef} d="M0.028212 0.199409L0.000000 0.033593L0.105609 0.033593L0.080112 0.199409L0.080112 0.497447Q0.080112 0.591776 0.082291 0.657081Q0.084430 0.722386 0.088748 0.763504Q0.093066 0.804354 0.099605 0.822360Q0.106144 0.840365 0.114863 0.840365Q0.120168 0.840365 0.124815 0.834991Q0.129421 0.829347 0.133287 0.814835Q0.137152 0.800591 0.140114 0.775598Q0.143075 0.750605 0.145131 0.712443Q0.147187 0.674550 0.148297 0.621338Q0.149408 0.568127 0.149408 0.497447L0.149408 0.200215L0.127529 0.033593L0.203529 0.033593L0.177825 0.200215L0.177825 0.536684Q0.177825 0.629132 0.175522 0.699812Q0.173178 0.770223 0.168860 0.821822Q0.164542 0.873421 0.158332 0.907283Q0.152122 0.941414 0.144267 0.962107Q0.136453 0.982800 0.127200 0.991400Q0.117988 1.000000 0.107542 1.000000Q0.085664 1.000000 0.070489 0.970975Q0.055313 0.942220 0.045937 0.884171Q0.036560 0.826122 0.032366 0.739049Q0.028212 0.652244 0.028212 0.536684L0.028212 0.199409ZM0.220801 0.653588Q0.230507 0.695512 0.241281 0.731792Q0.252015 0.768342 0.263489 0.795216Q0.275004 0.822091 0.287095 0.837409Q0.299186 0.852996 0.311770 0.852996Q0.316582 0.852996 0.321023 0.848965Q0.325506 0.845203 0.328878 0.836334Q0.332250 0.827466 0.334307 0.812685Q0.336363 0.797904 0.336363 0.776942Q0.336363 0.757861 0.334636 0.738511Q0.332949 0.719161 0.328056 0.701424Q0.323203 0.683687 0.314443 0.668369Q0.305725 0.652781 0.291783 0.640957Q0.273112 0.625369 0.259335 0.600376Q0.245600 0.575383 0.236552 0.536684Q0.227505 0.497984 0.223104 0.443429Q0.218663 0.389143 0.218663 0.314163Q0.218663 0.242677 0.223639 0.185972Q0.228615 0.129266 0.237950 0.089761Q0.247286 0.050524 0.260651 0.029562Q0.274017 0.008600 0.290755 0.008600Q0.297705 0.008600 0.304738 0.013437Q0.311770 0.018275 0.318597 0.026874Q0.325424 0.035474 0.331921 0.047030Q0.338460 0.058318 0.344177 0.070949L0.363876 0.000000L0.377611 0.000000L0.377611 0.314969Q0.366878 0.273582 0.355980 0.242139Q0.345081 0.210696 0.334389 0.189196Q0.323696 0.167966 0.313497 0.157216Q0.303298 0.146197 0.294086 0.146197Q0.288041 0.146197 0.283188 0.152110Q0.278335 0.158022 0.274963 0.167966Q0.271591 0.177909 0.269781 0.191346Q0.267972 0.204784 0.267972 0.219833Q0.267972 0.241333 0.269781 0.258801Q0.271591 0.276270 0.276814 0.291320Q0.282037 0.306369 0.291454 0.320613Q0.300913 0.334587 0.316170 0.350981Q0.326328 0.362268 0.335540 0.374630Q0.344794 0.386993 0.352731 0.404461Q0.360668 0.421930 0.367042 0.446117Q0.373417 0.470572 0.377899 0.504434Q0.382423 0.538565 0.384891 0.584520Q0.387358 0.630476 0.387358 0.691481Q0.387358 0.772910 0.381313 0.831228Q0.375308 0.889814 0.365068 0.927170Q0.354828 0.964526 0.341216 0.982263Q0.327603 1.000000 0.312551 1.000000Q0.298487 1.000000 0.284134 0.980650Q0.269781 0.961301 0.256621 0.918033L0.240582 0.983606L0.220801 0.983606L0.220801 0.653588ZM0.428936 0.807579L0.428936 0.200215L0.400724 0.033593L0.583155 0.033593L0.581140 0.358774L0.541084 0.183822L0.481823 0.183822L0.481823 0.400967L0.542277 0.400967L0.542277 0.545283L0.481823 0.545283L0.481823 0.823972L0.541084 0.823972L0.582127 0.664069L0.582127 0.974469L0.400724 0.974469L0.428936 0.807579ZM0.629914 0.807579L0.629914 0.200215L0.598824 0.033593Q0.608241 0.032787 0.618399 0.032249Q0.628516 0.031443 0.638551 0.031174Q0.648585 0.030906 0.658126 0.030099Q0.667667 0.029562 0.676057 0.029293Q0.684446 0.028756 0.691273 0.028756Q0.698100 0.028756 0.702624 0.028756Q0.712165 0.028756 0.722611 0.031443Q0.733056 0.034131 0.743132 0.042999Q0.753208 0.051868 0.762296 0.069336Q0.771385 0.086536 0.778294 0.115829Q0.785162 0.145122 0.789233 0.187853Q0.793305 0.230852 0.793305 0.291320Q0.793305 0.337275 0.790796 0.374093Q0.788246 0.410642 0.783599 0.439667Q0.778911 0.468422 0.772290 0.490191Q0.765669 0.511690 0.757526 0.527546Q0.763859 0.533459 0.769452 0.555496Q0.775004 0.577264 0.779117 0.610857Q0.783229 0.644182 0.785614 0.688256Q0.787959 0.732330 0.787959 0.782854L0.787959 0.820747L0.816170 0.974469L0.717388 0.974469L0.732645 0.834453L0.732645 0.753830Q0.732645 0.719699 0.731124 0.691212Q0.729643 0.662725 0.727011 0.642032Q0.724420 0.621338 0.720966 0.609782Q0.717470 0.598495 0.713686 0.598495L0.682843 0.598495L0.682843 0.807579L0.701020 0.974469L0.598700 0.974469L0.629914 0.807579M0.697483 0.469766Q0.708052 0.469766 0.715866 0.463854Q0.723721 0.457941 0.728862 0.441548Q0.734043 0.425154 0.736552 0.396399Q0.739061 0.367374 0.739061 0.322225Q0.739061 0.287288 0.737251 0.262564Q0.735442 0.237571 0.732357 0.220908Q0.729232 0.203977 0.725078 0.193765Q0.720883 0.183822 0.716277 0.178715Q0.711671 0.173878 0.706860 0.172266Q0.702007 0.170653 0.697483 0.170653L0.682843 0.170653L0.682843 0.469766L0.697483 0.469766ZM0.833443 0.653588Q0.843190 0.695512 0.853923 0.731792Q0.864657 0.768342 0.876172 0.795216Q0.887646 0.822091 0.899778 0.837409Q0.911869 0.852996 0.924412 0.852996Q0.929224 0.852996 0.933706 0.848965Q0.938189 0.845203 0.941520 0.836334Q0.944892 0.827466 0.946948 0.812685Q0.949005 0.797904 0.949005 0.776942Q0.949005 0.757861 0.947319 0.738511Q0.945591 0.719161 0.940739 0.701424Q0.935845 0.683687 0.927126 0.668369Q0.918408 0.652781 0.904425 0.640957Q0.885754 0.625369 0.872018 0.600376Q0.858241 0.575383 0.849194 0.536684Q0.840188 0.497984 0.835746 0.443429Q0.831346 0.389143 0.831346 0.314163Q0.831346 0.242677 0.836322 0.185972Q0.841298 0.129266 0.850633 0.089761Q0.859969 0.050524 0.873293 0.029562Q0.886659 0.008600 0.903438 0.008600Q0.910347 0.008600 0.917379 0.013437Q0.924412 0.018275 0.931239 0.026874Q0.938065 0.035474 0.944604 0.047030Q0.951102 0.058318 0.956860 0.070949L0.976518 0.000000L0.990294 0.000000L0.990294 0.314969Q0.979520 0.273582 0.968621 0.242139Q0.957764 0.210696 0.947072 0.189196Q0.936379 0.167966 0.926180 0.157216Q0.915981 0.146197 0.906728 0.146197Q0.900724 0.146197 0.895830 0.152110Q0.890977 0.158022 0.887605 0.167966Q0.884233 0.177909 0.882464 0.191346Q0.880655 0.204784 0.880655 0.219833Q0.880655 0.241333 0.882464 0.258801Q0.884233 0.276270 0.889455 0.291320Q0.894678 0.306369 0.904137 0.320613Q0.913555 0.334587 0.928812 0.350981Q0.938970 0.362268 0.948223 0.374630Q0.957435 0.386993 0.965373 0.404461Q0.973310 0.421930 0.979684 0.446117Q0.986059 0.470572 0.990582 0.504434Q0.995106 0.538565 0.997574 0.584520Q1.000000 0.630476 1.000000 0.691481Q1.000000 0.772910 0.993996 0.831228Q0.987950 0.889814 0.977710 0.927170Q0.967470 0.964526 0.953899 0.982263Q0.940286 1.000000 0.925234 1.000000Q0.911170 1.000000 0.896817 0.980650Q0.882464 0.961301 0.869304 0.918033L0.853224 0.983606L0.833443 0.983606L0.833443 0.653588Z" />
          </clipPath>
        </svg>

        {/* ══ STATS BAND ══ */}
        <div className="rv-stats-band">
          <div className="reviews-wrap rv-stats-row">
            {[["3","Early testers"],["100%","Free to use"],["50+","Partner gyms"],["Growing","Community"]].map(([v,l],i) => (
              <div key={i} className="rv-stat">
                <span className="rv-stat__v">{v}</span>
                <span className="rv-stat__l">{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ══ EARLY FEEDBACK ══ */}
        <section className="reviews-feedback">
          <div className="reviews-wrap">
            <div className="reviews-section-head">
              <p className="reviews-section-eyebrow">
                <MessageSquareQuote size={13} /> Early Feedback
              </p>
              <h2 className="reviews-section-title">
                First impressions from <span>Our First Users</span>
              </h2>
              <p className="reviews-section-sub">
                We are just getting started, but a few early users have already shared their
                thoughts about browsing gyms on Exersearch.
              </p>
            </div>

            <div className="reviews-feedback-grid">
              {FEEDBACK.map((fb, i) => (
                <TiltCard key={i} className="reviews-feedback-card" style={{ "--ci": i }}>
                  <div className="rv-card-top">
                    <span className="rv-tag">{fb.tag}</span>
                    <StarRow n={fb.stars} />
                  </div>
                  <MessageSquareQuote size={64} className="rv-card-bg-icon" strokeWidth={1} />
                  <p className="reviews-feedback-quote">"{fb.quote}"</p>
                  <span className="reviews-feedback-author">— {fb.author}</span>
                </TiltCard>
              ))}
            </div>
          </div>
        </section>

        {/* ══ USER REVIEWS ══ */}
        <section className="rv-reviews-section">
          <div className="reviews-wrap">
            <div className="rv-reviews-hdr">
              <div>
                <p className="reviews-section-eyebrow"><Star size={13} /> Gym Reviews</p>
                <h2 className="reviews-section-title">What Members Are <span>Saying</span></h2>
              </div>
            </div>

            <div className="rv-reviews-layout">
              <aside className="rv-reviews-sidebar">
                <div className="rv-score-box">
                  <span className="rv-score-box__num">{avgRating}</span>
                  <StarRow n={Math.round(parseFloat(avgRating))} size={16} />
                  <span className="rv-score-box__total">{USER_REVIEWS.length} reviews</span>
                </div>

                <div className="rv-breakdown">
                  {breakdown.map(({ star, count, pct }) => (
                    <button
                      key={star}
                      className={`rv-breakdown__row ${starFilter === star ? "rv-breakdown__row--on" : ""}`}
                      onClick={() => setStarFilter(starFilter === star ? 0 : star)}
                    >
                      <span className="rv-breakdown__lbl">{star} ★</span>
                      <div className="rv-breakdown__bar">
                        <div className="rv-breakdown__fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="rv-breakdown__count">{count}</span>
                    </button>
                  ))}
                </div>

                <div className="rv-sort">
                  <div className="rv-sort__label"><Filter size={12} /> Sort by</div>
                  <div className="rv-sort__btns">
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        className={`rv-sort__btn ${sortBy === opt ? "rv-sort__btn--on" : ""}`}
                        onClick={() => setSortBy(opt)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {starFilter !== 0 && (
                  <button className="rv-clear-filter" onClick={() => setStarFilter(0)}>
                    Clear filter ×
                  </button>
                )}
              </aside>

              <div className="rv-reviews-list">
                {filteredReviews.length === 0 ? (
                  <div className="rv-empty">No reviews match this filter.</div>
                ) : (
                  filteredReviews.map((r) => <ReviewCard key={r.id} review={r} />)
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ══ HIGHLIGHTS ══ */}
        <section className="reviews-highlights">
          <div className="reviews-wrap">
            <div className="reviews-section-head reviews-section-head--center">
              <p className="reviews-section-eyebrow reviews-section-eyebrow--accent">
                <Star size={13} /> What Reviews Cover
              </p>
              <h2 className="reviews-section-title reviews-section-title--themed">
                What Makes a <span>Great Gym Review</span>
              </h2>
              <p className="reviews-section-sub reviews-section-sub--themed">
                As more members share their experiences, reviews will help people decide
                faster and with more confidence.
              </p>
            </div>

            <div className="rv-tabs" role="tablist">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={activeTab === tab}
                  className={`rv-tab ${activeTab === tab ? "rv-tab--on" : ""}`}
                  onClick={() => switchTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className={`reviews-highlights-grid ${tabFading ? "rv-grid--fade" : ""}`}>
              {HIGHLIGHTS[activeTab].map((item, i) => {
                const Icon = item.icon;
                return (
                  <article key={`${activeTab}-${i}`} className="reviews-highlights-card" style={{ "--hi": i }}>
                    <div className="reviews-highlights-icon"><Icon size={20} /></div>
                    <div className="reviews-highlights-copy">
                      <h3>{item.title}</h3>
                      <p>{item.desc}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ══ INVITE / CTA ══ */}
        <section className="reviews-invite">
          <div className="reviews-wrap">
            <div className="rv-invite-inner">
              <div className="rv-invite-glow" />
              <div className="rv-invite-noise" />
              <div className="reviews-invite-copy">
                <p className="reviews-section-eyebrow">
                  <Sparkles size={13} /> Be One of the First
                </p>
                <h2 className="rv-invite-title">
                  Be one of the first<br />to <em>review gyms.</em>
                </h2>
                <p className="reviews-section-sub reviews-section-sub--tight">
                  Exersearch is just getting started. As our community grows, real member
                  reviews will appear here — covering cleanliness, equipment quality, staff
                  friendliness, and the overall experience.
                </p>
              </div>
              <div className="reviews-invite-actions">
                <a href="/login" className="reviews-invite-btn">
                  <span>Explore Gyms Near You</span>
                  <ArrowRight size={15} />
                </a>
              </div>
            </div>
          </div>
        </section>

      </div>
      <Footer />
      <ScrollThemeWidget/>
    </>
  );
}