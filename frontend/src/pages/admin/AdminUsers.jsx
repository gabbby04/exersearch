import React, { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { adminThemes } from "./AdminLayout";

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
  getAdminUserPreferences,
  getAdminOwnerGyms,
  absoluteUrl,
} from "../../utils/userApi";

import "./AdminEquipments.css";

function formatDateTimeFallback(value) {
  if (!value) return "-";
  const d = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

function formatPeso(value) {
  if (value == null || value === "") return "-";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return `₱${n.toLocaleString()}`;
}

function pickGymPrice(g) {
  const direct =
    g?.price ??
    g?.price_per_day ??
    g?.day_price ??
    g?.daily_price ??
    g?.monthly_price ??
    g?.membership_fee ??
    g?.fee ??
    null;

  if (direct != null) return formatPeso(direct);

  if (g?.price_min != null || g?.price_max != null) {
    const a = g?.price_min != null ? formatPeso(g.price_min) : "-";
    const b = g?.price_max != null ? formatPeso(g.price_max) : "-";
    return `${a} – ${b}`;
  }

  if (g?.price_range) return String(g.price_range);
  return "-";
}

function chipStyle(kind = "neutral") {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    border: "1px solid var(--border)",
    background: "var(--soft2)",
    color: "var(--text)",
    lineHeight: 1,
    userSelect: "none",
  };

  if (kind === "owner") {
    return {
      ...base,
      background: "rgba(210, 63, 11, 0.10)",
      border: "1px solid rgba(210, 63, 11, 0.25)",
    };
  }

  if (kind === "user") {
    return {
      ...base,
      background: "rgba(99, 102, 241, 0.10)",
      border: "1px solid rgba(99, 102, 241, 0.25)",
    };
  }

  if (kind === "pref") {
    return {
      ...base,
      background: "rgba(16, 185, 129, 0.10)",
      border: "1px solid rgba(16, 185, 129, 0.25)",
    };
  }

  return base;
}

function sectionStyle(kind = "neutral") {
  const base = {
    marginTop: 12,
    border: "1px solid var(--border)",
    background: "var(--soft)",
    borderRadius: 16,
    padding: 12,
    boxShadow: "var(--shadow)",
  };

  if (kind === "owner") {
    return {
      ...base,
      borderLeft: "4px solid var(--main)",
    };
  }

  if (kind === "user") {
    return {
      ...base,
      borderLeft: "4px solid rgba(99, 102, 241, 0.75)",
    };
  }

  if (kind === "pref") {
    return {
      ...base,
      borderLeft: "4px solid rgba(16, 185, 129, 0.75)",
    };
  }

  return base;
}

function SectionHeader({ title, subtitle, kind, right }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 10,
      }}
    >
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={chipStyle(kind)}>{title}</span>
          {subtitle ? <span className="ae-mutedTiny">{subtitle}</span> : null}
        </div>
      </div>

      {right ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{right}</div>
      ) : null}
    </div>
  );
}

