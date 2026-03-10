// src/pages/user/AllGyms.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import "./AllGyms.css";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";

import { api } from "../../utils/apiClient";

const DEFAULT_GYM_IMG = "/defaultgym.png";
const TOKEN_KEY = "token";

const SAVED_GYMS_INDEX = "/user/saved-gyms";
const SAVED_GYMS_STORE = "/user/saved-gyms";
const SAVED_GYMS_DELETE = (gymId) => `/user/saved-gyms/${gymId}`;

const SESSION_KEY = "exersearch_session_id";

function getApiOrigin() {
  const base = String(api?.defaults?.baseURL || "").trim();
  if (!base) return window.location.origin;

  try {
    return new URL(base).origin;
  } catch {
    return window.location.origin;
  }
}

function getSessionId() {
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid =
      crypto?.randomUUID?.() ||
      `sess_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function safeArr(v) {
  return Array.isArray(v) ? v : [];
}

function toAbsImgUrl(u) {
  if (u == null) return DEFAULT_GYM_IMG;

  const s = String(u).trim();
  if (!s) return DEFAULT_GYM_IMG;

  const lower = s.toLowerCase();
  if (lower === "null" || lower === "undefined") return DEFAULT_GYM_IMG;
  if (lower.includes("img hippo") || lower === "hippo" || lower === "img") {
    return DEFAULT_GYM_IMG;
  }

  if (lower.startsWith("data:")) return s;
  if (/^https?:\/\//i.test(s)) return s;

  const apiOrigin = getApiOrigin();

  if (s.startsWith("/storage/")) return `${apiOrigin}${s}`;
  if (s.startsWith("storage/")) return `${apiOrigin}/${s}`;
  if (s.startsWith("/")) return `${apiOrigin}${s}`;

  return `${apiOrigin}/${s}`;
}

function MapAutoFocus({ center, zoom, selectedGym }) {
  const map = useMap();

  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 120);
    return () => clearTimeout(t);
  }, [map]);

  useEffect(() => {
    if (!center) return;
    map.setView(center, zoom, { animate: true });
  }, [map, center, zoom]);

  useEffect(() => {
    if (selectedGym?.latitude == null || selectedGym?.longitude == null) return;
    map.flyTo([Number(selectedGym.latitude), Number(selectedGym.longitude)], 16, {
      animate: true,
      duration: 0.8,
    });
  }, [map, selectedGym]);

  return null;
}

function pinIcon({ selected = false, label = "Gym" }) {
  const cls = selected ? "gr-pin-host selected" : "gr-pin-host";
  const text = selected ? "Selected" : label;

  return L.divIcon({
    className: cls,
    html: `
      <div class="gr-pin">
        <div class="gr-pin__pulse"></div>
        <div class="gr-pin__core">
          <div class="gr-pin__bubble">${text}</div>
          <div class="gr-pin__dot"></div>
          <div class="gr-pin__tip"></div>
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 44],
    popupAnchor: [0, -42],
  });
}

function clampAllowed(value, allowed, fallback) {
  const s = value == null ? "" : String(value).trim();
  return allowed.includes(s) ? s : fallback;
}

