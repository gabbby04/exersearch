// src/utils/viewStatsApi.js
import { api } from "./apiClient";
import { getGymRatings, normalizeGymRatingsResponse } from "./gymRatingApi";

/* -------------------------------------------
  Shared helpers
------------------------------------------- */

function safeStr(v) {
  return v == null ? "" : String(v);
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function clamp(n, a, b) {
  const x = Number(n);
  if (!Number.isFinite(x)) return a;
  return Math.min(b, Math.max(a, x));
}

function pct(part, whole) {
  const p = whole > 0 ? (part / whole) * 100 : 0;
  return Math.round(p);
}

function fmtAgo(iso) {
  if (!iso) return "just now";
  const t = new Date(String(iso)).getTime();
  if (Number.isNaN(t)) return "just now";
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

function normalizeRange(range) {
  const r = String(range || "30d");
  return ["7d", "30d", "90d", "1y"].includes(r) ? r : "30d";
}

function bucketForRange(range) {
  const r = normalizeRange(range);
  if (r === "7d") return "daily";
  if (r === "30d") return "weekly";
  if (r === "90d") return "biweekly";
  return "monthly";
}

/* -------------------------------------------
  Better scoring helpers (no fake "free points")
------------------------------------------- */

function daysForRange(range) {
  const r = normalizeRange(range);
  if (r === "7d") return 7;
  if (r === "90d") return 90;
  if (r === "1y") return 365;
  return 30;
}

function smoothScore(x, k = 4) {
  // 0..∞ -> 0..100 with a nice curve (never overflows)
  const v = 1 - Math.exp(-k * Math.max(0, Number(x) || 0));
  return Math.round(clamp(v * 100, 0, 100));
}

function confidenceFromCount(n) {
  // 0 reviews => 0.2, ~10 => ~0.7, ~50 => ~0.95
  const x = Math.max(0, safeNum(n));
  return clamp(0.2 + (1 - Math.exp(-x / 10)) * 0.8, 0.2, 1);
}

/* -------------------------------------------
  Timeline aggregation
------------------------------------------- */

function aggregateTimeline(timeline, bucket) {
  const rows = Array.isArray(timeline) ? timeline : [];
  if (!rows.length) return [];

  const ts = rows
    .map((r) => ({
      date: safeStr(r?.date),
      t: new Date(String(r?.date)).getTime(),
      views: safeNum(r?.views),
      saves: safeNum(r?.saves),
      inquiries: safeNum(r?.inquiries),
      membership_intents: safeNum(r?.membership_intents),
      free_visits_claimed: safeNum(r?.free_visits_claimed),
    }))
    .filter((r) => Number.isFinite(r.t))
    .sort((a, b) => a.t - b.t);

  if (!ts.length) return [];

  if (bucket === "daily") {
    return ts.map((r) => ({
      date: r.date,
      views: r.views,
      saves: r.saves,
      inquiries: r.inquiries,
      membership_intents: r.membership_intents,
      free_visits_claimed: r.free_visits_claimed,
    }));
  }

  const bucketDays = bucket === "weekly" ? 7 : bucket === "biweekly" ? 14 : 30;

  const out = [];
  let curStart = ts[0].t;
  let curEnd = curStart + bucketDays * 86400000;
  let acc = null;

  function pushAcc() {
    if (!acc) return;
    out.push({
      date: acc.label,
      views: acc.views,
      saves: acc.saves,
      inquiries: acc.inquiries,
      membership_intents: acc.membership_intents,
      free_visits_claimed: acc.free_visits_claimed,
    });
  }

  for (const r of ts) {
    while (r.t >= curEnd) {
      pushAcc();
      acc = null;
      curStart = curEnd;
      curEnd = curStart + bucketDays * 86400000;
    }

    if (!acc) {
      const startD = new Date(curStart);
      const endD = new Date(curEnd - 86400000);
      const s = startD.toISOString().slice(5, 10);
      const e = endD.toISOString().slice(5, 10);
      acc = {
        label: bucket === "monthly" ? startD.toISOString().slice(0, 7) : `${s}–${e}`,
        views: 0,
        saves: 0,
        inquiries: 0,
        membership_intents: 0,
        free_visits_claimed: 0,
      };
    }

    acc.views += r.views;
    acc.saves += r.saves;
    acc.inquiries += r.inquiries;
    acc.membership_intents += r.membership_intents;
    acc.free_visits_claimed += r.free_visits_claimed;
  }

  pushAcc();
  return out;
}

/* -------------------------------------------
  Keyword helpers (inquiries + reviews)
------------------------------------------- */

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "if",
  "then",
  "else",
  "when",
  "where",
  "who",
  "what",
  "why",
  "how",
  "to",
  "of",
  "in",
  "on",
  "at",
  "for",
  "from",
  "by",
  "with",
  "about",
  "as",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "this",
  "that",
  "these",
  "those",
  "it",
  "its",
  "i",
  "we",
  "you",
  "they",
  "them",
  "my",
  "our",
  "your",
  "can",
  "could",
  "should",
  "would",
  "will",
  "just",
  "please",
  "hi",
  "hello",
  "thanks",
  "thank",
  "do",
  "does",
  "did",
  "done",
  "have",
  "has",
  "had",
  "me",
  "im",
  "i'm",
  "gym",
  "place",
  "nice",
  "good",
  "great",
  "okay",
  "very",
  "super",
  "really",
]);

