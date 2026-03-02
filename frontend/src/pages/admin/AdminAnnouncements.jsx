// src/pages/admin/AdminAnnouncements.jsx
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

import {
  adminListAnnouncements,
  adminDeleteAnnouncement,
} from "../../utils/adminAnnouncementApi";

import "./AdminEquipments.css";

function formatDateTimeFallback(value) {
  if (!value) return "-";
  const d = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

export default function AdminAnnouncements() {
  const { theme } = useOutletContext();
  const t = adminThemes[theme]?.app || adminThemes.light.app;
  const isDark = theme === "dark";

  const { me, isAdmin } = useAuthMe();
  const canManage = isAdmin && me?.role === "superadmin";

  const [rows, setRows] = useState([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [deletedOnly, setDeletedOnly] = useState(false);
  const [activeOnly, setActiveOnly] = useState(false);

  const [sort, setSort] = useState({ key: "created", dir: "desc" });
  const pageSize = 10;
  const [page, setPage] = useState(1);

  const [viewOpen, setViewOpen] = useState(false);
  const [activeRow, setActiveRow] = useState(null);

  const [delOpen, setDelOpen] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  const [uiErr, setUiErr] = useState("");

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setViewOpen(false);
        setDelOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const fetchPage = async (p) => {
    // uses apiClient (auth interceptor), not axios direct
    return adminListAnnouncements({ page: p, per_page: 50 });
  };

  const reload = async () => {
    setLoadingRows(true);
    setError("");
    try {
      const first = await fetchPage(1);

      const firstRows = Array.isArray(first?.data) ? first.data : [];
      const lastPage = Number(first?.last_page || 1);

      let merged = [...firstRows];

      if (lastPage > 1) {
        const promises = [];
        for (let p = 2; p <= lastPage; p++) promises.push(fetchPage(p));
        const rest = await Promise.all(promises);
        for (const r of rest) {
          const arr = Array.isArray(r?.data) ? r.data : [];
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const searched = useMemo(() => {
    return globalSearch(rows || [], q, [
      (r) => r.announcement_id,
      (r) => r.title,
      (r) => r.body,
      (r) => r.gym_name,
      (r) => r.gym_id,
      (r) => r.owner_name,
      (r) => r.owner_email,
      (r) => r.owner_id,
    ]);
  }, [rows, q]);

  const filtered = useMemo(() => {
    return searched
      .filter((r) => (activeOnly ? !r.is_deleted : true))
      .filter((r) => (deletedOnly ? !!r.is_deleted : true));
  }, [searched, activeOnly, deletedOnly]);

  useEffect(() => {
    setPage(1);
  }, [q, activeOnly, deletedOnly]);

  const getValue = (r, key) => {
    switch (key) {
      case "title":
        return tableValue.str(r.title);
      case "gym":
        return tableValue.str(r.gym_name || String(r.gym_id || ""));
      case "owner":
        return tableValue.str(r.owner_name || r.owner_email || String(r.owner_id || ""));
      case "deleted":
        return tableValue.num(r.is_deleted ? 1 : 0);
      case "created":
        return tableValue.dateMs(r.created_at);
      case "updated":
        return tableValue.dateMs(r.updated_at);
      case "id":
        return tableValue.num(r.announcement_id);
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
    if (activeOnly) pills.push("Active only");
    if (deletedOnly) pills.push("Deleted only");
    if (q.trim()) pills.push(`Search: "${q.trim()}"`);
    return pills;
  }, [loadingRows, sorted.length, activeOnly, deletedOnly, q]);

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

  const openView = (r) => {
    setUiErr("");
    setActiveRow(r);
    setViewOpen(true);
  };

  const askDelete = (r) => {
    if (!canManage) return;
    setUiErr("");
    setActiveRow(r);
    setDelOpen(true);
  };

  const doDelete = async () => {
    if (!activeRow) return;
    setDelBusy(true);
    setUiErr("");
    try {
      await adminDeleteAnnouncement(activeRow.announcement_id);
      setDelOpen(false);
      setViewOpen(false);
      await reload();
    } catch (e) {
      setUiErr(e?.response?.data?.message || e?.message || "Delete failed.");
    } finally {
      setDelBusy(false);
    }
  };

  return (
    <div className="ae-page" data-theme={theme} style={cssVars}>
      <div className="ae-topRow">
        <div className="ae-titleWrap">
          <div className="ae-pageTitle">Announcements</div>

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
            <div className="ae-leftActions">{/* reserved */}</div>

            <div className="ae-rightActions">
              <div className="ae-searchBox">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search announcements…"
                  className="ae-searchInput"
                />
                <span className="ae-searchIcon">⌕</span>
              </div>

              <select
                value={activeOnly ? "Active" : deletedOnly ? "Deleted" : "All"}
                onChange={(e) => {
                  const v = e.target.value;
                  setActiveOnly(v === "Active");
                  setDeletedOnly(v === "Deleted");
                }}
                className="ae-select"
              >
                <option value="All">All</option>
                <option value="Active">Active only</option>
                <option value="Deleted">Deleted only</option>
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
                      onClick={() => setSort((p) => toggleSort(p, "title"))}
                    >
                      Title{sortIndicator(sort, "title")}
                    </th>

                    <th
                      className="ae-th ae-thClickable"
                      onClick={() => setSort((p) => toggleSort(p, "gym"))}
                    >
                      Gym{sortIndicator(sort, "gym")}
                    </th>

                    <th
                      className="ae-th ae-thClickable"
                      onClick={() => setSort((p) => toggleSort(p, "owner"))}
                    >
                      Owner{sortIndicator(sort, "owner")}
                    </th>

                    <th
                      className="ae-th ae-thClickable"
                      onClick={() => setSort((p) => toggleSort(p, "deleted"))}
                    >
                      Deleted{sortIndicator(sort, "deleted")}
                    </th>

                    <th
                      className="ae-th ae-thClickable"
                      onClick={() => setSort((p) => toggleSort(p, "created"))}
                    >
                      Created{sortIndicator(sort, "created")}
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
                      <tr className="ae-tr" key={r.announcement_id}>
                        <td className="ae-td">
                          <div className="ae-equipMeta">
                            <div className="ae-equipName">{r.title || "-"}</div>
                            <div className="ae-mutedTiny">
                              ID: {r.announcement_id} • Gym ID: {r.gym_id || "-"} • Owner ID: {r.owner_id || "-"}
                            </div>
                          </div>
                        </td>

                        <td className="ae-td">{r.gym_name || (r.gym_id ? `Gym #${r.gym_id}` : "-")}</td>

                        <td className="ae-td">
                          {r.owner_name || r.owner_email || (r.owner_id ? `Owner #${r.owner_id}` : "-")}
                        </td>

                        <td className="ae-td">
                          <span className={r.is_deleted ? "ae-pillMuted" : "ae-pill"}>
                            {r.is_deleted ? "Yes" : "No"}
                          </span>
                        </td>

                        <td className="ae-td ae-mutedCell">
                          {formatDateTimeFallback(r.created_at)}
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
                              <IconBtn
                                title="Delete"
                                className="ae-iconBtnDanger"
                                onClick={() => askDelete(r)}
                              >
                                🗑
                              </IconBtn>
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

      {/* View modal */}
      {viewOpen && activeRow && (
        <div className="ae-backdrop" onClick={() => setViewOpen(false)}>
          <div className="ae-formModal" onClick={(e) => e.stopPropagation()}>
            <div className="ae-modalTopRow">
              <div className="ae-modalTitle">View Announcement</div>
            </div>

            {uiErr ? <div className="ae-alert ae-alertError">{uiErr}</div> : null}

            <div className="ae-formGrid">
              <div className="ae-field ae-fieldFull">
                <div className="ae-fieldLabel">Title</div>
                <div className="ae-mutedSmall" style={{ lineHeight: 1.6 }}>
                  <b className="ae-strongText">{activeRow.title || "-"}</b>
                </div>
              </div>

              <div className="ae-field">
                <div className="ae-fieldLabel">Gym</div>
                <div className="ae-mutedSmall">
                  {activeRow.gym_name || (activeRow.gym_id ? `Gym #${activeRow.gym_id}` : "-")}
                </div>
              </div>

              <div className="ae-field">
                <div className="ae-fieldLabel">Owner</div>
                <div className="ae-mutedSmall">
                  {activeRow.owner_name || activeRow.owner_email || (activeRow.owner_id ? `Owner #${activeRow.owner_id}` : "-")}
                </div>
              </div>

              <div className="ae-field">
                <div className="ae-fieldLabel">Deleted</div>
                <div className="ae-mutedSmall">{activeRow.is_deleted ? "Yes" : "No"}</div>
              </div>

              <div className="ae-field">
                <div className="ae-fieldLabel">Created</div>
                <div className="ae-mutedSmall">{formatDateTimeFallback(activeRow.created_at)}</div>
              </div>

              <div className="ae-field ae-fieldFull">
                <div className="ae-fieldLabel">Body</div>
                <div
                  className="ae-mutedSmall"
                  style={{
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.7,
                    padding: "10px 12px",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    background: "var(--soft)",
                  }}
                >
                  {activeRow.body || "-"}
                </div>
              </div>
            </div>

            <div className="ae-modalFooter">
              {canManage ? (
                <>
                  <button className="ae-btn ae-btnSecondary" onClick={() => askDelete(activeRow)}>
                    Delete
                  </button>
                  <button className="ae-btn ae-btnPrimary" onClick={() => setViewOpen(false)}>
                    Close
                  </button>
                </>
              ) : (
                <button className="ae-btn ae-btnSecondary" onClick={() => setViewOpen(false)}>
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {delOpen && activeRow && (
        <div className="ae-backdrop ae-backdropTop" onClick={() => setDelOpen(false)}>
          <div className="ae-confirmModalFancy" onClick={(e) => e.stopPropagation()}>
            <div className="ae-confirmHeader">
              <div className="ae-confirmIconWrap" aria-hidden="true">
                ⚠️
              </div>

              <div className="ae-confirmHeaderText">
                <div className="ae-confirmTitle">Delete announcement?</div>
                <div className="ae-mutedTiny">
                  You are deleting <b className="ae-strongText">{activeRow.title || "this announcement"}</b>. This action depends on backend:
                  it may soft-delete or hard-delete.
                </div>
              </div>

              <button className="ae-modalClose" onClick={() => setDelOpen(false)}>
                ✕
              </button>
            </div>

            {uiErr ? <div className="ae-alert ae-alertError">{uiErr}</div> : null}

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