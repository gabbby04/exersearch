import { useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { api } from "../../utils/apiClient";

import { adminThemes, MAIN } from "./AdminLayout";
import { useAuthMe } from "../../utils/useAuthMe";
import {
  adminAlert,
  alertError,
  alertInfo,
  alertSuccess,
} from "../../utils/adminAlert";
import { absoluteUrl } from "../../utils/findGymsData";

import "./AdminEquipments.css";

const BRAND = "#d23f0b";
const MAX_UPLOAD_MB = 5;
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"];

function toAbsUrl(u) {
  return absoluteUrl(u);
}

const EMPTY = {
  app_name: "",
  logo_url: "",
  user_logo_url: "",
  letter_logo: "",
  favicon_url: "",
  contact_phone: "",
  contact_email: "",
  support_email: "",
  address: "",
  facebook_url: "",
  instagram_url: "",
  tiktok_url: "",
  youtube_url: "",
  twitter_url: "",
  website_url: "",
  maintenance_mode: false,
  signup_enabled: true,
  owner_application_enabled: true,
};

function safeStr(v) {
  return v == null ? "" : String(v);
}

async function getAdminSettings() {
  const res = await api.get("/admin/settings");
  return res.data?.data ?? res.data;
}

async function updateAdminSettings(payload) {
  const res = await api.put("/admin/settings", payload);
  return res.data?.data ?? res.data;
}

async function uploadSettingsImage(file, kind = "logos") {
  const fd = new FormData();
  fd.append("type", "settings");
  fd.append("kind", kind);
  fd.append("file", file);

  const res = await api.post("/media/upload", fd);
  return res.data?.url || null;
}

function explainUploadError(err) {
  const status = err?.response?.status;
  const data = err?.response?.data;

  const firstValidation =
    data?.errors && typeof data.errors === "object"
      ? Object.values(data.errors).flat()?.[0]
      : null;

  if (status === 413) {
    return "File is too large (server rejected it). Try a smaller image.";
  }

  if (status === 422) {
    return (
      firstValidation ||
      data?.message ||
      "Invalid file (failed validation). Check file type/size."
    );
  }

  if (status === 415) {
    return "Unsupported file type.";
  }

  if (status === 419) {
    return "Session expired / CSRF issue. Refresh the page and try again.";
  }

  if (status === 401) {
    return "Not authenticated. Please log in again.";
  }

  if (status === 403) {
    return "You don’t have permission to upload files.";
  }

  if (status >= 500) {
    return "Server error while uploading. (Check logs: limits, permissions, storage link.)";
  }

  return data?.message || err?.message || "Upload failed for an unknown reason.";
}

function validateFileBeforeUpload(file) {
  if (!file) return { ok: false, reason: "No file selected." };

  if (!file.type?.startsWith("image/")) {
    return { ok: false, reason: "Please select an image file." };
  }

  if (!ALLOWED_MIMES.includes(file.type)) {
    return {
      ok: false,
      reason: `Invalid file type: ${file.type || "unknown"}. Allowed: JPG, PNG, WebP.`,
    };
  }

  const maxBytes = MAX_UPLOAD_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      ok: false,
      reason: `File too large: ${(file.size / 1024 / 1024).toFixed(
        2
      )}MB. Max is ${MAX_UPLOAD_MB}MB.`,
    };
  }

  return { ok: true, reason: "" };
}

