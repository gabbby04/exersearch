import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "./Header2";
import Footer from "../user/Footer";
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
  Award,
  Zap,
  DollarSign,
  Clock,
  ThumbsUp,
  Image as ImageIcon,
  UserPlus,
  Mail,
  Shield,
  Activity,
  ChevronDown,
} from "lucide-react";

import {
  getMe,
  getAllMyGyms,
  getGymAnalytics,
  getOwnerActivities,
} from "../../utils/ownerDashboardApi";

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

function mapGym(g) {
  const id = g.gym_id ?? g.id;
  const name = g.name ?? g.gym_name ?? "My Gym";
  const location =
    g.location ??
    g.address ??
    [g.barangay, g.city, g.province].filter(Boolean).join(", ") ??
    "—";

  const image =
    g.image_url ??
    g.cover_photo ??
    g.photo_url ??
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80";

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

/**
 * Alerts priority: "high" | "medium" | "low"
 * If backend returns analytics.alerts, use it.
 * Otherwise generate decent placeholders.
 */
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

  const views = Number(analytics?.total_views || 0);
  const saves = Number(analytics?.total_saves || 0);
  const viewsChange = Number(analytics?.views_change || 0);

  const alerts = [];

  // high-ish: big drop
  if (viewsChange < -10) {
    alerts.push({ text: "Views dropped this week", priority: "high", count: 0, type: "views" });
  }

  // medium: low exposure
  if (views < 100) {
    alerts.push({ text: "Add more photos", priority: "low", count: 0, type: "photo" });
  } else if (saves < 10) {
    alerts.push({ text: "Low saves — consider a promo", priority: "medium", count: 0, type: "promo" });
  }

  return alerts.slice(0, 2);
}