function tokenize(text, { minLen = 3 } = {}) {
  if (!text) return [];
  return safeStr(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean)
    .filter((w) => w.length >= minLen)
    .filter((w) => !STOPWORDS.has(w));
}

function buildReviewKeywordTable(
  ratings,
  { topN = 8, textKey = "review", verifiedKey = "verified" } = {}
) {
  const total = new Map();
  const verified = new Map();

  for (const it of ratings || []) {
    const uniqueWords = Array.from(new Set(tokenize(it?.[textKey])));
    for (const w of uniqueWords) {
      total.set(w, (total.get(w) || 0) + 1);
      if (it?.[verifiedKey]) verified.set(w, (verified.get(w) || 0) + 1);
    }
  }

  return Array.from(total.entries())
    .map(([word, mentions]) => {
      const v = verified.get(word) || 0;
      const share = mentions > 0 ? (v / mentions) * 100 : 0;
      return {
        name: word,
        visits: mentions,
        conversions: v,
        ctr: Number(share.toFixed(1)),
        cost: 0,
      };
    })
    .sort((a, b) => b.visits - a.visits)
    .slice(0, topN);
}

// Inquiry keywords: resolved per keyword using actual inquiries list
function buildResolvedKeywordTableFromInquiries(
  inquiries,
  { limit = 8, minLen = 3 } = {}
) {
  const total = new Map();
  const resolved = new Map();

  for (const it of inquiries || []) {
    const q = safeStr(it?.question).toLowerCase();
    if (!q) continue;

    const st = safeStr(it?.status).toLowerCase();
    const isResolved = st && st !== "open";

    const unique = new Set(
      q
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .map((t) => t.trim())
        .filter(Boolean)
        .filter((t) => t.length >= minLen)
        .filter((t) => !STOPWORDS.has(t))
    );

    for (const w of unique) {
      total.set(w, (total.get(w) || 0) + 1);
      if (isResolved) resolved.set(w, (resolved.get(w) || 0) + 1);
    }
  }

  return [...total.entries()]
    .map(([name, mentions]) => {
      const conv = resolved.get(name) || 0;
      const ctr = mentions > 0 ? Math.round((conv / mentions) * 100) : 0;
      return { name, visits: mentions, conversions: conv, ctr, cost: 0 };
    })
    .sort((a, b) => b.visits - a.visits)
    .slice(0, limit);
}

function buildStarDistribution(ratings, { verifiedOnly = false } = {}) {
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of ratings || []) {
    if (verifiedOnly && !r?.verified) continue;
    const s = Number(r?.stars);
    if (s >= 1 && s <= 5) dist[s] += 1;
  }
  return dist;
}

/* -------------------------------------------
  Ratings fetch (paginated)
------------------------------------------- */

export async function fetchAllGymRatings(
  gymId,
  { per_page = 100, maxPages = 20 } = {}
) {
  let page = 1;
  let all = [];
  let summary = null;

  while (true) {
    const raw = await getGymRatings(gymId, { per_page, page });
    const norm = normalizeGymRatingsResponse(raw);

    summary = norm.summary;
    all = all.concat(norm.ratings || []);

    const last = Number(norm.pagination?.last_page || 1);
    if (page >= last) break;

    page += 1;
    if (page > maxPages) break;
  }

  return { summary, ratings: all };
}

