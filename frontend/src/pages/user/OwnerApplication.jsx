// ✅ src/pages/user/OwnerApplication.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import HomeHeader from "./HomeHeader";
import Footer from "./Footer";
import "./OwnerApplication.css";
import {
  FaArrowRight,
  FaArrowLeft,
  FaCheck,
  FaUser,
  FaFileAlt,
  FaCamera,
  FaUpload,
  FaTimes,
  FaMapMarkerAlt,
  FaDumbbell,
  FaCheckCircle,
} from "react-icons/fa";

import { getMyOwnerApplication, submitOwnerApplication } from "../../utils/ownerApplicationApi";

const API_BASE = "https://exersearch.test";

const STEPS = [
  { id: 0, label: "Owner Info", icon: FaUser },
  { id: 1, label: "Gym Details", icon: FaDumbbell },
  { id: 2, label: "Location", icon: FaMapMarkerAlt },
  { id: 3, label: "Photos & Docs", icon: FaCamera },
  { id: 4, label: "Review", icon: FaCheckCircle },
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const generateHours = () => {
  const hours = [];
  for (let i = 0; i < 24; i++) {
    const h = i % 12 || 12;
    const ampm = i < 12 ? "AM" : "PM";
    hours.push({ label: `${h}:00 ${ampm}`, value: `${String(i).padStart(2, "0")}:00` });
    hours.push({ label: `${h}:30 ${ampm}`, value: `${String(i).padStart(2, "0")}:30` });
  }
  return hours;
};
const HOURS = generateHours();

const PASIG_POLYGON_LATLNG = [
  [14.61, 121.043],
  [14.614, 121.05],
  [14.616, 121.058],
  [14.613, 121.066],
  [14.609, 121.074],
  [14.605, 121.082],
  [14.601, 121.089],
  [14.597, 121.096],
  [14.592, 121.102],
  [14.587, 121.108],
  [14.581, 121.113],
  [14.575, 121.116],
  [14.569, 121.115],
  [14.563, 121.112],
  [14.557, 121.108],
  [14.552, 121.103],
  [14.548, 121.097],
  [14.545, 121.09],
  [14.543, 121.083],
  [14.542, 121.076],
  [14.543, 121.069],
  [14.546, 121.062],
  [14.55, 121.056],
  [14.555, 121.051],
  [14.561, 121.047],
  [14.567, 121.044],
  [14.574, 121.042],
  [14.581, 121.0415],
  [14.588, 121.0425],
  [14.595, 121.043],
  [14.602, 121.043],
  [14.61, 121.043],
];

function pointInPolygon(lat, lng, polygonLatLng) {
  let inside = false;
  for (let i = 0, j = polygonLatLng.length - 1; i < polygonLatLng.length; j = i++) {
    const [latI, lngI] = polygonLatLng[i];
    const [latJ, lngJ] = polygonLatLng[j];
    const intersect =
      (latI > lat) !== (latJ > lat) &&
      lng < ((lngJ - lngI) * (lat - latI)) / (latJ - latI) + lngI;
    if (intersect) inside = !inside;
  }
  return inside;
}

const PASIG_CENTER = [14.5764, 121.0851];

const INIT = {
  // owner info
  fullName: "",
  email: "",
  contactNumber: "",
  businessName: "", // maps to company_name

  // gym details
  gymName: "",
  description: "",
  amenityIds: [],

  // location
  address: "",
  city: "Pasig City",
  landmark: "",
  lat: PASIG_CENTER[0],
  lng: PASIG_CENTER[1],

  // hours (frontend-only for now)
  hours: {
    Monday: { open: "06:00", close: "22:00" },
    Tuesday: { open: "06:00", close: "22:00" },
    Wednesday: { open: "06:00", close: "22:00" },
    Thursday: { open: "06:00", close: "22:00" },
    Friday: { open: "06:00", close: "22:00" },
    Saturday: { open: "06:00", close: "22:00" },
    Sunday: { open: "06:00", close: "22:00" },
  },
  sameHours: true,
  commonOpen: "06:00",
  commonClose: "22:00",

  // pricing
  dayPass: "",
  monthly: "",
  quarterly: "",

  // uploads
  businessReg: null, // File
  gymPhotos: [], // File[]
  galleryUrls: [], // string[] returned by upload
  mainImageUrl: "", // string (first gallery url)
};

const fmtTime = (val) => HOURS.find((h) => h.value === val)?.label || val;

function isValidEmail(v) {
  const s = String(v || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

function normalizePhone(v) {
  return String(v || "").replace(/[^\d+]/g, "").trim();
}

function isValidPHMobile(v) {
  const s = normalizePhone(v);
  if (/^09\d{9}$/.test(s)) return true;
  if (/^\+639\d{9}$/.test(s)) return true;
  if (/^639\d{9}$/.test(s)) return true;
  return false;
}

function isNonNegNumberOrEmpty(v) {
  if (v === "" || v === null || v === undefined) return true;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0;
}

function getAmenityId(a) {
  const raw = a?.id ?? a?.amenity_id ?? a?.amenityId ?? a?.amenityID;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/* ============================
   TimePicker
   ============================ */
function TimePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="tp-wrapper" ref={ref}>
      <button type="button" className="tp-trigger" onClick={() => setOpen((o) => !o)}>
        <span className="tp-clock">⏱</span>
        <span className="tp-val">{fmtTime(value)}</span>
        <span className={`tp-arrow ${open ? "open" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="tp-dropdown">
          {HOURS.map((h) => (
            <button
              key={h.value}
              type="button"
              className={`tp-option ${h.value === value ? "selected" : ""}`}
              onClick={() => {
                onChange(h.value);
                setOpen(false);
              }}
            >
              {h.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================
   API helpers (frontend)
   ============================ */
function getTokenMaybe() {
  return localStorage.getItem("token") || "";
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

async function apiRequest(path, options = {}) {
  const token = getTokenMaybe();
  const url = `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  });

  const data = await safeJson(res);

  if (!res.ok) {
    throw new Error(data?.message || `Request failed (HTTP ${res.status})`);
  }
  return data;
}

async function getAmenities() {
  return apiRequest(`/api/v1/amenities`);
}

async function getMe() {
  return apiRequest(`/api/v1/me`);
}

async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  return res.json();
}

function bestEffortAddressFromNominatim(data) {
  const addr = data?.address || {};
  const road = addr.road || addr.pedestrian || addr.path || "";
  const houseNum = addr.house_number || "";
  const suburb = addr.suburb || addr.village || addr.neighbourhood || "";
  const city = addr.city || addr.town || addr.municipality || "Pasig City";
  const street = [houseNum, road, suburb].filter(Boolean).join(" ").trim();
  return { street, city };
}

/* ======================================================
   Upload helper: MediaUploadController
   ====================================================== */
async function uploadOwnerApplicationFile(file, kind = "docs") {
  const token = getTokenMaybe();
  const form = new FormData();
  form.append("type", "owner_applications");
  form.append("kind", kind);
  form.append("file", file);

  const res = await fetch(`${API_BASE}/api/v1/media/upload`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
    credentials: "include",
  });

  const data = await safeJson(res);

  if (!res.ok) {
    throw new Error(data?.message || `Upload failed (HTTP ${res.status})`);
  }

  const url = data?.url || "";
  if (!url) throw new Error("Upload succeeded but no URL was returned.");
  return url;
}

