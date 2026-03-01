// src/utils/userHomeApi.js
import axios from "axios";

export const API_BASE = "https://exersearch.test";
export const TOKEN_KEY = "token";

export const FALLBACK_AVATAR = "/defaulticon.png";

/* -----------------------------
  Existing helpers (keep yours)
----------------------------- */
export function safeStr(v) {
  return v == null ? "" : String(v);
}

export function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function numOrNull(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function toAbsUrl(u) {
  if (!u) return "";
  const s = String(u).trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  const base = String(API_BASE || "").replace(/\/$/, "");
  const path = s.startsWith("/") ? s : `/${s}`;
  return `${base}${path}`;
}

export function initials(nameOrEmail) {
  const s = safeStr(nameOrEmail).trim();
  if (!s) return "U";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase();
}

export function clamp(n, a, b) {
  const x = Number(n);
  if (!Number.isFinite(x)) return a;
  return Math.min(b, Math.max(a, x));
}

export function distanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const aLat = toRad(lat1);
  const bLat = toRad(lat2);
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat) * Math.cos(bLat) * Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(a));
}

/* -----------------------------
  API calls (keep yours)
----------------------------- */
export async function fetchMe(token) {
  const res = await axios.get(`${API_BASE}/api/v1/me`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    withCredentials: true,
  });
  return res.data || null;
}

export async function fetchPublicSettings() {
  const res = await axios.get(`${API_BASE}/api/v1/settings/public`, { withCredentials: true });
  const data = res.data?.data ?? res.data;
  return data || {};
}

export async function fetchUserProfile(token) {
  const res = await axios.get(`${API_BASE}/api/v1/user/profile`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    withCredentials: true,
  });
  return res.data?.data ?? res.data?.profile ?? res.data ?? null;
}

export async function fetchGyms() {
  const res = await axios.get(`${API_BASE}/api/v1/gyms`, { withCredentials: true });
  const rows = res.data?.data ?? res.data?.gyms ?? res.data ?? [];
  return Array.isArray(rows) ? rows : [];
}

export async function fetchSavedGyms(token) {
  const res = await axios.get(`${API_BASE}/api/v1/user/saved-gyms`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    withCredentials: true,
  });
  const rows = res.data?.data ?? res.data?.saved_gyms ?? res.data ?? [];
  return Array.isArray(rows) ? rows : [];
}

export async function fetchLatestReviews(token, limit = 3) {
  const res = await axios.get(`${API_BASE}/api/v1/ratings/latest`, {
    params: { limit },
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    withCredentials: true,
  });
  const rows = res.data?.data ?? res.data?.reviews ?? res.data ?? [];
  return Array.isArray(rows) ? rows : [];
}

export async function fetchRatingsSummary(token, gymIds = []) {
  const ids = Array.isArray(gymIds) ? gymIds.filter(Boolean) : [];
  const params = ids.length ? { gym_ids: ids.join(",") } : undefined;

  const res = await axios.get(`${API_BASE}/api/v1/gyms/ratings/summary`, {
    params,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    withCredentials: true,
  });

  return res.data?.data ?? {};
}

