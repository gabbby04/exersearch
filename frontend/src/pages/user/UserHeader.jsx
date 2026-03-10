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
  MessageCircle,
  Settings,
  LogOut,
  Search,
  Heart,
  Trophy,
} from "lucide-react";

import {
  listNotifications,
  getUnreadNotificationsCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../../utils/notificationApi";
import { absoluteUrl } from "../../utils/findGymsData";

const FALLBACK_AVATAR = "/defaulticon.png";
const TOKEN_KEY = "token";

function iconForNotifType(type) {
  const t = String(type || "").toLowerCase();
  if (t.includes("workout")) return Flame;
  if (t.includes("meal")) return Utensils;
  if (t.includes("saved") || t.includes("follow")) return Heart;
  if (t.includes("membership")) return Trophy;
  if (t.includes("inquiry") || t.includes("message")) return MessageCircle;
  return Bell;
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

  const token = localStorage.getItem(TOKEN_KEY);

  const currentUi = useMemo(() => {
    const p = String(location.pathname || "");
    if (p.startsWith("/owner")) return "owner";
    if (p.startsWith("/admin")) return "superadmin";
    return "user";
  }, [location.pathname]);

  const avatarSrc = useMemo(() => {
    const u = effectiveUser;
    if (!u) return FALLBACK_AVATAR;

    const raw =
      u?.user_profile?.profile_photo_url ||
      u?.userProfile?.profile_photo_url ||
      u?.owner_profile?.profile_photo_url ||
      u?.ownerProfile?.profile_photo_url ||
      u?.admin_profile?.avatar_url ||
      u?.adminProfile?.avatar_url ||
      u?.avatar_url ||
      u?.profile_photo_url ||
      "";

    if (!raw) return FALLBACK_AVATAR;
    if (/^https?:\/\//i.test(String(raw))) return String(raw);

    return absoluteUrl(raw);
  }, [effectiveUser, currentUi]);

  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifErr, setNotifErr] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    if (!token) return;
    try {
      const c = await getUnreadNotificationsCount();
      setUnreadCount(Number(c) || 0);
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
      setNotifications(Array.isArray(paged?.data) ? paged.data : []);
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

  useEffect(() => {
    const close = (e) => {
      if (notifOpen && notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [notifOpen]);

  return (
    <>
      <header className="header header--scrolled">
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
            placeholder="Search gyms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="uhv-header__search-clear"
              type="button"
              onClick={() => setSearchQuery("")}
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="uhv-header__actions">
          <Link
            to="/home/workout"
            className="uhv-chip uhv-chip--fire"
            onClick={() => setMobileMenuOpen(false)}
          >
            <Flame size={12} /> Workout
          </Link>

          <Link
            to="/home/find-gyms"
            className="uhv-chip uhv-chip--find"
            onClick={() => setMobileMenuOpen(false)}
          >
            <Dumbbell size={12} /> Find Gyms
          </Link>

          <Link
            to="/home/meal-plan"
            className="uhv-chip uhv-chip--meal"
            onClick={() => setMobileMenuOpen(false)}
          >
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
                          setNotifications((prev) =>
                            prev.map((x) => ({ ...x, unread: false }))
                          );
                          setUnreadCount(0);
                        } catch {
                          // ignore
                        }
                      }}
                    >
                      Mark all as read
                    </button>
                    <button
                      type="button"
                      className="uhv-notif-close"
                      onClick={() => setNotifOpen(false)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                <div className="uhv-notif-pop__list">
                  {notifLoading && <div className="uhv-notif-empty">Loading...</div>}
                  {!notifLoading && notifErr && (
                    <div className="uhv-notif-empty">{notifErr}</div>
                  )}
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
                            setNotifications((prev) =>
                              prev.map((x) =>
                                x.id === n.id ? { ...x, unread: false } : x
                              )
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
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    if (e.currentTarget.nextSibling) {
                      e.currentTarget.nextSibling.style.display = "flex";
                    }
                  }}
                />
                <span className="uhv-profile-avatar__fallback">
                  {String(displayName || "U").trim().charAt(0).toUpperCase()}
                </span>
              </div>
              <ChevronDown
                size={13}
                className={"uhv-profile-chevron" + (profileOpen ? " open" : "")}
              />
            </button>

            {profileOpen && (
              <div className="uhv-profile-pop">
                <div className="uhv-profile-pop__top">
                  <p>{displayName}</p>
                  <small>{displayEmail}</small>
                </div>

                <Link
                  to="/home/profile"
                  className="uhv-profile-menu-item"
                  onClick={() => setProfileOpen(false)}
                >
                  <UserCircle size={15} /> My Profile
                </Link>

                <Link
                  to="/home/inquiries"
                  className="uhv-profile-menu-item"
                  onClick={() => setProfileOpen(false)}
                >
                  <MessageCircle size={15} /> Inquiries
                </Link>

                {isOwnerPlus &&
                  switchModes.map((m) => (
                    <button
                      key={m}
                      className="uhv-profile-menu-item"
                      onClick={() => handleSwitchUi(m)}
                      type="button"
                    >
                      <Settings size={15} /> Switch UI
                    </button>
                  ))}

                <button
                  type="button"
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