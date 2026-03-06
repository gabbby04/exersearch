import React, { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import HeaderUser from "./Header-user";
import HeaderUserStatic from "./HomeHeader";
import Footer from "./Footer";
import UserLoading from "./UserLoading";
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

export default function UserLayout() {
  const [ready, setReady] = useState(false);
  const [showLoader] = useState(() => {
    return !sessionStorage.getItem(USER_LAYOUT_LOADED_KEY);
  });

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let alive = true;

    const run = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login", { replace: true });
          return;
        }

        const minDelay = showLoader
          ? new Promise((r) => setTimeout(r, 800))
          : Promise.resolve();

        const meReq = api.get("/me");

        const [meRes] = await Promise.all([meReq, minDelay]);
        const fetchedUser = meRes.data?.user ?? meRes.data;

        if (!hasAtLeastRole(fetchedUser?.role, "user")) {
          navigate("/login", { replace: true });
          return;
        }

        if (!alive) return;

        sessionStorage.setItem(USER_LAYOUT_LOADED_KEY, "1");
        setReady(true);
      } catch (err) {
        if (err?.response?.status === 503) {
          navigate("/maintenance", { replace: true });
          return;
        }
        localStorage.removeItem("token");
        sessionStorage.removeItem(USER_LAYOUT_LOADED_KEY);
        navigate("/login", { replace: true });
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [navigate, showLoader]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  if (!ready && showLoader) return <UserLoading />;
  if (!ready) return null;

  const hideHeader = location.pathname === "/home";
  const useHomeHeader =
    location.pathname.includes("/inquiries") ||
    location.pathname.includes("/find-gyms");

  return (
    <>
      {!hideHeader &&
        (useHomeHeader ? <HeaderUserStatic /> : <HeaderUser />)}

      <Outlet />

      <Footer />
    </>
  );
}