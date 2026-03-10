import React, { useEffect, useMemo, useRef, useState } from "react";
import "./GymInquiryHistory.css";
import {
  listMyInquiries,
  askGymInquiry,
  normalizeInquiryListResponse,
} from "../../utils/gymInquiriesApi";
import InquiryComposeModal from "./InquiryComposeModal";
import { ExternalLink, RefreshCw, Menu, Info, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { absoluteUrl } from "../../utils/findGymsData";

const PH_TZ = "Asia/Manila";

function safeStr(v) {
  return v == null ? "" : String(v);
}

function toDateSafe(value) {
  if (!value) return null;
  if (value instanceof Date) return value;

  let s = String(value).trim();
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) {
    s = s.replace(" ", "T") + "Z";
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(s)) {
    s = s + "Z";
  }

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function timeMs(v) {
  return toDateSafe(v)?.getTime?.() ?? 0;
}

function fmtTimeAgo(d) {
  const dt = toDateSafe(d);
  if (!dt) return "";
  const diff = Date.now() - dt.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return dt.toLocaleDateString("en-PH", { timeZone: PH_TZ });
}

function fmtPHDateTime(d) {
  const dt = toDateSafe(d);
  if (!dt) return "";
  return dt.toLocaleString("en-PH", { timeZone: PH_TZ });
}

function isExternalUrl(u) {
  return /^https?:\/\//i.test(String(u || "").trim());
}

function normalizeExternalUrl(u) {
  const s = safeStr(u).trim();
  if (!s) return "";
  if (isExternalUrl(s)) return s;
  return `https://${s.replace(/^\/+/, "")}`;
}

function fmtHHMM(v) {
  if (!v) return "—";
  const s = String(v);
  return s.length >= 5 ? s.slice(0, 5) : s;
}

function truthy(v) {
  return v === true || v === 1 || v === "1" || v === "true";
}

function getGymIdFromInquiry(r) {
  const gid = Number(r?.gym_id ?? r?.gymId ?? r?.gym?.id ?? r?.Gym?.id);
  return Number.isFinite(gid) ? gid : null;
}

function getGymFromInquiry(r) {
  return r?.gym || r?.Gym || null;
}

function pickGymTitleFromGym(gym, fallbackGymId) {
  const g = gym || null;
  return (
    safeStr(g?.gym_name || g?.name || g?.title || "").trim() ||
    `Gym #${fallbackGymId ?? "—"}`
  );
}

function pickGymMetaFromGym(gym) {
  const g = gym || null;
  return safeStr(g?.address || g?.location || g?.city || g?.barangay || "").trim();
}

const OWNER_DELIM = "\n\n---o---\n\n";

function splitOwnerAnswer(answer) {
  let raw = safeStr(answer).trim();
  if (!raw) return [];

  raw = raw.replace(/\n— Follow-up \([^)]+\)\n/g, "\n\n");
  raw = raw.replace(/— Follow-up \([^)]+\)\n/g, "\n\n");

  if (!raw.includes(OWNER_DELIM)) return [raw].filter(Boolean);

  return raw
    .split(OWNER_DELIM)
    .map((s) => s.trim())
    .filter(Boolean);
}

function lastOwnerPart(answer) {
  const parts = splitOwnerAnswer(answer);
  return parts.length ? parts[parts.length - 1] : "";
}

function buildThreadEventsFromInquiry(inq) {
  const events = [];
  const idBase = inq?.inquiry_id ?? inq?.id ?? "x";

  const qText = safeStr(inq?.question).trim();
  const qAt =
    inq?.created_at || inq?.createdAt || inq?.created || inq?.asked_at || inq?.askedAt || null;

  if (qText) {
    events.push({
      id: `q-${idBase}`,
      who: "me",
      text: qText,
      at: qAt,
      ms: timeMs(qAt),
      status: inq?.status,
      _k: 0,
    });
  }

  const parts = splitOwnerAnswer(inq?.answer);
  if (parts.length) {
    const aAt =
      inq?.answered_at || inq?.answeredAt || inq?.updated_at || inq?.updatedAt || qAt || null;

    parts.forEach((part, idx) => {
      const bump = idx * 0.001;
      events.push({
        id: `a-${idBase}-${idx}`,
        who: "owner",
        text: part,
        at: aAt,
        ms: timeMs(aAt) + bump,
        status: inq?.status,
        _k: 1,
        _isPart: idx > 0,
      });
    });
  }

  return events;
}

