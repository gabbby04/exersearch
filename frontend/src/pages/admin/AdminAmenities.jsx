// src/pages/admin/AdminAmenities.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
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
  createAmenity,
  updateAmenity,
  deleteAmenity,
  importAmenitiesCsv,
  uploadAmenityImage, // ✅ NEW (uses type=amenities)
  absoluteUrl,        // ✅ so /storage/... displays fine
} from "../../utils/amenityApi";

import "./AdminEquipments.css";

function formatDateTimeFallback(value) {
  if (!value) return "-";
  const d = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

function clampText(text, max = 64) {
  const s = String(text || "").trim();
  if (!s) return "-";
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

export default function AdminAmenities() {
  const { theme } = useOutletContext();
  const t = adminThemes[theme]?.app || adminThemes.light.app;
  const isDark = theme === "dark";

  const { isAdmin } = useAuthMe();
  const { rows, loading: loadingRows, error, reload } = useApiList("/amenities", {
    authed: true,
  });

  const [q, setQ] = useState("");

  const [sort, setSort] = useState({ key: "id", dir: "asc" });
  const pageSize = 10;
  const [page, setPage] = useState(1);

  // Image preview modal (top layer)
  const [previewImg, setPreviewImg] = useState(null);

  // Import CSV modal (optional)
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState("");

  // View/Edit/Add modal
  const [amenOpen, setAmenOpen] = useState(false);
  const [amenMode, setAmenMode] = useState("view"); // "view" | "edit" | "add"
  const [activeAmen, setActiveAmen] = useState(null);
  const [amenForm, setAmenForm] = useState(null);
  const [amenBusy, setAmenBusy] = useState(false);
  const [amenErr, setAmenErr] = useState("");

  // Delete confirm
  const [delOpen, setDelOpen] = useState(false);
  const [delBusy, setDelBusy] = useState(false);

  // Save confirm
  const [saveOpen, setSaveOpen] = useState(false);

  // Close modals on ESC
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setPreviewImg(null);
        setImportOpen(false);
        setAmenOpen(false);
        setDelOpen(false);
        setSaveOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // search
  const searched = useMemo(() => {
    return globalSearch(rows, q, [(r) => r.amenity_id, (r) => r.name, (r) => r.description]);
  }, [rows, q]);

  useEffect(() => setPage(1), [q]);

  // sort mapping
  const getValue = (r, key) => {
    switch (key) {
      case "amenity":
        return tableValue.str(r.name);
      case "desc":
        return tableValue.str(r.description);
      case "updated":
        return tableValue.dateMs(r.updated_at);
      case "id":
        return tableValue.num(r.amenity_id);
      default:
        return "";
    }
  };

  const sorted = useMemo(() => sortRows(searched, sort, getValue), [searched, sort]);
  const { totalPages, safePage, pageRows, left, right } = useMemo(
    () => paginate(sorted, page, pageSize),
    [sorted, page]
  );

  const headerPills = useMemo(() => {
    const pills = [];
    pills.push(loadingRows ? "Loading…" : `${sorted.length} items`);
    return pills;
  }, [loadingRows, sorted.length]);

  // --- Actions ---
  const openAdd = () => {
    setAmenErr("");
    setAmenMode("add");
    setActiveAmen(null);
    setAmenForm({
      name: "",
      description: "",
      image_url: "",
      imageFile: null,
    });
    setAmenOpen(true);
  };

  const openView = (r) => {
    setAmenErr("");
    setAmenMode("view");
    setActiveAmen(r);
    setAmenForm({
      name: r.name || "",
      description: r.description || "",
      image_url: r.image_url || "",
      imageFile: null,
    });
    setAmenOpen(true);
  };

  const openEdit = (r) => {
    setAmenErr("");
    setAmenMode("edit");
    setActiveAmen(r);
    setAmenForm({
      name: r.name || "",
      description: r.description || "",
      image_url: r.image_url || "",
      imageFile: null,
    });
    setAmenOpen(true);
  };

  const askDelete = (r) => {
    setAmenErr("");
    setActiveAmen(r);
    setDelOpen(true);
  };

  const doDelete = async () => {
    if (!activeAmen) return;
    setDelBusy(true);
    setAmenErr("");
    try {
      await deleteAmenity(activeAmen.amenity_id);
      setDelOpen(false);
      setAmenOpen(false);
      reload();
    } catch (e) {
      setAmenErr(e.message || "Delete failed.");
    } finally {
      setDelBusy(false);
    }
  };

  const saveAmenity = async () => {
    if (!amenForm) return;

    const name = String(amenForm.name || "").trim();
    const description = String(amenForm.description || "").trim();

    if (!name) {
      setAmenErr("Name is required.");
      return;
    }

    setAmenBusy(true);
    setAmenErr("");

    try {
      let image_url = String(amenForm.image_url || "").trim();

      // ✅ If user chose a file, upload first (type=amenities)
      if (amenForm.imageFile) {
        const uploaded = await uploadAmenityImage(amenForm.imageFile, "covers");
        image_url = uploaded?.url || ""; // controller returns { url: "/storage/..." }
      }

      const payload = {
        name,
        description: description || null,
        image_url: image_url || null,
      };

      if (amenMode === "add") {
        await createAmenity(payload);
      } else if (amenMode === "edit") {
        if (!activeAmen) throw new Error("No amenity selected.");
        await updateAmenity(activeAmen.amenity_id, payload);
      }

      setAmenOpen(false);
      setSaveOpen(false);
      reload();
    } catch (e) {
      setAmenErr(e.message || "Save failed.");
    } finally {
      setAmenBusy(false);
    }
  };

  const openImport = () => {
    setImportOpen(true);
    setImportFile(null);
    setImportResult(null);
    setImportError("");
  };

  const doImport = async () => {
    setImportError("");
    setImportResult(null);

    if (!importFile) {
      setImportError("Please choose a CSV file.");
      return;
    }

    setImporting(true);
    try {
      const data = await importAmenitiesCsv(importFile);
      setImportResult(data);
      setImportFile(null);
      reload();
    } catch (e) {
      setImportError(e.message || "Import failed.");
    } finally {
      setImporting(false);
    }
  };

  // CSS variables
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
    amenMode === "add" ? "Add Amenity" : amenMode === "edit" ? "Edit Amenity" : "View Amenity";

  const canEdit = isAdmin && (amenMode === "edit" || amenMode === "add");

  // ✅ File preview URL (and cleanup)
  const filePreviewUrl = useMemo(() => {
    if (!amenForm?.imageFile) return "";
    return URL.createObjectURL(amenForm.imageFile);
  }, [amenForm?.imageFile]);

  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    };
  }, [filePreviewUrl]);

  const currentImagePreviewUrl = amenForm?.imageFile
    ? filePreviewUrl
    : absoluteUrl(amenForm?.image_url || "");

  const canShowInlineTools = Boolean(currentImagePreviewUrl);

  return (
    <div className="ae-page" data-theme={theme} style={cssVars}>
      {/* HEADER ROW */}
      <div className="ae-topRow">
        <div className="ae-titleWrap">
          <div className="ae-pageTitle">Amenities</div>

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

      {/* PANEL */}
      <div className="ae-panelOuter">
        <div className="ae-panel">
          {/* TOP BAR */}
          <div className="ae-panelTop">
            <div className="ae-leftActions">
              {isAdmin ? (
                <>
                  <button className="ae-btn ae-btnPrimary" onClick={openAdd}>
                    + Add Amenity
                  </button>

                  <button className="ae-btn ae-btnSecondary" onClick={openImport}>
                    Import CSV
                  </button>
                </>
              ) : null}
            </div>

            <div className="ae-rightActions">
              <div className="ae-searchBox">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search amenities…"
                  className="ae-searchInput"
                />
                <span className="ae-searchIcon">⌕</span>
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div className="ae-tableWrap">
            {error ? (
              <div className="ae-errorBox">{error}</div>
            ) : (
              <table className="ae-table">
                <thead>
                  <tr>
                    <th
                      className="ae-th ae-thClickable"
                      onClick={() => setSort((p) => toggleSort(p, "amenity"))}
                    >
                      Amenity{sortIndicator(sort, "amenity")}
                    </th>

                    <th
                      className="ae-th ae-thClickable"
                      onClick={() => setSort((p) => toggleSort(p, "desc"))}
                    >
                      Description{sortIndicator(sort, "desc")}
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
                      <td className="ae-td" colSpan={4}>
                        Loading…
                      </td>
                    </tr>
                  ) : pageRows.length === 0 ? (
                    <tr>
                      <td className="ae-td" colSpan={4}>
                        No results.
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((r) => {
                      const img = absoluteUrl(r.image_url);
                      return (
                        <tr className="ae-tr" key={r.amenity_id}>
                          <td className="ae-td">
                            <div className="ae-equipCell">
                              <div className="ae-imgBox">
                                {img ? (
                                  <img
                                    src={img}
                                    alt={r.name}
                                    className="ae-img"
                                    onClick={() => setPreviewImg({ src: img, name: r.name || "amenity" })}
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
                                <div className="ae-mutedTiny">ID: {r.amenity_id}</div>
                              </div>
                            </div>
                          </td>

                          <td className="ae-td">{clampText(r.description, 70)}</td>

                          <td className="ae-td ae-mutedCell">
                            {formatDateTimeFallback(r.updated_at)}
                          </td>

                          <td className="ae-td ae-tdRight">
                            <div className="ae-actionsInline">
                              <IconBtn title="View" className="ae-iconBtn" onClick={() => openView(r)}>
                                👁
                              </IconBtn>

                              {isAdmin ? (
                                <>
                                  <IconBtn title="Edit" className="ae-iconBtn" onClick={() => openEdit(r)}>
                                    ✎
                                  </IconBtn>
                                  <IconBtn
                                    title="Delete"
                                    className="ae-iconBtnDanger"
                                    onClick={() => askDelete(r)}
                                  >
                                    🗑
                                  </IconBtn>
                                </>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* PAGINATION */}
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

      {/* IMAGE PREVIEW MODAL */}
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

      {/* IMPORT CSV MODAL */}
      {importOpen && (
        <div className="ae-backdrop" onClick={() => setImportOpen(false)}>
          <div className="ae-importModal" onClick={(e) => e.stopPropagation()}>
            <div className="ae-modalTopRow">
              <div className="ae-modalTitle">Import CSV</div>
            </div>

            <div className="ae-importHint">
              Required header: <b>name</b> • Optional: description, image_url
            </div>

            <label className="ae-fileBox">
              <input
                type="file"
                accept=".csv,text/csv"
                className="ae-fileInput"
                onChange={(e) => {
                  setImportResult(null);
                  setImportError("");
                  setImportFile(e.target.files?.[0] || null);
                }}
              />
              <div className="ae-fileName">{importFile ? importFile.name : "Choose CSV file"}</div>
              <div className="ae-mutedTiny">
                {importFile ? `${Math.round(importFile.size / 1024)} KB` : "Click to browse"}
              </div>
            </label>

            {importError ? <div className="ae-alert ae-alertError">{importError}</div> : null}

            {importResult ? (
              <div className="ae-alert ae-alertNeutral">
                <div className="ae-alertTitle">{importResult.message || "Import complete."}</div>
                <div className="ae-mutedTiny">
                  Inserted: <b className="ae-strongText">{importResult.inserted ?? 0}</b> • Skipped:{" "}
                  <b className="ae-strongText">{importResult.skipped ?? 0}</b>
                </div>

                {Array.isArray(importResult.errors) && importResult.errors.length > 0 ? (
                  <div className="ae-importErrors">
                    <div className="ae-importErrorsTitle">Some rows were skipped:</div>
                    <div className="ae-importErrorList">
                      {importResult.errors.slice(0, 8).map((er, idx) => (
                        <div key={idx} className="ae-importErrorItem">
                          Row {er.row}: {er.error}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="ae-modalFooter">
              <button className="ae-btn ae-btnSecondary" onClick={() => setImportOpen(false)} disabled={importing}>
                Close
              </button>

              <button className="ae-btn ae-btnPrimary" onClick={doImport} disabled={importing || !importFile}>
                {importing ? "Importing…" : "Import"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW / EDIT / ADD MODAL */}
      {amenOpen && amenForm && (
        <div className="ae-backdrop" onClick={() => setAmenOpen(false)}>
          <div className="ae-formModal" onClick={(e) => e.stopPropagation()}>
            <div className="ae-modalTopRow">
              <div className="ae-modalTitle">{modalTitle}</div>
            </div>

            {amenErr ? <div className="ae-alert ae-alertError">{amenErr}</div> : null}

            <div className="ae-formGrid">
              <Field
                label="Name"
                value={amenForm.name}
                disabled={!canEdit}
                onChange={(v) => setAmenForm((p) => ({ ...p, name: v }))}
              />

              <label className="ae-field">
                <div className="ae-fieldLabel">Image File</div>
                <input
                  type="file"
                  accept="image/*"
                  disabled={!canEdit}
                  className={`ae-fieldInput ${!canEdit ? "ae-fieldInputDisabled" : ""}`}
                  style={{ paddingTop: 9 }}
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setAmenForm((p) => ({ ...p, imageFile: f }));
                  }}
                />
              </label>

              <Field
                label="Description"
                value={amenForm.description}
                disabled={!canEdit}
                onChange={(v) => setAmenForm((p) => ({ ...p, description: v }))}
                full
              />

              <Field
                label="Image URL (optional)"
                value={amenForm.image_url}
                disabled={!canEdit}
                onChange={(v) => setAmenForm((p) => ({ ...p, image_url: v }))}
                full
              />
            </div>

            {canShowInlineTools ? (
              <div className="ae-inlineTools">
                <button
                  className="ae-btn ae-btnSecondary"
                  onClick={() =>
                    setPreviewImg({ src: currentImagePreviewUrl, name: amenForm.name || "amenity" })
                  }
                >
                  Preview image
                </button>

                {/* Only download if it's a real URL (not blob) */}
                {amenForm.image_url ? (
                  <a href={absoluteUrl(amenForm.image_url)} download className="ae-linkReset">
                    <span className="ae-btn ae-btnPrimary">Download image</span>
                  </a>
                ) : null}
              </div>
            ) : null}

            <div className="ae-modalFooter">
              {amenMode === "view" ? (
                isAdmin ? (
                  <>
                    <button className="ae-btn ae-btnSecondary" onClick={() => askDelete(activeAmen)}>
                      Delete
                    </button>
                    <button className="ae-btn ae-btnPrimary" onClick={() => setAmenMode("edit")}>
                      Edit
                    </button>
                  </>
                ) : (
                  <button className="ae-btn ae-btnSecondary" onClick={() => setAmenOpen(false)}>
                    Close
                  </button>
                )
              ) : (
                <>
                  <button
                    className="ae-btn ae-btnSecondary"
                    onClick={() => {
                      setAmenErr("");
                      setSaveOpen(false);
                      if (amenMode === "add") setAmenOpen(false);
                      else setAmenMode("view");
                    }}
                    disabled={amenBusy}
                  >
                    Cancel
                  </button>

                  <button className="ae-btn ae-btnPrimary" onClick={() => setSaveOpen(true)} disabled={amenBusy}>
                    {amenBusy ? "Saving…" : "Save"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM SAVE */}
      {saveOpen && amenOpen && amenForm && (
        <div className="ae-backdrop ae-backdropTop" onClick={() => setSaveOpen(false)}>
          <div className="ae-confirmModalFancy" onClick={(e) => e.stopPropagation()}>
            <div className="ae-confirmHeader">
              <div className="ae-confirmIconWrap" aria-hidden="true">✅</div>
              <div className="ae-confirmHeaderText">
                <div className="ae-confirmTitle">{amenMode === "add" ? "Create amenity?" : "Confirm changes?"}</div>
                <div className="ae-mutedTiny">
                  {amenMode === "add" ? (
                    <>You’re about to add <b className="ae-strongText">{amenForm.name || "this amenity"}</b>.</>
                  ) : (
                    <>You’re about to update <b className="ae-strongText">{activeAmen?.name || "this amenity"}</b>.</>
                  )}
                </div>
              </div>

              <button className="ae-modalClose" onClick={() => setSaveOpen(false)}>✕</button>
            </div>

            {amenErr ? <div className="ae-alert ae-alertError">{amenErr}</div> : null}

            <div className="ae-confirmActions">
              <button className="ae-btn ae-btnSecondary" onClick={() => setSaveOpen(false)} disabled={amenBusy}>
                Cancel
              </button>

              <button className="ae-btn ae-btnPrimary" onClick={saveAmenity} disabled={amenBusy}>
                {amenBusy ? "Saving…" : amenMode === "add" ? "Yes, create" : "Yes, save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {delOpen && activeAmen && (
        <div className="ae-backdrop ae-backdropTop" onClick={() => setDelOpen(false)}>
          <div className="ae-confirmModalFancy" onClick={(e) => e.stopPropagation()}>
            <div className="ae-confirmHeader">
              <div className="ae-confirmIconWrap" aria-hidden="true">⚠️</div>

              <div className="ae-confirmHeaderText">
                <div className="ae-confirmTitle">Delete amenity?</div>
                <div className="ae-mutedTiny">
                  This will permanently remove <b className="ae-strongText">{activeAmen.name}</b>. This can’t be undone.
                </div>
              </div>

              <button className="ae-modalClose" onClick={() => setDelOpen(false)}>✕</button>
            </div>

            {amenErr ? <div className="ae-alert ae-alertError">{amenErr}</div> : null}

            <div className="ae-confirmActions">
              <button className="ae-btn ae-btnSecondary" onClick={() => setDelOpen(false)} disabled={delBusy}>
                Keep it
              </button>

              <button className="ae-btn ae-btnDanger" onClick={doDelete} disabled={delBusy}>
                <span className="ae-btnIcon" aria-hidden="true">🗑</span>
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