/* -------------------------------------------
  Goals / Hero / Funnel / Engagement
------------------------------------------- */

function buildGoalsFromTotals(totals, baseGoals) {
  const t = totals || {};
  const goals = Array.isArray(baseGoals) ? baseGoals : [];

  const monthlySignups =
    safeNum(t?.monthly_signups?.current) ||
    safeNum(t?.membership_intents?.current);
  const verifiedAvg =
    t?.ratings?.verified_avg == null ? null : safeNum(t?.ratings?.verified_avg);

  const engagement =
    safeNum(t?.saves?.current) +
    safeNum(t?.inquiries?.current) +
    safeNum(t?.free_visits?.claimed_current);

  const visibility = safeNum(t?.views?.current);

  return goals.map((g) => {
    const name = safeStr(g?.name);
    const target = safeNum(g?.target);

    let current = safeNum(g?.current);
    if (/sign/i.test(name)) current = monthlySignups;
    else if (/rating/i.test(name)) current = verifiedAvg == null ? 0 : verifiedAvg;
    else if (/engage/i.test(name)) current = engagement;
    else if (/visib/i.test(name)) current = visibility;

    const percentage = target > 0 ? Math.round((current / target) * 100) : 0;

    return {
      name,
      current,
      target,
      percentage: clamp(percentage, 0, 999),
    };
  });
}

function heroFromTotals(totals) {
  const t = totals || {};
  const views = t?.views || {};
  const saves = t?.saves || {};
  const inquiries = t?.inquiries || {};
  const rating = t?.ratings || {};
  const active = t?.active_members || {};

  const engagementCurrent =
    safeNum(saves.current) +
    safeNum(inquiries.current) +
    safeNum(t?.free_visits?.claimed_current);

  const engagementPrev =
    safeNum(saves.previous) +
    safeNum(inquiries.previous) +
    safeNum(t?.free_visits?.claimed_previous);

  const engagementChange =
    engagementPrev > 0
      ? Math.round(((engagementCurrent - engagementPrev) / engagementPrev) * 100)
      : engagementCurrent > 0
      ? 100
      : 0;

  const verifiedAvg = rating.verified_avg == null ? null : safeNum(rating.verified_avg);

  function statusForChange(ch) {
    if (ch >= 25) return "excellent";
    if (ch >= 5) return "good";
    if (ch >= -5) return "warning";
    return "danger";
  }

  function trend(ch) {
    return ch >= 0 ? "up" : "down";
  }

  const viewsCh = safeNum(views.change);

  const membersNow = safeNum(active.current);
  const membersPrev = safeNum(active.previous);
  const membersCh = active?.change == null ? 0 : safeNum(active.change);

  return {
    views: {
      current: safeNum(views.current),
      previous: safeNum(views.previous),
      change: viewsCh,
      trend: trend(viewsCh),
      prediction: Math.max(0, Math.round(safeNum(views.current) * 1.08)),
      status: statusForChange(viewsCh),
    },
    members: {
      current: membersNow,
      previous: membersPrev,
      change: membersCh,
      trend: trend(membersCh),
      prediction: Math.max(0, Math.round(membersNow * 1.05)),
      status: statusForChange(membersCh),
    },
    engagement: {
      current: engagementCurrent,
      previous: engagementPrev,
      change: engagementChange,
      trend: trend(engagementChange),
      prediction: Math.max(0, Math.round(engagementCurrent * 1.06)),
      status: statusForChange(engagementChange),
    },
    rating: {
      current: verifiedAvg == null ? 0 : verifiedAvg,
      previous: 0,
      change: 0,
      trend: "up",
      prediction: verifiedAvg == null ? 0 : clamp(verifiedAvg + 0.05, 0, 5),
      status:
        verifiedAvg != null && verifiedAvg >= 4.6
          ? "excellent"
          : verifiedAvg != null && verifiedAvg >= 4.2
          ? "good"
          : "warning",
    },
  };
}

