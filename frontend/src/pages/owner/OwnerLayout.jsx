import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import OwnerLoading from "./OwnerLoading";
import HeaderOwnerStatic from "./Header2";
import Footer from "../user/Footer";
import "./OwnerLayout.css";

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

  const hideFooter = pathname.startsWith("/owner/view-gyms");

  if (!ready) return <OwnerLoading />;

  return (
    <div className="owner-layout" data-theme="light">
      <HeaderOwnerStatic />
      <main className="owner-layout__content">
        <Outlet />
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
}