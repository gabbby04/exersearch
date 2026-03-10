// src/utils/findGymsData.js
import { api, RAW_API_BASE } from "./apiClient";

// ---------- URL helpers ----------
export function absoluteUrl(url) {
  if (!url) return "";
  if (String(url).startsWith("http")) return url;

  const base = RAW_API_BASE.replace(/\/+$/, "");
  const path = String(url).replace(/^\/+/, "");

  return `${base}/${path}`;
}

// ---------- Fetchers (PUBLIC endpoints) ----------
export async function fetchAmenities() {
  const res = await api.get("/amenities");
  const json = res.data;
  return Array.isArray(json) ? json : json?.data ?? [];
}

export async function fetchEquipments() {
  const res = await api.get("/equipments");
  const json = res.data;
  return Array.isArray(json) ? json : json?.data ?? [];
}

// ---------- Target parsing / normalization ----------
export function parseTargets(target) {
  const raw = String(target || "").trim();
  if (!raw) return [];

  const norm = raw.replace(/[\/|;]+/g, ",");

  return norm
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Map common variants -> canonical label
const MUSCLE_MAP = {
  chest: "Chest",
  pec: "Chest",
  pecs: "Chest",

  back: "Back",
  lats: "Back",
  lat: "Back",
  rhomboids: "Back",
  traps: "Back",

  shoulder: "Shoulders",
  shoulders: "Shoulders",
  delts: "Shoulders",
  "front delts": "Shoulders",
  "side delts": "Shoulders",
  "rear delts": "Shoulders",

  bicep: "Biceps",
  biceps: "Biceps",

  tricep: "Triceps",
  triceps: "Triceps",

  abs: "Abs/Core",
  core: "Abs/Core",
  "lower back": "Abs/Core",

  quads: "Quads",
  quad: "Quads",

  hamstring: "Hamstrings",
  hamstrings: "Hamstrings",

  glute: "Glutes",
  glutes: "Glutes",

  calves: "Calves",
  calf: "Calves",

  hip: "Hips",
  hips: "Hips",

  arms: "Arms",
  arm: "Arms",

  "full body": "Full Body",
  "depends on exercise": "Full Body",
};

export function normalizeMuscleLabel(raw) {
  const k = String(raw || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

  if (!k) return "Other";
  return MUSCLE_MAP[k] || k.replace(/\b\w/g, (m) => m.toUpperCase());
}

// ---------- Category/type helpers ----------
export function isMachine(e) {
  return String(e?.category || "").toLowerCase() === "machine";
}

export function isFreeWeight(e) {
  const c = String(e?.category || "").toLowerCase();
  return c === "free_weight" || c === "free weight";
}

export function isCardio(e) {
  return String(e?.category || "").toLowerCase() === "cardio";
}

export function isAccessory(e) {
  return String(e?.category || "").toLowerCase() === "accessory";
}

export function prettyCategory(cat) {
  const c = String(cat || "").toLowerCase();
  if (!c) return "";

  if (c === "free_weight") return "Free Weight";
  if (c === "machine") return "Machine";
  if (c === "cardio") return "Cardio";
  if (c === "accessory") return "Accessory";

  return c.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

// ---------- Grouping ----------
function pushGrouped(map, label, equipment) {
  if (!map[label]) map[label] = [];
  map[label].push(equipment);
}

function sortGroups(groups) {
  Object.keys(groups).forEach((k) => {
    groups[k].sort((a, b) =>
      String(a?.name || "").localeCompare(String(b?.name || ""))
    );
  });

  const priority = [
    "Chest",
    "Back",
    "Shoulders",
    "Biceps",
    "Triceps",
    "Arms",
    "Abs/Core",
    "Quads",
    "Hamstrings",
    "Glutes",
    "Calves",
    "Hips",
    "Full Body",
    "Other",
  ];

  const keys = Object.keys(groups);

  keys.sort((a, b) => {
    const ia = priority.indexOf(a);
    const ib = priority.indexOf(b);

    if (ia !== -1 || ib !== -1) {
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    }

    return a.localeCompare(b);
  });

  return keys.map((k) => [k, groups[k]]);
}

export function groupEquipmentsByTypeAndMuscle(equipments) {
  const machines = {};
  const freeWeights = {};
  const cardio = {};
  const accessory = {};

  for (const e of equipments || []) {
    const targetsRaw = parseTargets(e?.target_muscle_group);
    const targets = targetsRaw.length ? targetsRaw : ["Other"];
    const labels = [...new Set(targets.map(normalizeMuscleLabel))];

    if (isMachine(e)) {
      labels.forEach((lbl) => pushGrouped(machines, lbl, e));
      continue;
    }

    if (isFreeWeight(e)) {
      labels.forEach((lbl) => pushGrouped(freeWeights, lbl, e));
      continue;
    }

    if (isCardio(e)) {
      labels.forEach((lbl) => pushGrouped(cardio, lbl, e));
      continue;
    }

    if (isAccessory(e)) {
      labels.forEach((lbl) => pushGrouped(accessory, lbl, e));
      continue;
    }

    labels.forEach((lbl) => pushGrouped(accessory, lbl, e));
  }

  return {
    machines: sortGroups(machines),
    freeWeights: sortGroups(freeWeights),
    cardio: sortGroups(cardio),
    accessory: sortGroups(accessory),
  };
}

// ---------- Label resolver ----------
export function labelForSelectedKey(key, amenities, equipments) {
  if (key.startsWith("amenity:")) {
    const id = Number(key.split(":")[1]);
    const a = (amenities || []).find((x) => Number(x.amenity_id) === id);
    return a ? `Amenity: ${a.name}` : key;
  }

  if (key.startsWith("equipment:")) {
    const id = Number(key.split(":")[1]);
    const e = (equipments || []).find((x) => Number(x.equipment_id) === id);
    return e ? `Equipment: ${e.name}` : key;
  }

  if (key.startsWith("budget:")) {
    const val = key.split(":")[1];
    return `Budget: ₱${val}`;
  }

  if (key.startsWith("gymtype:")) {
    return `Gym Type: ${key.slice("gymtype:".length)}`;
  }

  if (key.startsWith("location:")) {
    return `Location: ${key.slice("location:".length)}`;
  }

  return key;
}