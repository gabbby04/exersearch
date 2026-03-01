import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Bell,
  X,
  ChevronDown,
  UserCircle,
  Flame,
  Dumbbell,
  Utensils,
  Trophy,
  Heart,
  MessageCircle,
  Settings,
  LogOut,
  Search,
} from "lucide-react";

const API_BASE = "https://exersearch.test";
const FALLBACK_AVATAR = "/defaulticon.png";
const UI_MODE_KEY = "ui_mode";

function toAbsUrl(u) {
  if (!u) return "";
  const s = String(u).trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  const base = String(API_BASE || "").replace(/\/$/, "");
  const path = s.startsWith("/") ? s : `/${s}`;
  return `${base}${path}`;
}

export default function UserHeader({
  effectiveUser,
  displayName,
  displayEmail,
  appLogo,
  fallbackLogo,
  isOwnerPlus,
  switchModes,
  handleSwitchUi,
  handleLogout,
  searchQuery,
  setSearchQuery,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();

  const currentUi = useMemo(() => {
    const p = String(location.pathname || "");
    if (p.startsWith("/owner")) return "owner";
    if (p.startsWith("/admin")) return "superadmin";
    return "user";
  }, [location.pathname]);

  const avatarSrc = useMemo(() => {
    const u = effectiveUser;
    if (!u) return FALLBACK_AVATAR;

    let raw =
      u?.user_profile?.profile_photo_url ||
      u?.owner_profile?.profile_photo_url ||
      u?.admin_profile?.avatar_url ||
      u?.avatar_url ||
      "";

    if (!raw) return FALLBACK_AVATAR;
    if (/^https?:\/\//i.test(String(raw))) return String(raw);
    return toAbsUrl(raw);
  }, [effectiveUser, currentUi]);

  useEffect(() => {
    const close = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <>
      <header className="header header--scrolled">
        <div
          className="logo"
          onClick={() => navigate("/home")}
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
            placeholder="Search gyms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="uhv-header__actions">
          <Link to="/home/workout" className="uhv-chip uhv-chip--fire">
            <Flame size={12} /> Workout
          </Link>

          <Link to="/home/find-gyms" className="uhv-chip uhv-chip--find">
            <Dumbbell size={12} /> Find Gyms
          </Link>

          <Link to="/home/meal-plan" className="uhv-chip uhv-chip--meal">
            <Utensils size={12} /> Meal Plan
          </Link>

          <div className="uhv-profile-wrap" ref={profileRef}>
            <button
              type="button"
              className="uhv-profile-btn"
              onClick={() => setProfileOpen((o) => !o)}
            >
              <div className="uhv-profile-avatar">
                <img
                  src={avatarSrc}
                  alt="Profile"
                  onError={(e) => {
                    e.currentTarget.src = FALLBACK_AVATAR;
                  }}
                />
              </div>
              <ChevronDown size={13} />
            </button>

            {profileOpen && (
              <div className="uhv-profile-pop">
                <div className="uhv-profile-pop__top">
                  <p>{displayName}</p>
                  <small>{displayEmail}</small>
                </div>

                <Link to="/home/profile" className="uhv-profile-menu-item">
                  <UserCircle size={15} /> My Profile
                </Link>

                <Link to="/home/inquiries" className="uhv-profile-menu-item">
                  <MessageCircle size={15} /> Inquiries
                </Link>

                {isOwnerPlus &&
                  switchModes.map((m) => (
                    <button
                      key={m}
                      className="uhv-profile-menu-item"
                      onClick={() => handleSwitchUi(m)}
                    >
                      <Settings size={15} /> Switch UI
                    </button>
                  ))}

                <button
                  className="uhv-profile-menu-item uhv-profile-menu-item--logout"
                  onClick={handleLogout}
                >
                  <LogOut size={15} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}