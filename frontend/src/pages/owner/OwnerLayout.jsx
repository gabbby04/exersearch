import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import OwnerLoading from "./OwnerLoading";
import HeaderOwner from "./Header-owner";
import HeaderOwnerStatic from "./Header2";
import Footer from "../user/Footer";

export default function OwnerLayout() {
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
        const meReq = axios.get("https://exersearch.test/api/v1/me", {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });

        const [meRes] = await Promise.all([meReq, minDelay]);
        const fetchedUser = meRes.data.user || meRes.data;

        if (!["owner", "superadmin"].includes(fetchedUser?.role)) {
          navigate("/login", { replace: true });
          return;
        }

        if (!alive) return;
        setReady(true);
      } catch {
        localStorage.removeItem("token");
        navigate("/login", { replace: true });
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [navigate]);

  const pathname = String(location.pathname || "");

  const useHeader2 = useMemo(() => {
    return (
      pathname.startsWith("/owner/home") ||
      pathname.startsWith("/owner/inbox") ||
      pathname.startsWith("/owner/view-stats") ||
      pathname.startsWith("/owner/view-gyms") // ✅ add this
    );
  }, [pathname]);

  const hideFooter = useMemo(() => {
    return pathname.startsWith("/owner/view-gyms"); // ✅ no footer here
  }, [pathname]);

  if (!ready) return <OwnerLoading />;

  return (
    <>
      {useHeader2 ? <HeaderOwnerStatic /> : <HeaderOwner />}
      <Outlet />
      {!hideFooter && <Footer />}
    </>
  );
}