function pickGymAvatarFromGym(gym) {
  const g = gym || null;
  const raw = safeStr(
    g?.main_image_url ??
      g?.mainImageUrl ??
      g?.main_image ??
      g?.mainImage ??
      g?.image_url ??
      g?.imageUrl ??
      g?.photo_url ??
      g?.photoUrl ??
      ""
  ).trim();

  if (raw) return absoluteUrl(raw);
  return "/defaulticon.png";
}

function FbSection({ title, children }) {
  return (
    <div className="fb-section">
      <div className="fb-section-title">{title}</div>
      {children}
    </div>
  );
}

function FbRow({ icon, label, value }) {
  if (!safeStr(value).trim()) return null;
  return (
    <div className="fb-row">
      <div className="fb-left">
        <div className="fb-ico" aria-hidden="true">
          {icon}
        </div>
        <div className="fb-k">{label}</div>
      </div>
      <div className="fb-v">{value}</div>
    </div>
  );
}

export default function GymInquiryHistory() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const navigate = useNavigate();

  const [activeGymId, setActiveGymId] = useState(null);
  const [searchLeft, setSearchLeft] = useState("");
  const [searchRight, setSearchRight] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [chatText, setChatText] = useState("");
  const [chatSending, setChatSending] = useState(false);

  const [showList, setShowList] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const listRef = useRef(null);
  const chatRef = useRef(null);

  const closePanels = () => {
    setShowList(false);
    setShowDetail(false);
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await listMyInquiries({ per_page: 100 });
      const norm = normalizeInquiryListResponse(res);

      const newRows = norm.rows || [];
      setRows(newRows);
      setMeta(norm.meta || null);

      const current = activeGymId;
      const hasCurrent =
        current != null &&
        newRows.some((r) => {
          const gid = getGymIdFromInquiry(r);
          return gid === current;
        });

      if (!hasCurrent) {
        const first = newRows[0];
        const firstGid = getGymIdFromInquiry(first);
        setActiveGymId(firstGid || null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const conversations = useMemo(() => {
    const map = new Map();

    for (const r of rows) {
      const gid = getGymIdFromInquiry(r);
      if (!gid || gid <= 0) continue;

      if (!map.has(gid)) {
        map.set(gid, { gymId: gid, gym: getGymFromInquiry(r), items: [] });
      }

      const bucket = map.get(gid);

      if (!bucket.gym) bucket.gym = getGymFromInquiry(r);
      bucket.items.push(r);
    }

    const list = Array.from(map.values()).map((c) => {
      c.items.sort((a, b) => {
        const ta = timeMs(a?.created_at || a?.updated_at || 0);
        const tb = timeMs(b?.created_at || b?.updated_at || 0);
        return ta - tb;
      });

      const last = c.items[c.items.length - 1];
      const lastAt = last?.answered_at || last?.updated_at || last?.created_at || null;

      return { ...c, last, lastAt };
    });

    list.sort((a, b) => {
      const ta = timeMs(a.lastAt || 0);
      const tb = timeMs(b.lastAt || 0);
      return tb - ta;
    });

    return list;
  }, [rows]);

  const filteredLeft = useMemo(() => {
    const q = searchLeft.trim().toLowerCase();
    if (!q) return conversations;

    return conversations.filter((c) => {
      const gymTitle = pickGymTitleFromGym(c.gym, c.gymId).toLowerCase();
      const anyMatch = c.items.some((r) => {
        const msg = safeStr(r?.question).toLowerCase();
        const ans = safeStr(r?.answer).toLowerCase();
        return msg.includes(q) || ans.includes(q);
      });
      return gymTitle.includes(q) || anyMatch;
    });
  }, [conversations, searchLeft]);

  const activeConv = useMemo(() => {
    if (!activeGymId) return null;
    return conversations.find((c) => c.gymId === activeGymId) || null;
  }, [conversations, activeGymId]);

  const thread = useMemo(() => {
    if (!activeConv) return [];

    const events = [];
    for (const inq of activeConv.items || []) {
      events.push(...buildThreadEventsFromInquiry(inq));
    }

    const q = searchRight.trim().toLowerCase();
    let out = events;
    if (q) out = out.filter((m) => safeStr(m.text).toLowerCase().includes(q));

    out.sort((a, b) => {
      if (a.ms !== b.ms) return a.ms - b.ms;
      if (a._k !== b._k) return a._k - b._k;
      return String(a.id).localeCompare(String(b.id));
    });

    return out;
  }, [activeConv, searchRight]);

  useEffect(() => {
    if (!chatRef.current) return;
    chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [activeGymId, thread.length]);

  const onOpenCompose = () => setComposeOpen(true);

  const onSendFromModal = async (gymId, question) => {
    setSending(true);
    try {
      await askGymInquiry(gymId, { question });
      setComposeOpen(false);
      setActiveGymId(Number(gymId));
      await refresh();
      closePanels();
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to send inquiry");
      throw e;
    } finally {
      setSending(false);
    }
  };

  const onSendChat = async () => {
    const text = chatText.trim();
    if (!text) return;

    const gid = Number(activeGymId);
    if (!Number.isFinite(gid) || gid <= 0) return alert("Select a gym first.");

    setChatSending(true);
    try {
      await askGymInquiry(gid, { question: text });
      setChatText("");
      await refresh();
      setActiveGymId(gid);
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to send message");
    } finally {
      setChatSending(false);
    }
  };

  const gym = activeConv?.gym || null;

  const socials = useMemo(() => {
    if (!gym) return [];
    const arr = [];
    if (safeStr(gym?.website).trim()) arr.push({ label: "Website", value: safeStr(gym.website) });
    if (safeStr(gym?.facebook_page).trim()) {
      arr.push({ label: "Facebook", value: safeStr(gym.facebook_page) });
    }
    if (safeStr(gym?.instagram_page).trim()) {
      arr.push({ label: "Instagram", value: safeStr(gym.instagram_page) });
    }
    return arr;
  }, [gym]);

  const detailAvatar = useMemo(() => pickGymAvatarFromGym(gym), [gym]);

  return (
    <div
      className={`ih-page ${showList ? "show-list" : ""} ${showDetail ? "show-detail" : ""}`}
    >
      <div className="ih-mobile-backdrop" onClick={closePanels} />

      <div className="app" ref={listRef}>
        <div className="wrapper">
          <div className="conversation-area">
            <div className="ih-panel-close-wrap">
              <button
                type="button"
                className="ih-panel-close-btn"
                onClick={() => setShowList(false)}
                aria-label="Close conversations"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="ih-left-header">
              <div className="ih-left-top">
                <div className="ih-left-title">
                  <div className="ih-left-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a4 4 0 01-4 4H7l-4 3V7a4 4 0 014-4h10a4 4 0 014 4z" />
                      <path d="M7.5 8.5h9M7.5 12h6" />
                    </svg>
                  </div>

                  <div className="ih-left-text">
                    <div className="ih-left-h1">Inquiries</div>
                    <div className="ih-left-sub">
                      {loading ? "Loading…" : `${filteredLeft.length} shown`}
                    </div>
                  </div>
                </div>
              </div>

              <div className="ih-left-search">
                <input
                  type="text"
                  placeholder="Search conversations"
                  value={searchLeft}
                  onChange={(e) => setSearchLeft(e.target.value)}
                />
              </div>
            </div>

            <div className="ih-conversation-list">
              {loading ? (
                <div className="ih-empty">
                  <div className="ih-empty-title">Loading…</div>
                  <div className="ih-empty-sub">Fetching your inquiry history</div>
                </div>
              ) : filteredLeft.length === 0 ? (
                <div className="ih-empty">
                  <div className="ih-empty-title">No inquiries yet</div>
                  <div className="ih-empty-sub">Tap the plus button to ask a gym.</div>
                </div>
              ) : (
                filteredLeft.map((c) => {
                  const isActive = c.gymId === activeGymId;
                  const gymTitle = pickGymTitleFromGym(c.gym, c.gymId);
                  const last = c.last;

                  const lastPart = lastOwnerPart(last?.answer);
                  const snippet = safeStr(lastPart || last?.question || "").trim() || "—";
                  const t = fmtTimeAgo(c.lastAt);
                  const online = safeStr(last?.status).toLowerCase() === "answered";
                  const avatar = pickGymAvatarFromGym(c.gym);

                  return (
                    <div
                      key={c.gymId}
                      className={`msg ${isActive ? "active" : ""} ${online ? "online" : ""}`}
                      onClick={() => {
                        setActiveGymId(c.gymId);
                        setShowList(false);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setActiveGymId(c.gymId);
                          setShowList(false);
                        }
                      }}
                    >
                      <div
                        className="msg-profile group"
                        style={{
                          backgroundImage: `url(${avatar})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          backgroundRepeat: "no-repeat",
                        }}
                        aria-hidden="true"
                      />

                      <div className="msg-detail">
                        <div className="msg-username">{gymTitle}</div>
                        <div className="msg-content">
                          <span className="msg-message">{snippet}</span>
                          <span className="msg-date">{t}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="overlay" />
            <button className="add" onClick={onOpenCompose} type="button" aria-label="New inquiry" />
          </div>

          <div className="chat-area">
            <div className="chat-area-header">
              <div className="chat-area-title">
                {activeConv ? pickGymTitleFromGym(gym, activeConv.gymId) : "Select an inquiry"}
              </div>

              <div className="chat-area-group">
                <button
                  type="button"
                  className="ih-open-gym-btn ih-mobile-only"
                  onClick={() => {
                    setShowDetail(false);
                    setShowList(true);
                  }}
                  title="Conversations"
                  aria-label="Open conversations"
                >
                  <Menu size={18} />
                </button>

                <button
                  type="button"
                  className="ih-open-gym-btn ih-mobile-only"
                  onClick={() => {
                    setShowList(false);
                    setShowDetail(true);
                  }}
                  title="Details"
                  aria-label="Open details"
                  disabled={!activeConv}
                >
                  <Info size={18} />
                </button>

                <button
                  type="button"
                  className="ih-open-gym-btn"
                  onClick={refresh}
                  title="Refresh"
                  aria-label="Refresh"
                  disabled={loading}
                >
                  <RefreshCw size={18} />
                </button>

                {activeConv && (
                  <button
                    type="button"
                    className="ih-open-gym-btn"
                    onClick={() => navigate(`/home/gym/${activeConv.gymId}`)}
                    title="Open gym page"
                    aria-label="Open gym page"
                  >
                    <ExternalLink size={18} />
                  </button>
                )}
              </div>
            </div>

            <div className="chat-area-main" ref={chatRef}>
              {!activeConv ? (
                <div className="ih-chat-empty">
                  <div className="ih-chat-empty-title">No inquiry selected</div>
                  <div className="ih-chat-empty-sub">
                    Choose one from the list or tap the plus button.
                  </div>
                </div>
              ) : thread.length === 0 ? (
                <div className="ih-chat-empty">
                  <div className="ih-chat-empty-title">No matching messages</div>
                  <div className="ih-chat-empty-sub">Try another search term.</div>
                </div>
              ) : (
                thread.map((m) => {
                  const isMe = m.who === "me";
                  const gymAvatar = pickGymAvatarFromGym(gym);

                  return (
                    <div key={m.id} className={`chat-msg ${isMe ? "owner" : ""}`}>
                      <div className="chat-msg-profile">
                        {isMe ? (
                          <div className="ih-avatar">You</div>
                        ) : (
                          <div
                            className="ih-avatar"
                            style={{
                              backgroundImage: `url(${gymAvatar})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                              backgroundRepeat: "no-repeat",
                              color: "transparent",
                            }}
                            aria-label="Gym"
                          >
                            G
                          </div>
                        )}

                        <div className="chat-msg-date">
                          {m.who === "owner" && m._isPart ? "" : fmtPHDateTime(m.at)}
                        </div>
                      </div>

                      <div className="chat-msg-content">
                        <div className="chat-msg-text">{m.text}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="chat-area-footer">
              <input
                type="text"
                placeholder={activeConv ? "Type a message…" : "Select an inquiry first…"}
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                disabled={!activeConv || chatSending}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onSendChat();
                  }
                }}
              />

              <button
                type="button"
                className="ih-send-btn"
                onClick={onSendChat}
                disabled={!activeConv || chatSending || !chatText.trim()}
                aria-label="Send"
                title="Send"
              >
                {chatSending ? "…" : "Send"}
              </button>
            </div>
          </div>

          <div className="detail-area">
            <div className="ih-panel-close-wrap">
              <button
                type="button"
                className="ih-panel-close-btn"
                onClick={() => setShowDetail(false)}
                aria-label="Close details"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="detail-area-header">
              <div
                className="ih-detail-avatar"
                style={{
                  backgroundImage: `url(${detailAvatar})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }}
                aria-hidden="true"
              />

              <div className="detail-title">
                {activeConv ? pickGymTitleFromGym(gym, activeConv.gymId) : "Select a gym"}
              </div>
              <div className="detail-subtitle">
                {activeConv ? pickGymMetaFromGym(gym) : "Select an inquiry"}
              </div>
            </div>

            <div className="detail-changes">
              <input
                type="text"
                placeholder="Search in Conversation"
                value={searchRight}
                onChange={(e) => setSearchRight(e.target.value)}
              />

              <div className="fb-info">
                <FbSection title="GYM DETAILS">
                  <FbRow
                    icon="🕒"
                    label="Hours"
                    value={
                      gym
                        ? `${fmtHHMM(gym?.opening_time)} – ${fmtHHMM(gym?.closing_time)}${
                            truthy(gym?.is_24_hours) ? " • 24 Hours" : ""
                          }`
                        : ""
                    }
                  />
                  <FbRow icon="📞" label="Phone" value={safeStr(gym?.contact_number)} />
                  <FbRow icon="✉️" label="Email" value={safeStr(gym?.email)} />
                </FbSection>

                {socials.length > 0 && (
                  <FbSection title="LINKS">
                    {socials.map((s) => {
                      const href = normalizeExternalUrl(s.value);
                      return (
                        <div className="fb-row" key={s.label}>
                          <div className="fb-left">
                            <div className="fb-ico" aria-hidden="true">
                              🔗
                            </div>
                            <div className="fb-k">{s.label}</div>
                          </div>
                          <div className="fb-v">
                            <a className="fb-link" href={href} target="_blank" rel="noreferrer">
                              {s.value}
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </FbSection>
                )}
              </div>
            </div>

            <a className="follow-me" href="#" onClick={(e) => e.preventDefault()}>
              <span className="follow-text">ExerSearch — Inquiries</span>
              <span className="developer">
                <div className="ih-dev-avatar">ES</div>
                Support Inbox
              </span>
            </a>
          </div>
        </div>

        {composeOpen && (
          <InquiryComposeModal
            onClose={() => setComposeOpen(false)}
            onSend={onSendFromModal}
            initialGym={null}
            sending={sending}
          />
        )}
      </div>
    </div>
  );
}