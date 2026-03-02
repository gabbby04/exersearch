import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Swal from "sweetalert2";

import {
  ownerCreateGymAnnouncement,
  ownerListGymAnnouncements,
  ownerDeleteGymAnnouncement,
  computeWeeklyRemaining,
  safeStr,
} from "../../utils/ownerAnnouncementsApi";

import "./OwnerGymAnnouncements.css";

export default function OwnerGymAnnouncements() {
  const { id: gymId } = useParams();

  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [err, setErr] = useState("");

  const [items, setItems] = useState([]);
  const [pageInfo, setPageInfo] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0,
  });

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const [audSaved, setAudSaved] = useState(true);
  const [audMembers, setAudMembers] = useState(false);

  const weekly = useMemo(() => computeWeeklyRemaining(items, 3), [items]);

  const canSubmit = useMemo(() => {
    if (!gymId) return false;
    if (posting) return false;
    if (weekly.remaining <= 0) return false;
    if (!safeStr(title).trim()) return false;
    if (!safeStr(body).trim()) return false;
    if (!audSaved && !audMembers) return false;
    return true;
  }, [gymId, posting, weekly, title, body, audSaved, audMembers]);

  async function load(p = 1) {
    if (!gymId) return;
    setErr("");
    setLoading(true);
    try {
      const paged = await ownerListGymAnnouncements(gymId, { page: p, per_page: 20 });
      setItems(paged.data);
      setPageInfo({
        current_page: paged.current_page,
        last_page: paged.last_page,
        per_page: paged.per_page,
        total: paged.total,
      });
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load announcements.");
    } finally {
      setLoading(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    setErr("");
    setPosting(true);
    try {
      await ownerCreateGymAnnouncement(gymId, {
        title: safeStr(title).trim(),
        body: safeStr(body).trim(),
        meta: null,
        audience: {
          saved: audSaved,
          members: audMembers,
        },
      });

      setTitle("");
      setBody("");
      await load(1);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to post announcement.");
    } finally {
      setPosting(false);
    }
  }

  async function onDelete(announcementId) {
    if (!announcementId) return;

    const result = await Swal.fire({
      title: "Delete announcement?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d23f0b",
      cancelButtonColor: "#aaa",
      confirmButtonText: "Yes, delete it",
    });

    if (!result.isConfirmed) return;

    setErr("");
    setDeletingId(announcementId);

    try {
      await ownerDeleteGymAnnouncement(announcementId);

      await Swal.fire({
        title: "Deleted",
        text: "Announcement removed successfully.",
        icon: "success",
        confirmButtonColor: "#d23f0b",
      });

      const nextPage =
        pageInfo.current_page > 1 && items.length === 1
          ? pageInfo.current_page - 1
          : pageInfo.current_page;

      await load(nextPage);
    } catch (e) {
      await Swal.fire({
        title: "Error",
        text: e?.response?.data?.message || "Failed to delete announcement.",
        icon: "error",
      });
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    if (!gymId) {
      setLoading(false);
      return;
    }
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gymId]);

  if (!gymId) {
    return (
      <div className="oga-app">
        <div className="oga-container">
          <div className="oga-card">
            <h2 className="oga-card-title" style={{ marginBottom: 8 }}>
              Gym Announcements
            </h2>
            <p className="oga-muted">Missing gym id in the route.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="oga-app">
      <div className="oga-container">
        <section className="oga-hero">
          <div className="oga-hero-bg">
            <div className="oga-orb one" />
            <div className="oga-orb two" />
          </div>

          <div className="oga-hero-top">
            <div className="oga-hero-left">
              <div className="oga-hero-pill">
                <span className="oga-pill-dot" />
                Announcements • Saved & Members
              </div>

              <h1 className="oga-hero-title">Gym Announcements</h1>
              <p className="oga-hero-subtitle">Post updates to followers or active members.</p>
            </div>

            <div className="oga-hero-actions">
              <Link className="oga-back" to={`/owner/view-gym/${gymId}`}>
                ← Back
              </Link>
            </div>
          </div>
        </section>

        {err ? <div className="oga-alert err">{err}</div> : null}

        <div className="oga-grid">
          <div className="oga-col">
            <div className="oga-card">
              <div className="oga-card-header">
                <h3 className="oga-card-title">Create announcement</h3>
                <span className="oga-badge orange">
                  Remaining: {weekly.remaining} / {weekly.limit}
                </span>
              </div>

              <form className="oga-form" onSubmit={submit}>
                <div className="oga-field">
                  <div className="oga-label">Title</div>
                  <input
                    className="oga-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Title (max 160 chars)"
                    maxLength={160}
                  />
                </div>

                <div className="oga-field">
                  <div className="oga-label">Body</div>
                  <textarea
                    className="oga-textarea"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write your announcement…"
                    rows={5}
                  />
                </div>

                <div className="oga-audience">
                  <label className="oga-check">
                    <input
                      type="checkbox"
                      checked={audSaved}
                      onChange={(e) => setAudSaved(e.target.checked)}
                    />
                    Notify saved/followers
                  </label>

                  <label className="oga-check">
                    <input
                      type="checkbox"
                      checked={audMembers}
                      onChange={(e) => setAudMembers(e.target.checked)}
                    />
                    Notify active members
                  </label>
                </div>

                <button className="oga-primary" type="submit" disabled={!canSubmit}>
                  {posting ? "Posting..." : "Post announcement"}
                </button>

                <div className="oga-muted" style={{ marginTop: 4 }}>
                  Weekly limit: <b style={{ color: "#1a1a1a" }}>{weekly.used}</b> /{" "}
                  <b style={{ color: "#1a1a1a" }}>{weekly.limit}</b> used
                </div>
              </form>
            </div>
          </div>

          <div className="oga-col">
            <div className="oga-card">
              <div className="oga-card-header">
                <h3 className="oga-card-title">Your announcements</h3>
                <span className="oga-badge gray">Total: {pageInfo.total}</span>
              </div>

              {loading ? (
                <div className="oga-empty">Loading…</div>
              ) : items.length === 0 ? (
                <div className="oga-empty">No announcements yet.</div>
              ) : (
                <div className="oga-list">
                  {items.map((a) => (
                    <div key={a.announcement_id} className="oga-item">
                      <div className="oga-item-top">
                        <div className="oga-item-title">{a.title}</div>
                        <div className="oga-time">
                          {a.created_at ? new Date(a.created_at).toLocaleString() : ""}
                        </div>
                      </div>

                      <p className="oga-body">{a.body}</p>

                      <div className="oga-item-actions">
                        <button
                          className="oga-delete"
                          type="button"
                          onClick={() => onDelete(a.announcement_id)}
                          disabled={!!deletingId}
                        >
                          {deletingId === a.announcement_id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="oga-pager">
                <button
                  className="oga-btn"
                  disabled={loading || pageInfo.current_page <= 1}
                  onClick={() => load(pageInfo.current_page - 1)}
                  type="button"
                >
                  Prev
                </button>

                <button
                  className="oga-btn"
                  disabled={loading || pageInfo.current_page >= pageInfo.last_page}
                  onClick={() => load(pageInfo.current_page + 1)}
                  type="button"
                >
                  Next
                </button>

                <div className="oga-page">
                  Page <b style={{ color: "#1a1a1a" }}>{pageInfo.current_page}</b> /{" "}
                  <b style={{ color: "#1a1a1a" }}>{pageInfo.last_page}</b>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}