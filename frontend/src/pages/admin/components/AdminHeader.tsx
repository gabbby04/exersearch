// src/components/AdminHeader.tsx
import React from "react";
import type { Theme } from "../admin.types";
import { Switch } from "./components/Switch";
import { MAIN, adminThemes } from "../AdminLayout";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../../../utils/apiClient";

import {
  listNotifications,
  getUnreadNotificationsCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../../../utils/notificationApi";

const FALLBACK_AVATAR = "/arellano.png";
const UI_MODE_KEY = "ui_mode";

type Me = {
  user_id: number;
  name: string;
  email: string;
  role: string;

  admin_profile?: {
    admin_profile_id: number;
    permission_level: string;
    notes: string | null;
    avatar_url: string | null;
    created_at?: string;
    updated_at?: string;
  } | null;

  owner_profile?: {
    owner_profile_id?: number;
    profile_photo_url?: string | null;
    created_at?: string;
    updated_at?: string;
  } | null;

  user_profile?: {
    user_profile_id?: number;
    profile_photo_url?: string | null;
    created_at?: string;
    updated_at?: string;
  } | null;

  adminProfile?: { avatar_url?: string | null } | null;
  ownerProfile?: { profile_photo_url?: string | null } | null;
  userProfile?: { profile_photo_url?: string | null } | null;

  avatar_url?: string | null;
  profile_photo_url?: string | null;
  photoURL?: string | null;
  avatar?: string | null;
};

type Props = {
  title: string;
  theme: Theme;
  setTheme: React.Dispatch<React.SetStateAction<Theme>>;

  collapsed: boolean;
  onBurgerClick: () => void;

  me?: Me | null;

  onLogout?: () => void;
};

const ROLE_LEVEL: Record<string, number> = {
  user: 1,
  owner: 2,
  superadmin: 3,
};

function roleLevel(role?: string | null) {
  return ROLE_LEVEL[String(role || "").toLowerCase()] ?? 0;
}

function hasAtLeastRole(
  role: string | undefined | null,
  required: "user" | "owner" | "superadmin"
) {
  return roleLevel(role) >= roleLevel(required);
}

function toAbsUrl(u: string | null | undefined) {
  if (!u) return FALLBACK_AVATAR;

  const s = String(u).trim();
  if (!s) return FALLBACK_AVATAR;

  if (/^https?:\/\//i.test(s)) return s;

  try {
    const apiBase = String(api?.defaults?.baseURL || "").trim();
    const origin = apiBase ? new URL(apiBase).origin : "";
    if (!origin) return s.startsWith("/") ? s : `/${s}`;
    return `${origin}${s.startsWith("/") ? s : `/${s}`}`;
  } catch {
    return s.startsWith("/") ? s : `/${s}`;
  }
}

function iconForNotifType(type?: string | null) {
  const t = String(type || "").toLowerCase();
  if (t.includes("membership")) return "🏆";
  if (t.includes("inquiry") || t.includes("message")) return "💬";
  if (t.includes("announcement")) return "📣";
  if (t.includes("gym")) return "🏋️";
  if (t.includes("owner")) return "🧾";
  return "🔔";
}

export default function AdminHeader({
  title,
  theme,
  setTheme,
  collapsed,
  onBurgerClick,
  me,
  onLogout,
}: Props) {
  const isDark = theme === "dark";
  const t = adminThemes[theme].app;
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  const [notifOpen, setNotifOpen] = React.useState(false);
  const notifRef = React.useRef<HTMLDivElement | null>(null);

  const [notifLoading, setNotifLoading] = React.useState(false);
  const [notifErr, setNotifErr] = React.useState("");
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);

  const currentUi = React.useMemo<"user" | "owner" | "superadmin">(() => {
    const p = String(location.pathname || "");
    if (p.startsWith("/owner")) return "owner";
    if (p.startsWith("/admin") || p.startsWith("/superadmin")) return "superadmin";
    return "user";
  }, [location.pathname]);

  React.useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;

      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotifOpen(false);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setNotifOpen(false);
      }
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const handleLogout = () => {
    setMenuOpen(false);
    setNotifOpen(false);

    if (onLogout) return onLogout();

    localStorage.removeItem("token");
    navigate("/login");
  };

  const go = (path: string) => {
    setMenuOpen(false);
    setNotifOpen(false);
    navigate(path);
  };

  const switchUi = (mode: "user" | "owner" | "superadmin") => {
    localStorage.setItem(UI_MODE_KEY, mode);
    setMenuOpen(false);
    setNotifOpen(false);

    if (mode === "user") return navigate("/home");
    if (mode === "owner") return navigate("/owner/home");
    return navigate("/admin/dashboard");
  };

  const avatarSrc = React.useMemo(() => {
    const u = me;
    if (!u) return FALLBACK_AVATAR;

    let raw = "";

    if (currentUi === "superadmin") {
      raw =
        u.admin_profile?.avatar_url ||
        u.adminProfile?.avatar_url ||
        u.owner_profile?.profile_photo_url ||
        u.ownerProfile?.profile_photo_url ||
        u.user_profile?.profile_photo_url ||
        u.userProfile?.profile_photo_url ||
        u.avatar_url ||
        u.profile_photo_url ||
        u.photoURL ||
        u.avatar ||
        "";
    } else if (currentUi === "owner") {
      raw =
        u.owner_profile?.profile_photo_url ||
        u.ownerProfile?.profile_photo_url ||
        u.admin_profile?.avatar_url ||
        u.adminProfile?.avatar_url ||
        u.user_profile?.profile_photo_url ||
        u.userProfile?.profile_photo_url ||
        u.avatar_url ||
        u.profile_photo_url ||
        u.photoURL ||
        u.avatar ||
        "";
    } else {
      raw =
        u.user_profile?.profile_photo_url ||
        u.userProfile?.profile_photo_url ||
        u.owner_profile?.profile_photo_url ||
        u.ownerProfile?.profile_photo_url ||
        u.admin_profile?.avatar_url ||
        u.adminProfile?.avatar_url ||
        u.avatar_url ||
        u.profile_photo_url ||
        u.photoURL ||
        u.avatar ||
        "";
    }

    return toAbsUrl(raw);
  }, [me, currentUi]);

  const canSwitchToUser = hasAtLeastRole(me?.role, "user");
  const canSwitchToOwner = hasAtLeastRole(me?.role, "owner");

  const roleLabel = "ADMIN";
  const displayName = me?.name || "Admin";
  const displayEmail = me?.email || "";

  const itemStyle: React.CSSProperties = {
    width: "100%",
    textAlign: "left",
    border: "none",
    background: "transparent",
    color: t.text,
    cursor: "pointer",
    padding: "10px 10px",
    borderRadius: 10,
    fontWeight: 850,
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    gap: 10,
  };

  const iconWrap: React.CSSProperties = {
    width: 28,
    height: 28,
    borderRadius: 10,
    display: "grid",
    placeItems: "center",
    background: t.soft,
    border: `1px solid ${t.border}`,
    flex: "0 0 auto",
  };

  const refreshUnread = React.useCallback(async () => {
    try {
      const c = await getUnreadNotificationsCount({ role: "admin" });
      setUnreadCount(Number(c) || 0);
    } catch {
      // ignore
    }
  }, []);

  const loadNotifs = React.useCallback(async () => {
    setNotifLoading(true);
    setNotifErr("");

    try {
      const paged = await listNotifications({
        page: 1,
        per_page: 20,
        role: "admin",
      });

      setNotifications(Array.isArray(paged?.data) ? paged.data : []);
    } catch {
      setNotifErr("Failed to load notifications.");
    } finally {
      setNotifLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refreshUnread();

    const onFocus = () => refreshUnread();
    window.addEventListener("focus", onFocus);

    return () => window.removeEventListener("focus", onFocus);
  }, [refreshUnread]);

  const hasUnread = unreadCount > 0;

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: 12,
        background: t.bg,
        borderBottom: `1px solid ${t.border}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          minWidth: 220,
        }}
      >
        <button
          onClick={onBurgerClick}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            border: `1px solid ${t.border}`,
            background: t.soft,
            color: t.text,
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M3 5.5h14"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M3 10h14"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M3 14.5h14"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            lineHeight: 1.1,
          }}
        >
          <div
            style={{
              fontWeight: 950,
              letterSpacing: 0.2,
              fontSize: 16,
              color: t.text,
            }}
          >
            {title}
          </div>
          <div
            style={{
              marginTop: 3,
              fontSize: 12,
              fontWeight: 800,
              color: t.mutedText,
            }}
          >
            Admin Panel
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 10px",
            borderRadius: 12,
            border: `1px solid ${t.border}`,
            background: t.soft2,
          }}
          title="Theme"
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: t.mutedText,
              whiteSpace: "nowrap",
            }}
          >
            {isDark ? "Dark" : "Light"}
          </span>

          <Switch
            id="admin-theme-header"
            checked={isDark}
            onChange={() =>
              setTheme((p) => (p === "dark" ? "light" : "dark"))
            }
            label=""
          />
        </div>

        <div ref={notifRef} style={{ position: "relative" }}>
          <button
            onClick={() => {
              setNotifOpen((o) => {
                const next = !o;
                if (next) loadNotifs();
                return next;
              });
              setMenuOpen(false);
            }}
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              border: `1px solid ${t.border}`,
              background: t.soft,
              color: t.text,
              cursor: "pointer",
              position: "relative",
            }}
            title="Notifications"
            type="button"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M10 2a5 5 0 0 0-5 5v2.8l-.9.9A1 1 0 0 0 4.8 12h10.4a1 1 0 0 0 .7-1.7l-.9-.9V7a5 5 0 0 0-5-5Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M7.8 15a2.2 2.2 0 0 0 4.4 0"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>

            {hasUnread && (
              <span
                style={{
                  position: "absolute",
                  right: 10,
                  top: 10,
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: MAIN,
                  boxShadow: `0 0 0 3px rgba(210,63,11,0.18)`,
                }}
              />
            )}
          </button>

          {notifOpen && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 50,
                width: 340,
                borderRadius: 14,
                border: `1px solid ${t.border}`,
                background: t.bg,
                boxShadow: t.shadow,
                padding: 10,
                zIndex: 999,
                maxHeight: 460,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  paddingBottom: 8,
                }}
              >
                <div
                  style={{
                    fontWeight: 950,
                    fontSize: 13,
                    color: t.text,
                  }}
                >
                  Notifications
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await markAllNotificationsRead({ role: "admin" });
                        setNotifications((prev) =>
                          prev.map((x) => ({ ...x, is_read: true }))
                        );
                        setUnreadCount(0);
                      } catch {
                        // ignore
                      }
                    }}
                    style={{
                      border: `1px solid ${t.border}`,
                      background: t.soft,
                      color: t.text,
                      borderRadius: 10,
                      padding: "6px 10px",
                      cursor: "pointer",
                      fontWeight: 900,
                      fontSize: 12,
                    }}
                  >
                    Mark all read
                  </button>

                  <button
                    type="button"
                    onClick={() => setNotifOpen(false)}
                    style={{
                      border: `1px solid ${t.border}`,
                      background: t.soft,
                      color: t.text,
                      borderRadius: 10,
                      width: 34,
                      height: 32,
                      cursor: "pointer",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 900,
                    }}
                    title="Close"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  paddingRight: 2,
                }}
              >
                {notifLoading && (
                  <div
                    style={{
                      padding: 10,
                      borderRadius: 12,
                      background: t.soft2,
                      border: `1px solid ${t.border}`,
                      fontWeight: 850,
                      color: t.mutedText,
                    }}
                  >
                    Loading…
                  </div>
                )}

                {!notifLoading && notifErr && (
                  <div
                    style={{
                      padding: 10,
                      borderRadius: 12,
                      background: t.soft2,
                      border: `1px solid ${t.border}`,
                      fontWeight: 850,
                      color: t.mutedText,
                    }}
                  >
                    {notifErr}
                  </div>
                )}

                {!notifLoading && !notifErr && notifications.length === 0 && (
                  <div
                    style={{
                      padding: 10,
                      borderRadius: 12,
                      background: t.soft2,
                      border: `1px solid ${t.border}`,
                      fontWeight: 850,
                      color: t.mutedText,
                    }}
                  >
                    All caught up!
                  </div>
                )}

                {!notifLoading &&
                  !notifErr &&
                  notifications.map((n) => {
                    const id = Number(n.notification_id ?? n.id);
                    const unread = !n.is_read;

                    const title = String(n.title ?? "");
                    const body = String(n.body ?? n.message ?? "");

                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={async () => {
                          setNotifications((prev) =>
                            prev.map((x) =>
                              Number(x.notification_id ?? x.id) === id
                                ? { ...x, is_read: true }
                                : x
                            )
                          );

                          setUnreadCount((c) =>
                            Math.max(0, c - (unread ? 1 : 0))
                          );

                          try {
                            await markNotificationRead(id);
                          } catch {
                            refreshUnread();
                            loadNotifs();
                          }

                          const url =
                            n?.url ||
                            n?.meta?.url ||
                            n?.meta?.route ||
                            n?.meta?.link;

                          if (url) {
                            setNotifOpen(false);
                            navigate(String(url));
                          }
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          border: `1px solid ${t.border}`,
                          background: unread ? t.soft : t.bg,
                          color: t.text,
                          borderRadius: 12,
                          padding: 10,
                          cursor: "pointer",
                          display: "flex",
                          gap: 10,
                          marginTop: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 12,
                            background: t.soft2,
                            border: `1px solid ${t.border}`,
                            display: "grid",
                            placeItems: "center",
                            fontSize: 16,
                            flex: "0 0 auto",
                          }}
                        >
                          {iconForNotifType(n.type)}
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 950,
                              fontSize: 13,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {title || "Notification"}
                          </div>

                          <div
                            style={{
                              marginTop: 3,
                              fontWeight: 800,
                              fontSize: 12,
                              color: t.mutedText,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical" as any,
                            }}
                          >
                            {body}
                          </div>
                        </div>

                        {unread && (
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 999,
                              background: MAIN,
                              marginLeft: "auto",
                              marginTop: 2,
                              boxShadow: `0 0 0 3px rgba(210,63,11,0.18)`,
                              flex: "0 0 auto",
                            }}
                            title="Unread"
                          />
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            onClick={() => {
              setMenuOpen((v) => !v);
              setNotifOpen(false);
            }}
            style={{
              height: 42,
              borderRadius: 14,
              border: `1px solid ${t.border}`,
              background: t.soft,
              color: t.text,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "0 12px 0 6px",
            }}
            title="Profile menu"
            type="button"
          >
            <img
              src={avatarSrc}
              alt={displayName}
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== window.location.origin + FALLBACK_AVATAR) {
                  target.src = FALLBACK_AVATAR;
                }
              }}
              style={{
                width: 30,
                height: 30,
                borderRadius: 999,
                objectFit: "cover",
                border: `1px solid ${t.border}`,
                display: "block",
                background: t.soft2,
                flex: "0 0 auto",
              }}
            />

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                lineHeight: 1.05,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 950 }}>{displayName}</div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 850,
                  color: t.mutedText,
                }}
              >
                {roleLabel}
              </div>
            </div>

            <svg
              width="16"
              height="16"
              viewBox="0 0 20 20"
              fill="none"
              style={{ opacity: 0.9 }}
            >
              <path
                d="M6 8l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {menuOpen && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 50,
                width: 260,
                borderRadius: 14,
                border: `1px solid ${t.border}`,
                background: t.bg,
                boxShadow: t.shadow,
                padding: 8,
                zIndex: 999,
              }}
            >
              <div style={{ padding: "6px 8px 10px 8px" }}>
                <div
                  style={{
                    fontWeight: 950,
                    fontSize: 13,
                    color: t.text,
                  }}
                >
                  {displayName}
                </div>

                {displayEmail ? (
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 12,
                      color: t.mutedText,
                      marginTop: 2,
                    }}
                  >
                    {displayEmail}
                  </div>
                ) : null}
              </div>

              {canSwitchToUser && (
                <button
                  onClick={() => switchUi("user")}
                  style={itemStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = t.soft;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span style={iconWrap}>👤</span>
                  Switch to User
                </button>
              )}

              {canSwitchToOwner && (
                <button
                  onClick={() => switchUi("owner")}
                  style={itemStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = t.soft;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span style={iconWrap}>🏋️</span>
                  Switch to Owner
                </button>
              )}

              <button
                onClick={() => go("/admin/profile")}
                style={itemStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = t.soft;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={iconWrap}>🪪</span>
                Profile
              </button>

              <button
                onClick={() => go("/admin/settings")}
                style={itemStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = t.soft;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={iconWrap}>⚙️</span>
                Settings
              </button>

              <div
                style={{
                  height: 1,
                  background: t.border,
                  margin: "8px 6px",
                }}
              />

              <button
                onClick={handleLogout}
                style={{ ...itemStyle, color: MAIN }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = t.soft;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={iconWrap}>🚪</span>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}