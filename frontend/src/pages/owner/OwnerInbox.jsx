// OwnerInbox.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./OwnerInbox.css";
import {
  Search,
  MoreHorizontal,
  Send,
  ChevronLeft,
  Dumbbell,
  MessageCircle,
  RefreshCw,
} from "lucide-react";
import Swal from "sweetalert2";

import { getAllMyGyms } from "../../utils/ownerGymApi";
import { absoluteUrl } from "../../utils/findGymsData";
import {
  OWNER_INQUIRY_TABS,
  ownerListGymInquiries,
  ownerAnswerInquiry,
  ownerMarkInquiryRead,
  ownerCloseInquiry,
  ownerInquiriesSummary,
  normalizeInquiryListResponse,
  INQUIRY_STATUS,
} from "../../utils/gymInquiriesApi";

function safeStr(v) {
  return v == null ? "" : String(v);
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmtTimeAgo(d) {
  if (!d) return "";
  const dt = new Date(String(d));
  if (Number.isNaN(dt.getTime())) return "";
  const diff = Date.now() - dt.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return dt.toLocaleDateString();
}

function pickGymId(g) {
  return safeNum(g?.gym_id ?? g?.id ?? g?.gymId);
}

function pickGymName(g) {
  return (
    safeStr(g?.gym_name ?? g?.name ?? g?.title ?? "").trim() ||
    `Gym #${pickGymId(g) || "—"}`
  );
}

/**
 * ✅ Ensures "/storage/..." becomes "https://exersearch.test/storage/..."
 * Also supports already-absolute URLs.
 */
function toExersearchUrl(raw) {
  const s = safeStr(raw).trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("//")) return `https:${s}`;

  const path = s.startsWith("/") ? s : `/${s}`;
  const full = `https://exersearch.test${path}`.replace(/([^:]\/)\/+/g, "$1");
  return full;
}

function pickGymCover(g) {
  const raw =
    g?.main_image_url ||
    g?.mainImageUrl ||
    g?.cover ||
    g?.cover_url ||
    g?.coverUrl ||
    g?.cover_photo ||
    g?.coverPhoto ||
    g?.image ||
    g?.image_url ||
    g?.imageUrl ||
    g?.photo ||
    g?.photo_url ||
    g?.photoUrl ||
    "";

  const fixed = raw ? toExersearchUrl(raw) : "";
  return fixed || (raw ? absoluteUrl(raw) : "");
}

function pickInquiryId(inq) {
  return safeNum(inq?.inquiry_id ?? inq?.id ?? inq?.inquiryId);
}

function pickInquiryGymId(inq) {
  const g = inq?.gym;
  return safeNum(inq?.gym_id ?? inq?.gymId ?? g?.gym_id ?? g?.id ?? g?.gymId);
}

function pickInquiryStatus(inq) {
  const s = safeStr(inq?.status).toLowerCase();
  if (
    s === INQUIRY_STATUS.OPEN ||
    s === INQUIRY_STATUS.ANSWERED ||
    s === INQUIRY_STATUS.CLOSED
  )
    return s;
  return INQUIRY_STATUS.OPEN;
}

function pickInquiryQuestion(inq) {
  return safeStr(inq?.question ?? inq?.message ?? inq?.body ?? "").trim();
}

function pickInquiryAnswer(inq) {
  return safeStr(inq?.answer ?? inq?.reply ?? inq?.response ?? "").trim();
}

function pickInquiryCreatedAt(inq) {
  return (
    inq?.created_at ??
    inq?.createdAt ??
    inq?.created ??
    inq?.asked_at ??
    inq?.askedAt ??
    inq?.submitted_at ??
    inq?.submittedAt ??
    ""
  );
}

function pickInquiryAnsweredAt(inq) {
  return (
    inq?.answered_at ??
    inq?.answeredAt ??
    inq?.replied_at ??
    inq?.repliedAt ??
    inq?.updated_at ??
    inq?.updatedAt ??
    ""
  );
}

function pickUserNameRaw(rawInq) {
  const u = rawInq?.user ?? rawInq?.asked_by ?? rawInq?.askedBy ?? null;
  const name =
    safeStr(u?.name ?? u?.full_name ?? u?.fullName ?? u?.username ?? "").trim() ||
    safeStr(rawInq?.user_name ?? rawInq?.userName ?? "").trim();
  return name || "User";
}

