// src/utils/ownerHomeUtil.js
import { Eye, Zap, Star, MessageSquare, Activity } from "lucide-react";

export function safeArr(v) {
  if (Array.isArray(v)) return v;
  if (v && Array.isArray(v.data)) return v.data;
  if (v && Array.isArray(v.items)) return v.items;
  if (v && Array.isArray(v.results)) return v.results;
  return [];
}

export function firstName(name) {
  const s = String(name || "").trim();
  return s ? s.split(" ")[0] : "Owner";
}

export function normalizeStatus(s) {
  return String(s || "active").toLowerCase();
}

export function areaLabelFromGym(gym) {
  const s = `${gym.location || ""} ${gym.address || ""} ${gym.city || ""} ${gym.province || ""}`.toLowerCase();
  if (s.includes("pasig")) return "Pasig";
  if (s.includes("manila")) return "Manila";
  if (s.includes("quezon")) return "Quezon City";
  return "your area";
}

export function mapGym(g) {
  const id = g.gym_id ?? g.id;
  const name = g.name ?? g.gym_name ?? "My Gym";
  const location =
    g.location ??
    g.address ??
    [g.barangay, g.city, g.province].filter(Boolean).join(", ") ??
    "—";

  const image =
    g.image_url ??
    g.cover_photo ??
    g.photo_url ??
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80";

  const status = normalizeStatus(g.status);
  const verified = Boolean(g.verified ?? g.is_verified ?? true);

  return { id, name, location, image, status, verified, raw: g };
}

export function timeAgoLike(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function eventToText(ev, gymName) {
  if (ev === "view") return `Someone viewed ${gymName}`;
  if (ev === "click") return `Someone clicked ${gymName}`;
  if (ev === "save") return `Someone saved ${gymName}`;
  if (ev === "review") return `New review on ${gymName}`;
  if (ev === "inquiry") return `New inquiry for ${gymName}`;
  return `${ev} on ${gymName}`;
}

export function eventToIcon(ev) {
  if (ev === "view") return Eye;
  if (ev === "click") return Zap;
  if (ev === "save") return Star;
  if (ev === "review") return Star;
  if (ev === "inquiry") return MessageSquare;
  return Activity;
}

/**
 * Alerts priority: "high" | "medium" | "low"
 * If backend returns analytics.alerts, use it.
 * Otherwise generate lightweight placeholders.
 */
export function computeGymAlerts({ analytics }) {
  const backendAlerts = safeArr(analytics?.alerts);
  if (backendAlerts.length) {
    return backendAlerts
      .map((a) => ({
        text: a.text ?? a.message ?? "Needs attention",
        priority: String(a.priority ?? "low").toLowerCase(),
        count: Number(a.count ?? 0),
        type: a.type ?? "info",
      }))
      .slice(0, 2);
  }

  const views = Number(analytics?.total_views ?? analytics?.views ?? 0);
  const saves = Number(analytics?.total_saves ?? analytics?.saves ?? 0);
  const viewsChange = Number(analytics?.views_change ?? 0);

  const alerts = [];

  if (viewsChange < -10) {
    alerts.push({ text: "Views dropped this week", priority: "high", count: 0, type: "views" });
  }

  if (views < 100) {
    alerts.push({ text: "Add more photos", priority: "low", count: 0, type: "photo" });
  } else if (saves < 10) {
    alerts.push({ text: "Low saves — consider a promo", priority: "medium", count: 0, type: "promo" });
  }

  return alerts.slice(0, 2);
}

/**
 * ✅ Normalizes analytics into consistent keys for the UI.
 * Works with many possible backend shapes.
 */
export function pickAnalyticsMetrics(a) {
  const root = a || {};
  const totals = root?.totals || {};

  const views =
    Number(root?.total_views ?? root?.views ?? totals?.views?.current ?? totals?.views ?? 0) || 0;

  const saves =
    Number(root?.total_saves ?? root?.saves ?? totals?.saves?.current ?? totals?.saves ?? 0) || 0;

  // ✅ inquiries supports multiple naming + totals shape
  const inquiries =
    Number(
      root?.total_inquiries ??
        root?.inquiries ??
        root?.inquiry_count ??
        root?.inquiries_count ??
        totals?.inquiries?.current ??
        totals?.inquiries ??
        0
    ) || 0;

  const views_change = Number(root?.views_change ?? totals?.views?.change ?? 0) || 0;
  const saves_change = Number(root?.saves_change ?? totals?.saves?.change ?? 0) || 0;

  const inquiries_change =
    Number(
      root?.inquiries_change ??
        root?.inquiry_change ??
        totals?.inquiries?.change ??
        0
    ) || 0;

  const members =
    Number(root?.members ?? root?.active_members ?? totals?.active_members?.current ?? 0) || 0;

  const members_change =
    Number(root?.members_change ?? totals?.active_members?.change ?? 0) || 0;

  const rating =
    Number(root?.rating ?? root?.avg_rating ?? totals?.ratings?.verified_avg ?? 0) || 0;

  const rating_change = Number(root?.rating_change ?? 0) || 0;

  return {
    total_views: views,
    total_saves: saves,
    total_inquiries: inquiries,
    views_change,
    saves_change,
    inquiries_change,
    members,
    members_change,
    rating,
    rating_change,
  };
}