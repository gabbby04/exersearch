// src/pages/admin/AdminAdmins.jsx
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
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  uploadAdminAvatar,
  absoluteUrl,
} from "../../utils/adminAdminsApi";
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

function normRole(r) {
  return String(r || "").toLowerCase();
}

export default function AdminAdmins() {
  const { theme } = useOutletContext();
  const t = adminThemes[theme]?.app || adminThemes.light.app;
  const isDark = theme === "dark";

  const { isAdmin } = useAuthMe();

  const { rows, loading: loadingRows, error, reload } = useApiList(
    "admin/admins",
    { authed: true }
  );

  const [q, setQ] = useState("");

  const [sort, setSort] = useState({ key: "updated", dir: "desc" });
  const pageSize = 10;
  const [page, setPage] = useState(1);

  // Image preview modal (top layer) (for viewing existing avatar only)
  const [previewImg, setPreviewImg] = useState(null);

  // View/Edit/Add modal
  const [admOpen, setAdmOpen] = useState(false);
  const [admMode, setAdmMode] = useState("view"); // "view" | "edit" | "add"
  const [activeAdm, setActiveAdm] = useState(null);
  const [admForm, setAdmForm] = useState(null);
  const [admBusy, setAdmBusy] = useState(false);
  const [admErr, setAdmErr] = useState("");

  // Delete confirm
  const [delOpen, setDelOpen] = useState(false);
  const [delBusy, setDelBusy] = useState(false);

  // Save confirm
  const [saveOpen, setSaveOpen] = useState(false);

  // Password UX
  const [showPass, setShowPass] = useState(false);
  const [showPass2, setShowPass2] = useState(false);

  // Close modals on ESC
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setPreviewImg(null);
        setAdmOpen(false);
        setDelOpen(false);
        setSaveOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // search
  const searched = useMemo(() => {
    return globalSearch(rows, q, [
      (r) => r.user_id,
      (r) => r.name,
      (r) => r.email,
      (r) => r.role,
      (r) => r.admin_profile?.permission_level,
      (r) => r.admin_profile?.notes,
    ]);
  }, [rows, q]);

  useEffect(() => setPage(1), [q]);

  // sort mapping
  const getValue = (r, key) => {
    switch (key) {
      case "name":
        return tableValue.str(r.name);
      case "email":
        return tableValue.str(r.email);
      case "role":
        return tableValue.str(r.role);
      case "perm":
        return tableValue.str(r.admin_profile?.permission_level);
      case "updated":
        return tableValue.dateMs(r.admin_profile?.updated_at || r.updated_at || r.created_at);
      case "id":
        return tableValue.num(r.user_id);
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
    pills.push(loadingRows ? "Loading…" : `${sorted.length} admins`);
    if (q.trim()) pills.push(`Search: "${q.trim()}"`);
    return pills;
  }, [loadingRows, sorted.length, q]);

  // --- Actions ---
  const openAdd = () => {
    setAdmErr("");
    setAdmMode("add");
    setActiveAdm(null);

    // ✅ reset everything so inputs NEVER keep old values
    setAdmForm({
      name: "",
      email: "",
      role: "admin",
      permission_level: "full",
      notes: "",
      password: "",
      password_confirm: "",
    });

    setShowPass(false);
    setShowPass2(false);
    setAdmOpen(true);
  };

  const openView = (r) => {
    setAdmErr("");
    setAdmMode("view");
    setActiveAdm(r);

    setAdmForm({
      name: r.name || "",
      email: r.email || "",
      role: normRole(r.role) || "admin",
      permission_level: r.admin_profile?.permission_level || "full",
      notes: r.admin_profile?.notes || "",
      password: "",
      password_confirm: "",
    });

    setShowPass(false);
    setShowPass2(false);
    setAdmOpen(true);
  };

  const openEdit = (r) => {
    setAdmErr("");
    setAdmMode("edit");
    setActiveAdm(r);

    setAdmForm({
      name: r.name || "",
      email: r.email || "",
      role: normRole(r.role) || "admin",
      permission_level: r.admin_profile?.permission_level || "full",
      notes: r.admin_profile?.notes || "",
      password: "",
      password_confirm: "",
    });

    setShowPass(false);
    setShowPass2(false);
    setAdmOpen(true);
  };

  const askDelete = (r) => {
    setAdmErr("");
    setActiveAdm(r);
    setDelOpen(true);
  };

  const doDelete = async () => {
    if (!activeAdm) return;
    setDelBusy(true);
    setAdmErr("");
    try {
      await deleteAdminUser(activeAdm.user_id);
      setDelOpen(false);
      setAdmOpen(false);
      reload();
    } catch (e) {
      setAdmErr(e.message || "Delete failed.");
    } finally {
      setDelBusy(false);
    }
  };

  const validateAdminForm = () => {
    if (!admForm) return "No form.";

    const name = String(admForm.name || "").trim();
    const email = String(admForm.email || "").trim();
    const role = normRole(admForm.role);
    const perm = String(admForm.permission_level || "").trim();

    if (!name) return "Name is required.";
    if (!email) return "Email is required.";
    if (!/^\S+@\S+\.\S+$/.test(email)) return "Email format is invalid.";

    if (!["admin", "superadmin"].includes(role)) return "Role must be admin or superadmin.";
    if (!["full", "limited", "readonly"].includes(perm)) return "Permission level is invalid.";

    const pwd = String(admForm.password || "");
    const pwd2 = String(admForm.password_confirm || "");

    // ✅ Add mode: password required
    if (admMode === "add") {
      if (!pwd) return "Password is required.";
      if (pwd.length < 8) return "Password must be at least 8 characters.";
      if (pwd !== pwd2) return "Passwords do not match.";
    }

    // ✅ Edit mode: password optional, but if provided validate it
    if (admMode === "edit" && pwd) {
      if (pwd.length < 8) return "Password must be at least 8 characters.";
      if (pwd !== pwd2) return "Passwords do not match.";
    }

    return "";
  };

  const saveAdmin = async () => {
    if (!admForm) return;

    const v = validateAdminForm();
    if (v) {
      setAdmErr(v);
      return;
    }

    setAdmBusy(true);
    setAdmErr("");

    try {
      const payload = {
        name: String(admForm.name || "").trim(),
        email: String(admForm.email || "").trim(),
        role: normRole(admForm.role),
        permission_level: String(admForm.permission_level || "").trim(),
        notes: String(admForm.notes || "").trim() || null,
      };

      const pwd = String(admForm.password || "");
      if (admMode === "add" || (admMode === "edit" && pwd)) {
        payload.password = pwd;
      }

      if (admMode === "add") {
        await createAdminUser(payload);
      } else if (admMode === "edit") {
        if (!activeAdm) throw new Error("No admin selected.");
        await updateAdminUser(activeAdm.user_id, payload);
      }

      setAdmOpen(false);
      setSaveOpen(false);
      reload();
    } catch (e) {
      setAdmErr(e.message || "Save failed.");
    } finally {
      setAdmBusy(false);
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
    admMode === "add" ? "Add Admin" : admMode === "edit" ? "Edit Admin" : "View Admin";

  const canEdit = isAdmin && (admMode === "edit" || admMode === "add");

  return (
    <div className="ae-page" data-theme={theme} style={cssVars}>
      {/* HEADER ROW */}
      <div className="ae-topRow">
        <div className="ae-titleWrap">
          <div className="ae-pageTitle">Admins</div>

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
                <button className="ae-btn ae-btnPrimary" onClick={openAdd}>
                  + Add Admin
                </button>
              ) : null}
            </div>

            <div className="ae-rightActions">
              <div className="ae-searchBox">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search admins…"
                  className="ae-searchInput"
                  autoComplete="off"
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
                      onClick={() => setSort((p) => toggleSort(p, "name"))}
                    >
                      Admin{sortIndicator(sort, "name")}
                    </th>

                    <th
                      className="ae-th ae-thClickable"
                      onClick={() => setSort((p) => toggleSort(p, "email"))}
                    >
                      Email{sortIndicator(sort, "email")}
                    </th>

                    <th
                      className="ae-th ae-thClickable"
                      onClick={() => setSort((p) => toggleSort(p, "role"))}
                    >
                      Role{sortIndicator(sort, "role")}
                    </th>

                    <th
                      className="ae-th ae-thClickable"
                      onClick={() => setSort((p) => toggleSort(p, "perm"))}
                    >
                      Permission{sortIndicator(sort, "perm")}
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
                    pageRows.map((r) => {
                      const avatar = absoluteUrl(r.admin_profile?.avatar_url || "");
                      return (
                        <tr className="ae-tr" key={r.user_id}>
                          <td className="ae-td">
                            <div className="ae-equipCell">
                              <div className="ae-imgBox">
                                {avatar ? (
                                  <img
                                    src={avatar}
                                    alt={r.name}
                                    className="ae-img"
                                    onClick={() =>
                                      setPreviewImg({ src: avatar, name: r.name || "admin" })
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
                                <div className="ae-mutedTiny">ID: {r.user_id}</div>
                              </div>
                            </div>
                          </td>

                          <td className="ae-td">{r.email || "-"}</td>
                          <td className="ae-td">{r.role || "-"}</td>
                          <td className="ae-td">{r.admin_profile?.permission_level || "-"}</td>

                          <td className="ae-td ae-mutedCell">
                            {formatDateTimeFallback(r.admin_profile?.updated_at || r.updated_at)}
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

      {/* VIEW / EDIT / ADD MODAL */}
      {admOpen && admForm && (
        <div className="ae-backdrop" onClick={() => setAdmOpen(false)}>
          <div className="ae-formModal" onClick={(e) => e.stopPropagation()}>
            <div className="ae-modalTopRow">
              <div className="ae-modalTitle">{modalTitle}</div>
            </div>

            {admErr ? <div className="ae-alert ae-alertError">{admErr}</div> : null}

            <div className="ae-formGrid">
              <Field
                label="Name"
                value={admForm.name}
                disabled={!canEdit}
                onChange={(v) => setAdmForm((p) => ({ ...p, name: v }))}
              />

              <Field
                label="Email"
                value={admForm.email}
                disabled={!canEdit}
                onChange={(v) => setAdmForm((p) => ({ ...p, email: v }))}
                inputProps={{
                  autoComplete: "off",
                  name: "admin_email_unique",
                }}
              />

              <label className="ae-field">
                <div className="ae-fieldLabel">Role</div>
                <select
                  value={admForm.role}
                  disabled={!canEdit}
                  onChange={(e) => setAdmForm((p) => ({ ...p, role: e.target.value }))}
                  className={`ae-fieldInput ${!canEdit ? "ae-fieldInputDisabled" : ""}`}
                  style={{ paddingTop: 8, paddingBottom: 8 }}
                >
                  <option value="admin">admin</option>
                  <option value="superadmin">superadmin</option>
                </select>
              </label>

              <label className="ae-field">
                <div className="ae-fieldLabel">Permission level</div>
                <select
                  value={admForm.permission_level}
                  disabled={!canEdit}
                  onChange={(e) =>
                    setAdmForm((p) => ({ ...p, permission_level: e.target.value }))
                  }
                  className={`ae-fieldInput ${!canEdit ? "ae-fieldInputDisabled" : ""}`}
                  style={{ paddingTop: 8, paddingBottom: 8 }}
                >
                  <option value="full">full</option>
                  <option value="limited">limited</option>
                  <option value="readonly">readonly</option>
                </select>
              </label>

              <Field
                label="Notes"
                value={admForm.notes}
                disabled={!canEdit}
                onChange={(v) => setAdmForm((p) => ({ ...p, notes: v }))}
                full
              />

              {/* Password section (Add required; Edit optional) */}
              {canEdit ? (
                <>
                  <label className="ae-field">
                    <div className="ae-fieldLabel">
                      Password{" "}
                      <span className="ae-mutedTiny">
                        {admMode === "add" ? "(required)" : "(leave blank to keep)"}
                      </span>
                    </div>

                    <div style={{ position: "relative" }}>
                      <input
                        value={admForm.password}
                        onChange={(e) =>
                          setAdmForm((p) => ({ ...p, password: e.target.value }))
                        }
                        type={showPass ? "text" : "password"}
                        className="ae-fieldInput"
                        autoComplete="new-password"
                        name="admin_password_unique"
                      />
                      <button
                        type="button"
                        className="ae-btn ae-btnSecondary"
                        style={{
                          position: "absolute",
                          right: 8,
                          top: 6,
                          padding: "6px 10px",
                        }}
                        onClick={() => setShowPass((v) => !v)}
                      >
                        {showPass ? "Hide" : "Show"}
                      </button>
                    </div>

                    <div className="ae-mutedTiny" style={{ marginTop: 6 }}>
                      Min 8 characters{" "}
                      {admForm.password ? (
                        <b className="ae-strongText">
                          ({admForm.password.length}/8)
                        </b>
                      ) : null}
                    </div>
                  </label>

                  <label className="ae-field">
                    <div className="ae-fieldLabel">Confirm password</div>

                    <div style={{ position: "relative" }}>
                      <input
                        value={admForm.password_confirm}
                        onChange={(e) =>
                          setAdmForm((p) => ({ ...p, password_confirm: e.target.value }))
                        }
                        type={showPass2 ? "text" : "password"}
                        className="ae-fieldInput"
                        autoComplete="new-password"
                        name="admin_password_confirm_unique"
                      />
                      <button
                        type="button"
                        className="ae-btn ae-btnSecondary"
                        style={{
                          position: "absolute",
                          right: 8,
                          top: 6,
                          padding: "6px 10px",
                        }}
                        onClick={() => setShowPass2((v) => !v)}
                      >
                        {showPass2 ? "Hide" : "Show"}
                      </button>
                    </div>

                    {admForm.password || admForm.password_confirm ? (
                      <div className="ae-mutedTiny" style={{ marginTop: 6 }}>
                        {admForm.password &&
                        admForm.password_confirm &&
                        admForm.password === admForm.password_confirm ? (
                          <span className="ae-pill">Match ✓</span>
                        ) : (
                          <span className="ae-pillMuted">Must match</span>
                        )}
                      </div>
                    ) : null}
                  </label>
                </>
              ) : null}
            </div>

            <div className="ae-modalFooter">
              {admMode === "view" ? (
                isAdmin ? (
                  <>
                    <button className="ae-btn ae-btnSecondary" onClick={() => askDelete(activeAdm)}>
                      Delete
                    </button>
                    <button className="ae-btn ae-btnPrimary" onClick={() => setAdmMode("edit")}>
                      Edit
                    </button>
                  </>
                ) : (
                  <button className="ae-btn ae-btnSecondary" onClick={() => setAdmOpen(false)}>
                    Close
                  </button>
                )
              ) : (
                <>
                  <button
                    className="ae-btn ae-btnSecondary"
                    onClick={() => {
                      setAdmErr("");
                      setSaveOpen(false);
                      if (admMode === "add") setAdmOpen(false);
                      else setAdmMode("view");
                    }}
                    disabled={admBusy}
                  >
                    Cancel
                  </button>

                  <button
                    className="ae-btn ae-btnPrimary"
                    onClick={() => setSaveOpen(true)}
                    disabled={admBusy}
                  >
                    {admBusy ? "Saving…" : "Save"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM SAVE */}
      {saveOpen && admOpen && admForm && (
        <div className="ae-backdrop ae-backdropTop" onClick={() => setSaveOpen(false)}>
          <div className="ae-confirmModalFancy" onClick={(e) => e.stopPropagation()}>
            <div className="ae-confirmHeader">
              <div className="ae-confirmIconWrap" aria-hidden="true">✅</div>
              <div className="ae-confirmHeaderText">
                <div className="ae-confirmTitle">
                  {admMode === "add" ? "Create admin?" : "Confirm changes?"}
                </div>
                <div className="ae-mutedTiny">
                  {admMode === "add" ? (
                    <>
                      You’re about to add <b className="ae-strongText">{admForm.name || "this admin"}</b>.
                    </>
                  ) : (
                    <>
                      You’re about to update <b className="ae-strongText">{activeAdm?.name || "this admin"}</b>.
                    </>
                  )}
                </div>
              </div>

              <button className="ae-modalClose" onClick={() => setSaveOpen(false)}>✕</button>
            </div>

            {admErr ? <div className="ae-alert ae-alertError">{admErr}</div> : null}

            <div className="ae-confirmActions">
              <button
                className="ae-btn ae-btnSecondary"
                onClick={() => setSaveOpen(false)}
                disabled={admBusy}
              >
                Cancel
              </button>

              <button
                className="ae-btn ae-btnPrimary"
                onClick={saveAdmin}
                disabled={admBusy}
              >
                {admBusy ? "Saving…" : admMode === "add" ? "Yes, create" : "Yes, save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {delOpen && activeAdm && (
        <div className="ae-backdrop ae-backdropTop" onClick={() => setDelOpen(false)}>
          <div className="ae-confirmModalFancy" onClick={(e) => e.stopPropagation()}>
            <div className="ae-confirmHeader">
              <div className="ae-confirmIconWrap" aria-hidden="true">⚠️</div>

              <div className="ae-confirmHeaderText">
                <div className="ae-confirmTitle">Delete admin?</div>
                <div className="ae-mutedTiny">
                  This will permanently remove <b className="ae-strongText">{activeAdm.name}</b>. This can’t be undone.
                </div>
              </div>

              <button className="ae-modalClose" onClick={() => setDelOpen(false)}>✕</button>
            </div>

            {admErr ? <div className="ae-alert ae-alertError">{admErr}</div> : null}

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

function Field({ label, value, onChange, disabled, full, inputProps = {} }) {
  return (
    <label className={`ae-field ${full ? "ae-fieldFull" : ""}`}>
      <div className="ae-fieldLabel">{label}</div>
      <input
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={`ae-fieldInput ${disabled ? "ae-fieldInputDisabled" : ""}`}
        {...inputProps}
      />
    </label>
  );
}
