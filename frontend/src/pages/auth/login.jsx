import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import {
  Eye,
  EyeOff,
  ArrowLeft,
  Check,
  User as UserIcon,
  Store,
  ShieldCheck,
  Mail,
  Home,
  LogOut,
} from "lucide-react";
import "./login.css";

import { redirectAfterAuth } from "../../utils/redirects";
import { allowedUiModes } from "../../utils/roles";
import { setUiMode } from "../../utils/appMode";

const LOGO_LEFT_SRC = "/src/assets/exersearchlogo.png";


function prettyModeLabel(m) {
  if (m === "user") return "User";
  if (m === "owner") return "Owner";
  if (m === "admin") return "Admin";
  if (m === "superadmin") return "Superadmin";
  return m;
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

const LEFT_CONTENT = {
  login: {
    tag: "Welcome back",
    title: (
      <>
        Find Your <em>Perfect</em>
        <br />
        Gym Again
      </>
    ),
    desc: "Sign in to access your personalised gym finder, meal plans, and progress tracker.",
  },
  signup: {
    tag: "Join ExerSearch",
    title: (
      <>
        Start Your <em>Fitness</em>
        <br />
        Journey Today
      </>
    ),
    desc: "Create a free account and discover the best gyms and fitness resources near you.",
  },
  role: {
    tag: "One more step",
    title: (
      <>
        Choose How
        <br />
        You Want to <em>Continue</em>
      </>
    ),
    desc: "Pick which UI you want to continue with.",
  },
  verify: {
    tag: "Almost done",
    title: (
      <>
        Check Your
        <br />
        <em>Email</em> Inbox
      </>
    ),
    desc: "Verify your email to activate your account and continue.",
  },
};

function LeftPanel({ view }) {
  const c = LEFT_CONTENT[view] || LEFT_CONTENT.login;
  return (
    <div className="auth-left">
      <div className="auth-left__photo" />
      <div className="auth-left__content">
        <div className="auth-logo">
          <img className="auth-logo__wordmark" src={LOGO_LEFT_SRC} alt="ExerSearch" />
        </div>

        <div className="auth-left__copy">
          <div className="auth-left__tag">
            <div className="auth-left__tag-line" />
            <span className="auth-left__tag-text">{c.tag}</span>
          </div>
          <h1 className="auth-left__title" key={view}>
            {c.title}
          </h1>
          <p className="auth-left__desc">{c.desc}</p>

          <div className="auth-left__stats">
            {[
              ["500+", "Partner gyms"],
              ["50k+", "Active users"],
              ["4.9★", "App rating"],
            ].map(([n, l]) => (
              <div key={l}>
                <div className="auth-left__stat-num">{n}</div>
                <div className="auth-left__stat-label">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginView({ onSwitch, onSubmit, loading, error, googleNode }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);

  return (
    <div className="auth-view--login">
      <div className="auth-hd">
        <h2 className="auth-hd__title">Sign in</h2>
        <p className="auth-hd__sub">
          Don't have an account? <button onClick={onSwitch}>Create one free</button>
        </p>
      </div>

      <div className="auth-googleWrap">

        <div className="auth-googleReal">{googleNode}</div>
      </div>

      <div className="auth-div">
        <div className="auth-div__line" />
        <span className="auth-div__text">or with email</span>
        <div className="auth-div__line" />
      </div>

      {error && (
        <div className="auth-err">
          <ShieldCheck size={14} />
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ email, password: pw });
        }}
      >
        <div className="auth-field">
          <label className="auth-field__label">Email address</label>
          <div className="auth-field__row">
            <input
              className="auth-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="auth-field">
          <label className="auth-field__label">Password</label>
          <div className="auth-field__row">
            <input
              className="auth-input"
              type={show ? "text" : "password"}
              placeholder="Enter your password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoComplete="current-password"
              required
              disabled={loading}
            />
            <button
              type="button"
              className="auth-eye"
              onClick={() => setShow((v) => !v)}
              disabled={loading}
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div className="auth-forgot">
          <button type="button" disabled={loading}>
            Forgot password?
          </button>
        </div>

        <button className="auth-submit" type="submit" disabled={loading}>
          {loading ? (
            <>
              <span className="auth-spinner" />
              Signing in…
            </>
          ) : (
            "Sign in to ExerSearch"
          )}
        </button>
      </form>
    </div>
  );
}

function RoleView({ user, onSelectMode, onBack, onLogout, loading }) {
  const modes = useMemo(() => allowedUiModes(user?.role) || [], [user]);
  const [sel, setSel] = useState(null);

  useEffect(() => {
    setSel(null);
  }, [user?.role]);

  return (
    <div className="auth-view--role">
      <button className="auth-back" onClick={onBack} disabled={loading}>
        <ArrowLeft size={14} />
        Back
      </button>

      <div className="auth-role-hd__title">Continue as</div>
      <p className="auth-role-hd__sub">Choose which interface you want to open.</p>

      <div className="auth-role-chip">
        <div className="auth-role-chip__av">
          <UserIcon size={16} />
        </div>
        <div>
          <p className="auth-role-chip__email">{user?.email || "—"}</p>
          <p className="auth-role-chip__hint">
            Signed in as <b>{user?.name || "—"}</b>
          </p>
        </div>
      </div>

      <div className="auth-roles">
        {modes.map((m) => {
          const label = prettyModeLabel(m);
          const Icon =
            m === "owner" ? Store : m === "superadmin" || m === "admin" ? ShieldCheck : UserIcon;
          const desc =
            m === "owner"
              ? "Manage gyms, listings, promos, and inquiries"
              : m === "superadmin" || m === "admin"
              ? "Platform management & moderation tools"
              : "Find gyms, track workouts & plans";

          return (
            <button
              key={m}
              type="button"
              className={`auth-role-card${sel === m ? " sel" : ""}`}
              onClick={() => setSel(m)}
              disabled={loading}
            >
              <div className="auth-role-card__icon">
                <Icon size={18} strokeWidth={2} />
              </div>
              <div style={{ flex: 1 }}>
                <p className="auth-role-card__label">{label}</p>
                <p className="auth-role-card__desc">{desc}</p>
              </div>
              <div className="auth-role-card__check">
                {sel === m && <Check size={11} strokeWidth={3} />}
              </div>
            </button>
          );
        })}
      </div>

      <button
        className="auth-submit"
        style={{ marginTop: 14 }}
        disabled={!sel || loading}
        onClick={() => onSelectMode(sel)}
        type="button"
      >
        {loading ? (
          <>
            <span className="auth-spinner" />
            Continuing…
          </>
        ) : (
          `Continue as ${prettyModeLabel(sel)}`
        )}
      </button>

      <button className="auth-vbtn auth-vbtn--ghost" onClick={onLogout} disabled={loading} type="button">
        <LogOut size={14} />
        Logout
      </button>
    </div>
  );
}

function SignupView({ onSwitch, onSubmit, loading, error, googleNode }) {
  const [f, setF] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirm: "",
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const [showPw, setShowPw] = useState(false);
  const [showCfm, setShowCfm] = useState(false);

  const match = f.password && f.confirm && f.password === f.confirm;
  const noMatch = f.confirm && f.password !== f.confirm;

  return (
    <div className="auth-view--signup">
      <div className="auth-hd">
        <h2 className="auth-hd__title">Create account</h2>
        <p className="auth-hd__sub">
          Already have one? <button onClick={onSwitch}>Sign in</button>
        </p>
      </div>

      <div className="auth-googleWrap">

        <div className="auth-googleReal">{googleNode}</div>
      </div>

      <div className="auth-div">
        <div className="auth-div__line" />
        <span className="auth-div__text">or with email</span>
        <div className="auth-div__line" />
      </div>

      {error && (
        <div className="auth-err">
          <ShieldCheck size={14} />
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!match) return;
          onSubmit(f);
        }}
      >
        <div className="auth-2col">
          <div className="auth-field">
            <label className="auth-field__label">First name</label>
            <div className="auth-field__row">
              <input
                className="auth-input"
                type="text"
                placeholder="Juan"
                value={f.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>
          <div className="auth-field">
            <label className="auth-field__label">Last name</label>
            <div className="auth-field__row">
              <input
                className="auth-input"
                type="text"
                placeholder="Dela Cruz"
                value={f.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>
        </div>

        <div className="auth-field">
          <label className="auth-field__label">Email address</label>
          <div className="auth-field__row">
            <input
              className="auth-input"
              type="email"
              placeholder="juan@example.com"
              value={f.email}
              onChange={(e) => set("email", e.target.value)}
              autoComplete="email"
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="auth-field">
          <label className="auth-field__label">Password</label>
          <div className="auth-field__row">
            <input
              className="auth-input"
              type={showPw ? "text" : "password"}
              placeholder="Create a strong password"
              value={f.password}
              onChange={(e) => set("password", e.target.value)}
              autoComplete="new-password"
              required
              disabled={loading}
            />
            <button type="button" className="auth-eye" onClick={() => setShowPw((v) => !v)} disabled={loading}>
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <div className="auth-field">
          <label className="auth-field__label">Confirm password</label>
          <div className="auth-field__row">
            <input
              className={`auth-input${match ? " auth-input--ok" : noMatch ? " auth-input--bad" : ""}`}
              type={showCfm ? "text" : "password"}
              placeholder="Re-enter your password"
              value={f.confirm}
              onChange={(e) => set("confirm", e.target.value)}
              autoComplete="new-password"
              required
              disabled={loading}
            />
            {f.confirm && (
              <span className={`auth-match${noMatch ? " auth-match--bad" : ""}`}>
                {match ? <Check size={13} strokeWidth={3} /> : <span style={{ fontSize: 13 }}>✕</span>}
              </span>
            )}
            <button type="button" className="auth-eye" onClick={() => setShowCfm((v) => !v)} disabled={loading}>
              {showCfm ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <button className="auth-submit" type="submit" disabled={loading || !match}>
          {loading ? (
            <>
              <span className="auth-spinner" />
              Creating account…
            </>
          ) : (
            "Create my account"
          )}
        </button>
      </form>
    </div>
  );
}

function VerifyView({ email, onResend, onVerified, onLogout, loading }) {
  const [sent, setSent] = useState(false);
  const [cd, setCd] = useState(0);

  useEffect(() => {
    if (cd <= 0) return;
    const t = setTimeout(() => {
      setCd((c) => c - 1);
      if (cd === 1) setSent(false);
    }, 1000);
    return () => clearTimeout(t);
  }, [cd]);

  const handleResend = async () => {
    if (cd > 0 || loading) return;
    await onResend?.();
    setSent(true);
    setCd(60);
  };

  return (
    <div className="auth-view--verify">
      <div className="auth-verify">
        <div className="auth-verify__rings">
          <div className="auth-verify__ring" />
          <div className="auth-verify__ring" />
          <div className="auth-verify__ring" />
          <div className="auth-verify__icon">
            <Mail size={22} strokeWidth={1.8} />
          </div>
        </div>

        <h2 className="auth-verify__title">Check your inbox</h2>
        <p className="auth-verify__body">We sent a verification link to</p>
        <span className="auth-verify__email">{email || "—"}</span>

        <p className="auth-verify__body" style={{ marginBottom: 20 }}>
          Click the link to activate your account.
          <br />
          Don't see it? Check your spam folder.
        </p>

        <div className="auth-verify__btns">
          <button className="auth-vbtn auth-vbtn--primary" onClick={onVerified} disabled={loading} type="button">
            <Check size={15} strokeWidth={2.5} />
            I've verified my email
          </button>

          <button
            className="auth-vbtn auth-vbtn--outline"
            onClick={handleResend}
            disabled={cd > 0 || loading}
            type="button"
          >
            <Mail size={14} />
            {cd > 0 ? `Send again in ${cd}s` : "Send verification email"}
          </button>

          <button className="auth-vbtn auth-vbtn--ghost" onClick={onLogout} disabled={loading} type="button">
            Sign out &amp; try again
          </button>
        </div>

        {sent && <p className="auth-verify__ok">Verification email sent.</p>}
      </div>
    </div>
  );
}

export default function Auth() {
  const navigate = useNavigate();
  const API_BASE = "https://exersearch.test/api/v1";

  const [view, setView] = useState("login"); // login | signup | role | verify
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [user, setUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);

  const hasUiChoice = (role) => (allowedUiModes(role) || []).length > 1;

  const go = (v) => {
    setError("");
    setView(v);
  };

  const handleAxiosError = (err, fallbackMsg = "Server error") => {
    const status = err?.response?.status;
    const data = err?.response?.data;

    if (status === 503) {
      navigate("/maintenance", { replace: true });
      return true;
    }

    const firstValidation =
      data?.errors && typeof data.errors === "object"
        ? Object.values(data.errors)?.flat()?.[0]
        : null;

    setError(firstValidation || data?.message || fallbackMsg);
    return true;
  };

  const fetchMe = async (token) => {
    const res = await axios.get(`${API_BASE}/me`, {
      headers: { Authorization: `Bearer ${token}` },
      withCredentials: true,
    });
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setAuthToken(null);
    go("login");
  };

  const finalizeAuth = async (token) => {
    const me = await fetchMe(token);
    setUser(me);

    if (!me?.email_verified_at) {
      go("verify");
      return;
    }

    if (hasUiChoice(me.role)) {
      go("role");
      return;
    }

    const modes = allowedUiModes(me.role) || [];
    const onlyMode = modes[0] || "user";
    setUiMode(onlyMode);
    redirectAfterAuth(me, navigate);
  };

  const handleGoogleLogin = async (credentialResponse) => {
    try {
      setLoading(true);
      setError("");

      const res = await axios.post(
        `${API_BASE}/auth/google`,
        { id_token: credentialResponse.credential },
        { withCredentials: true }
      );

      const token = res?.data?.token;
      if (!token) throw new Error("No token from backend");

      localStorage.setItem("token", token);
      setAuthToken(token);

      await finalizeAuth(token);
    } catch (err) {
      handleAxiosError(err, "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  async function handleLogin({ email, password }) {
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(
        `${API_BASE}/auth/login`,
        { email, password },
        { withCredentials: true }
      );

      const token = res?.data?.token;
      if (!token) {
        setError("Authentication failed");
        return;
      }

      localStorage.setItem("token", token);
      setAuthToken(token);

      await finalizeAuth(token);
    } catch (err) {
      handleAxiosError(err, "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(data) {
    setLoading(true);
    setError("");
    try {
      const name = `${String(data.firstName || "").trim()} ${String(data.lastName || "").trim()}`.trim();

      const res = await axios.post(
        `${API_BASE}/auth/register`,
        {
          name,
          email: data.email,
          password: data.password,
          password_confirmation: data.confirm,
        },
        { withCredentials: true }
      );

      const token = res?.data?.token;
      if (!token) {
        setError("Authentication failed");
        return;
      }

      localStorage.setItem("token", token);
      setAuthToken(token);

      await finalizeAuth(token);
    } catch (err) {
      handleAxiosError(err, "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  const handleContinueAs = (uiMode) => {
    setUiMode(uiMode);
    redirectAfterAuth(user, navigate);
  };

  const resendVerificationEmail = async () => {
    // Adjust this endpoint if your backend route differs
    await axios.post(`${API_BASE}/auth/email/resend`, null, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
      withCredentials: true,
    });
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    setAuthToken(token);
    finalizeAuth(token).catch((err) => {
      if (err?.response?.status === 503) {
        navigate("/maintenance", { replace: true });
        return;
      }
      localStorage.removeItem("token");
      setUser(null);
      setAuthToken(null);
      go("login");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const googleNode = (
    <GoogleLogin onSuccess={handleGoogleLogin} onError={() => setError("Google sign-in failed")} />
  );

  return (
    <div className="auth-root">
      <LeftPanel view={view} />

      <div className="auth-right">
        <div className="auth-right__logo">
          <button
            className="auth-home-btn"
            type="button"
            onClick={() => navigate('/')}
            title="Back to home"
          >
            <Home size={15} strokeWidth={2} />
            Home
          </button>
          
        </div>

        <div className="auth-right__inner">
          <div className="auth-card">
            {view === "login" && (
              <LoginView
                onSwitch={() => go("signup")}
                onSubmit={handleLogin}
                loading={loading}
                error={error}
                googleNode={googleNode}
              />
            )}

            {view === "signup" && (
              <SignupView
                onSwitch={() => go("login")}
                onSubmit={handleSignup}
                loading={loading}
                error={error}
                googleNode={googleNode}
              />
            )}

            {view === "role" && (
              <RoleView
                user={user}
                loading={loading}
                onBack={() => go("login")}
                onLogout={logout}
                onSelectMode={handleContinueAs}
              />
            )}

            {view === "verify" && (
              <VerifyView
                email={user?.email}
                loading={loading}
                onVerified={() => authToken && finalizeAuth(authToken)}
                onResend={resendVerificationEmail}
                onLogout={logout}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}