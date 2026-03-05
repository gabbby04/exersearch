// src/pages/user/Home.jsx
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import "./UserHome.css";
import fallbackLogo from "../../assets/exersearchlogo.png";
import { useAuth } from "../../authcon";

import {
  MapPin,
  Star,
  Heart,
  TrendingUp,
  Clock,
  Users,
  Navigation,
  X,
  ChevronRight,
  Target,
  Search,
  ArrowRight,
  Eye,
  Flame,
  Award,
  Activity,
  Bell,
  SlidersHorizontal,
  Check,
  Sparkles,
  Dumbbell,
  Trophy,
  BarChart2,
  RefreshCw,
  Bookmark,
  Tag,
  ShieldCheck,
  Wifi,
  Droplets,
  Wind,
  Coffee,
  Plus,
  Calendar,
  UtensilsCrossed,
  Minus,
  MessageSquare,
  HelpCircle,
  BookOpen,
  Phone,
  Mail,
  Instagram,
  Facebook,
  Twitter,
  ChevronDown,
  Gift,
  UserCircle,
  LogOut,
  MessageCircle,
  Settings,
  Crown,
} from "lucide-react";

import {
  TOKEN_KEY,
  FALLBACK_AVATAR,
  safeStr,
  initials,
  toAbsUrl,
  fetchMe,
  fetchPublicSettings,
  fetchGyms,
  fetchUserProfile,
  fetchSavedGyms,
  fetchLatestReviews,
  fetchRatingsSummary,
  mergeRatingsIntoGyms,
  mapGymRowToCard,
  withDistances,
  sortGyms,
  extractSavedGymIds,
  extractSavedGymRows,
  fetchFreeFirstVisitGyms,
  fetchUserRecentActivity,
  fetchWorkoutGoal,
} from "../../utils/userHomeApi";

import { api } from "../../utils/apiClient";
import HomeHeader from "./HomeHeader";

const UI_MODE_KEY = "ui_mode";
const ROLE_LEVEL = { user: 1, owner: 2, superadmin: 3 };

const SAVED_GYMS_INDEX = "/user/saved-gyms";
const SAVED_GYMS_STORE = "/user/saved-gyms";
const SAVED_GYMS_DELETE = (gymId) => `/user/saved-gyms/${gymId}`;