function fmtPesoShort(n) {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return "₱0";
  if (v >= 1000000) return `₱${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `₱${(v / 1000).toFixed(0)}K`;
  return `₱${v.toLocaleString()}`;
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

  // ✅ collapsible
  const [gymsOpen, setGymsOpen] = useState(true);
  const [activityOpen, setActivityOpen] = useState(true);

  // ✅ show more
  const [showAllGyms, setShowAllGyms] = useState(false);
  const [showAllActivities, setShowAllActivities] = useState(false);

  const role = (me?.role ?? "").toLowerCase();
  const canUseOwner = role === "owner" || role === "superadmin";
  const isAdminOrSuper = role === "admin" || role === "superadmin";

  const selectedGym = useMemo(() => {
    return gyms.find((g) => String(g.id) === String(selectedGymId)) || null;
  }, [gyms, selectedGymId]);

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
          member_since: user?.created_at
            ? new Date(user.created_at).toLocaleDateString()
            : "—",
        });

        const gymsRes = await getAllMyGyms();
        const list = safeArr(gymsRes).map(mapGym);

        if (!alive) return;

        setGyms(list);
        setSelectedGymId(list[0]?.id ?? null);

        setGymsOpen(true);
        setShowAllGyms(false);

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
      } catch (e) {
        console.error(e);
        setErr(
          e?.response?.data?.message ||
            e?.message ||
            "Failed to load owner dashboard."
        );
      } finally {
        if (alive) setLoading(false);
        if (alive) setAnalyticsLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [navigate]);

  /**
   * Build gyms UI objects:
   * - adds stats/views/rating if available
   * - adds rank + total (fallbacks)
   * - adds alerts (backend or placeholders)
   */
  const gymsUi = useMemo(() => {
    return gyms.map((g, idx) => {
      const a = analyticsByGym[String(g.id)] || null;

      // Core metrics
      const views = Number(a?.total_views || a?.views || 0);
      const saves = Number(a?.total_saves || a?.saves || 0);

      // Optional if your API has them
      const members = Number(a?.members || 0);
      const rating = Number(a?.rating || 0);
      const revenue = Number(a?.revenue || 0);

      // Rank fallback: if API doesn't have it, use list order
      const rank = Number(a?.rank || g.raw?.rank || idx + 1);
      const totalGyms = Number(a?.total_gyms || g.raw?.total_gyms || Math.max(gyms.length, 1));
      const area = areaLabelFromGym(g);

      const alerts = computeGymAlerts({ analytics: a });

      return {
        ...g,
        stats: { members, views, rating, saves, revenue },
        rank,
        total_gyms: totalGyms,
        area,
        alerts,
        analytics: a,
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
        type: a.type || a.event || "activity",
        event: a.event || a.type || "activity",
        text: a.text || eventToText(a.event, a.gym_name || "your gym"),
        time: a.time || timeAgoLike(a.created_at),
        Icon: eventToIcon(a.event || a.type),
      }))
      // newest first if backend returns oldest first
      .sort((x, y) => (String(y.time) > String(x.time) ? 1 : -1));
  }, [activities]);

  const visibleActivities = useMemo(() => {
    if (showAllActivities) return activityUi;
    return activityUi.slice(0, 5);
  }, [activityUi, showAllActivities]);

  // Hero totals (safe even if rating/members not available yet)
  const hero = useMemo(() => {
    const totalViews = gymsUi.reduce((sum, g) => sum + Number(g.stats.views || 0), 0);
    const totalRevenue = gymsUi.reduce((sum, g) => sum + Number(g.stats.revenue || 0), 0);
    const avgRating =
      gymsUi.length > 0
        ? gymsUi.reduce((sum, g) => sum + Number(g.stats.rating || 0), 0) / gymsUi.length
        : 0;

    const bestRank = gymsUi
      .map((g) => Number(g.rank))
      .filter((x) => Number.isFinite(x) && x > 0);
    const bestRankValue = bestRank.length ? Math.min(...bestRank) : null;

    const totalMembers = gymsUi.reduce((sum, g) => sum + Number(g.stats.members || 0), 0);

    return { totalViews, totalRevenue, avgRating, bestRankValue, totalMembers };
  }, [gymsUi]);

  // Selected analytics (right side) with fallbacks
  const selectedA = useMemo(() => {
    const a = selectedGymUi?.analytics || null;
    return {
      total_views: Number(a?.total_views || 0),
      total_saves: Number(a?.total_saves || 0),
      views_change: Number(a?.views_change || 0),
      saves_change: Number(a?.saves_change || 0),

      members: Number(a?.members || 0),
      members_change: Number(a?.members_change || 0),

      rating: Number(a?.rating || 0),
      rating_change: Number(a?.rating_change || 0),

      revenue: Number(a?.revenue || 0),
      revenue_change: Number(a?.revenue_change || 0),
    };
  }, [selectedGymUi]);

  // Needs Your Attention (simple + real)
  const urgentActions = useMemo(() => {
    const items = [];

    if (me && !me.verified) {
      items.push({
        icon: AlertCircle,
        text: "Verify your email",
        link: "/owner/profile",
        priority: "high",
        count: 1,
      });
    }

    if (gyms.length === 0) {
      items.push({
        icon: Plus,
        text: "Add your first gym",
        link: "/owner/gyms/add",
        priority: "high",
        count: 1,
      });
    }

    if (selectedGymUi) {
      if (Number(selectedA.total_views || 0) === 0) {
        items.push({
          icon: ImageIcon,
          text: "Add photos to get more views",
          link: `/owner/view-gym/${selectedGymUi.id}`,
          priority: "low",
          count: 0,
        });
      }
    }

    if (items.length === 0) {
      items.push({
        icon: ThumbsUp,
        text: "All good for now",
        link: "/owner",
        priority: "low",
        count: 0,
      });
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
        <Footer />
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
        <Footer />
      </div>
    );
  }

  if (!canUseOwner) return null;

  return (
    <div className="od-app">
      <Header />

      <div className="od-container">
        {/* Hero */}
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
                  <span
                    className="od-role-pill"
                    style={{
                      marginLeft: 10,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      padding: "4px 10px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(255,255,255,0.06)",
                    }}
                  >
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
                <div className="od-hero-stat-icon views">
                  <Eye size={20} />
                </div>
                <div className="od-hero-stat-content">
                  <span className="od-hero-stat-label">Total Views</span>
                  <strong className="od-hero-stat-value">
                    {analyticsLoading ? "…" : hero.totalViews.toLocaleString()}
                  </strong>
                </div>
              </div>

              <div className="od-hero-stat">
                <div className="od-hero-stat-icon revenue">
                  <DollarSign size={20} />
                </div>
                <div className="od-hero-stat-content">
                  <span className="od-hero-stat-label">Monthly Revenue</span>
                  <strong className="od-hero-stat-value">
                    {hero.totalRevenue ? fmtPesoShort(hero.totalRevenue) : "Soon"}
                  </strong>
                </div>
              </div>

              <div className="od-hero-stat">
                <div className="od-hero-stat-icon rating">
                  <Star size={20} />
                </div>
                <div className="od-hero-stat-content">
                  <span className="od-hero-stat-label">Avg Rating</span>
                  <strong className="od-hero-stat-value">
                    {hero.avgRating ? hero.avgRating.toFixed(1) : "—"}
                  </strong>
                </div>
              </div>

              <div className="od-hero-stat">
                <div className="od-hero-stat-icon rank">
                  <Award size={20} />
                </div>
                <div className="od-hero-stat-content">
                  <span className="od-hero-stat-label">Best Rank</span>
                  <strong className="od-hero-stat-value">
                    {hero.bestRankValue ? `#${hero.bestRankValue}` : "—"}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Needs Your Attention */}
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
                  <div className="od-urgent-icon">
                    <Icon size={20} />
                  </div>
                  <div className="od-urgent-content">
                    <p>{action.text}</p>
                    {action.count > 0 && (
                      <span className="od-urgent-count">{action.count}</span>
                    )}
                  </div>
                  <ChevronRight size={18} className="od-urgent-arrow" />
                </Link>
              );
            })}
          </div>
        </div>

        <div className="od-main-grid">
          {/* LEFT */}
          <div className="od-left-column">
            {/* Your Gyms (collapsible + show more) */}
            <div className="od-gyms-section">
              <div
                className="od-section-header od-collapsible-header"
                role="button"
                tabIndex={0}
                onClick={() => setGymsOpen((v) => !v)}
              >
                <h2>
                  Your Gyms ({gyms.length})
                  <span className={`od-collapse-icon ${gymsOpen ? "open" : ""}`}>
                    <ChevronDown size={18} />
                  </span>
                </h2>
          <div onClick={(e) => e.stopPropagation()}>
            <Link to="/owner/gym-application" className="od-add-btn">
              <Plus size={18} />
              Add Gym
            </Link>
          </div>
              </div>

              <div className={`od-collapse-body ${gymsOpen ? "open" : ""}`}>
                <div className="od-gyms-list">
                  {visibleGyms.map((gym) => (
                    <div
                      key={gym.id}
                      className={`od-gym-card ${String(selectedGymId) === String(gym.id) ? "selected" : ""}`}
                      onClick={() => setSelectedGymId(gym.id)}
                    >
                      <div className="od-gym-image">
                        <img src={gym.image} alt={gym.name} />
                        <div className={`od-gym-status ${gym.status}`}>
                          {gym.status === "active" ? (
                            <CheckCircle size={14} />
                          ) : (
                            <AlertCircle size={14} />
                          )}
                          {gym.status}
                        </div>
                      </div>

                      <div className="od-gym-info">
                        <div className="od-gym-header">
                          <h3>{gym.name}</h3>
                          {gym.verified && (
                            <div className="od-verified">
                              <CheckCircle size={14} />
                            </div>
                          )}
                        </div>

                        <div className="od-gym-location">
                          <MapPin size={14} />
                          <span>{gym.location}</span>
                        </div>

                        {gym.status === "active" && (
                          <>
                            <div className="od-gym-quick-stats">
                              {gym.stats.members > 0 && (
                                <div className="od-quick-stat">
                                  <Users size={14} />
                                  <span>{gym.stats.members}</span>
                                </div>
                              )}
                              <div className="od-quick-stat">
                                <Eye size={14} />
                                <span>{analyticsLoading ? "…" : gym.stats.views}</span>
                              </div>
                              {gym.stats.rating > 0 && (
                                <div className="od-quick-stat">
                                  <Star size={14} />
                                  <span>{gym.stats.rating}</span>
                                </div>
                              )}
                            </div>

                            {/* ✅ flavor rank pill */}
                            <div className="od-gym-rank">
                              <Crown size={14} />
                              <span>
                                Rank #{gym.rank} of {gym.total_gyms} in {gym.area}
                              </span>
                            </div>
                          </>
                        )}

                        {/* ✅ flavor alerts */}
                        {gym.alerts?.length > 0 && (
                          <div className="od-gym-alerts">
                            {gym.alerts.slice(0, 2).map((alert, i) => (
                              <div key={i} className={`od-gym-alert ${alert.priority || "low"}`}>
                                <AlertCircle size={12} />
                                <span>{alert.text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <Link
                        to={`/owner/view-gym/${gym.id}`}
                        className="od-gym-action"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ChevronRight size={20} />
                      </Link>
                    </div>
                  ))}

                  {gyms.length === 0 && (
                    <div style={{ padding: 14, opacity: 0.8 }}>
                      No gyms found yet. Click <b>Add Gym</b>.
                    </div>
                  )}
                </div>

                {/* Show more gyms */}
                {gymsUi.length > 3 && (
                  <div className="od-showmore-row">
                    <button
                      type="button"
                      className="od-showmore-btn"
                      onClick={() => setShowAllGyms((v) => !v)}
                    >
                      {showAllGyms ? "Show less" : `Show more (${gymsUi.length - 3})`}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Inquiries placeholder */}
            <div className="od-inquiries-section">
              <div className="od-section-header">
                <h2>
                  <Mail size={20} />
                  Member Inquiries
                </h2>
                <span style={{ opacity: 0.7, fontSize: 12 }}>To be added</span>
              </div>
              <div style={{ padding: 14, opacity: 0.75 }}>
                Member inquiries is under maintenance and will be added soon.
              </div>
            </div>

            {/* Recent Activity (collapsible + show more) */}
            <div className="od-activity-section">
              <div
                className="od-section-header od-collapsible-header"
                role="button"
                tabIndex={0}
                onClick={() => setActivityOpen((v) => !v)}
              >
                <h2>
                  <Activity size={20} />
                  Recent Activity
                  <span className={`od-collapse-icon ${activityOpen ? "open" : ""}`}>
                    <ChevronDown size={18} />
                  </span>
                </h2>
              </div>

              <div className={`od-collapse-body ${activityOpen ? "open" : ""}`}>
                <div className="od-activity-feed">
                  {activitiesLoading && (
                    <div style={{ padding: 14, opacity: 0.75 }}>
                      Loading activity…
                    </div>
                  )}

                  {!activitiesLoading && activityUi.length === 0 && (
                    <div style={{ padding: 14, opacity: 0.75 }}>
                      No activity yet.
                    </div>
                  )}

                  {!activitiesLoading &&
                    visibleActivities.map((a) => (
                      <div key={a.id} className="od-activity-item">
                        <div className={`od-activity-icon ${a.event}`}>
                          <a.Icon size={16} />
                        </div>
                        <div className="od-activity-text">
                          <p>{a.text}</p>
                          <span>{a.time}</span>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Show more activities */}
                {activityUi.length > 5 && (
                  <div className="od-showmore-row">
                    <button
                      type="button"
                      className="od-showmore-btn"
                      onClick={() => setShowAllActivities((v) => !v)}
                    >
                      {showAllActivities ? "Show less" : `Show more (${activityUi.length - 5})`}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Owner tools */}
            <div className="od-tips-section">
              <h3>Owner Tools</h3>
              <div className="od-tips-grid">
                <Link to="/owner/gyms/add" className="od-tip-card-compact">
                  <div className="od-tip-icon-compact" style={{ background: "#3b82f6" }}>
                    <Plus size={20} />
                  </div>
                  <div className="od-tip-content-compact">
                    <h4>Add another gym</h4>
                    <p>Create more listings for more reach.</p>
                    <span className="od-tip-action">Add Gym →</span>
                  </div>
                </Link>

                {selectedGymUi ? (
                  <Link to={`/owner/view-gym/${selectedGymUi.id}`} className="od-tip-card-compact">
                    <div className="od-tip-icon-compact" style={{ background: "#10b981" }}>
                      <ImageIcon size={20} />
                    </div>
                    <div className="od-tip-content-compact">
                      <h4>Manage selected gym</h4>
                      <p>Update details, equipments, and amenities.</p>
                      <span className="od-tip-action">Open Gym →</span>
                    </div>
                  </Link>
                ) : (
                  <Link to="/owner/profile" className="od-tip-card-compact">
                    <div className="od-tip-icon-compact" style={{ background: "#f59e0b" }}>
                      <Settings size={20} />
                    </div>
                    <div className="od-tip-content-compact">
                      <h4>Owner profile</h4>
                      <p>Update owner information and settings.</p>
                      <span className="od-tip-action">Edit Profile →</span>
                    </div>
                  </Link>
                )}

                {isAdminOrSuper && (
                  <Link to="/admin" className="od-tip-card-compact">
                    <div className="od-tip-icon-compact" style={{ background: "#7c3aed" }}>
                      <Shield size={20} />
                    </div>
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

          {/* RIGHT */}
          <div className="od-right-column">
            {selectedGymUi ? (
              <>
                {/* Rank / Analytics Card */}
                <div className="od-rank-card">
                  <div className="od-rank-header">
                    <Award size={20} />
                    <h3>Selected Gym Analytics</h3>
                  </div>

                  <div className="od-rank-display">
                    <div className="od-rank-number">
                      {selectedA.total_views.toLocaleString()}
                    </div>
                    <div className="od-rank-text">
                      <span>Total views</span>
                      <p>{selectedGymUi.name}</p>
                    </div>
                  </div>

                  <div className="od-rank-tip">
                    <Zap size={16} />
                    <span>
                      Views change: {selectedA.views_change >= 0 ? "+" : ""}
                      {selectedA.views_change}%
                    </span>
                  </div>
                </div>

                {/* Performance Card */}
                <div className="od-performance-card">
                  <div className="od-perf-header">
                    <h3>Performance</h3>
                    <Link
                      to={`/owner/view-gym/${selectedGymUi.id}`}
                      className="od-view-link"
                    >
                      Open Gym <ArrowRight size={14} />
                    </Link>
                  </div>

                  <div className="od-perf-stats">
                    {/* Views */}
                    <div className="od-perf-stat">
                      <div className="od-perf-label">
                        <Eye size={16} />
                        <span>Views</span>
                      </div>
                      <div className="od-perf-value">
                        <h4>{selectedA.total_views.toLocaleString()}</h4>
                        <div
                          className={`od-perf-trend ${
                            selectedA.views_change >= 0 ? "up" : "down"
                          }`}
                        >
                          {selectedA.views_change >= 0 ? (
                            <TrendingUp size={12} />
                          ) : (
                            <TrendingDown size={12} />
                          )}
                          <span>{Math.abs(selectedA.views_change)}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Saves */}
                    <div className="od-perf-stat">
                      <div className="od-perf-label">
                        <Star size={16} />
                        <span>Saves</span>
                      </div>
                      <div className="od-perf-value">
                        <h4>{selectedA.total_saves.toLocaleString()}</h4>
                        <div
                          className={`od-perf-trend ${
                            selectedA.saves_change >= 0 ? "up" : "down"
                          }`}
                        >
                          {selectedA.saves_change >= 0 ? (
                            <TrendingUp size={12} />
                          ) : (
                            <TrendingDown size={12} />
                          )}
                          <span>{Math.abs(selectedA.saves_change)}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Members (optional) */}
                    <div className="od-perf-stat">
                      <div className="od-perf-label">
                        <Users size={16} />
                        <span>Members</span>
                      </div>
                      <div className="od-perf-value">
                        <h4>{selectedA.members ? selectedA.members.toLocaleString() : "Soon"}</h4>
                        <div
                          className={`od-perf-trend ${
                            selectedA.members_change >= 0 ? "up" : "down"
                          }`}
                        >
                          {selectedA.members ? (
                            <>
                              {selectedA.members_change >= 0 ? (
                                <TrendingUp size={12} />
                              ) : (
                                <TrendingDown size={12} />
                              )}
                              <span>{Math.abs(selectedA.members_change)}%</span>
                            </>
                          ) : (
                            <>
                              <TrendingUp size={12} />
                              <span>To be added</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Revenue (optional) */}
                    <div className="od-perf-stat">
                      <div className="od-perf-label">
                        <DollarSign size={16} />
                        <span>Revenue</span>
                      </div>
                      <div className="od-perf-value">
                        <h4>{selectedA.revenue ? fmtPesoShort(selectedA.revenue) : "Soon"}</h4>
                        <div className="od-perf-trend up">
                          <TrendingUp size={12} />
                          <span>{selectedA.revenue ? "This month" : "To be added"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pending Reviews */}
                <div className="od-reviews-card">
                  <div className="od-card-header">
                    <h3>
                      <MessageSquare size={18} />
                      Pending Reviews
                    </h3>
                  </div>
                  <div style={{ padding: 14, opacity: 0.75 }}>
                    Under maintenance. Pending reviews will be added soon.
                  </div>
                </div>

                {/* Upcoming Renewals */}
                <div className="od-renewals-card">
                  <div className="od-card-header">
                    <h3>
                      <Calendar size={18} />
                      Upcoming Renewals
                    </h3>
                  </div>
                  <div style={{ padding: 14, opacity: 0.75 }}>
                    Under maintenance. Renewals will be added soon.
                  </div>
                </div>

                {/* Recent Sign-ups */}
                <div className="od-signups-card">
                  <div className="od-card-header">
                    <h3>
                      <UserPlus size={18} />
                      Recent Sign-ups
                    </h3>
                  </div>
                  <div style={{ padding: 14, opacity: 0.75 }}>
                    Under maintenance. Recent sign-ups will be added soon.
                  </div>
                </div>
              </>
            ) : (
              <div style={{ padding: 14, opacity: 0.75 }}>
                Select a gym to see analytics.
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}