/* -----------------------------
  Mapping & lists (keep yours)
----------------------------- */
export function mapGymRowToCard(row) {
  const g = row || {};

  const gymIdRaw = g.gym_id ?? g.id ?? g.gymId ?? g.gym?.gym_id ?? g.gym?.id ?? g.gym?.gymId ?? 0;
  const gymId = Number(gymIdRaw);

  const lat = numOrNull(g.latitude ?? g.lat ?? g.gym?.latitude ?? g.gym?.lat);
  const lng = numOrNull(g.longitude ?? g.lng ?? g.lon ?? g.gym?.longitude ?? g.gym?.lng ?? g.gym?.lon);

  const daily = safeNum(g.daily_price ?? g.dailyPrice ?? g.price ?? g.gym?.daily_price ?? g.gym?.dailyPrice ?? g.gym?.price ?? 0);
  const monthly = safeNum(g.monthly_price ?? g.monthlyPrice ?? g.gym?.monthly_price ?? g.gym?.monthlyPrice ?? 0);

  const name = safeStr(g.name ?? g.gym?.name ?? "Gym");
  const address = safeStr(g.address ?? g.location ?? g.gym?.address ?? g.gym?.location ?? "");
  const type = safeStr(g.gym_type ?? g.type ?? g.gym?.gym_type ?? g.gym?.type ?? "Fitness");

  const rating = clamp(safeNum(g.avg_rating ?? g.rating ?? g.gym?.avg_rating ?? g.gym?.rating ?? 0), 0, 5);
  const reviews = Math.max(
    0,
    Math.floor(safeNum(g.reviews_count ?? g.review_count ?? g.reviews ?? g.gym?.reviews_count ?? g.gym?.review_count ?? g.gym?.reviews ?? 0))
  );

  const tags = Array.isArray(g.tags)
    ? g.tags.map(safeStr).filter(Boolean)
    : Array.isArray(g.gym?.tags)
      ? g.gym.tags.map(safeStr).filter(Boolean)
      : [];

  const amenitiesRaw = Array.isArray(g.amenities) ? g.amenities : Array.isArray(g.gym?.amenities) ? g.gym.amenities : [];
  const amenities = Array.isArray(amenitiesRaw) ? amenitiesRaw.map((a) => safeStr(a?.name ?? a)).filter(Boolean) : [];

  const imageRaw = safeStr(g.main_image_url ?? g.mainImageUrl ?? g.image ?? g.gym?.main_image_url ?? g.gym?.mainImageUrl ?? g.gym?.image ?? "");
  const image = imageRaw ? toAbsUrl(imageRaw) : "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80";

  const matchScore = clamp(
    safeNum(
      g.match_score ??
        g.matchScore ??
        g.fit_rank_score ??
        g.fitRankScore ??
        g.equipment_score ??
        g.gym?.match_score ??
        g.gym?.matchScore ??
        g.gym?.fit_rank_score ??
        g.gym?.fitRankScore ??
        g.gym?.equipment_score ??
        0
    ),
    0,
    100
  );

  return {
    id: Number.isFinite(gymId) ? gymId : 0,
    name,
    location: address,
    rating: rating || 0,
    reviews: reviews || 0,
    price: daily || 0,
    monthlyPrice: monthly || 0,
    tags,
    amenities,
    coordinates: [lat, lng],
    image,
    matchScore,
    type,
    distance: null,
  };
}

export function withDistances(gyms, userLat, userLng) {
  const lat = Number(userLat);
  const lng = Number(userLng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return (gyms || []).map((x) => ({ ...x, distance: null }));
  }

  return (gyms || []).map((x) => {
    const coords = x.coordinates || [];
    const gLat = coords[0];
    const gLng = coords[1];

    const d =
      Number.isFinite(gLat) && Number.isFinite(gLng)
        ? distanceKm(lat, lng, gLat, gLng)
        : null;

    return { ...x, distance: d == null ? null : Math.round(d * 10) / 10 };
  });
}

export function sortGyms(list, sortBy) {
  const arr = [...(list || [])];

  if (sortBy === "match") {
    arr.sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
  } else if (sortBy === "rating") {
    arr.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  } else if (sortBy === "distance") {
    arr.sort((a, b) => {
      const da = a.distance;
      const db = b.distance;
      if (da == null && db == null) return 0;
      if (da == null) return 1;
      if (db == null) return -1;
      return da - db;
    });
  } else if (sortBy === "price") {
    arr.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  }

  return arr;
}

export function extractSavedGymIds(rows) {
  const ids = [];
  (rows || []).forEach((r) => {
    const id = r?.gym_id ?? r?.gymId ?? r?.gym?.gym_id ?? r?.gym?.id ?? r?.gym?.gymId;
    if (id != null) ids.push(Number(id));
  });
  return Array.from(new Set(ids)).filter((n) => Number.isFinite(n) && n > 0);
}

export function extractSavedGymRows(rows) {
  const gyms = [];
  (rows || []).forEach((r) => {
    if (r?.gym && (r.gym.gym_id || r.gym.id)) {
      gyms.push(r.gym);
      return;
    }
    if (r && (r.gym_id || r.id) && (r.name || r.address || r.latitude || r.longitude || r.daily_price || r.monthly_price)) {
      gyms.push(r);
    }
  });
  return gyms;
}

