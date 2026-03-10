import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./login.css";
import { api } from "../../utils/apiClient";

export default function VerifyEmail() {
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = localStorage.getItem("token");

  const verified = searchParams.get("verified");
  const error = searchParams.get("error");

  useEffect(() => {
    if (verified) {
      const t = setTimeout(() => {
        checkVerified();
      }, 600);
      return () => clearTimeout(t);
    }
  }, [verified]);

  const resend = async () => {
    if (!token) {
      localStorage.removeItem("token");
      navigate("/login", { replace: true });
      return;
    }

    setSending(true);
    try {
      await api.post(
        "/email/verification-notification",
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert("Verification email sent. Please check your inbox/spam.");
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to resend verification email.");
    } finally {
      setSending(false);
    }
  };

  const checkVerified = async () => {
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    setChecking(true);
    try {
      const res = await api.get("/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.email_verified_at) {
        navigate("/home", { replace: true });
        return;
      }

      alert("Not verified yet. Please click the link in your email first.");
    } catch (e) {
      localStorage.removeItem("token");
      alert("Session expired. Please login again.");
      navigate("/login", { replace: true });
    } finally {
      setChecking(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  return (
    <div className="login-page">
      <div className="bg-image"></div>
      <div className="overlay"></div>

      <div className="login-container">
        <div className="form-side" style={{ width: "100%" }}>
          <div className="login-box">
            <h1>Verify your email</h1>

            {verified && (
              <p style={{ marginTop: 8, color: "green", fontWeight: 700 }}>
                Email verified successfully! You can continue to the app.
              </p>
            )}

            {error && (
              <p style={{ marginTop: 8, color: "crimson", fontWeight: 700 }}>
                Invalid or expired verification link. Please resend and try again.
              </p>
            )}

            {!verified && !error && (
              <p style={{ marginTop: 8 }}>
                We sent a verification link to your email. Click it, then come back here.
              </p>
            )}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
              <button type="button" onClick={resend} disabled={sending}>
                {sending ? "Sending..." : "Resend email"}
              </button>

              <button type="button" onClick={checkVerified} disabled={checking}>
                {checking ? "Checking..." : verified ? "Continue" : "I already verified"}
              </button>

              <button type="button" onClick={logout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}