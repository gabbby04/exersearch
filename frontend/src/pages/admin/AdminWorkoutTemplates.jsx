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
  createWorkoutTemplate,
  updateWorkoutTemplate,
  deleteWorkoutTemplate,
} from "../../utils/workoutTemplateApi";

import "./AdminEquipments.css";

function formatDateTimeFallback(value) {
  if (!value) return "-";
  const d = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

function toIntOrNull(v) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export default function AdminWorkoutTemplates() {
  const { theme } = useOutletContext();
  const t = adminThemes[theme]?.app || adminThemes.light.app;
  const isDark = theme === "dark";

  const { isAdmin } = useAuthMe();

  const { rows, loading: loadingRows, error, reload } = useApiList(
    "/workout-templates",
    { authed: true, allPages: true, perPage: 100 }
  );

  const [q, setQ] = useState("");
  const [sort, setSort] = useState({ key: "updated", dir: "desc" });
  const pageSize = 10;
  const [page, setPage] = useState(1);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("view");
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
        setOpen(false);
        setDelOpen(false);
        setSaveOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const searched = useMemo(() => {
    return globalSearch(rows, q, [
      (r) => r.template_id ?? r.id,
      (r) => r.name,
      (r) => r.goal,
      (r) => r.level,
      (r) => r.split_type,
    ]);
  }, [rows, q]);

  useEffect(() => setPage(1), [q]);

  const getValue = (r, key) => {
    const id = r.template_id ?? r.id;
    switch (key) {
      case "name":
        return tableValue.str(r.name);
      case "goal":
        return tableValue.str(r.goal);
      case "level":
        return tableValue.str(r.level);
      case "split":
        return tableValue.str(r.split_type);
      case "days":
        return tableValue.num(r.days_per_week);
      case "mins":
        return tableValue.num(r.session_minutes);
      case "updated":
        return tableValue.dateMs(r.updated_at);
      case "id":
        return tableValue.num(id);
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
    setMode("add");
    setActive(null);
    setForm({
      name: "",
      goal: "lose_fat",
      level: "beginner",
      days_per_week: "3",
      session_minutes: "45",
      split_type: "full_body",
      weeks: "4",
      notes: "",
    });
    setOpen(true);
  };

  const openView = (r) => {
    setErrMsg("");
    setMode("view");
    setActive(r);
    setForm({
      name: r.name || "",
      goal: r.goal || "",
      level: r.level || "",
      days_per_week: r.days_per_week ?? "",
      session_minutes: r.session_minutes ?? "",
      split_type: r.split_type || "",
      weeks: r.weeks ?? r.weeks_length ?? "",
      notes: r.notes || r.description || "",
    });
    setOpen(true);
  };

  const openEdit = (r) => {
    setErrMsg("");
    setMode("edit");
    setActive(r);
    setForm({
      name: r.name || "",
      goal: r.goal || "lose_fat",
      level: r.level || "beginner",
      days_per_week: r.days_per_week ?? "3",
      session_minutes: r.session_minutes ?? "45",
      split_type: r.split_type || "full_body",
      weeks: r.weeks ?? r.weeks_length ?? "4",
      notes: r.notes || r.description || "",
    });
    setOpen(true);
  };

  const askDelete = (r) => {
    setErrMsg("");
    setActive(r);
    setDelOpen(true);
  };

  const doDelete = async () => {
    if (!active) return;
    const id = active.template_id ?? active.id;
    setDelBusy(true);
    setErrMsg("");
    try {
      await deleteWorkoutTemplate(id);
      setDelOpen(false);
      setOpen(false);
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
      goal: String(form.goal || "").trim() || null,
      level: String(form.level || "").trim() || null,
      days_per_week: toIntOrNull(form.days_per_week),
      session_minutes: toIntOrNull(form.session_minutes),
      split_type: String(form.split_type || "").trim() || null,
      weeks: toIntOrNull(form.weeks),
      notes: String(form.notes || "").trim() || null,
    };

    setBusy(true);
    setErrMsg("");

    try {
      if (mode === "add") {
        await createWorkoutTemplate(payload);
      } else if (mode === "edit") {
        if (!active) throw new Error("No template selected.");
        const id = active.template_id ?? active.id;
        await updateWorkoutTemplate(id, payload);
      }
      setOpen(false);
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
    mode === "add" ? "Add Template" : mode === "edit" ? "Edit Template" : "View Template";

  const canEdit = isAdmin && (mode === "edit" || mode === "add");

  return (
    <div className="ae-page" data-theme={theme} style={cssVars}>
      <div className="ae-topRow">
        <div className="ae-titleWrap">
          <div className="ae-pageTitle">Workout Templates</div>

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
                  + Add Template
                </button>
              ) : null}
            </div>

            <div className="ae-rightActions">
              <div className="ae-searchBox">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search templates…"
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
                    <th className="ae-th ae-thClickable" onClick={() => setSort((p) => toggleSort(p, "goal"))}>
                      Goal{sortIndicator(sort, "goal")}
                    </th>
                    <th className="ae-th ae-thClickable" onClick={() => setSort((p) => toggleSort(p, "level"))}>
                      Level{sortIndicator(sort, "level")}
                    </th>
                    <th className="ae-th ae-thClickable" onClick={() => setSort((p) => toggleSort(p, "split"))}>
                      Split{sortIndicator(sort, "split")}
                    </th>
                    <th className="ae-th ae-thClickable" onClick={() => setSort((p) => toggleSort(p, "days"))}>
                      Days/wk{sortIndicator(sort, "days")}
                    </th>
                    <th className="ae-th ae-thClickable" onClick={() => setSort((p) => toggleSort(p, "mins"))}>
                      Mins{sortIndicator(sort, "mins")}
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
                      <td className="ae-td" colSpan={8}>
                        Loading…
                      </td>
                    </tr>
                  ) : pageRows.length === 0 ? (
                    <tr>
                      <td className="ae-td" colSpan={8}>
                        No results.
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((r) => {
                      const id = r.template_id ?? r.id;
                      return (
                        <tr className="ae-tr" key={id}>
                          <td className="ae-td">
                            <div className="ae-equipMeta">
                              <div className="ae-equipName">{r.name || "-"}</div>
                              <div className="ae-mutedTiny">ID: {id}</div>
                            </div>
                          </td>

                          <td className="ae-td">{r.goal || "-"}</td>
                          <td className="ae-td">{r.level || "-"}</td>
                          <td className="ae-td">{r.split_type || "-"}</td>
                          <td className="ae-td">{r.days_per_week ?? "-"}</td>
                          <td className="ae-td">{r.session_minutes ?? "-"}</td>

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
                      );
                    })
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

      {open && form && (
        <div className="ae-backdrop" onClick={() => setOpen(false)}>
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

              <SelectField
                label="Goal"
                value={form.goal}
                disabled={!canEdit}
                onChange={(v) => setForm((p) => ({ ...p, goal: v }))}
                options={[
                  { value: "lose_fat", label: "lose_fat" },
                  { value: "build_muscle", label: "build_muscle" },
                  { value: "endurance", label: "endurance" },
                  { value: "strength", label: "strength" },
                ]}
              />

              <SelectField
                label="Level"
                value={form.level}
                disabled={!canEdit}
                onChange={(v) => setForm((p) => ({ ...p, level: v }))}
                options={[
                  { value: "beginner", label: "beginner" },
                  { value: "intermediate", label: "intermediate" },
                  { value: "advanced", label: "advanced" },
                ]}
              />

              <SelectField
                label="Split type"
                value={form.split_type}
                disabled={!canEdit}
                onChange={(v) => setForm((p) => ({ ...p, split_type: v }))}
                options={[
                  { value: "full_body", label: "full_body" },
                  { value: "upper_lower", label: "upper_lower" },
                  { value: "ppl", label: "ppl" },
                ]}
              />

              <Field
                label="Days per week"
                value={String(form.days_per_week ?? "")}
                disabled={!canEdit}
                onChange={(v) => setForm((p) => ({ ...p, days_per_week: v }))}
              />

              <Field
                label="Session minutes"
                value={String(form.session_minutes ?? "")}
                disabled={!canEdit}
                onChange={(v) => setForm((p) => ({ ...p, session_minutes: v }))}
              />

              <Field
                label="Weeks"
                value={String(form.weeks ?? "")}
                disabled={!canEdit}
                onChange={(v) => setForm((p) => ({ ...p, weeks: v }))}
              />

              <TextAreaField
                label="Notes (optional)"
                value={form.notes}
                disabled={!canEdit}
                onChange={(v) => setForm((p) => ({ ...p, notes: v }))}
                full
              />
            </div>

            <div className="ae-modalFooter">
              {mode === "view" ? (
                isAdmin ? (
                  <>
                    <button className="ae-btn ae-btnSecondary" onClick={() => askDelete(active)}>
                      Delete
                    </button>
                    <button className="ae-btn ae-btnPrimary" onClick={() => setMode("edit")}>
                      Edit
                    </button>
                  </>
                ) : (
                  <button className="ae-btn ae-btnSecondary" onClick={() => setOpen(false)}>
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
                      if (mode === "add") setOpen(false);
                      else setMode("view");
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

      {saveOpen && open && form && (
        <div className="ae-backdrop ae-backdropTop" onClick={() => setSaveOpen(false)}>
          <div className="ae-confirmModalFancy" onClick={(e) => e.stopPropagation()}>
            <div className="ae-confirmHeader">
              <div className="ae-confirmIconWrap" aria-hidden="true">✅</div>
              <div className="ae-confirmHeaderText">
                <div className="ae-confirmTitle">{mode === "add" ? "Create template?" : "Confirm changes?"}</div>
                <div className="ae-mutedTiny">
                  {mode === "add" ? (
                    <>You’re about to add <b className="ae-strongText">{form.name || "this template"}</b>.</>
                  ) : (
                    <>You’re about to update <b className="ae-strongText">{active?.name || "this template"}</b>.</>
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
                {busy ? "Saving…" : mode === "add" ? "Yes, create" : "Yes, save"}
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
                <div className="ae-confirmTitle">Delete template?</div>
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
        style={{ minHeight: 120, resize: "vertical", paddingTop: 10 }}
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