export function mergeRatingsIntoGyms(gymCards, ratingMap) {
  const map = ratingMap || {};
  return (gymCards || []).map((g) => {
    const id = Number(g?.id);
    const r = id && map[id] ? map[id] : null;

    const avg = r ? safeNum(r.avg_rating) : 0;
    const cnt = r ? safeNum(r.reviews_count) : 0;

    return {
      ...g,
      rating: clamp(avg, 0, 5),
      reviews: Math.max(0, Math.floor(cnt)),
    };
  });
}

/* =========================================================
  ✅ NEW: Move Home.jsx “fat” into here (pure helpers + static)
========================================================= */

/** ---------- Roles / UI Mode ---------- */
export const UI_MODE_KEY = "ui_mode";
export const ROLE_LEVEL = { user: 1, owner: 2, superadmin: 3 };

export function roleLevel(role) {
  return ROLE_LEVEL[role] ?? 0;
}
export function hasAtLeastRole(role, required) {
  return roleLevel(role) >= roleLevel(required);
}
export function allowedUiModesForRole(role) {
  const lvl = roleLevel(role);
  const modes = [];
  if (lvl >= ROLE_LEVEL.owner) modes.push("owner");
  if (lvl >= ROLE_LEVEL.superadmin) modes.push("superadmin");
  return modes;
}
export function routeForUiMode(mode) {
  if (mode === "owner") return "/owner/home";
  if (mode === "superadmin") return "/admin/dashboard";
  return "/home";
}
export function labelForUiMode(mode) {
  if (mode === "owner") return "Owner UI";
  if (mode === "superadmin") return "Superadmin UI";
  return "";
}
export function currentUiFromPath(pathname) {
  const p = String(pathname || "");
  if (p.startsWith("/owner")) return "owner";
  if (p.startsWith("/admin")) return "superadmin";
  return "user";
}