function funnelFromTotals(totals) {
  const t = totals || {};
  const views = safeNum(t?.views?.current);
  const saves = safeNum(t?.saves?.current);
  const inquiries = safeNum(t?.inquiries?.current);
  const intents = safeNum(t?.membership_intents?.current);
  const active = safeNum(t?.active_members?.current);

  const stages = [
    { stage: "Profile Views", count: views },
    { stage: "Saved", count: saves },
    { stage: "Inquiries", count: inquiries },
    { stage: "Membership Intents", count: intents },
    { stage: "Active Members", count: active },
  ];

  const base = Math.max(stages[0].count, 1);

  return stages.map((s, i) => {
    const percentage = pct(s.count, base);
    const next = stages[i + 1]?.count ?? null;
    const drop = next == null ? 0 : pct(Math.max(s.count - next, 0), Math.max(s.count, 1));
    return { ...s, percentage, drop };
  });
}

function engagementBreakdown(totals, range) {
  const t = totals || {};
  const saves = safeNum(t?.saves?.current);
  const inquiries = safeNum(t?.inquiries?.current);
  const freeUsed = safeNum(t?.free_visits?.used_current);
  const verifiedCount = safeNum(t?.ratings?.verified_count);

  const r = normalizeRange(range);
  const days = r === "7d" ? 7 : r === "90d" ? 90 : r === "1y" ? 365 : 30;

  return [
    { name: "Saves", value: saves, members: saves, avg: Math.round(saves / days), growth: safeNum(t?.saves?.change) },
    { name: "Inquiries", value: inquiries, members: inquiries, avg: Math.round(inquiries / days), growth: safeNum(t?.inquiries?.change) },
    { name: "Verified Reviews", value: verifiedCount, members: verifiedCount, avg: Math.round(verifiedCount / days), growth: 0 },
    { name: "Free Visits Used", value: freeUsed, members: freeUsed, avg: Math.round(freeUsed / days), growth: safeNum(t?.free_visits?.claimed_change) },
  ];
}

/* -------------------------------------------
  NEW: Better Performance Score (honest + scales)
------------------------------------------- */

function perfScoreFromData({ totals, hero, range }) {
  const t = totals || {};
  const h = hero || {};
  const days = daysForRange(range);

  const views = safeNum(t?.views?.current);
  const saves = safeNum(t?.saves?.current);
  const inquiries = safeNum(t?.inquiries?.current);
  const freeClaimed = safeNum(t?.free_visits?.claimed_current);

  const engagementActions = saves + inquiries + freeClaimed;

  // 1) Visibility: views/day vs target baseline
  const rr = normalizeRange(range);
  const targetViewsPerDay = rr === "7d" ? 8 : rr === "30d" ? 6 : rr === "90d" ? 4 : 3;
  const viewsPerDay = views / Math.max(days, 1);
  const visibility = smoothScore(viewsPerDay / targetViewsPerDay);

  // 2) Engagement: actions per view
  const targetEngRate = 0.06;
  const engRate = views > 0 ? engagementActions / views : 0;
  const engagement = smoothScore(engRate / targetEngRate);

  // 3) Satisfaction: rating->% * confidence by verified reviews
  const rating = safeNum(h?.rating?.current);
  const verifiedCount = safeNum(t?.ratings?.verified_count);
  const conf = confidenceFromCount(verifiedCount);
  const satisfactionRaw = rating > 0 ? (rating / 5) * 100 : 0;
  const satisfaction = Math.round(clamp(satisfactionRaw * conf, 0, 100));

  // 4) Growth: member change % (prefer totals)
  const memberChange = safeNum(t?.active_members?.change ?? h?.members?.change);
  const growth = Math.round(clamp(50 + (clamp(memberChange, -30, 30) / 30) * 40, 0, 100));

  const overall = Math.round(
    visibility * 0.3 +
      engagement * 0.3 +
      satisfaction * 0.25 +
      growth * 0.15
  );

  return {
    overall,
    visibility,
    engagement,
    satisfaction,
    growth,
  };
}

/* -------------------------------------------
  Executive summary cards
------------------------------------------- */

