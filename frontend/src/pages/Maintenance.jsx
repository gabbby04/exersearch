import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Maintenance.css";

export default function Maintenance() {
  const navigate = useNavigate();

  const clearAuth = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth");
    sessionStorage.clear();
  };

  const handleRetry = () => {
    window.location.reload();
  };

  const handleLogin = () => {
    clearAuth();
    navigate("/login");
  };

  const handleHome = () => {
    clearAuth();
    navigate("/");
  };

  return (
    <div className="mx-page">
      <div className="mx-wrap">
        <div className="mx-topRow">
          <button
            type="button"
            className="mx-link"
            onClick={handleHome}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
            }}
          >
            ← Back to Home
          </button>

          <div className="mx-pills">
            <span className="mx-pill">Service Unavailable</span>
            <span className="mx-pillMuted">Maintenance Mode</span>
          </div>
        </div>

        <div className="mx-panel">
          <div className="mx-panelTop">
            <div className="mx-anim" aria-hidden="true">
              <span className="mx-gear mx-gearOne mx-spinOne" />
              <span className="mx-gear mx-gearTwo mx-spinTwo" />
              <span className="mx-gear mx-gearThree mx-spinOne" />
              <span className="mx-animGlow" />
            </div>

            <div className="mx-titleWrap">
              <div className="mx-title">We’re doing maintenance</div>
              <div className="mx-subtitle">
                ExerSearch is temporarily unavailable while we update the system.
                Please try again later.
              </div>

              <div className="mx-actions mx-actionsTop">
                <button
                  type="button"
                  className="mx-btn mx-btnSecondary"
                  onClick={handleRetry}
                >
                  Retry
                </button>

                <button
                  type="button"
                  className="mx-btn mx-btnPrimary"
                  onClick={handleHome}
                >
                  Go to Home
                </button>

                <button
                  type="button"
                  className="mx-btn mx-btnSecondary"
                  onClick={handleLogin}
                >
                  Login with another account
                </button>
              </div>

              <div className="mx-note">
                Tip: If you keep landing here, maintenance is still enabled.
              </div>
            </div>
          </div>

          <div className="mx-panelBody">
            <div className="mx-hints">
              <div className="mx-hint">
                <div className="mx-hintTitle">What you can do</div>
                <ul className="mx-list">
                  <li>Wait a few minutes and try again.</li>
                  <li>Go back to the homepage.</li>
                  <li>If you’re an admin, use the admin panel.</li>
                </ul>
              </div>

              <div className="mx-hint">
                <div className="mx-hintTitle">What’s happening</div>
                <div className="mx-par">
                  We’re deploying updates and doing system checks. This page will
                  disappear once maintenance is turned off by the admin.
                </div>
              </div>
            </div>
          </div>

          <div className="mx-footer">
            <span className="mx-muted">
              Status: <b>Maintenance Mode Enabled</b>
            </span>
            <span className="mx-muted">Error: 503</span>
          </div>
        </div>
      </div>
    </div>
  );
}