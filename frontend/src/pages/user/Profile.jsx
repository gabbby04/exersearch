import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./Profilestyle.css";
import { alertSuccess, alertError, alertInfo } from "../../utils/adminAlert";
import { api } from "../../utils/apiClient";
import {
  User,
  Mail,
  MapPin,
  Ruler,
  Weight,
  Calendar,
  Pencil,
  Upload,
  X,
  Check,
  ChevronRight,
  Target,
  Activity,
  Wallet,
  Dumbbell,
  Building2,
  Camera,
  SlidersHorizontal,
  ImageUp,
} from "lucide-react";

const FALLBACK_AVATAR = "/arellano.png";
const MAIN = "#d23f0b";

function toNumOrNull(v) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function asArray(x) {
  return Array.isArray(x) ? x : [];
}

function pickPrefPayload(prefResData) {
  const root = prefResData?.preferences ?? prefResData?.data ?? prefResData ?? {};
  const goal = root?.goal ?? root?.Goal ?? "";
  const activity_level =
    root?.activity_level ??
    root?.activityLevel ??
    root?.activity ??
    root?.ActivityLevel ??
    "";
  const budget =
    root?.budget ?? root?.monthly_budget ?? root?.budget_monthly ?? root?.Budget ?? "";
  return { goal, activity_level, budget };
}

function absoluteUrlMaybe(pathOrUrl) {
  if (!pathOrUrl) return "";
  const s = String(pathOrUrl).trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;

  const base = String(api.defaults.baseURL || "").replace(/\/api\/v1\/?$/, "");
  const path = s.startsWith("/") ? s : `/${s}`;
  return `${base}${path}`;
}

