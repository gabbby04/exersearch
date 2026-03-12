import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./Memberships.css";
import exersearchLogo from "../../assets/exersearchlogo.png";
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Dumbbell,
  CalendarDays,
  ChevronRight,
  RotateCw,
  Sparkles,
  History,
} from "lucide-react";
import Swal from "sweetalert2";
import { gsap } from "gsap";
import { getMyMemberships } from "../../utils/membershipApi";
import { api } from "../../utils/apiClient";

function safeArr(v) {
  if (Array.isArray(v)) return v;
  if (v && Array.isArray(v.data)) return v.data;
  return [];
}

function fmtDate(d) {
  if (!d) return "-";
  const dt = new Date(String(d));
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString();
}

function statusMeta(status) {
  const s = String(status || "").toLowerCase();

  if (s === "active") {
    return {
      label: "Active",
      cls: "um-status um-status--active",
      Icon: CheckCircle2,
    };
  }

  if (s === "intent") {
    return {
      label: "Intent",
      cls: "um-status um-status--intent",
      Icon: Clock,
    };
  }

  if (s === "expired") {
    return {
      label: "Expired",
      cls: "um-status um-status--expired",
      Icon: AlertTriangle,
    };
  }

  if (s === "cancelled") {
    return {
      label: "Cancelled",
      cls: "um-status um-status--cancelled",
      Icon: XCircle,
    };
  }

  if (s === "rejected") {
    return {
      label: "Rejected",
      cls: "um-status um-status--rejected",
      Icon: XCircle,
    };
  }

  return {
    label: status || "Unknown",
    cls: "um-status",
    Icon: AlertTriangle,
  };
}

function toMs(d) {
  if (!d) return null;
  const dt = new Date(String(d));
  const t = dt.getTime();
  if (Number.isNaN(t)) return null;
  return t;
}

function calcCountdown(endDate) {
  const endMs = toMs(endDate);
  if (!endMs) return null;

  const now = Date.now();
  let diff = endMs - now;
  if (diff < 0) diff = 0;

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / (24 * 3600));

  return { days, totalSeconds };
}

function isActive(m) {
  return String(m?.status || "").toLowerCase() === "active";
}

function membershipKey(m) {
  return String(m.membership_id ?? m.id ?? `${m.gym_id}-${m.user_id}-${m.created_at}`);
}

