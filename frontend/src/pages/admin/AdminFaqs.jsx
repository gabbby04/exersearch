import { useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";

import { adminThemes, MAIN } from "./AdminLayout";
import { useAuthMe } from "../../utils/useAuthMe";
import { adminAlert, alertError, alertInfo, alertSuccess } from "../../utils/adminAlert";

import {
  getFaqs,
  createFaq,
  updateFaq,
  deleteFaq,
  toggleFaq,
} from "../../utils/faqApi";

import "./AdminEquipments.css";

const BRAND = "#d23f0b";

function safeStr(v) {
  return v == null ? "" : String(v);
}
function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function safeBool(v) {
  return !!v;
}

const EMPTY_FORM = {
  question: "",
  answer: "",
  category: "",
  display_order: 0,
  is_active: true,
};

export default function AdminFaqs() {
  const { theme } = useOutletContext();
  const t = adminThemes[theme].app;

  const { me, loadingMe, isAdmin } = useAuthMe();
  const canEdit = isAdmin && me?.role === "superadmin";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [items, setItems] = useState([]);
  const [pageInfo, setPageInfo] = useState({ currentPage: 1, lastPage: 1, total: 0, perPage: 20 });

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const searchRef = useRef(null);

  const queryParams = useMemo(() => {
    const p = {
      per_page: pageInfo.perPage,
      page: pageInfo.currentPage,
    };
    if (search.trim()) p.search = search.trim();
    if (category.trim()) p.category = category.trim();
    if (activeOnly) p.active = 1;
    return p;
  }, [search, category, activeOnly, pageInfo.perPage, pageInfo.currentPage]);

  const load = async (nextPage = pageInfo.currentPage) => {
    setErr("");
    setLoading(true);
    try {
      const res = await getFaqs({ ...queryParams, page: nextPage });
      setItems(res.items);
      setPageInfo((prev) => ({
        ...prev,
        currentPage: res.currentPage || nextPage,
        lastPage: res.lastPage || 1,
        total: res.total || 0,
        perPage: res.perPage || prev.perPage,
      }));
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load FAQs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, activeOnly, pageInfo.perPage]);

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const openCreate = () => {
    if (!canEdit) return;
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setFormOpen(true);
  };

  const openEdit = (it) => {
    if (!canEdit) return;
    setEditing(it);
    setForm({
      question: safeStr(it.question),
      answer: safeStr(it.answer),
      category: safeStr(it.category),
      display_order: safeNum(it.displayOrder),
      is_active: safeBool(it.isActive),
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setEditing(null);
    setForm({ ...EMPTY_FORM });
  };

  const onSave = async () => {
    if (!canEdit) return;

    const payload = {
      question: safeStr(form.question).trim(),
      answer: safeStr(form.answer).trim(),
      category: safeStr(form.category).trim() || null,
      display_order: safeNum(form.display_order),
      is_active: !!form.is_active,
    };

    if (!payload.question || !payload.answer) {
      await alertError({
        title: "Missing fields",
        text: "Question and Answer are required.",
        theme,
        mainColor: MAIN,
      });
      return;
    }

    setErr("");
    setSaving(true);
    try {
      if (editing?.id) {
        await updateFaq(editing.id, payload);
        await alertSuccess({
          title: "Saved",
          text: "FAQ updated successfully.",
          theme,
          mainColor: MAIN,
        });
      } else {
        await createFaq(payload);
        await alertSuccess({
          title: "Created",
          text: "FAQ created successfully.",
          theme,
          mainColor: MAIN,
        });
      }
      closeForm();
      await load(pageInfo.currentPage);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Failed to save FAQ.";
      setErr(msg);
      await alertError({
        title: "Save failed",
        text: msg,
        theme,
        mainColor: MAIN,
      });
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (it) => {
    if (!canEdit) return;

    const confirm = await adminAlert({
      title: "Delete this FAQ?",
      text: "This action cannot be undone.",
      icon: "warning",
      confirmText: "Delete",
      theme,
      mainColor: MAIN,
    });

    if (!confirm.isConfirmed) return;

    setErr("");
    setSaving(true);
    try {
      await deleteFaq(it.id);
      await alertSuccess({
        title: "Deleted",
        text: "FAQ deleted successfully.",
        theme,
        mainColor: MAIN,
      });
      const nextPage =
        pageInfo.currentPage > 1 && items.length === 1 ? pageInfo.currentPage - 1 : pageInfo.currentPage;
      await load(nextPage);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Failed to delete FAQ.";
      setErr(msg);
      await alertError({
        title: "Delete failed",
        text: msg,
        theme,
        mainColor: MAIN,
      });
    } finally {
      setSaving(false);
    }
  };

  const onToggle = async (it) => {
    if (!canEdit) return;

    const confirm = await adminAlert({
      title: it.isActive ? "Deactivate FAQ?" : "Activate FAQ?",
      text: it.isActive ? "It will no longer show for users (if filtered by active)." : "It will show for users.",
      icon: "question",
      confirmText: it.isActive ? "Deactivate" : "Activate",
      theme,
      mainColor: MAIN,
    });

    if (!confirm.isConfirmed) return;

    setErr("");
    setSaving(true);
    try {
      const updated = await toggleFaq(it.id);
      setItems((prev) => prev.map((x) => (x.id === it.id ? updated : x)));
      await alertInfo({
        title: "Updated",
        text: "Status changed. No need to save.",
        theme,
        mainColor: MAIN,
      });
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Failed to toggle FAQ.";
      setErr(msg);
      await alertError({
        title: "Update failed",
        text: msg,
        theme,
        mainColor: MAIN,
      });
    } finally {
      setSaving(false);
    }
  };

  const goPage = (p) => {
    const next = Math.max(1, Math.min(pageInfo.lastPage || 1, p));
    setPageInfo((prev) => ({ ...prev, currentPage: next }));
    load(next);
  };

  const onApplyFilters = async () => {
    setPageInfo((prev) => ({ ...prev, currentPage: 1 }));
    await load(1);
  };

  if (loadingMe) return <div style={{ padding: 18, color: t.text }}>Loading account…</div>;
  if (!isAdmin) return <div style={{ padding: 18, color: t.text }}>Forbidden.</div>;

  return (
    <div style={{ padding: 18 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: t.text }}>FAQs</div>
          <div style={{ fontSize: 12, color: t.mutedText, marginTop: 2 }}>
            Manage questions and answers (Superadmin only).
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => load(pageInfo.currentPage)}
            disabled={loading || saving}
            style={btnStyle(t, { subtle: true })}
          >
            Refresh
          </button>

          <button
            onClick={openCreate}
            disabled={!canEdit || loading || saving}
            style={btnStyle(t, { brand: true, disabled: !canEdit })}
            title={!canEdit ? "Superadmin only" : "Add FAQ"}
          >
            Add FAQ
          </button>
        </div>
      </div>

      {err && (
        <div
          style={{
            marginBottom: 12,
            padding: "10px 12px",
            borderRadius: 12,
            border: `1px solid ${t.border}`,
            background: t.soft,
            color: t.text,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {err}
        </div>
      )}

      <section style={cardStyle(t)}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontWeight: 900, color: t.text }}>Browse</div>
          <div style={{ fontSize: 12, color: t.mutedText, fontWeight: 800 }}>
            Total: {pageInfo.total}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 160px 160px", gap: 12, marginTop: 12 }}>
          <Field label="Search">
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={inputStyle(t)}
              placeholder="Search question / answer / category"
            />
          </Field>

          <Field label="Category">
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={inputStyle(t)}
              placeholder="e.g. Billing"
            />
          </Field>

          <Field label="Active only">
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 12,
                border: `1px solid ${t.border}`,
                background: t.soft,
                color: t.text,
                cursor: "pointer",
                userSelect: "none",
                height: 40,
              }}
            >
              <input
                type="checkbox"
                checked={!!activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: BRAND }}
              />
              <span style={{ fontSize: 12, fontWeight: 800 }}>Active</span>
            </label>
          </Field>

          <Field label=" ">
            <button
              onClick={onApplyFilters}
              disabled={loading || saving}
              style={btnStyle(t, { subtle: true })}
            >
              Apply
            </button>
          </Field>
        </div>

        <div style={{ marginTop: 14, borderTop: `1px solid ${t.border}` }} />

        {loading ? (
          <div style={{ padding: 14, color: t.text }}>Loading FAQs…</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 14, color: t.mutedText, fontWeight: 800 }}>No FAQs found.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, marginTop: 12 }}>
            {items.map((it) => (
              <div
                key={it.id}
                style={{
                  border: `1px solid ${t.border}`,
                  background: t.soft,
                  borderRadius: 14,
                  padding: 12,
                  display: "grid",
                  gridTemplateColumns: "1fr 220px",
                  gap: 12,
                  alignItems: "start",
                }}
              >
                <div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 900, color: t.text, fontSize: 13 }}>
                      {it.question}
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 900,
                        padding: "4px 8px",
                        borderRadius: 999,
                        border: `1px solid ${t.border}`,
                        background: t.bg,
                        color: t.text,
                      }}
                    >
                      {it.category || "Uncategorized"}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 900,
                        padding: "4px 8px",
                        borderRadius: 999,
                        border: `1px solid ${t.border}`,
                        background: it.isActive ? "#fff" : t.bg,
                        color: it.isActive ? BRAND : t.mutedText,
                      }}
                    >
                      {it.isActive ? "Active" : "Inactive"}
                    </span>
                    <span style={{ fontSize: 11, color: t.mutedText, fontWeight: 800 }}>
                      Order: {it.displayOrder}
                    </span>
                  </div>

                  <div style={{ marginTop: 8, color: t.text, fontSize: 12, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                    {it.answer}
                  </div>
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <button
                    onClick={() => openEdit(it)}
                    disabled={!canEdit || saving}
                    style={btnStyle(t, { subtle: true, disabled: !canEdit })}
                    title={!canEdit ? "Superadmin only" : "Edit"}
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => onToggle(it)}
                    disabled={!canEdit || saving}
                    style={btnStyle(t, { brand: true, disabled: !canEdit })}
                    title={!canEdit ? "Superadmin only" : "Toggle"}
                  >
                    {it.isActive ? "Deactivate" : "Activate"}
                  </button>

                  <button
                    onClick={() => onDelete(it)}
                    disabled={!canEdit || saving}
                    style={btnStyle(t, { danger: true, disabled: !canEdit })}
                    title={!canEdit ? "Superadmin only" : "Delete"}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 14 }}>
          <div style={{ fontSize: 12, color: t.mutedText, fontWeight: 800 }}>
            Page {pageInfo.currentPage} of {pageInfo.lastPage}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => goPage(pageInfo.currentPage - 1)}
              disabled={loading || saving || pageInfo.currentPage <= 1}
              style={btnStyle(t, { subtle: true })}
            >
              Prev
            </button>
            <button
              onClick={() => goPage(pageInfo.currentPage + 1)}
              disabled={loading || saving || pageInfo.currentPage >= pageInfo.lastPage}
              style={btnStyle(t, { subtle: true })}
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {formOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "grid",
            placeItems: "center",
            padding: 14,
            zIndex: 50,
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeForm();
          }}
        >
          <div
            style={{
              width: "min(860px, 100%)",
              borderRadius: 16,
              border: `1px solid ${t.border}`,
              background: t.bg,
              padding: 14,
              boxShadow: "0 18px 50px rgba(0,0,0,0.18)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 900, color: t.text }}>
                  {editing ? "Edit FAQ" : "Add FAQ"}
                </div>
                <div style={{ fontSize: 12, color: t.mutedText, marginTop: 2 }}>
                  Fill in the fields then save.
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={closeForm} disabled={saving} style={btnStyle(t, { subtle: true })}>
                  Cancel
                </button>
                <button
                  onClick={onSave}
                  disabled={!canEdit || saving}
                  style={btnStyle(t, { brand: true, disabled: !canEdit })}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 220px 180px", gap: 12, marginTop: 12 }}>
              <Field label="Category">
                <input
                  value={form.category}
                  onChange={(e) => setField("category", e.target.value)}
                  disabled={!canEdit}
                  style={inputStyle(t)}
                  placeholder="e.g. Payments"
                />
              </Field>

              <Field label="Display Order">
                <input
                  type="number"
                  value={form.display_order}
                  onChange={(e) => setField("display_order", e.target.value)}
                  disabled={!canEdit}
                  style={inputStyle(t)}
                />
              </Field>

              <Field label="Active">
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: `1px solid ${t.border}`,
                    background: t.soft,
                    color: t.text,
                    cursor: !canEdit ? "not-allowed" : "pointer",
                    opacity: !canEdit ? 0.6 : 1,
                    userSelect: "none",
                    height: 40,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!form.is_active}
                    onChange={(e) => setField("is_active", e.target.checked)}
                    disabled={!canEdit}
                    style={{ width: 16, height: 16, accentColor: BRAND }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 800 }}>{form.is_active ? "Active" : "Inactive"}</span>
                </label>
              </Field>
            </div>

            <div style={{ marginTop: 12 }}>
              <Field label="Question">
                <input
                  value={form.question}
                  onChange={(e) => setField("question", e.target.value)}
                  disabled={!canEdit}
                  style={inputStyle(t)}
                  placeholder="Type the question…"
                />
              </Field>
            </div>

            <div style={{ marginTop: 12 }}>
              <Field label="Answer">
                <textarea
                  value={form.answer}
                  onChange={(e) => setField("answer", e.target.value)}
                  disabled={!canEdit}
                  style={textareaStyle(t)}
                  placeholder="Type the answer…"
                />
              </Field>
            </div>
          </div>
        </div>
      )}

      {!canEdit && (
        <div style={{ marginTop: 12, fontSize: 12, color: t.mutedText }}>
          You are logged in as <b>{me?.role}</b>. Only <b>superadmin</b> can manage FAQs.
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.85 }}>{label}</div>
      {children}
    </div>
  );
}

