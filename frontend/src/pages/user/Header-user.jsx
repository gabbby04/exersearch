// src/components/header/HeaderUser.jsx
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import "./HeaderUser.css";
import fallbackLogo from "../../assets/exersearchlogo.png";
import { useAuth } from "../../authcon";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Flame,
  Utensils,
  Bell,
  ChevronDown,
  UserCircle,
  Heart,
  LogOut,
  Dumbbell,
  Trophy,
  MessageCircle,
  Settings,
  Sun,
  Moon,
  X
} from "lucide-react";
import { api } from "../../utils/apiClient";
import { useTheme } from "../../pages/user/ThemeContext";

import {
  listNotifications,
  getUnreadNotificationsCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../../utils/notificationApi";

const FALLBACK_AVATAR = "/defaulticon.png";
const UI_MODE_KEY = "ui_mode";

const ROLE_LEVEL = { user: 1, owner: 2, superadmin: 3 };

function roleLevel(role) {
  return ROLE_LEVEL[role] ?? 0;
}

function hasAtLeastRole(role, required) {
  return roleLevel(role) >= roleLevel(required);
}

function toAbsUrl(u) {
  if (!u) return "";
  const s = String(u).trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;

  const base = String(api.defaults.baseURL || "").replace(/\/api\/v1\/?$/, "");
  const path = s.startsWith("/") ? s : `/${s}`;
  return `${base}${path}`;
}

function allowedUiModesForRole(role) {
  const lvl = roleLevel(role);
  const modes = [];
  if (lvl >= ROLE_LEVEL.owner) modes.push("owner");
  if (lvl >= ROLE_LEVEL.superadmin) modes.push("superadmin");
  return modes;
}

function routeForUiMode(mode) {
  if (mode === "owner") return "/owner/home";
  if (mode === "superadmin") return "/admin/dashboard";
  return "/home";
}

function labelForUiMode(mode) {
  if (mode === "owner") return "Owner UI";
  if (mode === "superadmin") return "Admin UI";
  return "";
}

function iconForNotifType(type) {
  const t = String(type || "").toLowerCase();
  if (t.includes("workout")) return Flame;
  if (t.includes("meal")) return Utensils;
  if (t.includes("saved") || t.includes("follow")) return Heart;
  if (t.includes("membership")) return Trophy;
  if (t.includes("inquiry") || t.includes("message")) return MessageCircle;
  return Bell;
}

export default function HeaderUser() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // USE THEME CONTEXT
  const { isDark, toggleTheme } = useTheme();

  const [me, setMe] = useState(null);
  const [meLoading, setMeLoading] = useState(false);
  const [userLogoUrl, setUserLogoUrl] = useState("");

  const token = localStorage.getItem("token");
  const effectiveUser = user || me;

  const currentUi = useMemo(() => {
    const p = String(location.pathname || "");
    if (p.startsWith("/owner")) return "owner";
    if (p.startsWith("/admin")) return "superadmin";
    return "user";
  }, [location.pathname]);

  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifErr, setNotifErr] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth <= 700);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadMe() {
      if (!token) return;
      setMeLoading(true);
      try {
        const res = await api.get("/me");
        if (!mounted) return;
        setMe(res.data?.user || res.data || null);
      } catch (err) {
        console.log("[HeaderUser] /me failed:", err?.response?.status);
      } finally {
        if (mounted) setMeLoading(false);
      }
    }

    if (!user && !me && token) loadMe();

    return () => {
      mounted = false;
    };
  }, [user, me, token]);

  useEffect(() => {
    let mounted = true;

    async function loadUserLogo() {
      try {
        const res = await api.get("/settings/public");
        const data = res.data?.data ?? res.data;
        const url = data?.user_logo_url || "";

        if (!mounted) return;
        setUserLogoUrl(toAbsUrl(url));
      } catch {
        if (mounted) setUserLogoUrl("");
      }
    }

    loadUserLogo();

    return () => {
      mounted = false;
    };
  }, []);

  const avatarSrc = useMemo(() => {
    const u = effectiveUser;
    if (!u) return FALLBACK_AVATAR;

    let raw = "";

    if (currentUi === "user") {
      raw =
        u?.user_profile?.profile_photo_url ||
        u?.userProfile?.profile_photo_url ||
        u?.owner_profile?.profile_photo_url ||
        u?.ownerProfile?.profile_photo_url ||
        u?.admin_profile?.avatar_url ||
        u?.adminProfile?.avatar_url ||
        u?.avatar_url ||
        u?.profile_photo_url ||
        u?.photoURL ||
        u?.avatar ||
        "";
    } else if (currentUi === "owner") {
      raw =
        u?.owner_profile?.profile_photo_url ||
        u?.ownerProfile?.profile_photo_url ||
        u?.user_profile?.profile_photo_url ||
        u?.userProfile?.profile_photo_url ||
        u?.admin_profile?.avatar_url ||
        u?.adminProfile?.avatar_url ||
        u?.avatar_url ||
        u?.profile_photo_url ||
        u?.photoURL ||
        u?.avatar ||
        "";
    } else {
      raw =
        u?.admin_profile?.avatar_url ||
        u?.adminProfile?.avatar_url ||
        u?.user_profile?.profile_photo_url ||
        u?.userProfile?.profile_photo_url ||
        u?.owner_profile?.profile_photo_url ||
        u?.ownerProfile?.profile_photo_url ||
        u?.avatar_url ||
        u?.profile_photo_url ||
        u?.photoURL ||
        u?.avatar ||
        "";
    }

    if (!raw) return FALLBACK_AVATAR;
    if (String(raw).startsWith("http")) return raw;
    return toAbsUrl(raw);
  }, [effectiveUser, currentUi]);

  const displayName = effectiveUser?.name || (meLoading ? "Loading..." : "User");
  const displayEmail = effectiveUser?.email || "";
  const isOwnerPlus = hasAtLeastRole(effectiveUser?.role, "owner");
  const switchModes = isOwnerPlus ? allowedUiModesForRole(effectiveUser?.role) : [];

  const handleSwitchUi = useCallback(
    (mode) => {
      localStorage.setItem(UI_MODE_KEY, mode);
      setProfileOpen(false);
      setNotifOpen(false);
      setMobileMenuOpen(false);
      navigate(routeForUiMode(mode));
    },
    [navigate]
  );

  const handleLogout = useCallback(
    (e) => {
      if (e?.preventDefault) e.preventDefault();
      setProfileOpen(false);
      setNotifOpen(false);
      setMobileMenuOpen(false);
      logout();
      navigate("/login", { replace: true });
    },
    [logout, navigate]
  );

  const themeLabel = isDark ? "Switch to Light Mode" : "Switch to Dark Mode";
  const ThemeIcon = isDark ? Sun : Moon;

  useEffect(() => {
    function onDocClick(e) {
      if (notifOpen && notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (profileOpen && profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    }

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [notifOpen, profileOpen]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.pageYOffset > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const refreshUnread = useCallback(async () => {
    if (!token) return;
    try {
      const c = await getUnreadNotificationsCount();
      setUnreadCount(c);
    } catch {
      // ignore
    }
  }, [token]);

  const loadNotifs = useCallback(async () => {
    if (!token) return;
    setNotifLoading(true);
    setNotifErr("");
    try {
      const paged = await listNotifications({ page: 1, per_page: 20 });
      setNotifications(paged.data || []);
    } catch {
      setNotifErr("Failed to load notifications.");
    } finally {
      setNotifLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refreshUnread();
    const onFocus = () => refreshUnread();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshUnread]);

  const appLogo = userLogoUrl || fallbackLogo;

  return (
    <>
      {isScrolled && (
        <div className="uhd-top-logo uhd-top-logo--scrolled">
          <div
            style={{ cursor: "pointer" }}
            onClick={() => {
              setMobileMenuOpen(false);
              setNotifOpen(false);
              setProfileOpen(false);
              navigate("/home");
            }}
          >
            <img
              src={appLogo}
              alt="ExerSearch Logo"
              onError={(e) => {
                e.currentTarget.src = fallbackLogo;
              }}
            />
          </div>
        </div>
      )}

      <header className={`uhd-header ${isScrolled ? "uhd-header--scrolled" : ""}`}>
        <div
          className="uhd-logo"
          onClick={() => {
            setMobileMenuOpen(false);
            setNotifOpen(false);
            setProfileOpen(false);
            navigate("/home");
          }}
          style={{ cursor: "pointer" }}
        >
          <img
            src={appLogo}
            alt="ExerSearch"
            onError={(e) => {
              e.currentTarget.src = fallbackLogo;
            }}
          />
        </div>


        <div className="uhd-header__actions">
          <Link to="/home/workout" className="uhd-chip uhd-chip--fire" onClick={() => setMobileMenuOpen(false)}>
            <Flame size={12} /> Workout Plan
          </Link>

          <Link to="/home/find-gyms" className="uhd-chip uhd-chip--find" onClick={() => setMobileMenuOpen(false)}>
            <Dumbbell size={12} /> Find Gyms
          </Link>

          <Link to="/home/meal-plan" className="uhd-chip uhd-chip--meal" onClick={() => setMobileMenuOpen(false)}>
            <Utensils size={12} /> Meal Plan
          </Link>

          <div className="uhd-notif-wrap" ref={notifRef}>
            <button
              type="button"
              className={`uhd-notif ${unreadCount > 0 ? "has-unread" : ""}`}
              onClick={() => {
                setNotifOpen((o) => {
                  const next = !o;
                  if (next) loadNotifs();
                  return next;
                });
                setProfileOpen(false);
              }}
            >
              <Bell size={16} />
              {unreadCount > 0 && <span className="uhd-notif__dot" />}
            </button>

            {notifOpen && (
              <div className="uhd-notif-pop">
                <div className="uhd-notif-pop__hdr">
                  <span>Notifications</span>

                  <div className="uhd-notif-actions">
                    <button
                      type="button"
                      className="uhd-notif-clear"
                      onClick={async () => {
                        try {
                          await markAllNotificationsRead();
                          setNotifications((prev) => prev.map((x) => ({ ...x, unread: false })));
                          setUnreadCount(0);
                        } catch {
                          // ignore
                        }
                      }}
                    >
                      Mark all as read
                    </button>

                    <button type="button" className="uhd-notif-close" onClick={() => setNotifOpen(false)}>
                      <X size={14} />
                    </button>
                  </div>
                </div>

                <div className="uhd-notif-pop__list">
                  {notifLoading && <div className="uhd-notif-empty">Loading...</div>}
                  {!notifLoading && notifErr && <div className="uhd-notif-empty">{notifErr}</div>}
                  {!notifLoading && !notifErr && notifications.length === 0 && (
                    <div className="uhd-notif-empty">All caught up!</div>
                  )}

                  {!notifLoading &&
                    !notifErr &&
                    notifications.map((n) => {
                      const Icon = iconForNotifType(n.type);
                      return (
                        <button
                          key={n.id}
                          type="button"
                          className={`uhd-notif-item ${n.unread ? "unread" : ""}`}
                          onClick={async () => {
                            setNotifications((prev) =>
                              prev.map((x) => (x.id === n.id ? { ...x, unread: false } : x))
                            );
                            setUnreadCount((c) => Math.max(0, c - (n.unread ? 1 : 0)));

                            try {
                              await markNotificationRead(n.id);
                            } catch {
                              refreshUnread();
                              loadNotifs();
                            }
                          }}
                        >
                          <div className="uhd-notif-icon">
                            <Icon size={14} />
                          </div>

                          <div className="uhd-notif-body">
                            <p>{n.title}</p>
                            <span>{n.message}</span>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          <div className="uhd-profile-wrap" ref={profileRef}>
            <button
              type="button"
              className="uhd-profile-btn"
              onClick={() => {
                setProfileOpen((o) => !o);
                setNotifOpen(false);
              }}
            >
              <div className="uhd-profile-avatar">
                <img
                  src={avatarSrc}
                  alt="Profile"
                  className="uhd-profile-avatar__img"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = "flex";
                  }}
                />
                <span className="uhd-profile-avatar__fallback">
                  {String(displayName || "U").trim().charAt(0).toUpperCase()}
                </span>
              </div>

              <ChevronDown size={13} className={`uhd-profile-chevron ${profileOpen ? "open" : ""}`} />
            </button>

            {profileOpen && (
              <div className="uhd-profile-pop">
                <div className="uhd-profile-pop__top">
                  <div className="uhd-profile-pop__bigavatar">
                    <img
                      src={avatarSrc}
                      alt="Profile"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = "flex";
                      }}
                    />
                    <span>{String(displayName || "U").trim().charAt(0).toUpperCase()}</span>
                  </div>

                  <div>
                    <p className="uhd-profile-pop__name">{displayName}</p>
                    <p className="uhd-profile-pop__email">{displayEmail || " "}</p>
                  </div>
                </div>

                <div className="uhd-profile-pop__menu">
                  <Link to="/home/profile" className="uhd-profile-menu-item" onClick={() => setProfileOpen(false)}>
                    <div className="uhd-pmi-icon" style={{ background: "#eff6ff", color: "#3b82f6" }}>
                      <UserCircle size={15} />
                    </div>
                    My Profile
                  </Link>

                  {isMobileView && (
                    <>
                      <Link
                        to="/home/workout"
                        className="uhd-profile-menu-item"
                        onClick={() => setProfileOpen(false)}
                      >
                        <div className="uhd-pmi-icon" style={{ background: "#fff7ed", color: "#ea580c" }}>
                          <Flame size={15} />
                        </div>
                        Workout Plan
                      </Link>

                      <Link
                        to="/home/find-gyms"
                        className="uhd-profile-menu-item"
                        onClick={() => setProfileOpen(false)}
                      >
                        <div className="uhd-pmi-icon" style={{ background: "#eff6ff", color: "#2563eb" }}>
                          <Dumbbell size={15} />
                        </div>
                        Find Gyms
                      </Link>

                      <Link
                        to="/home/meal-plan"
                        className="uhd-profile-menu-item"
                        onClick={() => setProfileOpen(false)}
                      >
                        <div className="uhd-pmi-icon" style={{ background: "#f0fdf4", color: "#16a34a" }}>
                          <Utensils size={15} />
                        </div>
                        Meal Plan
                      </Link>
                    </>
                  )}

                  <Link to="/home/saved-gyms" className="uhd-profile-menu-item" onClick={() => setProfileOpen(false)}>
                    <div className="uhd-pmi-icon" style={{ background: "#fef2f2", color: "#ef4444" }}>
                      <Heart size={15} />
                    </div>
                    Saved Gyms
                  </Link>

                  <Link
                    to="/home/memberships"
                    className="uhd-profile-menu-item"
                    onClick={() => setProfileOpen(false)}
                  >
                    <div className="uhd-pmi-icon" style={{ background: "#fff7ed", color: "#f59e0b" }}>
                      <Trophy size={15} />
                    </div>
                    Memberships
                  </Link>

                  <Link
                    to="/home/inquiries"
                    className="uhd-profile-menu-item"
                    onClick={() => setProfileOpen(false)}
                  >
                    <div className="uhd-pmi-icon" style={{ background: "#f5f3ff", color: "#8b5cf6" }}>
                      <MessageCircle size={15} />
                    </div>
                    Inquiries
                  </Link>

                  <button type="button" className="uhd-profile-menu-item" onClick={toggleTheme}>
                    <div className="uhd-pmi-icon" style={{ background: "#ecfeff", color: "#0891b2" }}>
                      <ThemeIcon size={15} />
                    </div>
                    {themeLabel}
                  </button>

                  {isOwnerPlus && switchModes.length > 0 && (
                    <>
                      <div className="uhd-profile-pop__divider" />
                      {switchModes.map((m) => (
                        <button
                          key={m}
                          type="button"
                          className="uhd-profile-menu-item"
                          onClick={() => handleSwitchUi(m)}
                        >
                          <div className="uhd-pmi-icon" style={{ background: "#f3f4f6", color: "#111827" }}>
                            <Settings size={15} />
                          </div>
                          Switch to {labelForUiMode(m)}
                        </button>
                      ))}
                    </>
                  )}

                  <div className="uhd-profile-pop__divider" />

                  <button
                    type="button"
                    className="uhd-profile-menu-item uhd-profile-menu-item--logout"
                    onClick={handleLogout}
                  >
                    <div className="uhd-pmi-icon" style={{ background: "#fef2f2", color: "#ef4444" }}>
                      <LogOut size={15} />
                    </div>
                    Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="uhd-hamburger" onClick={() => setMobileMenuOpen((p) => !p)}>
          <span />
          <span />
          <span />
        </div>
      </header>

      <div className={`uhd-mobile-menu ${mobileMenuOpen ? "open" : ""}`}>
        <Link to="/home" onClick={() => setMobileMenuOpen(false)}>
          DASHBOARD
        </Link>
        <Link to="/home/saved-gyms" onClick={() => setMobileMenuOpen(false)}>
          SAVED GYMS
        </Link>
        <Link to="/home/find-gyms" onClick={() => setMobileMenuOpen(false)}>
          FIND GYMS
        </Link>
        <Link to="/home/workout" onClick={() => setMobileMenuOpen(false)}>
          WORKOUT PLAN
        </Link>
        <Link to="/home/meal-plan" onClick={() => setMobileMenuOpen(false)}>
          MEAL PLAN
        </Link>
        <Link to="/home/memberships" onClick={() => setMobileMenuOpen(false)}>
          MEMBERSHIPS
        </Link>
        <Link to="/home/inquiries" onClick={() => setMobileMenuOpen(false)}>
          INQUIRIES
        </Link>
        <Link to="/home/profile" onClick={() => setMobileMenuOpen(false)}>
          MY PROFILE
        </Link>

        <button
          type="button"
          className="uhd-mobile-menu__action"
          onClick={() => {
            toggleTheme();
            setMobileMenuOpen(false);
          }}
        >
          {isDark ? "SWITCH TO LIGHT MODE" : "SWITCH TO DARK MODE"}
        </button>

        {isOwnerPlus &&
          switchModes.map((m) => (
            <button
              key={m}
              type="button"
              className="uhd-mobile-menu__action"
              onClick={() => handleSwitchUi(m)}
            >
              SWITCH TO {labelForUiMode(m).toUpperCase()}
            </button>
          ))}

        <Link to="/login" onClick={handleLogout}>
          LOGOUT
        </Link>
      </div>
    </>
  );
}