import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext, useNavigate, useLocation } from "react-router-dom";
import { adminThemes } from "./AdminLayout";

import { useAuthMe } from "../../utils/useAuthMe";
import { useApiList } from "../../utils/useApiList";
import {
  toggleSort,
  sortIndicator,
  sortRows,
  paginate,
  globalSearch,
  tableValue,
} from "../../utils/tableUtils";

import {
  createGym,
  updateGym,
  deleteGym,
  uploadGymImage,
  absoluteUrl,
  normalizeLatLng,
} from "../../utils/gymApi";

import MapPickerModal from "../../components/MapPickerModal";

import "./AdminEquipments.css";

function formatDateTimeFallback(value) {
  if (!value) return "-";
  const d = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

function toNumOrNull(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toBool(v) {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") return v.toLowerCase() === "true";
  return false;
}

function formatTimeForInput(value) {
  if (!value) return "";
  const s = String(value);
  const m = s.match(/\b(\d{2}):(\d{2})\b/);
  if (m) return `${m[1]}:${m[2]}`;
  return "";
}

export default function AdminGyms() {
  const { theme } = useOutletContext();
  const t = adminThemes[theme]?.app || adminThemes.light.app;
  const isDark = theme === "dark";

  const { isAdmin } = useAuthMe();

  const navigate = useNavigate();
  const location = useLocation();

  const { rows, loading: loadingRows, error, reload } = useApiList("/gyms", {
    authed: true,
    allPages: true,
    perPage: 10,
  });

  const [q, setQ] = useState("");

  const [gymType, setGymType] = useState("All");
  const [is24, setIs24] = useState("All");
  const [hasClasses, setHasClasses] = useState("All");
  const [isAir, setIsAir] = useState("All");

  const [sort, setSort] = useState({ key: "name", dir: "asc" });
  const pageSize = 10;
  const [page, setPage] = useState(1);

  const [previewImg, setPreviewImg] = useState(null);

  const [gymOpen, setGymOpen] = useState(false);
  const [gymMode, setGymMode] = useState("view");
  const [activeGym, setActiveGym] = useState(null);
  const [gymForm, setGymForm] = useState(null);
  const [gymBusy, setGymBusy] = useState(false);
  const [gymErr, setGymErr] = useState("");

  const [delOpen, setDelOpen] = useState(false);
  const [delBusy, setDelBusy] = useState(false);

  const [saveOpen, setSaveOpen] = useState(false);

  const [galleryUploading, setGalleryUploading] = useState(false);

  const [mapOpen, setMapOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setPreviewImg(null);
        setGymOpen(false);
        setDelOpen(false);
        setSaveOpen(false);
        setMapOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const gymTypes = useMemo(() => {
    const set = new Set(rows.map((r) => r.gym_type).filter(Boolean));
    return ["All", ...Array.from(set).sort()];
  }, [rows]);

  const searched = useMemo(() => {
    return globalSearch(rows, q, [
      (r) => r.gym_id,
      (r) => r.name,
      (r) => r.address,
      (r) => r.gym_type,
      (r) => r.contact_number,
      (r) => r.email,
    ]);
  }, [rows, q]);

  const filtered = useMemo(() => {
    const boolFilter = (mode, value) => {
      if (mode === "All") return true;
      return toBool(value) === (mode === "true");
    };

    return searched
      .filter((r) => (gymType === "All" ? true : r.gym_type === gymType))
      .filter((r) => boolFilter(is24, r.is_24_hours))
      .filter((r) => boolFilter(hasClasses, r.has_classes))
      .filter((r) => boolFilter(isAir, r.is_airconditioned));
  }, [searched, gymType, is24, hasClasses, isAir]);

  useEffect(() => {
    setPage(1);
  }, [q, gymType, is24, hasClasses, isAir]);

  const getValue = (r, key) => {
    switch (key) {
      case "name":
        return tableValue.str(r.name);
      case "type":
        return tableValue.str(r.gym_type);
      case "monthly":
        return tableValue.num(r.monthly_price);
      case "updated":
        return tableValue.dateMs(r.updated_at);
      case "id":
        return tableValue.num(r.gym_id);
      default:
        return "";
    }
  };

  const sorted = useMemo(() => sortRows(filtered, sort, getValue), [filtered, sort]);
  const { totalPages, safePage, pageRows, left, right } = useMemo(
    () => paginate(sorted, page, pageSize),
    [sorted, page]
  );

  const headerPills = useMemo(() => {
    const pills = [];
    pills.push(loadingRows ? "Loading…" : `${sorted.length} gyms`);
    if (gymType !== "All") pills.push(gymType);
    if (is24 !== "All") pills.push(is24 === "true" ? "24 Hours" : "Not 24H");
    if (hasClasses !== "All") pills.push(hasClasses === "true" ? "Has Classes" : "No Classes");
    if (isAir !== "All") pills.push(isAir === "true" ? "Aircon" : "No Aircon");
    return pills;
  }, [loadingRows, sorted.length, gymType, is24, hasClasses, isAir]);

  const cssVars = {
    "--bg": t.bg,
    "--text": t.text,
    "--mutedText": t.mutedText,
    "--border": t.border,
    "--soft": t.soft,
    "--soft2": t.soft2,
    "--shadow": t.shadow,
    "--main": "#d23f0b",
    "--isDark": isDark ? 1 : 0,
  };

  const modalTitle =
    gymMode === "add" ? "Add Gym" : gymMode === "edit" ? "Edit Gym" : "View Gym";

  const canEdit = isAdmin && (gymMode === "edit" || gymMode === "add");

  const openAdd = () => {
    setGymErr("");
    setGymMode("add");
    setActiveGym(null);
    setGymForm({
      name: "",
      description: "",
      address: "",
      latitude: "",
      longitude: "",
      daily_price: "",
      monthly_price: "",
      annual_price: "",
      opening_time: "",
      closing_time: "",
      gym_type: "",
      contact_number: "",
      email: "",
      website: "",
      facebook_page: "",
      instagram_page: "",
      main_image_url: "",
      mainImageFile: null,
      gallery_urls: [],
      galleryFiles: [],
      has_personal_trainers: false,
      has_classes: false,
      is_24_hours: false,
      is_airconditioned: false,
    });
    setGymOpen(true);
  };

  const openView = (r) => {
    setGymErr("");
    setGymMode("view");
    setActiveGym(r);

    setGymForm({
      name: r.name || "",
      description: r.description || "",
      address: r.address || "",
      latitude: r.latitude ?? "",
      longitude: r.longitude ?? "",
      daily_price: r.daily_price ?? "",
      monthly_price: r.monthly_price ?? "",
      annual_price: r.annual_price ?? "",
      opening_time: formatTimeForInput(r.opening_time),
      closing_time: formatTimeForInput(r.closing_time),
      gym_type: r.gym_type || "",
      contact_number: r.contact_number || "",
      email: r.email || "",
      website: r.website || "",
      facebook_page: r.facebook_page || "",
      instagram_page: r.instagram_page || "",
      main_image_url: r.main_image_url || "",
      mainImageFile: null,
      gallery_urls: Array.isArray(r.gallery_urls) ? r.gallery_urls : [],
      galleryFiles: [],
      has_personal_trainers: toBool(r.has_personal_trainers),
      has_classes: toBool(r.has_classes),
      is_24_hours: toBool(r.is_24_hours),
      is_airconditioned: toBool(r.is_airconditioned),
    });

    setGymOpen(true);
  };

  const openEdit = (r) => {
    openView(r);
    setGymMode("edit");
  };

  const askDelete = (r) => {
    setGymErr("");
    setActiveGym(r);
    setDelOpen(true);
  };

  const doDelete = async () => {
    if (!activeGym) return;
    setDelBusy(true);
    setGymErr("");
    try {
      await deleteGym(activeGym.gym_id);
      setDelOpen(false);
      setGymOpen(false);
      reload();
    } catch (e) {
      setGymErr(e.message || "Delete failed.");
    } finally {
      setDelBusy(false);
    }
  };

  const uploadMainIfNeeded = async () => {
    let main_image_url = String(gymForm.main_image_url || "").trim();
    if (gymForm.mainImageFile) {
      const up = await uploadGymImage(gymForm.mainImageFile, "covers");
      main_image_url = up.url;
    }
    return main_image_url || null;
  };

  const uploadGalleryIfNeeded = async () => {
    const existing = Array.isArray(gymForm.gallery_urls) ? gymForm.gallery_urls : [];
    const files = Array.isArray(gymForm.galleryFiles) ? gymForm.galleryFiles : [];
    if (!files.length) return existing;

    setGalleryUploading(true);
    try {
      const uploadedUrls = [];
      for (const f of files) {
        const up = await uploadGymImage(f, "gallery");
        uploadedUrls.push(up.url);
      }
      return [...existing, ...uploadedUrls].filter(Boolean);
    } finally {
      setGalleryUploading(false);
    }
  };

  const saveGym = async () => {
    if (!gymForm) return;

    const name = String(gymForm.name || "").trim();
    const address = String(gymForm.address || "").trim();

    if (!name) return setGymErr("Name is required.");
    if (!address) return setGymErr("Address is required.");

    const monthly = toNumOrNull(gymForm.monthly_price);
    if (monthly === null) return setGymErr("Monthly price is required (number).");

    let latitude = toNumOrNull(gymForm.latitude);
    let longitude = toNumOrNull(gymForm.longitude);

    if (typeof normalizeLatLng === "function") {
      const norm = normalizeLatLng(latitude, longitude);
      latitude = norm?.latitude ?? latitude;
      longitude = norm?.longitude ?? longitude;
    }

    if (latitude !== null && (latitude < -90 || latitude > 90))
      return setGymErr("Latitude must be between -90 and 90.");
    if (longitude !== null && (longitude < -180 || longitude > 180))
      return setGymErr("Longitude must be between -180 and 180.");

    setGymBusy(true);
    setGymErr("");

    try {
      const main_image_url = await uploadMainIfNeeded();
      const gallery_urls = await uploadGalleryIfNeeded();

      const payload = {
        name,
        description: String(gymForm.description || "").trim() || null,
        address,
        latitude,
        longitude,
        daily_price: toNumOrNull(gymForm.daily_price),
        monthly_price: monthly,
        annual_price: toNumOrNull(gymForm.annual_price),
        opening_time: String(gymForm.opening_time || "").trim() || null,
        closing_time: String(gymForm.closing_time || "").trim() || null,
        gym_type: String(gymForm.gym_type || "").trim() || null,
        contact_number: String(gymForm.contact_number || "").trim() || null,
        email: String(gymForm.email || "").trim() || null,
        website: String(gymForm.website || "").trim() || null,
        facebook_page: String(gymForm.facebook_page || "").trim() || null,
        instagram_page: String(gymForm.instagram_page || "").trim() || null,
        main_image_url,
        gallery_urls: gallery_urls?.length ? gallery_urls : null,
        has_personal_trainers: toBool(gymForm.has_personal_trainers),
        has_classes: toBool(gymForm.has_classes),
        is_24_hours: toBool(gymForm.is_24_hours),
        is_airconditioned: toBool(gymForm.is_airconditioned),
      };

      if (gymMode === "add") {
        await createGym(payload);
      } else if (gymMode === "edit") {
        if (!activeGym) throw new Error("No gym selected.");
        await updateGym(activeGym.gym_id, payload);
      } else {
        return;
      }

      setGymOpen(false);
      setSaveOpen(false);
      reload();
    } catch (e) {
      setGymErr(e.message || "Save failed.");
    } finally {
      setGymBusy(false);
    }
  };

  const currentMainPreviewUrl = gymForm?.mainImageFile
    ? URL.createObjectURL(gymForm.mainImageFile)
    : absoluteUrl(gymForm?.main_image_url);

  const canShowMainInlineTools =
    Boolean(gymForm?.main_image_url) || Boolean(gymForm?.mainImageFile);

  return (
    <div className="ae-page" data-theme={theme} style={cssVars}>
      <div className="ae-topRow">
        <div className="ae-titleWrap">
          <div className="ae-pageTitle">Gyms</div>

          <div className="ae-headerPills">
            {headerPills.map((p, idx) => (
              <span key={idx} className={idx === 0 ? "ae-pill" : "ae-pillMuted"}>
                {p}
              </span>
            ))}
          </div>
        </div>

        <div className="ae-topActions">
          <button className="ae-btn ae-btnSecondary" onClick={reload}>
            Reload
          </button>
        </div>
      </div>

      <div className="ae-panelOuter">
        <div className="ae-panel">
          <div className="ae-panelTop">
            <div className="ae-leftActions">
              {isAdmin ? (
                <button className="ae-btn ae-btnPrimary" onClick={openAdd}>
                  + Add Gym
                </button>
              ) : null}
            </div>

            <div className="ae-rightActions">
              <div className="ae-searchBox">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search gyms…"
                  className="ae-searchInput"
                />
                <span className="ae-searchIcon">⌕</span>
              </div>

              <select
                value={gymType}
                onChange={(e) => setGymType(e.target.value)}
                className="ae-select"
              >
                {gymTypes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={is24}
                onChange={(e) => setIs24(e.target.value)}
                className="ae-select"
              >
                <option value="All">24H: All</option>
                <option value="true">24H: Yes</option>
                <option value="false">24H: No</option>
              </select>

              <select
                value={hasClasses}
                onChange={(e) => setHasClasses(e.target.value)}
                className="ae-select"
              >
                <option value="All">Classes: All</option>
                <option value="true">Classes: Yes</option>
                <option value="false">Classes: No</option>
              </select>

              <select value={isAir} onChange={(e) => setIsAir(e.target.value)} className="ae-select">
                <option value="All">Aircon: All</option>
                <option value="true">Aircon: Yes</option>
                <option value="false">Aircon: No</option>
              </select>
            </div>
          </div>

          <div className="ae-tableWrap">
            {error ? (
              <div className="ae-errorBox">{error}</div>
            ) : (
              <table className="ae-table">
                <thead>
                  <tr>
                    <th
                      className="ae-th ae-thClickable"
                      onClick={() => setSort((p) => toggleSort(p, "name"))}
                    >
                      Gym{sortIndicator(sort, "name")}
                    </th>
                    <th
                      className="ae-th ae-thClickable"
                      onClick={() => setSort((p) => toggleSort(p, "type"))}
                    >
                      Type{sortIndicator(sort, "type")}
                    </th>
                    <th className="ae-th">Location</th>
                    <th
                      className="ae-th ae-thClickable"
                      onClick={() => setSort((p) => toggleSort(p, "monthly"))}
                    >
                      Monthly{sortIndicator(sort, "monthly")}
                    </th>
                    <th
                      className="ae-th ae-thClickable"
                      onClick={() => setSort((p) => toggleSort(p, "updated"))}
                    >
                      Updated{sortIndicator(sort, "updated")}
                    </th>
                    <th className="ae-th ae-thRight" />
                  </tr>
                </thead>

                <tbody>
                  {loadingRows ? (
                    <tr>
                      <td className="ae-td" colSpan={6}>
                        Loading…
                      </td>
                    </tr>
                  ) : pageRows.length === 0 ? (
                    <tr>
                      <td className="ae-td" colSpan={6}>
                        No results.
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((r) => (
                      <tr className="ae-tr" key={r.gym_id}>
                        <td className="ae-td">
                          <div className="ae-equipCell">
                            <div className="ae-imgBox">
                              {r.main_image_url ? (
                                <img
                                  src={absoluteUrl(r.main_image_url)}
                                  alt={r.name}
                                  className="ae-img"
                                  onClick={() =>
                                    setPreviewImg({ src: absoluteUrl(r.main_image_url), name: r.name || "gym" })
                                  }
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              ) : (
                                <span className="ae-mutedTiny">N/A</span>
                              )}
                            </div>

                            <div className="ae-equipMeta">
                              <div className="ae-equipName">{r.name || "-"}</div>
                              <div className="ae-mutedTiny">ID: {r.gym_id}</div>
                            </div>
                          </div>
                        </td>

                        <td className="ae-td">{r.gym_type || "-"}</td>
                        <td className="ae-td">
                          <div className="ae-locCell">
                            <div
                              className="ae-mutedTiny ae-locAddress"
                              data-full={r.address || "-"}
                            >
                              {r.address || "-"}
                            </div>

                            <div className="ae-mutedTiny">
                              {r.latitude && r.longitude
                                ? `${r.latitude}, ${r.longitude}`
                                : "No coordinates"}
                            </div>
                          </div>
                        </td>

                        <td className="ae-td">{r.monthly_price ?? "-"}</td>
                        <td className="ae-td ae-mutedCell">{formatDateTimeFallback(r.updated_at)}</td>

                        <td className="ae-td ae-tdRight">
                          <div className="ae-actionsInline">
                            <IconBtn
                              title="View"
                              className="ae-iconBtn"
                              onClick={() =>
                                navigate(`/admin/gyms/${r.gym_id}`, {
                                  state: { from: location.pathname + location.search },
                                })
                              }
                            >
                              👁
                            </IconBtn>

                            {isAdmin ? (
                              <>
                                <IconBtn title="Edit" className="ae-iconBtn" onClick={() => openEdit(r)}>
                                  ✎
                                </IconBtn>
                                <IconBtn title="Delete" className="ae-iconBtnDanger" onClick={() => askDelete(r)}>
                                  🗑
                                </IconBtn>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div className="ae-pagerRow">
            <button
              className="ae-btn ae-btnSecondary"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>

            <div className="ae-mutedSmall">
              Page <b className="ae-strongText">{safePage}</b> of{" "}
              <b className="ae-strongText">{totalPages}</b>
            </div>

            <button
              className="ae-btn ae-btnSecondary"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>

            <div className="ae-pagerRight">
              <span className="ae-mutedSmall">
                Showing <b className="ae-strongText">{left}-{right}</b> of{" "}
                <b className="ae-strongText">{sorted.length}</b>
              </span>
            </div>
          </div>
        </div>
      </div>

      {previewImg && (
        <div className="ae-backdrop ae-backdropTop" onClick={() => setPreviewImg(null)}>
          <div className="ae-modalContent" onClick={(e) => e.stopPropagation()}>
            <img src={previewImg.src} alt={previewImg.name} className="ae-modalImg" />
            <div className="ae-modalActions">
              <a href={previewImg.src} download className="ae-linkReset">
                <span className="ae-btn ae-btnPrimary">Download</span>
              </a>
              <button className="ae-btn ae-btnSecondary" onClick={() => setPreviewImg(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {gymOpen && gymForm && (
        <div
          className="ae-backdrop"
          onClick={() => setGymOpen(false)}
          style={{ overflow: "auto", padding: "24px 12px" }}
        >
          <div
            className="ae-formModal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: "calc(100vh - 64px)", overflow: "auto" }}
          >
            <div className="ae-modalTopRow">
              <div className="ae-modalTitle">{modalTitle}</div>
            </div>

            {gymErr ? <div className="ae-alert ae-alertError">{gymErr}</div> : null}

            <div className="ae-formGrid">
              <Field
                label="Name"
                value={gymForm.name}
                disabled={!canEdit}
                onChange={(v) => setGymForm((p) => ({ ...p, name: v }))}
              />

              <Field
                label="Gym type"
                value={gymForm.gym_type}
                disabled={!canEdit}
                onChange={(v) => setGymForm((p) => ({ ...p, gym_type: v }))}
              />

              <Field
                label="Address"
                value={gymForm.address}
                disabled={!canEdit}
                onChange={(v) => setGymForm((p) => ({ ...p, address: v }))}
                full
              />

              <Field
                label="Latitude"
                value={String(gymForm.latitude ?? "")}
                disabled={!canEdit}
                onChange={(v) => setGymForm((p) => ({ ...p, latitude: v }))}
              />

              <Field
                label="Longitude"
                value={String(gymForm.longitude ?? "")}
                disabled={!canEdit}
                onChange={(v) => setGymForm((p) => ({ ...p, longitude: v }))}
              />

              <div className="ae-field ae-fieldFull">
                <div className="ae-fieldLabel">Map</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <button
                    type="button"
                    className="ae-btn ae-btnSecondary"
                    disabled={!canEdit}
                    onClick={() => setMapOpen(true)}
                  >
                    Pick on map
                  </button>

                  <div className="ae-mutedTiny">
                    Current:{" "}
                    <b className="ae-strongText">
                      {gymForm.latitude && gymForm.longitude ? `${gymForm.latitude}, ${gymForm.longitude}` : "—"}
                    </b>
                  </div>
                </div>
              </div>

              <Field
                label="Daily price"
                value={String(gymForm.daily_price ?? "")}
                disabled={!canEdit}
                onChange={(v) => setGymForm((p) => ({ ...p, daily_price: v }))}
              />
              <Field
                label="Monthly price (required)"
                value={String(gymForm.monthly_price ?? "")}
                disabled={!canEdit}
                onChange={(v) => setGymForm((p) => ({ ...p, monthly_price: v }))}
              />
              <Field
                label="Annual price"
                value={String(gymForm.annual_price ?? "")}
                disabled={!canEdit}
                onChange={(v) => setGymForm((p) => ({ ...p, annual_price: v }))}
              />

              <TimeField
                label="Opening time"
                value={gymForm.opening_time}
                disabled={!canEdit}
                onChange={(v) => setGymForm((p) => ({ ...p, opening_time: v }))}
              />
              <TimeField
                label="Closing time"
                value={gymForm.closing_time}
                disabled={!canEdit}
                onChange={(v) => setGymForm((p) => ({ ...p, closing_time: v }))}
              />

              <Field
                label="Contact number"
                value={gymForm.contact_number}
                disabled={!canEdit}
                onChange={(v) => setGymForm((p) => ({ ...p, contact_number: v }))}
              />
              <Field
                label="Email"
                value={gymForm.email}
                disabled={!canEdit}
                onChange={(v) => setGymForm((p) => ({ ...p, email: v }))}
              />
              <Field
                label="Website"
                value={gymForm.website}
                disabled={!canEdit}
                onChange={(v) => setGymForm((p) => ({ ...p, website: v }))}
                full
              />
              <Field
                label="Facebook page"
                value={gymForm.facebook_page}
                disabled={!canEdit}
                onChange={(v) => setGymForm((p) => ({ ...p, facebook_page: v }))}
                full
              />
              <Field
                label="Instagram page"
                value={gymForm.instagram_page}
                disabled={!canEdit}
                onChange={(v) => setGymForm((p) => ({ ...p, instagram_page: v }))}
                full
              />

              <label className="ae-field ae-fieldFull">
                <div className="ae-fieldLabel">Description</div>
                <textarea
                  value={gymForm.description}
                  disabled={!canEdit}
                  onChange={(e) => setGymForm((p) => ({ ...p, description: e.target.value }))}
                  className={`ae-fieldInput ${!canEdit ? "ae-fieldInputDisabled" : ""}`}
                  style={{ minHeight: 90, resize: "vertical", paddingTop: 10 }}
                />
              </label>

              <label className="ae-field ae-fieldFull">
                <div className="ae-fieldLabel">Main Image File</div>
                <input
                  type="file"
                  accept="image/*"
                  disabled={!canEdit}
                  className={`ae-fieldInput ${!canEdit ? "ae-fieldInputDisabled" : ""}`}
                  style={{ paddingTop: 9 }}
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setGymForm((p) => ({ ...p, mainImageFile: f }));
                  }}
                />
              </label>

              <Field
                label="Main Image URL (optional)"
                value={gymForm.main_image_url}
                disabled={!canEdit}
                onChange={(v) => setGymForm((p) => ({ ...p, main_image_url: v }))}
                full
              />

              <label className="ae-field ae-fieldFull">
                <div className="ae-fieldLabel">Gallery Files (multiple)</div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={!canEdit}
                  className={`ae-fieldInput ${!canEdit ? "ae-fieldInputDisabled" : ""}`}
                  style={{ paddingTop: 9 }}
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setGymForm((p) => ({ ...p, galleryFiles: files }));
                  }}
                />
                <div className="ae-mutedTiny" style={{ marginTop: 6 }}>
                  {gymForm.galleryFiles?.length
                    ? `${gymForm.galleryFiles.length} file(s) ready to upload on Save`
                    : "Optional"}
                </div>
              </label>

              <GalleryList
                urls={gymForm.gallery_urls || []}
                disabled={!canEdit}
                onRemove={(idx) =>
                  setGymForm((p) => ({
                    ...p,
                    gallery_urls: (p.gallery_urls || []).filter((_, i) => i !== idx),
                  }))
                }
                onPreview={(url) => setPreviewImg({ src: absoluteUrl(url), name: gymForm.name || "gym" })}
              />

              <SwitchRow
                disabled={!canEdit}
                items={[
                  { key: "has_personal_trainers", label: "Has personal trainers", value: gymForm.has_personal_trainers },
                  { key: "has_classes", label: "Has classes", value: gymForm.has_classes },
                  { key: "is_24_hours", label: "24 hours", value: gymForm.is_24_hours },
                  { key: "is_airconditioned", label: "Airconditioned", value: gymForm.is_airconditioned },
                ]}
                onToggle={(key) => setGymForm((p) => ({ ...p, [key]: !p[key] }))}
              />
            </div>

            {canShowMainInlineTools ? (
              <div className="ae-inlineTools">
                <button
                  className="ae-btn ae-btnSecondary"
                  onClick={() => setPreviewImg({ src: currentMainPreviewUrl, name: gymForm.name || "gym" })}
                >
                  Preview main image
                </button>

                {gymForm.main_image_url ? (
                  <a href={absoluteUrl(gymForm.main_image_url)} download className="ae-linkReset">
                    <span className="ae-btn ae-btnPrimary">Download image</span>
                  </a>
                ) : null}
              </div>
            ) : null}

            <div className="ae-modalFooter">
              {gymMode === "view" ? (
                isAdmin ? (
                  <>
                    <button className="ae-btn ae-btnSecondary" onClick={() => askDelete(activeGym)}>
                      Delete
                    </button>
                    <button className="ae-btn ae-btnPrimary" onClick={() => setGymMode("edit")}>
                      Edit
                    </button>
                  </>
                ) : (
                  <button className="ae-btn ae-btnSecondary" onClick={() => setGymOpen(false)}>
                    Close
                  </button>
                )
              ) : (
                <>
                  <button
                    className="ae-btn ae-btnSecondary"
                    onClick={() => {
                      setGymErr("");
                      setSaveOpen(false);
                      if (gymMode === "add") setGymOpen(false);
                      else setGymMode("view");
                    }}
                    disabled={gymBusy}
                  >
                    Cancel
                  </button>

                  <button
                    className="ae-btn ae-btnPrimary"
                    onClick={() => setSaveOpen(true)}
                    disabled={gymBusy || galleryUploading}
                  >
                    {gymBusy ? "Saving…" : galleryUploading ? "Uploading…" : "Save"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <MapPickerModal
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        initialLat={gymForm?.latitude}
        initialLng={gymForm?.longitude}
        onConfirm={({ latitude, longitude, address }) => {
          let latNum = toNumOrNull(latitude);
          let lngNum = toNumOrNull(longitude);

          if (typeof normalizeLatLng === "function") {
            const norm = normalizeLatLng({ latitude: latNum, longitude: lngNum });
            latNum = norm?.latitude ?? latNum;
            lngNum = norm?.longitude ?? lngNum;
          }

          setGymForm((p) => ({
            ...p,
            latitude: latNum ?? latitude,
            longitude: lngNum ?? longitude,
            address: String(address ?? ""),
          }));
        }}
      />

      {saveOpen && gymOpen && gymForm && (
        <div className="ae-backdrop ae-backdropTop" onClick={() => setSaveOpen(false)}>
          <div className="ae-confirmModalFancy" onClick={(e) => e.stopPropagation()}>
            <div className="ae-confirmHeader">
              <div className="ae-confirmIconWrap" aria-hidden="true">
                ✅
              </div>

              <div className="ae-confirmHeaderText">
                <div className="ae-confirmTitle">{gymMode === "add" ? "Create gym?" : "Confirm changes?"}</div>
              </div>

              <button className="ae-modalClose" onClick={() => setSaveOpen(false)}>
                ✕
              </button>
            </div>

            {gymErr ? <div className="ae-alert ae-alertError">{gymErr}</div> : null}

            <div className="ae-confirmActions">
              <button className="ae-btn ae-btnSecondary" onClick={() => setSaveOpen(false)} disabled={gymBusy}>
                Cancel
              </button>

              <button className="ae-btn ae-btnPrimary" onClick={saveGym} disabled={gymBusy || galleryUploading}>
                {gymBusy
                  ? "Saving…"
                  : galleryUploading
                  ? "Uploading…"
                  : gymMode === "add"
                  ? "Yes, create"
                  : "Yes, save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {delOpen && activeGym && (
        <div className="ae-backdrop ae-backdropTop" onClick={() => setDelOpen(false)}>
          <div className="ae-confirmModalFancy" onClick={(e) => e.stopPropagation()}>
            <div className="ae-confirmHeader">
              <div className="ae-confirmIconWrap" aria-hidden="true">
                ⚠️
              </div>

              <div className="ae-confirmHeaderText">
                <div className="ae-confirmTitle">Delete gym?</div>
                <div className="ae-mutedTiny">
                  This will permanently remove <b className="ae-strongText">{activeGym.name}</b>. This can’t be undone.
                </div>
              </div>

              <button className="ae-modalClose" onClick={() => setDelOpen(false)}>
                ✕
              </button>
            </div>

            {gymErr ? <div className="ae-alert ae-alertError">{gymErr}</div> : null}

            <div className="ae-confirmActions">
              <button className="ae-btn ae-btnSecondary" onClick={() => setDelOpen(false)} disabled={delBusy}>
                Keep it
              </button>

              <button className="ae-btn ae-btnDanger" onClick={doDelete} disabled={delBusy}>
                <span className="ae-btnIcon" aria-hidden="true">
                  🗑
                </span>
                {delBusy ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="ae-spacer" />
    </div>
  );
}

function IconBtn({ children, title, className, onClick }) {
  return (
    <button type="button" title={title} onClick={onClick} className={className}>
      {children}
    </button>
  );
}

function Field({ label, value, onChange, disabled, full }) {
  return (
    <label className={`ae-field ${full ? "ae-fieldFull" : ""}`}>
      <div className="ae-fieldLabel">{label}</div>
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`ae-fieldInput ${disabled ? "ae-fieldInputDisabled" : ""}`}
      />
    </label>
  );
}

function TimeField({ label, value, onChange, disabled }) {
  return (
    <label className="ae-field">
      <div className="ae-fieldLabel">{label}</div>
      <input
        type="time"
        value={value || ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`ae-fieldInput ${disabled ? "ae-fieldInputDisabled" : ""}`}
      />
    </label>
  );
}

function SwitchRow({ items, onToggle, disabled }) {
  return (
    <div className="ae-field ae-fieldFull">
      <div className="ae-fieldLabel">Features</div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        {items.map((it) => (
          <label
            key={it.key}
            className="ae-pillMuted"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 12,
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.7 : 1,
            }}
            onClick={() => {
              if (!disabled) onToggle(it.key);
            }}
          >
            <span style={{ fontSize: 13 }}>{it.label}</span>
            <input
              type="checkbox"
              checked={!!it.value}
              disabled={disabled}
              onChange={() => {
                if (!disabled) onToggle(it.key);
              }}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function GalleryList({ urls, onRemove, disabled, onPreview }) {
  const list = Array.isArray(urls) ? urls : [];

  if (!list.length) {
    return (
      <div className="ae-field ae-fieldFull">
        <div className="ae-fieldLabel">Gallery</div>
        <div className="ae-mutedTiny">No gallery images yet.</div>
      </div>
    );
  }

  return (
    <div className="ae-field ae-fieldFull">
      <div className="ae-fieldLabel">Gallery</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
        {list.map((u, idx) => (
          <div
            key={`${u}-${idx}`}
            style={{
              border: "1px solid var(--border)",
              background: "var(--soft2)",
              borderRadius: 12,
              padding: 8,
              overflow: "hidden",
            }}
          >
            <div style={{ width: "100%", aspectRatio: "16/10", borderRadius: 10, overflow: "hidden" }}>
              <img
                src={absoluteUrl(u)}
                alt={`gallery-${idx}`}
                style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }}
                onClick={() => onPreview(u)}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                type="button"
                className="ae-btn ae-btnSecondary"
                style={{ flex: 1 }}
                onClick={() => onPreview(u)}
              >
                Preview
              </button>

              <button
                type="button"
                className="ae-btn ae-btnDanger"
                disabled={disabled}
                onClick={() => onRemove(idx)}
                style={{ flex: 1 }}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}