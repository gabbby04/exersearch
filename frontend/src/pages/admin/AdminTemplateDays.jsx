import React, { useEffect, useMemo, useState, useCallback } from "react";
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
  createTemplateDay,
  updateTemplateDay,
  deleteTemplateDay,
} from "../../utils/workoutTemplateDayApi";

import "./AdminEquipments.css";

function formatDateTimeFallback(value) {
  if (!value) return "-";
  const d = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

export default function AdminTemplateDays() {
  const { theme } = useOutletContext();
  const t = adminThemes[theme]?.app || adminThemes.light.app;
  const isDark = theme === "dark";

  const { isAdmin } = useAuthMe();

  const {
    rows: templates,
    loading: loadingTpls,
    error: tplErr,
    reload: reloadTpls,
  } = useApiList("/workout-templates", {
    authed: true,
    allPages: true,
    perPage: 50,
  });

  const [templateId, setTemplateId] = useState("");

  const {
    rows: days,
    loading: loadingDays,
    error: dayErr,
    reload: reloadDays,
  } = useApiList("/workout-template-days", {
    authed: true,
    allPages: true,
    perPage: 100,
    params: templateId ? { template_id: templateId } : {},
  });

  const [q, setQ] = useState("");
  const [sort, setSort] = useState({ key: "day", dir: "asc" });
  const pageSize = 10;
  const [page, setPage] = useState(1);

  useEffect(() => setPage(1), [q, templateId]);

  const searched = useMemo(() => {
    return globalSearch(days, q, [
      (r) => r.template_day_id,
      (r) => r.day_number,
      (r) => r.focus,
    ]);
  }, [days, q]);

  const getValue = useCallback((r, key) => {
    switch (key) {
      case "day":
        return tableValue.num(r.day_number);
      case "focus":
        return tableValue.str(r.focus);
      case "updated":
        return tableValue.dateMs(r.updated_at);
      case "id":
        return tableValue.num(r.template_day_id);
      default:
        return "";
    }
  }, []);

  const sorted = useMemo(
    () => sortRows(searched, sort, getValue),
    [searched, sort, getValue]
  );

  const { totalPages, safePage, pageRows, left, right } = useMemo(
    () => paginate(sorted, page, pageSize),
    [sorted, page]
  );

  const headerPills = useMemo(() => {
    const pills = [];
    if (!templateId) pills.push("Select a template");
    else pills.push(loadingDays ? "Loading…" : `${sorted.length} items`);
    return pills;
  }, [loadingDays, sorted.length, templateId]);

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

  const openAdd = () => {
    if (!templateId) {
      alert("Select a template first.");
      return;
    }
    setErrMsg("");
    setMode("add");
    setActive(null);
    setForm({
      template_id: Number(templateId),
      day_number: 1,
      focus: "",
    });
    setOpen(true);
  };

  const openView = (r) => {
    setErrMsg("");
    setMode("view");
    setActive(r);
    setForm({
      template_id: Number(templateId),
      day_number: r.day_number ?? 1,
      focus: r.focus || "",
    });
    setOpen(true);
  };

  const openEdit = (r) => {
    setErrMsg("");
    setMode("edit");
    setActive(r);
    setForm({
      template_id: Number(templateId),
      day_number: r.day_number ?? 1,
      focus: r.focus || "",
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
    setDelBusy(true);
    setErrMsg("");
    try {
      await deleteTemplateDay(active.template_day_id);
      setDelOpen(false);
      setOpen(false);
      reloadDays();
    } catch (e) {
      setErrMsg(e?.message || "Delete failed.");
    } finally {
      setDelBusy(false);
    }
  };

  const save = async () => {
    if (!form) return;

    const payload = {
      template_id: Number(form.template_id),
      day_number: Number(form.day_number),
      focus: String(form.focus || "").trim() || null,
    };

    if (!Number.isFinite(payload.template_id) || payload.template_id <= 0) {
      setErrMsg("template_id is required.");
      return;
    }
    if (
      !Number.isFinite(payload.day_number) ||
      payload.day_number < 1 ||
      payload.day_number > 7
    ) {
      setErrMsg("day_number must be between 1 and 7.");
      return;
    }

    setBusy(true);
    setErrMsg("");

    try {
      if (mode === "add") {
        await createTemplateDay(payload);
      } else if (mode === "edit") {
        if (!active) throw new Error("No day selected.");
        await updateTemplateDay(active.template_day_id, payload);
      }

      setOpen(false);
      setSaveOpen(false);
      reloadDays();
    } catch (e) {
      setErrMsg(e?.message || "Save failed.");
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
    mode === "add"
      ? "Add Template Day"
      : mode === "edit"
      ? "Edit Template Day"
      : "View Template Day";

  const canEdit = isAdmin && (mode === "edit" || mode === "add");

  const handleReload = () => {
    reloadTpls();
    if (templateId) reloadDays();
  };

  return (
    <div className="ae-page" data-theme={theme} style={cssVars}>
      <div className="ae-topRow">
        <div className="ae-titleWrap">
          <div className="ae-pageTitle">Template Days</div>
          <div className="ae-headerPills">
            {headerPills.map((p, idx) => (
              <span
                key={idx}
                className={idx === 0 ? "ae-pill" : "ae-pillMuted"}
              >
                {p}
              </span>
            ))}
          </div>
        </div>

        <div className="ae-topActions">
          <button className="ae-btn ae-btnSecondary" onClick={handleReload}>
            Reload
          </button>
        </div>
      </div>

      <div className="ae-panelOuter">
        <div className="ae-panel">
          <div className="ae-panelTop">
            <div
              className="ae-leftActions"
              style={{ gap: 10, display: "flex", alignItems: "center" }}
            >
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="ae-fieldInput"
                style={{ width: 320 }}
              >
                <option value="">Select a template…</option>
                {templates.map((tpl) => (
                  <option key={tpl.template_id} value={tpl.template_id}>
                    #{tpl.template_id} — {tpl.goal} / {tpl.level} /{" "}
                    {tpl.split_type} ({tpl.days_per_week}d)
                  </option>
                ))}
              </select>

              {isAdmin ? (
                <button
                  className="ae-btn ae-btnPrimary"
                  onClick={openAdd}
                  disabled={!templateId}
                >
                  + Add Day
                </button>
              ) : null}
            </div>

            <div className="ae-rightActions">
              <div className="ae-searchBox">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search days…"
                  className="ae-searchInput"
                  disabled={!templateId}
                />
                <span className="ae-searchIcon">⌕</span>
              </div>
            </div>
          </div>

          <div className="ae-tableWrap">
            {tplErr ? <div className="ae-errorBox">{tplErr}</div> : null}

            {!templateId ? (
              <div className="ae-td" style={{ padding: 16 }}>
                Pick a template to view its days.
              </div>
            ) : dayErr ? (
              <div className="ae-errorBox">{dayErr}</div>
            ) : (
              <table className="ae-table">
                <thead>
                  <tr>
                    <th
                      className="ae-th ae-thClickable"
                      onClick={() => setSort((p) => toggleSort(p, "day"))}
                    >
                      Day{sortIndicator(sort, "day")}
                    </th>
                    <th
                      className="ae-th ae-thClickable"
                      onClick={() => setSort((p) => toggleSort(p, "focus"))}
                    >
                      Focus{sortIndicator(sort, "focus")}
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
                  {loadingDays ? (
                    <tr>
                      <td className="ae-td" colSpan={4}>
                        Loading…
                      </td>
                    </tr>
                  ) : pageRows.length === 0 ? (
                    <tr>
                      <td className="ae-td" colSpan={4}>
                        No days.
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((r) => (
                      <tr className="ae-tr" key={r.template_day_id}>
                        <td className="ae-td">
                          <div className="ae-equipMeta">
                            <div className="ae-equipName">
                              Day {r.day_number}
                            </div>
                            <div className="ae-mutedTiny">
                              ID: {r.template_day_id}
                            </div>
                          </div>
                        </td>

                        <td className="ae-td">{r.focus || "-"}</td>
                        <td className="ae-td ae-mutedCell">
                          {formatDateTimeFallback(r.updated_at)}
                        </td>

                        <td className="ae-td ae-tdRight">
                          <div className="ae-actionsInline">
                            <IconBtn
                              title="View"
                              className="ae-iconBtn"
                              onClick={() => openView(r)}
                            >
                              👁
                            </IconBtn>

                            {isAdmin ? (
                              <>
                                <IconBtn
                                  title="Edit"
                                  className="ae-iconBtn"
                                  onClick={() => openEdit(r)}
                                >
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

          {templateId ? (
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
          ) : null}
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
                label="Template ID"
                value={String(form.template_id)}
                disabled
                full
                onChange={() => {}}
              />

              <NumberField
                label="Day number (1-7)"
                value={form.day_number}
                disabled={!canEdit}
                min={1}
                max={7}
                onChange={(v) => setForm((p) => ({ ...p, day_number: v }))}
              />

              <Field
                label="Focus (optional)"
                value={form.focus}
                disabled={!canEdit}
                full
                onChange={(v) => setForm((p) => ({ ...p, focus: v }))}
              />
            </div>

            <div className="ae-modalFooter">
              {mode === "view" ? (
                isAdmin ? (
                  <>
                    <button
                      className="ae-btn ae-btnSecondary"
                      onClick={() => askDelete(active)}
                    >
                      Delete
                    </button>
                    <button
                      className="ae-btn ae-btnPrimary"
                      onClick={() => setMode("edit")}
                    >
                      Edit
                    </button>
                  </>
                ) : (
                  <button
                    className="ae-btn ae-btnSecondary"
                    onClick={() => setOpen(false)}
                  >
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

                  <button
                    className="ae-btn ae-btnPrimary"
                    onClick={() => setSaveOpen(true)}
                    disabled={busy}
                  >
                    {busy ? "Saving…" : "Save"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {saveOpen && open && form && (
        <div
          className="ae-backdrop ae-backdropTop"
          onClick={() => setSaveOpen(false)}
        >
          <div
            className="ae-confirmModalFancy"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ae-confirmHeader">
              <div className="ae-confirmIconWrap" aria-hidden="true">
                ✅
              </div>
              <div className="ae-confirmHeaderText">
                <div className="ae-confirmTitle">
                  {mode === "add" ? "Create day?" : "Confirm changes?"}
                </div>
                <div className="ae-mutedTiny">
                  You’re editing{" "}
                  <b className="ae-strongText">Template #{form.template_id}</b>,
                  Day <b className="ae-strongText">{form.day_number}</b>.
                </div>
              </div>
              <button
                className="ae-modalClose"
                onClick={() => setSaveOpen(false)}
              >
                ✕
              </button>
            </div>

            {errMsg ? <div className="ae-alert ae-alertError">{errMsg}</div> : null}

            <div className="ae-confirmActions">
              <button
                className="ae-btn ae-btnSecondary"
                onClick={() => setSaveOpen(false)}
                disabled={busy}
              >
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
        <div
          className="ae-backdrop ae-backdropTop"
          onClick={() => setDelOpen(false)}
        >
          <div
            className="ae-confirmModalFancy"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ae-confirmHeader">
              <div className="ae-confirmIconWrap" aria-hidden="true">
                ⚠️
              </div>
              <div className="ae-confirmHeaderText">
                <div className="ae-confirmTitle">Delete day?</div>
                <div className="ae-mutedTiny">
                  This will remove{" "}
                  <b className="ae-strongText">Day {active.day_number}</b> from
                  Template <b className="ae-strongText">#{templateId}</b>.
                </div>
              </div>
              <button
                className="ae-modalClose"
                onClick={() => setDelOpen(false)}
              >
                ✕
              </button>
            </div>

            {errMsg ? <div className="ae-alert ae-alertError">{errMsg}</div> : null}

            <div className="ae-confirmActions">
              <button
                className="ae-btn ae-btnSecondary"
                onClick={() => setDelOpen(false)}
                disabled={delBusy}
              >
                Keep it
              </button>
              <button
                className="ae-btn ae-btnDanger"
                onClick={doDelete}
                disabled={delBusy}
              >
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

function NumberField({ label, value, onChange, disabled, min, max }) {
  return (
    <label className="ae-field">
      <div className="ae-fieldLabel">{label}</div>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`ae-fieldInput ${disabled ? "ae-fieldInputDisabled" : ""}`}
      />
    </label>
  );
}