function pickUserAvatarRaw(rawInq) {
  const u = rawInq?.user ?? rawInq?.asked_by ?? rawInq?.askedBy ?? null;

  // ✅ OPTION A: prefer the flattened url from backend
  const raw =
    rawInq?.user_profile_photo_url ||
    u?.avatar_url ||
    u?.avatarUrl ||
    u?.avatar ||
    rawInq?.user_avatar ||
    rawInq?.userAvatar ||
    "";

  const fixed = raw ? toExersearchUrl(raw) : "";
  return fixed || (raw ? absoluteUrl(raw) : "");
}

function pickUserIdRaw(rawInq) {
  const u = rawInq?.user ?? rawInq?.asked_by ?? rawInq?.askedBy ?? null;
  return safeNum(
    u?.id ??
      u?.user_id ??
      rawInq?.user_id ??
      rawInq?.asked_by_id ??
      rawInq?.askedById ??
      rawInq?.userId
  );
}

function pickIsReadOwnerRaw(rawInq) {
  if (rawInq?.is_read_owner != null) return !!rawInq.is_read_owner;
  if (rawInq?.owner_read_at) return true;
  if (rawInq?.ownerReadAt) return true;
  if (rawInq?.read_owner_at) return true;
  if (rawInq?.readOwnerAt) return true;
  return false;
}