export default function Memberships() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [sideTab, setSideTab] = useState("memberships");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [publicSettings, setPublicSettings] = useState(null);

  const tickRef = useRef(null);

  const logoObjectRef = useRef(null);
  const logoPulseTweenRef = useRef(null);
  const logoSpinningRef = useRef(false);

  const depthLayers = useMemo(() => Array.from({ length: 14 }, (_, i) => i), []);
  const memberships = useMemo(() => safeArr(rows), [rows]);

  const activeList = useMemo(() => {
    return memberships.filter((m) => String(m.status || "").toLowerCase() === "active");
  }, [memberships]);

  const historyList = useMemo(() => {
    return memberships.filter((m) => String(m.status || "").toLowerCase() !== "active");
  }, [memberships]);

  const sideItems = useMemo(() => {
    return sideTab === "memberships" ? activeList : historyList;
  }, [sideTab, activeList, historyList]);

  const pageMeta = useMemo(() => {
    const cur = rows?.current_page || page;
    const last = rows?.last_page || 1;
    const total = rows?.total || memberships.length;
    return { cur, last, total };
  }, [rows, page, memberships.length]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return memberships.find((m) => membershipKey(m) === String(selectedId)) || null;
  }, [memberships, selectedId]);

  const selectedMeta = useMemo(() => {
    if (!selected) return null;
    return statusMeta(selected.status);
  }, [selected]);

  const selectedGym = selected?.gym || {};
  const selectedGymRouteId = selectedGym.gym_id ?? selectedGym.id ?? selected?.gym_id;
  const selectedDays = selected && isActive(selected) && countdown ? countdown.days : 0;
  const activeCount = activeList.length;
  const historyCount = historyList.length;
  const totalCount = pageMeta.total;

  const resolveMediaUrl = (url, fallback = "") => {
    const raw = String(url || "").trim();
    if (!raw) return fallback;

    if (/^https?:\/\//i.test(raw)) return raw;

    const apiBase = String(import.meta.env.VITE_API_BASE_URL || "").trim();
    const origin = apiBase
      ? apiBase.replace(/\/api\/v\d+\/?$/i, "").replace(/\/$/, "")
      : window.location.origin;

    return `${origin}/${raw.replace(/^\/+/, "")}`;
  };

  const brandLogoSrc = resolveMediaUrl(
    publicSettings?.user_logo_url || publicSettings?.logo_url,
    exersearchLogo
  );

  const letterLogoSrc = resolveMediaUrl(publicSettings?.letter_logo, "/letterlogo.png");

  const fetchPublicSettings = async () => {
    try {
      const res = await api.get("/settings/public");
      setPublicSettings(res?.data?.data || null);
    } catch (e) {
      console.error("Failed to load public app settings:", e);
      setPublicSettings(null);
    }
  };

  const startLogoPulse = () => {
    if (!logoObjectRef.current) return;

    if (logoPulseTweenRef.current) {
      logoPulseTweenRef.current.kill();
      logoPulseTweenRef.current = null;
    }

    gsap.set(logoObjectRef.current, {
      rotateX: -10,
      rotateY: 0,
      scale: 1,
      transformPerspective: 1600,
      transformOrigin: "50% 50%",
      force3D: true,
    });

    logoPulseTweenRef.current = gsap.to(logoObjectRef.current, {
      scale: 1.035,
      duration: 1.2,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
      force3D: true,
    });
  };

  const stopLogoPulse = () => {
    if (logoPulseTweenRef.current) {
      logoPulseTweenRef.current.kill();
      logoPulseTweenRef.current = null;
    }
  };

  const triggerLogoSpin = () => {
    if (!logoObjectRef.current || logoSpinningRef.current) return;

    logoSpinningRef.current = true;
    stopLogoPulse();

    gsap.killTweensOf(logoObjectRef.current);

    gsap.fromTo(
      logoObjectRef.current,
      {
        rotateX: -10,
        rotateY: 0,
        scale: 1,
        transformPerspective: 1600,
        transformOrigin: "50% 50%",
        force3D: true,
      },
      {
        rotateX: -10,
        rotateY: 360,
        scale: 1,
        duration: 0.9,
        ease: "power2.inOut",
        force3D: true,
        onComplete: () => {
          gsap.set(logoObjectRef.current, {
            rotateX: -10,
            rotateY: 0,
            scale: 1,
            force3D: true,
          });
          logoSpinningRef.current = false;
          startLogoPulse();
        },
      }
    );
  };

  const fetchMemberships = async (p = 1) => {
    setLoading(true);

    try {
      const data = await getMyMemberships({ page: p, per_page: 20 });
      setRows(data);

      const list = safeArr(data);

      if (list.length) {
        setSelectedId((prev) => {
          if (prev && list.some((m) => membershipKey(m) === String(prev))) {
            return prev;
          }

          const firstActive = list.find((m) => String(m.status || "").toLowerCase() === "active");
          const pick = firstActive || list[0];
          return membershipKey(pick);
        });
      } else {
        setSelectedId(null);
      }
    } catch (e) {
      Swal.fire(
        "Error",
        e?.response?.data?.message || e.message || "Failed to load memberships",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemberships(1);
    fetchPublicSettings();
  }, []);

  useEffect(() => {
    startLogoPulse();

    return () => {
      stopLogoPulse();
    };
  }, []);

  useEffect(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }

    if (!selected || !isActive(selected)) {
      setCountdown(null);
      return;
    }

    const update = () => {
      setCountdown(calcCountdown(selected.end_date));
    };

    update();
    tickRef.current = setInterval(update, 60_000);

    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [selected]);

  useEffect(() => {
    if (sideTab === "memberships" && !activeList.length && historyList.length) {
      setSideTab("history");
    } else if (sideTab === "history" && !historyList.length && activeList.length) {
      setSideTab("memberships");
    }
  }, [sideTab, activeList.length, historyList.length]);

  const handleRenew = () => {
    Swal.fire("Renewal", "Please contact the gym to renew your membership.", "info");
  };

  const renderLeftSummaryPanel = () => {
    const planType = selected?.plan_type || "No plan";
    const since = selected?.start_date ? fmtDate(selected.start_date) : "—";

    return (
      <div className="um-panel um-panel--left">
        <div className="um-panelFrame">
          <div className="um-panelHeading">
            <span className="um-kicker">Membership Core</span>
            <h2 className="um-panelTitle">Gym Status</h2>
            <p className="um-panelSub">
              Your active plans, history count, and current membership summary.
            </p>
          </div>

          <div className="um-statMatrix">
            <button
              type="button"
              className="um-statCard um-statCard--accent"
              onClick={() => setSideTab("memberships")}
            >
              <span className="um-statCard__label">Active</span>
              <span className="um-statCard__value">{activeCount}</span>
            </button>

            <button
              type="button"
              className="um-statCard"
              onClick={() => setSideTab("history")}
            >
              <span className="um-statCard__label">History</span>
              <span className="um-statCard__value">{historyCount}</span>
            </button>

            <div className="um-statCard">
              <span className="um-statCard__label">Total</span>
              <span className="um-statCard__value">{totalCount}</span>
            </div>
          </div>

          <div className="um-coreBox">
            <div className="um-coreBox__head">
              <div className="um-coreIcon">
                <Dumbbell size={18} />
              </div>

              <div>
                <div className="um-coreTitle">Selected Membership</div>
                <div className="um-coreSub">
                  {selected
                    ? selectedGym.name || "Gym membership"
                    : "Pick a membership from the right panel"}
                </div>
              </div>
            </div>

            <div className="um-coreRows">
              <div className="um-coreRow">
                <span className="um-coreLabel">Plan</span>
                <span className="um-coreValue">{planType}</span>
              </div>

              <div className="um-coreRow">
                <span className="um-coreLabel">Started</span>
                <span className="um-coreValue">{since}</span>
              </div>

              <div className="um-coreRow">
                <span className="um-coreLabel">Status</span>
                <span className="um-coreValue">
                  {selectedMeta ? (
                    <span className={selectedMeta.cls}>
                      <selectedMeta.Icon size={13} />
                      {selectedMeta.label}
                    </span>
                  ) : (
                    "Waiting"
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCenterPanel = () => {
    const noMemberships = !loading && memberships.length === 0;

    return (
      <div className="um-panel um-panel--center">
        <div className="um-centerShell">
          <div className="um-centerTop">
            <div className="um-centerBrand">
              <img
                src={brandLogoSrc}
                alt={publicSettings?.app_name || "Exersearch"}
                className="um-brandLogo"
              />
            </div>
            <div className="um-centerMode">Membership Control</div>
          </div>

          <div className="um-centerBody">
            <div className="um-centerLogoWrap">
              <div className="um-centerGlow" />
              <div
                className="um-logo3dScene"
                onClick={triggerLogoSpin}
                title="Click logo"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    triggerLogoSpin();
                  }
                }}
              >
                <div ref={logoObjectRef} className="um-logo3dObject">
                  <div className="um-logo3dGround" />

                  {depthLayers.map((i) => {
                    const z = -(depthLayers.length - i) * 1.4;
                    const x = i * 0.28;
                    const y = i * 0.12;
                    const shade = 0.22 + i * 0.035;

                    return (
                      <React.Fragment key={i}>
                        <img
                          src={letterLogoSrc}
                          alt=""
                          aria-hidden="true"
                          className="um-logo3dLayer"
                          style={{
                            transform: `translateZ(${z}px) translateX(${x}px) translateY(${y}px)`,
                            opacity: 0.9,
                            filter: `brightness(${shade})`,
                          }}
                        />

                        <img
                          src={letterLogoSrc}
                          alt=""
                          aria-hidden="true"
                          className="um-logo3dLayer"
                          style={{
                            transform: `rotateY(180deg) translateZ(${z}px) translateX(${-x}px) translateY(${y}px)`,
                            opacity: 0.25,
                            filter: `brightness(${shade - 0.08})`,
                          }}
                        />
                      </React.Fragment>
                    );
                  })}

                  <img
                    src={letterLogoSrc}
                    alt="Exersearch letter logo"
                    className="um-logo3dLayer um-logo3dLayer--front"
                    style={{ transform: "translateZ(10px)" }}
                  />

                  <img
                    src={letterLogoSrc}
                    alt=""
                    aria-hidden="true"
                    className="um-logo3dLayer um-logo3dLayer--back"
                    style={{ transform: "rotateY(180deg) translateZ(10px)" }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="um-centerBottom">
            {noMemberships ? (
              <>
                <div className="um-centerGymName">No Membership Yet</div>
                <div className="um-centerGymSub">
                  Join a gym and your selected membership details will appear here.
                </div>
              </>
            ) : (
              <>
                <div className="um-centerGymName">
                  {selected ? selectedGym.name || "Membership Selected" : "No Membership Selected"}
                </div>
                <div className="um-centerGymSub">
                  {selected
                    ? selectedGym.address || "Gym details available in the right-side panel."
                    : "Choose an item from Memberships or History to inspect it here."}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTimerMetric = ({ title, value, sub, tone = "default", icon = null }) => {
    return (
      <div className={`um-meterCard um-meterCard--${tone}`}>
        <div className="um-meterCard__ring">
          <div className="um-meterCard__inner">
            <div className="um-meterCard__value">{value}</div>
            {sub ? <div className="um-meterCard__sub">{sub}</div> : null}
          </div>
        </div>

        <div className="um-meterCard__meta">
          <div className="um-meterCard__title">{title}</div>
          {icon ? <div className="um-meterCard__icon">{icon}</div> : null}
        </div>
      </div>
    );
  };

  const renderRightMainPanel = () => {
    const hasSel = !!selected;
    const isSelActive = hasSel && isActive(selected);
    const urgent = isSelActive && selectedDays <= 3;
    const expired = isSelActive && selectedDays <= 0;

    return (
      <div className="um-panel um-panel--meters">
        <div className="um-metersShell">
          <div className="um-metersLabel">Timer</div>

          {renderTimerMetric({
            title: "Days Remaining",
            value: hasSel && isSelActive ? selectedDays : 0,
            sub: "days",
            tone: expired ? "danger" : urgent ? "warn" : "accent",
            icon: <Clock size={16} />,
          })}

          {renderTimerMetric({
            title: "End Date",
            value: hasSel ? fmtDate(selected.end_date) : "—",
            sub: selected?.plan_type || "plan",
            tone: "soft",
            icon: <CalendarDays size={16} />,
          })}

          <div className="um-meterAction">
            <button
              type="button"
              className="um-actionBtn um-actionBtn--renew"
              onClick={handleRenew}
            >
              <RotateCw size={16} />
              Renew
            </button>

            {hasSel && selectedGymRouteId ? (
              <Link className="um-actionBtn um-actionBtn--ghost" to={`/home/gym/${selectedGymRouteId}`}>
                View gym <ChevronRight size={14} />
              </Link>
            ) : (
              <button type="button" className="um-actionBtn um-actionBtn--ghost" disabled>
                View gym <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSidebarItem = (m) => {
    const gym = m.gym || {};
    const meta = statusMeta(m.status);
    const id = membershipKey(m);
    const selectedCls = String(selectedId || "") === id ? " is-selected" : "";
    const days = isActive(m) ? calcCountdown(m.end_date)?.days ?? 0 : null;

    return (
      <button
        key={id}
        type="button"
        className={`um-sideItem${selectedCls}`}
        onClick={() => setSelectedId(id)}
      >
        <div className="um-sideItem__top">
          <div className="um-sideItem__titleWrap">
            <div className="um-sideItem__title">{gym.name || "Gym"}</div>
            <div className="um-sideItem__sub">{m.plan_type || "Membership plan"}</div>
          </div>

          <div className={meta.cls}>
            <meta.Icon size={13} />
            {meta.label}
          </div>
        </div>

        <div className="um-sideItem__meta">
          <div className="um-sideMetaRow">
            <span>Start</span>
            <strong>{fmtDate(m.start_date)}</strong>
          </div>

          <div className="um-sideMetaRow">
            <span>End</span>
            <strong>{fmtDate(m.end_date)}</strong>
          </div>

          {isActive(m) ? (
            <div className="um-sideMetaRow">
              <span>Remaining</span>
              <strong>{days} days</strong>
            </div>
          ) : null}
        </div>

        <div className="um-sideItem__foot">
          <span>{gym.address || "No address listed"}</span>
          <ChevronRight size={14} />
        </div>
      </button>
    );
  };

  const renderSidebarPlaceholder = (type) => {
    const isMemberships = type === "memberships";

    return (
      <div className="um-sidePlaceholder">
        <div className="um-sidePlaceholder__icon">
          {isMemberships ? <Sparkles size={18} /> : <History size={18} />}
        </div>

        <div className="um-sidePlaceholder__title">
          {isMemberships ? "No active memberships" : "No history yet"}
        </div>

        <div className="um-sidePlaceholder__sub">
          {isMemberships
            ? "Start a gym membership and it will appear in this control panel."
            : "Past, expired, cancelled, or rejected memberships will appear here later."}
        </div>

        <Link to="/home/find-gyms" className="um-linkMini">
          Find gyms <ChevronRight size={14} />
        </Link>
      </div>
    );
  };

  const renderSidebarPanel = () => {
    return (
      <div className={`um-panel um-panel--sidebar ${sidebarCollapsed ? "is-collapsed" : ""}`}>
        <button
          type="button"
          className="um-sideCollapseBtn"
          onClick={() => setSidebarCollapsed((v) => !v)}
          title={sidebarCollapsed ? "Expand panel" : "Collapse panel"}
          aria-label={sidebarCollapsed ? "Expand panel" : "Collapse panel"}
          aria-expanded={!sidebarCollapsed}
        >
          <ChevronRight
            size={18}
            style={{
              transform: sidebarCollapsed ? "rotate(0deg)" : "rotate(180deg)",
              transition: "transform 0.2s ease",
            }}
          />
        </button>

        <div className="um-sideShell">
          {!sidebarCollapsed && (
            <>
              <div className="um-sideTabs">
                <button
                  type="button"
                  className={`um-sideTab ${sideTab === "memberships" ? "is-active" : ""}`}
                  onClick={() => setSideTab("memberships")}
                >
                  Memberships
                </button>

                <button
                  type="button"
                  className={`um-sideTab ${sideTab === "history" ? "is-active" : ""}`}
                  onClick={() => setSideTab("history")}
                >
                  History
                </button>
              </div>

              <div className="um-sideHeader">
                <div>
                  <div className="um-sideHeader__title">
                    {sideTab === "memberships" ? "Membership Panel" : "History Panel"}
                  </div>
                  <div className="um-sideHeader__sub">
                    {sideTab === "memberships"
                      ? "Select an active membership to control the main display."
                      : "Inspect your previous records and past memberships."}
                  </div>
                </div>

                <button
                  className="um-btn um-btn--mini"
                  onClick={() => fetchMemberships(pageMeta.cur)}
                  disabled={loading}
                >
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>

              <div className="um-sideContent">
                {loading ? (
                  <div className="um-skel um-skel--side">
                    <div className="um-skel__bar" />
                    <div className="um-skel__bar" />
                    <div className="um-skel__bar" />
                  </div>
                ) : sideItems.length ? (
                  sideItems.map(renderSidebarItem)
                ) : (
                  renderSidebarPlaceholder(sideTab)
                )}
              </div>

              <div className="um-sideFooter">
                <div className="um-pageInfo">
                  Page <strong>{pageMeta.cur}</strong> of <strong>{pageMeta.last}</strong>
                </div>

                <div className="um-sidePager">
                  <button
                    className="um-btn um-btn--mini"
                    disabled={pageMeta.cur <= 1 || loading}
                    onClick={() => {
                      const np = pageMeta.cur - 1;
                      setPage(np);
                      fetchMemberships(np);
                    }}
                  >
                    Prev
                  </button>

                  <button
                    className="um-btn um-btn--mini"
                    disabled={pageMeta.cur >= pageMeta.last || loading}
                    onClick={() => {
                      const np = pageMeta.cur + 1;
                      setPage(np);
                      fetchMemberships(np);
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="um-app">
      <div className="um-container">
        <div className={`um-dashboard ${sidebarCollapsed ? "is-sidebar-collapsed" : ""}`}>
          {renderLeftSummaryPanel()}
          {renderCenterPanel()}
          {renderRightMainPanel()}
          {renderSidebarPanel()}
        </div>
      </div>
    </div>
  );
}