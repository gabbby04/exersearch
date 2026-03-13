import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./GymRes-Matching.css";
import { api } from "../../utils/apiClient";
import { absoluteUrl } from "../../utils/findGymsData";
import { useTheme } from "../../pages/user/ThemeContext";
import { 
  MapPin, 
  DollarSign, 
  Star, 
  Heart, 
  X, 
  Check 
} from "lucide-react";

const MAIN_ORANGE = "#ff8c00";
const RECOMMEND_ENDPOINT = "/gyms/recommend";
const GYM_SHOW_ENDPOINT = (id) => `/gyms/${id}`;
const DEFAULT_MODE = "driving";

const SAVED_GYMS_INDEX = "/user/saved-gyms";
const SAVED_GYMS_STORE = "/user/saved-gyms";
const SAVED_GYMS_DELETE = (gymId) => `/user/saved-gyms/${gymId}`;

const SESSION_KEY = "exersearch_session_id";
function getSessionId() {
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid =
      (crypto?.randomUUID?.() ||
        `sess_${Date.now()}_${Math.random().toString(16).slice(2)}`);
    localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmtPeso(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return `₱${x.toLocaleString()}`;
}

function toSet(arr) {
  return new Set(Array.isArray(arr) ? arr : []);
}

// user-facing % (no TOPSIS shown as %)
function buildMatchPercent(gym) {
  const equip = safeNum(gym?.equipment_match); // 0..1
  const amen = safeNum(gym?.amenity_match); // 0..1
  const pen = safeNum(gym?.budget_penalty); // 0..1

  const score01 = equip * 0.45 + amen * 0.35 + pen * 0.2;
  return Math.round(Math.max(0, Math.min(1, score01)) * 100);
}

// ✅ ExerSearch Score from TOPSIS (0..1 -> 0..100 whole number)
function buildExerSearchScore(gym) {
  const t = safeNum(gym?.topsis_score);
  return Math.round(Math.max(0, Math.min(1, t)) * 100);
}

function GymSearchLoader() {
  return (
    <div className="gym-search-loader">
      <div className="gym-search-loader__stage">
        <div className="gym-search-loader__card">
          <div className="gym-search-loader__avatar" />
          <div className="gym-search-loader__text" />
        </div>

        <div className="gym-search-loader__card">
          <div className="gym-search-loader__avatar" />
          <div className="gym-search-loader__text" />
        </div>

        <div className="gym-search-loader__glass">
          <div className="gym-search-loader__glassInner" />
          <div className="gym-search-loader__handle">
            <div className="gym-search-loader__handleInner" />
          </div>
        </div>
      </div>

      <div className="gym-search-loader__caption">
        <div className="gym-search-loader__title">Finding your best gyms…</div>
        <div className="gym-search-loader__sub">
          Matching equipment • amenities • distance • budget
        </div>
      </div>
    </div>
  );
}

// ✅ cache to prevent annoying loader on back navigation
const RESULTS_CACHE_KEY = "exersearch_results_cache_v1";
function readResultsCache() {
  try {
    const raw = sessionStorage.getItem(RESULTS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.user || !Array.isArray(parsed.gyms)) return null;
    return parsed;
  } catch {
    return null;
  }
}
function writeResultsCache({ user, gyms, mode }) {
  try {
    sessionStorage.setItem(
      RESULTS_CACHE_KEY,
      JSON.stringify({
        user,
        gyms,
        mode,
        ts: Date.now(),
      })
    );
  } catch {}
}

export default function GymResultsMatching() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark } = useTheme();

  // ✅ accept either old shape OR new shape
  const initialPayload = useMemo(() => {
    const s = location?.state || null;
    if (!s) return null;
    // new: { user, gyms }
    if (s.user || s.gyms) return { user: s.user || null, gyms: s.gyms || [] };
    // old: { recommendation: { user, gyms } }
    return s.recommendation || null;
  }, [location?.state]);

  const initialMode = useMemo(
    () => location?.state?.mode || DEFAULT_MODE,
    [location?.state]
  );

  const [mode, setMode] = useState(initialMode);

  // ✅ initialize without loader if we can restore from cache
  const restored = useMemo(() => {
    if (initialPayload) return { user: initialPayload.user, gyms: initialPayload.gyms, mode: initialMode };
    const cached = readResultsCache();
    if (!cached) return null;
    return cached;
  }, [initialPayload, initialMode]);

  const [loading, setLoading] = useState(!restored);
  const [error, setError] = useState(null);

  const [user, setUser] = useState(restored?.user || null);
  const [gyms, setGyms] = useState(restored?.gyms || []);

  const [gymImages, setGymImages] = useState({});
  const [gymAddresses, setGymAddresses] = useState({});

  // modal state
  const [openBreakdown, setOpenBreakdown] = useState(false);
  const [activeGym, setActiveGym] = useState(null);

  // ✅ saved gyms (from backend)
  const [likedGyms, setLikedGyms] = useState(new Set());
  const [savingMap, setSavingMap] = useState({}); // gym_id -> true while saving/unsaving

  // ✅ log interaction helper (POST only)
  const logInteraction = useCallback(
    async (event, gym, extraMeta = {}) => {
      try {
        const gymId = gym?.gym_id ?? gym;
        if (!gymId) return;

        const payload = {
          gym_id: Number(gymId),
          event: String(event),
          source: "results",
          session_id: getSessionId(),
          meta: {
            equipment_match: safeNum(gym?.equipment_match),
            amenity_match: safeNum(gym?.amenity_match),
            travel_time_min: safeNum(gym?.travel_time_min),
            price: safeNum(gym?.price),
            budget_penalty: safeNum(gym?.budget_penalty),
            topsis_score: safeNum(gym?.topsis_score),
            mode: mode || DEFAULT_MODE,
            ...extraMeta,
          },
        };

        await api.post("/gym-interactions", payload);
      } catch (e) {
        console.warn("[logInteraction] failed:", e?.response?.status || e?.message);
      }
    },
    [mode]
  );

  const fetchRecommend = useCallback(async (m) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(RECOMMEND_ENDPOINT, {
        params: { mode: m || DEFAULT_MODE },
      });

      const nextUser = res.data?.user || null;
      const nextGyms = Array.isArray(res.data?.gyms) ? res.data.gyms : [];

      setUser(nextUser);
      setGyms(nextGyms);

      // ✅ update cache so back navigation won't reload
      writeResultsCache({ user: nextUser, gyms: nextGyms, mode: m || DEFAULT_MODE });
    } catch (e) {
      console.error(e);
      setError(
        e?.response?.data?.message || e?.message || "Failed to load recommendations"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ On mount:
  // - if we restored from cache/payload, do NOT show loader
  // - only fetch if nothing restored
  useEffect(() => {
    if (restored) {
      setLoading(false);
      // keep cache consistent with current mode state
      if (restored.mode && restored.mode !== mode) {
        setMode(restored.mode);
      }
      return;
    }
    fetchRecommend(mode);
  }, [restored, fetchRecommend, mode]);

  // ✅ Load saved gyms from backend
  useEffect(() => {
    let cancelled = false;

    async function loadSaved() {
      try {
        const res = await api.get(SAVED_GYMS_INDEX);
        const rows = res.data?.data || [];
        const ids = rows.map((r) => r.gym_id).filter((x) => x != null);
        if (!cancelled) setLikedGyms(new Set(ids));
      } catch (e) {
        // don't block page if saved gyms can't load
        console.warn("[saved-gyms] load failed:", e?.response?.status || e?.message);
      }
    }

    loadSaved();
    return () => {
      cancelled = true;
    };
  }, []);

  // ✅ Save/Unsave calls backend
  const toggleLike = useCallback(
    async (gymObj) => {
      const gymId = gymObj?.gym_id;
      if (!gymId) return;

      // prevent double clicks
      if (savingMap[gymId]) return;

      const currentlySaved = likedGyms.has(gymId);
      setSavingMap((p) => ({ ...p, [gymId]: true }));

      // optimistic UI
      setLikedGyms((prev) => {
        const next = new Set(prev);
        if (currentlySaved) next.delete(gymId);
        else next.add(gymId);
        return next;
      });

      try {
        if (!currentlySaved) {
          await api.post(SAVED_GYMS_STORE, {
            gym_id: gymId,
            source: "results",
            session_id: getSessionId(),
          });
          // Laravel controller already logs 'save', but we can also log UI intent if you want
          await logInteraction("save", gymObj, { action: "save_button" });
        } else {
          await api.delete(SAVED_GYMS_DELETE(gymId), {
            data: { source: "results", session_id: getSessionId() },
          });
          await logInteraction("unsave", gymObj, { action: "save_button" });
        }
      } catch (e) {
        // rollback if backend fails
        setLikedGyms((prev) => {
          const next = new Set(prev);
          if (currentlySaved) next.add(gymId);
          else next.delete(gymId);
          return next;
        });
        console.warn("[saved-gyms] toggle failed:", e?.response?.status || e?.message);
      } finally {
        setSavingMap((p) => {
          const { [gymId]: _, ...rest } = p;
          return rest;
        });
      }
    },
    [likedGyms, savingMap, logInteraction]
  );

  // fetch main_image_url + address via /gyms/{id}
  useEffect(() => {
    if (!gyms?.length) return;

    let cancelled = false;

    async function loadDetails() {
      const missing = gyms
        .map((g) => g.gym_id)
        .filter((id) => id != null && gymImages[id] === undefined);

      if (missing.length === 0) return;

      const batch = missing.slice(0, 30);

      const imgResults = {};
      const addrResults = {};

      await Promise.all(
        batch.map(async (id) => {
          try {
            const r = await api.get(GYM_SHOW_ENDPOINT(id));
            const gymObj = r.data?.data || r.data?.gym || r.data || null;

            const main =
              gymObj?.main_image_url ||
              gymObj?.mainImageUrl ||
              gymObj?.main_image ||
              null;

            imgResults[id] = main ? absoluteUrl(main) : null;

            const addr =
              gymObj?.address ||
              gymObj?.full_address ||
              gymObj?.location ||
              null;

            addrResults[id] = addr ? String(addr) : null;
          } catch {
            imgResults[id] = null;
            addrResults[id] = null;
          }
        })
      );

      if (!cancelled) {
        setGymImages((prev) => ({ ...prev, ...imgResults }));
        setGymAddresses((prev) => ({ ...prev, ...addrResults }));
      }
    }

    loadDetails();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gyms]);

  const rankedGyms = useMemo(() => gyms || [], [gyms]);

  return (
    <div className="matching-results-page" data-theme={isDark ? "dark" : "light"}>
      <section className="matching-header">
        <div className="container">
          <h1>Your Best Matches</h1>
          <p>Gyms ranked by how well they match your preferences</p>

          <div className="mode-switch">
            {["driving", "walking", "transit"].map((m) => (
              <button
                key={m}
                className="favorite-btn-small"
                onClick={() => {
                  setMode(m);
                  fetchRecommend(m);
                }}
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="matching-results">
        <div className="container">
          {loading ? (
            <GymSearchLoader />
          ) : error ? (
            <div style={{ padding: "24px" }}>
              <div style={{ fontWeight: 900, color: "#dc2626" }}>{error}</div>
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                <button
                  className="favorite-btn-small"
                  onClick={() => fetchRecommend(mode)}
                >
                  Retry
                </button>
                <button
                  className="favorite-btn-small"
                  onClick={() => navigate("/home/find-gyms")}
                >
                  Back to Preferences
                </button>
              </div>
            </div>
          ) : (
            <div className="results-list">
              {rankedGyms.map((gym, idx) => {
                const matchPercentage = buildMatchPercent(gym);
                const exerScore = buildExerSearchScore(gym);
                const isOverBudget = safeNum(gym?.price) > safeNum(user?.budget);

                const img =
                  gymImages[gym.gym_id] ||
                  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=400&fit=crop";

                const addressText = gymAddresses[gym.gym_id]
                  ? gymAddresses[gym.gym_id]
                  : gym?.latitude != null && gym?.longitude != null
                  ? `${gym.latitude}, ${gym.longitude}`
                  : "—";

                const distanceText =
                  safeNum(gym?.google_distance_km) > 0
                    ? `${gym.google_distance_km} km`
                    : `${gym.distance_km} km`;

                const isSaved = likedGyms.has(gym.gym_id);
                const isSaving = !!savingMap[gym.gym_id];

                return (
                  <div key={gym.gym_id} className="match-card">
                    <div className="match-card-inner">
                      <div className="match-image">
                        <img src={img} alt={gym.name} />
                        <div className="rank-badge">#{idx + 1}</div>

                        <div className="match-badge">
                          <div className="match-percentage">{matchPercentage}%</div>
                          <div className="match-label">MATCH</div>
                        </div>
                      </div>

                      <div className="match-details">
                        <div className="match-header">
                          <div>
                            <h2>{gym.name}</h2>
                            <p className="gym-location">
                              <MapPin size={16} /> {addressText}
                            </p>
                            <p className="gym-subline">
                              {distanceText} away{" "}
                              {gym?.travel_time_min ? `• ${gym.travel_time_min} min` : ""}
                            </p>
                          </div>

                          <div className="score-star" title="Derived from TOPSIS score (0–100)">
                            <Star className="star" size={18} />
                            <span className="score-text">ExerSearch Score: {exerScore}</span>
                          </div>
                        </div>

                        <div className="quick-info">
                          <div className="info-pill distance">
                            <MapPin size={14} /> {distanceText} away
                          </div>

                          <div className={`info-pill price ${isOverBudget ? "over-budget" : "in-budget"}`}>
                            <DollarSign size={14} /> {fmtPeso(gym?.price)} / {user?.plan_type || "plan"}{" "}
                            {isOverBudget ? "• Over" : "• Good"}
                          </div>
                        </div>

                        <div className="match-breakdown">
                          <div className="breakdown-title">
                            <span>MATCH BREAKDOWN</span>

                            <button
                              type="button"
                              className="breakdown-view"
                              onClick={async () => {
                                await logInteraction("click", gym, { action: "open_breakdown" });
                                setActiveGym(gym);
                                setOpenBreakdown(true);
                              }}
                              title="View equipment & amenities breakdown"
                            >
                              View →
                            </button>
                          </div>

                          <div className="breakdown-bars">
                            <div className="breakdown-bar-item">
                              <span className="breakdown-bar-label">Amenities</span>
                              <div className="breakdown-bar-container">
                                <div
                                  className="breakdown-bar-fill"
                                  style={{
                                    width: `${Math.round(safeNum(gym?.amenity_match) * 100)}%`,
                                  }}
                                />
                              </div>
                              <span className="breakdown-bar-value">
                                {Math.round(safeNum(gym?.amenity_match) * 100)}%
                              </span>
                            </div>

                            <div className="breakdown-bar-item">
                              <span className="breakdown-bar-label">Equipment</span>
                              <div className="breakdown-bar-container">
                                <div
                                  className="breakdown-bar-fill"
                                  style={{
                                    width: `${Math.round(safeNum(gym?.equipment_match) * 100)}%`,
                                  }}
                                />
                              </div>
                              <span className="breakdown-bar-value">
                                {Math.round(safeNum(gym?.equipment_match) * 100)}%
                              </span>
                            </div>

                            <div className="breakdown-bar-item">
                              <span className="breakdown-bar-label">Budget Fit</span>
                              <div className="breakdown-bar-container">
                                <div
                                  className="breakdown-bar-fill"
                                  style={{
                                    width: `${Math.round(safeNum(gym?.budget_penalty) * 100)}%`,
                                  }}
                                />
                              </div>
                              <span className="breakdown-bar-value">
                                {Math.round(safeNum(gym?.budget_penalty) * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="match-actions-row">
                          <Link
                            to={`/home/gym/${gym.gym_id}`}
                            className="view-full-btn"
                            title="Open gym details page"
                            state={{
                              // ✅ pass state so if you come back via a Link, results can restore instantly
                              from: "results",
                              mode,
                              user,
                              gyms,
                            }}
                            onClick={async () => {
                              await logInteraction("view", gym, {
                                action: "open_details",
                                to: `/home/gym/${gym.gym_id}`,
                              });
                            }}
                          >
                            View Full Details
                          </Link>

                          <button
                            className={`save-btn ${isSaved ? "liked" : ""}`}
                            onClick={() => toggleLike(gym)}
                            title={isSaved ? "Unsave this gym" : "Save this gym"}
                            disabled={isSaving}
                            style={{ opacity: isSaving ? 0.7 : 1 }}
                          >
                            {isSaved ? (
                              <Heart size={18} fill="currentColor" className="heart" />
                            ) : (
                              <Heart size={18} className="heart" />
                            )}
                            {isSaving ? "Saving..." : isSaved ? "Saved" : "Save"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {rankedGyms.length === 0 ? (
                <div style={{ padding: "24px", fontWeight: 800 }}>
                  No gyms found for your current filters.
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>

      {openBreakdown && activeGym && !loading && (
        <BreakdownModal
          gym={activeGym}
          user={user}
          onClose={() => {
            setOpenBreakdown(false);
            setActiveGym(null);
          }}
        />
      )}
    </div>
  );
}

function BreakdownModal({ gym, user, onClose }) {
  const prefEq = Array.isArray(user?.preferred_equipments) ? user.preferred_equipments : [];
  const prefAm = Array.isArray(user?.preferred_amenities) ? user.preferred_amenities : [];

  const matchedEq = toSet(gym?.matched_equipment_ids);
  const matchedAm = toSet(gym?.matched_amenity_ids);

  const preferredEquipments = prefEq.map((e) => ({ ...e, matched: matchedEq.has(e.equipment_id) }));
  const preferredAmenities = prefAm.map((a) => ({ ...a, matched: matchedAm.has(a.amenity_id) }));

  const matchedEqCount = preferredEquipments.filter((x) => x.matched).length;
  const matchedAmCount = preferredAmenities.filter((x) => x.matched).length;

  return (
    <div className="breakdown-overlay" onClick={() => onClose?.()}>
      <div className="breakdown-modal" onClick={(e) => e.stopPropagation()}>
        <div className="breakdown-top">
          <div className="breakdown-heading">Breakdown • {gym?.name}</div>
          <button className="breakdown-close" onClick={onClose} title="Close">
            <X size={20} />
          </button>
        </div>

        <div className="breakdown-body">
          <div className="breakdown-stats">
            <span>Preferred Amenities: {prefAm.length}</span>
            <span>Matched: {matchedAmCount}</span>
            <span>Preferred Equipment: {prefEq.length}</span>
            <span>Matched: {matchedEqCount}</span>
          </div>

          <div className="breakdown-section">
            <div className="breakdown-section-title">Your Preferred Amenities</div>
            <div className="breakdown-grid">
              {preferredAmenities.length === 0 ? (
                <div className="breakdown-empty">No preferred amenities selected.</div>
              ) : (
                preferredAmenities.map((a) => (
                  <div
                    key={a.amenity_id}
                    className={`breakdown-chip ${a.matched ? "ok" : "bad"}`}
                    title={a.matched ? "This gym has it" : "Missing in this gym"}
                  >
                    {a.image_url ? (
                      <img src={absoluteUrl(a.image_url)} alt={a.name} />
                    ) : (
                      <div className="breakdown-img-fallback" />
                    )}
                    {a.matched ? (
                      <Check size={16} className="mark" />
                    ) : (
                      <X size={16} className="mark" />
                    )}
                    <span className="txt">{a.name}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="breakdown-section">
            <div className="breakdown-section-title">Your Preferred Equipment</div>
            <div className="breakdown-grid">
              {preferredEquipments.length === 0 ? (
                <div className="breakdown-empty">No preferred equipment selected.</div>
              ) : (
                preferredEquipments.map((e) => (
                  <div
                    key={e.equipment_id}
                    className={`breakdown-chip ${e.matched ? "ok" : "bad"}`}
                    title={e.matched ? "This gym has it" : "Missing in this gym"}
                  >
                    {e.image_url ? (
                      <img src={absoluteUrl(e.image_url)} alt={e.name} />
                    ) : (
                      <div className="breakdown-img-fallback" />
                    )}
                    {e.matched ? (
                      <Check size={16} className="mark" />
                    ) : (
                      <X size={16} className="mark" />
                    )}
                    <span className="txt" style={{ textTransform: "capitalize" }}>
                      {e.name}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <details className="breakdown-details">
            <summary>Show what this gym has</summary>

            <div className="breakdown-has">
              <div>
                <div className="has-title">Gym Amenities</div>
                <div className="has-tags">
                  {(Array.isArray(gym?.gym_amenities) ? gym.gym_amenities : []).map((a) => (
                    <span key={a.amenity_id} className="has-tag">
                      {a.name}
                    </span>
                  ))}
                  {(Array.isArray(gym?.gym_amenities) ? gym.gym_amenities : []).length === 0 ? (
                    <div className="breakdown-empty">No amenities listed.</div>
                  ) : null}
                </div>
              </div>

              <div>
                <div className="has-title">Gym Equipments</div>
                <div className="has-tags">
                  {(Array.isArray(gym?.gym_equipments) ? gym.gym_equipments : []).map((e) => (
                    <span
                      key={e.equipment_id}
                      className="has-tag"
                      style={{ textTransform: "capitalize" }}
                    >
                      {e.name}
                    </span>
                  ))}
                  {(Array.isArray(gym?.gym_equipments) ? gym.gym_equipments : []).length === 0 ? (
                    <div className="breakdown-empty">No equipments listed.</div>
                  ) : null}
                </div>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
} 