/* ── Leaflet Map Component with Search + Geocode ── */
function LeafletMap({ lat, lng, onPinAccepted }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const [outsideWarning, setOutsideWarning] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  const loadLeaflet = () =>
    new Promise((resolve) => {
      if (window.L) {
        resolve(window.L);
        return;
      }
      if (!document.querySelector('link[href*="leaflet.min.css"]')) {
        const css = document.createElement("link");
        css.rel = "stylesheet";
        css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
        document.head.appendChild(css);
      }
      const existing = document.querySelector('script[src*="leaflet.min.js"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(window.L));
        return;
      }
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
      script.onload = () => resolve(window.L);
      document.head.appendChild(script);
    });

  const makeIcon = (L) =>
    L.divIcon({
      className: "",
      html: `<div style="position:relative;width:32px;height:42px;">
        <div style="width:32px;height:32px;background:#d23f0b;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 4px 14px rgba(210,63,11,0.45);"></div>
        <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:8px;height:8px;background:#d23f0b;border-radius:50%;opacity:0.3;"></div>
      </div>`,
      iconSize: [32, 42],
      iconAnchor: [16, 42],
      popupAnchor: [0, -42],
    });

  const acceptPin = async (newLat, newLng) => {
    const inside = pointInPolygon(newLat, newLng, PASIG_POLYGON_LATLNG);
    if (!inside) {
      setOutsideWarning(true);
      setTimeout(() => setOutsideWarning(false), 2500);
      if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
      return;
    }

    setOutsideWarning(false);
    if (markerRef.current) markerRef.current.setLatLng([newLat, newLng]);
    if (mapRef.current) mapRef.current.panTo([newLat, newLng], { animate: true });

    await onPinAccepted?.(newLat, newLng);
  };

  useEffect(() => {
    let cancelled = false;

    loadLeaflet().then((L) => {
      if (cancelled) return;
      if (!containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        center: [lat, lng],
        zoom: 14,
        minZoom: 12,
        maxZoom: 18,
        maxBounds: [
          [14.5, 121.02],
          [14.64, 121.15],
        ],
        maxBoundsViscosity: 0.9,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      L.polygon(PASIG_POLYGON_LATLNG, {
        color: "#d23f0b",
        weight: 2.5,
        opacity: 0.85,
        fillColor: "#d23f0b",
        fillOpacity: 0.06,
      }).addTo(map);

      const marker = L.marker([lat, lng], {
        icon: makeIcon(L),
        draggable: true,
        autoPan: true,
      }).addTo(map);

      markerRef.current = marker;

      map.on("click", (e) => acceptPin(e.latlng.lat, e.latlng.lng));
      marker.on("dragend", (e) => {
        const { lat: la, lng: ln } = e.target.getLatLng();
        acceptPin(la, ln);
      });

      mapRef.current = map;
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
  }, [lat, lng]);

  const doSearch = async () => {
    const q = String(searchText || "").trim();
    if (!q) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        q
      )}&limit=5&addressdetails=1`;
      const res = await fetch(url, { headers: { "Accept-Language": "en" } });
      const json = await res.json();
      setSearchResults(Array.isArray(json) ? json : []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const pickResult = async (r) => {
    const la = Number(r?.lat);
    const ln = Number(r?.lon);
    if (!Number.isFinite(la) || !Number.isFinite(ln)) return;
    setSearchResults([]);
    await acceptPin(la, ln);
  };

  return (
    <div style={{ position: "relative" }}>
      <div className="oa-map-search">
        <input
          type="text"
          placeholder="Search location (e.g., Kapitolyo, Pasig)"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") doSearch();
          }}
        />
        <button type="button" onClick={doSearch} disabled={searching}>
          {searching ? "Searching..." : "Search"}
        </button>

        {searchResults.length > 0 && (
          <div className="oa-map-search-results">
            {searchResults.map((r) => (
              <button key={`${r.place_id}`} type="button" onClick={() => pickResult(r)}>
                {r.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        ref={containerRef}
        style={{ width: "100%", height: "360px", borderRadius: "14px", overflow: "hidden", zIndex: 1 }}
      />
      {outsideWarning && <div className="oa-map-warning">⚠️ Please pin inside Pasig City only</div>}
    </div>
  );
}

/* ============================
   STATUS SCREENS
   ============================ */
function PendingScreen({ form, serverStatus }) {
  return (
    <div className="oa-app">
      <HomeHeader />

      <div className="oa-success">
        <div className="oa-success-card">
          <div className="oa-success-icon">
            <FaCheckCircle />
          </div>

          <h1>Application Submitted!</h1>
          <p>
            Thank you, <strong>{form.fullName || "Owner"}</strong>. We'll review your application within 1–3 business
            days.
          </p>

          <div className="oa-summary">
            {[
              ["Owner", form.fullName],
              ["Business", form.businessName],
              ["Gym", form.gymName],
              ["City", form.city],
            ].map(([k, v]) => (
              <div key={k} className="oa-summary-row">
                <span>{k}</span>
                <strong>{v || "—"}</strong>
              </div>
            ))}

            <div className="oa-summary-row">
              <span>Status</span>
              <span className="oa-badge">
                {String(serverStatus || "").toLowerCase() === "approved" ||
                String(serverStatus || "").toLowerCase() === "accepted"
                  ? "✅ Approved"
                  : String(serverStatus || "").toLowerCase() === "rejected"
                  ? "❌ Rejected"
                  : "⏳ Pending"}
              </span>
            </div>
          </div>

          <Link to="/home" className="oa-btn-primary">
            Back to Home <FaArrowRight />
          </Link>
        </div>
      </div>
    </div>
  );
}

function ApprovedScreen({ form }) {
  return (
    <div className="oa-app">
      <HomeHeader />

      <div className="oa-success">
        <div className="oa-success-card">
          <div className="oa-success-icon">
            <FaCheckCircle />
          </div>

          <h1>You’re Approved 🎉</h1>
          <p>
            Hi <strong>{form.fullName || "Owner"}</strong> — your Gym Owner account is active. You can now access the
            Owner dashboard and manage your gyms.
          </p>

          <div className="oa-summary">
            {[
              ["Owner", form.fullName],
              ["Business", form.businessName],
              ["Gym", form.gymName],
              ["City", form.city],
            ].map(([k, v]) => (
              <div key={k} className="oa-summary-row">
                <span>{k}</span>
                <strong>{v || "—"}</strong>
              </div>
            ))}

            <div className="oa-summary-row">
              <span>Status</span>
              <span className="oa-badge">✅ Approved</span>
            </div>
          </div>

          <Link to="/owner/dashboard" className="oa-btn-primary">
            Go to Owner Dashboard <FaArrowRight />
          </Link>

          <Link to="/home" className="oa-btn-back" style={{ marginTop: 10, display: "inline-flex" }}>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function OwnerApplication() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(INIT);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [serverStatus, setServerStatus] = useState(null);
  const [serverApp, setServerApp] = useState(null);

  const [me, setMe] = useState(null);

  const [amenities, setAmenities] = useState([]);
  const [photoURLs, setPhotoURLs] = useState([]);

  const regRef = useRef(null);
  const photoRef = useRef(null);

  const token = getTokenMaybe();

  const set = (field, val) => {
    setForm((f) => ({ ...f, [field]: val }));
    setErrors((e) => ({ ...e, [field]: "" }));
  };

  // ✅ FIX: amenities clicking
  const toggleAmenityId = useCallback((amenityObjOrId) => {
    const aid =
      typeof amenityObjOrId === "object" ? getAmenityId(amenityObjOrId) : Number(amenityObjOrId);

    if (!Number.isFinite(aid) || aid <= 0) return;

    setForm((f) => {
      const has = f.amenityIds.includes(aid);
      const next = has ? f.amenityIds.filter((x) => x !== aid) : [...f.amenityIds, aid];
      return { ...f, amenityIds: next };
    });
  }, []);

  const setHourDay = (day, type, val) => {
    setForm((f) => ({ ...f, hours: { ...f.hours, [day]: { ...f.hours[day], [type]: val } } }));
  };

  const handleSameHours = (checked) => {
    if (checked) {
      const filled = {};
      DAYS.forEach((d) => (filled[d] = { open: form.commonOpen, close: form.commonClose }));
      setForm((f) => ({ ...f, hours: filled, sameHours: true }));
    } else {
      set("sameHours", false);
    }
  };

  const handleCommonHours = (type, val) => {
    const key = type === "open" ? "commonOpen" : "commonClose";
    const filled = {};
    DAYS.forEach((d) => {
      filled[d] = {
        open: type === "open" ? val : form.commonOpen,
        close: type === "close" ? val : form.commonClose,
      };
    });
    setForm((f) => ({ ...f, hours: filled, [key]: val }));
  };

  // ✅ build & cleanup preview URLs (no memory leaks)
  useEffect(() => {
    const urls = form.gymPhotos.map((f) => URL.createObjectURL(f));
    setPhotoURLs(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [form.gymPhotos]);

  // Load amenities list from DB
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getAmenities();
        const list = res?.data ?? res;
        if (!mounted) return;
        setAmenities(Array.isArray(list) ? list : []);
      } catch {
        if (mounted) setAmenities([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!token) return;

      try {
        const meRes = await getMe();
        const user = meRes?.data ?? meRes ?? {};
        if (!mounted) return;

        setMe(user);

        const fullNameGuess =
          [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() || user?.name || "";

        setForm((f) => ({
          ...f,
          fullName: f.fullName || fullNameGuess,
          email: f.email || user?.email || "",
          contactNumber: f.contactNumber || user?.contact_number || "",
        }));
      } catch {
        // non-blocking
      }

      try {
        const json = await getMyOwnerApplication();
        const app = json?.data || null;
        if (!mounted) return;

        setServerApp(app);
        setServerStatus(app?.status || null);

        if (app) {
          setForm((f) => ({
            ...f,
            gymName: app.gym_name ?? f.gymName,
            address: app.address ?? f.address,
            lat: app.latitude ?? f.lat,
            lng: app.longitude ?? f.lng,

            description: app.description ?? f.description,
            businessName: app.company_name ?? f.businessName,
            contactNumber: app.contact_number ?? f.contactNumber,

            dayPass: app.daily_price ?? f.dayPass,
            monthly: app.monthly_price ?? f.monthly,
            quarterly: app.quarterly_price ?? f.quarterly,

            amenityIds: Array.isArray(app.amenity_ids) ? app.amenity_ids : f.amenityIds,

            mainImageUrl: app.main_image_url ?? f.mainImageUrl,
            galleryUrls: Array.isArray(app.gallery_urls) ? app.gallery_urls : f.galleryUrls,
          }));
        }
      } catch {
        // ok
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [token]);

  const maybeGeocodeAddressBeforeSubmit = async () => {
    const addressText = `${form.address || ""}${form.landmark ? `, ${form.landmark}` : ""}${
      form.city ? `, ${form.city}` : ""
    }`
      .replace(/\s+/g, " ")
      .trim();

    const latNum = Number(form.lat);
    const lngNum = Number(form.lng);

    const usingDefault =
      Math.abs(latNum - PASIG_CENTER[0]) < 0.000001 && Math.abs(lngNum - PASIG_CENTER[1]) < 0.000001;

    if (!addressText) return { ok: true };
    if (!usingDefault) return { ok: true };

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        addressText
      )}&limit=1&addressdetails=1`;
      const res = await fetch(url, { headers: { "Accept-Language": "en" } });
      const json = await res.json();

      const top = Array.isArray(json) ? json[0] : null;
      const la = Number(top?.lat);
      const ln = Number(top?.lon);

      if (!Number.isFinite(la) || !Number.isFinite(ln)) {
        return { ok: false, message: "Could not find coordinates for the address. Please use the map pin." };
      }

      const inside = pointInPolygon(la, ln, PASIG_POLYGON_LATLNG);
      if (!inside) {
        return { ok: false, message: "The address appears outside Pasig City. Please pin inside Pasig only." };
      }

      setForm((f) => ({ ...f, lat: la, lng: ln }));
      return { ok: true };
    } catch {
      return { ok: false, message: "Failed to geocode address. Please use the map pin." };
    }
  };

  const validate = () => {
    const e = {};

    // STEP 0 validations
    if (step === 0) {
      if (!String(form.fullName || "").trim()) e.fullName = "Full name is required.";
      if (!String(form.email || "").trim()) e.email = "Email is required.";
      else if (!isValidEmail(form.email)) e.email = "Please enter a valid email address.";

      if (!String(form.contactNumber || "").trim()) e.contactNumber = "Contact number is required.";
      else if (!isValidPHMobile(form.contactNumber))
        e.contactNumber = "Use PH format (09XXXXXXXXX or +639XXXXXXXXX).";

      if (!String(form.businessName || "").trim()) e.businessName = "Business name is required.";
      else if (String(form.businessName).trim().length < 2) e.businessName = "Business name is too short.";
    }

    // STEP 1 validations
    if (step === 1) {
      if (!String(form.gymName || "").trim()) e.gymName = "Gym name is required.";
      else if (String(form.gymName).trim().length < 2) e.gymName = "Gym name is too short.";

      if (!String(form.description || "").trim()) e.description = "Description is required.";
      else if (String(form.description).trim().length < 20)
        e.description = "Add a bit more detail (at least 20 characters).";

      // pricing
      if (!isNonNegNumberOrEmpty(form.dayPass)) e.dayPass = "Must be a non-negative number.";
      if (!isNonNegNumberOrEmpty(form.monthly)) e.monthly = "Must be a non-negative number.";
      if (!isNonNegNumberOrEmpty(form.quarterly)) e.quarterly = "Must be a non-negative number.";
    }

    // STEP 2 validations
    if (step === 2) {
      if (!String(form.address || "").trim()) e.address = "Street address is required.";
      if (!String(form.city || "").trim()) e.city = "City is required.";
      const la = Number(form.lat);
      const ln = Number(form.lng);
      if (!Number.isFinite(la) || !Number.isFinite(ln)) e.map = "Please drop a pin on the map.";
      else if (!pointInPolygon(la, ln, PASIG_POLYGON_LATLNG)) e.map = "Pin must be inside Pasig City.";
    }

    // STEP 3 validations
    if (step === 3) {
      if (!form.businessReg && !serverApp?.document_path) e.businessReg = "Business registration upload is required.";

      if (form.businessReg) {
        const okTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
        if (!okTypes.includes(form.businessReg.type)) {
          e.businessReg = "Invalid file type. Upload PDF/JPG/PNG/WebP.";
        }
        const max = 10 * 1024 * 1024; // 10MB
        if (form.businessReg.size > max) e.businessReg = "File too large (max 10MB).";
      }

      const totalPhotos = (form.gymPhotos?.length || 0) + (form.galleryUrls?.length || 0);
      if (totalPhotos < 2) e.gymPhotos = "Minimum 2 photos required.";

      for (const f of form.gymPhotos || []) {
        if (!String(f.type || "").startsWith("image/")) {
          e.gymPhotos = "Gym photos must be images only.";
          break;
        }
        const maxImg = 8 * 1024 * 1024; // 8MB each
        if (f.size > maxImg) {
          e.gymPhotos = "One of the images is too large (max 8MB each).";
          break;
        }
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (validate()) setStep((s) => s + 1);
  };

  const back = () => setStep((s) => s - 1);

  const goTo = (i) => {
    if (i < step) setStep(i);
  };

  const handleRegUpload = (e) => {
    const f = e.target.files?.[0];
    if (f) set("businessReg", f);
  };

  const handlePhotos = (e) => {
    const files = Array.from(e.target.files || []);
    const merged = [...form.gymPhotos, ...files].slice(0, 8);
    set("gymPhotos", merged);
  };

  const removePhoto = (i) => set("gymPhotos", form.gymPhotos.filter((_, idx) => idx !== i));

  const handleMapPinAccepted = async (newLat, newLng) => {
    setForm((f) => ({ ...f, lat: newLat, lng: newLng }));

    try {
      const data = await reverseGeocode(newLat, newLng);
      const { street, city } = bestEffortAddressFromNominatim(data);

      setForm((f) => ({
        ...f,
        lat: newLat,
        lng: newLng,
        address: street || f.address,
        city: city || f.city,
      }));

      setErrors((e) => ({ ...e, address: "", city: "", map: "" }));
    } catch {
      // ok
    }
  };

  const uploadSelectedGymPhotos = async () => {
    if (!form.gymPhotos.length) return [];
    const uploaded = [];
    for (let i = 0; i < form.gymPhotos.length; i++) {
      const file = form.gymPhotos[i];
      const url = await uploadOwnerApplicationFile(file, "gallery");
      uploaded.push(url);
    }
    return uploaded;
  };

  const submitApplication = async () => {
    if (!validate()) return;

    if (!token) {
      alert("No session token found. Please log in again.");
      return;
    }

    setSubmitting(true);

    try {
      const geo = await maybeGeocodeAddressBeforeSubmit();
      if (!geo.ok) {
        alert(geo.message);
        setSubmitting(false);
        return;
      }

      let document_path = serverApp?.document_path || null;
      if (form.businessReg) {
        document_path = await uploadOwnerApplicationFile(form.businessReg, "docs");
      }

      const newlyUploadedGallery = await uploadSelectedGymPhotos();

      const mergedGallery = Array.from(
        new Set([...(Array.isArray(form.galleryUrls) ? form.galleryUrls : []), ...newlyUploadedGallery].filter(Boolean))
      );

      const main_image_url = form.mainImageUrl || mergedGallery[0] || serverApp?.main_image_url || null;

      const payload = {
        gym_name: String(form.gymName || "").trim(),
        address: `${form.address}${form.landmark ? `, ${form.landmark}` : ""}${form.city ? `, ${form.city}` : ""}`,
        latitude: Number(form.lat),
        longitude: Number(form.lng),

        document_path,

        description: String(form.description || "").trim() || null,
        contact_number: normalizePhone(form.contactNumber) || null,
        company_name: String(form.businessName || "").trim() || null,

        daily_price: form.dayPass === "" ? null : Number(form.dayPass),
        monthly_price: form.monthly === "" ? null : Number(form.monthly),
        quarterly_price: form.quarterly === "" ? null : Number(form.quarterly),

        amenity_ids: Array.isArray(form.amenityIds) ? form.amenityIds : [],

        main_image_url,
        gallery_urls: mergedGallery,
      };

      const json = await submitOwnerApplication(payload);

      const app = json?.data || null;
      setServerApp(app);
      setServerStatus(app?.status || "pending");

      setForm((f) => ({
        ...f,
        galleryUrls: mergedGallery,
        mainImageUrl: main_image_url || "",
        gymPhotos: [],
        businessReg: null,
      }));

      // ✅ important: show waiting screen immediately
      setSubmitted(true);
    } catch (err) {
      alert(err?.message || "Failed to submit application.");
    } finally {
      setSubmitting(false);
    }
  };

  const currentStep = STEPS[step];
  const StepIcon = currentStep.icon;

  const reviewAddress = useMemo(() => {
    const a = `${form.address || ""}`.trim();
    const c = `${form.city || ""}`.trim();
    const l = `${form.landmark || ""}`.trim();
    return [a, l, c].filter(Boolean).join(", ");
  }, [form.address, form.city, form.landmark]);

  const amenityLabel = useMemo(() => {
    const map = new Map((amenities || []).map((a) => [getAmenityId(a), a?.name]).filter(([id]) => id));
    const labels = (form.amenityIds || []).map((id) => map.get(Number(id))).filter(Boolean);
    return labels.length ? labels.join(", ") : "None";
  }, [amenities, form.amenityIds]);

  // ✅ ROLE/STATUS GATING (THIS IS WHAT YOU ASKED FOR)
  const normalizedStatus = String(serverStatus || "").toLowerCase();
  const isApproved = normalizedStatus === "approved" || normalizedStatus === "accepted";
  const isPending = normalizedStatus === "pending";

  const roleGuess = String(me?.role ?? me?.user_role ?? me?.type ?? me?.account_type ?? "").toLowerCase();
  const isOwnerByRole =
    roleGuess === "owner" ||
    roleGuess === "gym_owner" ||
    roleGuess === "gym-owner" ||
    roleGuess === "gym owner" ||
    me?.is_owner === true ||
    me?.isOwner === true;

  // ✅ If already owner OR application accepted -> show approved screen
  if (isOwnerByRole || isApproved) {
    return <ApprovedScreen form={form} />;
  }

  // ✅ If pending on server -> always show waiting page (even after refresh)
  if (isPending) {
    return <PendingScreen form={form} serverStatus={serverStatus} />;
  }

  // ✅ If just submitted in this session -> show waiting page
  if (submitted) {
    return <PendingScreen form={form} serverStatus={serverStatus || "pending"} />;
  }

  return (
    <div className="oa-app">
      <HomeHeader />

      <div className="oa-stepper-bar">
        <div className="oa-stepper">
          {STEPS.map((s, i) => {
            const SIcon = s.icon;
            return (
              <React.Fragment key={i}>
                <div
                  className={`oa-step ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}
                  onClick={() => goTo(i)}
                  style={{ cursor: i < step ? "pointer" : "default" }}
                >
                  <div className="oa-step-bubble">{i < step ? <FaCheck size={11} /> : <SIcon size={13} />}</div>
                  <span>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`oa-step-line ${i < step ? "done" : ""}`} />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="oa-layout">
        <aside className="oa-sidebar">
          <div className="oa-sidebar-inner">
            <div className="oa-sidebar-icon">
              <StepIcon />
            </div>
            <h2>{currentStep.label}</h2>
            <p>
              {step === 0 && "Tell us about yourself — the gym owner behind the brand."}
              {step === 1 && "What makes your gym stand out? Share every detail."}
              {step === 2 && "Drop a pin on your exact location in Pasig City."}
              {step === 3 && "Upload your business docs and showcase your gym."}
              {step === 4 && "Almost there! Review everything before we send it."}
            </p>

            <div className="oa-sidebar-progress">
              <div className="oa-sidebar-progress-track">
                <div className="oa-sidebar-progress-fill" style={{ height: `${(step / (STEPS.length - 1)) * 100}%` }} />
              </div>
              <div className="oa-sidebar-progress-labels">
                {STEPS.map((s, i) => (
                  <span key={i} className={i <= step ? "done" : ""}>
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <main className="oa-main">
          <div className="oa-card" key={step}>
            {/* STEP 0 */}
            {step === 0 && (
              <div className="oa-fields">
                <div className="oa-grid-2">
                  <div className={`oa-field ${errors.fullName ? "has-error" : ""}`}>
                    <label>
                      Full Name <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Juan Dela Cruz"
                      value={form.fullName}
                      onChange={(e) => set("fullName", e.target.value)}
                    />
                    {errors.fullName && <p className="oa-err-msg">{errors.fullName}</p>}
                  </div>

                  <div className={`oa-field ${errors.contactNumber ? "has-error" : ""}`}>
                    <label>
                      Contact Number <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="09XXXXXXXXX or +639XXXXXXXXX"
                      value={form.contactNumber}
                      onChange={(e) => set("contactNumber", e.target.value)}
                    />
                    {errors.contactNumber && <p className="oa-err-msg">{errors.contactNumber}</p>}
                  </div>
                </div>

                <div className={`oa-field ${errors.email ? "has-error" : ""}`}>
                  <label>
                    Email Address <span className="req">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="juan@email.com"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                  />
                  {errors.email && <p className="oa-err-msg">{errors.email}</p>}
                </div>

                <div className={`oa-field ${errors.businessName ? "has-error" : ""}`}>
                  <label>
                    Business Name <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="IronForge Fitness Inc."
                    value={form.businessName}
                    onChange={(e) => set("businessName", e.target.value)}
                  />
                  {errors.businessName && <p className="oa-err-msg">{errors.businessName}</p>}
                </div>
              </div>
            )}

            {/* STEP 1 */}
            {step === 1 && (
              <div className="oa-fields">
                <div className={`oa-field ${errors.gymName ? "has-error" : ""}`}>
                  <label>
                    Gym Name <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="IronForge Gym"
                    value={form.gymName}
                    onChange={(e) => set("gymName", e.target.value)}
                  />
                  {errors.gymName && <p className="oa-err-msg">{errors.gymName}</p>}
                </div>

                <div className={`oa-field ${errors.description ? "has-error" : ""}`}>
                  <label>
                    Description <span className="req">*</span>
                  </label>
                  <textarea
                    placeholder="Describe your gym — equipment, vibe, community..."
                    rows={4}
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                  />
                  {errors.description && <p className="oa-err-msg">{errors.description}</p>}
                </div>

                <div className="oa-field">
                  <label>
                    Amenities <span className="label-hint">Click to select</span>
                  </label>

                  {amenities.length === 0 ? (
                    <div style={{ fontSize: 13, opacity: 0.8 }}>Loading amenities...</div>
                  ) : (
                    <div className="oa-amenity-grid">
                      {amenities.map((a) => {
                        const id = getAmenityId(a);
                        if (!id) return null;

                        const on = form.amenityIds.includes(id);
                        return (
                          <button
                            key={id}
                            type="button"
                            className={`oa-amenity-btn ${on ? "on" : ""}`}
                            onClick={(ev) => {
                              ev.preventDefault();
                              ev.stopPropagation();
                              toggleAmenityId(id);
                            }}
                            title={a?.description || ""}
                          >
                            {on && <FaCheck size={9} />}
                            {a?.name || `Amenity #${id}`}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="oa-field">
                  <label>
                    Pricing <span className="label-hint">in Philippine Peso (₱)</span>
                  </label>
                  <div className="oa-pricing-row">
                    {[
                      ["dayPass", "Day Pass"],
                      ["monthly", "Monthly"],
                      ["quarterly", "Quarterly"],
                    ].map(([k, l]) => (
                      <div key={k} className="oa-price-card">
                        <span>{l}</span>
                        <div className="oa-price-input">
                          <span className="peso">₱</span>
                          <input
                            type="number"
                            placeholder="0"
                            min="0"
                            value={form[k]}
                            onChange={(e) => set(k, e.target.value)}
                          />
                        </div>
                        {errors[k] && <p className="oa-err-msg">{errors[k]}</p>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="oa-field">
                  <label>Operating Hours</label>
                  <div className="oa-hours-section">
                    <label className="oa-toggle-label">
                      <div
                        className={`oa-toggle-switch ${form.sameHours ? "on" : ""}`}
                        onClick={() => handleSameHours(!form.sameHours)}
                      >
                        <div className="oa-toggle-knob" />
                      </div>
                      <span>Same hours every day</span>
                    </label>

                    {form.sameHours ? (
                      <div className="oa-time-single">
                        <TimePicker value={form.commonOpen} onChange={(v) => handleCommonHours("open", v)} />
                        <div className="oa-time-dash">—</div>
                        <TimePicker value={form.commonClose} onChange={(v) => handleCommonHours("close", v)} />
                      </div>
                    ) : (
                      <div className="oa-time-grid">
                        {DAYS.map((d) => (
                          <div className="oa-day-row" key={d}>
                            <span className="oa-day-label">{d.slice(0, 3).toUpperCase()}</span>
                            <TimePicker value={form.hours[d].open} onChange={(v) => setHourDay(d, "open", v)} />
                            <div className="oa-time-dash">—</div>
                            <TimePicker value={form.hours[d].close} onChange={(v) => setHourDay(d, "close", v)} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="oa-fields">
                <div className={`oa-field ${errors.address ? "has-error" : ""}`}>
                  <label>
                    Street Address <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="123 Kapitolyo St."
                    value={form.address}
                    onChange={(e) => set("address", e.target.value)}
                  />
                  {errors.address && <p className="oa-err-msg">{errors.address}</p>}
                </div>

                <div className="oa-grid-2">
                  <div className={`oa-field ${errors.city ? "has-error" : ""}`}>
                    <label>
                      City <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Pasig City"
                      value={form.city}
                      onChange={(e) => set("city", e.target.value)}
                    />
                    {errors.city && <p className="oa-err-msg">{errors.city}</p>}
                  </div>

                  <div className="oa-field">
                    <label>Landmark</label>
                    <input
                      type="text"
                      placeholder="Near SM Pasig"
                      value={form.landmark}
                      onChange={(e) => set("landmark", e.target.value)}
                    />
                  </div>
                </div>

                <div className={`oa-field ${errors.map ? "has-error" : ""}`}>
                  <label>
                    Search & Pin Location{" "}
                    <span className="label-hint">Click inside the red border — map click auto-fills the address</span>
                  </label>

                  <div className="oa-map-wrapper">
                    <LeafletMap lat={form.lat} lng={form.lng} onPinAccepted={handleMapPinAccepted} />
                    <div className="oa-coords-badge">
                      📍 {Number(form.lat).toFixed(5)}, {Number(form.lng).toFixed(5)}
                    </div>
                  </div>

                  {errors.map && <p className="oa-err-msg">{errors.map}</p>}
                  <p className="oa-map-hint">
                    💡 If you don’t pin, we’ll try to convert your address into coordinates during submit.
                  </p>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div className="oa-fields">
                <div className={`oa-field ${errors.businessReg ? "has-error" : ""}`}>
                  <label>
                    Business Registration <span className="req">*</span>
                  </label>

                  <input
                    ref={regRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    style={{ display: "none" }}
                    onChange={handleRegUpload}
                  />

                  {!form.businessReg ? (
                    <div className="oa-dropzone" onClick={() => regRef.current?.click()}>
                      <div className="oa-dropzone-icon">
                        <FaUpload />
                      </div>
                      <p>
                        Click to upload <strong>PDF, JPG, PNG, WebP</strong>
                      </p>
                      <span>Business permit, DTI/SEC registration</span>

                      {serverApp?.document_path ? (
                        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>Existing doc on file ✅</div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="oa-file-chip">
                      <FaFileAlt />
                      <span>{form.businessReg.name}</span>
                      <button type="button" onClick={() => set("businessReg", null)}>
                        <FaTimes />
                      </button>
                    </div>
                  )}

                  {errors.businessReg && <p className="oa-err-msg">{errors.businessReg}</p>}
                </div>

                <div className={`oa-field ${errors.gymPhotos ? "has-error" : ""}`}>
                  <label>
                    Gym Photos <span className="req">*</span>
                    <span className="label-hint">
                      Selected {form.gymPhotos.length}/8 — Saved on server {(form.galleryUrls?.length || 0)} — min. 2
                      total
                    </span>
                  </label>

                  <input
                    ref={photoRef}
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: "none" }}
                    onChange={handlePhotos}
                  />

                  <div className="oa-photo-grid">
                    {photoURLs.map((url, i) => (
                      <div key={url} className="oa-photo-tile">
                        <img src={url} alt="" />
                        <button type="button" className="oa-photo-remove" onClick={() => removePhoto(i)}>
                          <FaTimes size={9} />
                        </button>
                      </div>
                    ))}

                    {form.gymPhotos.length < 8 && (
                      <button type="button" className="oa-photo-add" onClick={() => photoRef.current?.click()}>
                        <FaCamera />
                        <span>Add</span>
                      </button>
                    )}
                  </div>

                  {!!form.galleryUrls?.length && (
                    <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
                      Existing uploaded gallery: {form.galleryUrls.length} photo(s) ✅
                    </div>
                  )}

                  {errors.gymPhotos && <p className="oa-err-msg">{errors.gymPhotos}</p>}
                </div>
              </div>
            )}

            {/* STEP 4 */}
            {step === 4 && (
              <div className="oa-review">
                {[
                  {
                    icon: <FaUser />,
                    title: "Owner Info",
                    editStep: 0,
                    rows: [
                      ["Name", form.fullName],
                      ["Email", form.email],
                      ["Contact", normalizePhone(form.contactNumber)],
                      ["Business", form.businessName],
                    ],
                  },
                  {
                    icon: <FaDumbbell />,
                    title: "Gym Details",
                    editStep: 1,
                    rows: [
                      ["Gym Name", form.gymName],
                      ["Description", form.description],
                      ["Amenities", amenityLabel],
                      [
                        "Pricing",
                        `Day ₱${form.dayPass || 0} | Monthly ₱${form.monthly || 0} | Annual ₱${form.quarterly || 0}`,
                      ],
                    ],
                  },
                  {
                    icon: <FaMapMarkerAlt />,
                    title: "Location",
                    editStep: 2,
                    rows: [
                      ["Address", reviewAddress || "—"],
                      ["Coordinates", `${Number(form.lat).toFixed(4)}, ${Number(form.lng).toFixed(4)}`],
                    ],
                  },
                  {
                    icon: <FaCamera />,
                    title: "Files",
                    editStep: 3,
                    rows: [
                      ["Document", form.businessReg?.name || (serverApp?.document_path ? "Existing doc on file ✅" : "—")],
                      ["Photos", `${form.gymPhotos.length} selected, ${(form.galleryUrls?.length || 0)} already uploaded`],
                    ],
                  },
                ].map(({ icon, title, editStep, rows }) => (
                  <div key={title} className="oa-review-card">
                    <div className="oa-review-header">
                      <div className="oa-review-title">
                        {icon} {title}
                      </div>
                      <button type="button" className="oa-review-edit" onClick={() => setStep(editStep)}>
                        Edit
                      </button>
                    </div>
                    <div className="oa-review-rows">
                      {rows.map(([k, v]) => (
                        <div key={k} className="oa-review-row">
                          <span>{k}</span>
                          <strong>{v}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="oa-confirm-banner">
                  <FaCheckCircle />
                  <p>By submitting, you confirm that all information provided is accurate and complete.</p>
                </div>
              </div>
            )}

            <div className="oa-nav">
              {step > 0 ? (
                <button className="oa-btn-back" type="button" onClick={back} disabled={submitting}>
                  <FaArrowLeft size={12} /> Back
                </button>
              ) : (
                <Link to="/home/becomeowner" className="oa-btn-back">
                  <FaArrowLeft size={12} /> Cancel
                </Link>
              )}

              {step < STEPS.length - 1 ? (
                <button className="oa-btn-next" type="button" onClick={next} disabled={submitting}>
                  Continue <FaArrowRight size={12} />
                </button>
              ) : (
                <button className="oa-btn-submit" type="button" onClick={submitApplication} disabled={submitting}>
                  {submitting ? (
                    "Submitting..."
                  ) : (
                    <>
                      Submit Application <FaCheck size={12} />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </main>
      </div>


    </div>
  );
}