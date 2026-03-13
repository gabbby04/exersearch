import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./SavedGyms.css";
import { api } from "../../utils/apiClient";
import { absoluteUrl } from "../../utils/findGymsData";
import {
  MapPin,
  Clock,
  Tag,
  CalendarCheck,
  CreditCard,
  ArrowLeft,
  RefreshCw,
  Heart,
  Dumbbell,
  Search,
  Trash2,
  BookmarkX,
  AlertCircle,
  Loader2,
} from "lucide-react";

const SAVED_ENDPOINT = "/user/saved-gyms";

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmtPeso(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return `₱${x.toLocaleString()}`;
}

function pickPlanPrice(g, planType) {
  const plan = (planType || "").toLowerCase();
  if (plan === "daily") return safeNum(g?.daily_price);
  if (plan === "annual" || plan === "yearly") return safeNum(g?.annual_price);
  return safeNum(g?.monthly_price);
}

function prettyPlan(planType) {
  const p = (planType || "").toLowerCase();
  if (p === "daily") return "day";
  if (p === "annual" || p === "yearly") return "year";
  return "month";
}

export default function SavedGyms() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [busyGymId, setBusyGymId] = useState(null);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [planType] = useState("monthly");

  const fetchSaved = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(SAVED_ENDPOINT);
      const data = res.data?.data;
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.message || e?.message || "Failed to load saved gyms");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSaved(); }, [fetchSaved]);

  const unsave = async (gymId) => {
    if (!gymId) return;
    setBusyGymId(gymId);
    const prev = rows;
    setRows((cur) => cur.filter((x) => x.gym_id !== gymId));
    try {
      await api.delete(`${SAVED_ENDPOINT}/${gymId}`);
    } catch (e) {
      console.error(e);
      setRows(prev);
      setError(e?.response?.data?.message || e?.message || "Failed to unsave gym");
    } finally {
      setBusyGymId(null);
    }
  };

  const savedCount = rows.length;

  const normalized = useMemo(() => {
    return rows.map((g) => ({
      ...g,
      _image: g?.main_image_url
        ? absoluteUrl(g.main_image_url)
        : "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=400&fit=crop",
      _addr: g?.address || (g?.latitude != null && g?.longitude != null
        ? `${g.latitude}, ${g.longitude}` : "—"),
      _price: pickPlanPrice(g, planType),
    }));
  }, [rows, planType]);

  return (
    <div className="sg-page">

      {/* ── HEADER ── */}
      <section className="sg-header">
        <div className="sg-container">
          <div className="sg-header-top">
            <div className="sg-header-text">
              <div className="sg-header-eyebrow">Your Collection</div>
              <h1 className="sg-header-title">Saved Gyms</h1>
              <p className="sg-header-sub">Your bookmarked gyms — ready when you are.</p>
            </div>

            <div className="sg-header-actions">
              <button className="sg-btn sg-btn-ghost" onClick={() => navigate("/home/gym-results")}>
                <ArrowLeft size={14} />Results
              </button>
              <button className="sg-btn sg-btn-ghost" onClick={fetchSaved}>
                <RefreshCw size={14} />Refresh
              </button>
            </div>
          </div>

          <div className="sg-summary-row">
            <span className="sg-summary-pill">
              <Heart size={12} />Saved: <b>{savedCount}</b>
            </span>
            <span className="sg-summary-pill">
              <CreditCard size={12} />Plan: <b>{prettyPlan(planType)}</b>
            </span>
          </div>
        </div>
      </section>

      {/* ── BODY ── */}
      <section className="sg-body">
        <div className="sg-container">

          {loading ? (
            <div className="sg-state">
              <div className="sg-state-icon">
                <Loader2 size={30} className="sg-spinner" />
              </div>
              <div className="sg-state-title">Loading your saved gyms…</div>
              <div className="sg-state-sub">Fetching your bookmarked gym collection.</div>
            </div>

          ) : error ? (
            <div className="sg-state sg-state-error">
              <div className="sg-state-icon">
                <AlertCircle size={30} />
              </div>
              <div className="sg-state-title">Something went wrong</div>
              <div className="sg-state-sub">{error}</div>
              <button className="sg-btn sg-btn-primary" onClick={fetchSaved}>
                <RefreshCw size={14} />Try Again
              </button>
            </div>

          ) : savedCount === 0 ? (
            <div className="sg-empty-wrap">
              <div className="sg-empty-card">
                <div className="sg-empty-icon">
                  <BookmarkX size={38} />
                </div>
                <div className="sg-empty-title">No saved gyms yet</div>
                <div className="sg-empty-sub">
                  Start exploring and tap <b>Save</b> to keep gyms here.
                </div>
                <div className="sg-empty-actions">
                  <Link className="sg-btn sg-btn-primary" to="/home/gyms">
                    <Dumbbell size={14} />Gyms List
                  </Link>
                  <Link className="sg-btn sg-btn-ghost" to="/home/find-gyms">
                    <Search size={14} />Find Gyms for You
                  </Link>
                </div>
              </div>
            </div>

          ) : (
            <div className="sg-list">
              {normalized.map((gym) => {
                const gymId = gym.gym_id;
                const isBusy = busyGymId === gymId;

                return (
                  <div key={gym.saved_id || gymId} className="sg-card">
                    <div className="sg-card-image">
                      <img src={gym._image} alt={gym.name} loading="lazy" />
                      <div className="sg-card-image-overlay" />
                    </div>

                    <div className="sg-card-body">
                      <div className="sg-card-top">
                        <div className="sg-card-info">
                          <h2 className="sg-gym-name">{gym.name}</h2>
                          <p className="sg-gym-addr">
                          <MapPin size={12} /><span>{gym._addr}</span>
                        </p>
                        </div>
                        <div className="sg-price-pill">
                          <CreditCard size={12} />
                          {fmtPeso(gym._price)}<span>/ {prettyPlan(planType)}</span>
                        </div>
                      </div>

                      <div className="sg-meta-row">
                        <span className="sg-meta-pill">
                          <Clock size={11} />
                          {gym.opening_time || "—"} – {gym.closing_time || "—"}
                        </span>
                        <span className="sg-meta-pill">
                          <Tag size={11} />
                          {gym.gym_type || "Gym"}
                        </span>
                        <span className="sg-meta-pill">
                          <CalendarCheck size={11} />
                          Saved {gym.saved_at ? new Date(gym.saved_at).toLocaleDateString() : "—"}
                        </span>
                      </div>

                      <div className="sg-card-divider" />

                      <div className="sg-card-actions">
                        <Link to={`/home/gym/${gymId}`} className="sg-btn sg-btn-primary">
                          View Full Details
                        </Link>
                        <button
                          className="sg-btn sg-btn-danger"
                          onClick={() => unsave(gymId)}
                          disabled={isBusy}
                        >
                          {isBusy
                            ? <><Loader2 size={13} className="sg-spinner" />Removing…</>
                            : <><Trash2 size={13} />Unsave</>
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </section>
    </div>
  );
}