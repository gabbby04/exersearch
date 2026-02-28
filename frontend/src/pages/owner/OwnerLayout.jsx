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
          navigate("/login");
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
          navigate("/login");
          return;
        }

        if (!alive) return;
        setReady(true);
      } catch {
        localStorage.removeItem("token");
        navigate("/login");
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, [navigate]);

  const useHeader2 = useMemo(() => {
    const p = String(location.pathname || "");
    return p === "/owner/home" || p === "/owner/inbox";
  }, [location.pathname]);

  if (!ready) return <OwnerLoading />;

  return (
    <>
      {useHeader2 ? <HeaderOwnerStatic /> : <HeaderOwner />}
      <Outlet />
      <Footer />
    </>
  );
}