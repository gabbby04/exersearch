import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import AdminLoading from "./AdminLoading";
import AdminSidebar from "./components/AdminSidebar";
import AdminHeader from "./components/AdminHeader";
import { api } from "../../utils/apiClient";

export const MAIN = "#d23f0b";
const THEME_KEY = "admin_theme";

export const adminThemes = {
  light: {
    app: {
      bg: "#ffffff",
      text: "#0f1115",
      mutedText: "#55606b",
      border: "rgba(0,0,0,0.08)",
      soft: "#f7f7f7",
      soft2: "#fbfbfb",
      shadow: "0 14px 30px rgba(0,0,0,0.08)",
    },
  },
  dark: {
    app: {
      bg: "#0f1115",
      text: "#ffffff",
      mutedText: "rgba(255,255,255,0.65)",
      border: "rgba(255,255,255,0.10)",
      soft: "rgba(255,255,255,0.06)",
      soft2: "rgba(255,255,255,0.04)",
      shadow: "0 14px 30px rgba(0,0,0,0.35)",
    },
  },
};

export default function AdminLayout() {
  const [ready, setReady] = useState(false);

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === "dark" || saved === "light" ? saved : "dark";
  });

  const [me, setMe] = useState(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarToggled, setSidebarToggled] = useState(false);
  const [sidebarBroken, setSidebarBroken] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login", { replace: true });
          return;
        }

        const meRes = await api.get("/me", {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        const user = meRes.data?.user || meRes.data;
        const role = user?.role;

        if (role !== "admin" && role !== "superadmin") {
          localStorage.removeItem("token");
          localStorage.removeItem("role");
          navigate("/login", { replace: true });
          return;
        }

        if (!alive) return;

        setMe(user);
        localStorage.setItem("role", role);
        setReady(true);
      } catch (e) {
        const status = e?.response?.status;

        if (status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("role");
          if (!alive) return;
          navigate("/login", { replace: true });
          return;
        }

        if (!alive) return;
        setReady(true);
      }
    }

    run();

    return () => {
      alive = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (sidebarBroken) setSidebarToggled(false);
  }, [location.pathname, sidebarBroken]);
  useEffect(() => {
  document.querySelector(".admin-main-content")?.scrollTo({ top: 0, behavior: "smooth" });
}, [location.pathname]);
  if (!ready) return <AdminLoading />;

  const t = adminThemes[theme].app;

  const headerTitle = (() => {
    const p = location.pathname;
    if (p.startsWith("/admin/owner-applications")) return "Owner Applications";
    if (p.startsWith("/admin/gyms")) return "Gyms";
    if (p.startsWith("/admin/equipments")) return "Equipments";
    if (p.startsWith("/admin/amenities")) return "Amenities";
    if (p.startsWith("/admin/users")) return "Users";
    if (p.startsWith("/admin/calendar")) return "Calendar";
    if (p.startsWith("/admin/docs")) return "Documentation";
    if (p.startsWith("/admin/settings")) return "App Settings";
    return "Dashboard";
  })();

  const handleBurgerClick = () => {
    if (sidebarBroken) setSidebarToggled((v) => !v);
    else setSidebarCollapsed((v) => !v);
  };

  return (
    <div className={`admin-app admin-theme-${theme}`}>
      <div
        className="admin-layout"
        style={{
          display: "flex",
          height: "100vh",
          background: t.bg,
          color: t.text,
        }}
      >
        <AdminSidebar
          theme={theme}
          setTheme={setTheme}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          toggled={sidebarToggled}
          setToggled={setSidebarToggled}
          broken={sidebarBroken}
          setBroken={setSidebarBroken}
        />

        <div
          className="admin-main-shell"
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <AdminHeader
            title={headerTitle}
            theme={theme}
            setTheme={setTheme}
            collapsed={sidebarCollapsed}
            onBurgerClick={handleBurgerClick}
            me={me}
          />

          <main
            className="admin-main-content"
            style={{
              flex: 1,
              padding: 24,
              overflow: "auto",
            }}
          >
            <Outlet context={{ theme, setTheme, me }} />
          </main>
        </div>
      </div>
    </div>
  );
}