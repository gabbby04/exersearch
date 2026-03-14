import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "./Header2";
import "./OwnerHome.css";

import {
  Plus,
  Eye,
  Users,
  Star,
  MapPin,
  TrendingUp,
  TrendingDown,
  Crown,
  Settings,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Calendar,
  MessageSquare,
  Zap,
  Mail,
  Shield,
  Activity,
  ChevronDown,
  ExternalLink,
  Flame,
  Award,
} from "lucide-react";

import {
  getMe,
  getAllMyGyms,
  getGymAnalytics,
  getOwnerActivities,
  getOwnerHomeCards,
  getFitnessNews,
  getFitnessTrends,
  getFitnessDiscussions,
} from "../../utils/ownerDashboardApi";
import { api } from "../../utils/apiClient";

const DEFAULT_GYM_IMAGE =
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80";

function safeArr(v) {
  if (Array.isArray(v)) return v;
  if (v && Array.isArray(v.data)) return v.data;
  return [];
}

function firstName(name) {
  const s = String(name || "").trim();
  return s ? s.split(" ")[0] : "Owner";
}

function normalizeStatus(s) {
  return String(s || "active").toLowerCase();
}

function areaLabelFromGym(gym) {
  const s = `${gym.location || ""} ${gym.address || ""} ${gym.city || ""} ${gym.province || ""}`.toLowerCase();
  if (s.includes("pasig")) return "Pasig";
  if (s.includes("manila")) return "Manila";
  if (s.includes("quezon")) return "Quezon City";
  return "your area";
}

