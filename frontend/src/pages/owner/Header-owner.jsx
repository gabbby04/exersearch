import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./HeaderOwner.css";
import fallbackLogo from "../../assets/exersearchlogo.png";
import { useAuth } from "../../authcon";
import {
  Home as HomeIcon,
  Inbox,
  Building2,
  FilePlus2,
  UserCircle,
  Bell,
  X,
  ChevronDown,
  LogOut,
  Settings,
} from "lucide-react";

import {
  listNotifications,
  getUnreadNotificationsCount,
  markNotificationRead,
  markAllNotificationsRead,
  getNotificationUrl,
} from "../../utils/notificationApi";

const API_BASE = "https://exersearch.test";
const FALLBACK_AVATAR = "https://i.pravatar.cc/60?img=12";
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
function routeForUiMode(mode) {
  if (mode === "owner") return "/owner/home";
  if (mode === "superadmin") return "/admin/dashboard";
  return "/home";
}
function labelForUiMode(mode) {
  if (mode === "user") return "User UI";
  if (mode === "superadmin") return "Admin UI";
  if (mode === "owner") return "Owner UI";
  return "";
}

export default function HeaderOwner() {
  const ROLE = "owner";

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const displayName = effectiveUser?.name || (meLoading ? "Loading..." : "Owner");
  const displayEmail = effectiveUser?.email || "";

  const isOwnerPlus = hasAtLeastRole(effectiveUser?.role, "owner");

  const currentUi = useMemo(() => {
    const p = String(location.pathname || "");
    if (p.startsWith("/owner")) return "owner";
    if (p.startsWith("/admin")) return "superadmin";
    return "user";
  }, [location.pathname]);

  const switchModes = useMemo(() => {
    if (!isOwnerPlus) return [];
    const lvl = roleLevel(effectiveUser?.role);
    const modes = ["user"];
    if (lvl >= ROLE_LEVEL.superadmin) modes.push("superadmin");
    return modes.filter((m) => m !== currentUi);
  }, [isOwnerPlus, effectiveUser?.role, currentUi]);

  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifErr, setNotifErr] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    if (!token) return;
    try {
      const c = await getUnreadNotificationsCount({ role: ROLE });
      setUnreadCount(Number(c) || 0);
    } catch {
      try {
        const paged = await listNotifications({ role: ROLE, page: 1, per_page: 50 });
        const unread = (paged?.data || []).filter((n) => !n.is_read).length;
        setUnreadCount(unread);
      } catch {
        setUnreadCount(0);
      }
    }
  }, [token]);

  const loadNotifs = useCallback(async () => {
    if (!token) return;
    setNotifLoading(true);
    setNotifErr("");
    try {
      const paged = await listNotifications({ role: ROLE, page: 1, per_page: 20 });
      setNotifications(paged?.data || []);
    } catch {
      setNotifErr("Failed to load notifications.");
      setNotifications([]);
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
        console.log("[HeaderOwner] /me failed:", err?.response?.status);
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
        const res = await axios.get(`${API_BASE}/api/v1/settings/public`, { withCredentials: true });
        const data = res.data?.data ?? res.data;
        const url = data?.user_logo_url || "";
        if (!mounted) return;
        setUserLogoUrl(toAbsUrl(url));
      } catch {
        if (mounted) setUserLogoUrl("");
      }
    }
    loadUserLogo();
    return () => (mounted = false);
  }, []);

  const avatarSrc = useMemo(() => {
    const u = effectiveUser;
    if (!u) return FALLBACK_AVATAR;

    let raw = "";

    if (currentUi === "owner") {
      raw =
        u?.owner_profile?.profile_photo_url ||
        u?.ownerProfile?.profile_photo_url ||
        u?.user_profile?.profile_photo_url ||
        u?.userProfile?.profile_photo_url ||
        u?.profile_photo_url ||
        u?.avatar_url ||
        u?.photoURL ||
        u?.avatar ||
        "";
    } else if (currentUi === "superadmin") {
      raw =
        u?.admin_profile?.avatar_url ||
        u?.adminProfile?.avatar_url ||
        u?.owner_profile?.profile_photo_url ||
        u?.ownerProfile?.profile_photo_url ||
        u?.user_profile?.profile_photo_url ||
        u?.userProfile?.profile_photo_url ||
        u?.profile_photo_url ||
        u?.avatar_url ||
        u?.photoURL ||
        u?.avatar ||
        "";
    } else {
      raw =
        u?.user_profile?.profile_photo_url ||
        u?.userProfile?.profile_photo_url ||
        u?.owner_profile?.profile_photo_url ||
        u?.ownerProfile?.profile_photo_url ||
        u?.admin_profile?.avatar_url ||
        u?.adminProfile?.avatar_url ||
        u?.profile_photo_url ||
        u?.avatar_url ||
        u?.photoURL ||
        u?.avatar ||
        "";
    }

    if (!raw) return FALLBACK_AVATAR;
    if (String(raw).startsWith("http")) return raw;
    return toAbsUrl(raw);
  }, [effectiveUser, currentUi]);

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
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  const appLogo = userLogoUrl || fallbackLogo;

  const TOP_LINKS = [
    { to: "/owner/home", icon: HomeIcon, label: "Home", chipClass: "uhv-chip--find" },
    { to: "/owner/inbox", icon: Inbox, label: "Inbox", chipClass: "uhv-chip--meal" },
    { to: "/owner/view-gyms", icon: Building2, label: "View Gyms", chipClass: "uhv-chip--fire" },
  ];

  const hasUnreadDot = unreadCount > 0 || notifications.some((n) => !n?.is_read);

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
              navigate("/owner/home");
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
            navigate("/owner/home");
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

        <div className="uhv-header__actions">
          {TOP_LINKS.map(({ to, icon: Icon, label, chipClass }) => (
            <Link key={to} to={to} className={`uhv-chip ${chipClass}`} onClick={() => setMobileMenuOpen(false)}>
              <Icon size={12} /> {label}
            </Link>
          ))}

          <div className="uhv-notif-wrap" ref={notifRef}>
            <button
              type="button"
              className={"uhv-notif" + (hasUnreadDot ? " has-unread" : "")}
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
              {hasUnreadDot && <span className="uhv-notif__dot" />}
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
                          await markAllNotificationsRead({ role: ROLE });
                          setNotifications((prev) => (prev || []).map((x) => ({ ...x, is_read: true })));
                          setUnreadCount(0);
                        } catch {}
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
                    notifications.map((n) => (
                      <button
                        key={n.notification_id ?? n.id}
                        type="button"
                        className={"uhv-notif-item" + (!n.is_read ? " unread" : "")}
                        onClick={async () => {
                          const id = n.notification_id ?? n.id;

                          setNotifications((prev) =>
                            (prev || []).map((x) =>
                              (x.notification_id ?? x.id) === id ? { ...x, is_read: true } : x
                            )
                          );
                          setUnreadCount((c) => Math.max(0, c - (!n.is_read ? 1 : 0)));

                          try {
                            await markNotificationRead(id, { role: ROLE });
                          } catch {
                            refreshUnread();
                            loadNotifs();
                          }

                          const href = getNotificationUrl(n) || n?.meta?.href || n?.meta?.url || "";
                          if (href) {
                            setNotifOpen(false);
                            navigate(String(href));
                          }
                        }}
                      >
                        <div className="uhv-notif-body" style={{ paddingLeft: 2 }}>
                          <p>{n.title}</p>
                          <span>{n.body}</span>
                        </div>
                      </button>
                    ))}
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
                  {String(displayName || "O").trim().charAt(0).toUpperCase()}
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
                    <span>{String(displayName || "O").trim().charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="uhv-profile-pop__name">{displayName}</p>
                    <p className="uhv-profile-pop__email">{displayEmail || " "}</p>
                  </div>
                </div>

                <div className="uhv-profile-pop__menu">
                  <Link to="/owner/inbox" className="uhv-profile-menu-item" onClick={() => setProfileOpen(false)}>
                    <div className="uhv-pmi-icon" style={{ background: "#ecfdf5", color: "#10b981" }}>
                      <Inbox size={15} />
                    </div>
                    Inbox
                  </Link>

                  <Link to="/owner/view-gyms" className="uhv-profile-menu-item" onClick={() => setProfileOpen(false)}>
                    <div className="uhv-pmi-icon" style={{ background: "#fff7ed", color: "#d23f0b" }}>
                      <Building2 size={15} />
                    </div>
                    View Gyms
                  </Link>

                  <Link
                    to="/owner/gym-application"
                    className="uhv-profile-menu-item"
                    onClick={() => setProfileOpen(false)}
                  >
                    <div className="uhv-pmi-icon" style={{ background: "#fff7ed", color: "#f59e0b" }}>
                      <FilePlus2 size={15} />
                    </div>
                    Gym Application
                  </Link>

                  <Link to="/owner/profile" className="uhv-profile-menu-item" onClick={() => setProfileOpen(false)}>
                    <div className="uhv-pmi-icon" style={{ background: "#eff6ff", color: "#3b82f6" }}>
                      <UserCircle size={15} />
                    </div>
                    Profile
                  </Link>

                  {switchModes.length > 0 && (
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
        <Link to="/owner/home" onClick={() => setMobileMenuOpen(false)}>
          HOME
        </Link>
        <Link to="/owner/inbox" onClick={() => setMobileMenuOpen(false)}>
          INBOX
        </Link>
        <Link to="/owner/view-gyms" onClick={() => setMobileMenuOpen(false)}>
          VIEW GYMS
        </Link>
        <Link to="/owner/gym-application" onClick={() => setMobileMenuOpen(false)}>
          GYM APPLICATION
        </Link>
        <Link to="/owner/profile" onClick={() => setMobileMenuOpen(false)}>
          PROFILE (SOON)
        </Link>

        {switchModes.map((m) => (
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