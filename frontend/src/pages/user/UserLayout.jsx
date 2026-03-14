import React, { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import HeaderUser from "./Header-user";
import Footer from "./Footer";
import UserLoading from "./UserLoading";
import ScrollThemeWidget from "../../utils/ScrollThemeWidget";
import { api } from "../../utils/apiClient";

const ROLE_LEVEL = {
  user: 1,
  owner: 2,
  admin: 3,
  superadmin: 4,
};

const USER_LAYOUT_LOADED_KEY = "user_layout_loaded_once";

function hasAtLeastRole(role, required) {
  return (ROLE_LEVEL[role] || 0) >= (ROLE_LEVEL[required] || 0);
}

export default function UserLayout({ skipAuth = false }) {
  const [ready, setReady] = useState(skipAuth);
  const [showLoader] = useState(
    () => !sessionStorage.getItem(USER_LAYOUT_LOADED_KEY)
  );

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (skipAuth) return;

    let active = true;

    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login", { replace: true });
          return;
        }

        const minDelay = showLoader
          ? new Promise((resolve) => setTimeout(resolve, 800))
          : Promise.resolve();

        const [meRes] = await Promise.all([
          api.get("/me", {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          }),
          minDelay,
        ]);

        const user = meRes.data?.user ?? meRes.data;

        if (!hasAtLeastRole(user?.role, "user")) {
          localStorage.removeItem("token");
          sessionStorage.removeItem(USER_LAYOUT_LOADED_KEY);
          navigate("/login", { replace: true });
          return;
        }

        if (!active) return;

        sessionStorage.setItem(USER_LAYOUT_LOADED_KEY, "1");
        setReady(true);
      } catch (err) {
        if (err?.response?.status === 503) {
          navigate("/maintenance", { replace: true });
          return;
        }

        localStorage.removeItem("token");
        sessionStorage.removeItem(USER_LAYOUT_LOADED_KEY);

        if (!active) return;
        navigate("/login", { replace: true });
      }
    };

    checkAuth();

    return () => {
      active = false;
    };
  }, [navigate, skipAuth, showLoader]);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [location.pathname]);

  if (!ready && !skipAuth && showLoader) return <UserLoading />;
  if (!ready && !skipAuth) return null;

  const hideHeader = location.pathname === "/home";
   

  return (
    <div className="user-app">
      {!hideHeader && <HeaderUser />}

      <main>
        <Outlet />
      </main>

      <Footer />

      <ScrollThemeWidget />
    </div>
  );
}