export default function GymResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    priceRange: "all",
    rating: "all",
    freeFirstVisit: "all",
    amenities: [],
    sortBy: "recommended",
  });

  const [savedIds, setSavedIds] = useState([]);
  const [savingMap, setSavingMap] = useState({});

  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [selectedGymId, setSelectedGymId] = useState(null);

  const [ratingMap, setRatingMap] = useState({});

  const cardRefs = useRef({});
  const [shownIds, setShownIds] = useState(() => new Set());

  const logInteraction = useCallback(
    async (event, gym, extraMeta = {}) => {
      try {
        const gymId = gym?.gym_id ?? gym?.id ?? gym;
        if (!gymId) return;

        const payload = {
          gym_id: Number(gymId),
          event: String(event),
          source: "gym_results",
          session_id: getSessionId(),
          meta: {
            sort_by: filters.sortBy,
            price_range: filters.priceRange,
            rating_min: filters.rating,
            free_first_visit: filters.freeFirstVisit,
            amenities: filters.amenities,
            ...extraMeta,
          },
        };

        await api.post("/gym-interactions", payload);
      } catch {}
    },
    [filters]
  );

  useEffect(() => {
    let alive = true;

    async function loadSaved() {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        if (!alive) return;
        setSavedIds([]);
        return;
      }

      try {
        const res = await api.get(SAVED_GYMS_INDEX, { params: { per_page: 500 } });
        const rows = Array.isArray(res?.data?.data) ? res.data.data : [];

        const ids = rows
          .map((r) => Number(r?.gym_id ?? r?.gym?.gym_id ?? r?.gymId ?? 0))
          .filter((n) => Number.isFinite(n) && n > 0);

        if (!alive) return;
        setSavedIds(Array.from(new Set(ids)));
      } catch {
        if (!alive) return;
        setSavedIds([]);
      }
    }

    loadSaved();

    return () => {
      alive = false;
    };
  }, []);

  const refreshSavedFromBackend = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setSavedIds([]);
      return;
    }

    try {
      const res = await api.get(SAVED_GYMS_INDEX, { params: { per_page: 500 } });
      const rows = Array.isArray(res?.data?.data) ? res.data.data : [];
      const ids = rows
        .map((r) => Number(r?.gym_id ?? r?.gym?.gym_id ?? r?.gymId ?? 0))
        .filter((n) => Number.isFinite(n) && n > 0);

      setSavedIds(Array.from(new Set(ids)));
    } catch {}
  }, []);

  const toggleSaveGym = useCallback(
    async (gymObj, origin = "results_heart") => {
      const gymId = Number(gymObj?.id ?? gymObj?.gym_id ?? 0);
      if (!gymId) return;

      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        navigate("/login");
        return;
      }

      if (savingMap[gymId]) return;

      const currentlySaved = savedIds.includes(gymId);

      setSavingMap((p) => ({ ...p, [gymId]: true }));

      setSavedIds((prev) => {
        const set = new Set((prev || []).map((x) => Number(x)));
        if (currentlySaved) set.delete(gymId);
        else set.add(gymId);
        return Array.from(set);
      });

      try {
        if (!currentlySaved) {
          await api.post(SAVED_GYMS_STORE, {
            gym_id: gymId,
            source: "gym_results",
            session_id: getSessionId(),
          });
          await logInteraction("save", gymObj, { action: "save_button", origin });
        } else {
          await api.delete(SAVED_GYMS_DELETE(gymId), {
            data: { source: "gym_results", session_id: getSessionId() },
          });
          await logInteraction("unsave", gymObj, {
            action: "save_button",
            origin,
          });
        }

        await refreshSavedFromBackend();
      } catch {
        setSavedIds((prev) => {
          const set = new Set((prev || []).map((x) => Number(x)));
          if (currentlySaved) set.add(gymId);
          else set.delete(gymId);
          return Array.from(set);
        });
      } finally {
        setSavingMap((p) => {
          const { [gymId]: _, ...rest } = p;
          return rest;
        });
      }
    },
    [navigate, savingMap, savedIds, logInteraction, refreshSavedFromBackend]
  );

  const handleSortChange = (e) => {
    setFilters((p) => ({ ...p, sortBy: e.target.value }));
  };

  const clearFilters = () => {
    setFilters({
      priceRange: "all",
      rating: "all",
      freeFirstVisit: "all",
      amenities: [],
      sortBy: "recommended",
    });
    setSelectedGymId(null);
  };

  useEffect(() => {
    const qFree = searchParams.get("freeFirstVisit");
    const qRating = searchParams.get("rating");
    const qPrice = searchParams.get("priceRange");
    const qSort = searchParams.get("sortBy");
    const qAmenities = searchParams.get("amenities");

    const nextFromQuery = {
      freeFirstVisit: clampAllowed(qFree, ["all", "only"], "all"),
      rating: clampAllowed(qRating, ["all", "4.5", "4.0", "3.5"], "all"),
      priceRange: clampAllowed(
        qPrice,
        ["all", "budget", "mid", "premium"],
        "all"
      ),
      sortBy: clampAllowed(
        qSort,
        ["recommended", "price-low", "price-high", "rating", "reviews"],
        "recommended"
      ),
      amenities: qAmenities
        ? qAmenities
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    };

    setFilters((p) => ({
      ...p,
      ...nextFromQuery,
    }));

    setSelectedGymId(null);
  }, [searchParams]);

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoading(true);
      setErr("");

      try {
        const params = { per_page: 200 };

        if (filters.priceRange === "budget") params.monthly_price_max = 999;
        if (filters.priceRange === "mid") {
          params.monthly_price_min = 1000;
          params.monthly_price_max = 1500;
        }
        if (filters.priceRange === "premium") params.monthly_price_min = 1501;

        const res = await api.get("/gyms", { params });
        const rows = safeArr(res?.data?.data);

        if (!alive) return;

        setGyms(rows);
        setShownIds(new Set());
      } catch (e) {
        if (!alive) return;
        const msg =
          e?.response?.data?.message || e?.message || "Failed to load gyms.";
        setErr(String(msg));
      } finally {
        if (alive) setLoading(false);
      }
    }

    run();

    return () => {
      alive = false;
    };
  }, [filters.priceRange]);

  useEffect(() => {
    const ids = gyms
      .map((g) => String(g?.gym_id ?? g?.id ?? ""))
      .filter(Boolean);

    if (!ids.length) {
      setRatingMap({});
      return;
    }

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setRatingMap({});
      return;
    }

    let alive = true;

    (async () => {
      try {
        const res = await api.get("/gyms/ratings/summary", {
          params: { gym_ids: ids.join(",") },
        });

        const map =
          res?.data?.data && typeof res.data.data === "object" ? res.data.data : {};

        if (!alive) return;
        setRatingMap(map);
      } catch {
        if (!alive) return;
        setRatingMap({});
      }
    })();

    return () => {
      alive = false;
    };
  }, [gyms]);

  const normalizedGyms = useMemo(() => {
    return gyms
      .map((g) => {
        const id = String(g.gym_id ?? g.id ?? "");
        if (!id) return null;

        const name = g.name ?? "Unnamed Gym";
        const address = g.address ?? g.location ?? "";
        const lat = toNum(g.latitude);
        const lng = toNum(g.longitude);

        const summary = ratingMap?.[id] || ratingMap?.[Number(id)] || null;
        const rating =
          summary?.avg_rating != null ? toNum(summary.avg_rating) : null;
        const reviews =
          summary?.reviews_count != null ? toNum(summary.reviews_count) : null;

        const daily = toNum(g.daily_price);
        const monthly = toNum(g.monthly_price);
        const annual = toNum(g.annual_price);

        const mainImage = toAbsImgUrl(
          g.main_image_url ||
            g.image_url ||
            g.image ||
            g.main_image ||
            g.photo
        );

        const amenities = safeArr(g.amenities).map(
          (a) => a.name ?? a.label ?? a
        );
        const equipment = safeArr(g.equipments).map(
          (e) => e.name ?? e.label ?? e
        );

        const freeFirstVisitEnabled =
          g.free_first_visit_enabled === true ||
          g.free_first_visit_enabled === 1 ||
          String(g.free_first_visit_enabled).toLowerCase() === "true";

        return {
          raw: g,
          id,
          name,
          address,
          latitude: lat,
          longitude: lng,
          rating,
          reviews,
          daily_price: daily,
          monthly_price: monthly,
          annual_price: annual,
          image: mainImage,
          amenities,
          equipment,
          description: g.description ?? "",
          free_first_visit_enabled: freeFirstVisitEnabled,
        };
      })
      .filter(Boolean);
  }, [gyms, ratingMap]);

  const filteredGyms = useMemo(() => {
    let list = [...normalizedGyms];

    if (filters.freeFirstVisit === "only") {
      list = list.filter((g) => g.free_first_visit_enabled);
    }

    if (filters.rating !== "all") {
      const min = Number(filters.rating);
      list = list.filter((g) => (g.rating ?? 0) >= min);
    }

    if (filters.amenities?.length) {
      const wanted = new Set(filters.amenities.map(String));
      list = list.filter((g) =>
        g.amenities.some((a) => wanted.has(String(a)))
      );
    }

    if (filters.sortBy === "price-low") {
      list.sort((a, b) => (a.monthly_price ?? 1e18) - (b.monthly_price ?? 1e18));
    } else if (filters.sortBy === "price-high") {
      list.sort((a, b) => (b.monthly_price ?? -1) - (a.monthly_price ?? -1));
    } else if (filters.sortBy === "rating") {
      list.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    } else if (filters.sortBy === "reviews") {
      list.sort((a, b) => (b.reviews ?? -1) - (a.reviews ?? -1));
    }

    return list;
  }, [normalizedGyms, filters]);

  useEffect(() => {
    if (!selectedGymId) return;
    const exists = filteredGyms.some((g) => g.id === String(selectedGymId));
    if (!exists) setSelectedGymId(null);
  }, [filteredGyms, selectedGymId]);

  const selectedGym = useMemo(() => {
    if (!selectedGymId) return null;
    return filteredGyms.find((g) => g.id === String(selectedGymId)) || null;
  }, [filteredGyms, selectedGymId]);

  const gymsWithCoords = useMemo(() => {
    return filteredGyms.filter((g) => g.latitude != null && g.longitude != null);
  }, [filteredGyms]);

  const markersToShow = useMemo(() => {
    if (selectedGymId) {
      const s = filteredGyms.find((g) => g.id === String(selectedGymId));
      return s && s.latitude != null && s.longitude != null ? [s] : [];
    }
    return gymsWithCoords;
  }, [filteredGyms, gymsWithCoords, selectedGymId]);

  const mapCenter = useMemo(() => {
    if (selectedGym?.latitude != null && selectedGym?.longitude != null) {
      return [selectedGym.latitude, selectedGym.longitude];
    }

    if (gymsWithCoords.length) {
      const g = gymsWithCoords[0];
      return [g.latitude, g.longitude];
    }

    return [14.5764, 121.0851];
  }, [selectedGym, gymsWithCoords]);

  const mapZoom = useMemo(() => {
    if (selectedGymId) return 16;
    if (gymsWithCoords.length) return 13;
    return 12;
  }, [selectedGymId, gymsWithCoords.length]);

  const onPickGym = useCallback(
    async (gymId) => {
      const id = String(gymId);
      setSelectedGymId(id);

      const gObj = filteredGyms.find((x) => x.id === id) || null;
      if (gObj) await logInteraction("click", gObj, { action: "card_click" });

      const el = cardRefs.current[id];
      if (el) {
        el.classList.add("highlight-flash");
        setTimeout(() => el.classList.remove("highlight-flash"), 1200);
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },
    [filteredGyms, logInteraction]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const newlyShown = [];

        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = entry.target?.dataset?.gymid;
          if (!id) continue;

          newlyShown.push(id);
          observer.unobserve(entry.target);
        }

        if (newlyShown.length) {
          setShownIds((prev) => {
            const next = new Set(prev);
            newlyShown.forEach((id) => next.add(String(id)));
            return next;
          });
        }
      },
      { threshold: 0.2 }
    );

    filteredGyms.forEach((g) => {
      if (shownIds.has(g.id)) return;
      const el = cardRefs.current[g.id];
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [filteredGyms, shownIds]);

  return (
    <div className="ags">
      <div className="gym-results-page">
        <section className="gr-header-full">
          <div className="gr-header-inner">
            <h1>All Gyms</h1>
            <p>
              {loading ? "Loading gyms…" : `Showing ${filteredGyms.length} gyms`}
              {selectedGymId ? " • Focus mode" : ""}
            </p>
          </div>
        </section>

        <div className="gr-split">
          <aside className="gr-left">
            <div className="gr-map-card">
              <div className="gr-map-top">
                <div className="gr-map-top__left">
                  <strong>
                    {selectedGymId
                      ? selectedGym?.name || "Selected gym"
                      : `Pins: ${markersToShow.length}`}
                  </strong>
                  <span className="gr-map-top__sub">
                    {selectedGymId
                      ? "Showing only the selected gym marker"
                      : "Markers update based on your filters"}
                  </span>
                </div>

                {selectedGymId ? (
                  <button
                    className="gr-map-btn"
                    onClick={() => setSelectedGymId(null)}
                    type="button"
                  >
                    Show all
                  </button>
                ) : (
                  <button
                    className="gr-map-btn"
                    onClick={() => setSelectedGymId(null)}
                    type="button"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div className="gr-map">
                <MapContainer
                  center={mapCenter}
                  zoom={mapZoom}
                  scrollWheelZoom
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapAutoFocus
                    center={mapCenter}
                    zoom={mapZoom}
                    selectedGym={selectedGym}
                  />

                  {markersToShow.map((g) => (
                    <Marker
                      key={g.id}
                      position={[g.latitude, g.longitude]}
                      icon={pinIcon({ selected: g.id === String(selectedGymId) })}
                      eventHandlers={{
                        click: async () => {
                          setSelectedGymId(String(g.id));
                          await logInteraction("click", g, {
                            action: "map_marker_click",
                          });
                        },
                      }}
                    >
                      <Popup>
                        <div>
                          <div className="gr-popup__title">{g.name}</div>
                          <div className="gr-popup__sub">
                            📍 {g.address || "No address"}
                          </div>
                          <div className="gr-popup__meta">
                            {g.monthly_price != null
                              ? `₱${g.monthly_price}/mo`
                              : "Monthly price not set"}
                            {g.rating != null ? ` • ⭐ ${g.rating}` : ""}
                            {g.free_first_visit_enabled
                              ? " • 🎟️ Free first visit"
                              : ""}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </div>
          </aside>

          <main className="gr-right">
            <section className="filter-bar">
              <div className="container">
                <div className="filter-controls">
                  <div className="filter-group">
                    <label>Sort by:</label>
                    <select value={filters.sortBy} onChange={handleSortChange}>
                      <option value="recommended">Recommended</option>
                      <option value="price-low">Monthly Price: Low to High</option>
                      <option value="price-high">Monthly Price: High to Low</option>
                      <option value="rating">Highest Rated</option>
                      <option value="reviews">Most Reviewed</option>
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>Monthly Price:</label>
                    <select
                      value={filters.priceRange}
                      onChange={(e) => {
                        setSelectedGymId(null);
                        setFilters((p) => ({ ...p, priceRange: e.target.value }));
                      }}
                    >
                      <option value="all">All Prices</option>
                      <option value="budget">Under ₱1,000 / month</option>
                      <option value="mid">₱1,000 - ₱1,500 / month</option>
                      <option value="premium">₱1,500+ / month</option>
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>Minimum Rating:</label>
                    <select
                      value={filters.rating}
                      onChange={(e) => {
                        setSelectedGymId(null);
                        setFilters((p) => ({ ...p, rating: e.target.value }));
                      }}
                    >
                      <option value="all">All Ratings</option>
                      <option value="4.5">4.5+ Stars</option>
                      <option value="4.0">4.0+ Stars</option>
                      <option value="3.5">3.5+ Stars</option>
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>Free first visit:</label>
                    <select
                      value={filters.freeFirstVisit}
                      onChange={(e) => {
                        setSelectedGymId(null);
                        setFilters((p) => ({
                          ...p,
                          freeFirstVisit: e.target.value,
                        }));
                      }}
                    >
                      <option value="all">All Gyms</option>
                      <option value="only">
                        Only gyms with free first visit
                      </option>
                    </select>
                  </div>

                  <button
                    className="clear-filters-btn"
                    onClick={clearFilters}
                    type="button"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </section>

            <section className="results-section">
              <div className="container">
                {err ? <div className="gr-error">{err}</div> : null}

                <div className="results-grid">
                  {filteredGyms.map((gym) => {
                    const gymIdNum = Number(gym.id);
                    const isSaved = savedIds.includes(gymIdNum);
                    const isSaving = !!savingMap[gymIdNum];

                    return (
                      <div
                        key={gym.id}
                        data-gymid={gym.id}
                        className={[
                          "result-card",
                          shownIds.has(gym.id) ? "show" : "",
                          gym.id === String(selectedGymId) ? "is-selected" : "",
                        ].join(" ")}
                        ref={(el) => {
                          if (el) cardRefs.current[gym.id] = el;
                        }}
                        onClick={() => onPickGym(gym.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") onPickGym(gym.id);
                        }}
                      >
                        <div className="card-image">
                          <img
                            src={gym.image}
                            alt={gym.name}
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = DEFAULT_GYM_IMG;
                            }}
                            onClick={async (e) => {
                              e.stopPropagation();
                              await logInteraction("click", gym, {
                                action: "image_click",
                              });
                              onPickGym(gym.id);
                            }}
                            style={{ cursor: "pointer" }}
                          />

                          <div className="card-badge">
                            {gym.monthly_price != null
                              ? `₱${gym.monthly_price}/mo`
                              : "See monthly pricing"}
                          </div>

                          {gym.free_first_visit_enabled ? (
                            <div className="card-badge gr-freevisit-badge">
                              🎟️ Free first visit
                            </div>
                          ) : null}
                        </div>

                        <div className="card-content">
                          <h3
                            style={{ cursor: "pointer" }}
                            onClick={async (e) => {
                              e.stopPropagation();
                              await logInteraction("click", gym, {
                                action: "name_click",
                              });
                              onPickGym(gym.id);
                            }}
                          >
                            {gym.name}
                          </h3>

                          <p className="gym-location">
                            📍 {gym.address || "No address"}
                          </p>

                          <div className="gym-rating-row">
                            <span className="rating">
                              ⭐ {gym.rating != null ? gym.rating : "—"}
                            </span>
                            <span className="reviews">
                              ({gym.reviews != null ? gym.reviews : 0} reviews)
                            </span>
                          </div>

                          <p className="gym-description">
                            {gym.description || "No description yet."}
                          </p>

                          <div className="gym-amenities">
                            {gym.amenities.slice(0, 3).map((amenity, idx) => (
                              <span
                                key={`${gym.id}-am-${idx}`}
                                className="amenity-tag"
                              >
                                {amenity}
                              </span>
                            ))}
                            {gym.amenities.length > 3 ? (
                              <span className="amenity-tag">
                                +{gym.amenities.length - 3}
                              </span>
                            ) : null}
                          </div>

                          <div
                            className="card-actions"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link
                              to={`/home/gym/${gym.id}`}
                              className="see-more-btn"
                              onClick={async () => {
                                await logInteraction("view", gym, {
                                  action: "view_details",
                                  to: `/home/gym/${gym.id}`,
                                });
                              }}
                            >
                              View Details
                            </Link>

                            <button
                              className={`favorite-btn ${isSaved ? "liked" : ""}`}
                              disabled={isSaving}
                              onClick={() => toggleSaveGym(gym, "results_heart")}
                              aria-label={isSaved ? "Unsave gym" : "Save gym"}
                              type="button"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill={isSaved ? "currentColor" : "none"}
                                stroke="currentColor"
                                strokeWidth="2"
                                className="heart-icon"
                              >
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                              </svg>
                            </button>
                          </div>

                          {gym.latitude == null || gym.longitude == null ? (
                            <div className="gr-muted-note">
                              No map coordinates for this gym yet.
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!loading && filteredGyms.length === 0 ? (
                  <div className="gr-empty">No gyms match your filters.</div>
                ) : null}
              </div>
            </section>

            <section className="cta-section">
              <div className="container">
                <h2>Not finding what you're looking for?</h2>
                <p>Refine your search preferences to get better matches</p>
                <Link to="/home/find-gyms" className="cta-btn">
                  Find the Best Fit Gym For You
                </Link>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}