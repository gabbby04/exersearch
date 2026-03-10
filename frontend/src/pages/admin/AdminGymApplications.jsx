import React, { useEffect, useMemo, useState, useRef } from "react";
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

import { approveGym, rejectGym } from "../../utils/gymApprovalApi";
import { absoluteUrl } from "../../utils/findGymsData";

import "./AdminEquipments.css";
import "./AdminOwnerApplications.css";

function normalizeStatus(s) {
  return String(s || "").trim().toLowerCase();
}

function formatDateTimeFallback(value) {
  if (!value) return "-";
  const d = new Date(String(value).replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}

const STATUS_OPTIONS = ["All", "pending", "approved", "rejected"];

function safeArr(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      if (v.includes(",")) return v.split(",").map((s) => s.trim()).filter(Boolean);
      return [];
    }
  }
  return [];
}

function isFiniteNum(v) {
  const n = Number(v);
  return Number.isFinite(n);
}

function peso(v) {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return `₱${n.toLocaleString()}`;
}

function toAbsUrl(u) {
  const s = String(u || "").trim();
  if (!s) return "";
  return absoluteUrl(s);
}

function normalizeStoragePath(u) {
  const s = String(u || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s) || s.startsWith("//")) return s;
  if (s.startsWith("public/storage/")) return `/${s.replace(/^public\//, "")}`;
  if (s.startsWith("storage/")) return `/${s}`;
  if (s.startsWith("/storage/")) return s;
  return s;
}

function ReadOnlyMap({ lat, lng }) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const loadLeaflet = () =>
      new Promise((resolve) => {
        if (window.L) return resolve(window.L);

        if (!document.querySelector('link[href*="leaflet.min.css"]')) {
          const css = document.createElement("link");
          css.rel = "stylesheet";
          css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
          document.head.appendChild(css);
        }

        const existing = document.querySelector('script[src*="leaflet.min.js"]');
        if (existing) {
          existing.addEventListener("load", () => resolve(window.L));
          return;
        }

        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
        script.onload = () => resolve(window.L);
        document.head.appendChild(script);
      });

    loadLeaflet().then((L) => {
      if (cancelled) return;
      if (!ref.current || mapRef.current) return;

      const map = L.map(ref.current, {
        center: [lat, lng],
        zoom: 16,
        zoomControl: true,
        dragging: true,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([lat, lng]).addTo(map);

      mapRef.current = map;
      markerRef.current = marker;
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mapRef.current) mapRef.current.setView([lat, lng], 16);
    if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
  }, [lat, lng]);

  return <div ref={ref} className="ao-map" />;
}

function MainPhoto({ url }) {
  const normalized = normalizeStoragePath(url);
  const u = toAbsUrl(normalized);
  if (!u) return <div className="ae-mutedSmall">No main photo.</div>;

  return (
    <div className="ao-previewWrap">
      <div className="ao-previewTop">
        <a className="ao-link" href={u} target="_blank" rel="noreferrer">
          Open photo ↗
        </a>
        <span className="ae-mutedTiny ao-urlTiny" title={u}>
          {u}
        </span>
      </div>

      <img
        src={u}
        alt="Gym main photo"
        className="ao-docImg"
        onError={(e) => {
          e.currentTarget.classList.add("ao-photoBroken");
        }}
      />
    </div>
  );
}

function GalleryGrid({ urls }) {
  const list = safeArr(urls)
    .map(normalizeStoragePath)
    .map(toAbsUrl)
    .filter(Boolean);

  if (!list.length) return <div className="ae-mutedSmall">No gallery photos.</div>;

  return (
    <div className="ao-gallery">
      {list.map((u) => (
        <a
          key={u}
          href={u}
          target="_blank"
          rel="noreferrer"
          className="ao-photoLink"
          title="Open full image"
        >
          <img
            src={u}
            alt=""
            className="ao-photo"
            onError={(e) => {
              e.currentTarget.classList.add("ao-photoBroken");
            }}
          />
        </a>
      ))}
    </div>
  );
}