export default function AdminUsers() {
  const { theme } = useOutletContext();
  const t = adminThemes[theme]?.app || adminThemes.light.app;
  const isDark = theme === "dark";

  const { rows, loading: loadingRows, error, reload } = useApiList(
    "/admin/users",
    { authed: true }
  );

  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [prefFilter, setPrefFilter] = useState("All");

  const [sort, setSort] = useState({ key: "id", dir: "desc" });
  const pageSize = 10;
  const [page, setPage] = useState(1);

  const [userOpen, setUserOpen] = useState(false);
  const [activeUser, setActiveUser] = useState(null);

  const [prefLoading, setPrefLoading] = useState(false);
  const [prefErr, setPrefErr] = useState("");

  const [prefView, setPrefView] = useState({
    goal: "",
    activity_level: "",
    budget: "",
    preferred_equipments: [],
    preferred_amenities: [],
  });

  const [ownerGymsLoading, setOwnerGymsLoading] = useState(false);
  const [ownerGymsErr, setOwnerGymsErr] = useState("");
  const [ownerGyms, setOwnerGyms] = useState([]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setUserOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const roleOptions = useMemo(() => {
    const set = new Set((rows || []).map((r) => r.role).filter(Boolean));
    const arr = Array.from(set).sort();
    return ["All", ...arr];
  }, [rows]);

  const searched = useMemo(() => {
    return globalSearch(rows, q, [
      (r) => r.user_id,
      (r) => r.name,
      (r) => r.email,
      (r) => r.role,
    ]);
  }, [rows, q]);

  const filtered = useMemo(() => {
    return searched
      .filter((r) =>
        roleFilter === "All"
          ? true
          : String(r.role || "").toLowerCase() === String(roleFilter).toLowerCase()
      )
      .filter((r) => {
        if (prefFilter === "All") return true;

        const p = r?.preferences || {};
        const hasPref = p.goal != null || p.activity_level != null || p.budget != null;

        return prefFilter === "With" ? hasPref : !hasPref;
      });
  }, [searched, roleFilter, prefFilter]);

  useEffect(() => setPage(1), [q, roleFilter, prefFilter]);

  const getValue = (r, key) => {
    switch (key) {
      case "name":
        return tableValue.str(r.name);
      case "email":
        return tableValue.str(r.email);
      case "role":
        return tableValue.str(r.role);
      case "created":
        return tableValue.dateMs(r.created_at);
      case "id":
        return tableValue.num(r.user_id);
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
    pills.push(loadingRows ? "Loading…" : `${sorted.length} users`);
    if (roleFilter !== "All") pills.push(`Role: ${roleFilter}`);
    if (prefFilter !== "All") pills.push(prefFilter === "With" ? "With preferences" : "No preferences");
    if (q.trim()) pills.push(`Search: "${q.trim()}"`);
    return pills;
  }, [loadingRows, sorted.length, roleFilter, prefFilter, q]);

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

  const resetOwnerGyms = () => {
    setOwnerGyms([]);
    setOwnerGymsErr("");
    setOwnerGymsLoading(false);
  };

  const loadPreferences = async (userId) => {
    setPrefLoading(true);
    setPrefErr("");
    setPrefView({
      goal: "",
      activity_level: "",
      budget: "",
      preferred_equipments: [],
      preferred_amenities: [],
    });

    try {
      const res = await getAdminUserPreferences(userId);

      setPrefView({
        goal: res?.preferences?.goal ?? "",
        activity_level: res?.preferences?.activity_level ?? "",
        budget: res?.preferences?.budget ?? "",
        preferred_equipments: Array.isArray(res?.preferred_equipments) ? res.preferred_equipments : [],
        preferred_amenities: Array.isArray(res?.preferred_amenities) ? res.preferred_amenities : [],
      });
    } catch (e) {
      setPrefErr(e?.message || "Failed to load preferences.");
    } finally {
      setPrefLoading(false);
    }
  };

  const loadOwnerGyms = async (ownerId) => {
    setOwnerGymsLoading(true);
    setOwnerGymsErr("");
    setOwnerGyms([]);

    try {
      const res = await getAdminOwnerGyms(ownerId);
      const gyms = res?.data || res?.gyms || res || [];
      setOwnerGyms(Array.isArray(gyms) ? gyms : []);
    } catch (e) {
      setOwnerGymsErr(e?.message || "Failed to load owned gyms.");
      setOwnerGyms([]);
    } finally {
      setOwnerGymsLoading(false);
    }
  };

  const openView = async (u) => {
    setPrefErr("");
    setActiveUser(u);
    setUserOpen(true);

    await loadPreferences(u.user_id);

    const role = String(u.role || "").toLowerCase();
    if (role === "owner") await loadOwnerGyms(u.user_id);
    else resetOwnerGyms();
  };

  const isOwner = String(activeUser?.role || "").toLowerCase() === "owner";
  const userProfile = activeUser?.profile || null;
  const ownerProfile = activeUser?.owner_profile || null;

  const avatarUrl =
    userProfile?.profile_photo_url ||
    ownerProfile?.profile_photo_url ||
    "";

  return (
    <div className="ae-page" data-theme={theme} style={cssVars}>
      <div className="ae-topRow">
        <div className="ae-titleWrap">
          <div className="ae-pageTitle">Users</div>

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
              <span className="ae-pillMuted">Filters</span>

              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="ae-select">
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {r === "All" ? "All roles" : r}
                  </option>
                ))}
              </select>

              <select value={prefFilter} onChange={(e) => setPrefFilter(e.target.value)} className="ae-select">
                <option value="All">All users</option>
                <option value="With">With preferences</option>
                <option value="Without">No preferences</option>
              </select>

              {(roleFilter !== "All" || prefFilter !== "All" || q.trim()) ? (
                <button
                  className="ae-btn ae-btnSecondary"
                  onClick={() => {
                    setRoleFilter("All");
                    setPrefFilter("All");
                    setQ("");
                  }}
                >
                  Clear
                </button>
              ) : null}
            </div>

            <div className="ae-rightActions">
              <div className="ae-searchBox">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search users…"
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
                    <th className="ae-th ae-thClickable" onClick={() => setSort((p) => toggleSort(p, "email"))}>
                      Email{sortIndicator(sort, "email")}
                    </th>
                    <th className="ae-th ae-thClickable" onClick={() => setSort((p) => toggleSort(p, "role"))}>
                      Role{sortIndicator(sort, "role")}
                    </th>
                    <th className="ae-th ae-thClickable" onClick={() => setSort((p) => toggleSort(p, "created"))}>
                      Created{sortIndicator(sort, "created")}
                    </th>
                    <th className="ae-th ae-thRight" />
                  </tr>
                </thead>

                <tbody>
                  {loadingRows ? (
                    <tr>
                      <td className="ae-td" colSpan={5}>Loading…</td>
                    </tr>
                  ) : pageRows.length === 0 ? (
                    <tr>
                      <td className="ae-td" colSpan={5}>No results.</td>
                    </tr>
                  ) : (
                    pageRows.map((u) => (
                      <tr className="ae-tr" key={u.user_id}>
                        <td className="ae-td">
                          <div className="ae-equipCell">
                            <div className="ae-imgBox">
                              {u.profile?.profile_photo_url || u.owner_profile?.profile_photo_url ? (
                                <img
                                  src={absoluteUrl(u.profile?.profile_photo_url || u.owner_profile?.profile_photo_url)}
                                  alt={u.name}
                                  className="ae-img"
                                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                                />
                              ) : (
                                <span className="ae-mutedTiny">N/A</span>
                              )}
                            </div>

                            <div className="ae-equipMeta">
                              <div className="ae-equipName">{u.name || "-"}</div>
                              <div className="ae-mutedTiny">ID: {u.user_id}</div>
                            </div>
                          </div>
                        </td>

                        <td className="ae-td">{u.email || "-"}</td>
                        <td className="ae-td">{u.role || "-"}</td>
                        <td className="ae-td ae-mutedCell">{formatDateTimeFallback(u.created_at)}</td>

                        <td className="ae-td ae-tdRight">
                          <div className="ae-actionsInline">
                            <IconBtn title="View" className="ae-iconBtn" onClick={() => openView(u)}>
                              👁
                            </IconBtn>
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

      {userOpen && activeUser && (
        <div className="ae-backdrop" onClick={() => setUserOpen(false)}>
          <div className="ae-formModal" onClick={(e) => e.stopPropagation()}>
            <div className="ae-modalTopRow">
              <div className="ae-modalTitle">{isOwner ? "View Owner" : "View User"}</div>
            </div>

            <div style={{ maxHeight: "72vh", overflowY: "auto", paddingRight: 6 }}>
              {prefErr ? <div className="ae-alert ae-alertError">{prefErr}</div> : null}

              <div style={sectionStyle("neutral")}>
                <SectionHeader
                  title="Account"
                  subtitle="Basic info"
                  kind="neutral"
                  right={
                    <span className="ae-pillMuted">
                      {isOwner ? "Owner" : "User"}
                    </span>
                  }
                />

                <div className="ae-equipCell" style={{ alignItems: "center" }}>
                  <div className="ae-imgBox" style={{ width: 56, height: 56 }}>
                    {avatarUrl ? (
                      <img
                        src={absoluteUrl(avatarUrl)}
                        alt={activeUser.name}
                        className="ae-img"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                      />
                    ) : (
                      <span className="ae-mutedTiny">N/A</span>
                    )}
                  </div>

                  <div className="ae-equipMeta">
                    <div className="ae-equipName">{activeUser.name || "-"}</div>
                    <div className="ae-mutedTiny">{activeUser.email || "-"}</div>
                    <div className="ae-mutedTiny">
                      ID: <b className="ae-strongText">{activeUser.user_id}</b> • Role:{" "}
                      <b className="ae-strongText">{activeUser.role || "-"}</b>
                    </div>
                  </div>
                </div>
              </div>

              <div style={sectionStyle("user")}>
                <SectionHeader
                  title="User profile"
                  subtitle="user_profiles"
                  kind="user"
                />

                <div className="ae-formGrid">
                  <ReadOnlyField label="Age" value={userProfile?.age ?? "—"} />
                  <ReadOnlyField label="Weight" value={userProfile?.weight ?? "—"} />
                  <ReadOnlyField label="Height" value={userProfile?.height ?? "—"} />
                  <ReadOnlyField label="Address" value={userProfile?.address ?? "—"} full />
                  <ReadOnlyField label="Latitude" value={userProfile?.latitude ?? "—"} />
                  <ReadOnlyField label="Longitude" value={userProfile?.longitude ?? "—"} />
                </div>
              </div>

              {isOwner ? (
                <div style={sectionStyle("owner")}>
                  <SectionHeader
                    title="Owner profile"
                    subtitle="owner_profiles"
                    kind="owner"
                    right={
                      <span className="ae-pillMuted">
                        {ownerProfile ? (ownerProfile.verified ? "Verified" : "Not verified") : "—"}
                      </span>
                    }
                  />

                  <div className="ae-formGrid">
                    <ReadOnlyField label="Company name" value={ownerProfile?.company_name || "—"} />
                    <ReadOnlyField label="Contact number" value={ownerProfile?.contact_number || "—"} />
                    <ReadOnlyField label="Owner address" value={ownerProfile?.address || "—"} full />
                    <ReadOnlyField label="Last login" value={formatDateTimeFallback(ownerProfile?.last_login)} />
                    <ReadOnlyField label="Login attempts" value={ownerProfile?.login_attempts ?? "—"} />
                  </div>
                </div>
              ) : null}

              <div style={sectionStyle("pref")}>
                <SectionHeader
                  title="Preferences"
                  subtitle="user_preferences + pivots"
                  kind="pref"
                  right={
                    prefLoading ? <span className="ae-pillMuted">Loading…</span> : null
                  }
                />

                <div className="ae-formGrid">
                  <ReadOnlyField label="Goal" value={prefView.goal || "—"} />
                  <ReadOnlyField label="Activity level" value={prefView.activity_level || "—"} />
                  <ReadOnlyField
                    label="Budget"
                    value={prefView.budget === "" || prefView.budget == null ? "—" : String(prefView.budget)}
                  />

                  <ReadOnlyField
                    label="Preferred equipments"
                    value={
                      prefView.preferred_equipments.length
                        ? prefView.preferred_equipments
                            .map((x) => x?.name || `#${x?.equipment_id ?? x?.id ?? "?"}`)
                            .join(", ")
                        : "—"
                    }
                    full
                  />

                  <ReadOnlyField
                    label="Preferred amenities"
                    value={
                      prefView.preferred_amenities.length
                        ? prefView.preferred_amenities
                            .map((x) => x?.name || `#${x?.amenity_id ?? x?.id ?? "?"}`)
                            .join(", ")
                        : "—"
                    }
                    full
                  />
                </div>
              </div>

              {isOwner ? (
                <div style={sectionStyle("owner")}>
                  <SectionHeader
                    title="Owned gyms"
                    subtitle="linked gyms"
                    kind="owner"
                    right={
                      ownerGymsLoading ? <span className="ae-pillMuted">Loading…</span> : null
                    }
                  />

                  {ownerGymsErr ? <div className="ae-alert ae-alertError">{ownerGymsErr}</div> : null}

                  {ownerGymsLoading ? (
                    <div className="ae-mutedSmall">Loading gyms…</div>
                  ) : ownerGyms.length ? (
                    <div className="ae-tableWrap" style={{ marginTop: 8 }}>
                      <table className="ae-table">
                        <thead>
                          <tr>
                            <th className="ae-th">Gym</th>
                            <th className="ae-th">Address</th>
                            <th className="ae-th">Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ownerGyms.map((g) => (
                            <tr className="ae-tr" key={g.gym_id || g.id}>
                              <td className="ae-td">
                                <div className="ae-equipCell">
                                  <div className="ae-imgBox">
                                    {g.image_url || g.main_image_url ? (
                                      <img
                                        src={absoluteUrl(g.image_url || g.main_image_url)}
                                        alt={g.name || "gym"}
                                        className="ae-img"
                                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                                      />
                                    ) : (
                                      <span className="ae-mutedTiny">N/A</span>
                                    )}
                                  </div>

                                  <div className="ae-equipMeta">
                                    <div className="ae-equipName">{g.name || `Gym #${g.gym_id || g.id}`}</div>
                                    <div className="ae-mutedTiny">ID: {g.gym_id || g.id}</div>
                                  </div>
                                </div>
                              </td>

                              <td className="ae-td">{g.address || g.location || "-"}</td>
                              <td className="ae-td">{pickGymPrice(g)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="ae-mutedSmall">No gyms linked to this owner.</div>
                  )}
                </div>
              ) : null}

              <div style={{ height: 10 }} />
            </div>

            <div className="ae-modalFooter">
              <button className="ae-btn ae-btnSecondary" onClick={() => setUserOpen(false)}>
                Close
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

function ReadOnlyField({ label, value, full }) {
  return (
    <label className={`ae-field ${full ? "ae-fieldFull" : ""}`}>
      <div className="ae-fieldLabel">{label}</div>
      <input value={value} disabled className="ae-fieldInput ae-fieldInputDisabled" />
    </label>
  );
}