/** ---------- Avatar picker ---------- */
export function pickAvatarSrc(effectiveUser, currentUi) {
  const u = effectiveUser;
  if (!u) return FALLBACK_AVATAR;

  let raw = "";

  if (currentUi === "user") {
    raw =
      u?.user_profile?.profile_photo_url ||
      u?.userProfile?.profile_photo_url ||
      u?.owner_profile?.profile_photo_url ||
      u?.ownerProfile?.profile_photo_url ||
      u?.admin_profile?.avatar_url ||
      u?.adminProfile?.avatar_url ||
      u?.avatar_url ||
      u?.profile_photo_url ||
      u?.photoURL ||
      u?.avatar ||
      "";
  } else if (currentUi === "owner") {
    raw =
      u?.owner_profile?.profile_photo_url ||
      u?.ownerProfile?.profile_photo_url ||
      u?.user_profile?.profile_photo_url ||
      u?.userProfile?.profile_photo_url ||
      u?.admin_profile?.avatar_url ||
      u?.adminProfile?.avatar_url ||
      u?.avatar_url ||
      u?.profile_photo_url ||
      u?.photoURL ||
      u?.avatar ||
      "";
  } else {
    raw =
      u?.admin_profile?.avatar_url ||
      u?.adminProfile?.avatar_url ||
      u?.user_profile?.profile_photo_url ||
      u?.userProfile?.profile_photo_url ||
      u?.owner_profile?.profile_photo_url ||
      u?.ownerProfile?.profile_photo_url ||
      u?.avatar_url ||
      u?.profile_photo_url ||
      u?.photoURL ||
      u?.avatar ||
      "";
  }

  if (!raw) return FALLBACK_AVATAR;
  if (/^https?:\/\//i.test(String(raw))) return String(raw);
  return toAbsUrl(raw);
}

/** ---------- Static UI data ---------- */
export const PROMOS = [
  {
    id: 1,
    badge: "LIMITED DEAL",
    title: "3-Day Pass for ₱299",
    desc: "Valid at selected gyms",
    cta: "Browse Deals",
    bg: "linear-gradient(135deg,#2d0a02,#7a1e05,#d23f0b)",
    accent: "#ff7043",
    link: "/home/find-gyms",
  },
  {
    id: 2,
    badge: "WEEKEND BOOST",
    title: "Bring a Friend Discount",
    desc: "Selected gyms offer buddy discounts",
    cta: "See Gyms",
    bg: "linear-gradient(135deg,#0a0d2d,#1b2069,#3b4de8)",
    accent: "#6b7ff5",
    link: "/home/find-gyms",
  },
  {
    id: 3,
    badge: "SAVINGS",
    title: "Cheapest Monthlies",
    desc: "Sort by Price to find the best value",
    cta: "Show Deals",
    bg: "linear-gradient(135deg,#0a2d18,#0d6e35,#10b981)",
    accent: "#34d399",
    link: "/home",
  },
];

export const DISCOVERY_TIPS = [
  { id: 1, title: "Best Match Gyms", message: "See gyms perfectly matched to your goals", link: "/home/find-gyms", color: "#3b82f6", bg: "#eff6ff" },
  { id: 2, title: "Workout Plan", message: "Track and follow your weekly training plan", link: "/home/workout", color: "#f97316", bg: "#fff7ed" },
  { id: 3, title: "Meal Plan", message: "Fuel your training with smart nutrition", link: "/home/meal-plan", color: "#10b981", bg: "#ecfdf5" },
  { id: 4, title: "Saved Gyms", message: "View gyms you've bookmarked", link: "/home/saved-gyms", color: "#ef4444", bg: "#fef2f2" },
];

export const RECENT_ACTIVITY = [
  { id: 1, gym: "IronForge Fitness", gymId: 1, action: "Completed leg day", time: "2 hours ago", color: "#10b981" },
  { id: 2, gym: "FitZone Studio", gymId: 2, action: "Saved to favorites", time: "Yesterday", color: "#ef4444" },
  { id: 3, gym: "PowerHouse Pro", gymId: 3, action: "Viewed details", time: "2 days ago", color: "#3b82f6" },
];

export const UPCOMING_EVENTS = [
  { id: 1, title: "Powerlifting Meetup", gym: "IronForge Fitness", gymId: 1, date: "Mar 1", day: "Sat", time: "9:00 AM", spots: 12, color: "#d23f0b" },
  { id: 2, title: "Zumba Masterclass", gym: "FitZone Studio", gymId: 2, date: "Mar 3", day: "Mon", time: "7:00 PM", spots: 5, color: "#8b5cf6" },
  { id: 3, title: "CrossFit Open WOD", gym: "PowerHouse Pro", gymId: 3, date: "Mar 5", day: "Wed", time: "6:00 AM", spots: 20, color: "#10b981" },
];

export const FAQS = [
  { id: 1, q: "How does the day pass work?", a: "Day passes let you access any gym for a full 24-hour period. Purchase through the app and show your QR code at the front desk." },
  { id: 2, q: "Can I cancel a gym visit?", a: "Yes, you can cancel up to 2 hours before your scheduled visit for a full refund. Late cancellations may incur a small fee." },
  { id: 3, q: "How accurate is the crowd level?", a: "Crowd levels are updated in real-time based on check-in data from gyms. They reflect current capacity as a percentage of maximum." },
  { id: 4, q: "Can I book multiple gyms in one day?", a: "Absolutely! With a multi-gym membership or individual day passes, you can visit different gyms in the same day." },
];

export const EMPTY_MSG = {
  saved: { title: "No saved gyms yet", desc: "Tap the heart on any gym to save it here." },
  nearby: { title: "No nearby gyms", desc: "Add your location in your profile to see nearest gyms." },
  deals: { title: "No gyms found", desc: "No gyms available yet." },
  all: { title: "No gyms found", desc: "Try adjusting your filters or search." },
};

export const LIST_SUBTEXT = {
  all: "Showing top 5 results",
  nearby: "Top 5 nearest gyms",
  saved: "Your saved gyms (top 5 shown)",
  deals: "Top 5 cheapest monthly plans",
};

export function buildTabs(savedCount) {
  return [
    { key: "all", label: "All Gyms" },
    { key: "nearby", label: "Nearby" },
    { key: "saved", label: `Saved (${savedCount || 0})` },
    { key: "deals", label: "Deals" },
  ];
}

/** ---------- Derived data helpers ---------- */
export function progressPct(done, target) {
  const d = safeNum(done);
  const t = Math.max(1, safeNum(target));
  return Math.round((d / t) * 100);
}

export function buildSupport(publicSettings) {
  const s = publicSettings || {};
  return {
    supportEmail: safeStr(s.support_email || s.contact_email || "support@exersearch.ph"),
    contactEmail: safeStr(s.contact_email || s.support_email || "support@exersearch.ph"),
    contactPhone: safeStr(s.contact_phone || "+63 900 000 0000"),
    facebook: safeStr(s.facebook_url || ""),
    instagram: safeStr(s.instagram_url || ""),
    website: safeStr(s.website_url || ""),
    address: safeStr(s.address || ""),
    tiktok: safeStr(s.tiktok_url || ""),
  };
}

export function buildNearbyList(allGyms, userCoords) {
  const { lat, lng } = userCoords || {};
  const withD = withDistances(allGyms, lat, lng);
  return withD
    .filter((g) => g.distance != null)
    .sort((a, b) => (a.distance ?? 999999) - (b.distance ?? 999999));
}

export function buildDealsList(allGyms) {
  return [...(allGyms || [])]
    .filter((g) => (g.monthlyPrice ?? 0) > 0)
    .sort((a, b) => (a.monthlyPrice ?? 0) - (b.monthlyPrice ?? 0));
}

export function buildSavedList(savedGymCards, allGyms, savedIds) {
  const embedded = savedGymCards || [];
  const byId = (allGyms || []).filter((g) => (savedIds || []).includes(Number(g.id)));

  const merged = [...embedded, ...byId].filter(Boolean);
  const uniq = [];
  const seen = new Set();

  for (const g of merged) {
    const id = Number(g.id);
    if (!Number.isFinite(id)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    uniq.push({ ...g, id });
  }
  return uniq;
}

export function filterGymsTopN(baseList, opts = {}, topN = 5) {
  const {
    priceRange = [0, 999999],
    selectedAmenities = [],
    searchQuery = "",
    sortBy = "match",
    userCoords = { lat: null, lng: null },
  } = opts;

  let list = (baseList || []).filter((gym) => {
    const price = gym.price ?? 0;
    if (price < priceRange[0] || price > priceRange[1]) return false;

    if (selectedAmenities.length > 0) {
      const a = gym.amenities || [];
      if (!selectedAmenities.every((x) => a.includes(x))) return false;
    }

    if (searchQuery) {
      const q = String(searchQuery).toLowerCase();
      const tags = (gym.tags || []).join(" ").toLowerCase();
      const nm = String(gym.name || "").toLowerCase();
      const loc = String(gym.location || "").toLowerCase();
      if (!nm.includes(q) && !loc.includes(q) && !tags.includes(q)) return false;
    }

    return true;
  });

  if (sortBy === "distance") {
    const { lat, lng } = userCoords || {};
    list = withDistances(list, lat, lng);
  }

  return sortGyms(list, sortBy).slice(0, topN);
}
export async function fetchFreeFirstVisitGyms(limit = 6) {
  const res = await axios.get(`${API_BASE}/api/v1/gyms/free-first-visits`, {
    params: { limit },
    withCredentials: true,
  });
  const rows = res.data?.data ?? res.data ?? [];
  return Array.isArray(rows) ? rows : [];
}

export async function fetchUserRecentActivity(token, limit = 5) {
  const res = await axios.get(`${API_BASE}/api/v1/user/activity`, {
    params: { limit },
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    withCredentials: true,
  });
  const rows = res.data?.data ?? res.data ?? [];
  return Array.isArray(rows) ? rows : [];
}

export async function fetchWorkoutGoal(token) {
  const res = await axios.get(`${API_BASE}/api/v1/user/workout-goal`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    withCredentials: true,
  });
  return res.data?.data ?? null;
}