const SESSION_KEY = "exersearch_session_id";
function getSessionId() {
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = crypto?.randomUUID?.() || `sess_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function roleLevel(role) {
  return ROLE_LEVEL[role] ?? 0;
}
function hasAtLeastRole(role, required) {
  return roleLevel(role) >= roleLevel(required);
}
function allowedUiModesForRole(role) {
  const lvl = roleLevel(role);
  const modes = [];
  if (lvl >= ROLE_LEVEL.owner) modes.push("owner");
  if (lvl >= ROLE_LEVEL.superadmin) modes.push("superadmin");
  return modes;
}
function routeForUiMode(mode) {
  if (mode === "owner") return "/owner/home";
  if (mode === "superadmin") return "/admin/dashboard";
  return "/home";
}
function labelForUiMode(mode) {
  if (mode === "owner") return "Owner UI";
  if (mode === "superadmin") return "Superadmin UI";
  return "";
}

function fmtTimeAgoLite(iso) {
  if (!iso) return "Recently";
  const t = new Date(String(iso)).getTime();
  if (Number.isNaN(t)) return "Recently";
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

function activityLabel(ev) {
  const e = String(ev || "").toLowerCase();
  if (e === "view") return "Viewed details";
  if (e === "click") return "Clicked a gym";
  if (e === "save") return "Saved to favorites";
  if (e === "unsave") return "Removed from favorites";
  if (e === "contact") return "Contacted gym";
  if (e === "visit") return "Visited a gym";
  if (e === "subscribe") return "Subscribed";
  return "Activity";
}

function activityIcon(ev) {
  const e = String(ev || "").toLowerCase();
  if (e === "view") return Eye;
  if (e === "click") return Target;
  if (e === "save") return Heart;
  if (e === "unsave") return Heart;
  if (e === "contact") return Phone;
  if (e === "visit") return MapPin;
  if (e === "subscribe") return Crown;
  return Activity;
}

function activityColor(ev) {
  const e = String(ev || "").toLowerCase();
  if (e === "view") return "#3b82f6";
  if (e === "click") return "#f59e0b";
  if (e === "save") return "#ef4444";
  if (e === "unsave") return "#ef4444";
  if (e === "contact") return "#10b981";
  if (e === "visit") return "#8b5cf6";
  if (e === "subscribe") return "#d23f0b";
  return "#64748b";
}

function membershipCountFromUser(u) {
  if (!u) return 0;

  const direct =
    u?.membership_count ??
    u?.memberships_count ??
    u?.membershipCount ??
    u?.membershipsCount ??
    u?.user_profile?.membership_count ??
    u?.userProfile?.membership_count ??
    u?.user_profile?.memberships_count ??
    u?.userProfile?.memberships_count ??
    u?.subscription_count ??
    u?.subscriptions_count ??
    u?.subscriptionsCount ??
    u?.subscriptionCount;

  if (Number.isFinite(Number(direct))) return Number(direct);

  const arr =
    u?.memberships ||
    u?.user_profile?.memberships ||
    u?.userProfile?.memberships ||
    u?.subscriptions ||
    u?.user_profile?.subscriptions ||
    u?.userProfile?.subscriptions;

  if (Array.isArray(arr)) return arr.length;

  return 0;
}

export default function Home() {
  const [selectedView, setSelectedView] = useState("all");
  const [showFilterModal, setShowFilterModal] = useState(false);

  const [priceRange, setPriceRange] = useState([0, 500]);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("match");
  const [openFaq, setOpenFaq] = useState(null);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const token = localStorage.getItem(TOKEN_KEY);
  const [me, setMe] = useState(null);
  const [meLoading, setMeLoading] = useState(false);

  const effectiveUser = user || me;

  const [publicSettings, setPublicSettings] = useState(null);
  const [userLogoUrl, setUserLogoUrl] = useState("");

  const [allGyms, setAllGyms] = useState([]);
  const [savedIds, setSavedIds] = useState([]);
  const [savedGymCards, setSavedGymCards] = useState([]);
  const [userCoords, setUserCoords] = useState({ lat: null, lng: null });

  const [topReviews, setTopReviews] = useState([]);
  const [reviewsLoaded, setReviewsLoaded] = useState(false);

  const [mapInitialized, setMapInitialized] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  const [recentActivity, setRecentActivity] = useState([]);
  const [activityLoaded, setActivityLoaded] = useState(false);

  const [freeVisitGyms, setFreeVisitGyms] = useState([]);
  const [freeVisitLoaded, setFreeVisitLoaded] = useState(false);

  const [goal, setGoal] = useState(null);
  const [goalLoaded, setGoalLoaded] = useState(false);

  const [savingMap, setSavingMap] = useState({});

  const displayName = effectiveUser?.name || (meLoading ? "Loading..." : "User");
  const displayEmail = effectiveUser?.email || "";

  const isOwnerPlus = hasAtLeastRole(effectiveUser?.role, "owner");
  const switchModes = isOwnerPlus ? allowedUiModesForRole(effectiveUser?.role) : [];

  const userName = useMemo(() => {
    const n = safeStr(effectiveUser?.name).trim();
    if (n) return n.split(/\s+/)[0];
    return "there";
  }, [effectiveUser]);

  const exploredCount = useMemo(() => {
    const viewed = (recentActivity || []).filter((a) => String(a?.ev || "").toLowerCase() === "view");
    const uniq = new Set(viewed.map((a) => Number(a?.gymId)).filter((n) => Number.isFinite(n) && n > 0));
    return uniq.size;
  }, [recentActivity]);

  const membershipsCount = useMemo(() => membershipCountFromUser(effectiveUser), [effectiveUser]);

  const userStats = useMemo(
    () => ({
      gymsAvailable: allGyms.length,
      explored: exploredCount,
      savedGyms: savedIds.length,
      memberships: membershipsCount,
    }),
    [allGyms.length, exploredCount, savedIds.length, membershipsCount]
  );

  const [notifications, setNotifications] = useState([
    { id: "n1", icon: Flame, title: "7-day streak!", message: "Keep it going 💪", unread: true },
    { id: "n2", icon: Gift, title: "New deal unlocked", message: "Free day pass available", unread: true },
  ]);

  const amenityIcons = {
    Shower: Droplets,
    Locker: ShieldCheck,
    WiFi: Wifi,
    Parking: MapPin,
    AC: Wind,
    Sauna: Coffee,
  };

  const tabs = useMemo(
    () => [
      { key: "all", icon: MapPin, label: "All Gyms" },
      { key: "nearby", icon: Navigation, label: "Nearby" },
      { key: "saved", icon: Heart, label: `Saved (${savedIds.length})` },
      { key: "deals", icon: Tag, label: "Deals" },
    ],
    [savedIds.length]
  );

  const emptyMsg = {
    saved: { title: "No saved gyms yet", desc: "Tap the heart on any gym to save it here." },
    nearby: { title: "No nearby gyms", desc: "Add your location in your profile to see nearest gyms." },
    deals: { title: "No gyms found", desc: "No gyms available yet." },
    all: { title: "No gyms found", desc: "Try adjusting your filters or search." },
  };

  const listSubtext = useMemo(() => {
    return {
      all: "Showing top 5 results",
      nearby: "Top 5 nearest gyms",
      saved: "Your saved gyms (top 5 shown)",
      deals: "Top 5 cheapest monthly plans",
    };
  }, []);

  const toggleAmenity = (a) =>
    setSelectedAmenities((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]));

  useEffect(() => {
    const q = searchParams.get("q") || "";
    setSearchQuery(q);
  }, [location.search, searchParams]);

  const applySearch = useCallback(
    (value) => {
      const next = String(value || "").trim();
      const params = new URLSearchParams(location.search);
      if (next) params.set("q", next);
      else params.delete("q");
      setSearchParams(params, { replace: true });
    },
    [location.search, setSearchParams]
  );

  useEffect(() => {
    const t = setTimeout(() => applySearch(searchQuery), 250);
    return () => clearTimeout(t);
  }, [searchQuery, applySearch]);

  const onClearSearch = useCallback(() => {
    setSearchQuery("");
    const params = new URLSearchParams(location.search);
    params.delete("q");
    setSearchParams(params, { replace: true });
  }, [location.search, setSearchParams]);

  useEffect(() => {
    let mounted = true;
    async function loadMe() {
      if (!token) return;
      setMeLoading(true);
      try {
        const data = await fetchMe(token);
        if (!mounted) return;
        setMe(data || null);
      } catch (err) {
      } finally {
        if (mounted) setMeLoading(false);
      }
    }
    if (!user && !me && token) loadMe();
    return () => (mounted = false);
  }, [user, me, token]);

  useEffect(() => {
    let mounted = true;
    async function loadSettings() {
      try {
        const data = await fetchPublicSettings();
        if (!mounted) return;
        setPublicSettings(data || {});
        const url = data?.user_logo_url || "";
        setUserLogoUrl(toAbsUrl(url));
      } catch (err) {
        if (!mounted) return;
        setPublicSettings(null);
        setUserLogoUrl("");
      }
    }
    loadSettings();
    return () => (mounted = false);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadProfileCoords() {
      if (!token) return;

      try {
        const prof = await fetchUserProfile(token);
        const lat = prof?.latitude ?? prof?.lat ?? null;
        const lng = prof?.longitude ?? prof?.lng ?? prof?.lon ?? null;

        const fallbackLat = effectiveUser?.user_profile?.latitude ?? effectiveUser?.userProfile?.latitude ?? null;
        const fallbackLng =
          effectiveUser?.user_profile?.longitude ?? effectiveUser?.userProfile?.longitude ?? null;

        const useLat = lat ?? fallbackLat;
        const useLng = lng ?? fallbackLng;

        if (!mounted) return;
        setUserCoords({
          lat: useLat == null ? null : Number(useLat),
          lng: useLng == null ? null : Number(useLng),
        });
      } catch (e) {
        if (!mounted) return;
        setUserCoords({ lat: null, lng: null });
      }
    }

    loadProfileCoords();
    return () => (mounted = false);
  }, [token, effectiveUser]);

  const logInteraction = useCallback(
    async (event, gym, extraMeta = {}) => {
      try {
        const gymId = gym?.gym_id ?? gym?.id ?? gym;
        if (!gymId) return;

        const payload = {
          gym_id: Number(gymId),
          event: String(event),
          source: "home",
          session_id: getSessionId(),
          meta: {
            equipment_match: null,
            amenity_match: null,
            travel_time_min: null,
            budget_penalty: null,
            price: null,
            monthly_price: null,
            distance_km: null,
            match_score: null,
            rating: null,
            reviews: null,
            q: null,
            selected_view: selectedView,
            sort_by: sortBy,
            ...extraMeta,
          },
        };

        await api.post("/gym-interactions", payload);
      } catch (e) {
      }
    },
    [selectedView, sortBy]
  );

  useEffect(() => {
    let mounted = true;

    async function loadGyms() {
      try {
        const rows = await fetchGyms();
        if (!mounted) return;

        const mapped = rows.map(mapGymRowToCard);

        const gymIds = mapped
          .map((g) => Number(g.id))
          .filter((n) => Number.isFinite(n) && n > 0);

        const ratingsMap = token ? await fetchRatingsSummary(token, gymIds) : {};
        const merged = mergeRatingsIntoGyms(mapped, ratingsMap);

        setAllGyms(merged);
      } catch (e) {
        if (!mounted) return;
        setAllGyms([]);
      }
    }

    loadGyms();
    return () => (mounted = false);
  }, [token]);

  const refreshSavedFromBackend = useCallback(async () => {
    if (!token) {
      setSavedIds([]);
      setSavedGymCards([]);
      return;
    }
    try {
      const rows = await fetchSavedGyms(token);
      const embeddedGymRows = extractSavedGymRows(rows);
      const ids = extractSavedGymIds(rows);

      setSavedIds(ids);

      const embeddedCards = embeddedGymRows.map(mapGymRowToCard);

      const gymIds = embeddedCards
        .map((g) => Number(g.id))
        .filter((n) => Number.isFinite(n) && n > 0);

      const ratingsMap = token ? await fetchRatingsSummary(token, gymIds) : {};
      setSavedGymCards(mergeRatingsIntoGyms(embeddedCards, ratingsMap));
    } catch (e) {
      setSavedIds([]);
      setSavedGymCards([]);
    }
  }, [token]);

  useEffect(() => {
    let mounted = true;

    async function loadSaved() {
      if (!token) {
        if (!mounted) return;
        setSavedIds([]);
        setSavedGymCards([]);
        return;
      }
      try {
        const rows = await fetchSavedGyms(token);
        if (!mounted) return;

        const embeddedGymRows = extractSavedGymRows(rows);
        const ids = extractSavedGymIds(rows);

        setSavedIds(ids);

        const embeddedCards = embeddedGymRows.map(mapGymRowToCard);

        const gymIds = embeddedCards
          .map((g) => Number(g.id))
          .filter((n) => Number.isFinite(n) && n > 0);

        const ratingsMap = token ? await fetchRatingsSummary(token, gymIds) : {};
        setSavedGymCards(mergeRatingsIntoGyms(embeddedCards, ratingsMap));
      } catch (e) {
        if (!mounted) return;
        setSavedIds([]);
        setSavedGymCards([]);
      }
    }

    loadSaved();
    return () => (mounted = false);
  }, [token]);

  const toggleSaveGym = useCallback(
    async (gymObj, origin = "card") => {
      const gymId = Number(gymObj?.id ?? gymObj?.gym_id ?? 0);
      if (!gymId) return;

      if (!token) {
        navigate("/login");
        return;
      }

      if (savingMap[gymId]) return;

      const currentlySaved = savedIds.includes(gymId);

      setSavingMap((p) => ({ ...p, [gymId]: true }));

      setSavedIds((prev) => {
        const set = new Set((prev || []).map((x) => Number(x)));
        if (currentlySaved) set.delete(gymId);
        else set.add(gymId);
        return Array.from(set);
      });

      try {
        if (!currentlySaved) {
          await api.post(SAVED_GYMS_STORE, {
            gym_id: gymId,
            source: "home",
            session_id: getSessionId(),
          });
          await logInteraction("save", gymObj, { action: "save_button", origin });
        } else {
          await api.delete(SAVED_GYMS_DELETE(gymId), {
            data: { source: "home", session_id: getSessionId() },
          });
          await logInteraction("unsave", gymObj, { action: "save_button", origin });
        }

        await refreshSavedFromBackend();
      } catch (e) {
        setSavedIds((prev) => {
          const set = new Set((prev || []).map((x) => Number(x)));
          if (currentlySaved) set.add(gymId);
          else set.delete(gymId);
          return Array.from(set);
        });
      } finally {
        setSavingMap((p) => {
          const { [gymId]: _, ...rest } = p;
          return rest;
        });
      }
    },
    [token, navigate, savingMap, savedIds, logInteraction, refreshSavedFromBackend]
  );

  useEffect(() => {
    let mounted = true;

    async function loadReviews() {
      try {
        const rows = await fetchLatestReviews(token, 3);
        if (!mounted) return;

        const mapped = rows.slice(0, 3).map((r, idx) => {
          const gymId = r?.gym?.gym_id ?? r?.gym_id ?? r?.gymId ?? 0;
          const gymName = r?.gym?.name ?? r?.gym_name ?? r?.gymName ?? "Gym";
          const name = r?.user?.name ?? r?.user_name ?? r?.name ?? "Member";
          const stars = Number(r?.stars ?? r?.rating ?? 0) || 0;
          const comment = safeStr(r?.review ?? r?.comment ?? "").trim() || "Great experience.";

          return {
            id: r?.gym_rating_id ?? r?.rating_id ?? r?.id ?? `db-${idx}`,
            user: name,
            gym: gymName,
            gymId: gymId || 1,
            rating: Math.max(1, Math.min(5, stars || 5)),
            comment,
            time: "Recently",
            avatar: initials(name),
          };
        });

        setTopReviews(mapped);
      } catch (e) {
        setTopReviews([]);
      } finally {
        if (mounted) setReviewsLoaded(true);
      }
    }

    loadReviews();
    return () => (mounted = false);
  }, [token]);

  useEffect(() => {
    let mounted = true;

    async function loadActivity() {
      if (!token) {
        if (!mounted) return;
        setRecentActivity([]);
        setActivityLoaded(true);
        return;
      }
      try {
        const rows = await fetchUserRecentActivity(token, 5);
        if (!mounted) return;

        const mapped = rows.map((r, idx) => {
          const ev = r?.event;
          const Icon = activityIcon(ev);
          const color = activityColor(ev);
          return {
            id: `${r?.gym_id || "g"}-${idx}-${r?.created_at || "t"}`,
            gym: safeStr(r?.gym_name || "Gym"),
            gymId: Number(r?.gym_id || 0) || 1,
            ev: String(ev || ""),
            action: activityLabel(ev),
            time: fmtTimeAgoLite(r?.created_at),
            icon: Icon,
            color,
          };
        });

        setRecentActivity(mapped);
      } catch (e) {
        setRecentActivity([]);
      } finally {
        if (mounted) setActivityLoaded(true);
      }
    }

    loadActivity();
    return () => (mounted = false);
  }, [token]);

  useEffect(() => {
    let mounted = true;

    async function loadFreeVisits() {
      try {
        const rows = await fetchFreeFirstVisitGyms(6);
        if (!mounted) return;
        const mapped = rows.map(mapGymRowToCard);
        setFreeVisitGyms(mapped);
      } catch (e) {
        if (!mounted) return;
        setFreeVisitGyms([]);
      } finally {
        if (mounted) setFreeVisitLoaded(true);
      }
    }

    loadFreeVisits();
    return () => (mounted = false);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadGoal() {
      if (!token) {
        if (!mounted) return;
        setGoal(null);
        setGoalLoaded(true);
        return;
      }
      try {
        const data = await fetchWorkoutGoal(token);
        if (!mounted) return;
        setGoal(data || null);
      } catch (e) {
        if (!mounted) return;
        setGoal(null);
      } finally {
        if (mounted) setGoalLoaded(true);
      }
    }

    loadGoal();
    return () => (mounted = false);
  }, [token]);

  const currentUi = useMemo(() => {
    const p = String(location.pathname || "");
    if (p.startsWith("/owner")) return "owner";
    if (p.startsWith("/admin")) return "superadmin";
    return "user";
  }, [location.pathname]);

  const avatarSrc = useMemo(() => {
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
  }, [effectiveUser, currentUi]);

  const handleSwitchUi = useCallback(
    (mode) => {
      localStorage.setItem(UI_MODE_KEY, mode);
      navigate(routeForUiMode(mode));
    },
    [navigate]
  );

  const handleLogout = useCallback(
    (e) => {
      if (e?.preventDefault) e.preventDefault();
      logout();
      navigate("/login", { replace: true });
    },
    [logout, navigate]
  );

  const appLogo = userLogoUrl || fallbackLogo;

  const allList = useMemo(() => allGyms, [allGyms]);

  const nearbyList = useMemo(() => {
    const { lat, lng } = userCoords || {};
    const withD = withDistances(allGyms, lat, lng);
    return withD
      .filter((g) => g.distance != null)
      .sort((a, b) => (a.distance ?? 999999) - (b.distance ?? 999999));
  }, [allGyms, userCoords]);

  const savedList = useMemo(() => {
    const embedded = savedGymCards || [];
    const byId = allGyms.filter((g) => savedIds.includes(Number(g.id)));

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
  }, [savedGymCards, allGyms, savedIds]);

  const dealsList = useMemo(() => {
    return [...allGyms]
      .filter((g) => (g.monthlyPrice ?? 0) > 0)
      .sort((a, b) => (a.monthlyPrice ?? 0) - (b.monthlyPrice ?? 0));
  }, [allGyms]);

  const baseList = useMemo(() => {
    if (selectedView === "nearby") return nearbyList;
    if (selectedView === "saved") return savedList;
    if (selectedView === "deals") return dealsList;
    return allList;
  }, [selectedView, allList, nearbyList, savedList, dealsList]);

  const filteredGyms = useMemo(() => {
    let list = (baseList || []).filter((gym) => {
      if ((gym.price ?? 0) < priceRange[0] || (gym.price ?? 0) > priceRange[1]) return false;

      if (selectedAmenities.length > 0) {
        const a = gym.amenities || [];
        if (!selectedAmenities.every((x) => a.includes(x))) return false;
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
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

    return sortGyms(list, sortBy).slice(0, 5);
  }, [baseList, priceRange, selectedAmenities, searchQuery, sortBy, userCoords]);

  useEffect(() => {
    if (leafletLoaded) return;

    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    css.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
    css.crossOrigin = "";
    document.head.appendChild(css);

    const js = document.createElement("script");
    js.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    js.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
    js.crossOrigin = "";
    js.onload = () => setLeafletLoaded(true);
    document.head.appendChild(js);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [leafletLoaded]);

  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || mapInitialized) return;
    const L = window.L;
    if (!L) return;
    try {
      const map = L.map(mapRef.current, { center: [14.5764, 121.0851], zoom: 14, zoomControl: false });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
        maxZoom: 19,
      }).addTo(map);
      mapInstanceRef.current = map;
      setMapInitialized(true);
    } catch (e) {
    }
  }, [leafletLoaded, mapInitialized]);

  useEffect(() => {
    if (!mapInitialized || !mapInstanceRef.current || !window.L) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    markersRef.current.forEach((m) => {
      try {
        map.removeLayer(m);
      } catch (e) {
      }
    });
    markersRef.current = [];

    if (!filteredGyms.length) return;

    const markers = filteredGyms.map((gym) => {
      const icon = L.divIcon({
        className: "gm-host",
        html:
          '<div class="gm-pin"><div class="gm-pin__bubble"><span>&#8369;' +
          (gym.price ?? 0) +
          "</span></div><div class=\"gm-pin__tip\"></div></div>",
        iconSize: [72, 44],
        iconAnchor: [36, 44],
      });

      const popup =
        '<div class="gm-popup"><img class="gm-popup__img" src="' +
        gym.image +
        '" /><div class="gm-popup__body"><p class="gm-popup__name">' +
        gym.name +
        '</p><p class="gm-popup__loc">&#128205; ' +
        gym.location +
        '</p><div class="gm-popup__row"><span>&#11088; ' +
        (gym.rating ?? 0) +
        '</span><span style="color:#d23f0b;font-weight:800">&#8369;' +
        (gym.price ?? 0) +
        '/day</span></div></div></div>';

      const coords = gym.coordinates || [0, 0];
      const m = L.marker(coords, { icon }).addTo(map).bindPopup(popup, { maxWidth: 220 });

      m.on("click", async () => {
        await logInteraction("click", gym, { action: "map_marker_click" });
        const card = document.getElementById("gym-card-" + gym.id);
        if (card) {
          card.scrollIntoView({ behavior: "smooth", block: "center" });
          card.classList.add("highlight-flash");
          setTimeout(() => card.classList.remove("highlight-flash"), 2000);
        }
      });

      return m;
    });

    markersRef.current = markers;

    try {
      const g = L.featureGroup(markers);
      if (g.getBounds().isValid()) map.fitBounds(g.getBounds().pad(0.2));
    } catch (e) {
    }
  }, [mapInitialized, filteredGyms, logInteraction]);

  useEffect(() => {
    if (!mapInitialized || !mapInstanceRef.current) return;
    const t = setTimeout(() => {
      try {
        mapInstanceRef.current.invalidateSize();
      } catch (e) {
      }
    }, 60);
    return () => clearTimeout(t);
  }, [mapInitialized, showFilterModal]);

  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };
  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  const support = useMemo(() => {
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
  }, [publicSettings]);

  const promos = [
    {
      id: 1,
      badge: "PREMIUM",
      title: "Upgrade to ExerSearch Premium",
      desc: "Unlock exclusive perks, smarter matching, and member-only rewards.",
      cta: "View Premium",
      bg: "linear-gradient(135deg,#1b0a02,#7a1e05,#d23f0b)",
      accent: "#ff6b35",
      link: "/home/premium",
    },
    {
      id: 2,
      badge: "FEATURES",
      title: "Smarter Gym Discovery",
      desc: "Better filters, better recommendations, faster results.",
      cta: "Explore",
      bg: "linear-gradient(135deg,#0a0d2d,#1b2069,#3b4de8)",
      accent: "#6b7ff5",
      link: "/home/find-gyms",
    },
    {
      id: 3,
      badge: "REWARDS",
      title: "Earn Rewards as You Train",
      desc: "Complete goals and collect perks from participating gyms.",
      cta: "Learn More",
      bg: "linear-gradient(135deg,#0a2d18,#0d6e35,#10b981)",
      accent: "#34d399",
      link: "/home/rewards",
    },
  ];

  const [activePromo, setActivePromo] = useState(0);
  const [promoAnimating, setPromoAnimating] = useState(false);
  const [promoDir, setPromoDir] = useState("next");

  const goToPromo = (idx, dir) => {
    if (promoAnimating) return;
    setPromoDir(dir);
    setPromoAnimating(true);
    setTimeout(() => {
      setActivePromo(idx);
      setPromoAnimating(false);
    }, 320);
  };
  const nextPromo = () => goToPromo((activePromo + 1) % promos.length, "next");
  const prevPromo = () => goToPromo((activePromo - 1 + promos.length) % promos.length, "prev");

  useEffect(() => {
    const t = setInterval(() => nextPromo(), 5000);
    return () => clearInterval(t);
  }, [activePromo, promoAnimating]);

  const discoveryTips = [
    { id: 1, icon: Dumbbell, title: "Best Match Gyms", message: "See gyms perfectly matched to your goals", color: "#3b82f6", bg: "#eff6ff", link: "/home/find-gyms" },
    { id: 2, icon: Flame, title: "Workout Plan", message: "Track and follow your weekly training plan", color: "#f97316", bg: "#fff7ed", link: "/home/workout" },
    { id: 3, icon: UtensilsCrossed, title: "Meal Plan", message: "Fuel your training with smart nutrition", color: "#10b981", bg: "#ecfdf5", link: "/home/meal-plan" },
    { id: 4, icon: Heart, title: "Saved Gyms", message: "View gyms you've bookmarked", color: "#ef4444", bg: "#fef2f2", link: "/home/saved-gyms" },
  ];

  const faqs = [
    { id: 1, q: "How does the day pass work?", a: "Day passes let you access any gym for a full 24-hour period. Purchase through the app and show your QR code at the front desk." },
    { id: 2, q: "Can I cancel a gym visit?", a: "Yes, you can cancel up to 2 hours before your scheduled visit for a full refund. Late cancellations may incur a small fee." },
    { id: 3, q: "How accurate is the crowd level?", a: "Crowd levels are updated in real-time based on check-in data from gyms. They reflect current capacity as a percentage of maximum." },
    { id: 4, q: "Can I book multiple gyms in one day?", a: "Absolutely! With a multi-gym membership or individual day passes, you can visit different gyms in the same day." },
  ];

  const goBestMatch = () => {
    setSelectedView("all");
    setSortBy("match");
  };

  const weeklyGoal = useMemo(() => {
    if (!goalLoaded) return { state: "loading", done: 0, target: 0, pct: 0 };
    if (!goal || !goal.has_plan || (goal.target ?? 0) <= 0) return { state: "empty", done: 0, target: 0, pct: 0 };
    return {
      state: "ready",
      done: Number(goal.done || 0),
      target: Number(goal.target || 0),
      pct: Math.max(0, Math.min(100, Number(goal.pct || 0))),
    };
  }, [goal, goalLoaded]);

  return (
    <div className="uhv-app">
      {/* ✅ Header extracted */}
      <HomeHeader
        appLogo={appLogo}
        fallbackLogo={fallbackLogo}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onClearSearch={onClearSearch}
        goBestMatch={goBestMatch}
        notifications={notifications}
        setNotifications={setNotifications}
        avatarSrc={avatarSrc}
        displayName={displayName}
        displayEmail={displayEmail}
        isOwnerPlus={isOwnerPlus}
        switchModes={switchModes}
        labelForUiMode={labelForUiMode}
        handleSwitchUi={handleSwitchUi}
        handleLogout={handleLogout}
      />

      <section className="uhv-hero">
        <div className="uhv-hero__inner">
          <div className="uhv-hero__left">
            <p className="uhv-hero__greet">Good morning, {userName} 👋</p>
            <h1 className="uhv-hero__h1">
              Find Your
              <br />
              <em>Perfect Gym</em>
            </h1>
            <p className="uhv-hero__sub">
              {allGyms.length} gyms available · {savedIds.length} saved
            </p>

            <div className="uhv-hero__stats">
              <div className="uhv-hstat">
                <strong>{userStats.explored}</strong>
                <span>Explored</span>
              </div>
              <div className="uhv-hstat-div" />
              <div className="uhv-hstat">
                <strong>{userStats.savedGyms}</strong>
                <span>Saved</span>
              </div>
              <div className="uhv-hstat-div" />
              <div className="uhv-hstat">
                <strong>{userStats.memberships}</strong>
                <span>Memberships</span>
              </div>
            </div>
          </div>

          <div className="uhv-hero__right">
            <div className="uhv-goal">
              <div className="uhv-goal__top">
                <div>
                  <p className="uhv-goal__label">Weekly Goal</p>

                  {weeklyGoal.state === "loading" ? (
                    <p className="uhv-goal__value">Loading…</p>
                  ) : weeklyGoal.state === "empty" ? (
                    <p className="uhv-goal__value">Set up your workout plan</p>
                  ) : (
                    <p className="uhv-goal__value">
                      {weeklyGoal.done} / {weeklyGoal.target} sessions
                    </p>
                  )}
                </div>
                <div className="uhv-goal__icon">
                  <BarChart2 size={16} />
                </div>
              </div>

              <div className="uhv-goal__track">
                <div className="uhv-goal__fill" style={{ width: (weeklyGoal.pct || 0) + "%" }} />
              </div>

              <p className="uhv-goal__note">
                {weeklyGoal.state === "loading"
                  ? "Fetching progress…"
                  : weeklyGoal.state === "empty"
                  ? "Create a plan to start tracking your weekly goal."
                  : weeklyGoal.pct >= 100
                  ? "Goal complete!"
                  : Math.max(0, weeklyGoal.target - weeklyGoal.done) +
                    " more session" +
                    (Math.max(0, weeklyGoal.target - weeklyGoal.done) !== 1 ? "s" : "") +
                    " to go"}
              </p>
            </div>

            <div className="uhv-promo-wrap">
              <div
                className={"uhv-promo" + (promoAnimating ? " promo-" + promoDir : "")}
                style={{ background: promos[activePromo].bg }}
              >
                <span className="uhv-promo__badge">{promos[activePromo].badge}</span>
                <h3 className="uhv-promo__title">{promos[activePromo].title}</h3>
                <p className="uhv-promo__desc">{promos[activePromo].desc}</p>
                <Link
                  to={promos[activePromo].link}
                  className="uhv-promo__btn"
                  style={{ background: promos[activePromo].accent }}
                >
                  {promos[activePromo].cta} <ArrowRight size={12} />
                </Link>
              </div>

              <div className="uhv-promo__controls">
                <button className="uhv-promo__arrow" onClick={prevPromo}>
                  <ChevronRight size={14} style={{ transform: "rotate(180deg)" }} />
                </button>
                <div className="uhv-promo__dots">
                  {promos.map((_, i) => (
                    <button
                      key={i}
                      className={"uhv-promo__dot" + (i === activePromo ? " active" : "")}
                      onClick={() => goToPromo(i, i > activePromo ? "next" : "prev")}
                    />
                  ))}
                </div>
                <button className="uhv-promo__arrow" onClick={nextPromo}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="uhv-body">
        <div className="uhv-toolbar">
          <div className="uhv-tabs">
            {tabs.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                className={"uhv-tab" + (selectedView === key ? " active" : "")}
                onClick={() => setSelectedView(key)}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>

          <div className="uhv-sort">
            <span className="uhv-sort__label">Sort by:</span>
            {[
              ["match", "Best Match"],
              ["rating", "Rating"],
              ["distance", "Distance"],
              ["price", "Price"],
            ].map(([v, l]) => (
              <button
                key={v}
                className={"uhv-sort-btn" + (sortBy === v ? " active" : "")}
                onClick={() => setSortBy(v)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="uhv-layout">
          <aside className="uhv-aside">
            <div className="uhv-map-card">
              <div className="uhv-map-topbar">
                <span className="uhv-map-count">
                  <MapPin size={11} /> {filteredGyms.length} gyms
                </span>
              </div>
              <div ref={mapRef} className="uhv-map" />
              <div className="uhv-zoom">
                <button className="uhv-zoom__btn" onClick={handleZoomIn}>
                  <Plus size={14} />
                </button>
                <div className="uhv-zoom__divider" />
                <button className="uhv-zoom__btn" onClick={handleZoomOut}>
                  <Minus size={14} />
                </button>
              </div>
            </div>

            <div className="uhv-side-panel">
              <h3 className="uhv-side-panel__title">
                <Sparkles size={14} /> Discovery Tips
              </h3>

              <div className="uhv-tips">
                {discoveryTips.map((tip) => {
                  const Icon = tip.icon;
                  return (
                    <Link key={tip.id} to={tip.link} className="uhv-tip">
                      <div className="uhv-tip__icon" style={{ background: tip.bg, color: tip.color }}>
                        <Icon size={14} />
                      </div>

                      <div className="uhv-tip__body">
                        <strong>{tip.title}</strong>
                        <p>{tip.message}</p>
                      </div>

                      <ArrowRight size={13} className="uhv-tip__arrow" />
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="uhv-side-panel">
              <h3 className="uhv-side-panel__title">
                <Activity size={14} /> Recent Activity
              </h3>

              {!token ? (
                <div className="uhv-activity">
                  <div className="uhv-review-card">Log in to see your activity.</div>
                </div>
              ) : !activityLoaded ? (
                <div className="uhv-activity">
                  <div className="uhv-review-card">Loading activity…</div>
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="uhv-activity">
                  <div className="uhv-review-card">No activity yet — start exploring gyms!</div>
                </div>
              ) : (
                <div className="uhv-activity">
                  {recentActivity.map((a) => {
                    const Icon = a.icon;
                    return (
                      <div key={a.id} className="uhv-activity__item">
                        <div className="uhv-activity__icon" style={{ background: a.color + "20", color: a.color }}>
                          <Icon size={13} />
                        </div>
                        <div className="uhv-activity__body">
                          <Link to={"/home/gym/" + a.gymId} className="uhv-activity__gym">
                            {a.gym}
                          </Link>
                          <p className="uhv-activity__action">{a.action}</p>
                          <span className="uhv-activity__time">{a.time}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          <main className="uhv-list">
            <div className="uhv-list__header">
              <div>
                <h2 className="uhv-list__title">
                  {selectedView === "all" && "All Gyms"}
                  {selectedView === "nearby" && "Gyms Near You"}
                  {selectedView === "saved" && "Saved Gyms"}
                  {selectedView === "deals" && "Best Deals (Monthly)"}
                  <span className="uhv-list__count">{filteredGyms.length}</span>
                </h2>
                <p className="uhv-list__sub">{listSubtext[selectedView]}</p>
              </div>
              {searchQuery && (
                <div className="uhv-search-tag">
                  Results for <strong>&quot;{searchQuery}&quot;</strong>
                  <button onClick={() => setSearchQuery("")}>
                    <X size={11} />
                  </button>
                </div>
              )}
            </div>

            {filteredGyms.length > 0 ? (
              <div className="uhv-cards">
                {filteredGyms.map((gym) => {
                  const gymId = Number(gym.id);
                  const isSaved = savedIds.includes(gymId);
                  const isSaving = !!savingMap[gymId];

                  return (
                    <div key={gym.id} id={"gym-card-" + gym.id} className="uhv-card">
                      <div className="uhv-card__img-col">
                        <img
                          src={gym.image}
                          alt={gym.name}
                          className="uhv-card__img"
                          onClick={async () => {
                            await logInteraction("click", gym, { action: "image_click" });
                          }}
                        />
                        <button
                          className={"uhv-save-btn" + (isSaved ? " saved" : "")}
                          disabled={isSaving}
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            await toggleSaveGym(gym, "image_heart");
                          }}
                        >
                          <Heart size={13} fill={isSaved ? "currentColor" : "none"} />
                        </button>

                        {selectedView === "deals" && (gym.monthlyPrice ?? 0) > 0 && (
                          <div className="uhv-badge-deal">
                            <Tag size={10} /> ₱{Number(gym.monthlyPrice || 0).toLocaleString()}/mo
                          </div>
                        )}

                        {(gym.matchScore ?? 0) >= 85 && (
                          <div className="uhv-badge-trending">
                            <TrendingUp size={10} /> Top Pick
                          </div>
                        )}
                      </div>

                      <div className="uhv-card__content">
                        <div className="uhv-card__top-row">
                          <div className="uhv-card__title-block">
                            <h4
                              className="uhv-card__name"
                              onClick={async () => {
                                await logInteraction("click", gym, { action: "name_click" });
                              }}
                              style={{ cursor: "pointer" }}
                            >
                              {gym.name}
                            </h4>
                            <p className="uhv-card__loc">
                              <MapPin size={11} /> {gym.location} &nbsp;·&nbsp;{" "}
                              <span className="uhv-card__type-label">{gym.type}</span>
                            </p>
                          </div>
                        </div>

                        {gym.tags?.length > 0 && (
                          <div className="uhv-card__tags">
                            {gym.tags.map((t, i) => (
                              <span key={i} className="uhv-card__tag">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="uhv-card__meta-grid">
                          {gym.distance != null && (
                            <div className="uhv-card__meta-item">
                              <Navigation size={12} />
                              {gym.distance}km away
                            </div>
                          )}

                          <div className="uhv-card__meta-item">
                            <Star size={12} fill="#f59e0b" color="#f59e0b" />
                            {Number(gym.rating || 0).toFixed(1)} <em>({gym.reviews || 0})</em>
                          </div>

                          <div className="uhv-card__meta-item">
                            <Award size={12} />
                            {gym.matchScore || 0}% match
                          </div>
                        </div>

                        {gym.amenities?.length > 0 && (
                          <div className="uhv-card__amenities">
                            {gym.amenities.map((a, i) => {
                              const Icon = amenityIcons[a] || ShieldCheck;
                              return (
                                <span key={i} className="uhv-card__amenity">
                                  <Icon size={10} /> {a}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        <div className="uhv-card__footer">
                          <div className="uhv-card__pricing">
                            <span className="uhv-card__price-main">
                              ₱{gym.price}
                              <small>/day</small>
                            </span>
                            <span className="uhv-card__price-month">
                              ₱{Number(gym.monthlyPrice || 0).toLocaleString()}/mo
                            </span>
                          </div>

                          <div className="uhv-card__btns">
                            <button
                              className={"uhv-card__btn-save" + (isSaved ? " saved" : "")}
                              disabled={isSaving}
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                await toggleSaveGym(gym, "footer_button");
                              }}
                            >
                              <Bookmark size={13} />{" "}
                              {isSaving ? "Saving..." : isSaved ? "Saved" : "Save"}
                            </button>

                            <Link
                              to={"/home/gym/" + gym.id}
                              className="uhv-card__btn-view"
                              onClick={async () => {
                                await logInteraction("view", gym, {
                                  action: "view_details",
                                  to: "/home/gym/" + gym.id,
                                });
                              }}
                            >
                              View Details <ChevronRight size={13} />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="uhv-empty">
                <div className="uhv-empty__ico">
                  <Search size={28} />
                </div>
                <h4>{(emptyMsg[selectedView] || emptyMsg.all).title}</h4>
                <p>{(emptyMsg[selectedView] || emptyMsg.all).desc}</p>
                <button
                  className="uhv-empty__btn"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedAmenities([]);
                    setPriceRange([0, 500]);
                    setSelectedView("all");
                    setSortBy("match");
                  }}
                >
                  <RefreshCw size={12} /> Reset Filters
                </button>
              </div>
            )}
          </main>
        </div>

        <section className="uhv-section">
          <div className="uhv-section__hdr">
            <div>
              <h2 className="uhv-section__title">
                <Gift size={18} /> Gyms with Free First Visit
              </h2>
              <p className="uhv-section__sub">Discover gyms that let you train free on your first visit</p>
            </div>

            <Link to="/home/gyms?freeFirstVisit=only" className="uhv-section__link">
              See all <ChevronRight size={14} />
            </Link>
          </div>

          {!freeVisitLoaded ? (
            <div className="uhv-events">
              <div className="uhv-review-card">Loading gyms…</div>
            </div>
          ) : freeVisitGyms.length === 0 ? (
            <div className="uhv-events">
              <div className="uhv-review-card">No free first-time visits available yet.</div>
            </div>
          ) : (
            <div className="uhv-events">
              {freeVisitGyms.slice(0, 3).map((g) => (
                <Link
                  key={g.id}
                  to={"/home/gym/" + g.id}
                  className="uhv-event-card"
                  onClick={async () => {
                    await logInteraction("view", g, {
                      action: "free_visit_card_view",
                      to: "/home/gym/" + g.id,
                    });
                  }}
                >
                  <div
                    className="uhv-event-card__date"
                    style={{ background: "#d23f0b15", borderColor: "#d23f0b30" }}
                  >
                    <span className="uhv-event-card__day-name" style={{ color: "#d23f0b" }}>
                      FREE
                    </span>
                    <span className="uhv-event-card__day-num">1st</span>
                  </div>
                  <div className="uhv-event-card__body">
                    <p className="uhv-event-card__title">{g.name}</p>
                    <p className="uhv-event-card__gym">
                      <MapPin size={10} /> {g.location}
                    </p>
                    <p className="uhv-event-card__meta">
                      <Star size={10} /> {Number(g.rating || 0).toFixed(1)} &nbsp;·&nbsp;{" "}
                      <Tag size={10} /> ₱{Number(g.monthlyPrice || 0).toLocaleString()}/mo
                    </p>
                  </div>
                  <div className="uhv-event-card__cta" style={{ background: "#d23f0b" }}>
                    View
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="uhv-section">
          <div className="uhv-section__hdr">
            <div>
              <h2 className="uhv-section__title">
                <MessageSquare size={18} /> What Members Are Saying
              </h2>
              <p className="uhv-section__sub">Real reviews from verified gym-goers</p>
            </div>
          </div>

          <div className="uhv-reviews">
            {!reviewsLoaded ? (
              <div className="uhv-review-card">Loading reviews...</div>
            ) : topReviews.length === 0 ? (
              <div className="uhv-review-card">No reviews yet.</div>
            ) : (
              topReviews.map((r) => (
                <div key={r.id} className="uhv-review-card">
                  <div className="uhv-review-card__top">
                    <div className="uhv-review-card__avatar">{r.avatar}</div>
                    <div className="uhv-review-card__meta">
                      <p className="uhv-review-card__user">{r.user}</p>
                      <div className="uhv-review-card__stars">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={11}
                            fill={i < r.rating ? "#f59e0b" : "none"}
                            color={i < r.rating ? "#f59e0b" : "#d1d5db"}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="uhv-review-card__time">{r.time}</span>
                  </div>
                  <p className="uhv-review-card__comment">“{r.comment}”</p>
                  <Link
                    to={"/home/gym/" + r.gymId}
                    className="uhv-review-card__gym"
                    onClick={async () => {
                      await logInteraction(
                        "view",
                        { id: r.gymId, name: r.gym },
                        { action: "review_gym_view", to: "/home/gym/" + r.gymId }
                      );
                    }}
                  >
                    <MapPin size={10} /> {r.gym}
                  </Link>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="uhv-section">
          <div className="uhv-section__hdr">
            <div>
              <h2 className="uhv-section__title">
                <HelpCircle size={18} /> Frequently Asked Questions
              </h2>
              <p className="uhv-section__sub">Quick answers to common questions</p>
            </div>
            <Link to="/home/faqs" className="uhv-section__link">
              View All Faqs <ChevronRight size={14} />
            </Link>
          </div>
          <div className="uhv-faqs">
            {faqs.map((faq) => (
              <div key={faq.id} className={"uhv-faq" + (openFaq === faq.id ? " open" : "")}>
                <button className="uhv-faq__q" onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)}>
                  <span>{faq.q}</span>
                  <ChevronDown size={16} className="uhv-faq__chevron" />
                </button>
                <div className="uhv-faq__a">
                  <p>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {!isOwnerPlus && (
          <section className="uhv-cta-banner">
            <div className="uhv-cta-banner__inner">
              <div className="uhv-cta-banner__left">
                <div className="uhv-cta-banner__icon">
                  <Crown size={22} />
                </div>
                <div>
                  <h3 className="uhv-cta-banner__title">Become an Owner on ExerSearch</h3>
                  <p className="uhv-cta-banner__desc">
                    List your gym, manage members, and grow your business with owner tools.
                  </p>
                </div>
              </div>
              <Link to="/home/becomeowner" className="uhv-cta-banner__btn">
                Apply Now <ArrowRight size={14} />
              </Link>
            </div>
          </section>
        )}

        <section className="uhv-section">
          <div className="uhv-section__hdr">
            <div>
              <h2 className="uhv-section__title">
                <Phone size={18} /> Need Help?
              </h2>
              <p className="uhv-section__sub">Our support team is available 7 days a week</p>
              {support.address && (
                <p className="uhv-section__sub" style={{ marginTop: 6 }}>
                  {support.address}
                </p>
              )}
            </div>
          </div>

          <div className="uhv-support-grid">
            <a href={`mailto:${support.supportEmail}`} className="uhv-support-card">
              <div className="uhv-support-card__icon" style={{ background: "#eff6ff", color: "#3b82f6" }}>
                <Mail size={20} />
              </div>
              <div>
                <p className="uhv-support-card__label">Email Us</p>
                <p className="uhv-support-card__val">{support.supportEmail}</p>
              </div>
            </a>

            <a href={`tel:${support.contactPhone}`} className="uhv-support-card">
              <div className="uhv-support-card__icon" style={{ background: "#ecfdf5", color: "#10b981" }}>
                <Phone size={20} />
              </div>
              <div>
                <p className="uhv-support-card__label">Call Us</p>
                <p className="uhv-support-card__val">{support.contactPhone}</p>
              </div>
            </a>

            <Link to="/home/help" className="uhv-support-card">
              <div className="uhv-support-card__icon" style={{ background: "#f5f3ff", color: "#8b5cf6" }}>
                <BookOpen size={20} />
              </div>
              <div>
                <p className="uhv-support-card__label">Help Center</p>
                <p className="uhv-support-card__val">Browse articles &amp; guides</p>
              </div>
            </Link>

            <div className="uhv-support-card uhv-support-card--social">
              <p className="uhv-support-card__label">Follow Us</p>
              <div className="uhv-social-row">
                <a
                  href={support.instagram || "#"}
                  className="uhv-social-btn uhv-social-btn--ig"
                  target={support.instagram ? "_blank" : undefined}
                  rel={support.instagram ? "noreferrer" : undefined}
                >
                  <Instagram size={16} />
                </a>
                <a
                  href={support.facebook || "#"}
                  className="uhv-social-btn uhv-social-btn--fb"
                  target={support.facebook ? "_blank" : undefined}
                  rel={support.facebook ? "noreferrer" : undefined}
                >
                  <Facebook size={16} />
                </a>
                <a href={"#"} className="uhv-social-btn uhv-social-btn--tw">
                  <Twitter size={16} />
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>

      {showFilterModal && (
        <div className="uhv-overlay" onClick={() => setShowFilterModal(false)}>
          <div className="uhv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="uhv-modal__hdr">
              <h3>
                <SlidersHorizontal size={16} /> Filters
              </h3>
              <button onClick={() => setShowFilterModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="uhv-modal__body">
              <div className="uhv-filter-group">
                <label>Price per Day</label>
                <div className="uhv-price-display">
                  ₱{priceRange[0]} — ₱{priceRange[1]}
                </div>
                <div className="uhv-price-row">
                  <input
                    type="number"
                    value={priceRange[0]}
                    onChange={(e) => setPriceRange([+e.target.value, priceRange[1]])}
                    placeholder="Min"
                  />
                  <span>to</span>
                  <input
                    type="number"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], +e.target.value])}
                    placeholder="Max"
                  />
                </div>
              </div>

              <div className="uhv-filter-group">
                <label>Amenities</label>
                <div className="uhv-amenity-grid">
                  {["Shower", "Locker", "WiFi", "Parking", "AC", "Sauna"].map((a) => (
                    <button
                      key={a}
                      className={"uhv-amenity-btn" + (selectedAmenities.includes(a) ? " active" : "")}
                      onClick={() => toggleAmenity(a)}
                    >
                      {selectedAmenities.includes(a) && <Check size={11} />} {a}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="uhv-modal__ftr">
              <button
                className="uhv-modal-reset"
                onClick={() => {
                  setPriceRange([0, 500]);
                  setSelectedAmenities([]);
                }}
              >
                Reset
              </button>
              <button className="uhv-modal-apply" onClick={() => setShowFilterModal(false)}>
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}