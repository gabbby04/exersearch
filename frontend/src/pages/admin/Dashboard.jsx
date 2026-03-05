// src/pages/admin/AdminDashboard.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { MAIN, adminThemes } from "./AdminLayout";
import { api } from "../../utils/apiClient";
import "./AdminDashboard.css";

/* ---------------- DASHBOARD ---------------- */

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { theme } = useOutletContext();
  const t = adminThemes[theme]?.app || adminThemes.light.app;
  const isDark = theme === "dark";

  const [q, setQ] = useState("");
  const [range, setRange] = useState("30d"); // 7d | 30d | 12m

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

        // expected from backend:
        // data.recent_users  = [{ id, name/full_name/username, avatar_url, email, created_at }]
        // data.recent_owners = [{ id, name, avatar_url, email, gym_name, created_at }]
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
    return activity.filter((x) =>
      `${x.title || ""} ${x.subtitle || ""}`.toLowerCase().includes(s)
    );
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
        image: "https://assets.codepen.io/3685267/nft-dashboard-art-0.jpg",
        onOpen: () => navigate("/admin/owner-applications"),
      },
      {
        key: "k2",
        title: "Pending Gyms",
        value: safe(kpi?.pending_gyms),
        delta: rangeLabel,
        badge: "Review",
        image: "https://assets.codepen.io/3685267/nft-dashboard-art-1.jpg",
        onOpen: () => navigate("/admin/gyms"),
      },
      {
        key: "k3",
        title: "Interactions",
        value: safe(kpi?.interactions),
        delta: rangeLabel,
        badge: "Traffic",
        image: "https://assets.codepen.io/3685267/nft-dashboard-art-4.jpg",
        onOpen: () => navigate("/admin/analytics"),
      },
      {
        key: "k4",
        title: "Blocked Gyms",
        value: safe(kpi?.blocked_gyms),
        delta: "Announcements",
        badge: "Moderation",
        image: "https://assets.codepen.io/3685267/nft-dashboard-art-5.jpg",
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

  // theme -> css variables
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
    "--tooltipBg": isDark ? "rgba(3,7,18,0.92)" : "rgba(255,255,255,0.96)",
    "--tooltipText": isDark ? "rgba(255,255,255,0.95)" : "rgba(17,24,39,0.95)",
    "--tooltipBorder": isDark ? "rgba(255,255,255,0.14)" : "rgba(17,24,39,0.12)",
  };

  return (
    <div className="ad-page" style={themeVars}>
      {/* HEADER */}
      <div className="ad-topRow">
        <div>
          <div className="ad-pageTitle">Dashboard</div>
          <div className="ad-pageSub">
            {loading
              ? "Loading live stats…"
              : err
              ? "Could not load live stats"
              : "Live platform overview"}
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

      {/* ERROR */}
      {!!err && (
        <div className="ad-errorWrap">
          <div className="ad-errorBanner">{err}</div>
        </div>
      )}

      {/* KPI */}
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

      {/* MAIN ROW: LEFT (CHARTS + ACTIVITY) + RIGHT (USERS + OWNERS) */}
      <div className="ad-twoColRow">
        {/* LEFT */}
        <div className="ad-leftCol">
          <div className="ad-panel">
            <div className="ad-panelHeader">
              <div>
                <div className="ad-panelTitle">Platform activity</div>
                <div className="ad-pageSub">{rangeLabel}</div>
              </div>

              <div className="ad-panelActions">
                <select
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                  className="ad-select"
                  title="Range"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="12m">Last 12 months</option>
                </select>

                <button className="ad-btn ad-btnSoft ad-btnH38" onClick={exportJson} disabled={loading}>
                  Export
                </button>
              </div>
            </div>

            {/* BIGGER, STYLISH CHARTS */}
            <div className="ad-panelBody">
              <div className="ad-chartsGrid">
                <ChartBlock title="Applications approved">
                  <InteractiveBarChart
                    data={approvalsByMonth || []}
                    height={840} // 2x bigger
                    color="var(--main)"
                    emptyLabel={loading ? "Loading…" : "No data"}
                  />
                </ChartBlock>

                <ChartBlock title="Interactions trend">
                  <InteractiveLineChart
                    points={interactionsTrend || []}
                    height={840} // 2x bigger
                    stroke="var(--main)"
                    emptyLabel={loading ? "Loading…" : "No data"}
                  />
                </ChartBlock>
              </div>
            </div>

            {/* RECENT ACTIVITY: LIMIT 5, NO LINKS */}
            <div className="ad-panelFooter">
              <div className="ad-sectionRow">
                <div className="ad-sectionTitle">Recent activity</div>
                <div className="ad-sectionMeta">{filteredActivity.length} item(s)</div>
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

        {/* RIGHT */}
        <div className="ad-rightCol">
          <div className="ad-stickyStack">
            {/* Recent users */}
            <div className="ad-panel">
              <div className="ad-panelHeader">
                <div className="ad-panelTitle">Recent users</div>
                <div className="ad-sectionMeta">{recentUsers.length} new</div>
              </div>

              <div className="ad-sideBody">
                {recentUsers.length === 0 ? (
                  <div className="ad-emptyBox">{loading ? "Loading…" : "No recent users"}</div>
                ) : (
                  <div className="ad-userList">
                    {recentUsers.slice(0, 10).map((u, idx) => {
                      const name = u?.name || u?.full_name || u?.username || "User";
                      const avatar = u?.avatar_url || u?.avatar || u?.profile_photo_url || "";
                      const email = u?.email || "";
                      return (
                        <div key={u?.id || `${name}-${idx}`} className="ad-userRow">
                          <div className="ad-avatar">
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
                  <button
                    className="ad-btn ad-btnSoft ad-btnFull"
                    onClick={() => navigate("/admin/users")}
                    disabled={loading}
                  >
                    View all users
                  </button>
                </div>
              </div>
            </div>

            {/* Recent owners (below users) */}
            <div className="ad-panel">
              <div className="ad-panelHeader">
                <div className="ad-panelTitle">Recent owners</div>
                <div className="ad-sectionMeta">{recentOwners.length} new</div>
              </div>

              <div className="ad-sideBody">
                {recentOwners.length === 0 ? (
                  <div className="ad-emptyBox">{loading ? "Loading…" : "No recent owners"}</div>
                ) : (
                  <div className="ad-userList">
                    {recentOwners.slice(0, 10).map((o, idx) => {
                      const name = o?.name || o?.full_name || o?.username || "Owner";
                      const avatar = o?.avatar_url || o?.avatar || o?.profile_photo_url || "";
                      const gym = o?.gym_name || o?.gym || "";
                      const email = o?.email || "";
                      return (
                        <div key={o?.id || `${name}-${idx}`} className="ad-userRow">
                          <div className="ad-avatar">
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
                  <button
                    className="ad-btn ad-btnSoft ad-btnFull"
                    onClick={() => navigate("/admin/owners")}
                    disabled={loading}
                  >
                    View all owners
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

/* ---------------- CHART BLOCK ---------------- */

function ChartBlock({ title, children }) {
  return (
    <div className="ad-chartBlock">
      <div className="ad-chartTitle">{title}</div>
      <div className="ad-chartBody">{children}</div>
    </div>
  );
}

/* ---------------- INTERACTIVE CHARTS ---------------- */

function InteractiveBarChart({ data, height, color, emptyLabel }) {
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null);

  const width = 2200; // more room for bigger look
  const pad = 44;
  const gap = 18;

  const safeData = Array.isArray(data) ? data : [];
  const hasData = safeData.length > 0;

  const max = Math.max(1, ...safeData.map((d) => Number(d.value) || 0));
  const barW = hasData ? (width - pad * 2 - gap * (safeData.length - 1)) / safeData.length : 0;

  const onMove = (e) => {
    if (!hasData) return;
    const el = svgRef.current;
    if (!el) return;

    const r = el.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const x = (mx / r.width) * width;

    const idx = Math.floor((x - pad) / (barW + gap));
    if (idx < 0 || idx >= safeData.length) {
      setHover(null);
      return;
    }

    const d = safeData[idx];
    const barX = pad + idx * (barW + gap);
    const barH = ((height - pad * 2) * (Number(d.value) || 0)) / max;
    const barY = height - pad - barH;

    setHover({
      idx,
      label: d.label,
      value: d.value,
      x: barX + barW / 2,
      y: barY,
    });
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      className="ad-svg"
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
    >
      {/* grid */}
      <GridLines width={width} height={height} pad={pad} />

      {/* baseline */}
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="var(--border)" />

      {!hasData && (
        <text
          x={width / 2}
          y={height / 2}
          textAnchor="middle"
          fill="var(--muted)"
          fontSize="22"
          fontWeight="900"
        >
          {emptyLabel || "No data"}
        </text>
      )}

      {safeData.map((d, i) => {
        const v = Number(d.value) || 0;
        const h = ((height - pad * 2) * v) / max;
        const x = pad + i * (barW + gap);
        const y = height - pad - h;
        const active = hover?.idx === i;

        return (
          <g key={`${d.label}-${i}`}>
            {/* glow */}
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              rx="18"
              fill={color}
              opacity={active ? 1 : 0.82}
            />
            {active && (
              <rect
                x={x - 4}
                y={y - 4}
                width={barW + 8}
                height={h + 8}
                rx="20"
                fill="none"
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="2"
              />
            )}
          </g>
        );
      })}

      {hover && (
        <g>
          <line
            x1={hover.x}
            y1={pad}
            x2={hover.x}
            y2={height - pad}
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="2"
          />
          <circle cx={hover.x} cy={Math.max(pad, hover.y)} r="10" fill={color} />
          <Tooltip
            x={hover.x}
            y={Math.max(pad + 18, hover.y - 22)}
            title={hover.label}
            value={hover.value}
          />
        </g>
      )}
    </svg>
  );
}

function InteractiveLineChart({ points, height, stroke, emptyLabel }) {
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null);

  const width = 2200;
  const pad = 44;

  const safePoints = Array.isArray(points) ? points.map((n) => Number(n) || 0) : [];
  const hasData = safePoints.length > 1;

  const max = Math.max(1, ...safePoints);
  const min = safePoints.length ? Math.min(...safePoints) : 0;
  const span = Math.max(1, max - min);

  const step = hasData ? (width - pad * 2) / (safePoints.length - 1) : 0;

  const xyAt = (i) => {
    const x = pad + i * step;
    const y = height - pad - ((safePoints[i] - min) / span) * (height - pad * 2);
    return { x, y };
  };

  const path = hasData
    ? safePoints
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
    if (idx < 0 || idx >= safePoints.length) {
      setHover(null);
      return;
    }
    const { x: hx, y: hy } = xyAt(idx);
    setHover({ idx, x: hx, y: hy, value: safePoints[idx] });
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      className="ad-svg"
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
    >
      <GridLines width={width} height={height} pad={pad} />
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="var(--border)" />

      {!hasData && (
        <text
          x={width / 2}
          y={height / 2}
          textAnchor="middle"
          fill="var(--muted)"
          fontSize="22"
          fontWeight="900"
        >
          {emptyLabel || "No data"}
        </text>
      )}

      {hasData && (
        <>
          {/* glow under-stroke */}
          <path
            d={path}
            fill="none"
            stroke="rgba(255,122,69,0.25)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* main stroke */}
          <path
            d={path}
            fill="none"
            stroke={stroke}
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {hover && (
            <g>
              <line
                x1={hover.x}
                y1={pad}
                x2={hover.x}
                y2={height - pad}
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="2"
              />
              <circle cx={hover.x} cy={hover.y} r="12" fill={stroke} />
              <circle cx={hover.x} cy={hover.y} r="22" fill="rgba(255,122,69,0.18)" />
              <Tooltip
                x={hover.x}
                y={Math.max(pad + 18, hover.y - 22)}
                title="Value"
                value={hover.value}
              />
            </g>
          )}
        </>
      )}
    </svg>
  );
}

function GridLines({ width, height, pad }) {
  const lines = 5;
  const innerH = height - pad * 2;
  const step = innerH / lines;

  return (
    <g>
      {Array.from({ length: lines + 1 }).map((_, i) => {
        const y = pad + i * step;
        return (
          <line
            key={i}
            x1={pad}
            y1={y}
            x2={width - pad}
            y2={y}
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="1"
          />
        );
      })}
    </g>
  );
}

function Tooltip({ x, y, title, value }) {
  const w = 260;
  const h = 86;
  const left = x - w / 2;
  const top = y - h - 14;

  return (
    <g transform={`translate(${left}, ${top})`}>
      <rect
        x="0"
        y="0"
        width={w}
        height={h}
        rx="18"
        fill="var(--tooltipBg)"
        stroke="var(--tooltipBorder)"
        strokeWidth="1.5"
      />
      <text x="16" y="34" fill="var(--tooltipText)" fontSize="16" fontWeight="900">
        {String(title || "—")}
      </text>
      <text x="16" y="64" fill="var(--tooltipText)" fontSize="22" fontWeight="950">
        {String(value ?? "—")}
      </text>
    </g>
  );
}