function resolveImageUrl(v) {
  if (!v) return DEFAULT_GYM_IMAGE;
  const s0 = String(v).trim();
  if (!s0) return DEFAULT_GYM_IMAGE;
  if (/^https?:\/\//i.test(s0)) return s0;
  const rawBase = String(api?.defaults?.baseURL || "").replace(/\/+$/, "");
  const originBase = rawBase.replace(/\/api\/v1$/i, "");
  const s = s0.replace(/^\/+/, "");
  const out = `${originBase}/${s}`;
  return out.replace(/([^:]\/)\/+/g, "$1");
}

function mapGym(g) {
  const id = g.gym_id ?? g.id;
  const name = g.name ?? g.gym_name ?? "My Gym";
  const location =
    g.location ??
    g.address ??
    [g.barangay, g.city, g.province].filter(Boolean).join(", ") ??
    "—";
  const rawImage =
    g.main_image_url ?? g.image_url ?? g.cover_photo ?? g.photo_url ?? null;
  const image = resolveImageUrl(rawImage);
  const status = normalizeStatus(g.status);
  const verified = Boolean(g.verified ?? g.is_verified ?? true);
  return { id, name, location, image, status, verified, raw: g };
}

function timeAgoLike(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function eventToText(ev, gymName) {
  if (ev === "view") return `Someone viewed ${gymName}`;
  if (ev === "click") return `Someone clicked ${gymName}`;
  if (ev === "save") return `Someone saved ${gymName}`;
  if (ev === "review") return `New review on ${gymName}`;
  if (ev === "inquiry") return `New inquiry for ${gymName}`;
  return `${ev} on ${gymName}`;
}

function eventToIcon(ev) {
  if (ev === "view") return Eye;
  if (ev === "click") return Zap;
  if (ev === "save") return Star;
  if (ev === "review") return Star;
  if (ev === "inquiry") return MessageSquare;
  return Activity;
}
function stripHtml(str) {
  return String(str || "").replace(/<[^>]*>/g, "");
}
function computeGymAlerts({ analytics }) {
  const backendAlerts = safeArr(analytics?.alerts);
  if (backendAlerts.length) {
    return backendAlerts
      .map((a) => ({
        text: a.text ?? a.message ?? "Needs attention",
        priority: (a.priority ?? "low").toLowerCase(),
        count: Number(a.count ?? 0),
        type: a.type ?? "info",
      }))
      .slice(0, 2);
  }
  const viewsChange = Number(analytics?.views_change ?? analytics?.totals?.views?.change ?? 0);
  const views = Number(analytics?.total_views ?? analytics?.views ?? analytics?.totals?.views?.total ?? 0);
  const inquiries = Number(analytics?.total_inquiries ?? analytics?.inquiries ?? analytics?.totals?.inquiries?.total ?? 0);
  const alerts = [];
  if (viewsChange < -10) alerts.push({ text: "Views dropped this week", priority: "high", count: 0, type: "views" });
  if (views < 100) {
    alerts.push({ text: "Add more photos", priority: "low", count: 0, type: "photo" });
  } else if (inquiries < 3) {
    alerts.push({ text: "Low inquiries — add clearer info", priority: "medium", count: 0, type: "inquiries" });
  }
  return alerts.slice(0, 2);
}

function pickAnalyticsMetrics(a) {
  const n = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
  const flat = {
    total_views: n(a?.total_views ?? a?.views),
    total_saves: n(a?.total_saves ?? a?.saves),
    total_inquiries: n(a?.total_inquiries ?? a?.inquiries),
    views_change: n(a?.views_change),
    saves_change: n(a?.saves_change),
    inquiries_change: n(a?.inquiries_change),
    members: n(a?.members),
    members_change: n(a?.members_change),
    rating: n(a?.rating),
    rating_change: n(a?.rating_change),
  };
  const totals = a?.totals ?? null;
  if (totals) {
    return {
      total_views: n(totals?.views?.total),
      total_saves: n(totals?.saves?.total),
      total_inquiries: n(totals?.inquiries?.total),
      views_change: n(totals?.views?.change),
      saves_change: n(totals?.saves?.change),
      inquiries_change: n(totals?.inquiries?.change),
      members: n(totals?.active_members?.current),
      members_change: n(totals?.active_members?.change),
      rating: n(totals?.ratings?.verified_avg),
      rating_change: n(a?.rating_change ?? 0),
    };
  }
  return flat;
}

function clipText(s, n = 90) {
  const t = String(s || "");
  if (t.length <= n) return t;
  return `${t.slice(0, n)}…`;
}
function FiNewsCard({ article }) {
  const [imgOk, setImgOk] = useState(true);
  if (!article.image || !imgOk) return null;
  return (
    <a href={article.url} target="_blank" rel="noreferrer" className="fi-nc">
      <div className="fi-nc__img">
        <img
          src={article.image}
          alt={article.title}
          loading="lazy"
          onError={() => setImgOk(false)}
        />
        <div className="fi-nc__overlay" />
        <span className="fi-nc__source">{article.source}</span>
        {article.published_at && (
          <span className="fi-nc__date">
            {new Date(article.published_at).toLocaleDateString("en-PH", {
              month: "short", day: "numeric",
            })}
          </span>
        )}
      </div>
      <div className="fi-nc__body">
        <p className="fi-nc__title">{stripHtml(article.title)}</p>
        <ExternalLink size={12} className="fi-nc__ext" />
      </div>
    </a>
  );
}

export default function OwnerHome() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [me, setMe] = useState(null);
  const [gyms, setGyms] = useState([]);
  const [selectedGymId, setSelectedGymId] = useState(null);

  const [analyticsByGym, setAnalyticsByGym] = useState({});
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  const [gymsOpen, setGymsOpen] = useState(true);
  const [activityOpen, setActivityOpen] = useState(true);

  const [showAllGyms, setShowAllGyms] = useState(false);
  const [showAllActivities, setShowAllActivities] = useState(false);

  const [brokenGymImages, setBrokenGymImages] = useState({});

  const [cards, setCards] = useState({
    latest_inquiries: [],
    latest_reviews: [],
    upcoming_renewals: [],
    recent_signups: [],
    meta: null,
  });
  const [cardsLoading, setCardsLoading] = useState(false);

  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);

  const [trends, setTrends] = useState([]);
  const [trendsLoading, setTrendsLoading] = useState(false);

  const [discussions, setDiscussions] = useState([]);
  const [discussionsLoading, setDiscussionsLoading] = useState(false);

  const role = (me?.role ?? "").toLowerCase();
  const canUseOwner = role === "owner" || role === "superadmin";
  const isAdminOrSuper = role === "admin" || role === "superadmin";

  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        setLoading(true);
        setErr("");

        const meRes = await getMe();
        const user = meRes.user ?? meRes;
        if (!alive) return;

        const r = (user?.role ?? "").toLowerCase();
        if (r !== "owner" && r !== "superadmin") {
          navigate("/home", { replace: true });
          return;
        }

        setMe({
          name: user?.name ?? "Owner",
          email: user?.email ?? "—",
          role: r,
          verified: Boolean(user?.email_verified_at ?? true),
          member_since: user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—",
        });

        const gymsRes = await getAllMyGyms();
        const list = safeArr(gymsRes).map(mapGym);
        if (!alive) return;

        setGyms(list);
        setSelectedGymId(list[0]?.id ?? null);
        setGymsOpen(true);
        setShowAllGyms(false);
        setBrokenGymImages({});

        if (list.length) {
          setAnalyticsLoading(true);
          const pairs = await Promise.all(
            list.map(async (g) => {
              try {
                const a = await getGymAnalytics(g.id);
                return [String(g.id), a];
              } catch {
                return [String(g.id), null];
              }
            })
          );
          if (!alive) return;
          const map = {};
          for (const [id, a] of pairs) map[id] = a;
          setAnalyticsByGym(map);
        }

        setActivitiesLoading(true);
        try {
          const actRes = await getOwnerActivities();
          if (!alive) return;
          setActivities(safeArr(actRes));
          setActivityOpen(true);
          setShowAllActivities(false);
        } catch {
          if (!alive) return;
          setActivities([]);
          setActivityOpen(false);
        } finally {
          if (alive) setActivitiesLoading(false);
        }

        setCardsLoading(true);
        try {
          const cardsRes = await getOwnerHomeCards({ days: 3 });
          if (!alive) return;
          setCards({
            latest_inquiries: safeArr(cardsRes?.latest_inquiries),
            latest_reviews: safeArr(cardsRes?.latest_reviews),
            upcoming_renewals: safeArr(cardsRes?.upcoming_renewals),
            recent_signups: safeArr(cardsRes?.recent_signups),
            meta: cardsRes?.meta ?? null,
          });
        } catch {
          if (!alive) return;
          setCards({ latest_inquiries: [], latest_reviews: [], upcoming_renewals: [], recent_signups: [], meta: null });
        } finally {
          if (alive) setCardsLoading(false);
        }

        // ── NEWS ──
        setNewsLoading(true);
        try {
          const newsRes = await getFitnessNews();
          if (!alive) return;
          setNews(newsRes);
        } catch {
          if (!alive) return;
          setNews([]);  
        } finally {
          if (alive) setNewsLoading(false);
        }
                // ── TRENDS ──
        setTrendsLoading(true);
        try {
          const trendsRes = await getFitnessTrends();
          if (!alive) return;
          setTrends(trendsRes);
        } catch {
          if (!alive) return;
          setTrends([]);
        } finally {
          if (alive) setTrendsLoading(false);
        }

        // ── REDDIT DISCUSSIONS ──
        setDiscussionsLoading(true);
        try {
          const discRes = await getFitnessDiscussions();
          if (!alive) return;
          setDiscussions(discRes);
        } catch {
          if (!alive) return;
          setDiscussions([]);
        } finally {
          if (alive) setDiscussionsLoading(false);
        }
      } catch (e) {
        console.error(e);
        setErr(e?.response?.data?.message || e?.message || "Failed to load owner dashboard.");
      } finally {
        if (alive) setLoading(false);
        if (alive) setAnalyticsLoading(false);
      }
    }

    run();
    return () => { alive = false; };
  }, [navigate]);

  const gymsUi = useMemo(() => {
    return gyms.map((g, idx) => {
      const a = analyticsByGym[String(g.id)] || null;
      const m = pickAnalyticsMetrics(a);
      const rank = Number(a?.rank || g.raw?.rank || idx + 1);
      const totalGyms = Number(a?.total_gyms || g.raw?.total_gyms || Math.max(gyms.length, 1));
      const area = areaLabelFromGym(g);
      const alerts = computeGymAlerts({ analytics: a });
      return {
        ...g,
        stats: {
          members: m.members,
          views: m.total_views,
          rating: m.rating,
          saves: m.total_saves,
          inquiries: m.total_inquiries,
        },
        rank, total_gyms: totalGyms, area, alerts, analytics: a, metrics: m,
      };
    });
  }, [gyms, analyticsByGym]);

  const selectedGymUi = useMemo(() => {
    return gymsUi.find((g) => String(g.id) === String(selectedGymId)) || null;
  }, [gymsUi, selectedGymId]);

  const visibleGyms = useMemo(() => {
    if (showAllGyms) return gymsUi;
    return gymsUi.slice(0, 3);
  }, [gymsUi, showAllGyms]);

  const activityUi = useMemo(() => {
    return safeArr(activities)
      .map((a) => ({
        id: a.id ?? `${a.event}-${a.created_at}-${Math.random()}`,
        event: a.event || a.type || "activity",
        text: a.text || eventToText(a.event, a.gym_name || "your gym"),
        time: a.time || timeAgoLike(a.created_at),
        Icon: eventToIcon(a.event || a.type),
      }))
      .sort((x, y) => (String(y.time) > String(x.time) ? 1 : -1));
  }, [activities]);

  const visibleActivities = useMemo(() => {
    if (showAllActivities) return activityUi;
    return activityUi.slice(0, 5);
  }, [activityUi, showAllActivities]);

  const hero = useMemo(() => {
    const totalViews = gymsUi.reduce((sum, g) => sum + Number(g.stats.views || 0), 0);
    const totalInquiries = gymsUi.reduce((sum, g) => sum + Number(g.stats.inquiries || 0), 0);
    const avgRating = gymsUi.length > 0
      ? gymsUi.reduce((sum, g) => sum + Number(g.stats.rating || 0), 0) / gymsUi.length
      : 0;
    const bestRank = gymsUi.map((g) => Number(g.rank)).filter((x) => Number.isFinite(x) && x > 0);
    const bestRankValue = bestRank.length ? Math.min(...bestRank) : null;
    const totalMembers = gymsUi.reduce((sum, g) => sum + Number(g.stats.members || 0), 0);
    return { totalViews, totalInquiries, avgRating, bestRankValue, totalMembers };
  }, [gymsUi]);

  const selectedA = useMemo(() => {
    return selectedGymUi?.metrics || pickAnalyticsMetrics(null);
  }, [selectedGymUi]);
  const maxTrendScore = useMemo(
  () => Math.max(...trends.map(t => t.trend_score || 0), 1),
  [trends]
);

