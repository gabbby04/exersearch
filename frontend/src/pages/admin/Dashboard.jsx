import React, { useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { MAIN, adminThemes } from "./AdminLayout";
import { api } from "../../utils/apiClient";
import "./AdminDashboard.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://exersearch.test";

function absoluteUrlMaybe(pathOrUrl) {
  if (!pathOrUrl) return "";
  const s = String(pathOrUrl).trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  const p = s.startsWith("/") ? s : `/${s}`;
  return `${API_BASE}${p}`;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { theme } = useOutletContext();
  const t = adminThemes[theme]?.app || adminThemes.light.app;
  const isDark = theme === "dark";

  const [q, setQ] = useState("");
  const [range, setRange] = useState("30d");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [kpi, setKpi] = useState(null);
  const [activity, setActivity] = useState([]);
  const [approvalsByMonth, setApprovalsByMonth] = useState([]);
  const [interactionsTrend, setInteractionsTrend] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentOwners, setRecentOwners] = useState([]);

  const rangeLabel =
    range === "7d" ? "Last 7 days" : range === "30d" ? "Last 30 days" : "Last 12 months";

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setErr("");

        const res = await api.get(`/admin/dashboard`, { params: { range } });
        if (!alive) return;

        const data = res?.data || {};
        setKpi(data.kpi || null);
        setActivity(Array.isArray(data.activity) ? data.activity : []);
        setApprovalsByMonth(data?.charts?.approvals_by_month || []);
        setInteractionsTrend(data?.charts?.interactions_trend || []);
        setRecentUsers(Array.isArray(data.recent_users) ? data.recent_users : []);
        setRecentOwners(Array.isArray(data.recent_owners) ? data.recent_owners : []);
      } catch (e) {
        if (!alive) return;
        setErr(e?.response?.data?.message || e?.message || "Failed to load dashboard");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [range]);

  const filteredActivity = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return activity;
    return activity.filter((x) => `${x.title || ""} ${x.subtitle || ""}`.toLowerCase().includes(s));
  }, [q, activity]);

  const top5Activity = useMemo(() => filteredActivity.slice(0, 5), [filteredActivity]);

  const kpiCards = useMemo(() => {
    const safe = (v) => (v == null ? "—" : String(v));

    return [
      {
        key: "k1",
        title: "Pending Applications",
        value: safe(kpi?.pending_applications),
        delta: rangeLabel,
        badge: "Pending",
        image: "/dashboard1.png",
        onOpen: () => navigate("/admin/applications"),
      },
      {
        key: "k2",
        title: "Pending Gyms",
        value: safe(kpi?.pending_gyms),
        delta: rangeLabel,
        badge: "Review",
        image: "/dashboard2.png",
        onOpen: () => navigate("/admin/gyms"),
      },
      {
        key: "k3",
        title: "Interactions",
        value: safe(kpi?.interactions),
        delta: rangeLabel,
        badge: "Traffic",
        image: "/dashboard3.png",
        onOpen: () => navigate("/admin/activities"),
      },
      {
        key: "k4",
        title: "Blocked Gyms",
        value: safe(kpi?.blocked_gyms),
        delta: "Announcements",
        badge: "Moderation",
        image: "/dashboard4.png",
        onOpen: () => navigate("/admin/announcements"),
      },
    ];
  }, [kpi, rangeLabel, navigate]);

  const fmtTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString();
  };

  const userInitials = (name) => {
    const s = (name || "").trim();
    if (!s) return "?";
    const parts = s.split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] || "";
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
    return (a + b).toUpperCase() || a.toUpperCase() || "?";
  };

  const exportJson = () => {
    const payload = {
      range,
      kpi,
      approvalsByMonth,
      interactionsTrend,
      activity: filteredActivity,
      recent_users: recentUsers,
      recent_owners: recentOwners,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admin-dashboard-${range}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const themeVars = {
    "--bg": t.bg,
    "--text": t.text,
    "--muted": t.mutedText,
    "--border": t.border,
    "--soft": t.soft,
    "--soft2": t.soft2,
    "--shadow": t.shadow,
    "--main": MAIN,
    "--main2": "#ff7a45",
    "--hot": "#ff3c00",
    "--tooltipBg": isDark ? "rgba(7,12,22,0.96)" : "rgba(255,255,255,0.98)",
    "--tooltipText": isDark ? "rgba(255,255,255,0.96)" : "rgba(15,23,42,0.96)",
    "--tooltipSub": isDark ? "rgba(255,255,255,0.72)" : "rgba(100,116,139,0.90)",
    "--tooltipBorder": isDark ? "rgba(255,255,255,0.18)" : "rgba(15,23,42,0.12)",
    "--chartBg": isDark ? "rgba(15,23,42,0.35)" : "rgba(248,250,252,1)",
    "--chartBg2": isDark ? "rgba(15,23,42,0.18)" : "rgba(241,245,249,1)",
    "--axis": isDark ? "rgba(255,255,255,0.14)" : "rgba(15,23,42,0.12)",
    "--grid": isDark ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.08)",
    "--label": isDark ? "rgba(255,255,255,0.78)" : "rgba(100,116,139,0.92)",
    "--trackTop": isDark ? "rgba(255,255,255,0.10)" : "rgba(148,163,184,0.18)",
    "--trackBot": isDark ? "rgba(255,255,255,0.06)" : "rgba(148,163,184,0.10)",
    "--accentArea1": isDark ? "rgba(255,60,0,0.22)" : "rgba(255,60,0,0.18)",
    "--accentArea2": isDark ? "rgba(255,60,0,0.08)" : "rgba(255,60,0,0.06)",
    "--accentGlow": isDark ? "rgba(255,122,69,0.40)" : "rgba(255,60,0,0.30)",
    "--accentWide": isDark ? "rgba(255,122,69,0.22)" : "rgba(255,60,0,0.22)",
  };

  return (
    <div className="ad-page" style={themeVars}>
      <div className="ad-topRow">
        <div>
          <div className="ad-pageTitle">Dashboard</div>
          <div className="ad-pageSub">
            {loading ? "Loading live stats…" : err ? "Could not load live stats" : "Live platform overview"}
          </div>
        </div>

        <div className="ad-searchBox">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search recent activity…"
            className="ad-searchInput"
          />
          <span className="ad-searchIcon">⌕</span>
        </div>
      </div>

      {!!err && (
        <div className="ad-errorWrap">
          <div className="ad-errorBanner">{err}</div>
        </div>
      )}

      <div className={`ad-kpiGrid ${loading ? "is-loading" : ""}`}>
        {kpiCards.map((x) => (
          <div key={x.key} className="ad-card">
            <div className="ad-cardImg" style={{ height: 110, backgroundImage: `url(${x.image})` }}>
              <div className="ad-cardBadge">{x.badge}</div>
            </div>

            <div className="ad-cardBody">
              <div className="ad-cardSub" style={{ marginTop: 0 }}>
                {x.title}
              </div>
              <div className="ad-cardTitle ad-cardValue">{x.value}</div>
              <div className="ad-cardSub">{x.delta}</div>

              <div className="ad-cardActions">
                <button className="ad-btn ad-btnSoft" onClick={() => x.onOpen?.()} disabled={loading}>
                  Details
                </button>
                <button className="ad-btn ad-btnMain" onClick={() => x.onOpen?.()} disabled={loading}>
                  Open
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="ad-twoColRow">
        <div className="ad-leftCol">
          <div className="ad-panel">
            <div className="ad-panelHeader">
              <div>
                <div className="ad-panelTitle">Platform activity</div>
                <div className="ad-pageSub">{rangeLabel}</div>
              </div>

              <div className="ad-panelActions">
                <select value={range} onChange={(e) => setRange(e.target.value)} className="ad-select" title="Range">
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="12m">Last 12 months</option>
                </select>

                <button className="ad-btn ad-btnSoft ad-btnH38" onClick={exportJson} disabled={loading}>
                  Export
                </button>
              </div>
            </div>

            <div className="ad-panelBody">
              <div className="ad-chartsGrid ad-chartsGridBig">
                <ChartBlock title="Applications approved">
                  <InfographicBarChart
                    data={approvalsByMonth || []}
                    height={900}
                    emptyLabel={loading ? "Loading…" : "No data"}
                  />
                </ChartBlock>

                <ChartBlock title="Interactions trend">
                  <ThickLineChart
                    points={interactionsTrend || []}
                    height={900}
                    stroke="var(--main)"
                    emptyLabel={loading ? "Loading…" : "No data"}
                  />
                </ChartBlock>
              </div>
            </div>

            <div className="ad-panelFooter">
              <div className="ad-sectionRow">
                <div className="ad-sectionTitle">Recent activity</div>
                <div className="ad-sectionMeta ad-metaHot">{filteredActivity.length} item(s)</div>
              </div>

              {top5Activity.length === 0 ? (
                <div className="ad-emptyBox">{loading ? "Loading…" : "No recent activity"}</div>
              ) : (
                <div className="ad-activityList">
                  {top5Activity.map((x, idx) => (
                    <div key={`${x.type || "item"}-${x.id || idx}`} className="ad-activityItem">
                      <div className="ad-activityDot" />
                      <div className="ad-activityText">
                        <div className="ad-activityTitle">{x.title || "Activity"}</div>
                        <div className="ad-activityMeta">
                          <span>{x.subtitle || ""}</span>
                          {!!x.created_at && (
                            <>
                              {" "}
                              • <span>{fmtTime(x.created_at)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="ad-seeAllRow">
                <button
                  className="ad-btn ad-btnSoft ad-btnFull"
                  onClick={() => navigate("/admin/activities")}
                  disabled={loading}
                >
                  See all activities
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="ad-rightCol">
          <div className="ad-stickyStack">
            <div className="ad-panel">
              <div className="ad-panelHeader">
                <div className="ad-panelTitle">Recent users</div>
                <div className="ad-sectionMeta ad-metaHot">{recentUsers.length} new</div>
              </div>

              <div className="ad-sideBody">
                {recentUsers.length === 0 ? (
                  <div className="ad-emptyBox">{loading ? "Loading…" : "No recent users"}</div>
                ) : (
                  <div className="ad-userList">
                    {recentUsers.slice(0, 4).map((u, idx) => {
                      const name = u?.name || u?.full_name || u?.username || "User";
                      const avatar = absoluteUrlMaybe(
                        u?.avatar_url || u?.avatar || u?.profile?.profile_photo_url || u?.profile_photo_url
                      );
                      const email = u?.email || "";

                      return (
                        <div key={u?.id || `${name}-${idx}`} className="ad-userRow ad-userRowOrange">
                          <div className="ad-avatar ad-avatarOrange">
                            {avatar ? (
                              <img
                                src={avatar}
                                alt={name}
                                className="ad-avatarImg"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="ad-avatarFallback">{userInitials(name)}</div>
                            )}
                          </div>

                          <div className="ad-userText">
                            <div className="ad-userName">{name}</div>
                            <div className="ad-userMeta">
                              {email ? email : u?.created_at ? `Joined • ${fmtTime(u.created_at)}` : "—"}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="ad-sideFooter">
                  <button className="ad-btn ad-btnSoft ad-btnFull" onClick={() => navigate("/admin/users")} disabled={loading}>
                    View all users
                  </button>
                </div>
              </div>
            </div>

            <div className="ad-panel">
              <div className="ad-panelHeader">
                <div className="ad-panelTitle">Recent owners</div>
                <div className="ad-sectionMeta ad-metaHot">{recentOwners.length} new</div>
              </div>

              <div className="ad-sideBody">
                {recentOwners.length === 0 ? (
                  <div className="ad-emptyBox">{loading ? "Loading…" : "No recent owners"}</div>
                ) : (
                  <div className="ad-userList">
                    {recentOwners.slice(0, 4).map((o, idx) => {
                      const name = o?.name || o?.full_name || o?.username || "Owner";
                      const avatar = absoluteUrlMaybe(
                        o?.avatar_url || o?.avatar || o?.profile?.profile_photo_url || o?.profile_photo_url
                      );
                      const gym = o?.gym_name || o?.gym || "";
                      const email = o?.email || "";

                      return (
                        <div key={o?.id || `${name}-${idx}`} className="ad-userRow ad-userRowOrange">
                          <div className="ad-avatar ad-avatarOrange">
                            {avatar ? (
                              <img
                                src={avatar}
                                alt={name}
                                className="ad-avatarImg"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="ad-avatarFallback">{userInitials(name)}</div>
                            )}
                          </div>

                          <div className="ad-userText">
                            <div className="ad-userName">{name}</div>
                            <div className="ad-userMeta">
                              {gym ? gym : email ? email : o?.created_at ? `Joined • ${fmtTime(o.created_at)}` : "—"}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="ad-sideFooter">
                  <button className="ad-btn ad-btnSoft ad-btnFull" onClick={() => navigate("/admin/users")} disabled={loading}>
                    View all owners
                  </button>
                </div>
              </div>
            </div>

            <div className="ad-panel">
              <div className="ad-panelHeader">
                <div className="ad-panelTitle">Quick links</div>
                <div className="ad-sectionMeta ad-metaHot">Shortcuts</div>
              </div>

              <div className="ad-sideBody">
                <div className="ad-quickLinks">
                  <button className="ad-quickBtn" onClick={() => navigate("/admin/applications")}>
                    Owner applications
                  </button>

                  <button className="ad-quickBtn" onClick={() => navigate("/admin/gyms")}>
                    Gyms
                  </button>

                  <button className="ad-quickBtn" onClick={() => navigate("/admin/announcements")}>
                    Announcements
                  </button>

                  <button className="ad-quickBtn" onClick={() => navigate("/admin/activities")}>
                    Activities
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: 24 }} />
    </div>
  );
}

function ChartBlock({ title, children }) {
  return (
    <div className="ad-chartBlock ad-chartBlockBig">
      <div className="ad-chartTitle">{title}</div>
      <div className="ad-chartBodyClean">{children}</div>
    </div>
  );
}

function InfographicBarChart({ data, height = 900, emptyLabel }) {
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null);

  const safe = Array.isArray(data) ? data : [];
  const hasData = safe.length > 0;

  const pad = 90;
  const colGap = 70;
  const trackW = 190;
  const fillW = 150;
  const topPad = 70;
  const labelAreaH = 90;

  const width = Math.max(1100, pad * 2 + safe.length * trackW + (safe.length - 1) * colGap);

  const values = safe.map((d) => Number(d.value) || 0);
  const max = Math.max(1, ...values);

  const innerH = height - topPad - pad - labelAreaH;

  const palette = ["#ff7a18", "#ff8a1f", "#ff5a00", "#ff3c00", "#ffb155"];
  const colX = (i) => pad + i * (trackW + colGap);

  const onMove = (e) => {
    if (!hasData) return;
    const el = svgRef.current;
    if (!el) return;

    const r = el.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const x = (mx / r.width) * width;

    let best = -1;
    let bestDist = Infinity;

    for (let i = 0; i < safe.length; i++) {
      const cx = colX(i) + trackW / 2;
      const dist = Math.abs(cx - x);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }

    if (best === -1 || bestDist > trackW / 1.4) {
      setHover(null);
      return;
    }

    const d = safe[best];
    const v = Number(d.value) || 0;

    const fillH = (innerH * v) / max;
    const x0 = colX(best);
    const fillY = topPad + (innerH - fillH);

    setHover({
      idx: best,
      label: d.label,
      value: d.value,
      x: x0 + trackW / 2,
      y: fillY,
    });
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      className="ad-svg ad-svgInfographic"
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
    >
      <defs>
        <filter id="softShadow" x="-30%" y="-30%" width="160%" height="190%">
          <feDropShadow dx="0" dy="18" stdDeviation="14" floodColor="rgba(0,0,0,0.18)" />
        </filter>

        <linearGradient id="trackGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--trackTop)" />
          <stop offset="100%" stopColor="var(--trackBot)" />
        </linearGradient>
      </defs>

      <GridLinesClean width={width} height={height} pad={pad} baseH={labelAreaH} />

      <line
        x1={pad}
        y1={topPad + innerH}
        x2={width - pad}
        y2={topPad + innerH}
        stroke="rgba(15,23,42,0.10)"
        strokeWidth="4"
      />

      {!hasData && (
        <text
          x={width / 2}
          y={height / 2}
          textAnchor="middle"
          fill="rgba(100,116,139,0.9)"
          fontSize="40"
          fontWeight="900"
        >
          {emptyLabel || "No data"}
        </text>
      )}

      {safe.map((d, i) => {
        const v = Number(d.value) || 0;

        const x0 = colX(i);
        const trackX = x0;
        const trackY = topPad;

        const fillH = (innerH * v) / max;
        const fillX = x0 + (trackW - fillW) / 2;
        const fillY = topPad + (innerH - fillH);

        const col = palette[i % palette.length];

        const showFill = v > 0;
        const showBadge = v > 0;

        const badgeCx = x0 + trackW / 2;
        const badgeCy = Math.max(trackY + 54, fillY + 36);

        return (
          <g key={`${d.label}-${i}`}>
            <rect
              x={trackX}
              y={trackY}
              width={trackW}
              height={innerH}
              rx={trackW / 2}
              fill="url(#trackGrad)"
              stroke="rgba(148,163,184,0.18)"
              strokeWidth="2"
            />

            {showFill && (
              <rect
                x={fillX}
                y={fillY}
                width={fillW}
                height={fillH}
                rx={fillW / 2}
                fill={col}
                filter="url(#softShadow)"
                opacity="0.98"
              />
            )}

            <text
              x={x0 + trackW / 2}
              y={topPad + innerH + 58}
              textAnchor="middle"
              fill="rgba(100,116,139,0.92)"
              fontSize="26"
              fontWeight="950"
              letterSpacing="0.3"
            >
              {String(d.label || "").slice(0, 14)}
            </text>

            {showBadge && (
              <g filter="url(#softShadow)">
                <circle cx={badgeCx} cy={badgeCy} r="72" fill={col} opacity="0.18" />
                <circle cx={badgeCx} cy={badgeCy} r="56" fill="rgba(255,255,255,0.98)" />
                <circle cx={badgeCx} cy={badgeCy} r="56" fill="none" stroke="rgba(15,23,42,0.10)" strokeWidth="3" />
                <text x={badgeCx} y={badgeCy + 12} textAnchor="middle" fill={col} fontSize="38" fontWeight="1000">
                  {String(d.value ?? 0)}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {hover && (
        <g>
          <TooltipClean x={hover.x} y={Math.max(pad + 16, hover.y)} title={hover.label} value={hover.value} />
        </g>
      )}
    </svg>
  );
}

function ThickLineChart({ points, height, stroke, emptyLabel }) {
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null);

  const width = 2200;
  const pad = 90;

  const normalized = Array.isArray(points)
    ? points.map((p, i) => {
        if (p && typeof p === "object") {
          const label = p.label ?? p.date ?? p.day ?? p.month ?? p.ym ?? p.name ?? `#${i + 1}`;
          const value = Number(p.value ?? p.count ?? p.c ?? p.y ?? 0) || 0;
          return { label: String(label), value };
        }
        return { label: `#${i + 1}`, value: Number(p) || 0 };
      })
    : [];

  const values = normalized.map((d) => d.value);
  const labels = normalized.map((d) => d.label);

  const hasData = values.length > 1;

  const max = Math.max(1, ...values);
  const min = values.length ? Math.min(...values) : 0;
  const span = Math.max(1, max - min);

  const step = hasData ? (width - pad * 2) / (values.length - 1) : 0;

  const xyAt = (i) => {
    const x = pad + i * step;
    const y = height - pad - ((values[i] - min) / span) * (height - pad * 2);
    return { x, y };
  };

  const path = hasData
    ? values
        .map((_, i) => {
          const { x, y } = xyAt(i);
          return `${i === 0 ? "M" : "L"} ${x} ${y}`;
        })
        .join(" ")
    : "";

  const onMove = (e) => {
    if (!hasData) return;
    const el = svgRef.current;
    if (!el) return;

    const r = el.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const x = (mx / r.width) * width;

    const idx = Math.round((x - pad) / step);
    if (idx < 0 || idx >= values.length) {
      setHover(null);
      return;
    }

    const { x: hx, y: hy } = xyAt(idx);
    setHover({ idx, x: hx, y: hy, value: values[idx], label: labels[idx] });
  };

  const labelEvery = values.length > 14 ? 2 : 1;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      className="ad-svg"
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
    >
      <defs>
        <filter id="lineSoftGlowHot" x="-30%" y="-30%" width="160%" height="200%">
          <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="rgba(255,60,0,0.30)" />
        </filter>

        <linearGradient id="areaHot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,60,0,0.18)" />
          <stop offset="70%" stopColor="rgba(255,60,0,0.06)" />
          <stop offset="100%" stopColor="rgba(255,60,0,0.00)" />
        </linearGradient>
      </defs>

      <GridLinesClean width={width} height={height} pad={pad} baseH={0} />

      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="rgba(15,23,42,0.12)" strokeWidth="3" />

      {!hasData && (
        <text x={width / 2} y={height / 2} textAnchor="middle" fill="rgba(100,116,139,0.9)" fontSize="40" fontWeight="900">
          {emptyLabel || "No data"}
        </text>
      )}

      {hasData && (
        <>
          <path d={`${path} L ${pad + (values.length - 1) * step} ${height - pad} L ${pad} ${height - pad} Z`} fill="url(#areaHot)" />

          <path
            d={path}
            fill="none"
            stroke="rgba(255,60,0,0.22)"
            strokeWidth="28"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#lineSoftGlowHot)"
          />

          <path d={path} fill="none" stroke={stroke} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />

          {labels.map((lab, i) => {
            if (i % labelEvery !== 0 && i !== labels.length - 1) return null;
            const x = pad + i * step;
            return (
              <g key={`xlab-${i}`}>
                <line x1={x} y1={height - pad} x2={x} y2={height - pad + 10} stroke="rgba(15,23,42,0.12)" strokeWidth="3" />
                <text x={x} y={height - pad + 42} textAnchor="middle" fill="rgba(100,116,139,0.92)" fontSize="24" fontWeight="900">
                  {String(lab).slice(0, 12)}
                </text>
              </g>
            );
          })}

          {hover && (
            <g>
              <line x1={hover.x} y1={pad} x2={hover.x} y2={height - pad} stroke="rgba(15,23,42,0.12)" strokeWidth="4" />
              <circle cx={hover.x} cy={hover.y} r="18" fill={stroke} />
              <circle cx={hover.x} cy={hover.y} r="34" fill="rgba(255,60,0,0.14)" />
              <TooltipClean x={hover.x} y={Math.max(pad + 12, hover.y - 20)} title={hover.label || "Value"} value={hover.value} />
            </g>
          )}
        </>
      )}
    </svg>
  );
}

function GridLinesClean({ width, height, pad, baseH }) {
  const lines = 6;
  const top = pad;
  const bottom = height - pad - (baseH || 0);
  const innerH = bottom - top;
  const step = innerH / lines;

  return (
    <g>
      {Array.from({ length: lines + 1 }).map((_, i) => {
        const y = top + i * step;
        return (
          <line
            key={i}
            x1={pad}
            y1={y}
            x2={width - pad}
            y2={y}
            stroke="var(--grid)"
            strokeWidth="3"
          />
        );
      })}
    </g>
  );
}

function TooltipClean({ x, y, title, value }) {
  const w = 520;
  const h = 150;
  const left = clamp(x - w / 2, 16, 2200 - w - 16);
  const top = Math.max(16, y - h - 18);

  return (
    <g transform={`translate(${left}, ${top})`}>
      <rect x="0" y="0" width={w} height={h} rx="26" fill="var(--tooltipBg)" stroke="var(--tooltipBorder)" strokeWidth="2" />
      <rect x="0" y="0" width="10" height={h} rx="26" fill="var(--main)" opacity="0.95" />
      <text x="30" y="58" fill="var(--tooltipSub)" fontSize="26" fontWeight="900">
        {String(title || "—")}
      </text>
      <text x="30" y="112" fill="var(--tooltipText)" fontSize="54" fontWeight="1000">
        {String(value ?? "—")}
      </text>
    </g>
  );
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function shade(hex, pct) {
  const h = (hex || "").replace("#", "");
  if (h.length !== 6) return hex;
  const num = parseInt(h, 16);
  let r = (num >> 16) & 255;
  let g = (num >> 8) & 255;
  let b = num & 255;
  r = Math.round((r * (100 + pct)) / 100);
  g = Math.round((g * (100 + pct)) / 100);
  b = Math.round((b * (100 + pct)) / 100);
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `rgb(${r},${g},${b})`;
}