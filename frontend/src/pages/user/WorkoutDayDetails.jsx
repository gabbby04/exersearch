import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { Eye, RefreshCcw, CheckCircle2 } from "lucide-react";
import "./workoutDayDetails.css";
import gymHeroImage from "../../assets/gym-cta-hero.png";
import {
  getUserWorkoutPlanDay,
  updateUserWorkoutPlanDay,
  absoluteUrl,
  getUserSavedGyms,
  recalibrateWorkoutDayGym,
  recalibrateWorkoutPlanGym,
  getGym,
  getWorkoutExerciseReplacementOptions,
  replaceWorkoutExerciseWithChoice,
} from "../../utils/workoutPlanApi";

const FALLBACK_EQUIPMENT_IMG = "https://i.imghippo.com/files/XIsw8670efM.jpg";
const FALLBACK_TUTORIAL_URL = "https://www.youtube.com/@ExerSearch";

function prettyLabel(s = "") {
  return String(s)
    .trim()
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmtReps(item) {
  const min = item?.reps_min;
  const max = item?.reps_max;
  if (!min && !max) return "—";
  if (min && max && Number(min) !== Number(max)) return `${min}–${max}`;
  return `${min || max}`;
}

function imgUrl(u) {
  const s = String(u || "").trim();
  if (!s) return "";
  return absoluteUrl(s);
}

function uniqById(list, idKey) {
  const map = new Map();
  for (const x of list || []) {
    const id = Number(x?.[idKey]);
    if (!id) continue;
    if (!map.has(id)) map.set(id, x);
  }
  return Array.from(map.values());
}

function normalizeEqName(s = "") {
  return String(s)
    .toLowerCase()
    .replace(/[/]/g, " ")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function eqAlias(norm = "") {
  if (!norm) return norm;
  const n = norm;

  if (n.includes("dumbell")) return "dumbbell";
  if (n.includes("free weights") && n.includes("dumb")) return "dumbbell";
  if (n === "free weights") return "dumbbell";
  if (n === "free weights dumbell") return "dumbbell";
  if (n === "free weights dumbbell") return "dumbbell";

  if (n.includes("adjustable bench")) return "bench";
  if (n === "bench") return "bench";

  if (n.includes("assisted pullups") || n.includes("assisted pull-up")) {
    return "assisted pullup machine";
  }

  return n;
}

function isBodyweightEqName(name = "") {
  const n = normalizeEqName(name);
  return n.includes("bodyweight") || n.includes("no equipment");
}

function toEqSet(equipments = []) {
  const set = new Set();
  for (const e of equipments || []) {
    if (isBodyweightEqName(e?.name || "")) continue;
    const nm = eqAlias(normalizeEqName(e?.name || ""));
    if (nm) set.add(nm);
  }
  return set;
}

function getYoutubeVideoId(url = "") {
  const s = String(url || "").trim();
  if (!s) return "";

  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/i,
    /youtu\.be\/([^?&]+)/i,
    /youtube\.com\/embed\/([^?&]+)/i,
    /youtube\.com\/shorts\/([^?&]+)/i,
    /youtube\.com\/live\/([^?&]+)/i,
  ];

  for (const p of patterns) {
    const m = s.match(p);
    if (m?.[1]) return m[1];
  }

  try {
    const u = new URL(s);
    const v = u.searchParams.get("v");
    if (v) return v;
  } catch {
    return "";
  }

  return "";
}

function getYoutubeThumbnail(url = "") {
  const id = getYoutubeVideoId(url);
  if (!id) return "";
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

function isYoutubeUrl(url = "") {
  const s = String(url || "").toLowerCase();
  return s.includes("youtube.com") || s.includes("youtu.be");
}

function getExerciseTutorial(ex) {
  const title = ex?.name ? `${ex.name} Tutorial` : "Exercise Tutorial";

  const rawImg = ex?.tutorial_image || ex?.tutorial_image_url || "";
  const rawVid = String(ex?.tutorial_video_url || "").trim();
  const hasRealVideo = !!getYoutubeVideoId(rawVid);
  const finalVideoUrl = hasRealVideo ? rawVid : FALLBACK_TUTORIAL_URL;

  return {
    title,
    tutorialImageUrl: rawImg ? imgUrl(rawImg) : "",
    youtubeThumbnailUrl: hasRealVideo ? getYoutubeThumbnail(rawVid) : "",
    videoUrl: finalVideoUrl,
    isYoutube: isYoutubeUrl(finalVideoUrl),
    hasRealVideo,
    videoUnavailable: !hasRealVideo,
  };
}

function buildChangeSummary(updatedDay) {
  const notices = Array.isArray(updatedDay?.recalibration_notices)
    ? updatedDay.recalibration_notices
    : [];

  if (notices.length) {
    const changes = [];

    for (const n of notices) {
      if (n?.type === "exercise_replaced") {
        changes.push({
          kind: "replaced",
          slot: prettyLabel(n?.slot_type || "slot"),
          from:
            n?.from_exercise_name || `Exercise #${n?.from_exercise_id || ""}`,
          to: n?.to_exercise_name || `Exercise #${n?.to_exercise_id || ""}`,
          reason: n?.reason || "",
        });
      }

      if (n?.type === "exercise_dropped") {
        changes.push({
          kind: "dropped",
          slot: prettyLabel(n?.slot_type || "slot"),
          from: n?.exercise_name || `Exercise #${n?.exercise_id || ""}`,
          to: "Removed",
          reason:
            n?.reason ||
            "No compatible replacement found. Volume redistributed to remaining exercises.",
          setsLost: Number(n?.sets_lost || 0),
        });
      }
    }

    return changes;
  }

  const changes = [];
  for (const it of updatedDay?.exercises || []) {
    const from = it?.original_exercise?.name;
    const to = it?.exercise?.name;

    if (it?.is_modified && from && to && from !== to) {
      changes.push({
        kind: "replaced",
        slot: prettyLabel(it?.slot_type || "slot"),
        from,
        to,
        reason: "",
      });
    }
  }
  return changes;
}

function countKinds(changes = []) {
  let swapped = 0;
  let removed = 0;
  for (const c of changes) {
    if (c.kind === "replaced") swapped++;
    if (c.kind === "dropped") removed++;
  }
  return { swapped, removed };
}

function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function swalPanel(html) {
  return `<div class="wdp-swal">${html}</div>`;
}

function swalInfoRow(label, value) {
  return `
    <div class="wdp-swal-row">
      ${escapeHtml(label)}:
      <span class="wdp-swal-strong"> ${escapeHtml(value)}</span>
    </div>
  `;
}

function swalNote(text) {
  return `
    <div class="wdp-swal-note">
      <div class="wdp-swal-note-title">Note</div>
      <div class="wdp-swal-note-body">${escapeHtml(text)}</div>
    </div>
  `;
}

function swalBadge(kind) {
  if (kind === "removed") {
    return `<span class="wdp-swal-badge wdp-swal-badge--danger">REMOVED</span>`;
  }
  return `<span class="wdp-swal-badge wdp-swal-badge--success">SWAPPED</span>`;
}

function htmlChangeList(changes, summaryText = "") {
  const safeSummary = summaryText ? swalNote(summaryText) : "";

  if (!changes.length) {
    return `
      ${safeSummary}
      <div class="wdp-swal-block">
        <div class="wdp-swal-heading">No swaps were needed</div>
        <div class="wdp-swal-muted">
          Everything already matches this gym’s equipment.
        </div>
      </div>
    `;
  }

  const rows = changes
    .map((c) => {
      const setsLine =
        c.kind === "dropped" && c.setsLost
          ? `<div class="wdp-swal-row wdp-swal-row--mt">Sets redistributed: <span class="wdp-swal-strong">${c.setsLost}</span></div>`
          : "";

      const reasonLine = c.reason
        ? `<div class="wdp-swal-muted wdp-swal-muted--mt">${escapeHtml(
            c.reason
          )}</div>`
        : "";

      return `
        <div class="wdp-swal-card">
          <div class="wdp-swal-card-title">
            ${escapeHtml(c.slot)} ${swalBadge(c.kind)}
          </div>

          ${swalInfoRow("Was", c.from)}
          ${swalInfoRow("Now", c.to)}

          ${setsLine}
          ${reasonLine}
        </div>
      `;
    })
    .join("");

  return `<div class="wdp-swal-stack">${safeSummary}${rows}</div>`;
}

function weekDigestHtml(notices) {
  const topItems = notices.slice(0, 8).map((n) => {
    if (n?.type === "exercise_replaced") {
      const from =
        n?.from_exercise_name || `Exercise #${n?.from_exercise_id || ""}`;
      const to = n?.to_exercise_name || `Exercise #${n?.to_exercise_id || ""}`;
      const dayName = n?.user_plan_day_id ? `Day #${n.user_plan_day_id}` : "";

      return `
        <div class="wdp-swal-card">
          <div class="wdp-swal-card-title">
            Swapped ${dayName ? `• ${escapeHtml(dayName)}` : ""}
          </div>
          ${swalInfoRow("Was", from)}
          ${swalInfoRow("Now", to)}
        </div>
      `;
    }

    if (n?.type === "exercise_dropped") {
      const exn = n?.exercise_name || `Exercise #${n?.exercise_id || ""}`;
      const sets = Number(n?.sets_lost || 0);
      const dayName = n?.user_plan_day_id ? `Day #${n.user_plan_day_id}` : "";

      return `
        <div class="wdp-swal-card">
          <div class="wdp-swal-card-title">
            Removed ${dayName ? `• ${escapeHtml(dayName)}` : ""}
            ${swalBadge("removed")}
          </div>
          <div class="wdp-swal-muted">${escapeHtml(exn)}</div>
          ${
            sets
              ? `<div class="wdp-swal-row wdp-swal-row--mt">Sets redistributed: <span class="wdp-swal-strong">${sets}</span></div>`
              : ""
          }
          ${
            n?.reason
              ? `<div class="wdp-swal-muted wdp-swal-muted--mt">${escapeHtml(
                  n.reason
                )}</div>`
              : ""
          }
        </div>
      `;
    }

    return "";
  });

  if (!topItems.length || !topItems.join("").trim()) return "";

  return `
    <div class="wdp-swal-section">
      <div class="wdp-swal-heading">Top changes</div>
      <div class="wdp-swal-stack">${topItems.join("")}</div>
      ${
        notices.length > topItems.length
          ? `<div class="wdp-swal-muted wdp-swal-muted--mt">And ${
              notices.length - topItems.length
            } more change(s)…</div>`
          : ""
      }
    </div>
  `;
}

async function fireDarkSwal({
  title,
  html,
  icon = "success",
  confirmButtonText = "OK",
}) {
  await Swal.fire({
    title,
    html: swalPanel(html),
    icon,
    confirmButtonText,
    confirmButtonColor: "#b84221",
    background: "#1a1116",
    color: "#f6efe7",
    customClass: {
      popup: "wdp-swal-popup",
      title: "wdp-swal-title",
      htmlContainer: "wdp-swal-html",
      confirmButton: "wdp-swal-confirm",
    },
  });
}

function formatCompletedAt(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

export default function WorkoutDayDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [day, setDay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [completionLoading, setCompletionLoading] = useState(false);

  const [imgModal, setImgModal] = useState({
    open: false,
    src: "",
    title: "",
    category: "",
    description: "",
  });

  const [tutorialModal, setTutorialModal] = useState({
    open: false,
    title: "",
    tutorialImageUrl: "",
    youtubeThumbnailUrl: "",
    videoUrl: "",
    isYoutube: false,
    hasRealVideo: false,
    videoUnavailable: false,
  });

  const [tutorialZoom, setTutorialZoom] = useState({
    open: false,
    src: "",
    title: "",
  });

  const [savedGyms, setSavedGyms] = useState([]);
  const [gymErr, setGymErr] = useState("");
  const [recalibratingGymId, setRecalibratingGymId] = useState(null);

  const [gymConfirm, setGymConfirm] = useState({
    open: false,
    gym: null,
    hasEquip: [],
    missingEquip: [],
    affected: [],
  });

  const [gymWeekConfirm, setGymWeekConfirm] = useState({
    open: false,
    gym: null,
  });

  const [swapModal, setSwapModal] = useState({
    open: false,
    loading: false,
    submitting: false,
    exerciseRow: null,
    currentExercise: null,
    options: [],
    error: "",
  });

  const closeImgModal = () =>
    setImgModal({
      open: false,
      src: "",
      title: "",
      category: "",
      description: "",
    });

  const closeTutorialModal = () =>
    setTutorialModal({
      open: false,
      title: "",
      tutorialImageUrl: "",
      youtubeThumbnailUrl: "",
      videoUrl: "",
      isYoutube: false,
      hasRealVideo: false,
      videoUnavailable: false,
    });

  const closeTutorialZoom = () =>
    setTutorialZoom({
      open: false,
      src: "",
      title: "",
    });

  const closeGymConfirm = () =>
    setGymConfirm({
      open: false,
      gym: null,
      hasEquip: [],
      missingEquip: [],
      affected: [],
    });

  const closeGymWeekConfirm = () =>
    setGymWeekConfirm({
      open: false,
      gym: null,
    });

  const closeSwapModal = () =>
    setSwapModal({
      open: false,
      loading: false,
      submitting: false,
      exerciseRow: null,
      currentExercise: null,
      options: [],
      error: "",
    });

  async function refreshDay() {
    if (!id) return null;
    const res = await getUserWorkoutPlanDay(id);
    const d = res?.data || null;
    setDay(d);
    return d;
  }

  async function refreshSavedGyms() {
    try {
      const res = await getUserSavedGyms();
      setSavedGyms(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setSavedGyms([]);
    }
  }

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setErr("");
      try {
        const res = await getUserWorkoutPlanDay(id);
        if (!alive) return;
        setDay(res?.data || null);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Failed to load workout day.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    if (id) load();

    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    refreshSavedGyms();
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (imgModal.open) closeImgModal();
        if (tutorialModal.open) closeTutorialModal();
        if (tutorialZoom.open) closeTutorialZoom();
        if (gymConfirm.open) closeGymConfirm();
        if (gymWeekConfirm.open) closeGymWeekConfirm();
        if (swapModal.open) closeSwapModal();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    imgModal.open,
    tutorialModal.open,
    tutorialZoom.open,
    gymConfirm.open,
    gymWeekConfirm.open,
    swapModal.open,
  ]);

  const isRest = !!day?.is_rest || (day?.exercises?.length ?? 0) === 0;
  const isCompleted = !!day?.completed_at;
  const hasSavedGyms = savedGyms?.length > 0;

  function buildDayPreviewAndOpen(fullGym) {
    const gymEquipments = Array.isArray(fullGym?.equipments)
      ? fullGym.equipments
      : [];
    const gymEqSet = toEqSet(gymEquipments);

    const affected = [];
    const neededAll = new Map();

    for (const it of day?.exercises || []) {
      const ex = it?.exercise || {};
      const req = Array.isArray(ex?.equipments) ? ex.equipments : [];
      if (!req.length) continue;

      const neededNorm = [];
      for (const e of req) {
        if (isBodyweightEqName(e?.name || "")) continue;
        const norm = eqAlias(normalizeEqName(e?.name || ""));
        if (!norm) continue;

        neededNorm.push(norm);
        const pretty = prettyLabel(e?.name || norm);
        if (!neededAll.has(norm)) neededAll.set(norm, pretty);
      }

      if (!neededNorm.length) continue;

      const missingForThis = neededNorm.filter((n) => !gymEqSet.has(n));
      if (missingForThis.length) {
        affected.push({
          exerciseName: ex?.name || `Exercise #${it?.exercise_id}`,
          missingEquipNames: missingForThis.map((n) => neededAll.get(n) || n),
          slot: it?.slot_type || "",
        });
      }
    }

    const hasEquip = [];
    const missingEquip = [];
    for (const [, pretty] of neededAll.entries()) {
      const norm = eqAlias(normalizeEqName(pretty));
      if (gymEqSet.has(norm)) hasEquip.push(pretty);
      else missingEquip.push(pretty);
    }
    hasEquip.sort();
    missingEquip.sort();

    setGymConfirm({
      open: true,
      gym: fullGym,
      hasEquip,
      missingEquip,
      affected,
    });
  }

  async function openGymDayModal(gym) {
    if (!gym?.gym_id) return;
    setGymErr("");
    try {
      const res = await getGym(gym.gym_id);
      const fullGym = res?.data || gym;
      buildDayPreviewAndOpen(fullGym);
    } catch (e) {
      setGymErr(e?.message || "Failed to load gym for preview.");
    }
  }

  async function openGymWeekModal(gym) {
    if (!gym?.gym_id) return;
    setGymErr("");
    try {
      const res = await getGym(gym.gym_id);
      const fullGym = res?.data || gym;
      setGymWeekConfirm({ open: true, gym: fullGym });
    } catch (e) {
      setGymErr(e?.message || "Failed to load gym.");
    }
  }

  async function confirmRecalibrateDay() {
    const gym = gymConfirm.gym;
    if (!gym?.gym_id || !id) return;

    setRecalibratingGymId(gym.gym_id);
    setGymErr("");

    try {
      await recalibrateWorkoutDayGym(id, gym.gym_id);

      closeGymConfirm();

      const updatedDay = await refreshDay();
      await refreshSavedGyms();

      const changes = buildChangeSummary(updatedDay);
      const { swapped, removed } = countKinds(changes);
      const summaryText =
        (updatedDay?.recalibration_summary &&
          String(updatedDay.recalibration_summary)) ||
        (removed
          ? `${removed} exercise(s) were removed because no compatible replacement was found. Volume was redistributed.`
          : "");

      await fireDarkSwal({
        title: "Day recalibration complete",
        html: `
          <div class="wdp-swal-row wdp-swal-row--mb">
            Gym: <span class="wdp-swal-strong">${escapeHtml(
              gym?.name || "Selected gym"
            )}</span>
          </div>

          <div class="wdp-swal-row wdp-swal-row--mb">
            Results:
            <span class="wdp-swal-strong">${swapped}</span> swapped •
            <span class="wdp-swal-strong">${removed}</span> removed
          </div>

          ${htmlChangeList(changes, summaryText)}
        `,
        icon: "success",
      });
    } catch (e) {
      setGymErr(e?.message || "Failed to recalibrate day for selected gym.");

      await fireDarkSwal({
        title: "Day recalibration failed",
        html: `<div class="wdp-swal-muted">${escapeHtml(
          e?.message || "Failed to recalibrate day for selected gym."
        )}</div>`,
        icon: "error",
      });
    } finally {
      setRecalibratingGymId(null);
    }
  }

  async function confirmRecalibrateWeek() {
    const gym = gymWeekConfirm.gym;
    const planId = day?.plan?.user_plan_id;

    if (!gym?.gym_id || !planId) return;

    setRecalibratingGymId(gym.gym_id);
    setGymErr("");

    try {
      const res = await recalibrateWorkoutPlanGym(planId, gym.gym_id);
      const planPayload = res?.data || null;

      closeGymWeekConfirm();

      await refreshDay();
      await refreshSavedGyms();

      const notices = Array.isArray(planPayload?.recalibration_notices)
        ? planPayload.recalibration_notices
        : [];

      const swapped = notices.filter((n) => n?.type === "exercise_replaced")
        .length;
      const removed = notices.filter((n) => n?.type === "exercise_dropped")
        .length;

      const summaryText =
        (planPayload?.recalibration_summary &&
          String(planPayload.recalibration_summary)) ||
        (removed
          ? `${removed} exercise(s) were removed because no compatible replacement was found. Volume was redistributed.`
          : "");

      const digestHtml = weekDigestHtml(notices);

      await fireDarkSwal({
        title: "Week recalibration complete",
        html: `
          <div class="wdp-swal-row wdp-swal-row--mb">
            Gym applied to your full 7-day plan:
            <span class="wdp-swal-strong">${escapeHtml(
              gym?.name || "Selected gym"
            )}</span>
          </div>

          <div class="wdp-swal-row wdp-swal-row--mb">
            Results:
            <span class="wdp-swal-strong">${swapped}</span> swapped •
            <span class="wdp-swal-strong">${removed}</span> removed
          </div>

          ${summaryText ? swalNote(summaryText) : ""}

          ${
            digestHtml ||
            `<div class="wdp-swal-muted">
              We checked every day in your plan against this gym’s equipment and swapped unsupported exercises where needed.
            </div>`
          }
        `,
        icon: "success",
      });
    } catch (e) {
      setGymErr(e?.message || "Failed to recalibrate whole week.");

      await fireDarkSwal({
        title: "Week recalibration failed",
        html: `<div class="wdp-swal-muted">${escapeHtml(
          e?.message || "Failed to recalibrate whole week."
        )}</div>`,
        icon: "error",
      });
    } finally {
      setRecalibratingGymId(null);
    }
  }

  async function openSwapModal(it) {
    if (!it?.user_plan_exercise_id) return;

    setSwapModal({
      open: true,
      loading: true,
      submitting: false,
      exerciseRow: it,
      currentExercise: it?.exercise || null,
      options: [],
      error: "",
    });

    try {
      const res = await getWorkoutExerciseReplacementOptions(
        it.user_plan_exercise_id,
        5
      );

      setSwapModal((prev) => ({
        ...prev,
        loading: false,
        options: Array.isArray(res?.options) ? res.options : [],
        currentExercise:
          res?.current_exercise || prev.currentExercise || it?.exercise || null,
      }));
    } catch (e) {
      setSwapModal((prev) => ({
        ...prev,
        loading: false,
        error: e?.message || "Failed to load replacement options.",
      }));
    }
  }

  async function confirmSwapOption(option) {
    const rowId = swapModal?.exerciseRow?.user_plan_exercise_id;
    const newExerciseId = option?.exercise_id;

    if (!rowId || !newExerciseId) return;

    setSwapModal((prev) => ({
      ...prev,
      submitting: true,
      error: "",
    }));

    try {
      const updatedDay = await replaceWorkoutExerciseWithChoice(
        rowId,
        newExerciseId
      );

      const newDay = updatedDay?.data || updatedDay || null;
      if (newDay) {
        setDay(newDay);
      } else {
        await refreshDay();
      }

      const notice = updatedDay?.swap_notice || newDay?.swap_notice || null;

      closeSwapModal();

      await fireDarkSwal({
        title: "Exercise replaced",
        html: `
          ${swalInfoRow(
            "Was",
            notice?.from_exercise_name ||
              swapModal?.currentExercise?.name ||
              "Previous exercise"
          )}

          <div class="wdp-swal-spacer"></div>

          ${swalInfoRow(
            "Now",
            notice?.to_exercise_name || option?.name || "Replacement exercise"
          )}

          ${
            notice?.slot_type
              ? `<div class="wdp-swal-row wdp-swal-row--mt">Slot: <span class="wdp-swal-strong">${escapeHtml(
                  prettyLabel(notice.slot_type)
                )}</span></div>`
              : ""
          }

          ${
            notice?.reason
              ? `<div class="wdp-swal-muted wdp-swal-muted--mt">${escapeHtml(
                  String(notice.reason)
                )}</div>`
              : ""
          }
        `,
        icon: "success",
      });
    } catch (e) {
      setSwapModal((prev) => ({
        ...prev,
        submitting: false,
        error: e?.message || "Failed to replace exercise.",
      }));
    }
  }

  async function toggleCompleted() {
    if (!id || completionLoading) return;

    const nextCompleted = !isCompleted;
    setCompletionLoading(true);

    try {
      const res = await updateUserWorkoutPlanDay(id, {
        mark_completed: nextCompleted,
      });

      const updated = res?.data || null;
      if (updated) {
        setDay(updated);
      } else {
        await refreshDay();
      }

      await fireDarkSwal({
        title: nextCompleted ? "Day marked complete" : "Completion removed",
        html: nextCompleted
          ? `
            <div class="wdp-swal-row">
              ${escapeHtml(day?.weekday_name || "Workout day")} is now
              <span class="wdp-swal-strong">completed</span>.
            </div>
          `
          : `
            <div class="wdp-swal-row">
              Completion status for
              <span class="wdp-swal-strong"> ${escapeHtml(
                day?.weekday_name || "Workout day"
              )}</span>
              was removed.
            </div>
          `,
        icon: "success",
      });
    } catch (e) {
      await fireDarkSwal({
        title: "Update failed",
        html: `<div class="wdp-swal-muted">${escapeHtml(
          e?.message || "Failed to update completion status."
        )}</div>`,
        icon: "error",
      });
    } finally {
      setCompletionLoading(false);
    }
  }

  return (
    <div className="wdp">
      <div className="wdp-headerbar">
        <div className="wdp-container">
          <div className="wdp-header">
            <div className="wdp-header-left">
              <h1 className="wdp-header-title">
                {day?.weekday_name || "Workout Day"}
              </h1>

              <div className="wdp-header-meta">
                {isRest ? (
                  <span className="wdp-header-pill is-rest">Rest</span>
                ) : (
                  <span className="wdp-header-pill">
                    {prettyLabel(day?.focus || "workout")}
                  </span>
                )}

                {isCompleted ? (
                  <span className="wdp-header-pill wdp-header-pill--done">
                    Completed
                  </span>
                ) : null}

                {day?.plan?.start_date ? (
                  <span className="wdp-header-muted">
                    Plan start:{" "}
                    <b>{new Date(day.plan.start_date).toDateString()}</b>
                  </span>
                ) : null}
              </div>
            </div>

            <div className="wdp-header-right">
              <button
                className="wdp-header-btn"
                type="button"
                onClick={() => navigate("/home/workout")}
              >
                ← Back
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="wdp-container wdp-body">
        {loading ? (
          <div className="wdp-card">
            <div className="wdp-loading">Loading…</div>
          </div>
        ) : err ? (
          <div className="wdp-card">
            <div className="wdp-error">{err}</div>
          </div>
        ) : !day ? (
          <div className="wdp-card">
            <div className="wdp-error">No data found.</div>
          </div>
        ) : (
          <>
            {isRest ? (
              <div className="wdp-card">
                <h2 className="wdp-section-title">Rest day</h2>
                <ul className="wdp-rest">
                  <li>Recovery / Mobility</li>
                  <li>Optional walk 20–30 min</li>
                  <li>Hydrate + sleep</li>
                </ul>
              </div>
            ) : (
              <section className="wdp-card">
                <div className="wdp-card-head">
                  <div className="wdp-card-head-title">Exercises</div>
                  <div className="wdp-card-head-tag">
                    {(day.exercises || []).length} items
                  </div>
                </div>

                <div className="wdp-card-body">
                  <div className="wdp-exlist">
                    {(day.exercises || []).map((it) => {
                      const ex = it?.exercise || {};
                      const eqsRaw = Array.isArray(ex?.equipments)
                        ? ex.equipments
                        : [];
                      const eqs = uniqById(eqsRaw, "equipment_id");

                      const tut = getExerciseTutorial(ex);
                      const canShowTut =
                        !!tut.tutorialImageUrl || !!tut.videoUrl;

                      return (
                        <article
                          key={it.user_plan_exercise_id}
                          className="wdp-exitem"
                        >
                          <div className="wdp-exleft">
                            <div className="wdp-exheader">
                              <div className="wdp-exname">
                                {ex?.name || `Exercise #${it.exercise_id}`}
                              </div>

                              <button
                                type="button"
                                className="wdp-exreplace"
                                onClick={() => openSwapModal(it)}
                                disabled={!!recalibratingGymId}
                                title="Replace exercise"
                                aria-label={`Replace ${ex?.name || "exercise"}`}
                              >
                                <RefreshCcw size={16} strokeWidth={2.2} />
                              </button>
                            </div>

                            <div className="wdp-exmeta">
                              <span className="wdp-tag">
                                {prettyLabel(it?.slot_type || "slot")}
                              </span>
                              <span className="wdp-tag">
                                {prettyLabel(ex?.difficulty || "—")}
                              </span>
                              <span className="wdp-tag">
                                {prettyLabel(ex?.primary_muscle || "—")}
                              </span>
                            </div>

                            <div className="wdp-prescription">
                              <div className="wdp-presc">
                                <span className="wdp-presc-label">Sets</span>
                                <span className="wdp-presc-val">
                                  {it?.sets ?? "—"}
                                </span>
                              </div>
                              <div className="wdp-presc">
                                <span className="wdp-presc-label">Reps</span>
                                <span className="wdp-presc-val">
                                  {fmtReps(it)}
                                </span>
                              </div>
                              <div className="wdp-presc">
                                <span className="wdp-presc-label">Rest</span>
                                <span className="wdp-presc-val">
                                  {it?.rest_seconds
                                    ? `${it.rest_seconds}s`
                                    : "—"}
                                </span>
                              </div>
                            </div>

                            {Array.isArray(ex?.instructions) &&
                            ex.instructions.length ? (
                              <div className="wdp-instructions">
                                <div className="wdp-mini-title-row">
                                  <div className="wdp-mini-title">
                                    How to do it
                                  </div>

                                  <button
                                    type="button"
                                    className="wdp-viewicon"
                                    title={
                                      canShowTut
                                        ? "View tutorial"
                                        : "No tutorial yet"
                                    }
                                    onClick={() => {
                                      if (!canShowTut) return;
                                      setTutorialModal({
                                        open: true,
                                        title:
                                          tut.title || ex?.name || "Tutorial",
                                        tutorialImageUrl:
                                          tut.tutorialImageUrl || "",
                                        youtubeThumbnailUrl:
                                          tut.youtubeThumbnailUrl || "",
                                        videoUrl: tut.videoUrl || "",
                                        isYoutube: !!tut.isYoutube,
                                        hasRealVideo: !!tut.hasRealVideo,
                                        videoUnavailable: !!tut.videoUnavailable,
                                      });
                                    }}
                                    disabled={!canShowTut}
                                    aria-disabled={!canShowTut}
                                  >
                                    <Eye size={16} />
                                    <span>View</span>
                                  </button>
                                </div>

                                <ol>
                                  {ex.instructions
                                    .slice(0, 8)
                                    .map((step, idx) => (
                                      <li key={idx}>{String(step)}</li>
                                    ))}
                                </ol>
                              </div>
                            ) : null}
                          </div>

                          <aside className="wdp-exright">
                            <div className="wdp-mini-title">
                              Machines / Equipment
                            </div>

                            {eqs.length ? (
                              <div className="wdp-eqstack">
                                {eqs.map((eq) => {
                                  const title = prettyLabel(
                                    eq?.name || `Equipment #${eq?.equipment_id}`
                                  );
                                  const img = imgUrl(eq?.image_url);

                                  return (
                                    <div
                                      key={eq.equipment_id}
                                      className="wdp-eqcard"
                                    >
                                      <button
                                        type="button"
                                        className="wdp-eqimgbtn"
                                        onClick={() =>
                                          setImgModal({
                                            open: true,
                                            src: img || FALLBACK_EQUIPMENT_IMG,
                                            title,
                                            category: eq?.category
                                              ? prettyLabel(eq.category)
                                              : "",
                                            description: eq?.description
                                              ? String(eq.description)
                                              : "",
                                          })
                                        }
                                        aria-label={`Open image: ${title}`}
                                      >
                                        <div className="wdp-eqimgwrap">
                                          <img
                                            src={img || FALLBACK_EQUIPMENT_IMG}
                                            alt={title}
                                            className="wdp-eqimg"
                                            loading="lazy"
                                            onError={(e) => {
                                              e.currentTarget.src =
                                                FALLBACK_EQUIPMENT_IMG;
                                            }}
                                          />
                                          <span className="wdp-eqzoom">
                                            Zoom
                                          </span>
                                        </div>
                                      </button>

                                      <div className="wdp-eqcontent">
                                        <div className="wdp-eqtitle">
                                          {title}
                                        </div>

                                        {eq?.category ? (
                                          <div className="wdp-eqmeta">
                                            {prettyLabel(eq.category)}
                                          </div>
                                        ) : null}

                                        {eq?.description ? (
                                          <div className="wdp-eqdesc">
                                            {eq.description}
                                          </div>
                                        ) : null}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="wdp-muted">None / bodyweight</div>
                            )}
                          </aside>
                        </article>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            <div className="wdp-gap" />

            <section
              className={`wdp-complete-banner ${
                isCompleted ? "is-completed" : ""
              }`}
            >
              <div className="wdp-complete-left">
                <div className="wdp-complete-icon">
                  <CheckCircle2 size={22} />
                </div>

                <div className="wdp-complete-copy">
                  <div className="wdp-complete-title">
                    {isCompleted
                      ? "Workout completed"
                      : "Mark this day complete"}
                  </div>

                  <div className="wdp-complete-text">
                    {isCompleted
                      ? `Completed at ${
                          formatCompletedAt(day?.completed_at) || "just now"
                        }`
                      : "Tap the button once you finish this day."}
                  </div>
                </div>
              </div>

              <div className="wdp-complete-right">
                <button
                  className={`wdp-complete-btn ${
                    isCompleted ? "is-completed" : ""
                  }`}
                  type="button"
                  onClick={toggleCompleted}
                  disabled={completionLoading}
                >
                  {completionLoading
                    ? "Updating…"
                    : isCompleted
                    ? "Mark as incomplete"
                    : "Mark as completed"}
                </button>
              </div>
            </section>

            {hasSavedGyms ? (
              <>
                <div className="wdp-gap" />

                <section className="wdp-card wdp-gymcard">
                  <div className="wdp-card-head">
                    <div className="wdp-card-head-title">
                      Customize for your gyms. Choose: this day or the whole
                      week.
                    </div>
                    <div className="wdp-card-head-tag">
                      {day?.plan?.gym_id ? "Selected" : "Not set"}
                    </div>
                  </div>

                  <div className="wdp-card-body">
                    {gymErr ? (
                      <div className="wdp-error wdp-mb12">{gymErr}</div>
                    ) : null}

                    <div className="wdp-saved-list">
                      {savedGyms.map((g) => (
                        <div key={g.gym_id} className="wdp-saved-card">
                          <div className="wdp-saved-image">
                            <img
                              src={
                                g?.main_image_url
                                  ? imgUrl(g.main_image_url)
                                  : FALLBACK_EQUIPMENT_IMG
                              }
                              alt={g?.name || "Gym"}
                              onError={(e) => {
                                e.currentTarget.src = FALLBACK_EQUIPMENT_IMG;
                              }}
                            />
                          </div>

                          <div className="wdp-saved-details">
                            <div className="wdp-saved-toprow">
                              <div>
                                <h3 className="wdp-saved-title">{g?.name}</h3>
                                <p className="wdp-saved-location">
                                  {g?.address || ""}
                                </p>
                              </div>

                              {g?.daily_price ? (
                                <div className="wdp-saved-price">
                                  <span className="wdp-price-pill">
                                    ₱{g.daily_price} / day
                                  </span>
                                </div>
                              ) : null}
                            </div>

                            <div className="wdp-saved-meta">
                              {g?.gym_type ? (
                                <span className="wdp-meta-pill">
                                  {prettyLabel(g.gym_type)}
                                </span>
                              ) : null}
                              {g?.is_airconditioned ? (
                                <span className="wdp-meta-pill">
                                  Airconditioned
                                </span>
                              ) : null}
                              {g?.is_24_hours ? (
                                <span className="wdp-meta-pill">24 hours</span>
                              ) : null}
                            </div>

                            <div className="wdp-saved-actions">
                              <button
                                className="wdp-btn-solid"
                                type="button"
                                onClick={() => openGymDayModal(g)}
                                disabled={!!recalibratingGymId}
                              >
                                Recalibrate this day
                              </button>

                              <button
                                className="wdp-btn-outline"
                                type="button"
                                onClick={() => openGymWeekModal(g)}
                                disabled={!!recalibratingGymId}
                              >
                                Recalibrate whole week
                              </button>

                              <button
                                className="wdp-btn-outline"
                                type="button"
                                onClick={() => navigate(`/home/gym/${g.gym_id}`)}
                              >
                                View gym
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </>
            ) : null}
          </>
        )}
      </div>

      {!loading && !err && day ? (
        <div className="wdp-gymhero-full">
          <div className="wdp-gymhero">
            <div className="wdp-gymhero-media">
              <img
                src={gymHeroImage}
                alt="Find a gym that matches your workout plan"
                className="wdp-gymhero-img"
              />
            </div>

            <div className="wdp-gymhero-overlay">
              <div className="wdp-gymhero-copy">
                <div className="wdp-gymhero-kicker">Find the right gym</div>

                <h3 className="wdp-gymhero-title">
                  Match your plan with the right equipment
                </h3>

                <p className="wdp-gymhero-text">
                  Browse gyms near you and quickly switch between finder and
                  search pages.
                </p>

                <div className="wdp-gymhero-actions">
                  <button
                    className="wdp-btn-solid"
                    type="button"
                    onClick={() => navigate("/home/find-gyms")}
                  >
                    Find gyms
                  </button>

                  <button
                    className="wdp-btn-outline wdp-btn-outline--light"
                    type="button"
                    onClick={() => navigate("/home/gyms")}
                  >
                    Search gyms
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {imgModal.open ? (
        <div
          className="wdp-modal-overlay"
          onClick={closeImgModal}
          role="presentation"
        >
          <div
            className="wdp-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Equipment image"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="wdp-modal-head">
              <div className="wdp-modal-title">{imgModal.title}</div>
              <button
                className="wdp-modal-close"
                type="button"
                onClick={closeImgModal}
              >
                ✕
              </button>
            </div>

            {imgModal.category ? (
              <div className="wdp-modal-meta">{imgModal.category}</div>
            ) : null}

            <div className="wdp-modal-imgwrap">
              <img
                className="wdp-modal-img"
                src={imgModal.src || FALLBACK_EQUIPMENT_IMG}
                alt={imgModal.title}
                onError={(e) => {
                  e.currentTarget.src = FALLBACK_EQUIPMENT_IMG;
                }}
              />
            </div>

            {imgModal.description ? (
              <div className="wdp-modal-desc">{imgModal.description}</div>
            ) : null}
          </div>
        </div>
      ) : null}

      {tutorialModal.open ? (
        <div
          className="wdp-modal-overlay"
          onClick={closeTutorialModal}
          role="presentation"
        >
          <div
            className="wdp-modal wdp-modal--tutorial"
            role="dialog"
            aria-modal="true"
            aria-label="Exercise tutorial"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="wdp-modal-head">
              <div className="wdp-modal-title">
                {tutorialModal.title || "Tutorial"}
              </div>
              <button
                className="wdp-modal-close"
                type="button"
                onClick={closeTutorialModal}
              >
                ✕
              </button>
            </div>

            <div className="wdp-modal-scroll">
              <div className="wdp-tut-grid">
                <div className="wdp-tut-card">
                  <div className="wdp-tut-card-title">Tutorial Image</div>

                  <button
                    type="button"
                    className="wdp-tut-imagebtn"
                    onClick={() =>
                      setTutorialZoom({
                        open: true,
                        src:
                          tutorialModal.tutorialImageUrl ||
                          FALLBACK_EQUIPMENT_IMG,
                        title: tutorialModal.title || "Tutorial Image",
                      })
                    }
                    aria-label={`Expand ${
                      tutorialModal.title || "tutorial image"
                    }`}
                  >
                    <div className="wdp-tut-imagewrap">
                      <img
                        src={
                          tutorialModal.tutorialImageUrl ||
                          FALLBACK_EQUIPMENT_IMG
                        }
                        alt={`${tutorialModal.title} tutorial`}
                        className="wdp-tut-image"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = FALLBACK_EQUIPMENT_IMG;
                        }}
                      />
                      <span className="wdp-tut-zoom">Click to expand</span>
                    </div>
                  </button>
                </div>

                <div className="wdp-tut-card">
                  <div className="wdp-tut-card-title">YouTube</div>

                  {tutorialModal.hasRealVideo &&
                  tutorialModal.youtubeThumbnailUrl ? (
                    <div className="wdp-tut-imagewrap">
                      <img
                        src={tutorialModal.youtubeThumbnailUrl}
                        alt={`${tutorialModal.title} YouTube thumbnail`}
                        className="wdp-tut-image"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="wdp-tut-unavailable">
                      Video not available yet.
                    </div>
                  )}

                  <div className="wdp-tut-actions">
                    <a
                      href={tutorialModal.videoUrl || FALLBACK_TUTORIAL_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="wdp-btn-solid"
                    >
                      {tutorialModal.hasRealVideo
                        ? "Watch on YouTube"
                        : "Visit ExerSearch YouTube"}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tutorialZoom.open ? (
        <div
          className="wdp-tut-zoom-overlay"
          onClick={closeTutorialZoom}
          role="presentation"
        >
          <div
            className="wdp-tut-zoom-box"
            role="dialog"
            aria-modal="true"
            aria-label={tutorialZoom.title || "Expanded tutorial image"}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="wdp-tut-zoom-close"
              onClick={closeTutorialZoom}
              aria-label="Close expanded tutorial image"
            >
              ✕
            </button>

            <img
              src={tutorialZoom.src || FALLBACK_EQUIPMENT_IMG}
              alt={tutorialZoom.title || "Tutorial"}
              className="wdp-tut-zoom-img"
              onError={(e) => {
                e.currentTarget.src = FALLBACK_EQUIPMENT_IMG;
              }}
            />
          </div>
        </div>
      ) : null}

      {gymConfirm.open ? (
        <div
          className="wdp-modal-overlay"
          onClick={closeGymConfirm}
          role="presentation"
        >
          <div
            className="wdp-modal wdp-modal--wide"
            role="dialog"
            aria-modal="true"
            aria-label="Recalibrate gym confirmation"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="wdp-modal-head wdp-modal-head--orange">
              <div className="wdp-modal-head-left">
                <div className="wdp-modal-title wdp-modal-title--light">
                  Recalibrate this day for
                </div>
                <div className="wdp-modal-sub">{gymConfirm.gym?.name}</div>
              </div>

              <button
                className="wdp-modal-close wdp-modal-close--light"
                type="button"
                onClick={closeGymConfirm}
              >
                ✕
              </button>
            </div>

            <div className="wdp-modal-scroll">
              <div className="wdp-modal-note">
                We’ll customize today’s exercises based on this gym’s available
                equipment.
              </div>

              <div className="wdp-eqcheck">
                <div className="wdp-eqcheck-col">
                  <div className="wdp-mini-title">Has (needed today)</div>
                  {gymConfirm.hasEquip.length ? (
                    <div className="wdp-pillwrap">
                      {gymConfirm.hasEquip.slice(0, 60).map((x, i) => (
                        <span key={i} className="wdp-pill wdp-pill--ok">
                          {x}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="wdp-muted">None matched.</div>
                  )}
                </div>

                <div className="wdp-eqcheck-col">
                  <div className="wdp-mini-title">Missing (needed today)</div>
                  {gymConfirm.missingEquip.length ? (
                    <div className="wdp-pillwrap">
                      {gymConfirm.missingEquip.slice(0, 60).map((x, i) => (
                        <span key={i} className="wdp-pill wdp-pill--bad">
                          {x}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="wdp-muted">None 🎉</div>
                  )}
                </div>
              </div>

              <div className="wdp-mini-title wdp-mt14">
                Exercises likely to change today
              </div>

              {gymConfirm.affected.length ? (
                <div className="wdp-affected">
                  {gymConfirm.affected.slice(0, 40).map((a, i) => (
                    <div key={i} className="wdp-affected-row">
                      <div className="wdp-affected-ex">{a.exerciseName}</div>
                      <div className="wdp-muted wdp-mt4">
                        Missing: {a.missingEquipNames.join(", ")}
                        {a.slot ? ` • Slot: ${prettyLabel(a.slot)}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="wdp-muted">
                  No equipment conflicts detected. Recalibration may still
                  fine-tune options.
                </div>
              )}

              <div className="wdp-modal-actions">
                <button
                  className="wdp-btn-outline"
                  type="button"
                  onClick={closeGymConfirm}
                >
                  Cancel
                </button>

                <button
                  className="wdp-btn-solid"
                  type="button"
                  onClick={confirmRecalibrateDay}
                  disabled={!!recalibratingGymId}
                >
                  {recalibratingGymId
                    ? "Recalibrating…"
                    : "Recalibrate this day"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {gymWeekConfirm.open ? (
        <div
          className="wdp-modal-overlay"
          onClick={closeGymWeekConfirm}
          role="presentation"
        >
          <div
            className="wdp-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Recalibrate whole week confirmation"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="wdp-modal-head wdp-modal-head--orange">
              <div className="wdp-modal-head-left">
                <div className="wdp-modal-title wdp-modal-title--light">
                  Recalibrate whole week for
                </div>
                <div className="wdp-modal-sub">{gymWeekConfirm.gym?.name}</div>
              </div>

              <button
                className="wdp-modal-close wdp-modal-close--light"
                type="button"
                onClick={closeGymWeekConfirm}
              >
                ✕
              </button>
            </div>

            <div className="wdp-modal-scroll">
              <div className="wdp-modal-note">
                This will update your <b>entire 7-day plan</b> to match this
                gym’s available equipment. More exercises may change compared to
                a single day.
              </div>

              <div className="wdp-affected wdp-mt10">
                <div className="wdp-affected-row">
                  <div className="wdp-affected-ex">What will happen</div>
                  <div className="wdp-muted wdp-mt4">
                    • Each day will be checked for unsupported equipment
                    <br />
                    • Unsupported exercises will be swapped to valid
                    alternatives
                    <br />
                    • If no alternatives exist, an exercise may be removed and
                    volume redistributed
                  </div>
                </div>
              </div>

              <div className="wdp-modal-actions">
                <button
                  className="wdp-btn-outline"
                  type="button"
                  onClick={closeGymWeekConfirm}
                >
                  Cancel
                </button>

                <button
                  className="wdp-btn-solid"
                  type="button"
                  onClick={confirmRecalibrateWeek}
                  disabled={!!recalibratingGymId}
                >
                  {recalibratingGymId
                    ? "Recalibrating…"
                    : "Recalibrate whole week"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {swapModal.open ? (
        <div
          className="wdp-modal-overlay"
          onClick={closeSwapModal}
          role="presentation"
        >
          <div
            className="wdp-modal wdp-modal--wide"
            role="dialog"
            aria-modal="true"
            aria-label="Replace exercise"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="wdp-modal-head wdp-modal-head--orange">
              <div className="wdp-modal-head-left">
                <div className="wdp-modal-title wdp-modal-title--light">
                  Replace exercise
                </div>
                <div className="wdp-modal-sub">
                  {swapModal.currentExercise?.name || "Current exercise"}
                </div>
              </div>

              <button
                className="wdp-modal-close wdp-modal-close--light"
                type="button"
                onClick={closeSwapModal}
              >
                ✕
              </button>
            </div>

            <div className="wdp-modal-scroll">
              <div className="wdp-modal-note">
                Choose a replacement for this exercise.
              </div>

              {swapModal.error ? (
                <div className="wdp-error wdp-mb12">{swapModal.error}</div>
              ) : null}

              {swapModal.loading ? (
                <div className="wdp-loading">Loading options…</div>
              ) : swapModal.options.length ? (
                <div className="wdp-affected">
                  {swapModal.options.map((opt) => (
                    <div
                      key={opt.exercise_id}
                      className="wdp-affected-row wdp-mb12"
                    >
                      <div className="wdp-affected-ex">{opt.name}</div>

                      <div className="wdp-exmeta wdp-mt8">
                        <span className="wdp-tag">
                          {prettyLabel(opt?.difficulty || "—")}
                        </span>
                        <span className="wdp-tag">
                          {prettyLabel(opt?.primary_muscle || "—")}
                        </span>
                        {opt?.equipment ? (
                          <span className="wdp-tag">
                            {prettyLabel(opt.equipment)}
                          </span>
                        ) : null}
                      </div>

                      {Array.isArray(opt?.equipments) && opt.equipments.length ? (
                        <div className="wdp-pillwrap wdp-mt10">
                          {opt.equipments.map((eq) => (
                            <span
                              key={`${opt.exercise_id}-${eq.equipment_id}`}
                              className="wdp-pill wdp-pill--ok"
                            >
                              {prettyLabel(eq?.name || "")}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="wdp-muted wdp-mt8">
                          None / bodyweight
                        </div>
                      )}

                      <div className="wdp-saved-actions wdp-mt12">
                        <button
                          className="wdp-btn-solid"
                          type="button"
                          onClick={() => confirmSwapOption(opt)}
                          disabled={swapModal.submitting}
                        >
                          {swapModal.submitting
                            ? "Replacing…"
                            : "Use this exercise"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="wdp-muted">
                  No replacement options available for this exercise.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}