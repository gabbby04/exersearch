// src/pages/admin/AdminEquipments.jsx
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
  createEquipment,
  uploadEquipmentImage,
  updateEquipment,
  deleteEquipment,
  importEquipmentsCsv,
  absoluteUrl,
} from "../../utils/equipmentApi";

import "./AdminEquipments.css";

function formatDateTimeFallback(value) {
  if (!value) return "-";
  const d = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

// ✅ Postgres enum values (match your CREATE TYPE)
const CATEGORY_OPTIONS = [
  "Cardio",
  "Strength",
  "Machine",
  "Free Weight",
  "Flexibility",
  "Functional",
];

const DIFFICULTY_OPTIONS = ["Beginner", "Intermediate", "Advanced"];

export default function AdminEquipments() {
  const { theme } = useOutletContext();
  const t = adminThemes[theme]?.app || adminThemes.light.app;
  const isDark = theme === "dark";

  const { isAdmin } = useAuthMe();
  const { rows, loading: loadingRows, error, reload } = useApiList("/equipments", {
    authed: true,
  });

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [difficulty, setDifficulty] = useState("All");

  const [sort, setSort] = useState({ key: "id", dir: "asc" });
  const pageSize = 10;
  const [page, setPage] = useState(1);

  const [previewImg, setPreviewImg] = useState(null);

  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState("");

  const [equipOpen, setEquipOpen] = useState(false);
  const [equipMode, setEquipMode] = useState("view"); // view | edit | add
  const [activeEquip, setActiveEquip] = useState(null);
  const [equipForm, setEquipForm] = useState(null);
  const [equipBusy, setEquipBusy] = useState(false);
  const [equipErr, setEquipErr] = useState("");

  const [delOpen, setDelOpen] = useState(false);
  const [delBusy, setDelBusy] = useState(false);

  const [saveOpen, setSaveOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setPreviewImg(null);
        setImportOpen(false);
        setEquipOpen(false);
        setDelOpen(false);
        setSaveOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Filters dropdowns (based on existing rows)
  const categories = useMemo(() => {
    const set = new Set(rows.map((r) => r.category).filter(Boolean));
    return ["All", ...Array.from(set).sort()];
  }, [rows]);

  const difficulties = useMemo(() => {
    const set = new Set(rows.map((r) => r.difficulty).filter(Boolean));
    return ["All", ...Array.from(set).sort()];
  }, [rows]);

  const searched = useMemo(() => {
    return globalSearch(rows, q, [
      (r) => r.equipment_id,
      (r) => r.name,
      (r) => r.category,
      (r) => r.difficulty,
      (r) => r.target_muscle_group,
    ]);
  }, [rows, q]);

  const filtered = useMemo(() => {
    return searched
      .filter((r) => (category === "All" ? true : r.category === category))
      .filter((r) => (difficulty === "All" ? true : r.difficulty === difficulty));
  }, [searched, category, difficulty]);

  useEffect(() => {
    setPage(1);
  }, [q, category, difficulty]);

  const getValue = (r, key) => {
    switch (key) {
      case "equipment":
        return tableValue.str(r.name);
      case "category":
        return tableValue.str(r.category);
      case "difficulty":
        return tableValue.str(r.difficulty);
      case "target":
        return tableValue.str(r.target_muscle_group);
      case "updated":
        return tableValue.dateMs(r.updated_at);
      case "id":
        return tableValue.num(r.equipment_id);
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
    pills.push(loadingRows ? "Loading…" : `${sorted.length} items`);
    if (category !== "All") pills.push(category);
    if (difficulty !== "All") pills.push(difficulty);
    return pills;
  }, [loadingRows, sorted.length, category, difficulty]);

  const openAdd = () => {
    setEquipErr("");
    setEquipMode("add");
    setActiveEquip(null);
    setEquipForm({
      name: "",
      category: "",
      difficulty: "",
      target_muscle_group: "",
      image_url: "",
      imageFile: null,
    });
    setEquipOpen(true);
  };

  const openView = (r) => {
    setEquipErr("");
    setEquipMode("view");
    setActiveEquip(r);
    setEquipForm({
      name: r.name || "",
      category: r.category || "",
      difficulty: r.difficulty || "",
      target_muscle_group: r.target_muscle_group || "",
      image_url: r.image_url || "",
      imageFile: null,
    });
    setEquipOpen(true);
  };

  const openEdit = (r) => {
    setEquipErr("");
    setEquipMode("edit");
    setActiveEquip(r);
    setEquipForm({
      name: r.name || "",
      category: r.category || "",
      difficulty: r.difficulty || "",
      target_muscle_group: r.target_muscle_group || "",
      image_url: r.image_url || "",
      imageFile: null,
    });
    setEquipOpen(true);
  };

  const askDelete = (r) => {
    setEquipErr("");
    setActiveEquip(r);
    setDelOpen(true);
  };

  const doDelete = async () => {
    if (!activeEquip) return;
    setDelBusy(true);
    setEquipErr("");
    try {
      await deleteEquipment(activeEquip.equipment_id);
      setDelOpen(false);
      setEquipOpen(false);
      reload();
    } catch (e) {
      setEquipErr(e.message || "Delete failed.");
    } finally {
      setDelBusy(false);
    }
  };

  const saveEquip = async () => {
    if (!equipForm) return;

    const name = String(equipForm.name || "").trim();
    if (!name) {
      setEquipErr("Name is required.");
      return;
    }

    // Optional: enforce enum values on client too
    const cat = String(equipForm.category || "").trim();
    const diff = String(equipForm.difficulty || "").trim();
    if (cat && !CATEGORY_OPTIONS.includes(cat)) {
      setEquipErr("Invalid category.");
      return;
    }
    if (diff && !DIFFICULTY_OPTIONS.includes(diff)) {
      setEquipErr("Invalid difficulty.");
      return;
    }

    setEquipBusy(true);
    setEquipErr("");

    try {
      let image_url = String(equipForm.image_url || "").trim();

      if (equipForm.imageFile) {
        const up = await uploadEquipmentImage(equipForm.imageFile, "covers");
        image_url = up.url;
      }

      const payload = {
        name,
        category: cat || null,
        difficulty: diff || null,
        target_muscle_group: String(equipForm.target_muscle_group || "").trim() || null,
        image_url: image_url || null,
      };

      if (equipMode === "add") {
        await createEquipment(payload);
      } else if (equipMode === "edit") {
        if (!activeEquip) throw new Error("No equipment selected.");
        await updateEquipment(activeEquip.equipment_id, payload);
      } else {
        return;
      }

      setEquipOpen(false);
      setSaveOpen(false);
      reload();
    } catch (e) {
      setEquipErr(e.message || "Save failed.");
    } finally {
      setEquipBusy(false);
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
      const data = await importEquipmentsCsv(importFile);
      setImportResult(data);
      setImportFile(null);
      reload();
    } catch (e) {
      setImportError(e.message || "Import failed.");
    } finally {
      setImporting(false);
    }
  };

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
    equipMode === "add"
      ? "Add Equipment"
      : equipMode === "edit"
      ? "Edit Equipment"
      : "View Equipment";

  const canEdit = isAdmin && (equipMode === "edit" || equipMode === "add");

  const currentImagePreviewUrl = equipForm?.imageFile
    ? URL.createObjectURL(equipForm.imageFile)
    : absoluteUrl(equipForm?.image_url);

  const canShowInlineTools = Boolean(equipForm?.image_url) || Boolean(equipForm?.imageFile);

  return (
    <div className="ae-page" data-theme={theme} style={cssVars}>
      <div className="ae-topRow">
        <div className="ae-titleWrap">
          <div className="ae-pageTitle">Equipments</div>

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
                <>
                  <button className="ae-btn ae-btnPrimary" onClick={openAdd}>
                    + Add Equipment
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
                  placeholder="Search equipments…"
                  className="ae-searchInput"
                />
                <span className="ae-searchIcon">⌕</span>
              </div>

              <select value={category} onChange={(e) => setCategory(e.target.value)} className="ae-select">
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="ae-select">
                {difficulties.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
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
                    <th className="ae-th ae-thClickable" onClick={() => setSort((p) => toggleSort(p, "equipment"))}>
                      Equipment{sortIndicator(sort, "equipment")}
                    </th>
                    <th className="ae-th ae-thClickable" onClick={() => setSort((p) => toggleSort(p, "category"))}>
                      Category{sortIndicator(sort, "category")}
                    </th>
                    <th className="ae-th ae-thClickable" onClick={() => setSort((p) => toggleSort(p, "difficulty"))}>
                      Difficulty{sortIndicator(sort, "difficulty")}
                    </th>
                    <th className="ae-th ae-thClickable" onClick={() => setSort((p) => toggleSort(p, "target"))}>
                      Target{sortIndicator(sort, "target")}
                    </th>
                    <th className="ae-th ae-thClickable" onClick={() => setSort((p) => toggleSort(p, "updated"))}>
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
                      <tr className="ae-tr" key={r.equipment_id}>
                        <td className="ae-td">
                          <div className="ae-equipCell">
                            <div className="ae-imgBox">
                              {r.image_url ? (
                                <img
                                  src={absoluteUrl(r.image_url)}
                                  alt={r.name}
                                  className="ae-img"
                                  onClick={() =>
                                    setPreviewImg({ src: absoluteUrl(r.image_url), name: r.name || "equipment" })
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
                              <div className="ae-mutedTiny">ID: {r.equipment_id}</div>
                            </div>
                          </div>
                        </td>

                        <td className="ae-td">{r.category || "-"}</td>
                        <td className="ae-td">{r.difficulty || "-"}</td>
                        <td className="ae-td">{r.target_muscle_group || "-"}</td>
                        <td className="ae-td ae-mutedCell">{formatDateTimeFallback(r.updated_at)}</td>

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

      {importOpen && (
        <div className="ae-backdrop" onClick={() => setImportOpen(false)}>
          <div className="ae-importModal" onClick={(e) => e.stopPropagation()}>
            <div className="ae-modalTopRow">
              <div className="ae-modalTitle">Import CSV</div>
            </div>

            <div className="ae-importHint">
              Required header: <b>name</b> • Optional: category, difficulty, image_url, target_muscle_group
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

      {equipOpen && equipForm && (
        <div className="ae-backdrop" onClick={() => setEquipOpen(false)}>
          <div className="ae-formModal" onClick={(e) => e.stopPropagation()}>
            <div className="ae-modalTopRow">
              <div className="ae-modalTitle">{modalTitle}</div>
            </div>

            {equipErr ? <div className="ae-alert ae-alertError">{equipErr}</div> : null}

            <div className="ae-formGrid">
              <Field
                label="Name"
                value={equipForm.name}
                disabled={!canEdit}
                onChange={(v) => setEquipForm((p) => ({ ...p, name: v }))}
              />

              {/* ✅ ENUM: Category dropdown */}
              <label className="ae-field">
                <div className="ae-fieldLabel">Category</div>
                <select
                  value={equipForm.category || ""}
                  disabled={!canEdit}
                  className={`ae-select ${!canEdit ? "ae-fieldInputDisabled" : ""}`}
                  onChange={(e) => setEquipForm((p) => ({ ...p, category: e.target.value }))}
                  style={{ height: 42 }}
                >
                  <option value="">—</option>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              {/* ✅ ENUM: Difficulty dropdown */}
              <label className="ae-field">
                <div className="ae-fieldLabel">Difficulty</div>
                <select
                  value={equipForm.difficulty || ""}
                  disabled={!canEdit}
                  className={`ae-select ${!canEdit ? "ae-fieldInputDisabled" : ""}`}
                  onChange={(e) => setEquipForm((p) => ({ ...p, difficulty: e.target.value }))}
                  style={{ height: 42 }}
                >
                  <option value="">—</option>
                  {DIFFICULTY_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>

              <Field
                label="Target muscle group"
                value={equipForm.target_muscle_group}
                disabled={!canEdit}
                onChange={(v) => setEquipForm((p) => ({ ...p, target_muscle_group: v }))}
              />

              <label className="ae-field ae-fieldFull">
                <div className="ae-fieldLabel">Image File</div>
                <input
                  type="file"
                  accept="image/*"
                  disabled={!canEdit}
                  className={`ae-fieldInput ${!canEdit ? "ae-fieldInputDisabled" : ""}`}
                  style={{ paddingTop: 9 }}
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setEquipForm((p) => ({ ...p, imageFile: f }));
                  }}
                />
              </label>

              <Field
                label="Image URL (optional)"
                value={equipForm.image_url}
                disabled={!canEdit}
                onChange={(v) => setEquipForm((p) => ({ ...p, image_url: v }))}
                full
              />
            </div>

            {canShowInlineTools ? (
              <div className="ae-inlineTools">
                <button
                  className="ae-btn ae-btnSecondary"
                  onClick={() =>
                    setPreviewImg({ src: currentImagePreviewUrl, name: equipForm.name || "equipment" })
                  }
                >
                  Preview image
                </button>

                {equipForm.image_url ? (
                  <a href={absoluteUrl(equipForm.image_url)} download className="ae-linkReset">
                    <span className="ae-btn ae-btnPrimary">Download image</span>
                  </a>
                ) : null}
              </div>
            ) : null}

            <div className="ae-modalFooter">
              {equipMode === "view" ? (
                isAdmin ? (
                  <>
                    <button className="ae-btn ae-btnSecondary" onClick={() => askDelete(activeEquip)}>
                      Delete
                    </button>
                    <button className="ae-btn ae-btnPrimary" onClick={() => setEquipMode("edit")}>
                      Edit
                    </button>
                  </>
                ) : (
                  <button className="ae-btn ae-btnSecondary" onClick={() => setEquipOpen(false)}>
                    Close
                  </button>
                )
              ) : (
                <>
                  <button
                    className="ae-btn ae-btnSecondary"
                    onClick={() => {
                      setEquipErr("");
                      setSaveOpen(false);
                      if (equipMode === "add") setEquipOpen(false);
                      else setEquipMode("view");
                    }}
                    disabled={equipBusy}
                  >
                    Cancel
                  </button>

                  <button className="ae-btn ae-btnPrimary" onClick={() => setSaveOpen(true)} disabled={equipBusy}>
                    {equipBusy ? "Saving…" : "Save"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {saveOpen && equipOpen && equipForm && (
        <div className="ae-backdrop ae-backdropTop" onClick={() => setSaveOpen(false)}>
          <div className="ae-confirmModalFancy" onClick={(e) => e.stopPropagation()}>
            <div className="ae-confirmHeader">
              <div className="ae-confirmIconWrap" aria-hidden="true">
                ✅
              </div>
              <div className="ae-confirmHeaderText">
                <div className="ae-confirmTitle">
                  {equipMode === "add" ? "Create equipment?" : "Confirm changes?"}
                </div>
              </div>

              <button className="ae-modalClose" onClick={() => setSaveOpen(false)}>
                ✕
              </button>
            </div>

            {equipErr ? <div className="ae-alert ae-alertError">{equipErr}</div> : null}

            <div className="ae-confirmActions">
              <button className="ae-btn ae-btnSecondary" onClick={() => setSaveOpen(false)} disabled={equipBusy}>
                Cancel
              </button>

              <button className="ae-btn ae-btnPrimary" onClick={saveEquip} disabled={equipBusy}>
                {equipBusy ? "Saving…" : equipMode === "add" ? "Yes, create" : "Yes, save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {delOpen && activeEquip && (
        <div className="ae-backdrop ae-backdropTop" onClick={() => setDelOpen(false)}>
          <div className="ae-confirmModalFancy" onClick={(e) => e.stopPropagation()}>
            <div className="ae-confirmHeader">
              <div className="ae-confirmIconWrap" aria-hidden="true">
                ⚠️
              </div>

              <div className="ae-confirmHeaderText">
                <div className="ae-confirmTitle">Delete equipment?</div>
                <div className="ae-mutedTiny">
                  This will permanently remove <b className="ae-strongText">{activeEquip.name}</b>. This can’t be undone.
                </div>
              </div>

              <button className="ae-modalClose" onClick={() => setDelOpen(false)}>
                ✕
              </button>
            </div>

            {equipErr ? <div className="ae-alert ae-alertError">{equipErr}</div> : null}

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
