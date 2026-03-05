import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "./Header2";
import Footer from "../user/Footer";
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
} from "lucide-react";
import Swal from "sweetalert2";

import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { getGym, updateGym, uploadMedia, getMyGyms } from "../../utils/ownerGymApi";
import { ownerSetFreeVisitEnabled } from "../../utils/gymFreeVisitApi";

const API_BASE = "https://exersearch.test";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function absUrl(u) {
  if (!u) return "";
  const s = String(u).trim();
  if (!s) return "";
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("//")) return `https:${s}`;
  if (s.startsWith("/")) return `${API_BASE}${s}`;
  return s;
}

function hhmm(v, fallback = "06:00") {
  if (v == null || v === "") return fallback;

  const s = String(v).trim();
  if (!s) return fallback;

  let m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (m) {
    const h = String(Math.min(23, Math.max(0, Number(m[1])))).padStart(2, "0");
    const min = String(Math.min(59, Math.max(0, Number(m[2])))).padStart(2, "0");
    return `${h}:${min}`;
  }

  m = s.match(/^(\d{1,2}):(\d{2})\s*([aApP][mM])$/);
  if (m) {
    let h = Number(m[1]);
    const min = Number(m[2]);
    const ap = m[3].toUpperCase();

    if (ap === "PM" && h < 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;

    const hh = String(Math.min(23, Math.max(0, h))).padStart(2, "0");
    const mm = String(Math.min(59, Math.max(0, min))).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  return fallback;
}

function hhmmss(v, fallback = "06:00:00") {
  const base = hhmm(v, fallback.slice(0, 5));
  return `${base}:00`;
}

function toNumberOrNull(v) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toFloatOrNull(v) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeGymId(g) {
  return g?.gym_id ?? g?.id ?? null;
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

function extractCause(err) {
  const d = err?.response?.data;
  const top = (typeof d === "string" && d) || d?.message || err?.message || "Something went wrong.";
  let firstField = "";
  if (d?.errors && typeof d.errors === "object") {
    const k = Object.keys(d.errors)[0];
    const v = d.errors[k];
    if (Array.isArray(v) && v.length) firstField = `${k}: ${v[0]}`;
    else if (v) firstField = `${k}: ${String(v)}`;
  }
  let debugBits = "";
  if (d?.debug?.upload_error_code != null) debugBits = ` (upload_error_code=${d.debug.upload_error_code})`;
  return firstField ? `${top}\n${firstField}${debugBits}` : `${top}${debugBits}`;
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

export default function EditGym() {
  const { id } = useParams();
  const navigate = useNavigate();

  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [errors, setErrors] = useState({});

  const [freeVisitSaving, setFreeVisitSaving] = useState(false);

  const [form, setForm] = useState({
    gym_id: null,
    name: "",
    description: "",
    address: "",
    city: "",
    contact_number: "",
    email: "",
    website: "",
    facebook_page: "",
    instagram_page: "",
    opening_time: "06:00",
    closing_time: "22:00",
    daily_price: "",
    monthly_price: "",
    annual_price: "",
    gym_type: "",
    main_image_url: "",
    gallery_urls: [],
    latitude: "",
    longitude: "",
    has_personal_trainers: false,
    has_classes: false,
    is_24_hours: false,
    is_airconditioned: false,
    free_first_visit_enabled: false,
  });

  const [mapCenter, setMapCenter] = useState({ lat: 14.5764, lng: 121.0851 });
  const [mapZoom] = useState(15);

  const [addressOpen, setAddressOpen] = useState(false);
  const [addressActiveIndex, setAddressActiveIndex] = useState(-1);
  const [myGyms, setMyGyms] = useState([]);

  const [geoSuggestions, setGeoSuggestions] = useState([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoErr, setGeoErr] = useState("");

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

  const rawPhotos = useMemo(() => {
    return [form.main_image_url || null, ...(Array.isArray(form.gallery_urls) ? form.gallery_urls : [])].filter(Boolean);
  }, [form.main_image_url, form.gallery_urls]);

  const photos = useMemo(() => {
    const display = rawPhotos.map(absUrl).filter(Boolean);
    return display.length ? display : ["https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80"];
  }, [rawPhotos]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (typeof getMyGyms !== "function") return;
        const res = await getMyGyms(1);
        const data = res?.data ?? res;
        const rows = data?.data ?? data?.gyms ?? data ?? [];
        if (!alive) return;
        setMyGyms(Array.isArray(rows) ? rows : []);
      } catch (e) {
        if (!alive) return;
        setMyGyms([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

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

            const city = x.address?.city || x.address?.town || x.address?.village || x.address?.municipality || x.address?.state || "";

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

  const suggestionPool = useMemo(() => {
    const list = [];

    for (const g of geoSuggestions) list.push(g);

    {
      const lat = toFloatOrNull(form.latitude);
      const lng = toFloatOrNull(form.longitude);
      if (lat != null && lng != null && String(form.address || "").trim()) {
        list.push({
          key: `current-${lat}-${lng}`,
          address: String(form.address || ""),
          city: String(form.city || ""),
          latitude: lat,
          longitude: lng,
          label: "Current location",
        });
      }
    }

    for (const g of myGyms) {
      const lat = toFloatOrNull(g?.latitude);
      const lng = toFloatOrNull(g?.longitude);
      const addr = String(g?.address || "").trim();
      if (lat == null || lng == null || !addr) continue;

      list.push({
        key: `gym-${normalizeGymId(g) ?? g?.id ?? addr}-${lat}-${lng}`,
        address: addr,
        city: String(g?.city || "").trim(),
        latitude: lat,
        longitude: lng,
        label: String(g?.name || "Gym"),
      });
    }

    return list;
  }, [geoSuggestions, form.address, form.city, form.latitude, form.longitude, myGyms]);

  const addressSuggestions = useMemo(() => {
    const q = String(form.address || "").trim().toLowerCase();
    if (!q) return [];

    const filtered = suggestionPool.filter((x) => {
      const a = String(x.address || "").toLowerCase();
      const c = String(x.city || "").toLowerCase();
      const l = String(x.label || "").toLowerCase();
      return a.includes(q) || c.includes(q) || l.includes(q);
    });

    return filtered.slice(0, 8);
  }, [form.address, suggestionPool]);

  const applyAddressPick = (pick) => {
    setForm((prev) => ({
      ...prev,
      address: pick.address || prev.address,
      city: pick.city || prev.city,
      latitude: String(pick.latitude),
      longitude: String(pick.longitude),
    }));
    setHasChanges(true);
    setErrors((prev) => ({ ...prev, address: "", location: "" }));
    setMapCenter({ lat: pick.latitude, lng: pick.longitude });
  };

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const res = await getGym(id);
        const g = res?.data ?? res;

        const opening = hhmm(g?.opening_time, "06:00");
        const closing = hhmm(g?.closing_time, "22:00");

        const lat = g?.latitude ?? "";
        const lng = g?.longitude ?? "";

        const mapped = {
          gym_id: normalizeGymId(g) ?? Number(id),
          name: g?.name ?? "",
          description: g?.description ?? "",
          address: g?.address ?? "",
          city: g?.city ?? "",
          contact_number: g?.contact_number ?? "",
          email: g?.email ?? "",
          website: g?.website ?? "",
          facebook_page: g?.facebook_page ?? "",
          instagram_page: g?.instagram_page ?? "",
          opening_time: opening,
          closing_time: closing,
          daily_price: g?.daily_price ?? "",
          monthly_price: g?.monthly_price ?? "",
          annual_price: g?.annual_price ?? "",
          gym_type: g?.gym_type ?? "",
          main_image_url: g?.main_image_url ?? "",
          gallery_urls: Array.isArray(g?.gallery_urls) ? g.gallery_urls : [],
          latitude: lat === null ? "" : String(lat),
          longitude: lng === null ? "" : String(lng),
          has_personal_trainers: Boolean(g?.has_personal_trainers),
          has_classes: Boolean(g?.has_classes),
          is_24_hours: Boolean(g?.is_24_hours),
          is_airconditioned: Boolean(g?.is_airconditioned),
          free_first_visit_enabled: Boolean(g?.free_first_visit_enabled),
        };

        if (!alive) return;
        setForm(mapped);
        setHasChanges(false);
        setErrors({});

        const nlat = toFloatOrNull(mapped.latitude);
        const nlng = toFloatOrNull(mapped.longitude);
        if (nlat != null && nlng != null) setMapCenter({ lat: nlat, lng: nlng });
      } catch (e) {
        if (!alive) return;
        console.error(e);
        Swal.fire({ icon: "error", title: "Failed to load gym", text: extractCause(e) });
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const setBool = (field) => (e) => {
    const v = !!e.target.checked;
    setForm((prev) => ({ ...prev, [field]: v }));
    setHasChanges(true);
  };

  const goBackToView = () => navigate(`/owner/view-gym/${id}`);

  const validateBeforeSave = () => {
    const newErrors = {};

    if (!String(form.name || "").trim()) newErrors.name = "Gym name is required";
    if (!String(form.address || "").trim()) newErrors.address = "Address is required";
    if (!String(form.contact_number || "").trim()) newErrors.contact_number = "Contact number is required";

    if (!isValidEmail(form.email)) newErrors.email = "Please enter a valid email (e.g., gym@email.com)";

    if (!isValidUrlNullable(form.website)) newErrors.website = "Please enter a valid website URL (e.g., www.site.com)";
    if (!isValidUrlNullable(form.facebook_page)) newErrors.facebook_page = "Please enter a valid Facebook page URL";
    if (!isValidUrlNullable(form.instagram_page)) newErrors.instagram_page = "Please enter a valid Instagram page URL";

    const lat = toFloatOrNull(form.latitude);
    const lng = toFloatOrNull(form.longitude);
    if (lat == null || lng == null) newErrors.location = "Please pinpoint your gym on the map.";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      if (
        newErrors.name ||
        newErrors.contact_number ||
        newErrors.email ||
        newErrors.website ||
        newErrors.facebook_page ||
        newErrors.instagram_page
      )
        setActiveTab("basic");
      else if (newErrors.address || newErrors.location) setActiveTab("location");
      Swal.fire({ icon: "warning", title: "Fix highlighted fields", text: "Some inputs are invalid." });
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateBeforeSave()) return;

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        address: form.address,
        city: form.city,
        contact_number: form.contact_number,
        email: String(form.email || "").trim() || null,
        website: normalizeUrlNullable(form.website),
        facebook_page: normalizeUrlNullable(form.facebook_page),
        instagram_page: normalizeUrlNullable(form.instagram_page),
        gym_type: String(form.gym_type || "").trim() || null,
        opening_time: hhmmss(form.opening_time, "06:00:00"),
        closing_time: hhmmss(form.closing_time, "22:00:00"),
        has_personal_trainers: !!form.has_personal_trainers,
        has_classes: !!form.has_classes,
        is_24_hours: !!form.is_24_hours,
        is_airconditioned: !!form.is_airconditioned,
        monthly_price: toNumberOrNull(form.monthly_price),
        annual_price: toNumberOrNull(form.annual_price),
        main_image_url: form.main_image_url || null,
        gallery_urls: Array.isArray(form.gallery_urls) ? form.gallery_urls : [],
        latitude: toFloatOrNull(form.latitude),
        longitude: toFloatOrNull(form.longitude),
      };

      await updateGym(id, payload);

      setHasChanges(false);

      const notification = document.createElement("div");
      notification.className = "eg-success-toast";
      notification.innerHTML =
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg><span>Changes saved successfully!</span>';
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
    } catch (e) {
      console.error(e);
      Swal.fire({ icon: "error", title: "Save failed", text: extractCause(e) });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (window.confirm("You have unsaved changes. Are you sure you want to leave?")) goBackToView();
      return;
    }
    goBackToView();
  };

  const handleToggleFreeVisit = async (enabled) => {
    if (!id) return;
    const next = Boolean(enabled);
    setFreeVisitSaving(true);

    const prev = Boolean(form.free_first_visit_enabled);
    setForm((p) => ({ ...p, free_first_visit_enabled: next }));

    try {
      await ownerSetFreeVisitEnabled(id, next);
      Swal.fire({
        icon: "success",
        title: "Updated",
        text: next ? "Free first visit is enabled." : "Free first visit is disabled.",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (e) {
      setForm((p) => ({ ...p, free_first_visit_enabled: prev }));
      Swal.fire({ icon: "error", title: "Failed to update", text: extractCause(e) });
    } finally {
      setFreeVisitSaving(false);
    }
  };

  const removePhotoAt = (idx) => {
    const list = [...rawPhotos];
    list.splice(idx, 1);
    const main = list[0] || "";
    const gallery = list.slice(1);
    setForm((prev) => ({ ...prev, main_image_url: main, gallery_urls: gallery }));
    setHasChanges(true);
  };

  const onClickUpload = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const onFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    setUploading(true);
    try {
      const uploadedUrls = [];

      for (const file of files) {
        const data = await uploadMedia({ file, type: "gyms", kind: "gallery" });
        const url = data?.url || data?.path || data?.data?.url || data?.data?.path;
        if (!url) throw new Error("Upload succeeded but server returned no url.");
        uploadedUrls.push(String(url));
      }

      if (uploadedUrls.length) {
        setForm((prev) => {
          const currentRaw = [prev.main_image_url || null, ...(Array.isArray(prev.gallery_urls) ? prev.gallery_urls : [])].filter(Boolean);
          const merged = [...currentRaw, ...uploadedUrls];
          return { ...prev, main_image_url: merged[0] || "", gallery_urls: merged.slice(1) };
        });
        setHasChanges(true);
      }
    } catch (err) {
      console.error(err);
      Swal.fire({ icon: "error", title: "Upload failed", text: extractCause(err) });
    } finally {
      setUploading(false);
    }
  };

  const onMapDragEnd = (e) => {
    const ll = e.target.getLatLng();
    setField("latitude", String(ll.lat));
    setField("longitude", String(ll.lng));
    setMapCenter({ lat: ll.lat, lng: ll.lng });
    setErrors((prev) => ({ ...prev, location: "" }));
  };

  const onMapPick = (ll) => {
    setField("latitude", String(ll.lat));
    setField("longitude", String(ll.lng));
    setMapCenter({ lat: ll.lat, lng: ll.lng });
    setErrors((prev) => ({ ...prev, location: "" }));
  };

  if (loading) {
    return (
      <div className="eg-app">
        <Header />
        <div className="eg-loading">
          <div className="eg-spinner"></div>
          <p>Loading gym details...</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="eg-app">
      <Header />

      <div className="eg-container">
        <div className="eg-sticky-header">
          <div className="eg-header-content">
            <button className="eg-back-btn" onClick={handleCancel} type="button">
              <ChevronLeft size={18} />
              Back
            </button>

            <div className="eg-header-info">
              <h1>Edit Gym</h1>
              {hasChanges && (
                <span className="eg-changes-indicator">
                  <span className="eg-dot"></span>
                  Unsaved changes
                </span>
              )}
            </div>
          </div>

          <div className="eg-header-actions">
            <button className="eg-btn-secondary" onClick={handleCancel} type="button">
              Cancel
            </button>
            <button className="eg-btn-primary" onClick={handleSave} disabled={!hasChanges || saving} type="button">
              {saving ? (
                <>
                  <div className="eg-btn-spinner"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>

        <div className="eg-tabs">
          <button className={`eg-tab ${activeTab === "basic" ? "active" : ""}`} onClick={() => setActiveTab("basic")} type="button">
            <Phone size={18} />
            Basic Info
          </button>

          <button className={`eg-tab ${activeTab === "location" ? "active" : ""}`} onClick={() => setActiveTab("location")} type="button">
            <MapPin size={18} />
            Location
          </button>

          <button className={`eg-tab ${activeTab === "hours" ? "active" : ""}`} onClick={() => setActiveTab("hours")} type="button">
            <Clock size={18} />
            Hours
          </button>

          <button className={`eg-tab ${activeTab === "pricing" ? "active" : ""}`} onClick={() => setActiveTab("pricing")} type="button">
            <DollarSign size={18} />
            Pricing
          </button>

          <button className={`eg-tab ${activeTab === "media" ? "active" : ""}`} onClick={() => setActiveTab("media")} type="button">
            <ImageIcon size={18} />
            Media
          </button>
        </div>

        <div className="eg-content">
          {activeTab === "basic" && (
            <div className="eg-tab-content">
              <div className="eg-section">
                <h2>Gym Information</h2>

                <div className="eg-field" style={{ marginTop: 14 }}>
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
                  <label>Description</label>
                  <textarea value={form.description} onChange={(e) => setField("description", e.target.value)} rows={5} placeholder="Describe your gym..." />
                  <span className="eg-char-count">{String(form.description || "").length} / 500</span>
                </div>

                <div className="eg-field">
                  <label>Gym Type</label>
                  <input type="text" value={form.gym_type} onChange={(e) => setField("gym_type", e.target.value)} placeholder="Boxing, Commercial, Crossfit..." />
                </div>
              </div>

              <div className="eg-section">
                <h2>Contact + Social</h2>

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
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setField("email", e.target.value)}
                        className={errors.email ? "error" : ""}
                        placeholder="gym@email.com"
                      />
                    </div>
                    {errors.email && <span className="eg-error">{errors.email}</span>}
                  </div>
                </div>

                <div className="eg-field">
                  <label>Website</label>
                  <div className="eg-input-icon">
                    <Globe size={18} />
                    <input
                      type="text"
                      value={form.website}
                      onChange={(e) => setField("website", e.target.value)}
                      className={errors.website ? "error" : ""}
                      placeholder="www.yourgym.com"
                    />
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
                    <input
                      type="text"
                      value={form.facebook_page}
                      onChange={(e) => setField("facebook_page", e.target.value)}
                      className={errors.facebook_page ? "error" : ""}
                      placeholder="facebook.com/yourgym"
                    />
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
                    <input
                      type="text"
                      value={form.instagram_page}
                      onChange={(e) => setField("instagram_page", e.target.value)}
                      className={errors.instagram_page ? "error" : ""}
                      placeholder="instagram.com/yourgym"
                    />
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
                  <MapPin size={20} /> Location Details
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
                        Please drop the marker on the exact gym location (or pick an address suggestion) so users can find you correctly.
                      </div>
                    </div>
                  </div>
                )}

                <div className="eg-field" style={{ position: "relative", marginBottom: 12, zIndex: 999 }}>
                  <label>Address *</label>

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
                            onMouseDown={(e) => e.preventDefault()}
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
                    <label>City</label>
                    <input type="text" value={form.city} onChange={(e) => setField("city", e.target.value)} placeholder="Quezon City" />
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
                  Tip: Pick an address suggestion to auto-fill coordinates and move the map. You can also click on the map to set the marker.
                </div>

                <div style={{ marginTop: 12, borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <MapContainer center={markerPos || mapCenter} zoom={mapZoom} style={{ height: 360, width: "100%" }}>
                    <Recenter center={markerPos || mapCenter} />
                    <MapClick onPick={onMapPick} />
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

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
                    <label>Opening Time</label>
                    <input type="time" value={hhmm(form.opening_time, "06:00")} onChange={(e) => setField("opening_time", e.target.value)} />
                  </div>

                  <div className="eg-field">
                    <label>Closing Time</label>
                    <input type="time" value={hhmm(form.closing_time, "22:00")} onChange={(e) => setField("closing_time", e.target.value)} />
                  </div>
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

                <div
                  style={{
                    marginTop: 12,
                    marginBottom: 24,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 14,
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: "1px solid rgba(210,63,11,0.18)",
                    background: "rgba(210,63,11,0.08)",
                  }}
                >
                  <div style={{ lineHeight: 1.15 }}>
                    <div style={{ fontWeight: 950, color: "#111" }}>Free First Visit</div>
                    <div style={{ fontSize: 12, fontWeight: 750, opacity: 0.85 }}>
                      {form.free_first_visit_enabled ? "Enabled" : "Disabled"}
                      {freeVisitSaving ? " • Saving..." : ""}
                    </div>
                  </div>

                  <label style={{ position: "relative", width: 56, height: 32, display: "inline-block" }}>
                    <input
                      type="checkbox"
                      checked={!!form.free_first_visit_enabled}
                      disabled={freeVisitSaving}
                      onChange={(e) => handleToggleFreeVisit(e.target.checked)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: 999,
                        background: form.free_first_visit_enabled ? "linear-gradient(180deg,#ff6b35,#d23f0b)" : "rgba(0,0,0,0.18)",
                        transition: "all 180ms ease",
                        boxShadow: form.free_first_visit_enabled ? "0 10px 18px rgba(210,63,11,0.22)" : "none",
                      }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        top: 4,
                        left: form.free_first_visit_enabled ? 28 : 4,
                        width: 24,
                        height: 24,
                        borderRadius: 999,
                        background: "#fff",
                        transition: "all 180ms ease",
                        boxShadow: "0 8px 16px rgba(0,0,0,0.18)",
                      }}
                    />
                  </label>
                </div>

                <div className="eg-pricing-grid">
                  <div className="eg-price-card">
                    <label>Daily Price</label>
                    <div className="eg-price-input">
                      <span className="eg-currency">₱</span>
                      <input type="number" value={form.daily_price} onChange={(e) => setField("daily_price", e.target.value)} placeholder="150" />
                    </div>
                    <div className="eg-media-helper" style={{ marginTop: 6 }}>
                      Disabled for now
                    </div>
                  </div>

                  <div className="eg-price-card featured">
                    <div className="eg-popular-badge">Most Popular</div>
                    <label>Monthly Price</label>
                    <div className="eg-price-input">
                      <span className="eg-currency">₱</span>
                      <input type="number" value={form.monthly_price} onChange={(e) => setField("monthly_price", e.target.value)} placeholder="2500" />
                    </div>
                  </div>

                  <div className="eg-price-card">
                    <label>Annual Price</label>
                    <div className="eg-price-input">
                      <span className="eg-currency">₱</span>
                      <input type="number" value={form.annual_price} onChange={(e) => setField("annual_price", e.target.value)} placeholder="12000" />
                    </div>
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

                  <button className="eg-photo-upload-modern" type="button" onClick={onClickUpload} disabled={uploading}>
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
        </div>
      </div>

    </div>
  );
}