export default function AdminSettings() {
  const { theme } = useOutletContext();
  const t = adminThemes[theme].app;

  const { me, loadingMe, isAdmin } = useAuthMe();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [err, setErr] = useState("");
  const [settings, setSettings] = useState(EMPTY);

  const headerFileRef = useRef(null);
  const [headerLogoUploading, setHeaderLogoUploading] = useState(false);
  const [headerLogoPreview, setHeaderLogoPreview] = useState("");

  const userFileRef = useRef(null);
  const [userLogoUploading, setUserLogoUploading] = useState(false);
  const [userLogoPreview, setUserLogoPreview] = useState("");

  const letterFileRef = useRef(null);
  const [letterLogoUploading, setLetterLogoUploading] = useState(false);
  const [letterLogoPreview, setLetterLogoPreview] = useState("");

  const canEdit = isAdmin && me?.role === "superadmin";

  const currentHeaderLogo = useMemo(() => {
    return headerLogoPreview || toAbsUrl(settings.logo_url) || "";
  }, [headerLogoPreview, settings.logo_url]);

  const currentUserLogo = useMemo(() => {
    return userLogoPreview || toAbsUrl(settings.user_logo_url) || "";
  }, [userLogoPreview, settings.user_logo_url]);

  const currentLetterLogo = useMemo(() => {
    return letterLogoPreview || toAbsUrl(settings.letter_logo) || "";
  }, [letterLogoPreview, settings.letter_logo]);

  const load = async () => {
    setErr("");
    setLoading(true);
    try {
      const data = await getAdminSettings();
      setSettings({
        ...EMPTY,
        ...data,
        maintenance_mode: !!data?.maintenance_mode,
        signup_enabled: data?.signup_enabled !== false,
        owner_application_enabled: data?.owner_application_enabled !== false,
      });

      setHeaderLogoPreview("");
      setUserLogoPreview("");
      setLetterLogoPreview("");
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setField = (name, value) => {
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const onSave = async () => {
    if (!canEdit) return;

    setErr("");
    setSaving(true);
    try {
      const payload = {
        app_name: safeStr(settings.app_name).trim(),
        logo_url: safeStr(settings.logo_url).trim() || null,
        user_logo_url: safeStr(settings.user_logo_url).trim() || null,
        letter_logo: safeStr(settings.letter_logo).trim() || null,
        favicon_url: safeStr(settings.favicon_url).trim() || null,
        contact_phone: safeStr(settings.contact_phone).trim() || null,
        contact_email: safeStr(settings.contact_email).trim() || null,
        support_email: safeStr(settings.support_email).trim() || null,
        address: safeStr(settings.address).trim() || null,
        facebook_url: safeStr(settings.facebook_url).trim() || null,
        instagram_url: safeStr(settings.instagram_url).trim() || null,
        tiktok_url: safeStr(settings.tiktok_url).trim() || null,
        youtube_url: safeStr(settings.youtube_url).trim() || null,
        twitter_url: safeStr(settings.twitter_url).trim() || null,
        website_url: safeStr(settings.website_url).trim() || null,
        maintenance_mode: !!settings.maintenance_mode,
        signup_enabled: !!settings.signup_enabled,
        owner_application_enabled: !!settings.owner_application_enabled,
      };

      const updated = await updateAdminSettings(payload);
      setSettings((prev) => ({ ...prev, ...updated }));

      await alertSuccess({
        title: "Saved",
        text: "App settings updated successfully.",
        theme,
        mainColor: MAIN,
      });

      window.location.reload();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Failed to save settings.";
      setErr(msg);
      await alertError({
        title: "Save failed",
        text: msg,
        theme,
        mainColor: MAIN,
      });
    } finally {
      setSaving(false);
    }
  };

  const onPickHeaderLogo = () => {
    if (!canEdit || headerLogoUploading) return;
    headerFileRef.current?.click();
  };

  const onHeaderLogoChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const check = validateFileBeforeUpload(file);
    if (!check.ok) {
      await alertError({
        title: "Upload blocked",
        text: check.reason,
        theme,
        mainColor: MAIN,
      });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setHeaderLogoPreview(previewUrl);

    const confirm = await adminAlert({
      title: "Upload new header logo?",
      text: `Allowed: JPG/PNG/WebP • Max: ${MAX_UPLOAD_MB}MB`,
      icon: "question",
      confirmText: "Upload",
      theme,
      mainColor: MAIN,
    });

    if (!confirm.isConfirmed) {
      URL.revokeObjectURL(previewUrl);
      setHeaderLogoPreview("");
      return;
    }

    setErr("");
    setHeaderLogoUploading(true);
    try {
      const uploadedUrl = await uploadSettingsImage(file, "logos");
      if (!uploadedUrl) throw new Error("Upload succeeded but no URL was returned.");

      setField("logo_url", uploadedUrl);

      await alertSuccess({
        title: "Uploaded",
        text: "Header logo uploaded. Click Save to persist the change.",
        theme,
        mainColor: MAIN,
      });
    } catch (ex) {
      const msg = explainUploadError(ex);
      setErr(msg);
      setHeaderLogoPreview("");
      await alertError({
        title: "Upload failed",
        text: msg,
        theme,
        mainColor: MAIN,
      });
    } finally {
      setHeaderLogoUploading(false);
    }
  };

  const onPickUserLogo = () => {
    if (!canEdit || userLogoUploading) return;
    userFileRef.current?.click();
  };

  const onUserLogoChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const check = validateFileBeforeUpload(file);
    if (!check.ok) {
      await alertError({
        title: "Upload blocked",
        text: check.reason,
        theme,
        mainColor: MAIN,
      });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setUserLogoPreview(previewUrl);

    const confirm = await adminAlert({
      title: "Upload new user-side logo?",
      text: `Allowed: JPG/PNG/WebP • Max: ${MAX_UPLOAD_MB}MB`,
      icon: "question",
      confirmText: "Upload",
      theme,
      mainColor: MAIN,
    });

    if (!confirm.isConfirmed) {
      URL.revokeObjectURL(previewUrl);
      setUserLogoPreview("");
      return;
    }

    setErr("");
    setUserLogoUploading(true);
    try {
      const uploadedUrl = await uploadSettingsImage(file, "user-logos");
      if (!uploadedUrl) throw new Error("Upload succeeded but no URL was returned.");

      setField("user_logo_url", uploadedUrl);

      await alertSuccess({
        title: "Uploaded",
        text: "User logo uploaded. Click Save to persist the change.",
        theme,
        mainColor: MAIN,
      });
    } catch (ex) {
      const msg = explainUploadError(ex);
      setErr(msg);
      setUserLogoPreview("");
      await alertError({
        title: "Upload failed",
        text: msg,
        theme,
        mainColor: MAIN,
      });
    } finally {
      setUserLogoUploading(false);
    }
  };

  const onPickLetterLogo = () => {
    if (!canEdit || letterLogoUploading) return;
    letterFileRef.current?.click();
  };

  const onLetterLogoChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const check = validateFileBeforeUpload(file);
    if (!check.ok) {
      await alertError({
        title: "Upload blocked",
        text: check.reason,
        theme,
        mainColor: MAIN,
      });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setLetterLogoPreview(previewUrl);

    const confirm = await adminAlert({
      title: "Upload new letter logo?",
      text: `Allowed: JPG/PNG/WebP • Max: ${MAX_UPLOAD_MB}MB`,
      icon: "question",
      confirmText: "Upload",
      theme,
      mainColor: MAIN,
    });

    if (!confirm.isConfirmed) {
      URL.revokeObjectURL(previewUrl);
      setLetterLogoPreview("");
      return;
    }

    setErr("");
    setLetterLogoUploading(true);
    try {
      const uploadedUrl = await uploadSettingsImage(file, "letter-logos");
      if (!uploadedUrl) throw new Error("Upload succeeded but no URL was returned.");

      setField("letter_logo", uploadedUrl);

      await alertSuccess({
        title: "Uploaded",
        text: "Letter logo uploaded. Click Save to persist the change.",
        theme,
        mainColor: MAIN,
      });
    } catch (ex) {
      const msg = explainUploadError(ex);
      setErr(msg);
      setLetterLogoPreview("");
      await alertError({
        title: "Upload failed",
        text: msg,
        theme,
        mainColor: MAIN,
      });
    } finally {
      setLetterLogoUploading(false);
    }
  };

  const onToggleMaintenance = async (nextValue) => {
    if (!canEdit) return;

    const confirm = await adminAlert({
      title: nextValue ? "Enable Maintenance Mode?" : "Disable Maintenance Mode?",
      text: nextValue
        ? "This may block users from using the app once implemented."
        : "Users will regain access once implemented.",
      icon: "warning",
      confirmText: nextValue ? "Enable" : "Disable",
      theme,
      mainColor: MAIN,
    });

    if (!confirm.isConfirmed) return;

    setField("maintenance_mode", !!nextValue);

    await alertInfo({
      title: "Changed locally",
      text: "Click Save to persist this change.",
      theme,
      mainColor: MAIN,
    });
  };

  if (loadingMe) return <div style={{ padding: 18, color: t.text }}>Loading account…</div>;
  if (!isAdmin) return <div style={{ padding: 18, color: t.text }}>Forbidden.</div>;

  return (
    <div style={{ padding: 18 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: t.text }}>App Settings</div>
          <div style={{ fontSize: 12, color: t.mutedText, marginTop: 2 }}>
            Branding + contact info (Superadmin only).
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={load}
            disabled={
              loading ||
              saving ||
              headerLogoUploading ||
              userLogoUploading ||
              letterLogoUploading
            }
            style={btnStyle(t, { subtle: true })}
          >
            Refresh
          </button>

          <button
            onClick={onSave}
            disabled={
              !canEdit ||
              loading ||
              saving ||
              headerLogoUploading ||
              userLogoUploading ||
              letterLogoUploading
            }
            style={btnStyle(t, { primary: true, disabled: !canEdit })}
            title={!canEdit ? "Superadmin only" : "Save"}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {err && (
        <div
          style={{
            marginBottom: 12,
            padding: "10px 12px",
            borderRadius: 12,
            border: `1px solid ${t.border}`,
            background: t.soft,
            color: t.text,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {err}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 14, color: t.text }}>Loading settings…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
          <section style={cardStyle(t)}>
            <div style={sectionTitle(t)}>Branding</div>

            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
              <LogoBox t={t} url={currentHeaderLogo} emptyText="No Header Logo" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: t.text }}>Header Logo</div>
                <div style={{ fontSize: 12, color: t.mutedText, marginTop: 2 }}>
                  Upload an image. It will set <b>logo_url</b>. Then click <b>Save</b>.
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                  <button
                    onClick={onPickHeaderLogo}
                    disabled={!canEdit || headerLogoUploading}
                    style={btnStyle(t, { brand: true, disabled: !canEdit })}
                  >
                    {headerLogoUploading ? "Uploading…" : "Upload Header Logo"}
                  </button>

                  {headerLogoPreview && (
                    <button
                      onClick={() => setHeaderLogoPreview("")}
                      disabled={headerLogoUploading}
                      style={btnStyle(t, { subtle: true })}
                    >
                      Remove Preview
                    </button>
                  )}
                </div>

                <input
                  ref={headerFileRef}
                  type="file"
                  accept="image/*"
                  onChange={onHeaderLogoChange}
                  style={{ display: "none" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
              <LogoBox t={t} url={currentUserLogo} emptyText="No User Logo" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: t.text }}>User-Side Logo</div>
                <div style={{ fontSize: 12, color: t.mutedText, marginTop: 2 }}>
                  Upload an image. It will set <b>user_logo_url</b>. Then click <b>Save</b>.
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                  <button
                    onClick={onPickUserLogo}
                    disabled={!canEdit || userLogoUploading}
                    style={btnStyle(t, { brand: true, disabled: !canEdit })}
                  >
                    {userLogoUploading ? "Uploading…" : "Upload User Logo"}
                  </button>

                  {userLogoPreview && (
                    <button
                      onClick={() => setUserLogoPreview("")}
                      disabled={userLogoUploading}
                      style={btnStyle(t, { subtle: true })}
                    >
                      Remove Preview
                    </button>
                  )}
                </div>

                <input
                  ref={userFileRef}
                  type="file"
                  accept="image/*"
                  onChange={onUserLogoChange}
                  style={{ display: "none" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
              <LogoBox t={t} url={currentLetterLogo} emptyText="No Letter Logo" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: t.text }}>Letter Logo</div>
                <div style={{ fontSize: 12, color: t.mutedText, marginTop: 2 }}>
                  Upload an image. It will set <b>letter_logo</b>. Then click <b>Save</b>.
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                  <button
                    onClick={onPickLetterLogo}
                    disabled={!canEdit || letterLogoUploading}
                    style={btnStyle(t, { brand: true, disabled: !canEdit })}
                  >
                    {letterLogoUploading ? "Uploading…" : "Upload Letter Logo"}
                  </button>

                  {letterLogoPreview && (
                    <button
                      onClick={() => setLetterLogoPreview("")}
                      disabled={letterLogoUploading}
                      style={btnStyle(t, { subtle: true })}
                    >
                      Remove Preview
                    </button>
                  )}
                </div>

                <input
                  ref={letterFileRef}
                  type="file"
                  accept="image/*"
                  onChange={onLetterLogoChange}
                  style={{ display: "none" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="App Name">
                <input
                  value={settings.app_name}
                  onChange={(e) => setField("app_name", e.target.value)}
                  disabled={!canEdit}
                  style={inputStyle(t)}
                  placeholder="ExerSearch"
                />
              </Field>

              <Field label="Logo URL (header)">
                <input
                  value={settings.logo_url || ""}
                  onChange={(e) => setField("logo_url", e.target.value)}
                  disabled={!canEdit}
                  style={inputStyle(t)}
                  placeholder="/storage/settings/logos/..."
                />
              </Field>

              <Field label="User Logo URL">
                <input
                  value={settings.user_logo_url || ""}
                  onChange={(e) => setField("user_logo_url", e.target.value)}
                  disabled={!canEdit}
                  style={inputStyle(t)}
                  placeholder="/storage/settings/user-logos/..."
                />
              </Field>

              <Field label="Letter Logo URL">
                <input
                  value={settings.letter_logo || ""}
                  onChange={(e) => setField("letter_logo", e.target.value)}
                  disabled={!canEdit}
                  style={inputStyle(t)}
                  placeholder="/storage/settings/letter-logos/..."
                />
              </Field>

              <Field label="Favicon URL">
                <input
                  value={settings.favicon_url || ""}
                  onChange={(e) => setField("favicon_url", e.target.value)}
                  disabled={!canEdit}
                  style={inputStyle(t)}
                  placeholder="/favicon.ico"
                />
              </Field>
            </div>
          </section>

          <section style={cardStyle(t)}>
            <div style={sectionTitle(t)}>Contact Info</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Contact Phone">
                <input
                  value={settings.contact_phone || ""}
                  onChange={(e) => setField("contact_phone", e.target.value)}
                  disabled={!canEdit}
                  style={inputStyle(t)}
                  placeholder="09xx..."
                />
              </Field>

              <Field label="Contact Email">
                <input
                  value={settings.contact_email || ""}
                  onChange={(e) => setField("contact_email", e.target.value)}
                  disabled={!canEdit}
                  style={inputStyle(t)}
                  placeholder="contact@..."
                />
              </Field>

              <Field label="Support Email">
                <input
                  value={settings.support_email || ""}
                  onChange={(e) => setField("support_email", e.target.value)}
                  disabled={!canEdit}
                  style={inputStyle(t)}
                  placeholder="support@..."
                />
              </Field>

              <Field label="Address">
                <input
                  value={settings.address || ""}
                  onChange={(e) => setField("address", e.target.value)}
                  disabled={!canEdit}
                  style={inputStyle(t)}
                  placeholder="City, Philippines"
                />
              </Field>
            </div>
          </section>

          <section style={cardStyle(t)}>
            <div style={sectionTitle(t)}>System Toggles</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <Toggle
                t={t}
                label="Maintenance Mode"
                value={!!settings.maintenance_mode}
                onChange={onToggleMaintenance}
                disabled={!canEdit}
              />

              <Toggle
                t={t}
                label="Signup Enabled"
                value={!!settings.signup_enabled}
                onChange={(v) => setField("signup_enabled", v)}
                disabled={!canEdit}
              />

              <Toggle
                t={t}
                label="Owner Applications Enabled"
                value={!!settings.owner_application_enabled}
                onChange={(v) => setField("owner_application_enabled", v)}
                disabled={!canEdit}
              />
            </div>
          </section>

          <section style={cardStyle(t)}>
            <div style={sectionTitle(t)}>Social Links</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Facebook URL">
                <input
                  value={settings.facebook_url || ""}
                  onChange={(e) => setField("facebook_url", e.target.value)}
                  disabled={!canEdit}
                  style={inputStyle(t)}
                />
              </Field>

              <Field label="Instagram URL">
                <input
                  value={settings.instagram_url || ""}
                  onChange={(e) => setField("instagram_url", e.target.value)}
                  disabled={!canEdit}
                  style={inputStyle(t)}
                />
              </Field>

              <Field label="TikTok URL">
                <input
                  value={settings.tiktok_url || ""}
                  onChange={(e) => setField("tiktok_url", e.target.value)}
                  disabled={!canEdit}
                  style={inputStyle(t)}
                />
              </Field>

              <Field label="YouTube URL">
                <input
                  value={settings.youtube_url || ""}
                  onChange={(e) => setField("youtube_url", e.target.value)}
                  disabled={!canEdit}
                  style={inputStyle(t)}
                />
              </Field>

              <Field label="Twitter / X URL">
                <input
                  value={settings.twitter_url || ""}
                  onChange={(e) => setField("twitter_url", e.target.value)}
                  disabled={!canEdit}
                  style={inputStyle(t)}
                />
              </Field>

              <Field label="Website URL">
                <input
                  value={settings.website_url || ""}
                  onChange={(e) => setField("website_url", e.target.value)}
                  disabled={!canEdit}
                  style={inputStyle(t)}
                />
              </Field>
            </div>
          </section>
        </div>
      )}

      {!canEdit && (
        <div style={{ marginTop: 12, fontSize: 12, color: t.mutedText }}>
          You are logged in as <b>{me?.role}</b>. Only <b>superadmin</b> can edit these settings.
        </div>
      )}
    </div>
  );
}

function LogoBox({ t, url, emptyText }) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [url]);

  return (
    <div
      style={{
        width: 64,
        height: 64,
        borderRadius: 14,
        border: `1px solid ${t.border}`,
        background: t.soft,
        overflow: "hidden",
        display: "grid",
        placeItems: "center",
      }}
      title="Logo preview"
    >
      {url && !imgFailed ? (
        <img
          src={url}
          alt="Logo"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div style={{ fontSize: 11, color: t.mutedText, fontWeight: 800 }}>{emptyText}</div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.85 }}>{label}</div>
      {children}
    </div>
  );
}

function Toggle({ t, label, value, onChange, disabled }) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 12,
        border: `1px solid ${t.border}`,
        background: t.soft,
        color: t.text,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        userSelect: "none",
      }}
    >
      <input
        type="checkbox"
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        style={{
          width: 16,
          height: 16,
          accentColor: BRAND,
        }}
      />
      <span style={{ fontSize: 12, fontWeight: 800 }}>{label}</span>
    </label>
  );
}

function inputStyle(t) {
  return {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${t.border}`,
    background: t.soft,
    color: t.text,
    outline: "none",
    fontSize: 13,
    fontWeight: 600,
  };
}

function cardStyle(t) {
  return {
    border: `1px solid ${t.border}`,
    background: t.bg,
    borderRadius: 14,
    padding: 14,
  };
}

function sectionTitle(t) {
  return { fontWeight: 900, color: t.text, marginBottom: 10 };
}

function btnStyle(t, { primary = false, subtle = false, brand = false, disabled = false } = {}) {
  if (primary || brand) {
    return {
      borderRadius: 10,
      padding: "10px 12px",
      border: `1px solid ${BRAND}`,
      background: BRAND,
      color: "#fff",
      cursor: disabled ? "not-allowed" : "pointer",
      fontWeight: 900,
      fontSize: 12,
      opacity: disabled ? 0.6 : 1,
    };
  }

  const bg = subtle ? t.soft : t.soft;
  return {
    borderRadius: 10,
    padding: "10px 12px",
    border: `1px solid ${t.border}`,
    background: bg,
    color: t.text,
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 800,
    fontSize: 12,
    opacity: disabled ? 0.55 : 1,
  };
}