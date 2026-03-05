// src/components/header/HeaderUser.jsx
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import fallbackLogo from "../../assets/exersearchlogo.png";
import { useAuth } from "../../authcon";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  X,
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
} from "lucide-react";

import {
  listNotifications,
  getUnreadNotificationsCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../../utils/notificationApi";

const API_BASE = "https://exersearch.test";
const FALLBACK_AVATAR = "/defaulticon.png";
const TOKEN_KEY = "token";
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
  const base = String(API_BASE || "").replace(/\/$/, "");
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

  const [searchQuery, setSearchQuery] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [me, setMe] = useState(null);
  const [meLoading, setMeLoading] = useState(false);
  const [userLogoUrl, setUserLogoUrl] = useState("");

  const token = localStorage.getItem(TOKEN_KEY);
  const effectiveUser = user || me;

  const currentUi = useMemo(() => {
    const p = String(location.pathname || "");
    if (p.startsWith("/owner")) return "owner";
    if (p.startsWith("/admin")) return "superadmin";
    return "user";
  }, [location.pathname]);

  // Notifications (real)
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifErr, setNotifErr] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function loadMe() {
      if (!token) return;
      setMeLoading(true);
      try {
        const res = await axios.get(`${API_BASE}/api/v1/me`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        if (!mounted) return;
        setMe(res.data || null);
      } catch (err) {
        console.log("[HeaderUser] /me failed:", err?.response?.status);
      } finally {
        if (mounted) setMeLoading(false);
      }
    }

    if (!user && !me && token) loadMe();
    return () => (mounted = false);
  }, [user, me, token]);

  useEffect(() => {
    let mounted = true;

    async function loadUserLogo() {
      try {
        const res = await axios.get(`${API_BASE}/api/v1/settings/public`, {
          withCredentials: true,
        });

        const data = res.data?.data ?? res.data;
        const url = data?.user_logo_url || "";

        if (!mounted) return;
        setUserLogoUrl(toAbsUrl(url));
      } catch (err) {
        if (mounted) setUserLogoUrl("");
      }
    }

    loadUserLogo();
    return () => (mounted = false);
  }, []);

  // ✅ IMPORTANT FIX: in /home UI, ALWAYS prefer user_profile first
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

  // Close popovers on outside click
  useEffect(() => {
    function onDocClick(e) {
      if (notifOpen && notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (profileOpen && profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [notifOpen, profileOpen]);

  // Header scrolled state
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.pageYOffset > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Notifications: fetch unread count
  const refreshUnread = useCallback(async () => {
    if (!token) return;
    try {
      const c = await getUnreadNotificationsCount();
      setUnreadCount(c);
    } catch (e) {
      // ignore
    }
  }, [token]);

  // Notifications: fetch list
  const loadNotifs = useCallback(async () => {
    if (!token) return;
    setNotifLoading(true);
    setNotifErr("");
    try {
      const paged = await listNotifications({ page: 1, per_page: 20 });
      setNotifications(paged.data || []);
    } catch (e) {
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
        <div className="top-logo scrolled">
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

      <header className={`header ${isScrolled ? "header--scrolled" : ""}`}>
        <div
          className="logo"
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

        <div className="uhv-header__search-wrap">
          <Search size={14} className="uhv-header__search-icon" />
          <input
            className="uhv-header__search-input"
            type="text"
            placeholder="Search gyms, areas, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="uhv-header__search-clear" type="button" onClick={() => setSearchQuery("")}>
              <X size={12} />
            </button>
          )}
        </div>

        <div className="uhv-header__actions">
          <Link to="/home/workout" className="uhv-chip uhv-chip--fire" onClick={() => setMobileMenuOpen(false)}>
            <Flame size={12} /> Workout Plan
          </Link>

          <Link to="/home/find-gyms" className="uhv-chip uhv-chip--find" onClick={() => setMobileMenuOpen(false)}>
            <Dumbbell size={12} /> Find Gyms
          </Link>

          <Link to="/home/meal-plan" className="uhv-chip uhv-chip--meal" onClick={() => setMobileMenuOpen(false)}>
            <Utensils size={12} /> Meal Plan
          </Link>

          <div className="uhv-notif-wrap" ref={notifRef}>
            <button
              type="button"
              className={"uhv-notif" + (unreadCount > 0 ? " has-unread" : "")}
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
              {unreadCount > 0 && <span className="uhv-notif__dot" />}
            </button>

            {notifOpen && (
              <div className="uhv-notif-pop">
                <div className="uhv-notif-pop__hdr">
                  <span>Notifications</span>
                  <div className="uhv-notif-actions">
                    <button
                      type="button"
                      className="uhv-notif-clear"
                      onClick={async () => {
                        try {
                          await markAllNotificationsRead();
                          setNotifications((prev) => prev.map((x) => ({ ...x, unread: false })));
                          setUnreadCount(0);
                        } catch (e) {
                          // ignore
                        }
                      }}
                    >
                      Mark all as read
                    </button>
                    <button type="button" className="uhv-notif-close" onClick={() => setNotifOpen(false)}>
                      <X size={14} />
                    </button>
                  </div>
                </div>

                <div className="uhv-notif-pop__list">
                  {notifLoading && <div className="uhv-notif-empty">Loading...</div>}
                  {!notifLoading && notifErr && <div className="uhv-notif-empty">{notifErr}</div>}

                  {!notifLoading && !notifErr && notifications.length === 0 && (
                    <div className="uhv-notif-empty">All caught up!</div>
                  )}

                  {!notifLoading &&
                    !notifErr &&
                    notifications.map((n) => {
                      const Icon = iconForNotifType(n.type);
                      return (
                        <button
                          key={n.id}
                          type="button"
                          className={"uhv-notif-item" + (n.unread ? " unread" : "")}
                          onClick={async () => {
                            // optimistic
                            setNotifications((prev) =>
                              prev.map((x) => (x.id === n.id ? { ...x, unread: false } : x))
                            );
                            setUnreadCount((c) => Math.max(0, c - (n.unread ? 1 : 0)));

                            try {
                              await markNotificationRead(n.id);
                            } catch (e) {
                              // easiest safe fallback
                              refreshUnread();
                              loadNotifs();
                            }
                          }}
                        >
                          <div className="uhv-notif-icon">
                            <Icon size={14} />
                          </div>
                          <div className="uhv-notif-body">
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

          <div className="uhv-profile-wrap" ref={profileRef}>
            <button
              type="button"
              className="uhv-profile-btn"
              onClick={() => {
                setProfileOpen((o) => !o);
                setNotifOpen(false);
              }}
            >
              <div className="uhv-profile-avatar">
                <img
                  src={avatarSrc}
                  alt="Profile"
                  className="uhv-profile-avatar__img"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = "flex";
                  }}
                />
                <span className="uhv-profile-avatar__fallback">
                  {String(displayName || "U").trim().charAt(0).toUpperCase()}
                </span>
              </div>
              <ChevronDown size={13} className={"uhv-profile-chevron" + (profileOpen ? " open" : "")} />
            </button>

            {profileOpen && (
              <div className="uhv-profile-pop">
                <div className="uhv-profile-pop__top">
                  <div className="uhv-profile-pop__bigavatar">
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
                    <p className="uhv-profile-pop__name">{displayName}</p>
                    <p className="uhv-profile-pop__email">{displayEmail || " "}</p>
                  </div>
                </div>

                <div className="uhv-profile-pop__menu">
                  <Link to="/home/profile" className="uhv-profile-menu-item" onClick={() => setProfileOpen(false)}>
                    <div className="uhv-pmi-icon" style={{ background: "#eff6ff", color: "#3b82f6" }}>
                      <UserCircle size={15} />
                    </div>
                    My Profile
                  </Link>

                  <Link to="/home/workout" className="uhv-profile-menu-item" onClick={() => setProfileOpen(false)}>
                    <div className="uhv-pmi-icon" style={{ background: "#fff7ed", color: "#ea580c" }}>
                      <Flame size={15} />
                    </div>
                    Workout Plan
                  </Link>

                  <Link to="/home/find-gyms" className="uhv-profile-menu-item" onClick={() => setProfileOpen(false)}>
                    <div className="uhv-pmi-icon" style={{ background: "#eff6ff", color: "#2563eb" }}>
                      <Dumbbell size={15} />
                    </div>
                    Find Gyms
                  </Link>

                  <Link to="/home/meal-plan" className="uhv-profile-menu-item" onClick={() => setProfileOpen(false)}>
                    <div className="uhv-pmi-icon" style={{ background: "#f0fdf4", color: "#16a34a" }}>
                      <Utensils size={15} />
                    </div>
                    Meal Plan
                  </Link>

                  <Link to="/home/saved-gyms" className="uhv-profile-menu-item" onClick={() => setProfileOpen(false)}>
                    <div className="uhv-pmi-icon" style={{ background: "#fef2f2", color: "#ef4444" }}>
                      <Heart size={15} />
                    </div>
                    Saved Gyms
                  </Link>

                  <Link to="/home/memberships" className="uhv-profile-menu-item" onClick={() => setProfileOpen(false)}>
                    <div className="uhv-pmi-icon" style={{ background: "#fff7ed", color: "#f59e0b" }}>
                      <Trophy size={15} />
                    </div>
                    Memberships
                  </Link>

                  <Link to="/home/inquiries" className="uhv-profile-menu-item" onClick={() => setProfileOpen(false)}>
                    <div className="uhv-pmi-icon" style={{ background: "#f5f3ff", color: "#8b5cf6" }}>
                      <MessageCircle size={15} />
                    </div>
                    Inquiries
                  </Link>

                  {isOwnerPlus && switchModes.length > 0 && (
                    <>
                      <div className="uhv-profile-pop__divider" />
                      {switchModes.map((m) => (
                        <button key={m} type="button" className="uhv-profile-menu-item" onClick={() => handleSwitchUi(m)}>
                          <div className="uhv-pmi-icon" style={{ background: "#f3f4f6", color: "#111827" }}>
                            <Settings size={15} />
                          </div>
                          Switch to {labelForUiMode(m)}
                        </button>
                      ))}
                    </>
                  )}

                  <div className="uhv-profile-pop__divider" />
                  <button
                    type="button"
                    className="uhv-profile-menu-item uhv-profile-menu-item--logout"
                    onClick={handleLogout}
                  >
                    <div className="uhv-pmi-icon" style={{ background: "#fef2f2", color: "#ef4444" }}>
                      <LogOut size={15} />
                    </div>
                    Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="hamburger" onClick={() => setMobileMenuOpen((p) => !p)}>
          <span />
          <span />
          <span />
        </div>
      </header>

      <div className={`mobile-menu ${mobileMenuOpen ? "open" : ""}`}>
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

        {isOwnerPlus &&
          switchModes.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => handleSwitchUi(m)}
              style={{
                background: "transparent",
                border: "none",
                textAlign: "left",
                padding: "12px 16px",
                cursor: "pointer",
                width: "100%",
              }}
            >
              Switch to {labelForUiMode(m)}
            </button>
          ))}

        <Link to="/login" onClick={handleLogout}>
          LOGOUT
        </Link>
      </div>
    </>
  );
}