function inputStyle(t) {
  return {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${t.border}`,
    background: t.soft,
    color: t.text,
    outline: "none",
    fontSize: 13,
    fontWeight: 600,
  };
}

function textareaStyle(t) {
  return {
    width: "100%",
    minHeight: 160,
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${t.border}`,
    background: t.soft,
    color: t.text,
    outline: "none",
    fontSize: 13,
    fontWeight: 600,
    resize: "vertical",
    lineHeight: 1.5,
  };
}

function cardStyle(t) {
  return {
    border: `1px solid ${t.border}`,
    background: t.bg,
    borderRadius: 14,
    padding: 14,
  };
}

function btnStyle(t, { subtle = false, brand = false, danger = false, disabled = false } = {}) {
  if (danger) {
    return {
      borderRadius: 10,
      padding: "10px 12px",
      border: `1px solid ${t.border}`,
      background: t.soft,
      color: "#b91c1c",
      cursor: disabled ? "not-allowed" : "pointer",
      fontWeight: 900,
      fontSize: 12,
      opacity: disabled ? 0.6 : 1,
    };
  }

  if (brand) {
    return {
      borderRadius: 10,
      padding: "10px 12px",
      border: `1px solid ${BRAND}`,
      background: BRAND,
      color: "#fff",
      cursor: disabled ? "not-allowed" : "pointer",
      fontWeight: 900,
      fontSize: 12,
      opacity: disabled ? 0.6 : 1,
    };
  }

  const bg = subtle ? t.soft : t.soft;
  return {
    borderRadius: 10,
    padding: "10px 12px",
    border: `1px solid ${t.border}`,
    background: bg,
    color: t.text,
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 800,
    fontSize: 12,
    opacity: disabled ? 0.55 : 1,
  };
}