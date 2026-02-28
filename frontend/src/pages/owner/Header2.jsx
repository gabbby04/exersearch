import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./OwnerHeaderStatic.css";
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

export default function HeaderOwnerStatic() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

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

  const [notifications, setNotifications] = useState([
    { id: "n1", unread: true, title: "Inbox", message: "You have new inquiries." },
  ]);

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
        console.log("[HeaderOwnerStatic] /me failed:", err?.response?.status);
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

  // ✅ IMPORTANT FIX: in /owner UI, ALWAYS prefer owner profile first
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
    function onEsc(e) {
      if (e.key === "Escape") {
        setNotifOpen(false);
        setProfileOpen(false);
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [notifOpen, profileOpen]);

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
    { to: "/owner/home", icon: HomeIcon, label: "Home", chipClass: "oh-chip--home" },
    { to: "/owner/inbox", icon: Inbox, label: "Inbox", chipClass: "oh-chip--inbox" },
    { to: "/owner/view-gyms", icon: Building2, label: "View Gyms", chipClass: "oh-chip--gyms" },
  ];

  const hasUnread = notifications.some((n) => n.unread);

  return (
    <>
      <div className="oh-topLogo">
        <img
          src={appLogo}
          alt="ExerSearch Logo"
          onClick={() => {
            setMobileMenuOpen(false);
            setNotifOpen(false);
            setProfileOpen(false);
            navigate("/owner/home");
          }}
          onError={(e) => (e.currentTarget.src = fallbackLogo)}
        />
      </div>

      <header className="oh-header">
        <div className="oh-header__spacer" />

        <div className="oh-actions">
          {TOP_LINKS.map(({ to, icon: Icon, label, chipClass }) => (
            <Link key={to} to={to} className={`oh-chip ${chipClass}`} onClick={() => setMobileMenuOpen(false)}>
              <Icon size={14} /> {label}
            </Link>
          ))}

          <div className="oh-notifWrap" ref={notifRef}>
            <button
              type="button"
              className="oh-notifBtn"
              onClick={() => {
                setNotifOpen((o) => !o);
                setProfileOpen(false);
              }}
              aria-label="Notifications"
            >
              <Bell size={18} />
            </button>
            {hasUnread && <span className="oh-notifDot" />}

            {notifOpen && (
              <div className="oh-pop">
                <div className="oh-pop__hdr">
                  <span className="oh-pop__title">Notifications</span>
                  <div className="oh-pop__hdrBtns">
                    <button type="button" className="oh-pop__textBtn" onClick={() => setNotifications([])}>
                      Clear all
                    </button>
                    <button type="button" className="oh-pop__iconBtn" onClick={() => setNotifOpen(false)}>
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <div className="oh-pop__list">
                  {notifications.length === 0 ? (
                    <div className="oh-pop__empty">All caught up!</div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        className={`oh-popItem ${n.unread ? "oh-popItem--unread" : ""}`}
                        onClick={() =>
                          setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, unread: false } : x)))
                        }
                      >
                        <div className="oh-popItem__body">
                          <p>{n.title}</p>
                          <span>{n.message}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="oh-profileWrap" ref={profileRef}>
            <button
              type="button"
              className="oh-profileBtn"
              onClick={() => {
                setProfileOpen((o) => !o);
                setNotifOpen(false);
              }}
              aria-label="Profile menu"
            >
              <div className="oh-avatar">
                <img
                  src={avatarSrc}
                  alt="Profile"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = "grid";
                  }}
                />
                <span className="oh-avatarFallback" style={{ display: "none" }}>
                  {String(displayName || "O").trim().charAt(0).toUpperCase()}
                </span>
              </div>
              <ChevronDown size={14} className={`oh-chevron ${profileOpen ? "open" : ""}`} />
            </button>

            {profileOpen && (
              <div className="oh-profilePop">
                <div className="oh-profileTop">
                  <div className="oh-bigAvatar">
                    <img
                      src={avatarSrc}
                      alt="Profile"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = "grid";
                      }}
                    />
                    <span className="oh-avatarFallback" style={{ display: "none" }}>
                      {String(displayName || "O").trim().charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="oh-name">{displayName}</p>
                    <p className="oh-email">{displayEmail || " "}</p>
                  </div>
                </div>

                <div className="oh-menu">
                  <Link to="/owner/inbox" className="oh-menuItem" onClick={() => setProfileOpen(false)}>
                    <div className="oh-miIcon" style={{ background: "#ecfdf5", color: "#16a34a" }}>
                      <Inbox size={16} />
                    </div>
                    Inbox
                  </Link>

                  <Link to="/owner/view-gyms" className="oh-menuItem" onClick={() => setProfileOpen(false)}>
                    <div className="oh-miIcon" style={{ background: "#fff7ed", color: "#d23f0b" }}>
                      <Building2 size={16} />
                    </div>
                    View Gyms
                  </Link>

                  <Link to="/owner/gym-application" className="oh-menuItem" onClick={() => setProfileOpen(false)}>
                    <div className="oh-miIcon" style={{ background: "#fff7ed", color: "#f59e0b" }}>
                      <FilePlus2 size={16} />
                    </div>
                    Gym Application
                  </Link>

                  <Link to="/owner/profile" className="oh-menuItem" onClick={() => setProfileOpen(false)}>
                    <div className="oh-miIcon" style={{ background: "#eff6ff", color: "#2563eb" }}>
                      <UserCircle size={16} />
                    </div>
                    Profile (Soon)
                  </Link>

                  {switchModes.length > 0 && (
                    <>
                      <div className="oh-divider" />
                      {switchModes.map((m) => (
                        <button key={m} type="button" className="oh-menuItem" onClick={() => handleSwitchUi(m)}>
                          <div className="oh-miIcon" style={{ background: "#f3f4f6", color: "#111827" }}>
                            <Settings size={16} />
                          </div>
                          Switch to {labelForUiMode(m)}
                        </button>
                      ))}
                    </>
                  )}

                  <div className="oh-divider" />
                  <button type="button" className="oh-menuItem oh-logout" onClick={handleLogout}>
                    <div className="oh-miIcon" style={{ background: "#fef2f2", color: "#ef4444" }}>
                      <LogOut size={16} />
                    </div>
                    Log Out
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="oh-hamburger" onClick={() => setMobileMenuOpen((p) => !p)} role="button" tabIndex={0}>
            <span />
            <span />
            <span />
          </div>
        </div>
      </header>

      <div className={`oh-mobileMenu ${mobileMenuOpen ? "open" : ""}`}>
        <Link className="oh-mobileLink" to="/owner/home" onClick={() => setMobileMenuOpen(false)}>HOME</Link>
        <Link className="oh-mobileLink" to="/owner/inbox" onClick={() => setMobileMenuOpen(false)}>INBOX</Link>
        <Link className="oh-mobileLink" to="/owner/view-gyms" onClick={() => setMobileMenuOpen(false)}>VIEW GYMS</Link>
        <Link className="oh-mobileLink" to="/owner/gym-application" onClick={() => setMobileMenuOpen(false)}>GYM APPLICATION</Link>
        <Link className="oh-mobileLink" to="/owner/profile" onClick={() => setMobileMenuOpen(false)}>PROFILE (SOON)</Link>

        {switchModes.map((m) => (
          <button key={m} type="button" className="oh-mobileBtn" onClick={() => handleSwitchUi(m)}>
            Switch to {labelForUiMode(m)}
          </button>
        ))}

        <button type="button" className="oh-mobileBtn" onClick={handleLogout}>LOGOUT</button>
      </div>
    </>
  );
}