function PrefModal({
  open,
  onClose,
  prefLoading,
  prefSaving,
  prefForm,
  setPrefForm,
  equipments,
  amenities,
  onSave,
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const toggleSelected = (kind, id) => {
    const n = Number(id);
    setPrefForm((prev) => {
      const next =
        kind === "equipment"
          ? new Set(prev.selectedEquipmentIds)
          : new Set(prev.selectedAmenityIds);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return {
        ...prev,
        ...(kind === "equipment"
          ? { selectedEquipmentIds: next }
          : { selectedAmenityIds: next }),
      };
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="modal-title">Edit Preferences</div>
            <div className="modal-subtitle">
              Goal · Activity · Budget · Equipment · Amenities
            </div>
          </div>
          <button
            className="btn-secondary"
            onClick={onClose}
            style={{ width: "auto", padding: "0.5rem 1.125rem" }}
          >
            <X size={16} /> Close
          </button>
        </div>

        <div className="modal-body">
          {prefLoading ? (
            <div
              style={{
                textAlign: "center",
                padding: "3rem",
                color: "var(--gray-500)",
                fontWeight: 700,
              }}
            >
              Loading…
            </div>
          ) : (
            <>
              <div className="modal-section-label">Main Preferences</div>
              <div className="modal-2col">
                <div>
                  <div className="modal-field-label">Goal</div>
                  <input
                    className="modal-input"
                    value={prefForm.goal}
                    onChange={(e) =>
                      setPrefForm((p) => ({ ...p, goal: e.target.value }))
                    }
                    placeholder="e.g. Build Muscle"
                  />
                </div>
                <div>
                  <div className="modal-field-label">Activity Level</div>
                  <input
                    className="modal-input"
                    value={prefForm.activity_level}
                    onChange={(e) =>
                      setPrefForm((p) => ({ ...p, activity_level: e.target.value }))
                    }
                    placeholder="e.g. Moderate"
                  />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div className="modal-field-label">Monthly Budget (₱)</div>
                  <input
                    className="modal-input"
                    value={prefForm.budget}
                    onChange={(e) =>
                      setPrefForm((p) => ({ ...p, budget: e.target.value }))
                    }
                    placeholder="e.g. 2500"
                  />
                </div>
              </div>

              <div className="modal-section-label">Preferred Equipment</div>
              <div className="modal-items-grid">
                {equipments.map((e) => {
                  const id = e.equipment_id ?? e.id;
                  const selected = prefForm.selectedEquipmentIds.has(Number(id));
                  return (
                    <div
                      key={id}
                      className={`modal-item ${selected ? "selected" : ""}`}
                      onClick={() => toggleSelected("equipment", id)}
                    >
                      <div className="modal-item-thumb">
                        {e.image_url ? (
                          <img
                            src={absoluteUrlMaybe(e.image_url)}
                            alt={e.name}
                            onError={(ev) => (ev.currentTarget.style.display = "none")}
                          />
                        ) : (
                          <Dumbbell size={14} />
                        )}
                      </div>
                      <span className="modal-item-name">
                        {e.name || `Equipment #${id}`}
                      </span>
                      <div className="modal-check">
                        {selected && <Check size={10} strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="modal-section-label">Preferred Amenities</div>
              <div className="modal-items-grid">
                {amenities.map((a) => {
                  const id = a.amenity_id ?? a.id;
                  const selected = prefForm.selectedAmenityIds.has(Number(id));
                  return (
                    <div
                      key={id}
                      className={`modal-item ${selected ? "selected" : ""}`}
                      onClick={() => toggleSelected("amenity", id)}
                    >
                      <div className="modal-item-thumb">
                        {a.image_url ? (
                          <img
                            src={absoluteUrlMaybe(a.image_url)}
                            alt={a.name}
                            onError={(ev) => (ev.currentTarget.style.display = "none")}
                          />
                        ) : (
                          <Building2 size={14} />
                        )}
                      </div>
                      <span className="modal-item-name">
                        {a.name || `Amenity #${id}`}
                      </span>
                      <div className="modal-check">
                        {selected && <Check size={10} strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-primary" onClick={onSave} disabled={prefSaving}>
            <Check size={16} /> {prefSaving ? "Saving..." : "Save Preferences"}
          </button>
          <button className="btn-secondary" onClick={onClose} disabled={prefSaving}>
            <X size={16} /> Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Profile() {
  const fileRef = useRef(null);
  const theme = localStorage.getItem("theme") || "light";
  const token = localStorage.getItem("token");

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [prefModalOpen, setPrefModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [localPreview, setLocalPreview] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const [userData, setUserData] = useState({
    name: "",
    email: "",
    role: "",
    age: "",
    height: "",
    weight: "",
    address: "",
    latitude: "",
    longitude: "",
    profile_photo_url: "",
    created_at: "",
    updated_at: "",
  });
  const [formData, setFormData] = useState({ ...userData });

  const [prefLoading, setPrefLoading] = useState(true);
  const [prefSaving, setPrefSaving] = useState(false);
  const [prefView, setPrefView] = useState({
    goal: "",
    activity_level: "",
    budget: "",
    preferred_equipments: [],
    preferred_amenities: [],
  });
  const [prefForm, setPrefForm] = useState({
    goal: "",
    activity_level: "",
    budget: "",
    selectedEquipmentIds: new Set(),
    selectedAmenityIds: new Set(),
  });
  const [equipments, setEquipments] = useState([]);
  const [amenities, setAmenities] = useState([]);

  const avatarSrc = useMemo(() => {
    if (localPreview) return localPreview;
    const raw =
      (isEditingProfile ? formData.profile_photo_url : userData.profile_photo_url) ||
      "";
    if (!raw) return FALLBACK_AVATAR;
    return absoluteUrlMaybe(raw) || FALLBACK_AVATAR;
  }, [localPreview, isEditingProfile, formData.profile_photo_url, userData.profile_photo_url]);

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  useEffect(() => {
    let mounted = true;

    async function loadMe() {
      setLoading(true);
      try {
        const res = await api.get("/me");
        const root = res.data?.user || res.data || {};
        const p = root?.user_profile || {};

        const next = {
          name: root?.name || "",
          email: root?.email || "",
          role: root?.role || "",
          age: p?.age ?? "",
          height: p?.height ?? "",
          weight: p?.weight ?? "",
          address: p?.address ?? "",
          latitude: p?.latitude ?? "",
          longitude: p?.longitude ?? "",
          profile_photo_url: p?.profile_photo_url ?? "",
          created_at: p?.created_at ? String(p.created_at).slice(0, 10) : "",
          updated_at: p?.updated_at ? String(p.updated_at).slice(0, 10) : "",
        };

        if (!mounted) return;
        setUserData(next);
        setFormData(next);
        setLocalPreview("");
        setSelectedFile(null);
      } catch (err) {
        alertError({
          title: "Failed to load profile",
          text: err?.response?.data?.message || "Something went wrong.",
          theme,
          mainColor: MAIN,
        });
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (token) loadMe();
    else {
      setLoading(false);
      alertInfo({
        title: "Session missing",
        text: "No token found. Please log in again.",
        theme,
        mainColor: MAIN,
      });
    }

    return () => {
      mounted = false;
    };
  }, [token, theme]);

  useEffect(() => {
    let mounted = true;

    async function loadPrefs() {
      setPrefLoading(true);
      try {
        const [prefRes, eqPickRes, amPickRes, allEqRes, allAmRes] = await Promise.all([
          api.get("/user/preferences"),
          api.get("/user/preferred-equipments"),
          api.get("/user/preferred-amenities"),
          api.get("/equipments"),
          api.get("/amenities"),
        ]);

        const { goal, activity_level, budget } = pickPrefPayload(prefRes.data);

        const preferredEquipments =
          eqPickRes.data?.preferred_equipments ??
          eqPickRes.data?.data ??
          eqPickRes.data ??
          [];
        const preferredAmenities =
          amPickRes.data?.preferred_amenities ??
          amPickRes.data?.data ??
          amPickRes.data ??
          [];

        const allEq = allEqRes.data?.data ?? allEqRes.data ?? [];
        const allAm = allAmRes.data?.data ?? allAmRes.data ?? [];

        const view = {
          goal: goal ?? "",
          activity_level: activity_level ?? "",
          budget: budget ?? "",
          preferred_equipments: asArray(preferredEquipments),
          preferred_amenities: asArray(preferredAmenities),
        };

        const selectedEquipmentIds = new Set(
          view.preferred_equipments
            .map((x) => x?.equipment_id ?? x?.id)
            .filter((v) => v != null)
            .map((v) => Number(v))
        );

        const selectedAmenityIds = new Set(
          view.preferred_amenities
            .map((x) => x?.amenity_id ?? x?.id)
            .filter((v) => v != null)
            .map((v) => Number(v))
        );

        if (!mounted) return;
        setPrefView(view);
        setEquipments(asArray(allEq));
        setAmenities(asArray(allAm));
        setPrefForm({
          goal: view.goal || "",
          activity_level: view.activity_level || "",
          budget: view.budget ?? "",
          selectedEquipmentIds,
          selectedAmenityIds,
        });
      } catch (err) {
        alertError({
          title: "Failed to load preferences",
          text: err?.response?.data?.message || "Could not fetch your preferences.",
          theme,
          mainColor: MAIN,
        });
      } finally {
        if (mounted) setPrefLoading(false);
      }
    }

    if (token) loadPrefs();

    return () => {
      mounted = false;
    };
  }, [token, theme]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const processFile = (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alertInfo({
        title: "Invalid file",
        text: "Please choose an image file.",
        theme,
        mainColor: MAIN,
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alertInfo({ title: "File too large", text: "Max 2MB.", theme, mainColor: MAIN });
      return;
    }

    setSelectedFile(file);

    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview(URL.createObjectURL(file));
  };

  const onPickFile = (e) => processFile(e.target.files?.[0]);

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    processFile(e.dataTransfer.files?.[0]);
  };

  const uploadAvatar = async () => {
    const file = selectedFile;

    if (!file) {
      alertInfo({
        title: "No image selected",
        text: "Pick or drag an image first.",
        theme,
        mainColor: MAIN,
      });
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);

      const res = await api.post("/me/avatar/user", fd, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const url = res.data?.avatar_url;
      if (!url) {
        alertError({
          title: "Upload incomplete",
          text: "Server did not return an image URL.",
          theme,
          mainColor: MAIN,
        });
        return;
      }

      setUserData((p) => ({ ...p, profile_photo_url: url }));
      setFormData((p) => ({ ...p, profile_photo_url: url }));

      if (localPreview) URL.revokeObjectURL(localPreview);
      setLocalPreview("");
      setSelectedFile(null);

      if (fileRef.current) fileRef.current.value = "";

      alertSuccess({
        title: "Photo updated",
        text: res.data?.message || "Profile photo updated.",
        theme,
        mainColor: MAIN,
      }).then(() => window.location.reload());
    } catch (err) {
      const validation = err?.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join("\n")
        : null;

      alertError({
        title: "Upload failed",
        text: validation || err?.response?.data?.message || "Failed to upload.",
        theme,
        mainColor: MAIN,
      });
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const payload = {
        age: toNumOrNull(formData.age),
        height: toNumOrNull(formData.height),
        weight: toNumOrNull(formData.weight),
        address: formData.address || null,
        latitude: toNumOrNull(formData.latitude),
        longitude: toNumOrNull(formData.longitude),
      };

      const res = await api.put("/user/profile", payload);

      alertSuccess({
        title: "Profile updated",
        text: res.data?.message || "Changes saved.",
        theme,
        mainColor: MAIN,
      }).then(() => window.location.reload());
    } catch (err) {
      const validation = err?.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join("\n")
        : null;

      alertError({
        title: "Save failed",
        text: validation || err?.response?.data?.message || "Failed to save.",
        theme,
        mainColor: MAIN,
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const savePreferences = async () => {
    setPrefSaving(true);
    try {
      await api.post("/user/preferences", {
        goal: prefForm.goal || null,
        activity_level: prefForm.activity_level || null,
        budget: prefForm.budget === "" ? null : prefForm.budget,
      });

      const equipment_ids = Array.from(prefForm.selectedEquipmentIds)
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n));

      const amenity_ids = Array.from(prefForm.selectedAmenityIds)
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n));

      await api.post("/user/preferred-equipments", { equipment_ids });
      await api.post("/user/preferred-amenities", { amenity_ids });

      setPrefModalOpen(false);

      alertSuccess({
        title: "Preferences saved",
        text: "Your preferences were updated.",
        theme,
        mainColor: MAIN,
      }).then(() => window.location.reload());
    } catch (err) {
      const validation = err?.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join("\n")
        : null;

      alertError({
        title: "Save failed",
        text: validation || err?.response?.data?.message || "Failed to save.",
        theme,
        mainColor: MAIN,
      });
    } finally {
      setPrefSaving(false);
    }
  };

  const cancelProfileEdit = () => {
    setFormData({ ...userData });
    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview("");
    setSelectedFile(null);
    if (fileRef.current) fileRef.current.value = "";
    setIsEditingProfile(false);
  };

  const prefEquipText = prefView.preferred_equipments.length
    ? prefView.preferred_equipments
        .map((x) => x?.name || `#${x?.equipment_id ?? x?.id ?? "?"}`)
        .join(", ")
    : "—";

  const prefAmenText = prefView.preferred_amenities.length
    ? prefView.preferred_amenities
        .map((x) => x?.name || `#${x?.amenity_id ?? x?.id ?? "?"}`)
        .join(", ")
    : "—";

  if (loading) {
    return (
      <div
        className="profile-page"
        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--orange)" }}>
          Loading profile…
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-left">
          <div className="p-card identity-card">
            <div
              className="avatar-zone"
              onClick={() => isEditingProfile && fileRef.current?.click()}
            >
              <img src={avatarSrc} alt="Profile" className="avatar-img" />
              {isEditingProfile && (
                <div className="avatar-edit-overlay">
                  <Camera size={18} />
                  Change
                </div>
              )}
            </div>

            <h2 className="user-name">{userData.name || "—"}</h2>
            <p className="user-email">{userData.email || "—"}</p>

            <div className="role-pill">
              <span className="role-pip" />
              {userData.role
                ? userData.role.charAt(0).toUpperCase() + userData.role.slice(1)
                : "User"}
            </div>

            <div className="sidebar-actions">
              <button
                className="btn-primary"
                onClick={() => setIsEditingProfile(true)}
                disabled={prefSaving || uploading}
              >
                <Pencil size={15} /> Edit Profile
              </button>
              <button
                className="btn-secondary"
                onClick={() => setPrefModalOpen(true)}
                disabled={prefLoading || prefSaving}
              >
                <SlidersHorizontal size={15} /> Edit Preferences
              </button>
            </div>
          </div>

          {isEditingProfile && (
            <div className="p-card upload-card">
              <span className="upload-card-label">Update Photo</span>

              {localPreview ? (
                <>
                  <img src={localPreview} alt="Preview" className="upload-preview-img" />
                  <div className="upload-actions">
                    <button
                      className="btn-primary"
                      onClick={uploadAvatar}
                      disabled={uploading}
                      style={{ padding: "0.75rem" }}
                    >
                      <Upload size={15} /> {uploading ? "Uploading..." : "Upload"}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        if (localPreview) URL.revokeObjectURL(localPreview);
                        setLocalPreview("");
                        setSelectedFile(null);
                        if (fileRef.current) fileRef.current.value = "";
                      }}
                      disabled={uploading}
                      style={{ padding: "0.75rem" }}
                    >
                      <X size={15} /> Clear
                    </button>
                  </div>
                </>
              ) : (
                <div
                  className={`upload-drop-zone ${isDragging ? "dragging" : ""}`}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                >
                  <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} />
                  <div className="upload-drop-icon">
                    <ImageUp size={28} />
                  </div>
                  <p className="upload-drop-text">
                    Drag & drop or <span>browse</span>
                    <br />
                    PNG, JPG up to 2MB
                  </p>
                </div>
              )}
            </div>
          )}

          {userData.role === "user" && (
            <div className="p-card owner-card">
              <div className="owner-card-glow" />
              <div className="owner-icon-box">
                <Building2 size={22} />
              </div>
              <h3 className="owner-card-title">Own a Gym?</h3>
              <p className="owner-card-desc">
                List your gym on ExerSearch and reach thousands of fitness enthusiasts in
                Pasig.
              </p>
              <Link to="/home/becomeowner" className="btn-owner">
                Become an Owner <ChevronRight size={16} />
              </Link>
            </div>
          )}
        </div>

        <div className="profile-right">
          {isEditingProfile ? (
            <div className="p-card">
              <div className="card-head">
                <span className="card-head-title">Edit Profile</span>
                <span className="card-head-tag">Unsaved Changes</span>
              </div>
              <div className="card-body">
                <div className="edit-form-grid">
                  <div className="field-group">
                    <label className="field-label">
                      <Calendar size={12} /> Age
                    </label>
                    <input
                      className="field-input"
                      name="age"
                      type="number"
                      value={formData.age}
                      onChange={handleInputChange}
                      placeholder="e.g. 24"
                    />
                  </div>
                  <div className="field-group">
                    <label className="field-label">
                      <Ruler size={12} /> Height (cm)
                    </label>
                    <input
                      className="field-input"
                      name="height"
                      type="number"
                      value={formData.height}
                      onChange={handleInputChange}
                      placeholder="e.g. 170"
                    />
                  </div>
                  <div className="field-group">
                    <label className="field-label">
                      <Weight size={12} /> Weight (kg)
                    </label>
                    <input
                      className="field-input"
                      name="weight"
                      type="number"
                      value={formData.weight}
                      onChange={handleInputChange}
                      placeholder="e.g. 70"
                    />
                  </div>
                  <div className="field-group">
                    <label className="field-label">
                      <MapPin size={12} /> Latitude
                    </label>
                    <input
                      className="field-input"
                      name="latitude"
                      type="number"
                      value={formData.latitude}
                      onChange={handleInputChange}
                      placeholder="e.g. 14.5764"
                    />
                  </div>
                  <div className="field-group span-full">
                    <label className="field-label">
                      <MapPin size={12} /> Address
                    </label>
                    <input
                      className="field-input"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="e.g. Pasig City, Metro Manila"
                    />
                  </div>
                  <div className="field-group span-full">
                    <label className="field-label">
                      <MapPin size={12} /> Longitude
                    </label>
                    <input
                      className="field-input"
                      name="longitude"
                      type="number"
                      value={formData.longitude}
                      onChange={handleInputChange}
                      placeholder="e.g. 121.0851"
                    />
                  </div>
                  <div className="form-actions">
                    <button
                      className="btn-primary"
                      onClick={saveProfile}
                      disabled={savingProfile || uploading || prefSaving}
                    >
                      <Check size={15} /> {savingProfile ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={cancelProfileEdit}
                      disabled={savingProfile || uploading || prefSaving}
                    >
                      <X size={15} /> Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="p-card">
                <div className="card-head">
                  <span className="card-head-title">Personal Information</span>
                  <span className="card-head-tag">
                    Member since {userData.created_at || "—"}
                  </span>
                </div>
                <div className="card-body">
                  <div className="info-grid">
                    <div className="info-tile">
                      <div className="tile-label">
                        <User size={11} /> Name
                      </div>
                      <div className="tile-value">{userData.name || "—"}</div>
                    </div>
                    <div className="info-tile">
                      <div className="tile-label">
                        <Mail size={11} /> Email
                      </div>
                      <div className="tile-value" style={{ fontSize: "0.9rem" }}>
                        {userData.email || "—"}
                      </div>
                    </div>
                    <div className="info-tile">
                      <div className="tile-label">
                        <Calendar size={11} /> Age
                      </div>
                      <div className="tile-value">
                        {userData.age ? `${userData.age} yrs` : "—"}
                      </div>
                    </div>
                    <div className="info-tile">
                      <div className="tile-label">
                        <Ruler size={11} /> Height
                      </div>
                      <div className="tile-value">
                        {userData.height ? `${userData.height} cm` : "—"}
                      </div>
                    </div>
                    <div className="info-tile">
                      <div className="tile-label">
                        <Weight size={11} /> Weight
                      </div>
                      <div className="tile-value">
                        {userData.weight ? `${userData.weight} kg` : "—"}
                      </div>
                    </div>
                    <div className="info-tile">
                      <div className="tile-label">
                        <Activity size={11} /> Role
                      </div>
                      <div className="tile-value">{userData.role || "—"}</div>
                    </div>
                    <div className="info-tile span-full">
                      <div className="tile-label">
                        <MapPin size={11} /> Address
                      </div>
                      <div className="tile-value">{userData.address || "—"}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-card">
                <div className="card-head">
                  <span className="card-head-title">Fitness Preferences</span>
                  <span className="card-head-tag">Personalized</span>
                </div>
                <div className="card-body">
                  {prefLoading ? (
                    <div
                      style={{
                        fontWeight: 700,
                        color: "var(--gray-500)",
                        padding: "1rem 0",
                      }}
                    >
                      Fetching preferences…
                    </div>
                  ) : (
                    <div className="pref-grid">
                      <div className="info-tile">
                        <div className="tile-label">
                          <Target size={11} /> Goal
                        </div>
                        <div className="tile-value">{prefView.goal || "—"}</div>
                      </div>
                      <div className="info-tile">
                        <div className="tile-label">
                          <Activity size={11} /> Activity Level
                        </div>
                        <div className="tile-value">{prefView.activity_level || "—"}</div>
                      </div>
                      <div className="info-tile">
                        <div className="tile-label">
                          <Wallet size={11} /> Budget
                        </div>
                        <div className="tile-value">
                          {prefView.budget === "" || prefView.budget == null
                            ? "—"
                            : `₱${Number(prefView.budget).toLocaleString()}`}
                        </div>
                      </div>
                      <div className="info-tile span-full">
                        <div className="tile-label">
                          <Dumbbell size={11} /> Preferred Equipment
                        </div>
                        <div
                          className="tile-value"
                          style={{ fontSize: "0.9rem", fontWeight: 600 }}
                        >
                          {prefEquipText}
                        </div>
                      </div>
                      <div className="info-tile span-full">
                        <div className="tile-label">
                          <Building2 size={11} /> Preferred Amenities
                        </div>
                        <div
                          className="tile-value"
                          style={{ fontSize: "0.9rem", fontWeight: 600 }}
                        >
                          {prefAmenText}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <PrefModal
        open={prefModalOpen}
        onClose={() => setPrefModalOpen(false)}
        prefLoading={prefLoading}
        prefSaving={prefSaving}
        prefForm={prefForm}
        setPrefForm={setPrefForm}
        equipments={equipments}
        amenities={amenities}
        onSave={savePreferences}
      />
    </div>
  );
}