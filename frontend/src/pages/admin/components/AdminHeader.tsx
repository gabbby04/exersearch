import React from "react";
import type { Theme } from "../admin.types";
import { Switch } from "./components/Switch";
import { MAIN, adminThemes } from "../AdminLayout";
import { useNavigate, useLocation } from "react-router-dom";

const FALLBACK_AVATAR = "/arellano.png";
const API_BASE = "https://exersearch.test";
const UI_MODE_KEY = "ui_mode";

type Me = {
  user_id: number;
  name: string;
  email: string;
  role: string; // "user" | "owner" | "superadmin"

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

  // (optional camelCase fallbacks if your API sometimes returns these)
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
  return ROLE_LEVEL[String(role || "")] ?? 0;
}

function hasAtLeastRole(
  role: string | undefined | null,
  required: "user" | "owner" | "superadmin"
) {
  return roleLevel(role) >= roleLevel(required);
}

function toAbsUrl(u: string | null | undefined) {
  if (!u) return "";
  const s = String(u).trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  const base = String(API_BASE || "").replace(/\/$/, "");
  const path = s.startsWith("/") ? s : `/${s}`;
  return `${base}${path}`;
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

  // ✅ detect active UI by route prefix
  const currentUi = React.useMemo<"user" | "owner" | "superadmin">(() => {
    const p = String(location.pathname || "");
    if (p.startsWith("/owner")) return "owner";
    if (p.startsWith("/admin") || p.startsWith("/superadmin")) return "superadmin";
    return "user";
  }, [location.pathname]);

  React.useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
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
    if (onLogout) return onLogout();

    localStorage.removeItem("token");
    navigate("/login");
  };

  const go = (path: string) => {
    setMenuOpen(false);
    navigate(path);
  };

  const switchUi = (mode: "user" | "owner" | "superadmin") => {
    localStorage.setItem(UI_MODE_KEY, mode);
    setMenuOpen(false);
    if (mode === "user") return navigate("/home");
    if (mode === "owner") return navigate("/owner/home");
    return navigate("/admin/dashboard");
  };

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

  const roleLabel = "ADMIN";
  const displayName = me?.name || "Admin";
  const displayEmail = me?.email || "";


  const avatarSrc = React.useMemo(() => {
    const u = me;
    if (!u) return FALLBACK_AVATAR;

    let raw = "";

    if (currentUi === "superadmin") {
      raw =
        u?.admin_profile?.avatar_url ||
        u?.adminProfile?.avatar_url ||
        u?.owner_profile?.profile_photo_url ||
        u?.ownerProfile?.profile_photo_url ||
        u?.user_profile?.profile_photo_url ||
        u?.userProfile?.profile_photo_url ||
        u?.avatar_url ||
        u?.profile_photo_url ||
        u?.photoURL ||
        u?.avatar ||
        "";
    } else if (currentUi === "owner") {
      raw =
        u?.owner_profile?.profile_photo_url ||
        u?.ownerProfile?.profile_photo_url ||
        u?.admin_profile?.avatar_url ||
        u?.adminProfile?.avatar_url ||
        u?.user_profile?.profile_photo_url ||
        u?.userProfile?.profile_photo_url ||
        u?.avatar_url ||
        u?.profile_photo_url ||
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
        u?.avatar_url ||
        u?.profile_photo_url ||
        u?.photoURL ||
        u?.avatar ||
        "";
    }

    const abs = toAbsUrl(raw);
    return abs || FALLBACK_AVATAR;
  }, [me, currentUi]);

  const canSwitchToUser = hasAtLeastRole(me?.role, "user");
  const canSwitchToOwner = hasAtLeastRole(me?.role, "owner");

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
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 220 }}>
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
            <path d="M3 5.5h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M3 10h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M3 14.5h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
          <div style={{ fontWeight: 950, letterSpacing: 0.2, fontSize: 16, color: t.text }}>{title}</div>
          <div style={{ marginTop: 3, fontSize: 12, fontWeight: 800, color: t.mutedText }}>Admin Panel</div>
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
          <span style={{ fontSize: 12, fontWeight: 800, color: t.mutedText, whiteSpace: "nowrap" }}>
            {isDark ? "Dark" : "Light"}
          </span>
          <Switch
            id="admin-theme-header"
            checked={isDark}
            onChange={() => setTheme((p) => (p === "dark" ? "light" : "dark"))}
            label=""
          />
        </div>

        <button
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
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 2a5 5 0 0 0-5 5v2.8l-.9.9A1 1 0 0 0 4.8 12h10.4a1 1 0 0 0 .7-1.7l-.9-.9V7a5 5 0 0 0-5-5Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M7.8 15a2.2 2.2 0 0 0 4.4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
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
        </button>

        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
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
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 999,
                backgroundImage: `url(${avatarSrc})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                border: `1px solid ${t.border}`,
              }}
            />

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.05 }}>
              <div style={{ fontSize: 12, fontWeight: 950 }}>{displayName}</div>
              <div style={{ fontSize: 11, fontWeight: 850, color: t.mutedText }}>{roleLabel}</div>
            </div>

            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ opacity: 0.9 }}>
              <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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
                <div style={{ fontWeight: 950, fontSize: 13, color: t.text }}>{displayName}</div>
                {displayEmail ? (
                  <div style={{ fontWeight: 800, fontSize: 12, color: t.mutedText, marginTop: 2 }}>{displayEmail}</div>
                ) : null}
              </div>

              {canSwitchToUser && (
                <button
                  onClick={() => switchUi("user")}
                  style={itemStyle}
                  onMouseEnter={(e) => ((e.currentTarget.style.background = t.soft) as any)}
                  onMouseLeave={(e) => ((e.currentTarget.style.background = "transparent") as any)}
                >
                  <span style={iconWrap}>
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                      <path d="M10 10a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="1.6" />
                      <path d="M3.5 18a6.5 6.5 0 0 1 13 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </span>
                  Switch to User
                </button>
              )}

              {canSwitchToOwner && (
                <button
                  onClick={() => switchUi("owner")}
                  style={itemStyle}
                  onMouseEnter={(e) => ((e.currentTarget.style.background = t.soft) as any)}
                  onMouseLeave={(e) => ((e.currentTarget.style.background = "transparent") as any)}
                >
                  <span style={iconWrap}>
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                      <path d="M10 10a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="1.6" />
                      <path d="M3.5 18a6.5 6.5 0 0 1 13 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </span>
                  Switch to Owner
                </button>
              )}

              <button
                onClick={() => go("/admin/profile")}
                style={itemStyle}
                onMouseEnter={(e) => ((e.currentTarget.style.background = t.soft) as any)}
                onMouseLeave={(e) => ((e.currentTarget.style.background = "transparent") as any)}
              >
                <span style={iconWrap}>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                    <path d="M10 10a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke="currentColor" strokeWidth="1.6" />
                    <path d="M3.5 18a6.5 6.5 0 0 1 13 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </span>
                Profile
              </button>

              <button
                onClick={() => go("/admin/settings")}
                style={itemStyle}
                onMouseEnter={(e) => ((e.currentTarget.style.background = t.soft) as any)}
                onMouseLeave={(e) => ((e.currentTarget.style.background = "transparent") as any)}
              >
                <span style={iconWrap}>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                    <path d="M10 12.2a2.2 2.2 0 1 0-2.2-2.2A2.2 2.2 0 0 0 10 12.2Z" stroke="currentColor" strokeWidth="1.6" />
                    <path
                      d="M16.6 10a6.6 6.6 0 0 0-.1-1l1.6-1.2-1.6-2.8-1.9.7a6.7 6.7 0 0 0-1.7-1L12.7 2H9.3L9 4.7a6.7 6.7 0 0 0-1.7 1L5.4 5l-1.6 2.8L5.4 9a6.6 6.6 0 0 0 0 2l-1.6 1.2L5.4 15l1.9-.7a6.7 6.7 0 0 0 1.7 1L9.3 18h3.4l.3-2.7a6.7 6.7 0 0 0 1.7-1l1.9.7 1.6-2.8-1.6-1.2c.1-.3.1-.7.1-1Z"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                Settings
              </button>

              <div style={{ height: 1, background: t.border, margin: "8px 6px" }} />

              <button
                onClick={handleLogout}
                style={{ ...itemStyle, color: MAIN }}
                onMouseEnter={(e) => ((e.currentTarget.style.background = t.soft) as any)}
                onMouseLeave={(e) => ((e.currentTarget.style.background = "transparent") as any)}
              >
                <span style={iconWrap}>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                    <path d="M8 3h7v14H8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    <path d="M9 10H3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    <path d="M6 7l-3 3 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}