function execSummaryCards({ totals, competitor, routes }) {
  const t = totals || {};
  const comp = competitor || {};
  const r = routes || {};

  const viewsCur = safeNum(t?.views?.current);
  const viewsCh = safeNum(t?.views?.change);

  const inqCur = safeNum(t?.inquiries?.current);
  const inqCh = safeNum(t?.inquiries?.change);

  const cards = [];

  cards.push({
    type: viewsCh >= 10 ? "good" : viewsCh >= 0 ? "info" : "warning",
    icon: "visibility",
    title: viewsCh >= 10 ? "Visibility is climbing" : viewsCh >= 0 ? "Visibility holding steady" : "Visibility is dipping",
    message: `You got ${viewsCur.toLocaleString()} views in this range (${viewsCh >= 0 ? "+" : ""}${viewsCh}%).`,
    action: "View timeline",
    href: r.timeline || "",
  });

  cards.push({
    type: inqCur > 0 ? (inqCh >= 0 ? "good" : "warning") : "info",
    icon: "engagement",
    title: inqCur > 0 ? "New inquiries coming in" : "No inquiries yet",
    message: inqCur > 0 ? `${inqCur} inquiries in this range (${inqCh >= 0 ? "+" : ""}${inqCh}%).` : "Once users start asking questions, you’ll see trending topics here.",
    action: "Open inbox",
    href: r.inbox || "",
  });

  const hasMarket = !!comp?.has_market_data;
  if (hasMarket) {
    const yr = safeNum(comp?.your_gym?.rating);
    const ar = safeNum(comp?.area_average?.rating);
    const ym = safeNum(comp?.your_gym?.members);
    const am = safeNum(comp?.area_average?.members);

    cards.push({
      type: yr >= ar ? "good" : "info",
      icon: "growth",
      title: "Market position updated",
      message: `Across ${safeNum(comp?.market_count)} gyms, you’re at ${yr.toFixed(1)}★ vs ${ar.toFixed(1)}★ avg, and ${ym} members vs ${am} avg.`,
      action: "See competitors",
      href: r.market || "",
    });
  }

  return cards;
}

/* -------------------------------------------
  Demographics: KEEP backend shape + reorder 12-18 first
------------------------------------------- */

function normalizeDemographics(demo, fallback) {
  const d = demo || fallback || {};
  const ageRows = Array.isArray(d?.age) ? d.age : Array.isArray(fallback?.age) ? fallback.age : [];

  const map = new Map();
  for (const row of ageRows) {
    const rangeRaw = safeStr(row?.range).trim();
    if (!rangeRaw) continue;
    const range = rangeRaw === "12–18" ? "12-18" : rangeRaw;
    const prev = map.get(range) || { range, count: 0, percentage: null };
    map.set(range, {
      range,
      count: prev.count + safeNum(row?.count),
      percentage: row?.percentage == null ? prev.percentage : safeNum(row?.percentage),
    });
  }

  if (!map.has("12-18")) map.set("12-18", { range: "12-18", count: 0, percentage: 0 });

  const order = ["12-18", "19-24", "25-34", "35-44", "45-54", "55+"];

  const age = [];
  for (const k of order) {
    if (map.has(k)) age.push(map.get(k));
    else age.push({ range: k, count: 0, percentage: 0 });
  }

  for (const [k, v] of map.entries()) {
    if (age.some((x) => x.range === k)) continue;
    age.push(v);
  }

  const g = d?.gender || fallback?.gender || { male: 0, female: 0, other: 0 };

  return {
    ...d,
    age,
    gender: {
      male: safeNum(g?.male),
      female: safeNum(g?.female),
      other: safeNum(g?.other),
    },
  };
}

/* -------------------------------------------
  API: analytics + inquiries
------------------------------------------- */

export async function fetchGymAnalytics(gymId, { range = "30d", timeline = 1 } = {}) {
  const r = normalizeRange(range);
  const res = await api.get(`/gyms/${Number(gymId)}/analytics`, {
    params: { range: r, timeline: timeline ? 1 : 0 },
  });
  return res.data;
}

export async function fetchAllOwnerInquiries(gymId, { per_page = 100, maxPages = 20 } = {}) {
  let page = 1;
  let all = [];

  while (true) {
    const res = await api.get(`/owner/gyms/${encodeURIComponent(gymId)}/inquiries`, {
      params: { per_page, page },
    });

    const root = res.data ?? {};
    const data = Array.isArray(root?.data) ? root.data : Array.isArray(root?.inquiries) ? root.inquiries : [];

    all = all.concat(data);

    const last = safeNum(root?.last_page) || 1;
    if (page >= last) break;

    page += 1;
    if (page > maxPages) break;
  }

  return all;
}

