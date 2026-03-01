import React, { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import HeaderUser from "./Header-user";
import Footer from "./Footer";
import UserLoading from "./UserLoading";
import { api } from "../../utils/apiClient";

const ROLE_LEVEL = {
  user: 1,
  owner: 2,
  admin: 3,
  superadmin: 4,
};

function hasAtLeastRole(role, required) {
  return (ROLE_LEVEL[role] || 0) >= (ROLE_LEVEL[required] || 0);
}

export default function UserLayout() {
  const [ready, setReady] = useState(false);
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

        const minDelay = new Promise((r) => setTimeout(r, 800));
        const meReq = api.get("/me");

        const [meRes] = await Promise.all([meReq, minDelay]);
        const fetchedUser = meRes.data?.user ?? meRes.data;

        if (!hasAtLeastRole(fetchedUser?.role, "user")) {
          navigate("/login", { replace: true });
          return;
        }

        if (!alive) return;
        setReady(true);
      } catch (err) {
        if (err?.response?.status === 503) {
          navigate("/maintenance", { replace: true });
          return;
        }
        localStorage.removeItem("token");
        navigate("/login", { replace: true });
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [navigate]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  if (!ready) return <UserLoading />;

  const hideHeader = location.pathname === "/home";

  return (
    <>
      {!hideHeader && <HeaderUser />}
      <Outlet />
      <Footer />
    </>
  );
}