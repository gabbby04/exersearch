import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import "./GymDetails.css";
import Swal from "sweetalert2";
import { api } from "../../utils/apiClient";
import { absoluteUrl } from "../../utils/findGymsData";

import RequestMembershipModal from "./RequestMembershipModal";
import GiftRevealModal from "./GiftRevealModal";
import RateGymModal from "./RateGymModal";
import GymInquiryModal from "./GymInquiryModal";
import { askGymInquiry } from "../../utils/gymInquiriesApi";
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

import {
  ArrowLeft,
  MapPin,
  Clock,
  Star,
  Dumbbell,
  Users,
  CreditCard,
  Ticket,
  Gift,
  Phone,
  Mail,
  Globe,
  Navigation,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Heart,
  Target,
  CalendarDays,
  Timer,
  Check,
  Pencil,
  Loader2,
  Zap,
  Trophy,
  ShieldCheck,
  Sparkles,
  Facebook,
  Instagram,
  UserCircle,
} from "lucide-react";

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

function StarRow({ value = 0, compact = false }) {
  const v = clamp(value, 0, 5);
  const full = Math.round(v);
  return (
    <div className={`ugd-starrow ${compact ? "ugd-starrow-compact" : ""}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={compact ? 11 : 15}
          className={`ugd-star ${i <= full ? "filled" : ""}`}
          fill={i <= full ? "currentColor" : "none"}
        />
      ))}
    </div>
  );
}

function StatCard({ icon, value, label, color }) {
  return (
    <div className={`ugd-stat-card ugd-stat-${color}`}>
      <div className="ugd-stat-icon">{icon}</div>
      <div className="ugd-stat-content">
        <div className="ugd-stat-value">{value}+</div>
        <div className="ugd-stat-label">{label}</div>
      </div>
    </div>
  );
}

function RatingStatCard({ rating, label, color, verifiedCount }) {
  const val = typeof rating === "number" ? rating : null;
  return (
    <div className={`ugd-stat-card ugd-stat-${color}`}>
      <div className="ugd-stat-icon"><Star size={20} /></div>
      <div className="ugd-stat-content">
        <div className="ugd-stat-value">{val == null ? "—" : val.toFixed(1)}</div>
        <div className="ugd-stat-label">{label}</div>
        <div className="ugd-stat-sub">
          <StarRow value={val || 0} compact />
          <span className="ugd-stat-subtxt">{verifiedCount} verified</span>
        </div>
      </div>
    </div>
  );
}

export default function GymDetails() {
  const { id } = useParams();
  const gymIdNum = useMemo(() => Number(id), [id]);

  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [gymInquiryOpen, setGymInquiryOpen] = useState(false);
  const [gymInquirySending, setGymInquirySending] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const onSendGymInquiry = async (gymId, question) => {
    setGymInquirySending(true);
    try {
      await askGymInquiry(gymId, { question });
      setGymInquiryOpen(false);
      await Swal.fire({
        title: "Message Sent!",
        text: "Your inquiry was successfully sent to the gym.",
        icon: "success",
        confirmButtonText: "Great!",
        confirmButtonColor: "#ff6a2a",
        iconColor: "#ff6a2a",
      });
    } catch (e) {
      await Swal.fire({
        title: "Failed",
        text: e?.response?.data?.message || e?.message || "Failed to send inquiry.",
        icon: "error",
        confirmButtonColor: "#dc2626",
      });
    } finally {
      setGymInquirySending(false);
    }
  };

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
  const [myGymMembership, setMyGymMembership] = useState(null);
  const [membershipLoading, setMembershipLoading] = useState(false);
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
    if (preferredPlan === "monthly" && monthly > 0) return `${fmtPeso(monthly)}/month`;
    if (preferredPlan === "annual" && annual > 0) return `${fmtPeso(annual)}/year`;
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

  const publicAvg = useMemo(() => ratingsState?.summary?.public_avg_stars, [ratingsState]);
  const ratingValue = useMemo(() => (typeof publicAvg === "number" ? publicAvg : null), [publicAvg]);

  const myGymRating = useMemo(() => {
    if (!gymIdNum) return null;
    const list = Array.isArray(myRatings) ? myRatings : [];
    return list.find((r) => Number(r?.gym_id) === gymIdNum) || null;
  }, [myRatings, gymIdNum]);

  const membershipStatus = useMemo(() => {
    const s = myGymMembership?.status ?? "";
    return String(s).toLowerCase().trim();
  }, [myGymMembership]);

  const hasActiveMembershipHere = useMemo(() => {
    if (!myGymMembership) return false;
    return ["active", "approved"].includes(membershipStatus);
  }, [myGymMembership, membershipStatus]);

  const isPendingMembershipHere = useMemo(() => {
    if (!myGymMembership) return false;
    return ["pending", "processing", "under_review"].includes(membershipStatus);
  }, [myGymMembership, membershipStatus]);

  const amenities = useMemo(() => (Array.isArray(gym?.amenities) ? gym.amenities : []), [gym]);
  const equipments = useMemo(() => (Array.isArray(gym?.equipments) ? gym.equipments : []), [gym]);

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
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(GYM_SHOW_ENDPOINT(id));
        const data = res.data?.data || res.data?.gym || res.data || null;
        if (!cancelled) { setGym(data); setCurrentImageIndex(0); }
      } catch (e) {
        console.error(e);
        if (!cancelled) setError(e?.response?.data?.message || e?.message || "Failed to load gym details");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (id != null) load();
    else { setLoading(false); setError("Missing gym id"); }
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => { if (!gymIdNum) return; refreshRatings(gymIdNum); }, [gymIdNum]);

  useEffect(() => {
    let cancelled = false;
    async function loadMyRatings() {
      try {
        setMyRatingsLoading(true);
        const res = await api.get(`/me/ratings?page=1`, { headers: { "Cache-Control": "no-cache" } });
        const data = res?.data?.data;
        if (!cancelled) setMyRatings(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setMyRatings([]);
      } finally {
        if (!cancelled) setMyRatingsLoading(false);
      }
    }
    loadMyRatings();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadMyMembershipForGym(gymId) {
      if (!gymId) return;
      try {
        setMembershipLoading(true);
        const res = await api.get(`/me/memberships?per_page=200&page=1`, { headers: { "Cache-Control": "no-cache" } });
        const list = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : [];
        const row = list.find((m) => Number(m?.gym_id) === Number(gymId));
        if (!cancelled) setMyGymMembership(row || null);
      } catch (e) {
        if (!cancelled) setMyGymMembership(null);
      } finally {
        if (!cancelled) setMembershipLoading(false);
      }
    }
    loadMyMembershipForGym(gymIdNum);
    return () => { cancelled = true; };
  }, [gymIdNum]);

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
    try { if (saved) set = new Set(JSON.parse(saved)); } catch {}
    if (set.has(gymIdNum)) set.delete(gymIdNum);
    else set.add(gymIdNum);
    localStorage.setItem("likedGyms", JSON.stringify([...set]));
    setIsLiked(set.has(gymIdNum));
  };

  const nextImage = () => { if (!images.length) return; setCurrentImageIndex((prev) => (prev + 1) % images.length); };
  const prevImage = () => { if (!images.length) return; setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length); };

  const openDirection = () => {
    const gLat = gym?.latitude;
    const gLng = gym?.longitude;
    if (gLat == null || gLng == null) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { const { latitude, longitude } = pos.coords; window.open(`https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${gLat},${gLng}&travelmode=driving`, "_blank"); },
      () => { window.open(`https://www.google.com/maps/search/?api=1&query=${gLat},${gLng}`, "_blank"); }
    );
  };

  useEffect(() => {
    if (!gym) return;
    const target = { machines: Array.isArray(gym?.equipments) ? gym.equipments.length : 0, members: 0, trainers: gym?.has_personal_trainers ? 1 : 0 };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !hasAnimated) {
          Object.keys(target).forEach((k) => {
            let i = 0;
            const t = target[k];
            const inc = Math.max(1, Math.ceil(t / 25));
            const interval = setInterval(() => {
              i += inc;
              if (i >= t) { setCount((p) => ({ ...p, [k]: t })); clearInterval(interval); }
              else { setCount((p) => ({ ...p, [k]: i })); }
            }, 20);
          });
          setHasAnimated(true);
        }
      });
    }, { threshold: 0.25 });
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, [gym, hasAnimated]);

  useEffect(() => {
    let cancelled = false;
    async function loadMyFreeVisits() {
      if (!gym?.gym_id || !gym?.free_first_visit_enabled) return;
      try {
        const res = await getMyFreeVisits({ perPage: 50, page: 1 });
        if (!cancelled) setFreeVisitsRes(res);
      } catch (e) { console.error(e); }
    }
    loadMyFreeVisits();
    return () => { cancelled = true; };
  }, [gym?.gym_id, gym?.free_first_visit_enabled]);

  const myFreeVisitRow = useMemo(() => findMyFreeVisitForGym(freeVisitsRes, gym?.gym_id), [freeVisitsRes, gym?.gym_id]);
  const freeVisitStatus = String(myFreeVisitRow?.status || "");
  const hasFreeVisit = !!myFreeVisitRow;
  const freeVisitUsed = freeVisitStatus === "used";

  async function onFreePassClick() {
    if (!gym?.free_first_visit_enabled) return;
    if (hasFreeVisit) { setShowGiftModal(true); return; }
    try {
      setFreeVisitBusy(true);
      await claimFreeVisit(gym.gym_id);
      setShowGiftModal(true);
      const res = await getMyFreeVisits({ perPage: 50, page: 1 });
      setFreeVisitsRes(res);
    } catch (e) { alert(e?.message || "Failed to claim free pass"); }
    finally { setFreeVisitBusy(false); }
  }

  if (loading) {
    return (
      <div className="ugd-page">
        <div className="ugd-loading-state">
          <Loader2 size={28} className="ugd-spinner-icon" />
          <span>Loading gym…</span>
        </div>
      </div>
    );
  }

  if (error || !gym) {
    return (
      <div className="ugd-page">
        <div className="ugd-error-state">
          <p className="ugd-error-msg">{error || "Gym not found"}</p>
          <button className="ugd-btn ugd-btn-secondary" onClick={() => navigate(-1)}>
            <ArrowLeft size={15} /> Go Back
          </button>
        </div>
      </div>
    );
  }

  const gLat = gym?.latitude;
  const gLng = gym?.longitude;

  return (
    <div className="ugd-page">

      {/* ── HERO ── */}
      <section className="ugd-hero">
        <div className="ugd-hero-overlay" />

        {/* Gallery */}
        <div className="ugd-gallery">
          <img
            src={images[currentImageIndex] || "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&h=700&fit=crop"}
            alt={`${gym?.name} - Image ${currentImageIndex + 1}`}
            className="ugd-gallery-img"
          />
          {images.length > 1 && (
            <>
              <button className="ugd-gallery-btn ugd-gallery-prev" onClick={prevImage}>
                <ChevronLeft size={18} />
              </button>
              <button className="ugd-gallery-btn ugd-gallery-next" onClick={nextImage}>
                <ChevronRight size={18} />
              </button>
              <div className="ugd-gallery-dots">
                {images.map((_, i) => (
                  <button key={i} className={`ugd-dot ${i === currentImageIndex ? "active" : ""}`} onClick={() => setCurrentImageIndex(i)} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Hero content layer */}
        <div className="ugd-hero-content">
          <button type="button" className="ugd-back-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>

          <div className="ugd-hero-bottom">
            <div className="ugd-hero-text">
              <div className="ugd-gym-type-label">{gym?.gym_type || "Gym"}</div>
              <h1 className="ugd-gym-name">{gym?.name}</h1>

              <div className="ugd-hero-badges">
                <span className="ugd-badge ugd-badge-loc">
                  <MapPin size={11} />{gym?.address || "—"}
                </span>
                {gym?.has_personal_trainers && <span className="ugd-badge"><Target size={11} />Personal Trainers</span>}
                {gym?.has_classes && <span className="ugd-badge"><CalendarDays size={11} />Classes</span>}
                {gym?.is_24_hours && <span className="ugd-badge"><Timer size={11} />24 Hours</span>}
              </div>
            </div>

            <div className="ugd-hero-actions">
              <div className="ugd-price-tag">{displayPrice}</div>
              <button
                className={`ugd-like-btn ${isLiked ? "liked" : ""}`}
                onClick={toggleLike}
                title={isLiked ? "Saved" : "Save"}
              >
                <Heart size={17} fill={isLiked ? "currentColor" : "none"} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── BODY ── */}
      <div className="ugd-body">
        <div className="ugd-grid">

          {/* ════ MAIN COLUMN ════ */}
          <div className="ugd-main">

            {/* About */}
            <div className="ugd-card">
              <h2 className="ugd-section-title">About This Gym</h2>
              <p className="ugd-description">{gym?.description || "No description provided."}</p>
            </div>

            {/* Hours */}
            <div className="ugd-card ugd-hours-card">
              <h2 className="ugd-section-title">Operating Hours</h2>
              <div className="ugd-hours-row">
                <div className="ugd-hours-icon-wrap">
                  <Clock size={18} />
                </div>
                <div>
                  <div className="ugd-hours-time">{hoursText}</div>
                  <span className="ugd-hours-status">
                    {gym?.is_24_hours ? "Open 24 Hours" : "Hours Available"}
                  </span>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="ugd-card">
              <h2 className="ugd-section-title">Pricing</h2>
              <div className="ugd-pricing-grid">
                <div className="ugd-price-row">
                  <div className="ugd-price-icon-wrap ugd-price-daily"><Zap size={14} /></div>
                  <div>
                    <div className="ugd-price-label">Daily</div>
                    <div className="ugd-price-value">{safeNum(gym?.daily_price) ? fmtPeso(gym.daily_price) : "—"}</div>
                  </div>
                </div>
                <div className="ugd-price-row">
                  <div className="ugd-price-icon-wrap ugd-price-monthly"><CreditCard size={14} /></div>
                  <div>
                    <div className="ugd-price-label">Monthly</div>
                    <div className="ugd-price-value">{safeNum(gym?.monthly_price) ? fmtPeso(gym.monthly_price) : "—"}</div>
                  </div>
                </div>
                <div className="ugd-price-row">
                  <div className="ugd-price-icon-wrap ugd-price-annual"><Trophy size={14} /></div>
                  <div>
                    <div className="ugd-price-label">Annual</div>
                    <div className="ugd-price-value">{safeNum(gym?.annual_price) ? fmtPeso(gym.annual_price) : "—"}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="ugd-card" ref={statsRef}>
              <h2 className="ugd-section-title">Gym Statistics</h2>
              <div className="ugd-stats-grid">
                <StatCard icon={<Dumbbell size={20} />} value={count.machines} label="Equipment" color="orange" />
                <StatCard icon={<Users size={20} />} value={count.trainers} label="Trainers" color="green" />
                <RatingStatCard rating={ratingValue} label="Rating" color="blue" verifiedCount={ratingsState?.summary?.verified_count || 0} />
              </div>
            </div>

            {/* Amenities */}
            <div className="ugd-card">
              <h2 className="ugd-section-title">Amenities & Features</h2>
              <div className="ugd-amenities-grid">
                {amenities.length === 0 ? (
                  <p className="ugd-empty">No amenities listed.</p>
                ) : amenities.map((a) => {
                  const available = a?.pivot?.availability_status ?? true;
                  const img = a?.pivot?.image_url || a?.image_url || null;
                  return (
                    <div key={a?.amenity_id ?? a?.id ?? a?.name} className={`ugd-amenity-item ${available ? "" : "ugd-unavailable"}`}>
                      {img
                        ? <img className="ugd-amenity-img" src={absoluteUrl(img)} alt={a?.name || "Amenity"} loading="lazy" />
                        : <div className="ugd-amenity-icon-wrap"><Sparkles size={14} /></div>
                      }
                      <div className="ugd-amenity-text">
                        <div className="ugd-amenity-name">{a?.name || "Amenity"}</div>
                        {!available && <div className="ugd-amenity-unavail">Unavailable</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Equipment */}
            <div className="ugd-card">
              <h2 className="ugd-section-title">Available Equipment</h2>
              <div className="ugd-equip-list">
                {equipments.length === 0 ? (
                  <p className="ugd-empty">No equipment listed.</p>
                ) : equipments.map((e) => (
                  <div key={e?.equipment_id ?? e?.id ?? e?.name} className="ugd-equip-item">
                    <Check size={13} className="ugd-equip-check" />
                    <span>{String(e?.name || "").replaceAll("_", " ")}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ════ SIDEBAR ════ */}
          <div className="ugd-sidebar">

            {/* Map */}
            <div className="ugd-card ugd-map-card">
              <h2 className="ugd-section-title">Location</h2>
              <div className="ugd-map-wrap">
                <iframe
                  title="Gym Location Map"
                  className="ugd-map-frame"
                  src={`https://maps.google.com/maps?q=${gLat},${gLng}&z=15&output=embed`}
                  loading="lazy"
                />
              </div>
              <p className="ugd-map-address"><MapPin size={12} />{gym?.address || "—"}</p>
              <button className="ugd-btn ugd-btn-secondary ugd-btn-full" onClick={openDirection}>
                <Navigation size={14} />Get Directions
              </button>
            </div>

            {/* Contact */}
            <div className="ugd-card">
              <h2 className="ugd-section-title">Get in Touch</h2>
              <div className="ugd-contact-list">
                <div className="ugd-contact-row">
                  <Phone size={13} className="ugd-contact-icon" />
                  <span>{gym?.contact_number || "—"}</span>
                </div>
                <div className="ugd-contact-row">
                  <Mail size={13} className="ugd-contact-icon" />
                  <span>{gym?.email || "—"}</span>
                </div>
                <div className="ugd-contact-row">
                  <Globe size={13} className="ugd-contact-icon" />
                  {gym?.website
                    ? <a href={gym.website} target="_blank" rel="noreferrer" className="ugd-link">{gym.website}</a>
                    : <span>—</span>
                  }
                </div>
              </div>

              {(gym?.facebook_page || gym?.instagram_page) && (
                <div className="ugd-social-row">
                  {gym?.facebook_page && (
                    <a href={gym.facebook_page} className="ugd-social-btn ugd-fb" target="_blank" rel="noopener noreferrer">
                      <Facebook size={14} />
                    </a>
                  )}
                  {gym?.instagram_page && (
                    <a href={gym.instagram_page} className="ugd-social-btn ugd-ig" target="_blank" rel="noopener noreferrer">
                      <Instagram size={14} />
                    </a>
                  )}
                </div>
              )}

              {gym?.owner && (
                <div className="ugd-owner-row">
                  <div className="ugd-owner-label">Owner</div>
                  <div className="ugd-owner-info">
                    {gym.owner.profile_photo_url
                      ? <img src={gym.owner.profile_photo_url} alt={gym.owner.name} className="ugd-owner-avatar" />
                      : <div className="ugd-owner-avatar-placeholder"><UserCircle size={22} /></div>
                    }
                    <div>
                      <div className="ugd-owner-name">{gym.owner.name}</div>
                      <div className="ugd-owner-email">{gym.owner.email}</div>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                className="ugd-btn ugd-btn-primary ugd-btn-full"
                onClick={() => setGymInquiryOpen(true)}
                disabled={!gym?.id && !gym?.gym_id}
              >
                <MessageSquare size={14} />Inquire Now
              </button>

              {gymInquiryOpen && (
                <GymInquiryModal
                  gym={gym}
                  onClose={() => setGymInquiryOpen(false)}
                  sending={gymInquirySending}
                  onSend={onSendGymInquiry}
                />
              )}
            </div>

            {/* Quick Actions */}
            <div className="ugd-card">
              <h2 className="ugd-section-title">Quick Actions</h2>
              <div className="ugd-actions-list">

                {hasActiveMembershipHere ? (
                  <button className="ugd-btn ugd-btn-primary ugd-btn-full" type="button" onClick={() => navigate("/home/memberships")}>
                    <Ticket size={14} />View Membership
                  </button>
                ) : isPendingMembershipHere ? (
                  <button className="ugd-btn ugd-btn-secondary ugd-btn-full" type="button" onClick={() => navigate("/home/memberships")}>
                    <Loader2 size={14} className="ugd-spinner-icon" />Membership Pending
                  </button>
                ) : (
                  <button className="ugd-btn ugd-btn-primary ugd-btn-full" type="button" onClick={() => setShowMembershipModal(true)} disabled={membershipLoading}>
                    <Ticket size={14} />{membershipLoading ? "Checking…" : "Get Membership"}
                  </button>
                )}

                <button
                  className="ugd-btn ugd-btn-secondary ugd-btn-full"
                  type="button"
                  onClick={() => setShowRateModal(true)}
                  disabled={myRatingsLoading}
                >
                  {myGymRating ? <Pencil size={14} /> : <Star size={14} />}
                  {myRatingsLoading ? "Checking…" : myGymRating ? "Edit Rating" : "Rate this Gym"}
                </button>

                {gym?.free_first_visit_enabled && (
                  <button
                    className="ugd-btn ugd-btn-secondary ugd-btn-full"
                    type="button"
                    onClick={onFreePassClick}
                    disabled={freeVisitBusy}
                  >
                    <Gift size={14} />
                    {freeVisitBusy ? "Claiming…" : freeVisitUsed ? "Pass Used" : hasFreeVisit ? "View Free Pass" : "Claim Free Visit"}
                  </button>
                )}
              </div>
            </div>

            {/* Reviews */}
            <div className="ugd-card">
              <div className="ugd-reviews-head">
                <h2 className="ugd-section-title" style={{ marginBottom: 0 }}>Reviews</h2>
                <button className="ugd-show-all-btn" type="button" onClick={() => setShowReviewsModal(true)}>
                  Show all
                </button>
              </div>

              <div className="ugd-reviews-list">
                {ratingsLoading ? (
                  <div className="ugd-reviews-empty"><Loader2 size={16} className="ugd-spinner-icon" /> Loading…</div>
                ) : (ratingsState?.ratings || []).length === 0 ? (
                  <div className="ugd-reviews-empty">No reviews yet.</div>
                ) : (ratingsState.ratings || []).slice(0, 3).map((r) => {
                  const name = r?.user?.name || "User";
                  const tag = reviewTag(r);
                  const reviewerId = Number(r?.user_id ?? r?.user?.user_id ?? r?.user?.id ?? NaN);
                  const isMine = myUserId != null && Number.isFinite(reviewerId) && reviewerId === myUserId;

                  return (
                    <div key={r.rating_id} className={`ugd-review-item ${isMine ? "mine" : ""}`}>
                      <div className="ugd-review-top">
                        <div>
                          <div className="ugd-review-name-row">
                            <span className="ugd-review-name">{isMine ? "You" : name}</span>
                            {isMine && <span className="ugd-review-you-badge">You</span>}
                          </div>
                          <span className={`ugd-review-tag ${tag.cls}`}>{tag.label}</span>
                        </div>
                        <StarRow value={Number(r?.stars || 0)} compact />
                      </div>
                      <div className={`ugd-review-text ${!r?.review ? "empty" : ""}`}>
                        {r?.review ? String(r.review).slice(0, 140) + (String(r.review).length > 140 ? "…" : "") : "No comment."}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── MODALS ── */}
      {showReviewsModal && (
        <ReviewsModal open={showReviewsModal} onClose={() => setShowReviewsModal(false)} gymId={gym?.gym_id ?? Number(id)} gymName={gym?.name} myUserId={myUserId} onEditMine={() => { setShowReviewsModal(false); setShowRateModal(true); }} />
      )}
      {showMembershipModal && (
        <RequestMembershipModal gym={gym} onClose={() => setShowMembershipModal(false)} onSuccess={() => setShowMembershipModal(false)} />
      )}
      {showRateModal && (
        <RateGymModal gym={gym} onClose={() => setShowRateModal(false)} onSuccess={() => {
          setShowRateModal(false);
          refreshRatings(gym?.gym_id ?? gymIdNum);
          (async () => {
            try {
              const res = await api.get(`/me/ratings?page=1`, { headers: { "Cache-Control": "no-cache" } });
              const data = res?.data?.data;
              setMyRatings(Array.isArray(data) ? data : []);
            } catch {}
          })();
        }} />
      )}
      {showGiftModal && (
        <GiftRevealModal open={showGiftModal} onClose={() => setShowGiftModal(false)} gymName={gym?.name} status={freeVisitUsed ? "used" : "claimed"} claimCode={myFreeVisitRow?.free_visit_id} />
      )}
    </div>
  );
}

function reviewTag(r) {
  const verifiedBool = r?.verified === true;
  const via = String(r?.verified_via || "").toLowerCase();
  if (verifiedBool || via === "membership") return { label: "Member", cls: "ugd-tag-member" };
  if (via === "free_visit_used") return { label: "Visited", cls: "ugd-tag-visited" };
  return { label: "Unverified", cls: "ugd-tag-unverified" };
}