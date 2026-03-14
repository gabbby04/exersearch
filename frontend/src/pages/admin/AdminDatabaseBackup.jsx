import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { useOutletContext } from "react-router-dom";
import { adminThemes } from "./AdminLayout";
import "./AdminEquipments.css";
import { api } from "../../utils/apiClient";

const PAGE_TITLE = "Database Backup";

function fmtBytes(bytes) {
  const n = Number(bytes || 0);
  if (!Number.isFinite(n) || n <= 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  const fixed = i === 0 ? 0 : i === 1 ? 1 : 2;
  return `${v.toFixed(fixed)} ${units[i]}`;
}

function fmtDate(s) {
  if (!s) return "—";
  const d = new Date(String(s).replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return String(s);
  return d.toLocaleString();
}

export default function AdminDatabaseBackup() {
  const { theme } = useOutletContext();
  const t = adminThemes[theme]?.app || adminThemes.light.app;
  const isDark = theme === "dark";

  const [loading, setLoading] = useState(false);
  const [backups, setBackups] = useState([]);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sort, setSort] = useState("newest");

  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState("dump");
  const [createScope, setCreateScope] = useState("database");
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState("");

  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreConfirmText, setRestoreConfirmText] = useState("");
  const restorePhrase = "RESTORE DATABASE";

  const fetchBackups = async () => {
    setErr("");
    setLoading(true);
    try {
      const res = await api.get("/admin/db/backups");
      setBackups(res?.data?.data || res?.data || []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load backups.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTables = async () => {
    try {
      const res = await api.get("/admin/db/tables");
      setTables(res?.data?.data || []);
    } catch {
      setTables([]);
    }
  };

  const openCreate = async () => {
    setCreateType("dump");
    setCreateScope("database");
    setSelectedTable("");
    setCreateOpen(true);
    await fetchTables();
  };

  const doCreate = async () => {
    if (createScope === "table" && !selectedTable) {
      Swal.fire({
        title: "Select table",
        text: "Choose a table first.",
        icon: "warning",
      });
      return;
    }

    setLoading(true);
    try {
      await api.post("/admin/db/backup", {
        type: createType,
        table: createScope === "table" ? selectedTable : null,
      });

      Swal.fire({
        title: "Backup created",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });

      setCreateOpen(false);
      await fetchBackups();
    } catch (e) {
      Swal.fire({
        title: "Backup failed",
        text: e?.response?.data?.message || "Could not create backup.",
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadBackup = async (name) => {
    if (!name) return;

    try {
      const res = await api.get(
        `/admin/db/backups/download?name=${encodeURIComponent(name)}`,
        { responseType: "blob" }
      );

      const blob = new Blob([res.data], {
        type: "application/octet-stream",
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      let message = "Could not download backup.";

      if (e?.response?.data instanceof Blob) {
        try {
          const text = await e.response.data.text();
          const json = JSON.parse(text);
          message = json?.message || message;
        } catch {}
      } else {
        message = e?.response?.data?.message || message;
      }

      Swal.fire({
        title: "Download failed",
        text: message,
        icon: "error",
      });
    }
  };

  const openRestore = () => {
    setRestoreFile(null);
    setRestoreConfirmText("");
    setRestoreOpen(true);
  };

  const doRestore = async () => {
    if (!restoreFile) {
      Swal.fire({
        title: "Missing file",
        text: "Choose a backup file.",
        icon: "warning",
      });
      return;
    }

    if ((restoreConfirmText || "").trim() !== restorePhrase) {
      Swal.fire({
        title: "Confirmation required",
        text: `Type exactly: ${restorePhrase}`,
        icon: "warning",
      });
      return;
    }

    const ok = await Swal.fire({
      title: "Restore database now?",
      text: "This can erase current data. Only proceed if you are absolutely sure.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Restore",
      cancelButtonText: "Cancel",
    });

    if (!ok.isConfirmed) return;

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", restoreFile);
      fd.append("confirm", restoreConfirmText);

      await api.post("/admin/db/restore", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      Swal.fire({
        title: "Restore completed",
        icon: "success",
      });

      setRestoreOpen(false);
      setRestoreFile(null);
      setRestoreConfirmText("");
    } catch (e) {
      Swal.fire({
        title: "Restore failed",
        text: e?.response?.data?.message || "Could not restore database.",
        icon: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const qq = (q || "").trim().toLowerCase();
    let rows = Array.isArray(backups) ? [...backups] : [];

    if (typeFilter !== "all") {
      rows = rows.filter((b) => (b?.type || "").toLowerCase() === typeFilter);
    }

    if (qq) {
      rows = rows.filter((b) =>
        String(b?.name || "").toLowerCase().includes(qq)
      );
    }

    const sorters = {
      newest: (a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0),
      oldest: (a, b) => new Date(a?.created_at || 0) - new Date(b?.created_at || 0),
      biggest: (a, b) => Number(b?.size_bytes || 0) - Number(a?.size_bytes || 0),
      smallest: (a, b) => Number(a?.size_bytes || 0) - Number(b?.size_bytes || 0),
    };

    rows.sort(sorters[sort] || sorters.newest);
    return rows;
  }, [backups, q, typeFilter, sort]);

  const stats = useMemo(() => {
    const total = backups?.length || 0;
    const totalBytes = (backups || []).reduce(
      (acc, b) => acc + Number(b?.size_bytes || 0),
      0
    );
    return { total, totalBytes };
  }, [backups]);

  useEffect(() => {
    fetchBackups();
  }, []);

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

  return (
    <div className="ae-page" data-theme={theme} style={cssVars}>
      <div className="ae-topRow">
        <div className="ae-titleWrap">
          <div className="ae-pageTitle">{PAGE_TITLE}</div>
          <div className="ae-headerPills">
            <span className="ae-pill">PostgreSQL</span>
            <span className="ae-pillMuted">
              Total: <b className="ae-strongText">{stats.total}</b>
            </span>
            <span className="ae-pillMuted">
              Size: <b className="ae-strongText">{fmtBytes(stats.totalBytes)}</b>
            </span>
          </div>
        </div>

        <div className="ae-topActions">
          <button
            className="ae-btn ae-btnSecondary"
            onClick={fetchBackups}
            disabled={loading}
          >
            Refresh
          </button>

          <button
            className="ae-btn ae-btnPrimary"
            onClick={openCreate}
            disabled={loading}
          >
            Create Backup
          </button>

          <button
            className="ae-btn ae-btnDanger"
            onClick={openRestore}
            disabled={loading}
          >
            Restore
          </button>
        </div>
      </div>

      <div className="ae-panelOuter">
        <div className="ae-panel">
          <div className="ae-panelTop">
            <div className="ae-leftActions">
              <select
                className="ae-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="dump">.dump</option>
                <option value="sql">.sql</option>
              </select>

              <select
                className="ae-select"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="biggest">Biggest</option>
                <option value="smallest">Smallest</option>
              </select>
            </div>

            <div className="ae-rightActions">
              <div className="ae-searchBox">
                <input
                  className="ae-searchInput"
                  placeholder="Search backups…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <span className="ae-searchIcon">⌕</span>
              </div>

              <span className="ae-mutedSmall" style={{ marginLeft: 10 }}>
                Showing <b className="ae-strongText">{filtered.length}</b>
              </span>
            </div>
          </div>

          {err ? (
            <div className="ae-errorBox">
              <div className="ae-alert ae-alertError">
                <div className="ae-alertTitle">Error</div>
                <div className="ae-mutedTiny">{err}</div>
              </div>
            </div>
          ) : null}

          <div className="ae-tableWrap">
            <table className="ae-table">
              <thead>
                <tr>
                  <th className="ae-th">Filename</th>
                  <th className="ae-th">Type</th>
                  <th className="ae-th">Created</th>
                  <th className="ae-th">Size</th>
                  <th className="ae-th ae-thRight">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && backups.length === 0 ? (
                  <tr>
                    <td className="ae-td" colSpan={5}>
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td className="ae-td" colSpan={5}>
                      No backups found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((b) => (
                    <tr key={b?.name}>
                      <td className="ae-td">{b?.name}</td>
                      <td className="ae-td">{(b?.type || "").toUpperCase()}</td>
                      <td className="ae-td">{fmtDate(b?.created_at)}</td>
                      <td className="ae-td">{fmtBytes(b?.size_bytes)}</td>
                      <td className="ae-td ae-tdRight">
                        <button
                          className="ae-btn ae-btnSecondary"
                          onClick={() => downloadBackup(b?.name)}
                        >
                          Download
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {createOpen && (
        <div className="ae-backdrop" onClick={() => setCreateOpen(false)}>
          <div className="ae-formModal" onClick={(e) => e.stopPropagation()}>
            <div className="ae-modalTopRow">
              <div className="ae-modalTitle">Create Backup</div>
            </div>

            <div className="ae-formGrid">
              <label className="ae-field">
                <div className="ae-fieldLabel">Format</div>
                <select
                  className="ae-fieldInput"
                  value={createType}
                  onChange={(e) => setCreateType(e.target.value)}
                >
                  <option value="dump">.dump</option>
                  <option value="sql">.sql</option>
                </select>
              </label>

              <label className="ae-field">
                <div className="ae-fieldLabel">Scope</div>
                <select
                  className="ae-fieldInput"
                  value={createScope}
                  onChange={(e) => setCreateScope(e.target.value)}
                >
                  <option value="database">Whole Database</option>
                  <option value="table">Single Table</option>
                </select>
              </label>

              {createScope === "table" && (
                <label className="ae-field ae-fieldFull">
                  <div className="ae-fieldLabel">Select Table</div>
                  <select
                    className="ae-fieldInput"
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(e.target.value)}
                  >
                    <option value="">Select table…</option>
                    {tables.map((table) => (
                      <option key={table} value={table}>
                        {table}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <div className="ae-modalFooter">
              <button
                className="ae-btn ae-btnSecondary"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </button>
              <button
                className="ae-btn ae-btnPrimary"
                onClick={doCreate}
                disabled={loading}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {restoreOpen && (
        <div
          className="ae-backdrop ae-backdropTop"
          onClick={() => setRestoreOpen(false)}
        >
          <div
            className="ae-confirmModalFancy"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ae-confirmHeader">
              <div className="ae-confirmIconWrap">⚠️</div>
              <div className="ae-confirmHeaderText">
                <div className="ae-confirmTitle">Restore Database</div>
              </div>
              <button
                className="ae-modalClose"
                onClick={() => setRestoreOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="ae-inlineTools" style={{ marginTop: 12 }}>
              <input
                type="file"
                accept=".dump,.sql"
                className="ae-fieldInput"
                onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
              />

              <input
                className="ae-fieldInput"
                placeholder={`Type: ${restorePhrase}`}
                value={restoreConfirmText}
                onChange={(e) => setRestoreConfirmText(e.target.value)}
              />
            </div>

            <div className="ae-confirmActions">
              <button
                className="ae-btn ae-btnSecondary"
                onClick={() => setRestoreOpen(false)}
              >
                Cancel
              </button>
              <button
                className="ae-btn ae-btnDanger"
                onClick={doRestore}
                disabled={loading}
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="ae-spacer" />
    </div>
  );
}