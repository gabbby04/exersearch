import React, { useEffect, useMemo, useRef, useState } from "react";
import "./ProfileStyle.css";
import { useOutletContext } from "react-router-dom";
import { api } from "../../utils/apiClient";
import { absoluteUrl } from "../../utils/findGymsData";
import { MAIN, adminThemes } from "./AdminLayout";
import { alertSuccess, alertError, alertInfo } from "../../utils/adminAlert";

const FALLBACK_AVATAR = "/arellano.png";

function toAbsoluteAvatarUrl(raw) {
  if (!raw) return FALLBACK_AVATAR;
  const u = absoluteUrl(raw);
  return u || FALLBACK_AVATAR;
}

export default function Profile() {
  const { theme } = useOutletContext();
  const t = adminThemes[theme]?.app || adminThemes.light.app;
  const isDark = theme === "dark";

  const fileRef = useRef(null);

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [userData, setUserData] = useState({
    name: "",
    email: "",
    role: "",
    permission_level: "full",
    notes: "",
    avatar_url: "",
    created_at: "",
    updated_at: "",
  });

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    permission_level: "full",
    notes: "",
    avatar_url: "",
    created_at: "",
    updated_at: "",
  });

  const [localPreview, setLocalPreview] = useState("");

  const avatarSrc = useMemo(() => {
    if (localPreview) return localPreview;
    const raw = (isEditing ? formData.avatar_url : userData.avatar_url) || "";
    return toAbsoluteAvatarUrl(raw);
  }, [localPreview, isEditing, formData.avatar_url, userData.avatar_url]);

  const pageWrapStyle = useMemo(
    () => ({
      width: "100%",
      background: t.bg,
      color: t.text,
      minHeight: "calc(100vh - 64px)",
      padding: "18px 16px",
    }),
    [t]
  );

  const panelStyle = useMemo(
    () => ({
      border: `1px solid ${t.border}`,
      background: t.soft2,
      boxShadow: t.shadow,
      borderRadius: 16,
      overflow: "hidden",
      padding: 14,
    }),
    [t]
  );

  const pillStyle = useMemo(
    () => ({
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 10px",
      borderRadius: 999,
      background: t.soft,
      border: `1px solid ${t.border}`,
      fontWeight: 900,
      fontSize: 12,
      color: t.text,
    }),
    [t]
  );

  const subtleText = useMemo(
    () => ({
      color: t.mutedText,
      fontWeight: 800,
      fontSize: 12,
      marginTop: 6,
    }),
    [t]
  );

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);

      try {
        const res = await api.get("/admin/profile");

        const u = res.data?.user;
        const p = res.data?.admin_profile;

        const next = {
          name: u?.name || "",
          email: u?.email || "",
          role: u?.role || "",
          permission_level: p?.permission_level || "full",
          notes: p?.notes || "",
          avatar_url: p?.avatar_url || "",
          created_at: p?.created_at ? String(p.created_at).slice(0, 10) : "",
          updated_at: p?.updated_at ? String(p.updated_at).slice(0, 10) : "",
        };

        if (!mounted) return;

        setUserData(next);
        setFormData(next);
      } catch (err) {
        console.log(
          "[ADMIN PROFILE] load error:",
          err?.response?.status,
          err?.response?.data
        );

        const status = err?.response?.status;
        const msg =
          err?.response?.data?.message ||
          (status === 401
            ? "Your session expired. Please log in again."
            : "Something went wrong.");

        if (mounted) {
          alertError({
            title: "Failed to load profile",
            text: msg,
            theme,
            mainColor: MAIN,
          });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [theme]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const onPickFile = (e) => {
    const file = e.target.files?.[0];
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

    if (file.size > 6 * 1024 * 1024) {
      alertInfo({
        title: "File too large",
        text: "Image is too large (max 6MB).",
        theme,
        mainColor: MAIN,
      });
      return;
    }

    if (localPreview) URL.revokeObjectURL(localPreview);

    const url = URL.createObjectURL(file);
    setLocalPreview(url);
  };

  const clearPickedImage = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const uploadAvatar = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    const file = fileRef.current?.files?.[0];

    if (!file) {
      alertInfo({
        title: "No image selected",
        text: "Please choose an image before uploading.",
        theme,
        mainColor: MAIN,
      });
      return;
    }

    setUploading(true);

    try {
      const fd = new FormData();
      fd.append("photo", file);

      const res = await api.post("/me/avatar/admin", fd);

      const newUrl = res.data?.avatar_url;

      if (!newUrl) {
        console.log("[ADMIN AVATAR UPLOAD] response:", res.data);

        alertError({
          title: "Upload incomplete",
          text: "Upload succeeded but server did not return an avatar_url.",
          theme,
          mainColor: MAIN,
        });
        return;
      }

      setUserData((prev) => ({
        ...prev,
        avatar_url: newUrl,
      }));

      setFormData((prev) => ({
        ...prev,
        avatar_url: newUrl,
      }));

      if (localPreview) URL.revokeObjectURL(localPreview);
      setLocalPreview("");
      if (fileRef.current) fileRef.current.value = "";

      alertSuccess({
        title: "Profile photo updated",
        text:
          res.data?.message ||
          "Your admin avatar has been successfully updated.",
        theme,
        mainColor: MAIN,
      });
    } catch (err) {
      console.log("[ADMIN AVATAR UPLOAD] full error:", err);
      console.log("[ADMIN AVATAR UPLOAD] status:", err?.response?.status);
      console.log("[ADMIN AVATAR UPLOAD] data:", err?.response?.data);

      const validationText = err?.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join("\n")
        : null;

      alertError({
        title: "Upload failed",
        text:
          validationText ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to upload avatar.",
        theme,
        mainColor: MAIN,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    setSaving(true);

    try {
      const payload = {
        name: formData.name,
        permission_level: formData.permission_level,
        notes: formData.notes,
      };

      const res = await api.put("/admin/profile", payload);

      setUserData((prev) => ({
        ...prev,
        name: formData.name,
        permission_level: formData.permission_level,
        notes: formData.notes,
      }));

      setIsEditing(false);

      alertSuccess({
        title: "Profile updated",
        text: res.data?.message || "Your changes have been saved.",
        theme,
        mainColor: MAIN,
      });
    } catch (err) {
      console.log("[ADMIN PROFILE] save error:", err);

      const validationText = err?.response?.data?.errors
        ? Object.values(err.response.data.errors).flat().join("\n")
        : null;

      alertError({
        title: "Save failed",
        text:
          validationText ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to save.",
        theme,
        mainColor: MAIN,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    setFormData({ ...userData });

    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview("");
    if (fileRef.current) fileRef.current.value = "";

    setIsEditing(false);
  };

  if (loading) {
    return (
      <div style={pageWrapStyle}>
        <div style={panelStyle}>
          <h2 style={{ margin: 0, fontWeight: 950 }}>Loading…</h2>
          <div style={subtleText}>Fetching admin profile</div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageWrapStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        <div>
          <div style={{ fontWeight: 950, fontSize: 22 }}>Profile</div>
          <div style={subtleText}>
            {isDark ? "Dark mode" : "Light mode"} • Admin Panel
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={pillStyle}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: MAIN,
                boxShadow: `0 0 0 3px rgba(210,63,11,0.18)`,
              }}
            />
            {userData.role?.toUpperCase() || "ADMIN"}
          </span>

          {!isEditing && (
            <button
              type="button"
              className="primary-btn"
              onClick={() => setIsEditing(true)}
              style={{ margin: 0 }}
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>

      <div className={`profile-page ${theme}`} data-theme={theme}>
        <div className="profile-container">
          <div className="profile-left">
            <div className="avatar-wrapper">
              <img src={avatarSrc} alt="Profile" className="avatar-img" />
            </div>

            <h2 className="profile-name">
              {isEditing ? formData.name : userData.name}
            </h2>

            <p className="profile-email">{userData.email}</p>

            <p className="profile-bio">
              {(isEditing ? formData.notes : userData.notes) || "No notes yet."}
            </p>

            {isEditing && (
              <div style={{ marginTop: 14, width: "100%" }}>
                <div style={{ ...subtleText, marginBottom: 8 }}>
                  Update avatar
                </div>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={onPickFile}
                  style={{
                    width: "100%",
                    padding: 10,
                    borderRadius: 12,
                    border: `1px solid ${t.border}`,
                    background: t.soft,
                    color: t.text,
                    fontWeight: 800,
                  }}
                />

                <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={uploadAvatar}
                    disabled={uploading}
                    style={{ flex: 1, margin: 0 }}
                  >
                    {uploading ? "Uploading..." : "Upload"}
                  </button>

                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={clearPickedImage}
                    disabled={uploading}
                    style={{ flex: 1, margin: 0 }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="profile-right">
            {isEditing ? (
              <div className="edit-form">
                <label>Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                />

                <label>Permission Level</label>
                <select
                  name="permission_level"
                  value={formData.permission_level}
                  onChange={handleInputChange}
                >
                  <option value="full">full</option>
                  <option value="limited">limited</option>
                  <option value="readonly">readonly</option>
                </select>

                <label>Avatar URL (read-only)</label>
                <input
                  type="text"
                  name="avatar_url"
                  value={formData.avatar_url}
                  onChange={handleInputChange}
                  placeholder="/storage/avatars/admins/..."
                  readOnly
                  style={{ opacity: 0.85, cursor: "not-allowed" }}
                />

                <label>Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                />

                <div className="edit-actions">
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={handleSave}
                    disabled={saving || uploading}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>

                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={handleCancel}
                    disabled={saving || uploading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="section-title">Admin Info</h3>

                <div className="info-grid">
                  <div className="info-card">
                    <label>Role</label>
                    <strong>{userData.role || "admin"}</strong>
                  </div>

                  <div className="info-card">
                    <label>Permission</label>
                    <strong>{userData.permission_level}</strong>
                  </div>

                  <div className="info-card">
                    <label>Member Since</label>
                    <strong>{userData.created_at || "-"}</strong>
                  </div>

                  <div className="info-card">
                    <label>Last Updated</label>
                    <strong>{userData.updated_at || "-"}</strong>
                  </div>
                </div>

                <h3 className="section-title">Notes</h3>

                <div className="info-grid">
                  <div className="info-card" style={{ gridColumn: "1 / -1" }}>
                    <label>Admin Notes</label>
                    <strong>{userData.notes || "No notes yet."}</strong>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}