const currentSeason = useMemo(() => {
  const m = new Date().getMonth() + 1;
  if ([1, 2].includes(m))   return "New Year";
  if ([3, 4, 5].includes(m)) return "Summer";
  if ([6, 7, 8].includes(m)) return "Rainy";
  if ([9, 10].includes(m))  return "Ber Months";
  return "Holiday";
}, []);
  const urgentActions = useMemo(() => {
    const items = [];
    if (me && !me.verified) {
      items.push({ icon: AlertCircle, text: "Verify your email", link: "/owner/profile", priority: "high", count: 1 });
    }
    if (gyms.length === 0) {
      items.push({ icon: Plus, text: "Add your first gym", link: "/owner/gym-application", priority: "high", count: 1 });
    }
    if (selectedGymUi && Number(selectedA.total_views || 0) === 0) {
      items.push({ icon: Star, text: "Add photos to get more views", link: `/owner/view-gym/${selectedGymUi.id}`, priority: "low", count: 0 });
    }
    if (items.length === 0) {
      items.push({ icon: CheckCircle, text: "All good for now", link: "/owner/home", priority: "low", count: 0 });
    }
    return items.slice(0, 3);
  }, [me, gyms.length, selectedGymUi, selectedA]);

  if (loading) {
    return (
      <div className="od-app">
        <Header />
        <div className="od-loading">
          <div className="od-spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="od-app">
        <Header />
        <div className="od-container" style={{ padding: 18 }}>

          
          <div className="od-urgent-section">
            <div className="od-urgent-header">
              <div className="od-urgent-title">
                <AlertCircle size={20} />
                <h3>Could not load dashboard</h3>
              </div>
            </div>
            <div style={{ padding: 14 }}>
              <p style={{ margin: 0 }}>{err}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!canUseOwner) return null;

  return (
    <div className="od-app">
      <Header />

      <div className="od-container">

        {/* ── HERO ── */}
        <div className="od-hero-section">
          <div className="od-hero-background">
            <div className="od-hero-orb od-hero-orb-1"></div>
            <div className="od-hero-orb od-hero-orb-2"></div>
          </div>
          <div className="od-hero-content">
            <div className="od-hero-left">
              <div className="od-hero-greeting">
                <Activity className="od-hero-pulse-icon" size={24} />
                <span>Welcome back, {firstName(me?.name)}</span>
                {role === "superadmin" && (
                  <span className="od-role-pill" style={{ marginLeft: 10, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, padding: "4px 10px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.06)" }}>
                    <Shield size={14} /> superadmin
                  </span>
                )}
              </div>
              <h1 className="od-hero-title">Your Dashboard</h1>
              <p className="od-hero-subtitle">
                Managing {gyms.length} {gyms.length === 1 ? "gym" : "gyms"}
                {hero.totalMembers ? ` • ${hero.totalMembers.toLocaleString()} total members` : ""}
              </p>
            </div>
            <div className="od-hero-quick-stats">
              <div className="od-hero-stat">
                <div className="od-hero-stat-icon views"><Eye size={20} /></div>
                <div className="od-hero-stat-content">
                  <span className="od-hero-stat-label">Total Views</span>
                  <strong className="od-hero-stat-value">{analyticsLoading ? "…" : hero.totalViews.toLocaleString()}</strong>
                </div>
              </div>
              <div className="od-hero-stat">
                <div className="od-hero-stat-icon revenue"><Mail size={20} /></div>
                <div className="od-hero-stat-content">
                  <span className="od-hero-stat-label">Total Inquiries</span>
                  <strong className="od-hero-stat-value">{analyticsLoading ? "…" : hero.totalInquiries.toLocaleString()}</strong>
                </div>
              </div>
              <div className="od-hero-stat">
                <div className="od-hero-stat-icon rating"><Star size={20} /></div>
                <div className="od-hero-stat-content">
                  <span className="od-hero-stat-label">Avg Rating</span>
                  <strong className="od-hero-stat-value">{hero.avgRating ? hero.avgRating.toFixed(1) : "—"}</strong>
                </div>
              </div>
              <div className="od-hero-stat">
                <div className="od-hero-stat-icon rank"><Award size={20} /></div>
                <div className="od-hero-stat-content">
                  <span className="od-hero-stat-label">Best Rank</span>
                  <strong className="od-hero-stat-value">{hero.bestRankValue ? `#${hero.bestRankValue}` : "—"}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

{/* ══════════════════════════════════════════════════════
    FITNESS INTELLIGENCE — paste in place of the 3 old sections
══════════════════════════════════════════════════════ */}
<section className="fi-wrap">

  {/* ── header ── */}
  <div className="fi-header">
    <div className="fi-header__left">
      <h2 className="fi-header__title">
        <TrendingUp size={20} />
        PH Fitness &amp; Wellness Hub
      </h2>
      <span className="fi-live-pill">
        <span className="fi-live-dot" />
        Live
      </span>
    </div>
    <p className="fi-header__sub">News · Trends · Community — all in one place</p>
  </div>

  {/* ── ROW 1: NEWS full width landscape ── */}
  <div className="fi-news-panel">
    <div className="fi-col__head">
      <span className="fi-col__label fi-col__label--news">
        <TrendingUp size={14} />
        Latest News
      </span>
    </div>

    {newsLoading ? (
      <div className="fi-news-grid">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="fi-nc fi-nc--skel">
            <div className="fi-nc__img fi-nc__img--skel" />
            <div className="fi-nc__body">
              <div className="fi-skel-line" style={{ width: "80%" }} />
              <div className="fi-skel-line" style={{ width: "50%", marginTop: 5 }} />
            </div>
          </div>
        ))}
      </div>
    ) : news.filter(a => Boolean(a.image)).length === 0 ? (
      <p className="fi-empty">No news available right now.</p>
    ) : (
      <div className="fi-news-grid">
        {news
          .filter(a => Boolean(a.image))
          .slice(0, 15)
          .map((article, i) => (
            <FiNewsCard key={i} article={article} />
          ))}
      </div>
    )}
  </div>

  {/* ── ROW 2: TRENDS left | DISCUSSIONS right ── */}
  <div className="fi-bottom-row">

    {/* TRENDS */}
    <div className="fi-col">
      <div className="fi-col__head">
        <span className="fi-col__label fi-col__label--trends">
          <Flame size={14} />
          Trending in PH
        </span>
        <span className="fi-season-tag">{currentSeason}</span>
      </div>

      {trendsLoading ? (
        <div className="fi-trends-list">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="fi-tr fi-tr--skel">
              <div className="fi-skel-line" style={{ width: "100%", height: 13 }} />
            </div>
          ))}
        </div>
      ) : trends.length === 0 ? (
        <p className="fi-empty">No trends right now.</p>
      ) : (
        <div className="fi-trends-list">
          {trends.map((t, i) => (
            <div key={i} className="fi-tr">
              <span className="fi-tr__rank">#{i + 1}</span>
              <div className="fi-tr__mid">
                <span className="fi-tr__kw">{t.keyword}</span>
                <div className="fi-tr__track">
                  <div
                    className="fi-tr__bar"
                    style={{
                      width: `${maxTrendScore > 0
                        ? Math.round((t.trend_score / maxTrendScore) * 100)
                        : 0}%`
                    }}
                  />
                </div>
              </div>
              <span className="fi-tr__score">{t.trend_score}</span>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* DISCUSSIONS */}
    <div className="fi-col">
      <div className="fi-col__head">
        <span className="fi-col__label fi-col__label--disc">
          <MessageSquare size={14} />
          Community Buzz
        </span>
        <span className="fi-reddit-tag">Reddit</span>
      </div>

      {discussionsLoading ? (
        <div className="fi-disc-list">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} style={{ padding: "0.75rem 1.35rem" }}>
              <div className="fi-skel-line" style={{ width: "100%", height: 13 }} />
              <div className="fi-skel-line" style={{ width: "55%", height: 9, marginTop: 5 }} />
            </div>
          ))}
        </div>
      ) : discussions.length === 0 ? (
        <p className="fi-empty">No discussions right now.</p>
      ) : (
        <div className="fi-disc-list">
          {discussions.map((p, i) => (
            <a key={i} href={p.url} target="_blank" rel="noreferrer" className="fi-dr">
              <span className="fi-dr__num">{String(i + 1).padStart(2, "0")}</span>
              <div className="fi-dr__body">
                <p className="fi-dr__title">{p.title}</p>
                <div className="fi-dr__meta">
                  <span className="fi-dr__sub">{p.subreddit ?? "r/Fitness"}</span>
                  {p.flair && <span className="fi-dr__flair">{p.flair}</span>}
                  <span className="fi-dr__votes">&#9650; {p.upvotes?.toLocaleString()}</span>
                  {p.comments != null && (
                    <span className="fi-dr__cmts">
                      <MessageSquare size={10} /> {p.comments}
                    </span>
                  )}
                </div>
              </div>
              <ExternalLink size={13} className="fi-dr__ext" />
            </a>
          ))}
        </div>
      )}
    </div>

  </div>
