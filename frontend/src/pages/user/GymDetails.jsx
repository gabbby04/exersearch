// GymDetails.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import "./Homestyles.css";
import Swal from "sweetalert2";
import { api } from "../../utils/apiClient";
import { absoluteUrl } from "../../utils/findGymsData";
import RequestMembershipModal from "./RequestMembershipModal";
import GiftRevealModal from "./GiftRevealModal";
import RateGymModal from "./RateGymModal";
import {
  claimFreeVisit,
  getMyFreeVisits,
  findMyFreeVisitForGym,
} from "../../utils/gymFreeVisitApi";
import {
  getGymRatings,
  normalizeGymRatingsResponse,
} from "../../utils/gymRatingApi";
import ReviewsModal from "./ReviewsModal";

const GYM_SHOW_ENDPOINT = (id) => `/gyms/${id}`;

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmtPeso(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return `₱${x.toLocaleString()}`;
}

function formatTimeMaybeISO(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function joinImages(main, gallery) {
  const arr = [];
  if (main) arr.push(main);
  if (Array.isArray(gallery)) arr.push(...gallery);
  return [...new Set(arr.filter(Boolean).map((x) => String(x)))];
}

function clamp(n, a, b) {
  const x = Number(n);
  if (!Number.isFinite(x)) return a;
  return Math.max(a, Math.min(b, x));
}

// ✅ ONLY 5 STARS
function StarRow({ value = 0, compact = false }) {
  const v = clamp(value, 0, 5);
  const full = Math.round(v);

  return (
    <div className={`starrow ${compact ? "starrow-compact" : ""}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`star ${i <= full ? "filled" : ""}`}
          aria-hidden="true"
        >
          ★
        </span>
      ))}
    </div>
  );
}

function StatCard({ icon, value, label, color }) {
  return (
    <div className={`stat-card stat-${color}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-content">
        <div className="stat-value">{value}+</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

function RatingStatCard({ rating, label, color, verifiedCount }) {
  const val = typeof rating === "number" ? rating : null;

  return (
    <div className={`stat-card stat-${color}`}>
      <div className="stat-icon">⭐</div>
      <div className="stat-content">
        <div className="stat-value">{val == null ? "—" : val.toFixed(1)}</div>
        <div className="stat-label">{label}</div>
        <div className="stat-sub">
          <StarRow value={val || 0} compact />
          <span className="stat-subtxt">{verifiedCount} verified</span>
        </div>
      </div>
    </div>
  );
}

export default function GymDetails() {
  const { id } = useParams();
  const gymIdNum = useMemo(() => Number(id), [id]);
  const [showReviewsModal, setShowReviewsModal] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [gym, setGym] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [isLiked, setIsLiked] = useState(false);

  const statsRef = useRef(null);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [count, setCount] = useState({ machines: 0, members: 0, trainers: 0 });

  const preferredPlan = location?.state?.plan_type || null;

  const [showMembershipModal, setShowMembershipModal] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);

  const [freeVisitsRes, setFreeVisitsRes] = useState(null);
  const [freeVisitBusy, setFreeVisitBusy] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);

  const [myUserId, setMyUserId] = useState(null);

  // ✅ membership for this gym
  const [myGymMembership, setMyGymMembership] = useState(null);
  const [membershipLoading, setMembershipLoading] = useState(false);

  // ✅ my ratings (searchable, accurate)
  const [myRatings, setMyRatings] = useState([]);
  const [myRatingsLoading, setMyRatingsLoading] = useState(false);

  const [ratingsState, setRatingsState] = useState({
    summary: {
      public_avg_stars: null,
      verified_count: 0,
      unverified_count: 0,
      total_count: 0,
      note: "",
    },
    ratings: [],
    pagination: { current_page: 1, last_page: 1, total: 0, per_page: 0 },
  });
  const [ratingsLoading, setRatingsLoading] = useState(false);

  async function refreshRatings(gymId) {
    if (!gymId) return;
    try {
      setRatingsLoading(true);
      const data = await getGymRatings(gymId, { per_page: 6 });
      setRatingsState(normalizeGymRatingsResponse(data));
    } catch (e) {
      console.error(e);
    } finally {
      setRatingsLoading(false);
    }
  }

  // ✅ ALWAYS compute these with hooks BEFORE any returns
  const images = useMemo(() => {
    if (!gym) return [];
    const list = joinImages(gym?.main_image_url, gym?.gallery_urls);
    return list.length ? list.map((u) => absoluteUrl(u)) : [];
  }, [gym]);

  const displayPrice = useMemo(() => {
    if (!gym) return "—";

    const daily = safeNum(gym?.daily_price);
    const monthly = safeNum(gym?.monthly_price);
    const annual = safeNum(gym?.annual_price);

    if (preferredPlan === "daily" && daily > 0) return `${fmtPeso(daily)}/day`;
    if (preferredPlan === "monthly" && monthly > 0)
      return `${fmtPeso(monthly)}/month`;
    if (preferredPlan === "annual" && annual > 0)
      return `${fmtPeso(annual)}/year`;

    if (monthly > 0) return `${fmtPeso(monthly)}/month`;
    if (daily > 0) return `${fmtPeso(daily)}/day`;
    if (annual > 0) return `${fmtPeso(annual)}/year`;
    return "—";
  }, [gym, preferredPlan]);

  const hoursText = useMemo(() => {
    if (!gym) return "—";
    const open = formatTimeMaybeISO(gym?.opening_time);
    const close = formatTimeMaybeISO(gym?.closing_time);
    if (open === "—" && close === "—") return "—";
    return `${open} – ${close}`;
  }, [gym]);

  const publicAvg = useMemo(
    () => ratingsState?.summary?.public_avg_stars,
    [ratingsState]
  );
  const ratingValue = useMemo(
    () => (typeof publicAvg === "number" ? publicAvg : null),
    [publicAvg]
  );

  // ✅ accurate: MY rating for THIS gym (from /me/ratings)
  const myGymRating = useMemo(() => {
    if (!gymIdNum) return null;
    const list = Array.isArray(myRatings) ? myRatings : [];
    return list.find((r) => Number(r?.gym_id) === gymIdNum) || null;
  }, [myRatings, gymIdNum]);

  const hasMembershipHere = useMemo(() => {
    if (!myGymMembership) return false;
    return true;
  }, [myGymMembership]);

  // ✅ NEW: amenities + equipments helpers (so UI doesn't crash)
  const amenities = useMemo(() => {
    const list = Array.isArray(gym?.amenities) ? gym.amenities : [];
    return list;
  }, [gym]);

  const equipments = useMemo(() => {
    const list = Array.isArray(gym?.equipments) ? gym.equipments : [];
    return list;
  }, [gym]);

  // ✅ load /me for user_id
  useEffect(() => {
    let cancelled = false;

    async function loadMe() {
      try {
        const res = await api.get("/me");
        const u = res?.data?.user || res?.data?.data || res?.data || null;
        const uid = u?.user_id ?? u?.id ?? null;
        if (!cancelled) setMyUserId(uid != null ? Number(uid) : null);
      } catch {
        if (!cancelled) setMyUserId(null);
      }
    }

    loadMe();
    return () => {
      cancelled = true;
    };
  }, []);

  // ✅ load gym
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(GYM_SHOW_ENDPOINT(id));
        const data = res.data?.data || res.data?.gym || res.data || null;
        if (!cancelled) {
          setGym(data);
          setCurrentImageIndex(0);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError(
            e?.response?.data?.message ||
              e?.message ||
              "Failed to load gym details"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (id != null) load();
    else {
      setLoading(false);
      setError("Missing gym id");
    }

    return () => {
      cancelled = true;
    };
  }, [id]);

  // ✅ load ratings (gym)
  useEffect(() => {
    if (!gymIdNum) return;
    refreshRatings(gymIdNum);
  }, [gymIdNum]);

  // ✅ load my ratings (search)
  useEffect(() => {
    let cancelled = false;

    async function loadMyRatings() {
      try {
        setMyRatingsLoading(true);
        const res = await api.get(`/me/ratings?page=1`, {
          headers: { "Cache-Control": "no-cache" },
        });
        const data = res?.data?.data;
        const list = Array.isArray(data) ? data : [];
        if (!cancelled) setMyRatings(list);
      } catch (e) {
        console.error(e);
        if (!cancelled) setMyRatings([]);
      } finally {
        if (!cancelled) setMyRatingsLoading(false);
      }
    }

    loadMyRatings();
    return () => {
      cancelled = true;
    };
  }, []);

  // ✅ load my memberships for this gym
  useEffect(() => {
    let cancelled = false;

    async function loadMyMembershipForGym(gymId) {
      if (!gymId) return;

      try {
        setMembershipLoading(true);

        const res = await api.get(`/me/memberships?per_page=200&page=1`, {
          headers: { "Cache-Control": "no-cache" },
        });

        const list = Array.isArray(res?.data?.data)
          ? res.data.data
          : Array.isArray(res?.data)
          ? res.data
          : [];

        const row = list.find((m) => Number(m?.gym_id) === Number(gymId));
        if (!cancelled) setMyGymMembership(row || null);
      } catch (e) {
        console.error(e);
        if (!cancelled) setMyGymMembership(null);
      } finally {
        if (!cancelled) setMembershipLoading(false);
      }
    }

    loadMyMembershipForGym(gymIdNum);

    return () => {
      cancelled = true;
    };
  }, [gymIdNum]);

  // liked gyms
  useEffect(() => {
    const saved = localStorage.getItem("likedGyms");
    if (!saved) return;
    try {
      const set = new Set(JSON.parse(saved));
      setIsLiked(set.has(gymIdNum));
    } catch {}
  }, [gymIdNum]);

  const toggleLike = () => {
    const saved = localStorage.getItem("likedGyms");
    let set = new Set();
    try {
      if (saved) set = new Set(JSON.parse(saved));
    } catch {}

    if (set.has(gymIdNum)) set.delete(gymIdNum);
    else set.add(gymIdNum);

    localStorage.setItem("likedGyms", JSON.stringify([...set]));
    setIsLiked(set.has(gymIdNum));
  };

  const nextImage = () => {
    if (!images.length) return;
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    if (!images.length) return;
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const openDirection = () => {
    const gLat = gym?.latitude;
    const gLng = gym?.longitude;
    if (gLat == null || gLng == null) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        window.open(
          `https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${gLat},${gLng}&travelmode=driving`,
          "_blank"
        );
      },
      () => {
        window.open(
          `https://www.google.com/maps/search/?api=1&query=${gLat},${gLng}`,
          "_blank"
        );
      }
    );
  };

  // animated stats
  useEffect(() => {
    if (!gym) return;

    const target = {
      machines: Array.isArray(gym?.equipments) ? gym.equipments.length : 0,
      members: 0,
      trainers: gym?.has_personal_trainers ? 1 : 0,
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            Object.keys(target).forEach((k) => {
              let i = 0;
              const t = target[k];
              const inc = Math.max(1, Math.ceil(t / 25));
              const interval = setInterval(() => {
                i += inc;
                if (i >= t) {
                  setCount((p) => ({ ...p, [k]: t }));
                  clearInterval(interval);
                } else {
                  setCount((p) => ({ ...p, [k]: i }));
                }
              }, 20);
            });
            setHasAnimated(true);
          }
        });
      },
      { threshold: 0.25 }
    );

    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, [gym, hasAnimated]);

  // free pass
  useEffect(() => {
    let cancelled = false;

    async function loadMyFreeVisits() {
      if (!gym?.gym_id) return;
      if (!gym?.free_first_visit_enabled) return;

      try {
        const res = await getMyFreeVisits({ perPage: 50, page: 1 });
        if (!cancelled) setFreeVisitsRes(res);
      } catch (e) {
        console.error(e);
      }
    }

    loadMyFreeVisits();

    return () => {
      cancelled = true;
    };
  }, [gym?.gym_id, gym?.free_first_visit_enabled]);

  const myFreeVisitRow = useMemo(() => {
    return findMyFreeVisitForGym(freeVisitsRes, gym?.gym_id);
  }, [freeVisitsRes, gym?.gym_id]);

  const freeVisitStatus = String(myFreeVisitRow?.status || "");
  const hasFreeVisit = !!myFreeVisitRow;
  const freeVisitUsed = freeVisitStatus === "used";

  async function onFreePassClick() {
    if (!gym?.free_first_visit_enabled) return;

    if (hasFreeVisit) {
      setShowGiftModal(true);
      return;
    }

    try {
      setFreeVisitBusy(true);
      await claimFreeVisit(gym.gym_id);

      setShowGiftModal(true);

      const res = await getMyFreeVisits({ perPage: 50, page: 1 });
      setFreeVisitsRes(res);
    } catch (e) {
      console.error(e);
      alert(e?.message || "Failed to claim free pass");
    } finally {
      setFreeVisitBusy(false);
    }
  }

  // ✅ NOW it is safe to return early (ALL hooks already ran)
  if (loading) {
    return (
      <div className="gym-details-page">
        <div style={{ padding: 24, fontWeight: 900 }}>Loading gym…</div>
      </div>
    );
  }

  if (error || !gym) {
    return (
      <div className="gym-details-page">
        <div style={{ padding: 24 }}>
          <div style={{ fontWeight: 950, color: "#dc2626" }}>
            {error || "Gym not found"}
          </div>
          <div style={{ marginTop: 12 }}>
            <button className="favorite-btn-small" onClick={() => navigate(-1)}>
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const gLat = gym?.latitude;
  const gLng = gym?.longitude;

  return (
    <div className="gym-details-page">
      <section className="gym-hero">
        <div className="hero-overlay" />
        <div className="hero-content">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="back-link-btn"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Results
          </button>

          <div className="hero-info">
            <div className="hero-text">
              <h1 className="gym-name">{gym?.name}</h1>
              <p className="gym-tagline">
                {gym?.gym_type ? `${gym.gym_type} Gym` : "Gym Details"}
              </p>

              <div className="hero-meta">
                <span className="location-badge">📍 {gym?.address || "—"}</span>
                {gym?.has_personal_trainers ? (
                  <span className="rating-badge">🎯 Personal Trainers</span>
                ) : null}
                {gym?.has_classes ? (
                  <span className="rating-badge">📅 Classes</span>
                ) : null}
                {gym?.is_24_hours ? (
                  <span className="rating-badge">🕐 24 Hours</span>
                ) : null}
              </div>
            </div>

            <div className="hero-actions">
              <span className="price-tag">{displayPrice}</span>

              <button
                className={`favorite-btn-hero ${isLiked ? "liked" : ""}`}
                onClick={toggleLike}
                title={isLiked ? "Saved" : "Save"}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill={isLiked ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="image-gallery">
          <button
            className="gallery-nav prev"
            onClick={prevImage}
            disabled={!images.length}
            title="Previous"
          >
            ‹
          </button>

          <img
            src={
              images[currentImageIndex] ||
              "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&h=700&fit=crop"
            }
            alt={`${gym?.name} - Image ${currentImageIndex + 1}`}
            className="gallery-image"
          />

          <button
            className="gallery-nav next"
            onClick={nextImage}
            disabled={!images.length}
            title="Next"
          >
            ›
          </button>

          <div className="gallery-dots">
            {images.map((_, index) => (
              <span
                key={index}
                className={`dot ${index === currentImageIndex ? "active" : ""}`}
                onClick={() => setCurrentImageIndex(index)}
              />
            ))}
          </div>
        </div>
      </section>

      <div className="gym-details-container">
        <div className="details-grid">
          <div className="main-column">
            <div className="detail-card about-section">
              <h2 className="section-title">About This Gym</h2>
              <p className="gym-description">
                {gym?.description || "No description provided."}
              </p>
            </div>

            <div className="detail-card hours-section">
              <h2 className="section-title">Operating Hours</h2>
              <div className="hours-info">
                <div className="hours-icon">🕐</div>
                <div className="hours-text">
                  <p className="hours-time">{hoursText}</p>
                  <span className="hours-status open">
                    {gym?.is_24_hours ? "Open 24 Hours" : "Hours Available"}
                  </span>
                </div>
              </div>
            </div>

            <div className="detail-card hours-section">
              <h2 className="section-title">Pricing</h2>
              <div style={{ display: "grid", gap: 10 }}>
                <div className="equipment-item" style={{ fontWeight: 800 }}>
                  💰 Daily:{" "}
                  {safeNum(gym?.daily_price) ? fmtPeso(gym.daily_price) : "—"}
                </div>
                <div className="equipment-item" style={{ fontWeight: 800 }}>
                  💳 Monthly:{" "}
                  {safeNum(gym?.monthly_price)
                    ? fmtPeso(gym.monthly_price)
                    : "—"}
                </div>
                <div className="equipment-item" style={{ fontWeight: 800 }}>
                  🏆 Annual:{" "}
                  {safeNum(gym?.annual_price) ? fmtPeso(gym.annual_price) : "—"}
                </div>
              </div>
            </div>

            <div className="detail-card stats-section" ref={statsRef}>
              <h2 className="section-title">Gym Statistics</h2>
              <div className="stats-grid">
                <StatCard
                  icon="🏋️"
                  value={count.machines}
                  label="Equipments"
                  color="orange"
                />
                <StatCard
                  icon="🎯"
                  value={count.trainers}
                  label="Trainers"
                  color="green"
                />
                <RatingStatCard
                  rating={ratingValue}
                  label="Rating"
                  color="blue"
                  verifiedCount={ratingsState?.summary?.verified_count || 0}
                />
              </div>
            </div>

            {/* ✅ ADDED: Amenities */}
            <div className="detail-card amenities-section">
              <h2 className="section-title">Amenities & Features</h2>

              <div className="amenities-grid">
                {amenities.length === 0 ? (
                  <div className="muted-empty">No amenities listed.</div>
                ) : (
                  amenities.map((a) => {
                    const available = a?.pivot?.availability_status ?? true;
                    const note = a?.pivot?.notes || a?.description || "";
                    const img = a?.pivot?.image_url || a?.image_url || null;

                    return (
                      <div
                        key={a?.amenity_id ?? a?.id ?? a?.name}
                        className={`amenity-item ${
                          available ? "" : "amenity-unavailable"
                        }`}
                        title={note || a?.name}
                      >
                        {img ? (
                          <img
                            className="amenity-img"
                            src={absoluteUrl(img)}
                            alt={a?.name || "Amenity"}
                            loading="lazy"
                          />
                        ) : (
                          <span className="amenity-icon">✨</span>
                        )}

                        <div className="amenity-text">
                          <div className="amenity-name">
                            {a?.name || "Amenity"}
                          </div>
                          {available ? null : (
                            <div className="amenity-sub">(Unavailable)</div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ✅ ADDED: Equipments */}
            <div className="detail-card equipment-section">
              <h2 className="section-title">Available Equipment</h2>

              <div className="equipment-list">
                {equipments.length === 0 ? (
                  <div className="muted-empty">No equipments listed.</div>
                ) : (
                  equipments.map((e) => (
                    <div
                      key={e?.equipment_id ?? e?.id ?? e?.name}
                      className="equipment-item"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                      <span className="equipment-name">
                        {String(e?.name || "").replaceAll("_", " ")}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="sidebar-column">
            <div className="detail-card map-card">
              <h2 className="section-title">Location</h2>
              <div className="map-container">
                <iframe
                  title="Gym Location Map"
                  className="gym-map"
                  src={`https://maps.google.com/maps?q=${gLat},${gLng}&z=15&output=embed`}
                  loading="lazy"
                />
              </div>
              <p className="map-address">📍 {gym?.address || "—"}</p>
              <button className="direction-btn" onClick={openDirection}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" />
                </svg>
                Get Directions
              </button>
            </div>

            {/* ✅ QUICK ACTIONS updated */}
            <div className="detail-card actions-card">
              <h2 className="section-title">Quick Actions</h2>

              <div className="action-buttons">
                {hasMembershipHere ? (
                  <button
                    className="action-btn primary"
                    type="button"
                    onClick={() => navigate("/home/memberships")}
                  >
                    <span className="action-icon">🎫</span>
                    View Membership
                  </button>
                ) : (
                  <button
                    className="action-btn primary"
                    type="button"
                    onClick={() => setShowMembershipModal(true)}
                    disabled={membershipLoading}
                    title={
                      membershipLoading
                        ? "Checking membership…"
                        : "Get Membership"
                    }
                  >
                    <span className="action-icon">🎫</span>
                    {membershipLoading ? "Checking…" : "Get Membership"}
                  </button>
                )}

                <button
                  className="action-btn secondary"
                  type="button"
                  onClick={() => setShowRateModal(true)}
                  disabled={myRatingsLoading}
                  title={myGymRating ? "Edit your rating" : "Rate this gym"}
                >
                  <span className="action-icon">⭐</span>
                  {myRatingsLoading
                    ? "Checking…"
                    : myGymRating
                    ? "Edit Rating"
                    : "Rate this Gym"}
                </button>

                {gym?.free_first_visit_enabled ? (
                  <button
                    className="action-btn secondary"
                    type="button"
                    onClick={onFreePassClick}
                    disabled={freeVisitBusy}
                    title="Free First Visit"
                  >
                    <span className="action-icon">🎁</span>
                    {freeVisitBusy
                      ? "Claiming…"
                      : freeVisitUsed
                      ? "Pass Used"
                      : hasFreeVisit
                      ? "View 1st Visit Free Pass"
                      : "Free  1st Visit Free Pass"}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="detail-card reviews-card">
              <div className="reviews-head">
                <h2 className="section-title" style={{ marginBottom: 0 }}>
                  Reviews
                </h2>

                <button
                  className="reviews-showall"
                  type="button"
                  onClick={() => setShowReviewsModal(true)}
                >
                  Show all
                </button>
              </div>

              <div className="reviews-list">
                {ratingsLoading ? (
                  <div className="reviews-empty">Loading…</div>
                ) : (ratingsState?.ratings || []).length === 0 ? (
                  <div className="reviews-empty">No reviews yet.</div>
                ) : (
                  (ratingsState.ratings || []).slice(0, 3).map((r) => {
                    const name = r?.user?.name || "User";
                    const tag = reviewTag(r);

                    const reviewerId = Number(
                      r?.user_id ?? r?.user?.user_id ?? r?.user?.id ?? NaN
                    );
                    const isMine =
                      myUserId != null &&
                      Number.isFinite(reviewerId) &&
                      reviewerId === myUserId;

                    return (
                      <div
                        key={r.rating_id}
                        className={`review-item ${isMine ? "mine" : ""}`}
                      >
                        <div className="review-top">
                          <div className="review-user">
                            <div className="review-name-row">
                              <div className="review-name">
                                {isMine ? "You" : name}
                              </div>
                              {isMine ? (
                                <span className="review-you">You</span>
                              ) : null}
                            </div>
                            <div className={`review-tag ${tag.cls}`}>
                              {tag.label}
                            </div>
                          </div>

                          <div className="review-stars">
                            <StarRow value={Number(r?.stars || 0)} compact />
                          </div>
                        </div>

                        {r?.review ? (
                          <div className="review-text">
                            {String(r.review).slice(0, 140)}
                            {String(r.review).length > 140 ? "…" : ""}
                          </div>
                        ) : (
                          <div className="review-text empty">No comment.</div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showReviewsModal ? (
        <ReviewsModal
          open={showReviewsModal}
          onClose={() => setShowReviewsModal(false)}
          gymId={gym?.gym_id ?? Number(id)}
          gymName={gym?.name}
          myUserId={myUserId}
          onEditMine={() => {
            setShowReviewsModal(false);
            setShowRateModal(true);
          }}
        />
      ) : null}

      {showMembershipModal ? (
        <RequestMembershipModal
          gym={gym}
          onClose={() => setShowMembershipModal(false)}
          onSuccess={() => setShowMembershipModal(false)}
        />
      ) : null}

      {showRateModal ? (
        <RateGymModal
          gym={gym}
          onClose={() => setShowRateModal(false)}
          onSuccess={() => {
            setShowRateModal(false);

            refreshRatings(gym?.gym_id ?? gymIdNum);

            (async () => {
              try {
                const res = await api.get(`/me/ratings?page=1`, {
                  headers: { "Cache-Control": "no-cache" },
                });
                const data = res?.data?.data;
                setMyRatings(Array.isArray(data) ? data : []);
              } catch {}
            })();
          }}
        />
      ) : null}

      {showGiftModal ? (
        <GiftRevealModal
          open={showGiftModal}
          onClose={() => setShowGiftModal(false)}
          gymName={gym?.name}
          status={freeVisitUsed ? "used" : "claimed"}
          claimCode={myFreeVisitRow?.free_visit_id}
        />
      ) : null}
    </div>
  );
}

function reviewTag(r) {
  // Prefer verified flag if backend sends it reliably
  const verifiedBool = r?.verified === true;

  if (verifiedBool) {
    const via = String(r?.verified_via || "").toLowerCase();
    if (via === "membership") return { label: "Member", cls: "tag-member" };
    if (via === "free_visit_used")
      return { label: "Visited", cls: "tag-visited" };
    return { label: "Verified", cls: "tag-member" };
  }

  const via = String(r?.verified_via || "").toLowerCase();
  if (via === "membership") return { label: "Member", cls: "tag-member" };
  if (via === "free_visit_used") return { label: "Visited", cls: "tag-visited" };
  return { label: "Unverified", cls: "tag-unverified" };
}