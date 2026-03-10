// src/pages/admin/AdminExercises.jsx
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
  createExercise,
  updateExercise,
  deleteExercise,
} from "../../utils/exerciseApi";

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

function parseCsvLikeList(s) {
  const raw = String(s || "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function toArrayField(v) {
  if (Array.isArray(v)) return v.filter(Boolean);
  return parseCsvLikeList(v);
}

export default function AdminExercises() {
  const { theme } = useOutletContext();
  const t = adminThemes[theme]?.app || adminThemes.light.app;
  const isDark = theme === "dark";

  const { isAdmin } = useAuthMe();

  // ✅ FETCH ALL PAGES
  const { rows, loading: loadingRows, error, reload } = useApiList(
    "/exercises",
    {
      authed: true,
      allPages: true,
      perPage: 100,
    }
  );

  const [q, setQ] = useState("");
  const [sort, setSort] = useState({ key: "id", dir: "desc" });
  const pageSize = 10;
  const [page, setPage] = useState(1);

  const [exOpen, setExOpen] = useState(false);
  const [exMode, setExMode] = useState("view"); // view | edit | add
  const [active, setActive] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const [delOpen, setDelOpen] = useState(false);
  const [delBusy, setDelBusy] = useState(false);

  const [saveOpen, setSaveOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setExOpen(false);
        setDelOpen(false);
        setSaveOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const searched = useMemo(() => {
    return globalSearch(rows, q, [
      (r) => r.exercise_id,
      (r) => r.name,
      (r) => r.primary_muscle,
      (r) => r.equipment,
      (r) => r.difficulty,
    ]);
  }, [rows, q]);

  useEffect(() => setPage(1), [q]);

  const getValue = (r, key) => {
    switch (key) {
      case "name":
        return tableValue.str(r.name);
      case "muscle":
        return tableValue.str(r.primary_muscle);
      case "equip":
        return tableValue.str(r.equipment);
      case "diff":
        return tableValue.str(r.difficulty);
      case "updated":
        return tableValue.dateMs(r.updated_at);
      case "id":
        return tableValue.num(r.exercise_id);
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

  const openAdd = () => {
    setErrMsg("");
    setExMode("add");
    setActive(null);
    setForm({
      name: "",
      primary_muscle: "",
      secondary_muscles_text: "",
      equipment: "",
      difficulty: "beginner",
      instructions_text: "",
      external_source: "",
      external_id: "",
    });
    setExOpen(true);
  };

  const openView = (r) => {
    setErrMsg("");
    setExMode("view");
    setActive(r);
    setForm({
      name: r.name || "",
      primary_muscle: r.primary_muscle || "",
      secondary_muscles_text: Array.isArray(r.secondary_muscles)
        ? r.secondary_muscles.join(", ")
        : "",
      equipment: r.equipment || "",
      difficulty: r.difficulty || "",
      instructions_text: Array.isArray(r.instructions) ? r.instructions.join("\n") : "",
      external_source: r.external_source || "",
      external_id: r.external_id || "",
    });
    setExOpen(true);
  };

  const openEdit = (r) => {
    setErrMsg("");
    setExMode("edit");
    setActive(r);
    setForm({
      name: r.name || "",
      primary_muscle: r.primary_muscle || "",
      secondary_muscles_text: Array.isArray(r.secondary_muscles)
        ? r.secondary_muscles.join(", ")
        : "",
      equipment: r.equipment || "",
      difficulty: r.difficulty || "beginner",
      instructions_text: Array.isArray(r.instructions) ? r.instructions.join("\n") : "",
      external_source: r.external_source || "",
      external_id: r.external_id || "",
    });
    setExOpen(true);
  };

  const askDelete = (r) => {
    setErrMsg("");
    setActive(r);
    setDelOpen(true);
  };

  const doDelete = async () => {
    if (!active) return;
    setDelBusy(true);
    setErrMsg("");
    try {
      await deleteExercise(active.exercise_id);
      setDelOpen(false);
      setExOpen(false);
      reload();
    } catch (e) {
      setErrMsg(e.message || "Delete failed.");
    } finally {
      setDelBusy(false);
    }
  };

  const save = async () => {
    if (!form) return;

    const name = String(form.name || "").trim();
    if (!name) {
      setErrMsg("Name is required.");
      return;
    }

    const payload = {
      name,
      primary_muscle: String(form.primary_muscle || "").trim() || null,
      secondary_muscles: toArrayField(form.secondary_muscles_text),
      equipment: String(form.equipment || "").trim() || null,
      difficulty: String(form.difficulty || "").trim() || null,
      instructions: String(form.instructions_text || "")
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean),
      external_source: String(form.external_source || "").trim() || null,
      external_id: String(form.external_id || "").trim() || null,
    };

    setBusy(true);
    setErrMsg("");

    try {
      if (exMode === "add") {
        await createExercise(payload);
      } else if (exMode === "edit") {
        if (!active) throw new Error("No exercise selected.");
        await updateExercise(active.exercise_id, payload);
      }
      setExOpen(false);
      setSaveOpen(false);
      reload();
    } catch (e) {
      setErrMsg(e.message || "Save failed.");
    } finally {
      setBusy(false);
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
    exMode === "add" ? "Add Exercise" : exMode === "edit" ? "Edit Exercise" : "View Exercise";

  const canEdit = isAdmin && (exMode === "edit" || exMode === "add");

  return (
    <div className="ae-page" data-theme={theme} style={cssVars}>
      <div className="ae-topRow">
        <div className="ae-titleWrap">
          <div className="ae-pageTitle">Exercises</div>

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
                  + Add Exercise
                </button>
              ) : null}
            </div>

            <div className="ae-rightActions">
              <div className="ae-searchBox">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search exercises…"
                  className="ae-searchInput"
                />
                <span className="ae-searchIcon">⌕</span>
              </div>
            </div>
          </div>

          <div className="ae-tableWrap">
            {error ? (
              <div className="ae-errorBox">{error}</div>
            ) : (
              <table className="ae-table">
                <thead>
                  <tr>
                    <th className="ae-th ae-thClickable" onClick={() => setSort((p) => toggleSort(p, "name"))}>
                      Name{sortIndicator(sort, "name")}
                    </th>

                    <th className="ae-th ae-thClickable" onClick={() => setSort((p) => toggleSort(p, "muscle"))}>
                      Primary muscle{sortIndicator(sort, "muscle")}
                    </th>

                    <th className="ae-th ae-thClickable" onClick={() => setSort((p) => toggleSort(p, "equip"))}>
                      Equipment{sortIndicator(sort, "equip")}
                    </th>

                    <th className="ae-th ae-thClickable" onClick={() => setSort((p) => toggleSort(p, "diff"))}>
                      Difficulty{sortIndicator(sort, "diff")}
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
                      <tr className="ae-tr" key={r.exercise_id}>
                        <td className="ae-td">
                          <div className="ae-equipMeta">
                            <div className="ae-equipName">{r.name || "-"}</div>
                            <div className="ae-mutedTiny">ID: {r.exercise_id}</div>
                          </div>
                        </td>

                        <td className="ae-td">{r.primary_muscle || "-"}</td>
                        <td className="ae-td">{r.equipment || "-"}</td>
                        <td className="ae-td">{r.difficulty || "-"}</td>

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

      {exOpen && form && (
        <div className="ae-backdrop" onClick={() => setExOpen(false)}>
          <div className="ae-formModal" onClick={(e) => e.stopPropagation()}>
            <div className="ae-modalTopRow">
              <div className="ae-modalTitle">{modalTitle}</div>
            </div>

            {errMsg ? <div className="ae-alert ae-alertError">{errMsg}</div> : null}

            <div className="ae-formGrid">
              <Field
                label="Name"
                value={form.name}
                disabled={!canEdit}
                onChange={(v) => setForm((p) => ({ ...p, name: v }))}
                full
              />

              <Field
                label="Primary muscle"
                value={form.primary_muscle}
                disabled={!canEdit}
                onChange={(v) => setForm((p) => ({ ...p, primary_muscle: v }))}
              />

              <Field
                label="Equipment"
                value={form.equipment}
                disabled={!canEdit}
                onChange={(v) => setForm((p) => ({ ...p, equipment: v }))}
              />

              <SelectField
                label="Difficulty"
                value={form.difficulty}
                disabled={!canEdit}
                onChange={(v) => setForm((p) => ({ ...p, difficulty: v }))}
                options={[
                  { value: "beginner", label: "beginner" },
                  { value: "intermediate", label: "intermediate" },
                  { value: "advanced", label: "advanced" },
                ]}
              />

              <Field
                label="Secondary muscles (comma-separated)"
                value={form.secondary_muscles_text}
                disabled={!canEdit}
                onChange={(v) => setForm((p) => ({ ...p, secondary_muscles_text: v }))}
                full
              />

              <TextAreaField
                label="Instructions (one step per line)"
                value={form.instructions_text}
                disabled={!canEdit}
                onChange={(v) => setForm((p) => ({ ...p, instructions_text: v }))}
                full
              />

              <Field
                label="External source"
                value={form.external_source}
                disabled={!canEdit}
                onChange={(v) => setForm((p) => ({ ...p, external_source: v }))}
              />

              <Field
                label="External id"
                value={form.external_id}
                disabled={!canEdit}
                onChange={(v) => setForm((p) => ({ ...p, external_id: v }))}
              />
            </div>

            <div className="ae-modalFooter">
              {exMode === "view" ? (
                isAdmin ? (
                  <>
                    <button className="ae-btn ae-btnSecondary" onClick={() => askDelete(active)}>
                      Delete
                    </button>
                    <button className="ae-btn ae-btnPrimary" onClick={() => setExMode("edit")}>
                      Edit
                    </button>
                  </>
                ) : (
                  <button className="ae-btn ae-btnSecondary" onClick={() => setExOpen(false)}>
                    Close
                  </button>
                )
              ) : (
                <>
                  <button
                    className="ae-btn ae-btnSecondary"
                    onClick={() => {
                      setErrMsg("");
                      setSaveOpen(false);
                      if (exMode === "add") setExOpen(false);
                      else setExMode("view");
                    }}
                    disabled={busy}
                  >
                    Cancel
                  </button>

                  <button className="ae-btn ae-btnPrimary" onClick={() => setSaveOpen(true)} disabled={busy}>
                    {busy ? "Saving…" : "Save"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {saveOpen && exOpen && form && (
        <div className="ae-backdrop ae-backdropTop" onClick={() => setSaveOpen(false)}>
          <div className="ae-confirmModalFancy" onClick={(e) => e.stopPropagation()}>
            <div className="ae-confirmHeader">
              <div className="ae-confirmIconWrap" aria-hidden="true">✅</div>
              <div className="ae-confirmHeaderText">
                <div className="ae-confirmTitle">{exMode === "add" ? "Create exercise?" : "Confirm changes?"}</div>
                <div className="ae-mutedTiny">
                  {exMode === "add" ? (
                    <>You’re about to add <b className="ae-strongText">{form.name || "this exercise"}</b>.</>
                  ) : (
                    <>You’re about to update <b className="ae-strongText">{active?.name || "this exercise"}</b>.</>
                  )}
                </div>
              </div>

              <button className="ae-modalClose" onClick={() => setSaveOpen(false)}>✕</button>
            </div>

            {errMsg ? <div className="ae-alert ae-alertError">{errMsg}</div> : null}

            <div className="ae-confirmActions">
              <button className="ae-btn ae-btnSecondary" onClick={() => setSaveOpen(false)} disabled={busy}>
                Cancel
              </button>

              <button className="ae-btn ae-btnPrimary" onClick={save} disabled={busy}>
                {busy ? "Saving…" : exMode === "add" ? "Yes, create" : "Yes, save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {delOpen && active && (
        <div className="ae-backdrop ae-backdropTop" onClick={() => setDelOpen(false)}>
          <div className="ae-confirmModalFancy" onClick={(e) => e.stopPropagation()}>
            <div className="ae-confirmHeader">
              <div className="ae-confirmIconWrap" aria-hidden="true">⚠️</div>

              <div className="ae-confirmHeaderText">
                <div className="ae-confirmTitle">Delete exercise?</div>
                <div className="ae-mutedTiny">
                  This will permanently remove <b className="ae-strongText">{active.name}</b>. This can’t be undone.
                </div>
              </div>

              <button className="ae-modalClose" onClick={() => setDelOpen(false)}>✕</button>
            </div>

            {errMsg ? <div className="ae-alert ae-alertError">{errMsg}</div> : null}

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

function TextAreaField({ label, value, onChange, disabled, full }) {
  return (
    <label className={`ae-field ${full ? "ae-fieldFull" : ""}`}>
      <div className="ae-fieldLabel">{label}</div>
      <textarea
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`ae-fieldInput ${disabled ? "ae-fieldInputDisabled" : ""}`}
        style={{ minHeight: 130, resize: "vertical", paddingTop: 10 }}
      />
    </label>
  );
}

function SelectField({ label, value, onChange, disabled, options }) {
  return (
    <label className="ae-field">
      <div className="ae-fieldLabel">{label}</div>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`ae-fieldInput ${disabled ? "ae-fieldInputDisabled" : ""}`}
        style={{ paddingTop: 10 }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