/* -------------------------------------------
  Loader
------------------------------------------- */

export async function loadViewStats(
  gymId,
  {
    baseStats,
    range = "30d",
    routes = {
      inbox: "/owner/inbox",
      timeline: null,
      market: null,
    },
    keywordTopN = 8,
    ratingsTopN = 8,
  } = {}
) {
  const gId = Number(gymId);
  const r = normalizeRange(range);

  const base = baseStats ? JSON.parse(JSON.stringify(baseStats)) : {};
  base.gym_id = gId || base.gym_id || 0;

  const [data, ownerInquiries, ratingsPack] = await Promise.all([
    fetchGymAnalytics(gId, { range: r, timeline: 1 }),
    fetchAllOwnerInquiries(gId),
    fetchAllGymRatings(gId),
  ]);

  const gymName = safeStr(data?.gym?.name) || safeStr(base?.gym_name) || `Gym #${gId}`;
  const lastUpdated = fmtAgo(data?.window?.end);

  const totals = data?.totals || {};
  const rawTimeline = Array.isArray(data?.timeline) ? data.timeline : [];

  const bucket = bucketForRange(r);
  const timelineAgg = aggregateTimeline(rawTimeline, bucket);

  const hero = heroFromTotals(totals);
  const perf = perfScoreFromData({ totals, hero, range: r });
  const funnel = funnelFromTotals(totals);
  const engagement = engagementBreakdown(totals, r);

  const demographics = normalizeDemographics(data?.demographics, base?.demographics);

  const competitor = data?.competitor_comparison || base?.competitor_comparison || null;

  const exec = execSummaryCards({
    totals,
    competitor,
    routes: {
      inbox: routes?.inbox || "/owner/inbox",
      timeline: routes?.timeline || "",
      market: routes?.market || "",
    },
  });

  const goals = buildGoalsFromTotals(totals, base?.goals || []);

  const inquiryKeywordsTable = buildResolvedKeywordTableFromInquiries(ownerInquiries, {
    limit: keywordTopN,
    minLen: 3,
  });

  const { summary, ratings } = ratingsPack || {};

  const verifiedAvg =
    typeof summary?.public_avg_stars === "number"
      ? summary.public_avg_stars
      : totals?.ratings?.verified_avg != null
      ? safeNum(totals?.ratings?.verified_avg)
      : 0;

  const verifiedCount = safeNum(summary?.verified_count || totals?.ratings?.verified_count);
  const unverifiedCount = safeNum(summary?.unverified_count);
  const totalCount = safeNum(summary?.total_count || (Array.isArray(ratings) ? ratings.length : 0));

  const distVerified = buildStarDistribution(ratings, { verifiedOnly: true });
  const distAll = buildStarDistribution(ratings, { verifiedOnly: false });

  const ratingKeywordsTable = buildReviewKeywordTable(ratings, {
    topN: ratingsTopN,
    textKey: "review",
    verifiedKey: "verified",
  });

  return {
    ...base,
    gym_name: gymName,
    gym_id: gId,
    last_updated: lastUpdated,

    hero_metrics: {
      ...hero,
      rating: {
        ...(hero?.rating || {}),
        current: verifiedAvg || 0,
      },
    },

    performance_score: perf,

    timeline_data: timelineAgg.map((row) => ({
      date: row.date,
      views: row.views,
      members: safeNum(totals?.active_members?.current),
      engagement: row.saves + row.inquiries + row.free_visits_claimed,
    })),

    conversion_funnel: funnel,
    engagement_details: { by_action: engagement },

    demographics,
    competitor_comparison: competitor || base?.competitor_comparison,
    executive_summary: exec,
    goals,

    inquiry_keywords_table: inquiryKeywordsTable,
    rating_keywords_table: ratingKeywordsTable,

    reviews_analytics: {
      total: totalCount,
      verified_total: verifiedCount,
      unverified_total: unverifiedCount,
      average_verified: verifiedAvg || 0,
      distribution_verified: distVerified,
      distribution_all: distAll,
    },
  };
}