</section>
        {/* ── URGENT ACTIONS ── */}
        <div className="od-urgent-section">
          <div className="od-urgent-header">
            <div className="od-urgent-title">
              <AlertCircle size={20} />
              <h3>Needs Your Attention</h3>
            </div>
          </div>
          <div className="od-urgent-grid">
            {urgentActions.map((action, i) => {
              const Icon = action.icon;
              return (
                <Link key={i} to={action.link} className={`od-urgent-card ${action.priority}`}>
                  <div className="od-urgent-icon"><Icon size={20} /></div>
                  <div className="od-urgent-content">
                    <p>{action.text}</p>
                    {action.count > 0 && <span className="od-urgent-count">{action.count}</span>}
                  </div>
                  <ChevronRight size={18} className="od-urgent-arrow" />
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── MAIN GRID ── */}
        <div className="od-main-grid">

          {/* LEFT COLUMN */}
          <div className="od-left-column">

            {/* Gyms */}
            <div className="od-gyms-section">
              <div className="od-section-header od-collapsible-header" role="button" tabIndex={0} onClick={() => setGymsOpen((v) => !v)}>
                <h2>
                  Your Gyms ({gyms.length})
                  <span className={`od-collapse-icon ${gymsOpen ? "open" : ""}`}><ChevronDown size={18} /></span>
                </h2>
                <div onClick={(e) => e.stopPropagation()}>
                  <Link to="/owner/gym-application" className="od-add-btn">
                    <Plus size={18} /> Add Gym
                  </Link>
                </div>
              </div>
              <div className={`od-collapse-body ${gymsOpen ? "open" : ""}`}>
                <div className="od-gyms-list">
                  {visibleGyms.map((gym) => {
                    const showStatusBadge = gym.status && gym.status !== "approved";
                    return (
                      <div key={gym.id} className={`od-gym-card ${String(selectedGymId) === String(gym.id) ? "selected" : ""}`} onClick={() => setSelectedGymId(gym.id)}>
                        <div className="od-gym-image">
                          <img
                            src={brokenGymImages[gym.id] ? DEFAULT_GYM_IMAGE : gym.image}
                            alt={gym.name}
                            loading="lazy"
                            onError={() => setBrokenGymImages((prev) => prev[gym.id] ? prev : { ...prev, [gym.id]: true })}
                          />
                          {showStatusBadge && (
                            <div className={`od-gym-status ${gym.status}`}>
                              {gym.status === "active" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                              {gym.status}
                            </div>
                          )}
                        </div>
                        <div className="od-gym-info">
                          <div className="od-gym-header">
                            <h3>{gym.name}</h3>
                            {gym.verified && <div className="od-verified"><CheckCircle size={14} /></div>}
                          </div>
                          <div className="od-gym-location">
                            <MapPin size={14} /><span>{gym.location}</span>
                          </div>
                          {gym.status === "active" && (
                            <>
                              <div className="od-gym-quick-stats">
                                {gym.stats.members > 0 && <div className="od-quick-stat"><Users size={14} /><span>{gym.stats.members}</span></div>}
                                <div className="od-quick-stat"><Eye size={14} /><span>{analyticsLoading ? "…" : gym.stats.views}</span></div>
                                {gym.stats.rating > 0 && <div className="od-quick-stat"><Star size={14} /><span>{gym.stats.rating}</span></div>}
                                <div className="od-quick-stat"><Mail size={14} /><span>{analyticsLoading ? "…" : gym.stats.inquiries}</span></div>
                              </div>
                              <div className="od-gym-rank">
                                <Crown size={14} />
                                <span>Rank #{gym.rank} of {gym.total_gyms} in {gym.area}</span>
                              </div>
                            </>
                          )}
                          {gym.alerts?.length > 0 && (
                            <div className="od-gym-alerts">
                              {gym.alerts.slice(0, 2).map((alert, i) => (
                                <div key={i} className={`od-gym-alert ${alert.priority || "low"}`}>
                                  <AlertCircle size={12} /><span>{alert.text}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <Link to={`/owner/view-gym/${gym.id}`} className="od-gym-action" onClick={(e) => e.stopPropagation()}>
                          <ChevronRight size={20} />
                        </Link>
                      </div>
                    );
                  })}
                  {gyms.length === 0 && <div style={{ padding: 14, opacity: 0.8 }}>No gyms found yet. Click <b>Add Gym</b>.</div>}
                </div>
                {gymsUi.length > 3 && (
                  <div className="od-showmore-row">
                    <button type="button" className="od-showmore-btn" onClick={() => setShowAllGyms((v) => !v)}>
                      {showAllGyms ? "Show less" : `Show more (${gymsUi.length - 3})`}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Activity */}
            <div className="od-activity-section">
              <div className="od-section-header od-collapsible-header" role="button" tabIndex={0} onClick={() => setActivityOpen((v) => !v)}>
                <h2>
                  <Activity size={20} /> Recent Activity
                  <span className={`od-collapse-icon ${activityOpen ? "open" : ""}`}><ChevronDown size={18} /></span>
                </h2>
              </div>
              <div className={`od-collapse-body ${activityOpen ? "open" : ""}`}>
                <div className="od-activity-feed">
                  {activitiesLoading && <div style={{ padding: 14, opacity: 0.75 }}>Loading activity…</div>}
                  {!activitiesLoading && activityUi.length === 0 && <div style={{ padding: 14, opacity: 0.75 }}>No activity yet.</div>}
                  {!activitiesLoading && visibleActivities.map((a) => (
                    <div key={a.id} className="od-activity-item">
                      <div className={`od-activity-icon ${a.event}`}><a.Icon size={16} /></div>
                      <div className="od-activity-text"><p>{a.text}</p><span>{a.time}</span></div>
                    </div>
                  ))}
                </div>
                {activityUi.length > 5 && (
                  <div className="od-showmore-row">
                    <button type="button" className="od-showmore-btn" onClick={() => setShowAllActivities((v) => !v)}>
                      {showAllActivities ? "Show less" : `Show more (${activityUi.length - 5})`}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Owner Tools */}
            <div className="od-tips-section">
              <h3>Owner Tools</h3>
              <div className="od-tips-grid">
                <Link to="/owner/gym-application" className="od-tip-card-compact">
                  <div className="od-tip-icon-compact" style={{ background: "#3b82f6" }}><Plus size={20} /></div>
                  <div className="od-tip-content-compact">
                    <h4>Add another gym</h4>
                    <p>Create more listings for more reach.</p>
                    <span className="od-tip-action">Apply →</span>
                  </div>
                </Link>
                {selectedGymUi ? (
                  <>
                    <Link to={`/owner/view-gym/${selectedGymUi.id}`} className="od-tip-card-compact">
                      <div className="od-tip-icon-compact" style={{ background: "#10b981" }}><Eye size={20} /></div>
                      <div className="od-tip-content-compact">
                        <h4>View selected gym</h4>
                        <p>See listing details & media.</p>
                        <span className="od-tip-action">Open →</span>
                      </div>
                    </Link>
                    <Link to="/owner/inbox" className="od-tip-card-compact">
                      <div className="od-tip-icon-compact" style={{ background: "#111827" }}><Mail size={20} /></div>
                      <div className="od-tip-content-compact">
                        <h4>Inbox</h4>
                        <p>Reply to member inquiries.</p>
                        <span className="od-tip-action">Open Inbox →</span>
                      </div>
                    </Link>
                  </>
                ) : (
                  <Link to="/owner/profile" className="od-tip-card-compact">
                    <div className="od-tip-icon-compact" style={{ background: "#f59e0b" }}><Settings size={20} /></div>
                    <div className="od-tip-content-compact">
                      <h4>Owner profile</h4>
                      <p>Update owner information and settings.</p>
                      <span className="od-tip-action">Edit Profile →</span>
                    </div>
                  </Link>
                )}
                {isAdminOrSuper && (
                  <Link to="/admin/dashboard" className="od-tip-card-compact">
                    <div className="od-tip-icon-compact" style={{ background: "#7c3aed" }}><Shield size={20} /></div>
                    <div className="od-tip-content-compact">
                      <h4>Admin panel</h4>
                      <p>Go back to admin dashboard.</p>
                      <span className="od-tip-action">Open Admin →</span>
                    </div>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="od-right-column">
            {selectedGymUi ? (
              <>
                <div className="od-rank-card">
                  <div className="od-rank-header"><Award size={20} /><h3>Selected Gym Analytics</h3></div>
                  <div className="od-rank-display">
                    <div className="od-rank-number">{Number(selectedA.total_views || 0).toLocaleString()}</div>
                    <div className="od-rank-text">
                      <span>Total views</span>
                      <p>{selectedGymUi.name}</p>
                    </div>
                  </div>
                  <div className="od-rank-tip">
                    <Zap size={16} />
                    <span>Views change: {selectedA.views_change >= 0 ? "+" : ""}{Number(selectedA.views_change || 0)}%</span>
                  </div>
                </div>

                <div className="od-performance-card">
                  <div className="od-perf-header">
                    <h3>Performance</h3>
                    <Link to={`/owner/view-gym/${selectedGymUi.id}`} className="od-view-link">Open Gym <ArrowRight size={14} /></Link>
                  </div>
                  <div className="od-perf-stats">
                    {[
                      { label: "Views", icon: Eye, value: selectedA.total_views, change: selectedA.views_change },
                      { label: "Saves", icon: Star, value: selectedA.total_saves, change: selectedA.saves_change },
                      { label: "Members", icon: Users, value: selectedA.members, change: selectedA.members_change },
                      { label: "Inquiries", icon: Mail, value: selectedA.total_inquiries, change: selectedA.inquiries_change },
                    ].map(({ label, icon: Icon, value, change }) => (
                      <div key={label} className="od-perf-stat">
                        <div className="od-perf-label"><Icon size={16} /><span>{label}</span></div>
                        <div className="od-perf-value">
                          <h4>{Number(value || 0).toLocaleString()}</h4>
                          <div className={`od-perf-trend ${Number(change || 0) >= 0 ? "up" : "down"}`}>
                            {Number(change || 0) >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            <span>{Math.abs(Number(change || 0))}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="od-inquiries-section">
                  <div className="od-section-header" style={{ justifyContent: "space-between" }}>
                    <h2><Mail size={20} /> Member Inquiries</h2>
                    <Link to="/owner/inbox" className="od-view-link">Open inbox <ArrowRight size={14} /></Link>
                  </div>
                  <div style={{ padding: 14 }}>
                    {cardsLoading ? (
                      <div style={{ opacity: 0.75 }}>Loading inquiries…</div>
                    ) : cards.latest_inquiries.length === 0 ? (
                      <div style={{ opacity: 0.75 }}>No inquiries yet.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {cards.latest_inquiries.slice(0, 5).map((it) => (
                          <Link key={it.inquiry_id ?? `${it.gym_id}-${it.created_at}`} to="/owner/inbox"
                            style={{ textDecoration: "none", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 14, padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                <b>{it.gym_name ?? "Gym"}</b> • {it.from_name ?? "Member"}
                              </div>
                              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {clipText(it.question, 90)}
                              </div>
                            </div>
                            <div style={{ fontSize: 12, opacity: 0.7 }}>{it.status ?? "open"}</div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="od-reviews-card">
                  <div className="od-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3><MessageSquare size={18} /> Reviews</h3>
                    <Link to={`/owner/view-gym/${selectedGymUi.id}`} className="od-view-link">Open gym <ArrowRight size={14} /></Link>
                  </div>
                  <div style={{ padding: 14 }}>
                    {cardsLoading ? (
                      <div style={{ opacity: 0.75 }}>Loading reviews…</div>
                    ) : cards.latest_reviews.length === 0 ? (
                      <div style={{ opacity: 0.75 }}>No reviews yet.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {cards.latest_reviews.slice(0, 5).map((it) => (
                          <Link key={it.rating_id ?? `${it.gym_id}-${it.created_at}`} to={`/owner/view-gym/${it.gym_id}`}
                            style={{ textDecoration: "none", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 14, padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                <b>{it.gym_name ?? "Gym"}</b> • {it.user_name ?? "User"} • {Number(it.stars || 0)}★
                              </div>
                              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {clipText(it.review, 85)}
                              </div>
                            </div>
                            <ChevronRight size={18} style={{ opacity: 0.6 }} />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="od-renewals-card">
                  <div className="od-card-header">
                    <h3><Calendar size={18} /> Upcoming Renewals (3 days)</h3>
                  </div>
                  <div style={{ padding: 14 }}>
                    {cardsLoading ? (
                      <div style={{ opacity: 0.75 }}>Loading renewals…</div>
                    ) : cards.upcoming_renewals.length === 0 ? (
                      <div style={{ opacity: 0.75 }}>No memberships expiring soon.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {cards.upcoming_renewals.slice(0, 5).map((it) => (
                          <Link key={it.membership_id ?? `${it.gym_id}-${it.user_id}-${it.end_date}`} to={`/owner/members/${it.gym_id}`}
                            style={{ textDecoration: "none", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 14, padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                <b>{it.user_name ?? "Member"}</b> • {it.gym_name ?? "Gym"}
                              </div>
                              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                                Ends: {it.end_date ? new Date(it.end_date).toLocaleDateString() : "—"}
                              </div>
                            </div>
                            <div style={{ fontSize: 12, opacity: 0.75 }}>{it.days_left != null ? `${it.days_left}d left` : ""}</div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="od-signups-card">
                  <div className="od-card-header">
                    <h3><Users size={18} /> Recent Sign-ups</h3>
                  </div>
                  <div style={{ padding: 14 }}>
                    {cardsLoading ? (
                      <div style={{ opacity: 0.75 }}>Loading sign-ups…</div>
                    ) : cards.recent_signups.length === 0 ? (
                      <div style={{ opacity: 0.75 }}>No recent sign-ups.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {cards.recent_signups.slice(0, 5).map((it) => (
                          <Link key={it.membership_id ?? `${it.gym_id}-${it.user_id}-${it.created_at}`} to={`/owner/members/${it.gym_id}`}
                            style={{ textDecoration: "none", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 14, padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                <b>{it.user_name ?? "Member"}</b> • {it.gym_name ?? "Gym"}
                              </div>
                              <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                                Joined: {it.created_at ? new Date(it.created_at).toLocaleDateString() : "—"}
                              </div>
                            </div>
                            <ChevronRight size={18} style={{ opacity: 0.6 }} />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ padding: 14, opacity: 0.75 }}>Select a gym to see analytics.</div>
            )}
          </div>
        </div>

        

      </div>
    </div>
  );
}