export default function AdminGymApplications() {
  const { theme } = useOutletContext();
  const t = adminThemes[theme]?.app || adminThemes.light.app;
  const isDark = theme === "dark";

  const { isAdmin } = useAuthMe();

  const { rows, loading: loadingRows, error, reload } = useApiList("/admin/gyms", { authed: true });

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("pending");
  const [sort, setSort] = useState({ key: "created", dir: "desc" });

  const pageSize = 10;
  const [page, setPage] = useState(1);

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);

  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const [tab, setTab] = useState("gym");

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        setApproveOpen(false);
        setRejectOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const searched = useMemo(() => {
    return globalSearch(rows, q, [
      (r) => r.gym_id,
      (r) => r.name,
      (r) => r.address,
      (r) => r.status,
      (r) => r.owner_id,
      (r) => r.owner?.name,
      (r) => r.owner?.email,
      (r) => r.contact_number,
      (r) => r.email,
      (r) => r.gym_type,
    ]);
  }, [rows, q]);

  const filtered = useMemo(() => {
    return searched.filter((r) =>
      status === "All" ? true : normalizeStatus(r.status) === normalizeStatus(status)
    );
  }, [searched, status]);

  useEffect(() => {
    setPage(1);
  }, [q, status]);

  const getValue = (r, key) => {
    switch (key) {
      case "gym":
        return tableValue.str(r.name);
      case "owner":
        return tableValue.str(r.owner?.name || r.owner?.email || "");
      case "status":
        return tableValue.str(r.status);
      case "created":
        return tableValue.dateMs(r.created_at);
      case "updated":
        return tableValue.dateMs(r.updated_at);
      case "id":
        return tableValue.num(r.gym_id);
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
    pills.push(loadingRows ? "Loading…" : `${sorted.length} gyms`);
    if (status !== "All") pills.push(status);
    return pills;
  }, [loadingRows, sorted.length, status]);

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

  const statusPillClass = (s) => {
    const v = normalizeStatus(s);
    if (v === "approved") return "ae-pill ae-pillSuccess";
    if (v === "pending") return "ae-pill ae-pillWarn";
    if (v === "rejected") return "ae-pill ae-pillDanger";
    return "ae-pill ae-pillMuted";
  };

  const openView = (r) => {
    setErr("");
    setTab("gym");

    const fixed = {
      ...r,
      gallery_urls: safeArr(r.gallery_urls),
    };

    setActive(fixed);
    setOpen(true);
  };

  const askApprove = (r) => {
    setErr("");
    setActive(r);
    setApproveOpen(true);
  };

  const askReject = (r) => {
    setErr("");
    setRejectReason("");
    setActive(r);
    setRejectOpen(true);
  };

  const doApprove = async () => {
    if (!active) return;
    setBusy(true);
    setErr("");
    try {
      await approveGym(active.gym_id);
      setApproveOpen(false);
      setOpen(false);
      reload();
    } catch (e) {
      setErr(e?.message || "Approve failed.");
    } finally {
      setBusy(false);
    }
  };

  const doReject = async () => {
    if (!active) return;
    setBusy(true);
    setErr("");
    try {
      await rejectGym(active.gym_id, rejectReason?.trim() || null);
      setRejectOpen(false);
      setOpen(false);
      reload();
    } catch (e) {
      setErr(e?.message || "Reject failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ae-page" data-theme={theme} style={cssVars}>
      <div className="ae-topRow">
        <div className="ae-titleWrap">
          <div className="ae-pageTitle">Gym Applications</div>

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
              <span className="ae-mutedSmall">
                Review gyms → approve makes it visible in user search/recommendations.
              </span>
            </div>

            <div className="ae-rightActions">
              <div className="ae-searchBox">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search gyms…"
                  className="ae-searchInput"
                />
                <span className="ae-searchIcon">⌕</span>
              </div>

              <select value={status} onChange={(e) => setStatus(e.target.value)} className="ae-select">
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s === "All" ? "All statuses" : s}
                  </option>
                ))}
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
                    <th className="ae-th ae-thClickable" onClick={() => setSort((p) => toggleSort(p, "gym"))}>
                      Gym{sortIndicator(sort, "gym")}
                    </th>
                    <th className="ae-th ae-thClickable" onClick={() => setSort((p) => toggleSort(p, "owner"))}>
                      Owner{sortIndicator(sort, "owner")}
                    </th>
                    <th className="ae-th ae-thClickable" onClick={() => setSort((p) => toggleSort(p, "status"))}>
                      Status{sortIndicator(sort, "status")}
                    </th>
                    <th className="ae-th ae-thClickable" onClick={() => setSort((p) => toggleSort(p, "created"))}>
                      Created{sortIndicator(sort, "created")}
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
                      <tr className="ae-tr" key={r.gym_id}>
                        <td className="ae-td">
                          <div className="ae-equipMeta">
                            <div className="ae-equipName">{r.name || "-"}</div>
                            <div className="ae-mutedTiny">Gym ID: {r.gym_id}</div>
                          </div>
                        </td>

                        <td className="ae-td">
                          <div className="ae-equipMeta">
                            <div className="ae-equipName">{r.owner?.name || r.owner?.email || "-"}</div>
                            <div className="ae-mutedTiny">Owner ID: {r.owner_id ?? "-"}</div>
                          </div>
                        </td>

                        <td className="ae-td">
                          <span className={statusPillClass(r.status)}>{normalizeStatus(r.status) || "-"}</span>
                        </td>

                        <td className="ae-td ae-mutedCell">{formatDateTimeFallback(r.created_at)}</td>
                        <td className="ae-td ae-mutedCell">{formatDateTimeFallback(r.updated_at)}</td>

                        <td className="ae-td ae-tdRight">
                          <div className="ae-actionsInline">
                            <IconBtn title="View" className="ae-iconBtn" onClick={() => openView(r)}>
                              👁
                            </IconBtn>

                            {isAdmin && normalizeStatus(r.status) === "pending" ? (
                              <>
                                <IconBtn title="Approve" className="ae-iconBtn" onClick={() => askApprove(r)}>
                                  ✅
                                </IconBtn>
                                <IconBtn title="Reject" className="ae-iconBtnDanger" onClick={() => askReject(r)}>
                                  ✕
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

      {open && active && (
        <div className="ae-backdrop" onClick={() => setOpen(false)}>
          <div className="ae-formModal ao-formModalScroll" onClick={(e) => e.stopPropagation()}>
            <div className="ao-stickyTop">
              <div className="ae-modalTopRow">
                <div>
                  <div className="ae-modalTitle">Gym Review</div>
                  <div className="ae-mutedTiny">
                    Gym ID: <b className="ae-strongText">{active.gym_id}</b> •{" "}
                    <span className={statusPillClass(active.status)}>
                      {normalizeStatus(active.status) || "-"}
                    </span>
                  </div>
                </div>
                <button className="ae-modalClose" onClick={() => setOpen(false)}>
                  ✕
                </button>
              </div>

              {err ? <div className="ae-alert ae-alertError">{err}</div> : null}

              <div className="ao-tabs">
                <button type="button" className={`ao-tab ${tab === "gym" ? "on" : ""}`} onClick={() => setTab("gym")}>
                  Gym + Map
                </button>
                <button
                  type="button"
                  className={`ao-tab ${tab === "owner" ? "on" : ""}`}
                  onClick={() => setTab("owner")}
                >
                  Owner
                </button>
                <button
                  type="button"
                  className={`ao-tab ${tab === "media" ? "on" : ""}`}
                  onClick={() => setTab("media")}
                >
                  Photos
                </button>
              </div>
            </div>

            <div className="ao-modalBody">
              {tab === "gym" && (
                <Section title="Gym Details">
                  <div className="ae-formGrid">
                    <ReadOnly label="Name" value={active.name || "-"} full />
                    <ReadOnly label="Address" value={active.address || "-"} full />

                    <ReadOnly label="Latitude" value={active.latitude ?? "-"} />
                    <ReadOnly label="Longitude" value={active.longitude ?? "-"} />

                    <ReadOnly
                      label="Pricing"
                      value={`Day: ${peso(active.daily_price)} | Monthly: ${peso(active.monthly_price)} | Annual: ${peso(
                        active.annual_price
                      )}`}
                      full
                    />

                    <ReadOnly label="Type" value={active.gym_type || "-"} />
                    <ReadOnly label="24 Hours" value={active.is_24_hours ? "Yes" : "No"} />
                    <ReadOnly label="Airconditioned" value={active.is_airconditioned ? "Yes" : "No"} />
                    <ReadOnly label="Has Trainers" value={active.has_personal_trainers ? "Yes" : "No"} />
                    <ReadOnly label="Has Classes" value={active.has_classes ? "Yes" : "No"} />

                    <ReadOnly label="Contact" value={active.contact_number || "-"} />
                    <ReadOnly label="Email" value={active.email || "-"} />

                    <ReadOnly label="Website" value={active.website || "-"} full />
                    <ReadOnly label="Facebook" value={active.facebook_page || "-"} full />
                    <ReadOnly label="Instagram" value={active.instagram_page || "-"} full />

                    <ReadOnly label="Description" value={active.description || "-"} full />
                  </div>

                  <div className="ao-card">
                    <div className="ao-cardTop">
                      <div className="ao-cardTitle">Pinned Location</div>
                      {isFiniteNum(active.latitude) && isFiniteNum(active.longitude) ? (
                        <a
                          className="ao-link"
                          href={`https://www.google.com/maps?q=${Number(active.latitude)},${Number(active.longitude)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open in Google Maps ↗
                        </a>
                      ) : (
                        <span className="ae-mutedTiny">No coords</span>
                      )}
                    </div>

                    {isFiniteNum(active.latitude) && isFiniteNum(active.longitude) ? (
                      <ReadOnlyMap lat={Number(active.latitude)} lng={Number(active.longitude)} />
                    ) : (
                      <div className="ae-mutedSmall">No coordinates submitted.</div>
                    )}
                  </div>
                </Section>
              )}

              {tab === "owner" && (
                <Section title="Owner">
                  <div className="ae-formGrid">
                    <ReadOnly label="Owner ID" value={String(active.owner_id ?? "-")} />
                    <ReadOnly label="Owner name/email" value={active.owner?.name || active.owner?.email || "-"} full />
                    <ReadOnly label="Approved at" value={formatDateTimeFallback(active.approved_at)} />
                    <ReadOnly label="Approved by" value={String(active.approved_by ?? "-")} />
                  </div>
                </Section>
              )}

              {tab === "media" && (
                <Section title="Gym Photos">
                  <div className="ao-card">
                    <div className="ao-cardTop">
                      <div className="ao-cardTitle">Main Photo</div>
                      {active.main_image_url ? (
                        <a
                          className="ao-link"
                          href={toAbsUrl(normalizeStoragePath(active.main_image_url))}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open ↗
                        </a>
                      ) : (
                        <span className="ae-mutedTiny">None</span>
                      )}
                    </div>
                    <MainPhoto url={active.main_image_url} />
                  </div>

                  <div className="ao-card" style={{ marginTop: 12 }}>
                    <div className="ao-cardTop">
                      <div className="ao-cardTitle">Gallery</div>
                      <span className="ae-mutedTiny">{safeArr(active.gallery_urls).length} photo(s)</span>
                    </div>
                    <GalleryGrid urls={active.gallery_urls} />
                  </div>
                </Section>
              )}

              <Section title="Meta">
                <div className="ae-formGrid">
                  <ReadOnly label="Created" value={formatDateTimeFallback(active.created_at)} />
                  <ReadOnly label="Updated" value={formatDateTimeFallback(active.updated_at)} />
                </div>
              </Section>
            </div>

            <div className="ao-stickyBottom">
              <div className="ae-modalFooter">
                {isAdmin && normalizeStatus(active.status) === "pending" ? (
                  <>
                    <button className="ae-btn ae-btnSecondary" onClick={() => askReject(active)} disabled={busy}>
                      Reject
                    </button>
                    <button className="ae-btn ae-btnPrimary" onClick={() => askApprove(active)} disabled={busy}>
                      Approve
                    </button>
                  </>
                ) : (
                  <button className="ae-btn ae-btnSecondary" onClick={() => setOpen(false)}>
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {approveOpen && active && (
        <div className="ae-backdrop ae-backdropTop" onClick={() => setApproveOpen(false)}>
          <div className="ae-confirmModalFancy" onClick={(e) => e.stopPropagation()}>
            <div className="ae-confirmHeader">
              <div className="ae-confirmIconWrap" aria-hidden="true">
                ✅
              </div>
              <div className="ae-confirmHeaderText">
                <div className="ae-confirmTitle">Approve gym?</div>
                <div className="ae-mutedTiny">This makes the gym visible to users.</div>
              </div>
              <button className="ae-modalClose" onClick={() => setApproveOpen(false)}>
                ✕
              </button>
            </div>

            {err ? <div className="ae-alert ae-alertError">{err}</div> : null}

            <div className="ae-confirmActions">
              <button className="ae-btn ae-btnSecondary" onClick={() => setApproveOpen(false)} disabled={busy}>
                Cancel
              </button>
              <button className="ae-btn ae-btnPrimary" onClick={doApprove} disabled={busy}>
                {busy ? "Approving…" : "Yes, approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectOpen && active && (
        <div className="ae-backdrop ae-backdropTop" onClick={() => setRejectOpen(false)}>
          <div className="ae-confirmModalFancy" onClick={(e) => e.stopPropagation()}>
            <div className="ae-confirmHeader">
              <div className="ae-confirmIconWrap" aria-hidden="true">
                ⚠️
              </div>
              <div className="ae-confirmHeaderText">
                <div className="ae-confirmTitle">Reject gym?</div>
                <div className="ae-mutedTiny">This will mark the gym as rejected.</div>
              </div>
              <button className="ae-modalClose" onClick={() => setRejectOpen(false)}>
                ✕
              </button>
            </div>

            {err ? <div className="ae-alert ae-alertError">{err}</div> : null}

            <label className="ae-field ae-fieldFull" style={{ marginTop: 10 }}>
              <div className="ae-fieldLabel">Reason (optional)</div>
              <input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="ae-fieldInput"
                placeholder="Optional note…"
              />
            </label>

            <div className="ae-confirmActions">
              <button className="ae-btn ae-btnSecondary" onClick={() => setRejectOpen(false)} disabled={busy}>
                Cancel
              </button>
              <button className="ae-btn ae-btnDanger" onClick={doReject} disabled={busy}>
                {busy ? "Rejecting…" : "Yes, reject"}
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

function Section({ title, children }) {
  return (
    <div className="ao-section">
      <div className="ao-sectionTitle">{title}</div>
      {children}
    </div>
  );
}

function ReadOnly({ label, value, full }) {
  return (
    <label className={`ae-field ${full ? "ae-fieldFull" : ""}`}>
      <div className="ae-fieldLabel">{label}</div>
      <input value={String(value ?? "")} disabled className="ae-fieldInput ae-fieldInputDisabled" />
    </label>
  );
}