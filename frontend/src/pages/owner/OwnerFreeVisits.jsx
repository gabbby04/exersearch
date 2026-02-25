// OwnerFreeVisits.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Users,
  Search,
  Calendar,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
  Save,
  Flame,
} from "lucide-react";
import Swal from "sweetalert2";
import "./OwnerFreeVisits.css";
import { useAuthMe } from "../../utils/useAuthMe";
import { getAllMyGyms } from "../../utils/ownerGymApi";
import {
  ownerListFreeVisits,
  ownerMarkFreeVisitUsed,
  ownerSetFreeVisitEnabled,
} from "../../utils/gymFreeVisitApi";

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function initials(nameOrEmail) {
  const s = String(nameOrEmail || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const FREE_VISIT_STATUS = {
  CLAIMED: "claimed",
  USED: "used",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
};

function statusLabel(status) {
  const s = String(status || "").toLowerCase();
  const map = {
    claimed: "Claimed",
    used: "Used",
    cancelled: "Cancelled",
    expired: "Expired",
  };
  return map[s] || status || "-";
}

function badgeClass(status) {
  const s = String(status || "").toLowerCase();
  if (s === "claimed") return "om-badge intent";
  if (s === "used") return "om-badge active";
  if (s === "expired") return "om-badge expired";
  if (s === "cancelled") return "om-badge cancelled";
  return "om-badge";
}

export default function OwnerFreeVisits() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { me, loading: meLoading } = useAuthMe();

  const selectedGymId = useMemo(() => (id ? String(id) : null), [id]);

  const [gymLoading, setGymLoading] = useState(true);
  const [selectedGym, setSelectedGym] = useState(null);

  const [tab, setTab] = useState(FREE_VISIT_STATUS.CLAIMED);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const [listLoading, setListLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);

  const [toggleSaving, setToggleSaving] = useState(false);

  const canManage = useMemo(() => {
    const role = me?.role;
    return role === "owner" || role === "admin" || role === "superadmin";
  }, [me]);

  useEffect(() => {
    if (!selectedGymId) return;
    setPage(1);
  }, [selectedGymId, tab]);

  useEffect(() => {
    let mounted = true;

    async function loadSelectedGym() {
      if (!me || !canManage || !selectedGymId) return;

      setGymLoading(true);
      try {
        const list = await getAllMyGyms({ per_page: 200 });
        if (!mounted) return;

        const found =
          list.find((g) => String(g.gym_id ?? g.id) === String(selectedGymId)) ||
          null;

        if (!found) {
          setSelectedGym(null);
          Swal.fire({
            icon: "error",
            title: "Gym not found",
            text: "You don’t have access to this gym or it doesn’t exist.",
          });
          navigate("/owner/home");
          return;
        }

        setSelectedGym(found);
      } catch (e) {
        if (!mounted) return;
        setSelectedGym(null);
        Swal.fire({
          icon: "error",
          title: "Failed to load gym",
          text: e?.response?.data?.message || e?.message || "Something went wrong",
        });
      } finally {
        if (mounted) setGymLoading(false);
      }
    }

    loadSelectedGym();
    return () => {
      mounted = false;
    };
  }, [me, canManage, selectedGymId, navigate]);

  async function fetchList(next = {}) {
    if (!selectedGymId) return;
    setListLoading(true);

    try {
      const params = {
        status: next.status ?? tab,
        q: next.q ?? q,
        page: next.page ?? page,
      };

      const data = await ownerListFreeVisits(selectedGymId, {
        status: params.status,
        q: params.q,
        page: params.page,
        // perPage removed
      });

      const nextRows = Array.isArray(data?.data) ? data.data : [];
      setRows(nextRows);
      setMeta(data || null);
    } catch (e) {
      setRows([]);
      setMeta(null);
      Swal.fire({
        icon: "error",
        title: "Failed to load free visits",
        text: e?.response?.data?.message || e?.message || "Something went wrong",
      });
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedGymId) return;
    fetchList({ page, status: tab });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGymId, tab, page]);

  const filteredRows = useMemo(() => {
    const query = String(q || "").trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((r) => {
      const name = r?.user?.name;
      const email = r?.user?.email;
      const s1 = String(name || "").toLowerCase();
      const s2 = String(email || "").toLowerCase();
      return s1.includes(query) || s2.includes(query);
    });
  }, [rows, q]);

  const totalPages = useMemo(() => {
    const last = meta?.last_page;
    if (typeof last === "number") return last;

    const total = meta?.total;
    const pp = meta?.per_page; // from backend
    if (typeof total === "number" && typeof pp === "number" && pp > 0) {
      return Math.max(1, Math.ceil(total / pp));
    }
    return 1;
  }, [meta]);

  async function doToggleEnabled(nextEnabled) {
    if (!selectedGymId) return;
    setToggleSaving(true);
    try {
      const res = await ownerSetFreeVisitEnabled(selectedGymId, nextEnabled);
      setSelectedGym((g) =>
        g
          ? {
              ...g,
              free_first_visit_enabled:
                res?.gym?.free_first_visit_enabled ?? nextEnabled,
            }
          : g
      );

      Swal.fire({
        icon: "success",
        title: "Updated",
        timer: 900,
        showConfirmButton: false,
      });
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "Toggle failed",
        text: e?.response?.data?.message || e?.message || "Something went wrong",
      });
    } finally {
      setToggleSaving(false);
    }
  }

  async function markUsed(row) {
    const status = String(row?.status || "").toLowerCase();
    if (status !== "claimed") {
      Swal.fire({
        icon: "info",
        title: "Not claimable",
        text: "Only claimed visits can be marked used.",
      });
      return;
    }

    const name = row?.user?.name || row?.user?.email || "this user";

    const r = await Swal.fire({
      icon: "warning",
      title: "Mark as used?",
      text: `Mark ${name}'s free visit as USED?`,
      showCancelButton: true,
      confirmButtonText: "Mark used",
    });
    if (!r.isConfirmed) return;

    try {
      await ownerMarkFreeVisitUsed(row?.free_visit_id);
      Swal.fire({
        icon: "success",
        title: "Marked used",
        timer: 1000,
        showConfirmButton: false,
      });
      setPage(1);
      fetchList({ page: 1, status: tab });
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "Update failed",
        text: e?.response?.data?.message || e?.message || "Something went wrong",
      });
    }
  }

  if (!selectedGymId) {
    return (
      <div className="od-app">
        <div className="od-container">
          <div className="om-block">
            <div className="om-empty">
              <div className="om-empty-icon">
                <AlertTriangle size={22} />
              </div>
              <h3>Missing gym id</h3>
              <p>Open free visit management from a specific gym.</p>
              <button
                className="om-btn primary"
                type="button"
                onClick={() => navigate("/owner/home")}
              >
                Go to Owner Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (meLoading || gymLoading) {
    return (
      <div className="od-app">
        <div className="od-loading">
          <div className="od-spinner" />
          <p>Loading free visits...</p>
        </div>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="od-app">
        <div className="od-container">
          <div className="om-block">
            <div className="om-empty">
              <div className="om-empty-icon">
                <AlertTriangle size={22} />
              </div>
              <h3>Access denied</h3>
              <p>You don’t have permission to manage free visits.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedGym) {
    return (
      <div className="od-app">
        <div className="od-container">
          <div className="om-block">
            <div className="om-empty">
              <div className="om-empty-icon">
                <Users size={22} />
              </div>
              <h3>Gym not found</h3>
              <p>You don’t have access to this gym.</p>
              <button
                className="om-btn primary"
                type="button"
                onClick={() => navigate("/owner/home")}
              >
                Go to Owner Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const enabled = Boolean(selectedGym?.free_first_visit_enabled);

  return (
    <div className="od-app">
      <div className="od-container">
        <div className="od-hero-section">
          <div className="od-hero-background">
            <div className="od-hero-orb od-hero-orb-1" />
            <div className="od-hero-orb od-hero-orb-2" />
          </div>

          <div className="od-hero-content">
            <div className="od-hero-left">
              <div className="od-hero-greeting">
                <Flame className="od-hero-pulse-icon" size={18} />
                <span>Free Visit Management</span>
              </div>

              <h1 className="od-hero-title">{selectedGym?.name || "Your Gym"}</h1>
              <p className="od-hero-subtitle">
                Toggle free first visit and manage claimed visits (mark as used).
              </p>
            </div>

            <div className="od-hero-quick-stats">
              <div className="od-hero-stat">
                <div className="od-hero-stat-icon views">
                  <CheckCircle2 size={20} />
                </div>
                <div className="od-hero-stat-content">
                  <span className="od-hero-stat-label">Current Tab</span>
                  <span className="od-hero-stat-value">{statusLabel(tab)}</span>
                </div>
              </div>

              <div className="od-hero-stat">
                <div className="od-hero-stat-icon rating">
                  <Users size={20} />
                </div>
                <div className="od-hero-stat-content">
                  <span className="od-hero-stat-label">Visits Listed</span>
                  <span className="od-hero-stat-value">{filteredRows.length}</span>
                </div>
              </div>

              {/* removed Showing + Page */}
            </div>
          </div>

          {/* Toolbar: toggle moved above search; per-page removed; search moved to right slot */}
{/* === REPLACE your whole toolbar section with this === */}
<div className="ofv-controls">
  {/* LEFT: Toggle */}
  <div className="ofv-controls-left">
    <div className="ofv-toggle-row ofv-toggle-row--inline">
      <div className="ofv-toggle-meta">
        <strong>Free First Visit</strong>
        <span>{enabled ? "Enabled" : "Disabled"}</span>
      </div>

      <label className={`ofv-switch ${enabled ? "on" : ""}`}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => doToggleEnabled(e.target.checked)}
          disabled={toggleSaving}
        />
        <span className="ofv-slider" />
      </label>
    </div>
  </div>

  {/* MIDDLE: Tabs */}
  <div className="ofv-controls-mid">
    <div className="om-tabs">
      <button
        className={tab === FREE_VISIT_STATUS.CLAIMED ? "om-tab active" : "om-tab"}
        onClick={() => setTab(FREE_VISIT_STATUS.CLAIMED)}
        type="button"
      >
        Claimed
      </button>
      <button
        className={tab === FREE_VISIT_STATUS.USED ? "om-tab active" : "om-tab"}
        onClick={() => setTab(FREE_VISIT_STATUS.USED)}
        type="button"
      >
        Used
      </button>
      <button
        className={tab === FREE_VISIT_STATUS.CANCELLED ? "om-tab active" : "om-tab"}
        onClick={() => setTab(FREE_VISIT_STATUS.CANCELLED)}
        type="button"
      >
        Cancelled
      </button>
      <button
        className={tab === FREE_VISIT_STATUS.EXPIRED ? "om-tab active" : "om-tab"}
        onClick={() => setTab(FREE_VISIT_STATUS.EXPIRED)}
        type="button"
      >
        Expired
      </button>
    </div>
  </div>

  {/* RIGHT: Search */}
  <div className="ofv-controls-right">
    <div className="om-search om-search--tight">
      <Search size={18} />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name or email..."
      />
      <button
        className="om-search-btn"
        type="button"
        onClick={() => {
          setPage(1);
          fetchList({ page: 1, q, status: tab });
        }}
        disabled={listLoading}
      >
        Search
      </button>
    </div>
  </div>
</div>
        </div>

        {/* Table block */}
        <div className="om-block">
          <div className="om-block-header">
            <h2>
              <Flame size={18} /> Free Visits
            </h2>
          </div>

          {listLoading ? (
            <div className="od-loading" style={{ minHeight: 260 }}>
              <div className="od-spinner" />
              <p>Loading list...</p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="om-empty">
              <div className="om-empty-icon">
                <Flame size={22} />
              </div>
              <h3>No free visits here yet</h3>
              <p>Once users claim a free first visit, it will show up here.</p>
            </div>
          ) : (
            <div className="om-table-wrap">
              <table className="om-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Status</th>
                    <th>Claimed</th>
                    <th>Used</th>
                    <th>Used By</th>
                    <th>Created</th>
                    <th className="om-actions-th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r) => {
                    const name = r?.user?.name || "-";
                    const email = r?.user?.email || "-";
                    const status = String(r?.status || "").toLowerCase();
                    const canUse = status === "claimed";

                    const usedBy =
                      r?.usedByOwner?.name ||
                      r?.used_by_owner?.name ||
                      r?.used_by_owner_name ||
                      (r?.used_by_owner_id ? `Owner #${r.used_by_owner_id}` : "-");

                    const key = `free-${r?.free_visit_id ?? `${r?.gym_id}-${r?.user_id}`}`;

                    return (
                      <tr key={key}>
                        <td>
                          <div className="om-member-cell">
                            <div className="om-avatar">{initials(name || email)}</div>
                            <div className="om-member-meta">
                              <strong title={name}>{name}</strong>
                              <span title={email}>{email}</span>
                              <small className="om-sub">User</small>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className={badgeClass(status)}>{statusLabel(status)}</span>
                        </td>

                        <td>{formatDateTime(r?.claimed_at)}</td>
                        <td>{formatDateTime(r?.used_at)}</td>
                        <td>{usedBy}</td>
                        <td>{formatDateTime(r?.created_at)}</td>

                        <td className="om-actions-td">
                          <div className="om-actions">
                            {canUse ? (
                              <button
                                className="om-btn primary"
                                type="button"
                                onClick={() => markUsed(r)}
                              >
                                <CheckCircle2 size={16} /> Mark Used
                              </button>
                            ) : (
                              <button className="om-btn" type="button" disabled>
                                <Save size={16} /> No Action
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="om-pagination">
                <button
                  className="om-page-btn"
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Prev
                </button>
                <div className="om-page-meta">
                  Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                </div>
                <button
                  className="om-page-btn"
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}