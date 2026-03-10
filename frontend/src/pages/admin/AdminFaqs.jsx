import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { adminThemes } from "./AdminLayout";

import { useAuthMe } from "../../utils/useAuthMe";
import {
  toggleSort,
  sortIndicator,
  sortRows,
  paginate,
  globalSearch,
  tableValue,
} from "../../utils/tableUtils";

import { createFaq, updateFaq, deleteFaq, toggleFaq } from "../../utils/faqApi";
import { api } from "../../utils/apiClient";

import "./AdminEquipments.css";

function formatDateTimeFallback(value) {
  if (!value) return "-";
  const d = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

const FAQ_CATEGORY_OPTIONS = [
  "Account",
  "Gyms",
  "Workouts",
  "Nutrition",
  "Billing",
  "Privacy",
  "Technical",
];

export default function AdminFaqs() {
  const { theme } = useOutletContext();
  const t = adminThemes[theme]?.app || adminThemes.light.app;
  const isDark = theme === "dark";

  const { me, isAdmin } = useAuthMe();
  const canManage = isAdmin && me?.role === "superadmin";

  const [rows, setRows] = useState([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All");
  const [activeOnly, setActiveOnly] = useState(false);

  const [sort, setSort] = useState({ key: "id", dir: "asc" });
  const pageSize = 10;
  const [page, setPage] = useState(1);

  const [faqOpen, setFaqOpen] = useState(false);
  const [faqMode, setFaqMode] = useState("view");
  const [activeFaq, setActiveFaq] = useState(null);
  const [faqForm, setFaqForm] = useState(null);
  const [faqBusy, setFaqBusy] = useState(false);
  const [faqErr, setFaqErr] = useState("");

  const [delOpen, setDelOpen] = useState(false);
  const [delBusy, setDelBusy] = useState(false);

  const [saveOpen, setSaveOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setFaqOpen(false);
        setDelOpen(false);
        setSaveOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const fetchFaqPage = async (p) => {
    const res = await api.get("/faqs", {
      params: { page: p, per_page: 50 },
    });
    return res.data;
  };

  const reload = async () => {
    setLoadingRows(true);
    setError("");
    try {
      const first = await fetchFaqPage(1);

      const paginator = first?.data || first;
      const firstRows = Array.isArray(paginator?.data) ? paginator.data : [];
      const lastPage = Number(paginator?.last_page || 1);

      let merged = [...firstRows];

      if (lastPage > 1) {
        const promises = [];
        for (let p = 2; p <= lastPage; p++) promises.push(fetchFaqPage(p));
        const rest = await Promise.all(promises);
        for (const r of rest) {
          const pag = r?.data || r;
          const arr = Array.isArray(pag?.data) ? pag.data : [];
          merged.push(...arr);
        }
      }

      setRows(merged);
    } catch (e) {
      setRows([]);
      setError(e?.response?.data?.message || e?.message || "Failed to load.");
    } finally {
      setLoadingRows(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const categories = useMemo(() => ["All", ...FAQ_CATEGORY_OPTIONS], []);

  const searched = useMemo(() => {
    return globalSearch(rows || [], q, [
      (r) => r.faq_id,
      (r) => r.question,
      (r) => r.answer,
      (r) => r.category,
    ]);
  }, [rows, q]);

  const filtered = useMemo(() => {
    return searched
      .filter((r) => (category === "All" ? true : String(r.category || "") === category))
      .filter((r) => (activeOnly ? !!r.is_active : true));
  }, [searched, category, activeOnly]);

  useEffect(() => {
    setPage(1);
  }, [q, category, activeOnly]);

  const getValue = (r, key) => {
    switch (key) {
      case "question":
        return tableValue.str(r.question);
      case "category":
        return tableValue.str(r.category);
      case "order":
        return tableValue.num(r.display_order);
      case "active":
        return tableValue.num(r.is_active ? 1 : 0);
      case "updated":
        return tableValue.dateMs(r.updated_at);
      case "id":
        return tableValue.num(r.faq_id);
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
    if (activeOnly) pills.push("Active only");
    return pills;
  }, [loadingRows, sorted.length, category, activeOnly]);

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

  const openAdd = () => {
    setFaqErr("");
    setFaqMode("add");
    setActiveFaq(null);
    setFaqForm({
      question: "",
      answer: "",
      category: "",
      display_order: 0,
      is_active: true,
    });
    setFaqOpen(true);
  };

  const openView = (r) => {
    setFaqErr("");
    setFaqMode("view");
    setActiveFaq(r);
    setFaqForm({
      question: r.question || "",
      answer: r.answer || "",
      category: r.category || "",
      display_order: r.display_order ?? 0,
      is_active: !!r.is_active,
    });
    setFaqOpen(true);
  };

  const openEdit = (r) => {
    setFaqErr("");
    setFaqMode("edit");
    setActiveFaq(r);
    setFaqForm({
      question: r.question || "",
      answer: r.answer || "",
      category: r.category || "",
      display_order: r.display_order ?? 0,
      is_active: !!r.is_active,
    });
    setFaqOpen(true);
  };

  const askDelete = (r) => {
    setFaqErr("");
    setActiveFaq(r);
    setDelOpen(true);
  };

  const doDelete = async () => {
    if (!activeFaq) return;
    setDelBusy(true);
    setFaqErr("");
    try {
      await deleteFaq(activeFaq.faq_id);
      setDelOpen(false);
      setFaqOpen(false);
      await reload();
    } catch (e) {
      setFaqErr(e?.message || "Delete failed.");
    } finally {
      setDelBusy(false);
    }
  };

  const saveFaq = async () => {
    if (!faqForm) return;

    const question = String(faqForm.question || "").trim();
    const answer = String(faqForm.answer || "").trim();
    if (!question || !answer) {
      setFaqErr("Question and Answer are required.");
      return;
    }

    setFaqBusy(true);
    setFaqErr("");

    try {
      const payload = {
        question,
        answer,
        category: faqForm.category || null,
        display_order: Number.isFinite(Number(faqForm.display_order))
          ? Number(faqForm.display_order)
          : 0,
        is_active: !!faqForm.is_active,
      };

      if (faqMode === "add") {
        await createFaq(payload);
      } else if (faqMode === "edit") {
        if (!activeFaq) throw new Error("No FAQ selected.");
        await updateFaq(activeFaq.faq_id, payload);
      } else {
        return;
      }

      setFaqOpen(false);
      setSaveOpen(false);
      await reload();
    } catch (e) {
      setFaqErr(e?.message || "Save failed.");
    } finally {
      setFaqBusy(false);
    }
  };

  const doToggle = async (r) => {
    if (!canManage) return;
    setFaqErr("");
    try {
      await toggleFaq(r.faq_id);
      await reload();
    } catch (e) {
      setFaqErr(e?.message || "Toggle failed.");
    }
  };

  const modalTitle =
    faqMode === "add" ? "Add FAQ" : faqMode === "edit" ? "Edit FAQ" : "View FAQ";

  const canEdit = canManage && (faqMode === "edit" || faqMode === "add");

  return (
    <div className="ae-page" data-theme={theme} style={cssVars}>
      <div className="ae-topRow">
        <div className="ae-titleWrap">
          <div className="ae-pageTitle">FAQs</div>

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
              {canManage ? (
                <button className="ae-btn ae-btnPrimary" onClick={openAdd}>
                  + Add FAQ
                </button>
              ) : null}
            </div>

            <div className="ae-rightActions">
              <div className="ae-searchBox">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search FAQs…"
                  className="ae-searchInput"
                />
                <span className="ae-searchIcon">⌕</span>
              </div>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="ae-select"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={activeOnly ? "Active" : "All"}
                onChange={(e) => setActiveOnly(e.target.value === "Active")}
                className="ae-select"
              >
                <option value="All">All</option>
                <option value="Active">Active only</option>
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
                      onClick={() => setSort((p) => toggleSort(p, "question"))}
                    >
                      Question{sortIndicator(sort, "question")}
                    </th>
                    <th
                      className="ae-th ae-thClickable"
                      onClick={() => setSort((p) => toggleSort(p, "category"))}
                    >
                      Category{sortIndicator(sort, "category")}
                    </th>
                    <th
                      className="ae-th ae-thClickable"
                      onClick={() => setSort((p) => toggleSort(p, "order"))}
                    >
                      Order{sortIndicator(sort, "order")}
                    </th>
                    <th
                      className="ae-th ae-thClickable"
                      onClick={() => setSort((p) => toggleSort(p, "active"))}
                    >
                      Active{sortIndicator(sort, "active")}
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
                      <tr className="ae-tr" key={r.faq_id}>
                        <td className="ae-td">
                          <div className="ae-equipMeta">
                            <div className="ae-equipName">{r.question || "-"}</div>
                            <div className="ae-mutedTiny">ID: {r.faq_id}</div>
                          </div>
                        </td>

                        <td className="ae-td">{r.category || "-"}</td>
                        <td className="ae-td">{r.display_order ?? 0}</td>
                        <td className="ae-td">
                          <span className={r.is_active ? "ae-pill" : "ae-pillMuted"}>
                            {r.is_active ? "Yes" : "No"}
                          </span>
                        </td>
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

                            {canManage ? (
                              <>
                                <IconBtn
                                  title="Edit"
                                  className="ae-iconBtn"
                                  onClick={() => openEdit(r)}
                                >
                                  ✎
                                </IconBtn>

                                <IconBtn
                                  title={r.is_active ? "Deactivate" : "Activate"}
                                  className="ae-iconBtn"
                                  onClick={() => doToggle(r)}
                                >
                                  ⏻
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

      {faqOpen && faqForm && (
        <div className="ae-backdrop" onClick={() => setFaqOpen(false)}>
          <div className="ae-formModal" onClick={(e) => e.stopPropagation()}>
            <div className="ae-modalTopRow">
              <div className="ae-modalTitle">{modalTitle}</div>
            </div>

            {faqErr ? <div className="ae-alert ae-alertError">{faqErr}</div> : null}

            <div className="ae-formGrid">
              <label className="ae-field">
                <div className="ae-fieldLabel">Category</div>
                <select
                  value={faqForm.category || ""}
                  disabled={!canEdit}
                  className={`ae-select ${!canEdit ? "ae-fieldInputDisabled" : ""}`}
                  onChange={(e) => setFaqForm((p) => ({ ...p, category: e.target.value }))}
                  style={{ height: 42 }}
                >
                  <option value="">—</option>
                  {FAQ_CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <label className="ae-field">
                <div className="ae-fieldLabel">Display order</div>
                <input
                  type="number"
                  value={faqForm.display_order ?? 0}
                  disabled={!canEdit}
                  onChange={(e) => setFaqForm((p) => ({ ...p, display_order: e.target.value }))}
                  className={`ae-fieldInput ${!canEdit ? "ae-fieldInputDisabled" : ""}`}
                />
              </label>

              <label className="ae-field">
                <div className="ae-fieldLabel">Active</div>
                <select
                  value={faqForm.is_active ? "1" : "0"}
                  disabled={!canEdit}
                  className={`ae-select ${!canEdit ? "ae-fieldInputDisabled" : ""}`}
                  onChange={(e) => setFaqForm((p) => ({ ...p, is_active: e.target.value === "1" }))}
                  style={{ height: 42 }}
                >
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </label>

              <label className="ae-field ae-fieldFull">
                <div className="ae-fieldLabel">Question</div>
                <input
                  value={faqForm.question}
                  disabled={!canEdit}
                  onChange={(e) => setFaqForm((p) => ({ ...p, question: e.target.value }))}
                  className={`ae-fieldInput ${!canEdit ? "ae-fieldInputDisabled" : ""}`}
                />
              </label>

              <label className="ae-field ae-fieldFull">
                <div className="ae-fieldLabel">Answer</div>
                <textarea
                  value={faqForm.answer}
                  disabled={!canEdit}
                  onChange={(e) => setFaqForm((p) => ({ ...p, answer: e.target.value }))}
                  className={`ae-fieldInput ${!canEdit ? "ae-fieldInputDisabled" : ""}`}
                  style={{ minHeight: 140, resize: "vertical", paddingTop: 10, lineHeight: 1.5 }}
                />
              </label>
            </div>

            <div className="ae-modalFooter">
              {faqMode === "view" ? (
                canManage ? (
                  <>
                    <button className="ae-btn ae-btnSecondary" onClick={() => askDelete(activeFaq)}>
                      Delete
                    </button>
                    <button className="ae-btn ae-btnPrimary" onClick={() => setFaqMode("edit")}>
                      Edit
                    </button>
                  </>
                ) : (
                  <button className="ae-btn ae-btnSecondary" onClick={() => setFaqOpen(false)}>
                    Close
                  </button>
                )
              ) : (
                <>
                  <button
                    className="ae-btn ae-btnSecondary"
                    onClick={() => {
                      setFaqErr("");
                      setSaveOpen(false);
                      if (faqMode === "add") setFaqOpen(false);
                      else setFaqMode("view");
                    }}
                    disabled={faqBusy}
                  >
                    Cancel
                  </button>

                  <button className="ae-btn ae-btnPrimary" onClick={() => setSaveOpen(true)} disabled={faqBusy}>
                    {faqBusy ? "Saving…" : "Save"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {saveOpen && faqOpen && faqForm && (
        <div className="ae-backdrop ae-backdropTop" onClick={() => setSaveOpen(false)}>
          <div className="ae-confirmModalFancy" onClick={(e) => e.stopPropagation()}>
            <div className="ae-confirmHeader">
              <div className="ae-confirmIconWrap" aria-hidden="true">
                ✅
              </div>
              <div className="ae-confirmHeaderText">
                <div className="ae-confirmTitle">
                  {faqMode === "add" ? "Create FAQ?" : "Confirm changes?"}
                </div>
              </div>

              <button className="ae-modalClose" onClick={() => setSaveOpen(false)}>
                ✕
              </button>
            </div>

            {faqErr ? <div className="ae-alert ae-alertError">{faqErr}</div> : null}

            <div className="ae-confirmActions">
              <button className="ae-btn ae-btnSecondary" onClick={() => setSaveOpen(false)} disabled={faqBusy}>
                Cancel
              </button>

              <button className="ae-btn ae-btnPrimary" onClick={saveFaq} disabled={faqBusy}>
                {faqBusy ? "Saving…" : faqMode === "add" ? "Yes, create" : "Yes, save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {delOpen && activeFaq && (
        <div className="ae-backdrop ae-backdropTop" onClick={() => setDelOpen(false)}>
          <div className="ae-confirmModalFancy" onClick={(e) => e.stopPropagation()}>
            <div className="ae-confirmHeader">
              <div className="ae-confirmIconWrap" aria-hidden="true">
                ⚠️
              </div>

              <div className="ae-confirmHeaderText">
                <div className="ae-confirmTitle">Delete FAQ?</div>
                <div className="ae-mutedTiny">
                  This will permanently remove <b className="ae-strongText">{activeFaq.question}</b>. This can’t be undone.
                </div>
              </div>

              <button className="ae-modalClose" onClick={() => setDelOpen(false)}>
                ✕
              </button>
            </div>

            {faqErr ? <div className="ae-alert ae-alertError">{faqErr}</div> : null}

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