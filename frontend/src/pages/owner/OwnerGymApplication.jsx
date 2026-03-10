import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./EditGym.css";
import {
  Save,
  Upload,
  Trash2,
  MapPin,
  Clock,
  DollarSign,
  Image as ImageIcon,
  Phone,
  Mail,
  Globe,
  ChevronLeft,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import Swal from "sweetalert2";

import { MapContainer, TileLayer, Marker, Polygon, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { createGym, uploadGymImage, absoluteUrl } from "../../utils/gymApi";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const PASIG_CENTER = { lat: 14.5764, lng: 121.0851 };

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

const GYM_TYPES = [
  { value: "", label: "Select gym type (optional)" },
  { value: "Commercial", label: "Commercial Gym" },
  { value: "Boxing", label: "Boxing Gym" },
  { value: "Crossfit", label: "Crossfit" },
  { value: "Powerlifting", label: "Powerlifting" },
  { value: "Weightlifting", label: "Olympic Weightlifting" },
  { value: "Functional", label: "Functional Training" },
  { value: "MMA", label: "MMA / Martial Arts" },
  { value: "Yoga", label: "Yoga / Studio" },
  { value: "WomenOnly", label: "Women-only Gym" },
];

function pointInPolygon(lat, lng, polygonLatLng) {
  let inside = false;
  for (let i = 0, j = polygonLatLng.length - 1; i < polygonLatLng.length; j = i++) {
    const [latI, lngI] = polygonLatLng[i];
    const [latJ, lngJ] = polygonLatLng[j];
    const intersect = (latI > lat) !== (latJ > lat) && lng < ((lngJ - lngI) * (lat - latI)) / (latJ - latI) + lngI;
    if (intersect) inside = !inside;
  }
  return inside;
}

function toFloatOrNull(v) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function isNonNegNumberOrEmpty(v) {
  if (v === "" || v === null || v === undefined) return true;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0;
}

function normalizePhone(v) {
  return String(v || "").replace(/[^\d+]/g, "").trim();
}

function isValidPHPhone(v) {
  const s = normalizePhone(v);
  if (!s) return false;
  return /^09\d{9}$/.test(s) || /^\+639\d{9}$/.test(s);
}

function isValidEmail(email) {
  const s = String(email || "").trim();
  if (!s) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function normalizeUrlNullable(value) {
  const s = String(value ?? "").trim();
  if (!s) return null;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  return `https://${s}`;
}

function isValidUrlNullable(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return true;
  try {
    const u = new URL(normalizeUrlNullable(raw));
    return Boolean(u.hostname);
  } catch {
    return false;
  }
}

function priceError(label, v, { required = false } = {}) {
  const raw = String(v ?? "").trim();
  if (!raw) return required ? `${label} is required.` : "";
  const n = Number(raw);
  if (!Number.isFinite(n)) return `${label} must be a number.`;
  if (n < 0) return `${label} cannot be negative.`;
  if (n > 1000000) return `${label} looks too high. Please double-check.`;
  return "";
}

async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
  const res = await fetch(url, { headers: { "Accept-Language": "en", Accept: "application/json" } });
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

function Recenter({ center }) {
  const map = useMap();

  useEffect(() => {
    if (!center) return;
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);

  return null;
}

function MapClick({ onPick }) {
  useMapEvents({
    click(e) {
      const ll = e.latlng;
      if (!ll) return;
      onPick(ll);
    },
  });

  return null;
}

export default function OwnerGymApplication() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [activeTab, setActiveTab] = useState("basic");
  const [errors, setErrors] = useState({});
  const [outsideWarning, setOutsideWarning] = useState(false);

  const [addressOpen, setAddressOpen] = useState(false);
  const [addressActiveIndex, setAddressActiveIndex] = useState(-1);
  const [geoSuggestions, setGeoSuggestions] = useState([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoErr, setGeoErr] = useState("");

  const [submitted, setSubmitted] = useState(false);
  const [createdGym, setCreatedGym] = useState(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    gym_type: "",
    has_personal_trainers: false,
    has_classes: false,
    is_24_hours: false,
    is_airconditioned: false,

    address: "",
    city: "Pasig City",
    landmark: "",
    latitude: String(PASIG_CENTER.lat),
    longitude: String(PASIG_CENTER.lng),

    daily_price: "",
    monthly_price: "",
    annual_price: "",

    opening_time: "06:00",
    closing_time: "22:00",

    contact_number: "",
    email: "",
    website: "",
    facebook_page: "",
    instagram_page: "",

    main_image_url: "",
    gallery_urls: [],
  });

  const markerPos = useMemo(() => {
    const lat = toFloatOrNull(form.latitude);
    const lng = toFloatOrNull(form.longitude);
    if (lat == null || lng == null) return null;
    return { lat, lng };
  }, [form.latitude, form.longitude]);

  const hasPinnedLocation = useMemo(() => {
    const lat = toFloatOrNull(form.latitude);
    const lng = toFloatOrNull(form.longitude);
    return lat != null && lng != null;
  }, [form.latitude, form.longitude]);

  const mapCenter = useMemo(() => markerPos || PASIG_CENTER, [markerPos]);

  const rawPhotos = useMemo(() => {
    return [form.main_image_url || null, ...(Array.isArray(form.gallery_urls) ? form.gallery_urls : [])].filter(Boolean);
  }, [form.main_image_url, form.gallery_urls]);

  const photos = useMemo(() => {
    const display = rawPhotos.map((u) => (absoluteUrl ? absoluteUrl(u) : u)).filter(Boolean);
    return display.length ? display : ["https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80"];
  }, [rawPhotos]);

  useEffect(() => {
    const q = String(form.address || "").trim();
    if (!q || q.length < 3) {
      setGeoSuggestions([]);
      setGeoErr("");
      setGeoLoading(false);
      return;
    }

    let cancelled = false;
    setGeoLoading(true);
    setGeoErr("");

    const t = setTimeout(async () => {
      try {
        const url =
          `https://nominatim.openstreetmap.org/search?` +
          new URLSearchParams({
            q,
            format: "json",
            addressdetails: "1",
            limit: "8",
          }).toString();

        const res = await fetch(url, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error(`Geocode failed (${res.status})`);
        const json = await res.json();
        if (cancelled) return;

        const mapped = (Array.isArray(json) ? json : [])
          .map((x) => {
            const lat = Number(x.lat);
            const lng = Number(x.lon);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

            const city =
              x.address?.city ||
              x.address?.town ||
              x.address?.village ||
              x.address?.municipality ||
              x.address?.state ||
              "";

            return {
              key: `geo-${x.place_id}-${lat}-${lng}`,
              address: x.display_name || q,
              city: String(city || "").trim(),
              latitude: lat,
              longitude: lng,
              label: "Search result",
            };
          })
          .filter(Boolean);

        setGeoSuggestions(mapped);
      } catch (e) {
        if (cancelled) return;
        setGeoSuggestions([]);
        setGeoErr(e?.message || "Geocoding failed.");
      } finally {
        if (!cancelled) setGeoLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [form.address]);

  const addressSuggestions = useMemo(() => {
    const q = String(form.address || "").trim().toLowerCase();
    if (!q) return [];

    const filtered = geoSuggestions.filter((x) => {
      const a = String(x.address || "").toLowerCase();
      const c = String(x.city || "").toLowerCase();
      const l = String(x.label || "").toLowerCase();
      return a.includes(q) || c.includes(q) || l.includes(q);
    });

    return filtered.slice(0, 8);
  }, [form.address, geoSuggestions]);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const setBool = (field) => (e) => {
    const v = !!e.target.checked;
    setForm((prev) => ({ ...prev, [field]: v }));
  };

  const applyAddressPick = async (pick) => {
    const inside = pointInPolygon(pick.latitude, pick.longitude, PASIG_POLYGON_LATLNG);
    if (!inside) {
      setOutsideWarning(true);
      setTimeout(() => setOutsideWarning(false), 2500);
      return;
    }

    setForm((prev) => ({
      ...prev,
      address: pick.address || prev.address,
      city: pick.city || prev.city,
      latitude: String(pick.latitude),
      longitude: String(pick.longitude),
    }));
    setErrors((prev) => ({ ...prev, address: "", location: "" }));
  };

  const onMapPick = async (ll) => {
    const inside = pointInPolygon(ll.lat, ll.lng, PASIG_POLYGON_LATLNG);
    if (!inside) {
      setOutsideWarning(true);
      setTimeout(() => setOutsideWarning(false), 2500);
      return;
    }

    setForm((prev) => ({
      ...prev,
      latitude: String(ll.lat),
      longitude: String(ll.lng),
    }));
    setErrors((prev) => ({ ...prev, location: "" }));

    try {
      const data = await reverseGeocode(ll.lat, ll.lng);
      const { street, city } = bestEffortAddressFromNominatim(data);
      setForm((prev) => ({
        ...prev,
        address: street || prev.address,
        city: city || prev.city,
      }));
      setErrors((prev) => ({ ...prev, address: "", city: "" }));
    } catch {}
  };

  const onMapDragEnd = (e) => {
    const ll = e.target.getLatLng();
    onMapPick(ll);
  };

  const validateTab = (tab) => {
    const e = {};

    if (tab === "basic") {
      if (!String(form.name || "").trim()) e.name = "Gym name is required.";
      else if (String(form.name).trim().length < 2) e.name = "Gym name must be at least 2 characters.";

      if (!String(form.description || "").trim()) e.description = "Description is required.";
      else if (String(form.description).trim().length < 20) e.description = "Description must be at least 20 characters (add more detail).";
    }

    if (tab === "location") {
      if (!String(form.address || "").trim()) e.address = "Street address is required (type at least 3 characters to search).";
      if (!String(form.city || "").trim()) e.city = "City is required.";

      const la = toFloatOrNull(form.latitude);
      const ln = toFloatOrNull(form.longitude);

      if (la == null || ln == null) e.location = "Please pin your exact location on the map (click the map or choose a suggestion).";
      else if (!pointInPolygon(la, ln, PASIG_POLYGON_LATLNG)) e.location = "Pinned location is outside Pasig City. Please pin inside Pasig only.";
    }

    if (tab === "hours") {
      if (!String(form.opening_time || "").trim()) e.opening_time = "Opening time is required.";
      if (!String(form.closing_time || "").trim()) e.closing_time = "Closing time is required.";
    }

    if (tab === "pricing") {
      const dErr = priceError("Daily price", form.daily_price, { required: false });
      if (dErr) e.daily_price = dErr;

      const mErr = priceError("Monthly price", form.monthly_price, { required: true });
      if (mErr) e.monthly_price = mErr;

      const aErr = priceError("Annual price", form.annual_price, { required: false });
      if (aErr) e.annual_price = aErr;

      if (!String(form.monthly_price ?? "").trim()) e.monthly_price = "Monthly price is required.";
      else if (!isNonNegNumberOrEmpty(form.monthly_price)) e.monthly_price = "Monthly price must be a non-negative number.";

      if (!isNonNegNumberOrEmpty(form.daily_price)) e.daily_price = "Daily price must be a non-negative number.";
      if (!isNonNegNumberOrEmpty(form.annual_price)) e.annual_price = "Annual price must be a non-negative number.";
    }

    if (tab === "contact") {
      if (!String(form.contact_number || "").trim()) e.contact_number = "Contact number is required.";
      else if (!isValidPHPhone(form.contact_number)) e.contact_number = "Use PH format: 09XXXXXXXXX or +639XXXXXXXXX.";

      if (!isValidEmail(form.email)) e.email = "Email is invalid. Example: gym@email.com";

      if (!isValidUrlNullable(form.website)) e.website = "Website must be a valid URL (e.g., www.site.com).";
      if (!isValidUrlNullable(form.facebook_page)) e.facebook_page = "Facebook must be a valid URL (e.g., facebook.com/yourpage).";
      if (!isValidUrlNullable(form.instagram_page)) e.instagram_page = "Instagram must be a valid URL (e.g., instagram.com/yourpage).";
    }

    if (tab === "media") {
      const total = rawPhotos?.length || 0;
      if (total < 2) e.media = `Please upload at least 2 photos (currently ${total}).`;
    }

    setErrors((prev) => ({ ...prev, ...e }));
    return Object.keys(e).length === 0;
  };

  const tabs = [
    { key: "basic", label: "Basic Info", icon: Phone },
    { key: "location", label: "Location", icon: MapPin },
    { key: "hours", label: "Hours", icon: Clock },
    { key: "pricing", label: "Pricing", icon: DollarSign },
    { key: "contact", label: "Contact", icon: Globe },
    { key: "media", label: "Media", icon: ImageIcon },
    { key: "review", label: "Review", icon: CheckCircle2 },
  ];

  const currentIndex = tabs.findIndex((t) => t.key === activeTab);
  const nextTabKey = tabs[Math.min(currentIndex + 1, tabs.length - 1)]?.key;
  const prevTabKey = tabs[Math.max(currentIndex - 1, 0)]?.key;

  const goNext = () => {
    const mustValidate = ["basic", "location", "hours", "pricing", "contact", "media"];
    if (mustValidate.includes(activeTab)) {
      if (!validateTab(activeTab)) {
        Swal.fire({
          icon: "warning",
          title: "Fix highlighted fields",
          text: "Some inputs are invalid. Check the messages under each field.",
        });
        return;
      }
    }
    setActiveTab(nextTabKey);
  };

  const goPrev = () => setActiveTab(prevTabKey);

  const onClickUpload = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const removePhotoAt = (idx) => {
    const list = [...rawPhotos];
    list.splice(idx, 1);
    const main = list[0] || "";
    const gallery = list.slice(1);
    setForm((prev) => ({ ...prev, main_image_url: main, gallery_urls: gallery }));
    setErrors((prev) => ({ ...prev, media: "" }));
  };

  const onFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    setUploading(true);
    try {
      const uploadedUrls = [];

      for (const file of files) {
        const { url } = await uploadGymImage(file, "gallery");
        if (!url) throw new Error("Upload succeeded but server returned no url.");
        uploadedUrls.push(String(url));
      }

      if (uploadedUrls.length) {
        setForm((prev) => {
          const currentRaw = [prev.main_image_url || null, ...(Array.isArray(prev.gallery_urls) ? prev.gallery_urls : [])].filter(Boolean);
          const merged = [...currentRaw, ...uploadedUrls];
          return { ...prev, main_image_url: merged[0] || "", gallery_urls: merged.slice(1) };
        });
        setErrors((prev) => ({ ...prev, media: "" }));
      }
    } catch (err) {
      Swal.fire({ icon: "error", title: "Upload failed", text: err?.message || "Upload failed." });
    } finally {
      setUploading(false);
    }
  };

  const reviewAddress = useMemo(() => {
    const a = `${form.address || ""}`.trim();
    const c = `${form.city || ""}`.trim();
    const l = `${form.landmark || ""}`.trim();
    return [a, l, c].filter(Boolean).join(", ");
  }, [form.address, form.city, form.landmark]);

  const featureLabel = useMemo(() => {
    const parts = [];
    if (form.is_24_hours) parts.push("24 Hours");
    if (form.is_airconditioned) parts.push("Airconditioned");
    if (form.has_personal_trainers) parts.push("Personal Trainers");
    if (form.has_classes) parts.push("Classes");
    return parts.length ? parts.join(" • ") : "None";
  }, [form.is_24_hours, form.is_airconditioned, form.has_personal_trainers, form.has_classes]);

  const submit = async () => {
    const mustValidate = ["basic", "location", "hours", "pricing", "contact", "media"];

    for (const t of mustValidate) {
      if (!validateTab(t)) {
        setActiveTab(t);
        Swal.fire({
          icon: "warning",
          title: "Fix highlighted fields",
          text: "Some inputs are invalid. Check the messages under each field.",
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      const mergedGallery = Array.from(new Set((Array.isArray(form.gallery_urls) ? form.gallery_urls : []).filter(Boolean)));
      const main_image_url = form.main_image_url || mergedGallery[0] || null;

      const payload = {
        name: String(form.name || "").trim(),
        description: String(form.description || "").trim(),
        address: `${String(form.address || "").trim()}${form.landmark ? `, ${String(form.landmark).trim()}` : ""}${form.city ? `, ${String(form.city).trim()}` : ""}`,
        latitude: Number(toFloatOrNull(form.latitude)),
        longitude: Number(toFloatOrNull(form.longitude)),

        daily_price: form.daily_price === "" ? null : Number(form.daily_price),
        monthly_price: form.monthly_price === "" ? null : Number(form.monthly_price),
        annual_price: form.annual_price === "" ? null : Number(form.annual_price),

        opening_time: form.opening_time || null,
        closing_time: form.closing_time || null,

        gym_type: String(form.gym_type || "").trim() || null,

        contact_number: normalizePhone(form.contact_number) || null,
        email: String(form.email || "").trim() || null,
        website: normalizeUrlNullable(form.website),
        facebook_page: normalizeUrlNullable(form.facebook_page),
        instagram_page: normalizeUrlNullable(form.instagram_page),

        has_personal_trainers: !!form.has_personal_trainers,
        has_classes: !!form.has_classes,
        is_24_hours: !!form.is_24_hours,
        is_airconditioned: !!form.is_airconditioned,

        main_image_url,
        gallery_urls: mergedGallery,
      };

      const json = await createGym(payload);
      const gymData = json?.data?.data ?? json?.data ?? null;
      setCreatedGym(gymData || null);
      setSubmitted(true);
    } catch (err) {
      Swal.fire({ icon: "error", title: "Submit failed", text: err?.message || "Failed to submit gym application." });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    const gymId = createdGym?.gym_id ?? createdGym?.id ?? null;

    return (
      <div className="eg-app">
        <div className="eg-container">
          <div className="eg-content">
            <div className="eg-tab-content">
              <div className="eg-section" style={{ maxWidth: 820, margin: "0 auto" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 16,
                      display: "grid",
                      placeItems: "center",
                      background: "rgba(255,140,0,0.12)",
                      border: "1px solid rgba(255,140,0,0.28)",
                    }}
                  >
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0 }}>Gym Submitted!</h2>
                    <div style={{ opacity: 0.8, marginTop: 4 }}>
                      Your gym has been submitted for review. Status will be <b>pending</b> until approved by admin.
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
                  {[
                    ["Gym", form.name],
                    ["City", form.city],
                    ["Pricing", `Day ₱${form.daily_price || 0} | Monthly ₱${form.monthly_price || 0} | Annual ₱${form.annual_price || 0}`],
                    ["Features", featureLabel],
                    ["Status", "⏳ Pending"],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        padding: "12px 14px",
                        borderRadius: 14,
                        border: "1px solid rgba(0,0,0,0.08)",
                        background: "rgba(255,255,255,0.92)",
                      }}
                    >
                      <div style={{ opacity: 0.75, fontWeight: 800 }}>{k}</div>
                      <div style={{ fontWeight: 900 }}>{v}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  <button className="eg-btn-primary" type="button" onClick={() => navigate("/owner/home")} style={{ flex: 1 }}>
                    Go to Owner Home <ArrowRight size={18} />
                  </button>

                  {gymId ? (
                    <button className="eg-btn-secondary" type="button" onClick={() => navigate(`/owner/edit-gym/${gymId}`)} style={{ flex: 1 }}>
                      Edit Gym <ArrowRight size={18} />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="eg-app">
      <div className="eg-container">
        <div className="eg-sticky-header">
          <div className="eg-header-content">
            <button className="eg-back-btn" onClick={() => (activeTab === "basic" ? navigate("/owner/home") : goPrev())} type="button">
              <ChevronLeft size={18} />
              Back
            </button>

            <div className="eg-header-info">
              <h1>Register Gym</h1>
              <span className="eg-changes-indicator">
                <span className="eg-dot"></span>
                Step {Math.max(1, currentIndex + 1)} / {tabs.length}
              </span>
            </div>
          </div>

          <div className="eg-header-actions">
            <Link className="eg-btn-secondary" to="/owner/home">
              Cancel
            </Link>

            {activeTab !== "review" ? (
              <button className="eg-btn-primary" onClick={goNext} type="button" disabled={submitting || uploading}>
                Continue <ArrowRight size={18} />
              </button>
            ) : (
              <button className="eg-btn-primary" onClick={submit} type="button" disabled={submitting || uploading}>
                {submitting ? (
                  <>
                    <div className="eg-btn-spinner"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Submit Gym
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="eg-tabs">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.key} className={`eg-tab ${activeTab === t.key ? "active" : ""}`} onClick={() => setActiveTab(t.key)} type="button">
                <Icon size={18} />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="eg-content">
          {activeTab === "basic" && (
            <div className="eg-tab-content">
              <div className="eg-section">
                <h2>Gym Information</h2>

                <div className="eg-field">
                  <label>Gym Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    className={errors.name ? "error" : ""}
                    placeholder="Enter your gym name"
                  />
                  {errors.name && <span className="eg-error">{errors.name}</span>}
                </div>

                <div className="eg-field">
                  <label>Description *</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setField("description", e.target.value)}
                    rows={5}
                    className={errors.description ? "error" : ""}
                    placeholder="Describe your gym — equipment, vibe, community..."
                  />
                  <span className="eg-char-count">{String(form.description || "").length} / 800</span>
                  {errors.description && <span className="eg-error">{errors.description}</span>}
                </div>

                <div className="eg-field">
                  <label>Gym Type</label>
                  <select value={form.gym_type || ""} onChange={(e) => setField("gym_type", e.target.value)}>
                    {GYM_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>

                  {!!form.gym_type && (
                    <div className="eg-media-helper" style={{ marginTop: 6 }}>
                      Selected: <b>{form.gym_type}</b>
                    </div>
                  )}
                </div>

                <div className="eg-row-2" style={{ marginTop: 6 }}>
                  <label className="eg-check" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input type="checkbox" checked={!!form.has_personal_trainers} onChange={setBool("has_personal_trainers")} />
                    Has personal trainers
                  </label>

                  <label className="eg-check" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input type="checkbox" checked={!!form.has_classes} onChange={setBool("has_classes")} />
                    Has classes
                  </label>
                </div>

                <div className="eg-row-2" style={{ marginTop: 6 }}>
                  <label className="eg-check" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input type="checkbox" checked={!!form.is_24_hours} onChange={setBool("is_24_hours")} />
                    24 hours
                  </label>

                  <label className="eg-check" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input type="checkbox" checked={!!form.is_airconditioned} onChange={setBool("is_airconditioned")} />
                    Airconditioned
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === "location" && (
            <div className="eg-tab-content">
              <div className="eg-section">
                <h2>
                  <MapPin size={20} /> Location Details (Pasig only)
                </h2>

                {!hasPinnedLocation && (
                  <div
                    className="eg-pin-warning"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "12px 14px",
                      borderRadius: 14,
                      border: "1px solid rgba(255,140,0,0.35)",
                      background: "rgba(255,140,0,0.10)",
                      marginTop: 10,
                      marginBottom: 12,
                    }}
                  >
                    <AlertTriangle size={18} style={{ marginTop: 1 }} />
                    <div>
                      <div style={{ fontWeight: 900 }}>Pinpoint required</div>
                      <div style={{ opacity: 0.85, fontSize: 13 }}>
                        Please drop the marker inside Pasig City only so users can find you correctly.
                      </div>
                    </div>
                  </div>
                )}

                {outsideWarning && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "12px 14px",
                      borderRadius: 14,
                      border: "1px solid rgba(255,90,90,0.40)",
                      background: "rgba(255,90,90,0.10)",
                      marginTop: 10,
                      marginBottom: 12,
                    }}
                  >
                    <AlertTriangle size={18} style={{ marginTop: 1 }} />
                    <div>
                      <div style={{ fontWeight: 900 }}>Outside Pasig City</div>
                      <div style={{ opacity: 0.85, fontSize: 13 }}>Please choose a location inside Pasig City only.</div>
                    </div>
                  </div>
                )}

                <div className="eg-field" style={{ position: "relative", marginBottom: 12, zIndex: 999 }}>
                  <label>Street Address *</label>

                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => {
                      setField("address", e.target.value);
                      setAddressOpen(true);
                      setAddressActiveIndex(-1);
                    }}
                    onFocus={() => setAddressOpen(true)}
                    onBlur={() => {
                      setTimeout(() => setAddressOpen(false), 150);
                    }}
                    onKeyDown={(e) => {
                      if (!addressOpen || addressSuggestions.length === 0) return;

                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setAddressActiveIndex((i) => Math.min(i + 1, addressSuggestions.length - 1));
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setAddressActiveIndex((i) => Math.max(i - 1, 0));
                      } else if (e.key === "Enter") {
                        e.preventDefault();
                        const pick = addressSuggestions[addressActiveIndex] || addressSuggestions[0];
                        if (pick) applyAddressPick(pick);
                        setAddressOpen(false);
                      } else if (e.key === "Escape") {
                        setAddressOpen(false);
                      }
                    }}
                    className={errors.address ? "error" : ""}
                    placeholder="Search address..."
                  />

                  {errors.address && <span className="eg-error">{errors.address}</span>}
                  {errors.location && <span className="eg-error">{errors.location}</span>}

                  {addressOpen && geoLoading && <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>Searching addresses...</div>}
                  {addressOpen && geoErr && <div style={{ marginTop: 6, fontSize: 12, color: "#ff6b6b" }}>{geoErr}</div>}

                  {addressOpen && addressSuggestions.length > 0 && (
                    <div
                      className="eg-address-dropdown"
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        marginTop: 6,
                        borderRadius: 12,
                        border: "1px solid rgba(0,0,0,0.10)",
                        background: "#ffffff",
                        color: "#111",
                        overflow: "hidden",
                        zIndex: 999,
                        boxShadow: "0 18px 50px rgba(0,0,0,0.18)",
                      }}
                    >
                      {addressSuggestions.map((s, idx) => {
                        const active = idx === addressActiveIndex;
                        return (
                          <button
                            key={s.key}
                            type="button"
                            onMouseDown={(ev) => ev.preventDefault()}
                            onClick={() => {
                              applyAddressPick(s);
                              setAddressOpen(false);
                            }}
                            onMouseEnter={() => setAddressActiveIndex(idx)}
                            style={{
                              width: "100%",
                              textAlign: "left",
                              padding: "10px 12px",
                              background: active ? "rgba(255,140,0,0.12)" : "transparent",
                              border: "none",
                              color: "#111",
                              cursor: "pointer",
                              outline: "none",
                              WebkitAppearance: "none",
                            }}
                          >
                            <div style={{ fontWeight: 900, fontSize: 13, color: "#111" }}>{s.address}</div>
                            <div style={{ fontSize: 12, color: "rgba(0,0,0,0.60)" }}>
                              {s.label ? `${s.label} • ` : ""}
                              {s.city || "—"} • {Number(s.latitude).toFixed(6)}, {Number(s.longitude).toFixed(6)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="eg-row-2">
                  <div className="eg-field">
                    <label>City *</label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => setField("city", e.target.value)}
                      className={errors.city ? "error" : ""}
                      placeholder="Pasig City"
                    />
                    {errors.city && <span className="eg-error">{errors.city}</span>}
                  </div>

                  <div className="eg-field">
                    <label>Landmark</label>
                    <input type="text" value={form.landmark} onChange={(e) => setField("landmark", e.target.value)} placeholder="Near landmark (optional)" />
                  </div>
                </div>

                <div className="eg-row-2">
                  <div className="eg-field">
                    <label>Latitude</label>
                    <input type="text" value={form.latitude} readOnly />
                  </div>
                  <div className="eg-field">
                    <label>Longitude</label>
                    <input type="text" value={form.longitude} readOnly />
                  </div>
                </div>

                <div className="eg-media-helper" style={{ marginTop: 10 }}>
                  Tip: Click on the map to set the marker. Pin must be inside Pasig City.
                </div>

                <div style={{ marginTop: 12, borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <MapContainer center={mapCenter} zoom={15} style={{ height: 360, width: "100%" }}>
                    <Recenter center={mapCenter} />
                    <MapClick onPick={onMapPick} />
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Polygon
                      positions={PASIG_POLYGON_LATLNG}
                      pathOptions={{
                        color: "#ff8c00",
                        weight: 2,
                        opacity: 0.9,
                        fillColor: "#ff8c00",
                        fillOpacity: 0.08,
                      }}
                    />
                    {(markerPos || mapCenter) && (
                      <Marker
                        position={markerPos || mapCenter}
                        draggable
                        eventHandlers={{
                          dragend: onMapDragEnd,
                        }}
                      />
                    )}
                  </MapContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === "hours" && (
            <div className="eg-tab-content">
              <div className="eg-section">
                <h2>
                  <Clock size={20} /> Operating Hours
                </h2>

                <div className="eg-row-2" style={{ marginTop: 10 }}>
                  <div className="eg-field">
                    <label>Opening Time *</label>
                    <input type="time" value={String(form.opening_time || "06:00")} onChange={(e) => setField("opening_time", e.target.value)} className={errors.opening_time ? "error" : ""} />
                    {errors.opening_time && <span className="eg-error">{errors.opening_time}</span>}
                  </div>

                  <div className="eg-field">
                    <label>Closing Time *</label>
                    <input type="time" value={String(form.closing_time || "22:00")} onChange={(e) => setField("closing_time", e.target.value)} className={errors.closing_time ? "error" : ""} />
                    {errors.closing_time && <span className="eg-error">{errors.closing_time}</span>}
                  </div>
                </div>

                <div className="eg-media-helper" style={{ marginTop: 10 }}>
                  Tip: If you have different hours per day, you can update later in Edit Gym.
                </div>
              </div>
            </div>
          )}

          {activeTab === "pricing" && (
            <div className="eg-tab-content">
              <div className="eg-section">
                <h2>
                  <DollarSign size={20} /> Membership Pricing
                </h2>

                <div className="eg-pricing-grid">
                  <div className="eg-price-card">
                    <label>Daily Price</label>
                    <div className="eg-price-input">
                      <span className="eg-currency">₱</span>
                      <input
                        type="number"
                        value={form.daily_price}
                        onChange={(e) => setField("daily_price", e.target.value)}
                        placeholder="150"
                        className={errors.daily_price ? "error" : ""}
                        min="0"
                      />
                    </div>
                    {errors.daily_price && <span className="eg-error">{errors.daily_price}</span>}
                  </div>

                  <div className="eg-price-card featured">
                    <div className="eg-popular-badge">Required</div>
                    <label>Monthly Price *</label>
                    <div className="eg-price-input">
                      <span className="eg-currency">₱</span>
                      <input
                        type="number"
                        value={form.monthly_price}
                        onChange={(e) => setField("monthly_price", e.target.value)}
                        placeholder="2500"
                        className={errors.monthly_price ? "error" : ""}
                        min="0"
                      />
                    </div>
                    {errors.monthly_price && <span className="eg-error">{errors.monthly_price}</span>}
                  </div>

                  <div className="eg-price-card">
                    <label>Annual Price</label>
                    <div className="eg-price-input">
                      <span className="eg-currency">₱</span>
                      <input
                        type="number"
                        value={form.annual_price}
                        onChange={(e) => setField("annual_price", e.target.value)}
                        placeholder="12000"
                        className={errors.annual_price ? "error" : ""}
                        min="0"
                      />
                    </div>
                    {errors.annual_price && <span className="eg-error">{errors.annual_price}</span>}
                  </div>
                </div>

                <div className="eg-media-helper" style={{ marginTop: 10 }}>
                  Note: Prices must be non-negative numbers.
                </div>
              </div>
            </div>
          )}

          {activeTab === "contact" && (
            <div className="eg-tab-content">
              <div className="eg-section">
                <h2>
                  <Globe size={20} /> Contact + Social
                </h2>

                <div className="eg-row-2">
                  <div className="eg-field">
                    <label>Phone Number *</label>
                    <div className="eg-input-icon">
                      <Phone size={18} />
                      <input
                        type="text"
                        value={form.contact_number}
                        onChange={(e) => setField("contact_number", e.target.value)}
                        className={errors.contact_number ? "error" : ""}
                        placeholder="09XX XXX XXXX"
                      />
                    </div>
                    {errors.contact_number && <span className="eg-error">{errors.contact_number}</span>}
                  </div>

                  <div className="eg-field">
                    <label>Email Address</label>
                    <div className="eg-input-icon">
                      <Mail size={18} />
                      <input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} className={errors.email ? "error" : ""} placeholder="gym@email.com" />
                    </div>
                    {errors.email && <span className="eg-error">{errors.email}</span>}
                  </div>
                </div>

                <div className="eg-field">
                  <label>Website</label>
                  <div className="eg-input-icon">
                    <Globe size={18} />
                    <input type="text" value={form.website} onChange={(e) => setField("website", e.target.value)} className={errors.website ? "error" : ""} placeholder="www.yourgym.com" />
                  </div>
                  {errors.website && <span className="eg-error">{errors.website}</span>}
                  {normalizeUrlNullable(form.website) && (
                    <div style={{ marginTop: 6, fontSize: 12 }}>
                      <a href={normalizeUrlNullable(form.website)} target="_blank" rel="noreferrer" style={{ color: "rgba(255,140,0,0.95)", fontWeight: 800 }}>
                        Open website
                      </a>
                    </div>
                  )}
                </div>

                <div className="eg-row-2">
                  <div className="eg-field">
                    <label>Facebook Page</label>
                    <input type="text" value={form.facebook_page} onChange={(e) => setField("facebook_page", e.target.value)} className={errors.facebook_page ? "error" : ""} placeholder="facebook.com/yourgym" />
                    {errors.facebook_page && <span className="eg-error">{errors.facebook_page}</span>}
                    {normalizeUrlNullable(form.facebook_page) && (
                      <div style={{ marginTop: 6, fontSize: 12 }}>
                        <a href={normalizeUrlNullable(form.facebook_page)} target="_blank" rel="noreferrer" style={{ color: "rgba(255,140,0,0.95)", fontWeight: 800 }}>
                          Open Facebook
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="eg-field">
                    <label>Instagram Page</label>
                    <input type="text" value={form.instagram_page} onChange={(e) => setField("instagram_page", e.target.value)} className={errors.instagram_page ? "error" : ""} placeholder="instagram.com/yourgym" />
                    {errors.instagram_page && <span className="eg-error">{errors.instagram_page}</span>}
                    {normalizeUrlNullable(form.instagram_page) && (
                      <div style={{ marginTop: 6, fontSize: 12 }}>
                        <a href={normalizeUrlNullable(form.instagram_page)} target="_blank" rel="noreferrer" style={{ color: "rgba(255,140,0,0.95)", fontWeight: 800 }}>
                          Open Instagram
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "media" && (
            <div className="eg-tab-content">
              <div className="eg-section">
                <h2>
                  <ImageIcon size={20} /> Gym Photos
                </h2>

                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={onFileChange} style={{ display: "none" }} />

                {errors.media && (
                  <div className="eg-pin-warning" style={{ marginTop: 10, marginBottom: 10 }}>
                    {errors.media}
                  </div>
                )}

                <div className="eg-photos-modern">
                  {photos.map((photo, i) => (
                    <div key={i} className="eg-photo-card">
                      <img
                        src={photo}
                        alt=""
                        onError={(e) => {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80";
                        }}
                      />
                      <div className="eg-photo-overlay">
                        <button className="eg-photo-delete" onClick={() => removePhotoAt(i)} type="button" title="Remove photo">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}

                  <button className="eg-photo-upload-modern" type="button" onClick={onClickUpload} disabled={uploading || submitting}>
                    <Upload size={32} />
                    <span>{uploading ? "Uploading..." : "Upload Photos"}</span>
                    <small>JPG, PNG up to 10MB</small>
                  </button>
                </div>

                <div className="eg-section" style={{ marginTop: 16 }}>
                  <h2>Photo URLs (manual)</h2>

                  <div className="eg-field">
                    <label>Main Image URL</label>
                    <input type="text" value={form.main_image_url || ""} readOnly placeholder="/storage/... or https://..." />
                    <div className="eg-media-helper" style={{ marginTop: 6 }}>
                      Read-only. Upload photos above to update.
                    </div>
                  </div>

                  <div className="eg-field">
                    <label>Gallery URLs (one per line)</label>
                    <textarea rows={5} value={(Array.isArray(form.gallery_urls) ? form.gallery_urls : []).join("\n")} readOnly placeholder={"/storage/...\nhttps://...\nhttps://..."} />
                    <div className="eg-media-helper" style={{ marginTop: 6 }}>
                      Read-only. Upload photos above to update.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "review" && (
            <div className="eg-tab-content">
              <div className="eg-section">
                <h2>
                  <CheckCircle2 size={20} /> Review & Submit
                </h2>

                <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                  {[
                    {
                      title: "Gym Details",
                      rows: [
                        ["Gym Name", form.name],
                        ["Type", form.gym_type || "—"],
                        ["Description", form.description],
                        ["Features", featureLabel],
                      ],
                    },
                    {
                      title: "Location",
                      rows: [
                        ["Address", reviewAddress || "—"],
                        ["Coordinates", `${Number(toFloatOrNull(form.latitude) || 0).toFixed(6)}, ${Number(toFloatOrNull(form.longitude) || 0).toFixed(6)}`],
                      ],
                    },
                    {
                      title: "Hours + Pricing",
                      rows: [
                        ["Hours", `${form.opening_time || "—"} — ${form.closing_time || "—"}`],
                        ["Pricing", `Day ₱${form.daily_price || 0} | Monthly ₱${form.monthly_price || 0} | Annual ₱${form.annual_price || 0}`],
                      ],
                    },
                    {
                      title: "Contact & Links",
                      rows: [
                        ["Contact", normalizePhone(form.contact_number) || "—"],
                        ["Email", form.email || "—"],
                        ["Website", normalizeUrlNullable(form.website) || "—"],
                        ["Facebook", normalizeUrlNullable(form.facebook_page) || "—"],
                        ["Instagram", normalizeUrlNullable(form.instagram_page) || "—"],
                      ],
                    },
                    {
                      title: "Media",
                      rows: [
                        ["Photos", `${rawPhotos.length} photo(s)`],
                        ["Main Image", form.main_image_url ? "Yes" : "Auto (first)"],
                      ],
                    },
                  ].map((card) => (
                    <div
                      key={card.title}
                      style={{
                        borderRadius: 14,
                        border: "1px solid rgba(0,0,0,0.08)",
                        background: "rgba(255,255,255,0.92)",
                        padding: "12px 14px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                        <div style={{ fontWeight: 950 }}>{card.title}</div>
                        <button
                          type="button"
                          className="eg-btn-secondary"
                          onClick={() => {
                            const map = {
                              "Gym Details": "basic",
                              Location: "location",
                              "Hours + Pricing": "hours",
                              "Contact & Links": "contact",
                              Media: "media",
                            };
                            setActiveTab(map[card.title] || "basic");
                          }}
                          style={{ padding: "8px 10px" }}
                        >
                          Edit
                        </button>
                      </div>

                      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                        {card.rows.map(([k, v]) => (
                          <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                            <div style={{ opacity: 0.72, fontWeight: 800 }}>{k}</div>
                            <div style={{ fontWeight: 900, textAlign: "right" }}>{v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "12px 14px",
                      borderRadius: 14,
                      border: "1px solid rgba(255,140,0,0.35)",
                      background: "rgba(255,140,0,0.10)",
                      marginTop: 2,
                    }}
                  >
                    <CheckCircle2 size={18} style={{ marginTop: 1 }} />
                    <div>
                      <div style={{ fontWeight: 950 }}>Confirmation</div>
                      <div style={{ opacity: 0.85, fontSize: 13 }}>By submitting, you confirm that all information provided is accurate and complete.</div>
                    </div>
                  </div>

                  <button className="eg-btn-primary" type="button" onClick={submit} disabled={submitting || uploading} style={{ marginTop: 4 }}>
                    {submitting ? (
                      <>
                        <div className="eg-btn-spinner"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        Submit Gym
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}