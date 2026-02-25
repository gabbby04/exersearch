import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { api } from "../../utils/apiClient";
import { getGymRatings, normalizeGymRatingsResponse } from "../../utils/gymRatingApi";
import "./ReviewsModal.css";

function clamp(n, a, b) {
  const x = Number(n);
  if (!Number.isFinite(x)) return a;
  return Math.max(a, Math.min(b, x));
}

// 5-star row, consistent with your GymDetails version
function StarRow({ value = 0, compact = false }) {
  const v = clamp(value, 0, 5);
  const full = Math.round(v);

  return (
    <div className={`starrow ${compact ? "starrow-compact" : ""}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`star ${i <= full ? "filled" : ""}`} aria-hidden="true">
          ★
        </span>
      ))}
    </div>
  );
}

function reviewTag(r) {
  // Prefer verified boolean if backend sends it
  const verifiedBool = r?.verified === true;
  const via = String(r?.verified_via || "").toLowerCase();

  if (verifiedBool) {
    if (via === "membership") return { label: "Member", cls: "tag-member", key: "member" };
    if (via === "free_visit_used") return { label: "Visited", cls: "tag-visited", key: "visited" };
    return { label: "Verified", cls: "tag-member", key: "member" };
  }

  if (via === "membership") return { label: "Member", cls: "tag-member", key: "member" };
  if (via === "free_visit_used") return { label: "Visited", cls: "tag-visited", key: "visited" };
  return { label: "Unverified", cls: "tag-unverified", key: "unverified" };
}

export default function ReviewsModal({
  open,
  onClose,
  gymId,
  gymName = "Gym",
  myUserId,
  onEditMine, // optional: open RateGymModal from parent
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Filters
  const [starsFilter, setStarsFilter] = useState(0); // 0 = all
  const [statusFilter, setStatusFilter] = useState("all"); // all | member | visited | unverified

  // Data
  const [state, setState] = useState(() => ({
    ratings: [],
    pagination: { current_page: 1, last_page: 1, total: 0, per_page: 0 },
    summary: {},
  }));

  const canLoadMore = useMemo(() => {
    const cur = Number(state?.pagination?.current_page || 1);
    const last = Number(state?.pagination?.last_page || 1);
    return cur < last;
  }, [state]);

  async function fetchPage(page = 1, { reset = false } = {}) {
    if (!gymId) return;
    try {
      setLoading(true);
      setErr("");

      // Try server-side paging. If your backend supports filters later, we can add them.
      const data = await getGymRatings(gymId, { per_page: 20, page });
      const normalized = normalizeGymRatingsResponse(data);

      setState((prev) => {
        const nextRatings = reset
          ? (normalized.ratings || [])
          : [...(prev.ratings || []), ...(normalized.ratings || [])];

        return {
          ...normalized,
          ratings: nextRatings,
        };
      });
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.message || e?.message || "Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  }

  // open -> load first page
  useEffect(() => {
    if (!open) return;
    // reset filters when opening (optional)
    setStarsFilter(0);
    setStatusFilter("all");
    setState({
      ratings: [],
      pagination: { current_page: 1, last_page: 1, total: 0, per_page: 0 },
      summary: {},
    });
    fetchPage(1, { reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, gymId]);

  // Client-side filtered list (safe even if backend doesn’t support filtering yet)
  const filtered = useMemo(() => {
    const list = Array.isArray(state.ratings) ? state.ratings : [];

    return list.filter((r) => {
      const sOk = starsFilter ? Number(r?.stars || 0) === Number(starsFilter) : true;

      const tag = reviewTag(r);
      const stOk = statusFilter === "all" ? true : tag.key === statusFilter;

      return sOk && stOk;
    });
  }, [state.ratings, starsFilter, statusFilter]);

  const mineFirst = useMemo(() => {
    if (!myUserId) return filtered;

    const mine = [];
    const rest = [];

    filtered.forEach((r) => {
      const reviewerId = Number(r?.user_id ?? r?.user?.user_id ?? r?.user?.id ?? NaN);
      const isMine = Number.isFinite(reviewerId) && reviewerId === Number(myUserId);
      (isMine ? mine : rest).push(r);
    });

    // keep your review on top
    return [...mine, ...rest];
  }, [filtered, myUserId]);

  function closeOnBackdrop(e) {
    if (e.target?.classList?.contains("rv-overlay")) onClose?.();
  }

  if (!open) return null;

  return (
    <div className="rv-overlay" onMouseDown={closeOnBackdrop}>
      <div className="rv-content" role="dialog" aria-modal="true" aria-label="Reviews modal">
        <div className="rv-header">
          <div>
            <h2 className="rv-title">Reviews</h2>
            <p className="rv-subtitle">
              {gymName} • Filter by stars and verification status
            </p>
          </div>

          <button className="rv-close" type="button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {err ? <div className="rv-error">⚠️ {err}</div> : null}

        <div className="rv-body">
          {/* FILTER BAR */}
          <div className="rv-filters">
            <div className="rv-filterBlock">
              <div className="rv-filterLabel">Rating</div>
              <div className="rv-chipRow">
                <button
                  type="button"
                  className={`rv-chip ${starsFilter === 0 ? "active" : ""}`}
                  onClick={() => setStarsFilter(0)}
                >
                  All
                </button>
                {[5, 4, 3, 2, 1].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`rv-chip ${starsFilter === s ? "active" : ""}`}
                    onClick={() => setStarsFilter(s)}
                    title={`${s} stars`}
                  >
                    {s}★
                  </button>
                ))}
              </div>
            </div>

            <div className="rv-filterBlock">
              <div className="rv-filterLabel">Status</div>
              <div className="rv-chipRow">
                {[
                  { key: "all", label: "All" },
                  { key: "member", label: "Member" },
                  { key: "visited", label: "Visited" },
                  { key: "unverified", label: "Unverified" },
                ].map((x) => (
                  <button
                    key={x.key}
                    type="button"
                    className={`rv-chip ${statusFilter === x.key ? "active" : ""}`}
                    onClick={() => setStatusFilter(x.key)}
                  >
                    {x.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rv-filterHint">
              Public rating uses verified reviews only.
              <button
                type="button"
                className="rv-hintBtn"
                onClick={() =>
                  Swal.fire(
                    "How to verify?",
                    "Your review becomes verified after you visit via free first visit (used) or you have an active membership for this gym.",
                    "info"
                  )
                }
              >
                Learn more
              </button>
            </div>
          </div>

          {/* LIST */}
          <div className="rv-list">
            {loading && (state?.ratings || []).length === 0 ? (
              <div className="rv-empty">Loading…</div>
            ) : mineFirst.length === 0 ? (
              <div className="rv-empty">No reviews match your filters.</div>
            ) : (
              mineFirst.map((r) => {
                const name = r?.user?.name || "User";
                const tag = reviewTag(r);

                const reviewerId = Number(r?.user_id ?? r?.user?.user_id ?? r?.user?.id ?? NaN);
                const isMine = myUserId != null && Number.isFinite(reviewerId) && reviewerId === Number(myUserId);

                return (
                  <div key={r.rating_id} className={`rv-item ${isMine ? "mine" : ""}`}>
                    <div className="rv-itemTop">
                      <div className="rv-user">
                        <div className="rv-nameRow">
                          <div className="rv-name">{isMine ? "You" : name}</div>
                          {isMine ? <span className="rv-youPill">You</span> : null}
                        </div>

                        <div className={`rv-tag ${tag.cls}`}>
                          {tag.label}
                          {tag.key === "unverified" ? (
                            <button
                              type="button"
                              className="rv-infoIcon"
                              aria-label="Unverified info"
                              onClick={() =>
                                Swal.fire(
                                  "Unverified review",
                                  "Your review becomes verified after you visit via free first visit (used) or you have an active membership for this gym.",
                                  "info"
                                )
                              }
                            >
                              i
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <div className="rv-stars">
                        <StarRow value={Number(r?.stars || 0)} compact />
                      </div>
                    </div>

                    <div className={`rv-text ${r?.review ? "" : "empty"}`}>
                      {r?.review ? String(r.review) : "No comment."}
                    </div>

                    {isMine ? (
                      <div className="rv-itemActions">
                        <button
                          type="button"
                          className="rv-editBtn"
                          onClick={() => onEditMine?.(r)}
                        >
                          Edit my review
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="rv-footer">
          <div className="rv-footerLeft">
            <span className="rv-count">
              Showing <strong>{mineFirst.length}</strong>
              {state?.pagination?.total ? ` of ${state.pagination.total}` : ""} reviews
            </span>
          </div>

          <div className="rv-footerRight">
            <button type="button" className="rv-btnSecondary" onClick={onClose}>
              Close
            </button>

            <button
              type="button"
              className="rv-btnPrimary"
              disabled={!canLoadMore || loading}
              onClick={() => {
                const next = Number(state?.pagination?.current_page || 1) + 1;
                fetchPage(next);
              }}
              title={!canLoadMore ? "No more pages" : "Load more"}
            >
              {loading ? "Loading…" : canLoadMore ? "Load more" : "No more"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}