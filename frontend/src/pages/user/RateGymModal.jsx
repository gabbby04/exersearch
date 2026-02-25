import React, { useEffect, useMemo, useState } from "react";
import { X, AlertCircle, Info, Save } from "lucide-react";
import Swal from "sweetalert2";
import "./modaluser.css";
import { api } from "../../utils/apiClient";

function clamp(n, a, b) {
  const x = Number(n);
  if (!Number.isFinite(x)) return a;
  return Math.max(a, Math.min(b, x));
}

function StarPicker({ value, onChange, disabled }) {
  const v = clamp(value, 1, 5);

  return (
    <div className={`rm-stars ${disabled ? "rm-stars--disabled" : ""}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          className={`rm-star ${i <= v ? "filled" : ""}`}
          onClick={() => onChange(i)}
          disabled={disabled}
          aria-label={`${i} star`}
          title={`${i} star`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function tagFromVia(viaRaw) {
  const via = String(viaRaw || "").toLowerCase();
  if (via === "membership") return { label: "Member", cls: "rm-tag rm-tag-member" };
  if (via === "free_visit_used") return { label: "Visited", cls: "rm-tag rm-tag-visited" };
  return { label: "Verified", cls: "rm-tag rm-tag-visited" };
}

function tagFor(existing, canRateInfo) {
  // ✅ If user already has a rating, trust THAT record (it’s the source of truth for the displayed tag)
  if (existing) {
    const isVerified = existing?.verified === true || !!existing?.verified_via;
    if (isVerified) return tagFromVia(existing?.verified_via);
    return { label: "Unverified", cls: "rm-tag rm-tag-unverified" };
  }

  // ✅ Otherwise for first-time rating, use /can-rate status
  const canRate = !!canRateInfo?.can_rate;
  if (!canRate) return { label: "Unverified", cls: "rm-tag rm-tag-unverified" };
  return tagFromVia(canRateInfo?.verified_via);
}

export default function RateGymModal({ gym, onClose, onSuccess }) {
  const gymId = gym?.gym_id ?? gym?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [canRateInfo, setCanRateInfo] = useState({
    can_rate: false,
    verified_via: null,
    verified_ref_id: null,
  });

  const [existing, setExisting] = useState(null);

  const [stars, setStars] = useState(5);
  const [review, setReview] = useState("");

  const tag = useMemo(() => tagFor(existing, canRateInfo), [existing, canRateInfo]);

  const showUnverifiedInfo = () => {
    Swal.fire({
      icon: "info",
      title: "How to become Verified",
      html:
        `<div style="text-align:left; line-height:1.55;">` +
        `<div style="font-weight:800; margin-bottom:8px;">To be verified, you need a proven visit:</div>` +
        `<ul style="margin:0; padding-left:18px;">` +
        `<li>Use the gym’s <b>Free First Visit</b> (status: used), or</li>` +
        `<li>Have a <b>Membership</b> at this gym (status: active or expired).</li>` +
        `</ul>` +
        `<div style="margin-top:10px; opacity:.85;">Unverified reviews are visible, but only verified reviews affect the public rating.</div>` +
        `</div>`,
      confirmButtonText: "Got it",
    });
  };

  async function fetchVerification(gId) {
    try {
      const r = await api.get(`/gyms/${gId}/ratings/can-rate`, {
        headers: { "Cache-Control": "no-cache" },
      });

      setCanRateInfo({
        can_rate: !!r?.data?.can_rate,
        verified_via: r?.data?.verified_via ?? null,
        verified_ref_id: r?.data?.verified_ref_id ?? null,
      });
    } catch {
      setCanRateInfo({
        can_rate: false,
        verified_via: null,
        verified_ref_id: null,
      });
    }
  }

  async function fetchExistingMyRating(gId) {
    let found = null;

    for (let page = 1; page <= 3; page++) {
      const res = await api.get(`/me/ratings?per_page=50&page=${page}`, {
        headers: { "Cache-Control": "no-cache" },
      });

      const list = Array.isArray(res?.data?.data) ? res.data.data : [];
      found = list.find((x) => Number(x?.gym_id) === Number(gId));

      if (found) break;

      const lastPage = Number(res?.data?.last_page || 1);
      if (page >= lastPage) break;
    }

    setExisting(found || null);

    if (found) {
      setStars(clamp(found?.stars ?? 5, 1, 5));
      setReview(found?.review ? String(found.review) : "");
    } else {
      setStars(5);
      setReview("");
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!gymId) {
        setError("Missing gym id.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        // ✅ Load both, but tag will prefer `existing`
        await fetchVerification(gymId);
        await fetchExistingMyRating(gymId);
      } catch (e) {
        if (!cancelled) {
          setError(e?.response?.data?.message || e?.message || "Failed to load review.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [gymId]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!gymId) {
      setError("Missing gym id.");
      return;
    }

    const payload = {
      stars: clamp(stars, 1, 5),
      review: review ? String(review).trim() : null,
    };

    try {
      setSaving(true);

      await api.post(`/gyms/${gymId}/ratings`, payload, {
        headers: { "Cache-Control": "no-cache" },
      });

      Swal.fire("Saved!", existing ? "Your review was updated." : "Your review was posted.", "success");

      // ✅ Refresh BOTH (important)
      await fetchVerification(gymId);
      await fetchExistingMyRating(gymId);

      onSuccess?.();
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to save review.";
      setError(msg);

      if (String(err?.response?.status) === "403") {
        Swal.fire("Not allowed yet", msg, "warning");
      }
    } finally {
      setSaving(false);
    }
  };

  const isUnverifiedTag = tag?.label === "Unverified";

  return (
    <div className="rm-overlay" onMouseDown={onClose}>
      <div className="rm-content" onMouseDown={(e) => e.stopPropagation()}>
        <div className="rm-header">
          <div>
            <h2 className="rm-title">{existing ? "Edit Review" : "Write Review"}</h2>
            <p className="rm-subtitle">{gym?.name || "Gym"}</p>
          </div>

          <button type="button" className="rm-close" onClick={onClose} aria-label="Close">
            <X size={22} />
          </button>
        </div>

        {error ? (
          <div className="rm-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        ) : null}

        <form className="rm-form" onSubmit={submit}>
          {loading ? (
            <div style={{ fontWeight: 800, opacity: 0.75 }}>Loading…</div>
          ) : (
            <>
              <div className="rm-group rm-topRow">
                <div className={tag.cls}>
                  <span>{tag.label}</span>

                  {isUnverifiedTag ? (
                    <button
                      type="button"
                      className="rm-tagInfo"
                      onClick={showUnverifiedInfo}
                      title="How to verify"
                      aria-label="How to verify"
                    >
                      <Info size={14} />
                    </button>
                  ) : null}
                </div>

                {existing ? <div className="rm-miniHint">You can update anytime</div> : null}
              </div>

              <div className="rm-group">
                <label className="rm-label">Your rating</label>
                <StarPicker value={stars} onChange={setStars} disabled={saving} />
                <div className="rm-miniHint">{stars} / 5</div>
              </div>

              <div className="rm-group">
                <label className="rm-label">Review</label>
                <textarea
                  className="rm-input rm-textarea"
                  rows={5}
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  disabled={saving}
                  placeholder="Share what you liked (or didn’t): equipment, cleanliness, crowd, staff…"
                />
                <div className="rm-counter">{(review || "").length}/3000</div>
              </div>
            </>
          )}

          <div className="rm-actions">
            <div />

            <div className="rm-actionGroup">
              <button type="button" className="rm-btnSecondary" onClick={onClose} disabled={saving}>
                Cancel
              </button>

              <button type="submit" className="rm-btnPrimary" disabled={saving || loading}>
                {saving ? (
                  <>
                    <div className="rm-spinner" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    {existing ? "Save changes" : "Post review"}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}