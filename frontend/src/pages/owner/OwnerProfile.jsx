import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./../user/ProfileStyle.css";
import { alertSuccess, alertError, alertInfo } from "../../utils/adminAlert";
import { api } from "../../utils/apiClient";
import {
  getMyOwnerProfile,
  upsertMyOwnerProfile,
  uploadOwnerAvatar,
} from "../../utils/ownerProfileApi";
import {
  Mail,
  MapPin,
  Pencil,
  Upload,
  X,
  Check,
  Building2,
  Camera,
  Phone,
  BriefcaseBusiness,
  BadgeCheck,
} from "lucide-react";

const API_BASE = "https://exersearch.test";
const FALLBACK_AVATAR = "/arellano.png";
const MAIN = "#d23f0b";

function safeStr(v) {
  return v == null ? "" : String(v);
}

function absoluteUrlMaybe(pathOrUrl) {
  if (!pathOrUrl) return "";
  const s = String(pathOrUrl);
  if (s.startsWith("http")) return s;
  return `${API_BASE}${s}`;
}

export default function Profile() {
  const fileRef = useRef(null);
  const theme = localStorage.getItem("theme") || "light";

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [localPreview, setLocalPreview] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const [me, setMe] = useState({ name: "", email: "", role: "" });

  const [ownerData, setOwnerData] = useState({
    profile_photo_url: "",
    contact_number: "",
    address: "",
    company_name: "",
    verified: false,
    created_at: "",
    updated_at: "",
  });

  const [formData, setFormData] = useState({ ...ownerData });

  const avatarSrc = useMemo(() => {
    if (localPreview) return localPreview;
    const raw =
      (isEditingProfile ? formData.profile_photo_url : ownerData.profile_photo_url) ||
      "";
    if (!raw) return FALLBACK_AVATAR;
    if (raw.startsWith("http")) return raw;
    return `${API_BASE}${raw}`;
  }, [localPreview, isEditingProfile, formData.profile_photo_url, ownerData.profile_photo_url]);

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  useEffect(() => {
    let mounted = true;

    async function loadAll() {
      setLoading(true);
      try {
        const [meRes, ownerProfile] = await Promise.all([
          api.get("/me"),
          getMyOwnerProfile(),
        ]);

        const u = meRes?.data || {};
        const nextMe = {
          name: u?.name || "",
          email: u?.email || "",
          role: u?.role || "",
        };

        const p = ownerProfile || {};

        const nextOwner = {
          profile_photo_url: p?.profile_photo_url ?? "",
          contact_number: p?.contact_number ?? "",
          address: p?.address ?? "",
          company_name: p?.company_name ?? "",
          verified: Boolean(p?.verified ?? false),
          created_at: p?.created_at ? String(p.created_at).slice(0, 10) : "",
          updated_at: p?.updated_at ? String(p.updated_at).slice(0, 10) : "",
        };

        if (!mounted) return;
        setMe(nextMe);
        setOwnerData(nextOwner);
        setFormData(nextOwner);
        setLocalPreview("");
        setSelectedFile(null);
      } catch (err) {
        alertError({
          title: "Failed to load owner profile",
          text: err?.response?.data?.message || "Something went wrong.",
          theme,
          mainColor: MAIN,
        });
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadAll();
    return () => {
      mounted = false;
    };
  }, [theme]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const processFile = (file) => {
    if (!file) return;

    if (!file.type?.startsWith("image/")) {
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
      const url = await uploadOwnerAvatar(file);

      if (!url) {
        alertError({
          title: "Upload incomplete",
          text: "Server did not return an image URL.",
          theme,
          mainColor: MAIN,
        });
        return;
      }

      await upsertMyOwnerProfile({ profile_photo_url: url });

      setOwnerData((p) => ({ ...p, profile_photo_url: url }));
      setFormData((p) => ({ ...p, profile_photo_url: url }));

      if (localPreview) URL.revokeObjectURL(localPreview);
      setLocalPreview("");
      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = "";

      alertSuccess({
        title: "Photo updated",
        text: "Owner profile photo updated.",
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

  const saveOwnerProfile = async () => {
    setSavingProfile(true);
    try {
      const payload = {
        profile_photo_url: formData.profile_photo_url || null,
        contact_number: safeStr(formData.contact_number).trim() || null,
        address: safeStr(formData.address).trim() || null,
        company_name: safeStr(formData.company_name).trim() || null,
      };

      await upsertMyOwnerProfile(payload);

      alertSuccess({
        title: "Owner profile updated",
        text: "Changes saved.",
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

  const cancelProfileEdit = () => {
    setFormData({ ...ownerData });
    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview("");
    setSelectedFile(null);
    if (fileRef.current) fileRef.current.value = "";
    setIsEditingProfile(false);
  };

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
              <img src={absoluteUrlMaybe(avatarSrc)} alt="Profile" className="avatar-img" />
              {isEditingProfile && (
                <div className="avatar-edit-overlay">
                  <Camera size={18} />
                  Change
                </div>
              )}
            </div>

            <h2 className="user-name">{me.name || "—"}</h2>
            <p className="user-email">{me.email || "—"}</p>

            <div className="role-pill">
              <span className="role-pip" />
              {me.role ? me.role.charAt(0).toUpperCase() + me.role.slice(1) : "Owner"}
            </div>

            <div className="sidebar-actions">
              <button
                className="btn-primary"
                onClick={() => setIsEditingProfile(true)}
                disabled={uploading}
              >
                <Pencil size={15} /> Edit Owner Profile
              </button>

              <Link to="/manage/owner/view-gym" className="btn-owner" style={{ marginTop: 10 }}>
                Manage Gyms <Building2 size={16} />
              </Link>
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
                    <Upload size={28} />
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
        </div>

        <div className="profile-right">
          {isEditingProfile ? (
            <div className="p-card">
              <div className="card-head">
                <span className="card-head-title">Edit Owner Profile</span>
                <span className="card-head-tag">Unsaved Changes</span>
              </div>

              <div className="card-body">
                <div className="edit-form-grid">
                  <div className="field-group">
                    <label className="field-label">
                      <BriefcaseBusiness size={12} /> Company Name
                    </label>
                    <input
                      className="field-input"
                      name="company_name"
                      value={formData.company_name}
                      onChange={handleInputChange}
                      placeholder="e.g. FitHouse Inc."
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label">
                      <Phone size={12} /> Contact Number
                    </label>
                    <input
                      className="field-input"
                      name="contact_number"
                      value={formData.contact_number}
                      onChange={handleInputChange}
                      placeholder="e.g. +63 9xx xxx xxxx"
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

                  <div className="form-actions">
                    <button
                      className="btn-primary"
                      onClick={saveOwnerProfile}
                      disabled={savingProfile || uploading}
                    >
                      <Check size={15} /> {savingProfile ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={cancelProfileEdit}
                      disabled={savingProfile || uploading}
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
                  <span className="card-head-title">Owner Information</span>
                  <span className="card-head-tag">
                    {ownerData.created_at ? `Profile since ${ownerData.created_at}` : "—"}
                  </span>
                </div>

                <div className="card-body">
                  <div className="info-grid">
                    <div className="info-tile">
                      <div className="tile-label">
                        <BriefcaseBusiness size={11} /> Company
                      </div>
                      <div className="tile-value">{ownerData.company_name || "—"}</div>
                    </div>

                    <div className="info-tile">
                      <div className="tile-label">
                        <Phone size={11} /> Contact
                      </div>
                      <div className="tile-value">{ownerData.contact_number || "—"}</div>
                    </div>

                    <div className="info-tile">
                      <div className="tile-label">
                        <Mail size={11} /> Email
                      </div>
                      <div className="tile-value" style={{ fontSize: "0.9rem" }}>
                        {me.email || "—"}
                      </div>
                    </div>

                    <div className="info-tile">
                      <div className="tile-label">
                        <BadgeCheck size={11} /> Verified
                      </div>
                      <div className="tile-value">
                        {ownerData.verified ? "Verified" : "Not verified"}
                      </div>
                    </div>

                    <div className="info-tile span-full">
                      <div className="tile-label">
                        <MapPin size={11} /> Address
                      </div>
                      <div className="tile-value">{ownerData.address || "—"}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-card owner-card">
                <div className="owner-card-glow" />
                <div className="owner-icon-box">
                  <Building2 size={22} />
                </div>
                <h3 className="owner-card-title">Manage your gyms</h3>
                <p className="owner-card-desc">
                  View, update, and monitor your gym listings and performance.
                </p>
                <Link to="/manage/owner/view-gym" className="btn-owner">
                  Manage Gyms <Building2 size={16} />
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}