function threadKeyFromMessage(msg) {
  const uid = safeNum(msg?.userId);
  if (uid) return `u:${uid}`;
  const name = safeStr(msg?.userName).trim().toLowerCase();
  const av = safeStr(msg?.userAvatar).trim();
  return `n:${name}|a:${av}`;
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

function appendOwnerMessage(prevAnswer, newMsg) {
  const clean = safeStr(newMsg).trim();
  if (!clean) return safeStr(prevAnswer || "");

  const parts = splitOwnerAnswer(prevAnswer);
  if (parts.length === 0) return clean;

  return `${parts.join(OWNER_DELIM)}${OWNER_DELIM}${clean}`;
}

function safeTime(v) {
  const t = new Date(String(v || "")).getTime();
  return Number.isFinite(t) ? t : 0;
}

export default function OwnerInbox() {
  const [gyms, setGyms] = useState([]);
  const [inquiries, setInquiries] = useState([]);

  const [gymQuery, setGymQuery] = useState("");
  const [selectedGymId, setSelectedGymId] = useState(0);

  const [statusFilter, setStatusFilter] = useState(INQUIRY_STATUS.OPEN);
  const [inqQuery, setInqQuery] = useState("");

  const [selectedThreadKey, setSelectedThreadKey] = useState("");

  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const [loadingGyms, setLoadingGyms] = useState(true);
  const [loadingInquiries, setLoadingInquiries] = useState(false);

  const [gymCounts, setGymCounts] = useState(new Map());
  const [loadingSummary, setLoadingSummary] = useState(false);

  const [mobilePanel, setMobilePanel] = useState("gyms");
  const messagesEndRef = useRef(null);
  const replyRef = useRef(null);

  const userPickedGymRef = useRef(false);
  const didAutoPickRef = useRef(false);

  const refreshSummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await ownerInquiriesSummary();
      const rows = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      const m = new Map();
      for (const r of rows) {
        const id = safeNum(r?.gym_id ?? r?.gymId ?? r?.id);
        if (!id) continue;
        m.set(id, {
          open: safeNum(r?.open_count ?? r?.open ?? 0),
          total: safeNum(r?.total_count ?? r?.total ?? 0),
          latestAt: r?.latest_at ?? r?.latestAt ?? null,
        });
      }
      setGymCounts(m);
    } catch (e) {
      console.warn("owner summary failed:", e);
    } finally {
      setLoadingSummary(false);
    }
  };

  const refreshInquiries = async (gymId = selectedGymId) => {
    if (!gymId) return;
    setLoadingInquiries(true);
    try {
      const params = {};
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;
      if (inqQuery.trim()) params.q = inqQuery.trim();

      const resData = await ownerListGymInquiries(gymId, params);
      const { rows } = normalizeInquiryListResponse(resData);

      const mapped = (rows || [])
        .map((rawInq) => {
          return {
            id: pickInquiryId(rawInq),
            gymId: pickInquiryGymId(rawInq) || gymId,
            userId: pickUserIdRaw(rawInq),
            userName: pickUserNameRaw(rawInq),
            // ✅ comes from backend: rawInq.user_profile_photo_url
            userAvatar: pickUserAvatarRaw(rawInq),
            question: pickInquiryQuestion(rawInq),
            createdAt: pickInquiryCreatedAt(rawInq),
            status: pickInquiryStatus(rawInq),
            answer: pickInquiryAnswer(rawInq),
            answeredAt: pickInquiryAnsweredAt(rawInq),
            isReadOwner: pickIsReadOwnerRaw(rawInq),
            raw: rawInq,
          };
        })
        .filter((x) => x.id);

      mapped.sort((a, b) => safeTime(b.createdAt) - safeTime(a.createdAt));
      setInquiries(mapped);
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "Failed to load inquiries",
        text: safeStr(e?.message || e),
      });
    } finally {
      setLoadingInquiries(false);
    }
  };

  const onRefreshNow = async () => {
    if (!selectedGymId) return;
    await Promise.allSettled([refreshSummary(), refreshInquiries(selectedGymId)]);
  };

  useEffect(() => {
    let alive = true;

    async function run() {
      setLoadingGyms(true);
      try {
        const res = await getAllMyGyms();

        const list =
          (Array.isArray(res) && res) ||
          (Array.isArray(res?.data) && res.data) ||
          (Array.isArray(res?.gyms) && res.gyms) ||
          (Array.isArray(res?.data?.data) && res.data.data) ||
          [];

        const mapped = list
          .map((g) => ({
            id: pickGymId(g),
            name: pickGymName(g),
            cover: pickGymCover(g),
            raw: g,
          }))
          .filter((g) => g.id);

        if (!alive) return;
        setGyms(mapped);
      } catch (e) {
        if (!alive) return;
        Swal.fire({
          icon: "error",
          title: "Failed to load gyms",
          text: safeStr(e?.message || e),
        });
      } finally {
        if (alive) setLoadingGyms(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!gyms.length) return;
    refreshSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gyms.length]);

  const gymsSortedForAutoPick = useMemo(() => {
    if (!gyms.length) return [];
    return [...gyms].sort((a, b) => {
      const ac = gymCounts.get(a.id) || { open: 0, total: 0 };
      const bc = gymCounts.get(b.id) || { open: 0, total: 0 };

      if (bc.open !== ac.open) return bc.open - ac.open;
      if (bc.total !== ac.total) return bc.total - ac.total;
      return a.name.localeCompare(b.name);
    });
  }, [gyms, gymCounts]);

  useEffect(() => {
    if (didAutoPickRef.current) return;
    if (!gyms.length) return;
    if (userPickedGymRef.current) return;
    if (loadingSummary) return;

    const bestId = gymsSortedForAutoPick[0]?.id || gyms[0]?.id || 0;
    didAutoPickRef.current = true;
    setSelectedGymId((cur) => cur || bestId);
  }, [gyms, gymsSortedForAutoPick, loadingSummary]);

  useEffect(() => {
    if (!selectedGymId) {
      setInquiries([]);
      return;
    }
    let alive = true;
    const t = setTimeout(async () => {
      if (!alive) return;
      await refreshInquiries(selectedGymId);
    }, 250);

    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGymId, statusFilter, inqQuery]);

  const filteredGyms = useMemo(() => {
    const q = gymQuery.trim().toLowerCase();
    let list = gyms;
    if (q) list = gyms.filter((g) => g.name.toLowerCase().includes(q));

    return [...list].sort((a, b) => {
      const ac = gymCounts.get(a.id) || { open: 0, total: 0 };
      const bc = gymCounts.get(b.id) || { open: 0, total: 0 };

      if (bc.open !== ac.open) return bc.open - ac.open;
      if (bc.total !== ac.total) return bc.total - ac.total;
      return a.name.localeCompare(b.name);
    });
  }, [gyms, gymCounts, gymQuery]);

  const selectedGym = useMemo(
    () => gyms.find((g) => g.id === selectedGymId) || null,
    [gyms, selectedGymId]
  );

  const threadsForGym = useMemo(() => {
    const q = inqQuery.trim().toLowerCase();

    let list = inquiries.filter((x) => x.gymId === selectedGymId);

    if (statusFilter !== "all") list = list.filter((x) => x.status === statusFilter);

    if (q) {
      list = list.filter(
        (x) =>
          safeStr(x.userName).toLowerCase().includes(q) ||
          safeStr(x.question).toLowerCase().includes(q)
      );
    }

    const map = new Map();
    for (const msg of list) {
      const key = threadKeyFromMessage(msg);
      const t = map.get(key);
      if (!t) {
        map.set(key, {
          key,
          gymId: msg.gymId,
          userId: msg.userId,
          userName: msg.userName,
          userAvatar: msg.userAvatar,
          messages: [msg],
        });
      } else {
        t.messages.push(msg);
      }
    }

    const threads = Array.from(map.values()).map((t) => {
      t.messages.sort((a, b) => safeTime(a.createdAt) - safeTime(b.createdAt));

      const last = t.messages[t.messages.length - 1];
      const openCount = t.messages.filter(
        (m) => m.status === INQUIRY_STATUS.OPEN && !m.answer
      ).length;
      const unreadCount = t.messages.filter((m) => !m.isReadOwner).length;

      const lastWithAvatar = [...t.messages].reverse().find((m) => m.userAvatar) || null;

      return {
        ...t,
        userAvatar: lastWithAvatar?.userAvatar || t.userAvatar,
        lastAt: last?.createdAt,
        lastPreview: last?.question || "",
        openCount,
        unreadCount,
      };
    });

    threads.sort((a, b) => safeTime(b.lastAt) - safeTime(a.lastAt));
    return threads;
  }, [inquiries, selectedGymId, statusFilter, inqQuery]);

  const selectedThread = useMemo(
    () => threadsForGym.find((t) => t.key === selectedThreadKey) || null,
    [threadsForGym, selectedThreadKey]
  );

  const hasAnyOpen = useMemo(() => {
    if (!selectedThread) return false;
    return selectedThread.messages.some((m) => m.status === INQUIRY_STATUS.OPEN && !m.answer);
  }, [selectedThread]);

  const latestMsgInThread = useMemo(() => {
    if (!selectedThread) return null;
    return [...selectedThread.messages].sort(
      (a, b) => safeTime(b.createdAt) - safeTime(a.createdAt)
    )[0];
  }, [selectedThread]);

  useEffect(() => {
    const firstKey = threadsForGym[0]?.key || "";
    setSelectedThreadKey((cur) =>
      threadsForGym.some((t) => t.key === cur) ? cur : firstKey
    );
    setReply("");
  }, [selectedGymId, statusFilter, inqQuery, threadsForGym.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [selectedThreadKey, selectedThread?.messages?.length]);

  useEffect(() => {
    if (mobilePanel === "chat") {
      const t = setTimeout(() => replyRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [mobilePanel, selectedThreadKey]);

  const selectGym = (gymId) => {
    userPickedGymRef.current = true;
    setSelectedGymId(gymId);
    setMobilePanel("list");
  };

  const markThreadRead = async (thread) => {
    if (!thread) return;

    setInquiries((prev) =>
      prev.map((x) =>
        threadKeyFromMessage(x) === thread.key ? { ...x, isReadOwner: true } : x
      )
    );

    await Promise.allSettled(
      thread.messages.filter((m) => !m.isReadOwner).map((m) => ownerMarkInquiryRead(m.id))
    );
  };

  const selectThread = (key) => {
    setSelectedThreadKey(key);
    setMobilePanel("chat");
    const thread = threadsForGym.find((t) => t.key === key) || null;
    if (thread) markThreadRead(thread);
  };

  const onSendReply = async () => {
    if (!selectedThread) return;
    const msg = reply.trim();
    if (!msg) return;

    const nowIso = new Date().toISOString();
    const latestMsg = latestMsgInThread;
    if (!latestMsg) return;

    const openMsgs = (selectedThread.messages || [])
      .filter((m) => m.status === INQUIRY_STATUS.OPEN && !m.answer)
      .sort((a, b) => safeTime(a.createdAt) - safeTime(b.createdAt));

    setSending(true);
    try {
      await markThreadRead(selectedThread);

      if (openMsgs.length > 0) {
        const latestOpen = [...openMsgs].sort(
          (a, b) => safeTime(b.createdAt) - safeTime(b.createdAt)
        )[0];
        const olderOpen = openMsgs.filter((m) => m.id !== latestOpen.id);

        await ownerAnswerInquiry(latestOpen.id, { answer: msg });

        if (olderOpen.length) {
          await Promise.allSettled(olderOpen.map((m) => ownerCloseInquiry(m.id)));
        }

        const olderIds = new Set(olderOpen.map((m) => m.id));

        setInquiries((prev) =>
          prev.map((x) => {
            if (x.id === latestOpen.id) {
              return {
                ...x,
                answer: msg,
                status: INQUIRY_STATUS.ANSWERED,
                answeredAt: nowIso,
                isReadOwner: true,
              };
            }
            if (olderIds.has(x.id)) {
              return { ...x, status: INQUIRY_STATUS.CLOSED, isReadOwner: true };
            }
            return x;
          })
        );

        setReply("");
        await onRefreshNow();
        return;
      }

      const appended = appendOwnerMessage(latestMsg.answer, msg);
      await ownerAnswerInquiry(latestMsg.id, { answer: appended });

      setInquiries((prev) =>
        prev.map((x) =>
          x.id === latestMsg.id
            ? {
                ...x,
                answer: appended,
                status:
                  x.status === INQUIRY_STATUS.CLOSED
                    ? INQUIRY_STATUS.CLOSED
                    : INQUIRY_STATUS.ANSWERED,
                answeredAt: nowIso,
                isReadOwner: true,
              }
            : x
        )
      );

      setReply("");
      await onRefreshNow();
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "Failed to send",
        text: safeStr(e?.message || e),
      });
    } finally {
      setSending(false);
    }
  };

  const onCloseThread = async () => {
    if (!selectedThread) return;

    const open = [...selectedThread.messages]
      .filter((m) => m.status === INQUIRY_STATUS.OPEN)
      .sort((a, b) => safeTime(b.createdAt) - safeTime(a.createdAt))[0];

    if (!open) {
      Swal.fire({
        icon: "info",
        title: "Nothing to close",
        text: "No open inquiry in this conversation.",
      });
      return;
    }

    const ok = await Swal.fire({
      icon: "warning",
      title: "Close this inquiry?",
      text: "This will mark the latest open inquiry as closed.",
      showCancelButton: true,
      confirmButtonText: "Close",
      cancelButtonText: "Cancel",
    });

    if (!ok.isConfirmed) return;

    try {
      await ownerCloseInquiry(open.id);
      setInquiries((prev) =>
        prev.map((x) => (x.id === open.id ? { ...x, status: INQUIRY_STATUS.CLOSED } : x))
      );
      await onRefreshNow();
    } catch (e) {
      Swal.fire({
        icon: "error",
        title: "Failed to close inquiry",
        text: safeStr(e?.message || e),
      });
    }
  };

  const replyDisabled = !selectedThread || sending;

  const chatTimeline = useMemo(() => {
    if (!selectedThread) return [];

    const events = [];

    for (const m of selectedThread.messages || []) {
      const qAt = safeTime(m.createdAt);
      if (qAt) {
        events.push({
          key: `q:${m.id}`,
          kind: "user",
          at: qAt,
          text: m.question,
          avatar: m.userAvatar,
          timeLabel: fmtTimeAgo(m.createdAt),
        });
      }

      const parts = splitOwnerAnswer(m.answer);
      if (parts.length) {
        const aAt = safeTime(m.answeredAt) || safeTime(m.raw?.updated_at) || qAt;
        parts.forEach((part, idx) => {
          const bump = idx * 0.001;
          events.push({
            key: `a:${m.id}:${idx}`,
            kind: "owner",
            at: aAt + bump,
            text: part,
            timeLabel: idx === 0 ? fmtTimeAgo(m.answeredAt) : "",
          });
        });
      }
    }

    events.sort((a, b) => {
      if (a.at !== b.at) return a.at - b.at;
      if (a.kind !== b.kind) return a.kind === "user" ? -1 : 1;
      return a.key.localeCompare(b.key);
    });

    return events;
  }, [selectedThread, selectedThread?.messages?.length]);

  return (
    <div className="oi-shell">
      <div className="oi-wrap">
        <div className="wave-wrap" aria-hidden="true">
          <div className="wave" />
          <div className="wave" />
          <div className="wave" />
        </div>

        <aside className={`oi-gyms ${mobilePanel === "gyms" ? "is-active" : ""}`}>
          <div className="oi-gymsHead">
            <div className="oi-brand">
              <div className="oi-brandIcon">
                <Dumbbell size={18} />
              </div>
              <div className="oi-brandText">
                <div className="oi-brandTitle">Gyms</div>
                <div className="oi-brandSub">
                  Owner Inbox{loadingSummary ? " • Syncing..." : ""}
                </div>
              </div>

              <button
                className="oi-mobileNext"
                type="button"
                onClick={() => setMobilePanel("list")}
                aria-label="Go to inquiries"
              >
                <ChevronLeft size={18} />
              </button>
            </div>

            <div className="oi-search">
              <Search size={16} />
              <input
                value={gymQuery}
                onChange={(e) => setGymQuery(e.target.value)}
                placeholder={loadingGyms ? "Loading gyms..." : "Search gyms..."}
                disabled={loadingGyms}
              />
            </div>
          </div>

          <ul className="oi-gymList">
            {loadingGyms ? (
              <li className="oi-empty" style={{ listStyle: "none" }}>
                <div className="oi-emptyTitle">Loading gyms…</div>
                <div className="oi-emptySub">Please wait.</div>
              </li>
            ) : filteredGyms.length === 0 ? (
              <li className="oi-empty" style={{ listStyle: "none" }}>
                <div className="oi-emptyTitle">No gyms</div>
                <div className="oi-emptySub">No results for your search.</div>
              </li>
            ) : (
              filteredGyms.map((g) => {
                const active = g.id === selectedGymId;
                const c = gymCounts.get(g.id)?.open || 0;
                const gymCover = g.cover || "/defaulticon.png";

                return (
                  <li
                    key={g.id}
                    className={`oi-gymCard ${active ? "is-active" : ""}`}
                    onClick={() => selectGym(g.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <div
                      className="oi-gymCover"
                      style={{
                        backgroundImage: `url(${gymCover})`,
                      }}
                    />
                    <div className="oi-gymMeta">
                      <div className="oi-gymName">{g.name}</div>
                      <div className="oi-gymSub">
                        {c ? `${c} open inquiries` : "No pending"}
                      </div>
                    </div>
                    {c ? <div className="oi-badge">{c}</div> : null}
                  </li>
                );
              })
            )}
          </ul>
        </aside>

        <section className={`oi-list ${mobilePanel === "list" ? "is-active" : ""}`}>
          <div className="oi-listHead">
            <div className="oi-listTop">
              <div className="oi-listTitle">
                <MessageCircle size={18} />
                <span>Inquiries</span>
              </div>

              <div className="oi-listGymName" title={selectedGym?.name || ""}>
                {selectedGym?.name || "—"}
              </div>

              <button
                className="oi-mobileBack"
                type="button"
                onClick={() => setMobilePanel("gyms")}
              >
                Back
              </button>
            </div>

            <div className="oi-search oi-searchLight">
              <Search size={16} />
              <input
                value={inqQuery}
                onChange={(e) => setInqQuery(e.target.value)}
                placeholder={loadingInquiries ? "Searching..." : "Search inquiries..."}
                disabled={!selectedGymId}
              />
            </div>

            <div className="oi-tabs">
              {(OWNER_INQUIRY_TABS || [
                { key: INQUIRY_STATUS.OPEN, label: "Open" },
                { key: INQUIRY_STATUS.ANSWERED, label: "Answered" },
                { key: INQUIRY_STATUS.CLOSED, label: "Closed" },
                { key: "all", label: "All" },
              ]).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={`oi-tab ${statusFilter === t.key ? "is-active" : ""}`}
                  onClick={() => setStatusFilter(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="oi-listBody">
            {!selectedGymId ? (
              <div className="oi-empty">
                <div className="oi-emptyTitle">Pick a gym</div>
                <div className="oi-emptySub">Select a gym on the left.</div>
              </div>
            ) : loadingInquiries ? (
              <div className="oi-empty">
                <div className="oi-emptyTitle">Loading inquiries…</div>
                <div className="oi-emptySub">Fetching conversations.</div>
              </div>
            ) : threadsForGym.length === 0 ? (
              <div className="oi-empty">
                <div className="oi-emptyTitle">No inquiries</div>
                <div className="oi-emptySub">Try switching tabs or searching.</div>
              </div>
            ) : (
              threadsForGym.map((t) => {
                const active = t.key === selectedThreadKey;
                const avatar = t.userAvatar || "/defaulticon.png";

                return (
                  <div
                    key={t.key}
                    className={`oi-item ${active ? "is-active" : ""} ${
                      t.unreadCount ? "is-unread" : ""
                    }`}
                    onClick={() => selectThread(t.key)}
                    role="button"
                    tabIndex={0}
                  >
                    <div
                      className="oi-avatar"
                      style={{
                        backgroundImage: `url(${avatar})`,
                      }}
                    />
                    <div className="oi-itemText">
                      <div className="oi-itemTop">
                        <div className="oi-itemName">{t.userName}</div>
                        {t.openCount ? (
                          <div className="oi-pill is-open">{t.openCount} open</div>
                        ) : (
                          <div className="oi-pill is-answered">done</div>
                        )}
                      </div>
                      <div className="oi-itemMsg">{t.lastPreview}</div>
                    </div>

                    <div className="oi-itemTime">{fmtTimeAgo(t.lastAt)}</div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className={`oi-chat ${mobilePanel === "chat" ? "is-active" : ""}`}>
          <div className="oi-chatHead">
            <div className="oi-chatHeadLeft">
              <div className="oi-chatWho">
                <div
                  className="oi-chatAvatar"
                  style={{
                    backgroundImage: `url(${
                      selectedThread?.userAvatar || "/defaulticon.png"
                    })`,
                  }}
                />
                <div className="oi-chatTitles">
                  <div className="oi-chatName">
                    {selectedThread?.userName || "Select a conversation"}
                  </div>
                  <div className="oi-chatSub">
                    {selectedGym?.name || "—"}
                    {selectedThread ? ` • ${hasAnyOpen ? "Open" : "No pending"}` : ""}
                  </div>
                </div>
              </div>
            </div>

            <button
              className="oi-chatMenu"
              type="button"
              aria-label="Refresh"
              onClick={onRefreshNow}
              disabled={!selectedGymId || loadingInquiries || loadingSummary}
              title="Refresh"
            >
              <RefreshCw size={18} />
            </button>

            <button
              className="oi-chatMenu"
              type="button"
              aria-label="More"
              onClick={() => {
                if (!selectedThread) return;
                Swal.fire({
                  title: "Thread actions",
                  showCancelButton: true,
                  showDenyButton: true,
                  confirmButtonText: "Close inquiry",
                  denyButtonText: "Mark as read",
                  cancelButtonText: "Cancel",
                }).then((r) => {
                  if (!selectedThread) return;
                  if (r.isConfirmed) return onCloseThread();
                  if (r.isDenied) return markThreadRead(selectedThread);
                });
              }}
            >
              <MoreHorizontal size={18} />
            </button>

            <button
              className="oi-mobileBack"
              type="button"
              onClick={() => setMobilePanel("list")}
            >
              Back
            </button>
          </div>

          <div className="oi-chatBody">
            {!selectedThread ? (
              <div className="oi-empty">
                <div className="oi-emptyTitle">Pick a conversation</div>
                <div className="oi-emptySub">Select a person from the middle column.</div>
              </div>
            ) : (
              <>
                {chatTimeline.map((e) => {
                  if (e.kind === "user") {
                    return (
                      <div className="oi-bubbleRow" key={e.key}>
                        <div
                          className="oi-bubbleAvatar"
                          style={{
                            backgroundImage: `url(${e.avatar || "/defaulticon.png"})`,
                          }}
                        />
                        <div className="oi-bubble">
                          <div className="oi-bubbleText">{e.text}</div>
                          <div className="oi-bubbleTime">{e.timeLabel}</div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="oi-bubbleRow is-right" key={e.key}>
                      <div className="oi-bubble oi-bubbleReply">
                        <div className="oi-bubbleText" style={{ whiteSpace: "pre-wrap" }}>
                          {e.text}
                        </div>
                        {e.timeLabel ? (
                          <div className="oi-bubbleTime">{e.timeLabel}</div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}

                {hasAnyOpen ? (
                  <div className="oi-hint">Reply below to answer the latest pending message.</div>
                ) : (
                  <div className="oi-hint">
                    No pending inquiries — you can still add a follow-up message.
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          <div className="oi-chatFoot">
            <textarea
              ref={replyRef}
              className="oi-reply"
              placeholder={
                !selectedThread
                  ? "Select a conversation first"
                  : hasAnyOpen
                  ? "Type your reply..."
                  : "Add a follow-up message…"
              }
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              disabled={!selectedThread || replyDisabled}
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSendReply();
                }
              }}
            />

            <button
              type="button"
              className={`oi-send ${
                reply.trim() && selectedThread && !replyDisabled ? "is-ready" : ""
              }`}
              onClick={onSendReply}
              disabled={!selectedThread || !reply.trim() || replyDisabled}
              aria-label="Send reply"
            >
              <Send size={18} />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}