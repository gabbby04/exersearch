import React, { useEffect, useMemo, useState } from "react";
import "./GymCarousel.scss";

import { MapPin, CheckCircle, AlertCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { getAllMyGyms } from "../../utils/ownerDashboardApi";
import { api } from "../../utils/apiClient";

const DEFAULT_GYM_IMAGE =
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80";

const ADD_CARD_ID = "__add__";
const ADD_GYM_IMAGE = "/addgym.png";

function safeArr(v) {
  if (Array.isArray(v)) return v;
  if (v && Array.isArray(v.data)) return v.data;
  return [];
}

function normalizeStatus(s) {
  return String(s || "active").toLowerCase();
}

function resolveImageUrl(v) {
  if (!v) return DEFAULT_GYM_IMAGE;

  const s0 = String(v).trim();
  if (!s0) return DEFAULT_GYM_IMAGE;

  if (/^https?:\/\//i.test(s0)) return s0;

  const base = String(api?.defaults?.baseURL || "").replace(/\/api\/v1\/?$/, "").replace(/\/+$/, "");
  const s = s0.replace(/^\/+/, "");

  if (!base) return `/${s}`;

  return `${base}/${s}`.replace(/([^:]\/)\/+/g, "$1");
}

function mapGym(g) {
  const id = g.gym_id ?? g.id;
  const name = g.name ?? g.gym_name ?? "My Gym";
  const location =
    g.location ??
    g.address ??
    [g.barangay, g.city, g.province].filter(Boolean).join(", ") ??
    "—";

  const rawImage =
    g.main_image_url ?? g.image_url ?? g.cover_photo ?? g.photo_url ?? null;

  const image = resolveImageUrl(rawImage);

  const status = normalizeStatus(g.status);
  const verified = Boolean(g.verified ?? g.is_verified ?? true);

  return { id, name, location, image, status, verified, raw: g };
}

function getPositionClass(offset) {
  if (offset === 0) return "active";
  if (offset === -1) return "left";
  if (offset === 1) return "right";
  if (offset < -1) return "far-left";
  if (offset > 1) return "far-right";
  return "hidden";
}

export default function GymCarousel({ visible }) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [gyms, setGyms] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const [brokenGymImages, setBrokenGymImages] = useState({});

  useEffect(() => {
    let alive = true;

    async function run() {
      try {
        setLoading(true);
        setErr("");

        const gymsRes = await getAllMyGyms();
        if (!alive) return;

        const list = safeArr(gymsRes).map(mapGym);
        setGyms(list);
        setActiveIndex(0);
        setBrokenGymImages({});
      } catch (e) {
        console.error(e);
        setErr(e?.response?.data?.message || e?.message || "Failed to load your gyms.");
        setGyms([]);
        setActiveIndex(0);
      } finally {
        if (alive) setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, []);

  const addCard = useMemo(
    () => ({
      id: ADD_CARD_ID,
      name: "Add Gym",
      location: "Create a new gym listing",
      image: ADD_GYM_IMAGE,
      status: "add",
      verified: true,
      raw: {},
    }),
    []
  );

  const gymsWithAdd = useMemo(() => [...gyms, addCard], [gyms, addCard]);
  const total = gymsWithAdd.length;

  useEffect(() => {
    if (!total) return;
    setActiveIndex((i) => Math.max(0, Math.min(i, total - 1)));
  }, [total]);

  const cardsWithClass = useMemo(() => {
    if (!total) return [];
    const half = Math.floor(total / 2);

    return gymsWithAdd.map((gym, index) => {
      let offset = index - activeIndex;

      if (offset > half) offset -= total;
      if (offset < -half) offset += total;

      return { gym, index, positionClass: getPositionClass(offset) };
    });
  }, [gymsWithAdd, activeIndex, total]);

  const next = () => {
    if (!total) return;
    setActiveIndex((i) => (i + 1) % total);
  };

  const prev = () => {
    if (!total) return;
    setActiveIndex((i) => (i - 1 + total) % total);
  };

  useEffect(() => {
    if (!visible) return;

    const onKeyDown = (e) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "Enter") {
        const g = gymsWithAdd[activeIndex];
        if (g?.id === ADD_CARD_ID) navigate("/owner/gym-application");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [visible, total, activeIndex, gymsWithAdd, navigate]);

  return (
    <div className={`carousel-container ${visible ? "is-visible" : ""}`} aria-hidden={!visible}>
      <div className="carousel-stage">
        {loading && (
          <div className="carousel-empty">
            <div className="carousel-empty-title">Loading gyms…</div>
            <div className="carousel-empty-sub">Fetching your gyms from the server.</div>
          </div>
        )}

        {!loading && err && (
          <div className="carousel-empty">
            <div className="carousel-empty-title">Could not load gyms</div>
            <div className="carousel-empty-sub">{err}</div>
          </div>
        )}

        {!loading &&
          !err &&
          cardsWithClass.map(({ gym, index, positionClass }) => {
            if (gym.id === ADD_CARD_ID) {
              return (
                <div
                  key={ADD_CARD_ID}
                  className={`carousel-card add-gym-card ${positionClass}`}
                  onClick={() => setActiveIndex(index)}
                  role="button"
                  tabIndex={0}
                >
                  <div
                    className="card-image"
                    style={{ backgroundImage: `url('${ADD_GYM_IMAGE}')` }}
                  />
                  <div className="card-content">
                    <div className="card-header">
                      <h3 className="card-title">Add Gym</h3>
                      <span className="tag-pill">New</span>
                    </div>

                    <div className="card-location">
                      <MapPin size={14} />
                      <span>Create a new gym listing</span>
                    </div>

                    <div className="card-actions">
                      <button
                        type="button"
                        className="card-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate("/owner/gym-application");
                        }}
                      >
                        Add gym
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            const showStatusBadge = gym.status && gym.status !== "approved";

            return (
              <div
                key={gym.id}
                className={`carousel-card ${positionClass}`}
                onClick={() => setActiveIndex(index)}
                role="button"
                tabIndex={0}
              >
                <div
                  className="card-image"
                  style={{
                    backgroundImage: `url('${
                      brokenGymImages[gym.id] ? DEFAULT_GYM_IMAGE : gym.image
                    }')`,
                  }}
                >
                  <img
                    src={brokenGymImages[gym.id] ? DEFAULT_GYM_IMAGE : gym.image}
                    alt=""
                    style={{ display: "none" }}
                    onError={() => {
                      setBrokenGymImages((prev) =>
                        prev[gym.id] ? prev : { ...prev, [gym.id]: true }
                      );
                    }}
                  />

                  {showStatusBadge && (
                    <div className={`card-status ${gym.status}`}>
                      {gym.status === "active" || gym.status === "approved" ? (
                        <CheckCircle size={14} />
                      ) : (
                        <AlertCircle size={14} />
                      )}
                      <span>{gym.status}</span>
                    </div>
                  )}
                </div>

                <div className="card-content">
                  <div className="card-header">
                    <h3 className="card-title">{gym.name}</h3>
                    <span className="tag-pill">{gym.raw?.membership_type ?? "Gym"}</span>
                  </div>

                  <div className="card-location">
                    <MapPin size={14} />
                    <span>{gym.location}</span>
                  </div>

                  <div className="card-actions">
                    <Link
                      to={`/owner/view-gym/${gym.id}`}
                      className="card-btn"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View gym
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      <div className="carousel-controls">
        <button className="nav-btn" onClick={prev} disabled={!total} aria-label="Previous">
          ‹
        </button>

        <div className="pagination-indicators">
          {gymsWithAdd.map((g, i) => (
            <div
              key={g.id === ADD_CARD_ID ? "dot-add" : `dot-${g.id ?? i}`}
              className={`dot ${i === activeIndex ? "active" : ""} ${
                g.id === ADD_CARD_ID ? "dot-add" : ""
              }`}
              onClick={() => setActiveIndex(i)}
              role="button"
              tabIndex={0}
              aria-label={g.id === ADD_CARD_ID ? "Go to Add Gym" : `Go to gym ${i + 1}`}
            />
          ))}
        </div>

        <button className="nav-btn" onClick={next} disabled={!total} aria-label="Next">
          ›
        </button>
      </div>
    </div>
  );
}