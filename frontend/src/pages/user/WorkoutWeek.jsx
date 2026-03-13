// WorkoutWeek.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import * as THREE from "three";
import { gsap } from "gsap";
import "./workoutWeek.css";
import "./../owner/OwnerGymsPage.scss";
import {
  generateUserWorkoutPlan,
  getUserWorkoutPlan,
  getUserPreferences,
  saveUserPreferences,
  getUserPreferredEquipments,
  saveUserPreferredEquipments,
  getEquipments,
} from "../../utils/workoutPlanApi";

const BRAND = "#ff8c00";

const WEEK = [
  { weekday: 1, name: "Monday" },
  { weekday: 2, name: "Tuesday" },
  { weekday: 3, name: "Wednesday" },
  { weekday: 4, name: "Thursday" },
  { weekday: 5, name: "Friday" },
  { weekday: 6, name: "Saturday" },
  { weekday: 7, name: "Sunday" },
];

const GOAL_OPTIONS = ["build_muscle", "lose_fat", "strength", "endurance"];

const MUSCLE_OPTIONS = [
  "quads",
  "chest",
  "back",
  "core",
  "hamstrings",
  "shoulders",
  "triceps",
  "biceps",
  "calves",
  "legs",
  "glutes",
  "cardio",
];

const LAST_PLAN_ID_KEY = "exersearch_last_user_plan_id";

function loadLastPlanId() {
  const v = localStorage.getItem(LAST_PLAN_ID_KEY);
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function saveLastPlanId(id) {
  const n = Number(id);
  if (!Number.isFinite(n) || n <= 0) return;
  localStorage.setItem(LAST_PLAN_ID_KEY, String(n));
}

function clearLastPlanId() {
  localStorage.removeItem(LAST_PLAN_ID_KEY);
}

function prettyLabel(s = "") {
  return String(s)
    .trim()
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function countSets(day) {
  const ex = day?.exercises || [];
  return ex.reduce((sum, e) => sum + (Number(e.sets) || 0), 0);
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function WorkoutWeek() {
  const navigate = useNavigate();
  const location = useLocation();

  const [plan, setPlan] = useState(null);
  const [activePlanId, setActivePlanId] = useState(null);
  const [hasExistingPlan, setHasExistingPlan] = useState(false);

  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [error, setError] = useState("");

  const [enter, setEnter] = useState(false);

  const [showPrefs, setShowPrefs] = useState(false);
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsError, setPrefsError] = useState("");

  const [prefs, setPrefs] = useState({
    goal: "",
    workout_days: 3,
    workout_level: "intermediate",
    session_minutes: 45,
    workout_place: "gym",
    preferred_style: "mixed",
    injuries: [],
  });

  const [equipmentOptions, setEquipmentOptions] = useState([]);
  const [preferredEquipmentIds, setPreferredEquipmentIds] = useState([]);

  const initialLastPlanId = loadLastPlanId();
  const [showLanding, setShowLanding] = useState(!initialLastPlanId);
  const [contentReady, setContentReady] = useState(!!initialLastPlanId);
  const [landingAction, setLandingAction] = useState(null);

  const [transitioningToContent, setTransitioningToContent] = useState(false);

  const mountRef = useRef(null);
  const introRef = useRef(null);
  const pageRevealRef = useRef(null);
  const landingOverlayRef = useRef(null);

  const cameraRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const planeRef = useRef(null);

  const rafRef = useRef(0);
  const timerRef = useRef(0);

  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef({ x: 0, y: -180 });

  const nearStarsRef = useRef(null);
  const farStarsRef = useRef(null);
  const farthestStarsRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setEnter(true), 40);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const last = loadLastPlanId();
    if (last && !activePlanId) {
      setActivePlanId(last);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const weekDays = useMemo(() => {
    const apiDays = plan?.days || [];
    const byWeekday = new Map(apiDays.map((d) => [Number(d.weekday), d]));

    return WEEK.map((w, idx) => {
      const d = byWeekday.get(w.weekday);

      if (!d) {
        return {
          weekday: w.weekday,
          weekday_name: w.name,
          day_number: idx + 1,
          is_rest: true,
          focus: "rest",
          exercises: [],
        };
      }

      return {
        ...d,
        weekday_name: d.weekday_name || w.name,
        day_number: d.day_number ?? idx + 1,
        focus: d.focus || "workout",
        exercises: Array.isArray(d.exercises) ? d.exercises : [],
      };
    });
  }, [plan]);

  const topRow = weekDays.slice(0, 4);
  const bottomRow = weekDays.slice(4, 7);

  async function handleGenerate(overrides = {}) {
    setError("");
    setLoadingGenerate(true);

    try {
      const res = await generateUserWorkoutPlan(overrides);
      const newPlan = res?.data || null;

      if (!newPlan?.user_plan_id) {
        throw new Error("Generate succeeded but plan data is missing.");
      }

      setPlan(newPlan);
      setActivePlanId(newPlan.user_plan_id);
      setHasExistingPlan(true);
      setShowLanding(false);
      setContentReady(true);
      saveLastPlanId(newPlan.user_plan_id);

      console.log("[WorkoutWeek] Generated plan:", newPlan);
    } catch (e) {
      console.error("[WorkoutWeek] Generate error:", e);
      setHasExistingPlan(false);
      setError(e?.response?.data?.message || e?.message || "Failed to generate plan.");
    } finally {
      setLoadingGenerate(false);
    }
  }

  async function handleLoadPlan(id) {
    if (!id) {
      setHasExistingPlan(false);
      setPlan(null);
      return;
    }

    setError("");
    setLoadingPlan(true);

    try {
      const res = await getUserWorkoutPlan(id);
      const loaded = res?.data || null;

      if (!loaded?.user_plan_id) {
        setHasExistingPlan(false);
        setPlan(null);
        clearLastPlanId();
        setActivePlanId(null);
        setShowLanding(true);
        setContentReady(false);
        return;
      }

      setPlan(loaded);
      setHasExistingPlan(true);
      setShowLanding(false);
      setContentReady(true);
      saveLastPlanId(loaded.user_plan_id);

      console.log("[WorkoutWeek] Loaded plan:", loaded);
    } catch (e) {
      console.error("[WorkoutWeek] Load plan error:", e);

      const status = e?.response?.status;

      if (status === 404) {
        clearLastPlanId();
        setActivePlanId(null);
        setHasExistingPlan(false);
        setPlan(null);
        setShowLanding(true);
        setContentReady(false);
        setError("Your previous workout plan was not found. Please build a new one.");
      } else {
        setHasExistingPlan(false);
        setPlan(null);
        setError(
          e?.response?.data?.message || e?.message || "Failed to load workout plan."
        );
      }

      console.warn("[WorkoutWeek] No existing plan found.");
    } finally {
      setLoadingPlan(false);
    }
  }

  useEffect(() => {
    if (activePlanId) handleLoadPlan(activePlanId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlanId]);

  async function openRecalibrate() {
    setShowPrefs(true);
    setPrefsError("");
    setPrefsLoading(true);

    try {
      const [prefRes, prefEqRes, eqRes] = await Promise.all([
        getUserPreferences(),
        getUserPreferredEquipments(),
        getEquipments({ per_page: 2000 }),
      ]);

      const p = prefRes?.data || null;
      const preferredEquipments = prefEqRes?.data || [];

      const eqPayload = eqRes?.data ?? eqRes ?? [];
      const allEquipments = Array.isArray(eqPayload)
        ? eqPayload
        : Array.isArray(eqPayload?.data)
        ? eqPayload.data
        : Array.isArray(eqPayload?.items)
        ? eqPayload.items
        : [];

      setPrefs({
        goal: p?.goal ?? "",
        workout_days: Number(p?.workout_days ?? 3),
        workout_level: p?.workout_level ?? "intermediate",
        session_minutes: Number(p?.session_minutes ?? 45),
        workout_place: p?.workout_place ?? "gym",
        preferred_style: p?.preferred_style ?? "mixed",
        injuries: Array.isArray(p?.injuries) ? p.injuries : [],
      });

      setPreferredEquipmentIds(
        (preferredEquipments || [])
          .map((e) => Number(e?.equipment_id))
          .filter(Boolean)
      );

      setEquipmentOptions(allEquipments);
    } catch (e) {
      console.error("[WorkoutWeek] Pref load error:", e);
      setPrefsError(
        e?.response?.data?.message || e?.message || "Failed to load preferences."
      );
    } finally {
      setPrefsLoading(false);
    }
  }

  async function saveAndRecalibrate() {
    setPrefsError("");
    setPrefsSaving(true);

    try {
      await saveUserPreferences({
        goal: prefs.goal || null,
        workout_days: Number(prefs.workout_days),
        workout_level: prefs.workout_level,
        session_minutes: Number(prefs.session_minutes),
        workout_place: prefs.workout_place,
        preferred_style: prefs.preferred_style || null,
        injuries: prefs.injuries || [],
      });

      await saveUserPreferredEquipments(
        preferredEquipmentIds.map(Number).filter(Boolean)
      );

      setShowPrefs(false);

      await handleGenerate({
        goal: prefs.goal || undefined,
        workout_days: Number(prefs.workout_days),
        workout_level: prefs.workout_level,
        session_minutes: Number(prefs.session_minutes),
        workout_place: prefs.workout_place,
        preferred_style: prefs.preferred_style || undefined,
        injuries: prefs.injuries || [],
      });
    } catch (e) {
      console.error("[WorkoutWeek] Save+Recalibrate error:", e);
      setPrefsError(
        e?.response?.data?.message || e?.message || "Failed to save preferences."
      );
    } finally {
      setPrefsSaving(false);
    }
  }

  function goToDayDetails(userPlanDayId, dayObj) {
    const id = safeNum(userPlanDayId);
    const path = id ? `/home/workout/day/${id}` : "";

    const clickInfo = {
      clickedAt: new Date().toISOString(),
      from: location.pathname,
      targetIdRaw: userPlanDayId,
      targetIdParsed: id,
      computedPath: path,
      day: {
        weekday: dayObj?.weekday,
        weekday_name: dayObj?.weekday_name,
        day_number: dayObj?.day_number,
        is_rest: dayObj?.is_rest,
        focus: dayObj?.focus,
        hasExercises: (dayObj?.exercises?.length ?? 0) > 0,
      },
    };

    console.log("[WorkoutWeek] View details click:", clickInfo);

    if (!id) {
      setError("This day has no user_plan_day_id yet (cannot open details).");
      return;
    }

    if (activePlanId) saveLastPlanId(activePlanId);

    navigate(path);
  }

  useEffect(() => {
    if (!showLanding) return;

    const mountEl = mountRef.current;
    if (!mountEl) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 50;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setClearColor("#070707", 1.0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;

    mountEl.appendChild(renderer.domElement);

    const topLight = new THREE.DirectionalLight(0xffb14a, 1.1);
    topLight.position.set(0, 1, 1).normalize();
    scene.add(topLight);

    const bottomLight = new THREE.DirectionalLight(0xff6a00, 0.35);
    bottomLight.position.set(1, -1, 1).normalize();
    scene.add(bottomLight);

    const fillA = new THREE.DirectionalLight(0x331100, 0.25);
    fillA.position.set(-1, -0.5, 0.2).normalize();
    scene.add(fillA);

    const fillB = new THREE.DirectionalLight(0x220a00, 0.18);
    fillB.position.set(1, -0.8, 0.1).normalize();
    scene.add(fillB);

    const geometry = new THREE.PlaneGeometry(400, 400, 70, 70);

    if (geometry.vertices) {
      geometry.vertices.forEach((v) => {
        v.x += (Math.random() - 0.5) * 4;
        v.y += (Math.random() - 0.5) * 4;
        v.z += (Math.random() - 0.5) * 4;

        v.dx = Math.random() - 0.5;
        v.dy = Math.random() - 0.5;
        v.randomDelay = Math.random() * 5;
      });
    }

    const TOP = { r: 255, g: 168, b: 60 };
    const MID = { r: 255, g: 106, b: 0 };
    const BOT = { r: 0, g: 0, b: 0 };

    const clamp01 = (n) => Math.max(0, Math.min(1, n));
    const lerp = (a, b, t) => a + (b - a) * t;

    const yMin = -200;
    const yMax = 200;

    const colorAtT = (t) => {
      if (t < 0.55) {
        const tt = t / 0.55;
        return {
          r: Math.round(lerp(BOT.r, MID.r, tt)),
          g: Math.round(lerp(BOT.g, MID.g, tt)),
          b: Math.round(lerp(BOT.b, MID.b, tt)),
        };
      }
      const tt = (t - 0.55) / 0.45;
      return {
        r: Math.round(lerp(MID.r, TOP.r, tt)),
        g: Math.round(lerp(MID.g, TOP.g, tt)),
        b: Math.round(lerp(MID.b, TOP.b, tt)),
      };
    };

    const faceCenterY = (face) => {
      const a = geometry.vertices[face.a];
      const b = geometry.vertices[face.b];
      const c = geometry.vertices[face.c];
      return (a.y + b.y + c.y) / 3;
    };

    if (geometry.faces) {
      for (let i = 0; i < geometry.faces.length; i++) {
        const face = geometry.faces[i];
        const cy = faceCenterY(face);

        const tLinear = (cy - yMin) / (yMax - yMin);
        const t = clamp01(Math.pow(tLinear, 2.6));
        const c = colorAtT(t);
        face.color.setStyle(`rgb(${c.r},${c.g},${c.b})`);
        face.baseColor = { ...c };
      }
    }

    const material = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      vertexColors: THREE.FaceColors,
      flatShading: true,
      shininess: 12,
    });

    const plane = new THREE.Mesh(geometry, material);
    planeRef.current = plane;
    plane.position.y = 40;
    plane.rotation.x = -0.12;
    scene.add(plane);

    function createStars(amount, yDistance, color = "#ff8c1a") {
      const starGeometry = new THREE.Geometry();

      const starMaterial = new THREE.PointsMaterial({
        color,
        opacity: 0.7,
        transparent: true,
        size: 2.2,
        sizeAttenuation: true,
      });

      for (let i = 0; i < amount; i++) {
        const vertex = new THREE.Vector3();
        vertex.z = (Math.random() - 0.5) * 1500;
        vertex.y = yDistance;
        vertex.x = (Math.random() - 0.5) * 1500;
        starGeometry.vertices.push(vertex);
      }

      return new THREE.Points(starGeometry, starMaterial);
    }

    const farthestStars = createStars(900, 420, "#ff6a00");
    const farStars = createStars(900, 370, "#ff8c1a");
    const nearStars = createStars(900, 290, "#ffb14a");

    farStars.rotation.x = 0.25;
    nearStars.rotation.x = 0.25;

    farthestStarsRef.current = farthestStars;
    farStarsRef.current = farStars;
    nearStarsRef.current = nearStars;

    scene.add(farthestStars);
    scene.add(farStars);
    scene.add(nearStars);

    const renderLoop = () => {
      rafRef.current = requestAnimationFrame(renderLoop);

      timerRef.current += 0.01;
      const t = timerRef.current;

      const verts = plane.geometry.vertices || [];
      for (let i = 0; i < verts.length; i++) {
        verts[i].x -= (Math.sin(t + verts[i].randomDelay) / 40) * verts[i].dx;
        verts[i].y += (Math.sin(t + verts[i].randomDelay) / 40) * verts[i].dy;
      }

      const raycaster = raycasterRef.current;
      const normalizedMouse = mouseRef.current;

      raycaster.setFromCamera(normalizedMouse, camera);
      const intersects = raycaster.intersectObjects([plane]);

      if (intersects.length > 0 && plane.geometry.faces) {
        plane.geometry.faces.forEach((face) => {
          const base = face.baseColor || { r: 0, g: 0, b: 0 };

          face.color.r *= 255;
          face.color.g *= 255;
          face.color.b *= 255;

          face.color.r += (base.r - face.color.r) * 0.02;
          face.color.g += (base.g - face.color.g) * 0.02;
          face.color.b += (base.b - face.color.b) * 0.02;

          face.color.setStyle(
            `rgb(${Math.floor(face.color.r)},${Math.floor(face.color.g)},${Math.floor(
              face.color.b
            )})`
          );
        });

        intersects[0].face.color.setStyle("#ffb14a");
        plane.geometry.colorsNeedUpdate = true;
      }

      plane.geometry.verticesNeedUpdate = true;
      plane.geometry.elementsNeedUpdate = true;

      farthestStars.rotation.y -= 0.00001;
      farStars.rotation.y -= 0.00005;
      nearStars.rotation.y -= 0.00011;

      renderer.render(scene, camera);
    };

    renderLoop();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const onMouseMove = (event) => {
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMouseMove);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);

      cancelAnimationFrame(rafRef.current);

      try {
        scene.remove(plane);
        plane.geometry.dispose();
        plane.material.dispose();

        [nearStars, farStars, farthestStars].forEach((s) => {
          scene.remove(s);
          s.geometry.dispose();
          s.material.dispose();
        });

        renderer.dispose();
        if (renderer.domElement?.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      } catch {}
    };
  }, [showLanding]);

  const animateIntoContent = async (action = "generate") => {
    if (loadingGenerate || loadingPlan || transitioningToContent) return;

    setLandingAction(action);
    setTransitioningToContent(true);
    setError("");

    const camera = cameraRef.current;
    const plane = planeRef.current;
    const intro = introRef.current;
    const overlay = landingOverlayRef.current;

    const runContentAction = async () => {
      if (action === "generate") {
        await handleGenerate({});
      } else if (action === "view" && activePlanId) {
        await handleLoadPlan(activePlanId);
      }
    };

    if (!camera || !plane || !intro) {
      if (overlay) {
        gsap.set(overlay, { opacity: 1, pointerEvents: "auto" });
      }

      await runContentAction();

      if (action === "generate" || plan || hasExistingPlan || activePlanId) {
        setShowLanding(false);
        setContentReady(true);
      }

      requestAnimationFrame(() => {
        if (pageRevealRef.current) {
          gsap.fromTo(
            pageRevealRef.current,
            { opacity: 0, y: 28, scale: 0.985 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.8,
              ease: "power3.out",
            }
          );
        }

        if (overlay) {
          gsap.to(overlay, {
            opacity: 0,
            duration: 0.6,
            ease: "power2.out",
            onComplete: () => {
              setTransitioningToContent(false);
              setLandingAction(null);
            },
          });
        } else {
          setTransitioningToContent(false);
          setLandingAction(null);
        }
      });

      return;
    }

    if (overlay) {
      gsap.set(overlay, { opacity: 0, pointerEvents: "auto" });
    }

    await new Promise((resolve) => {
      const tl = gsap.timeline({ onComplete: resolve });

      tl.to(intro, { duration: 0.45, opacity: 0, y: -24, ease: "power3.in" }, 0);
      tl.to(camera.rotation, { duration: 2.4, x: Math.PI / 2, ease: "power3.inOut" }, 0);
      tl.to(camera.position, { duration: 2.2, z: 20, ease: "power3.inOut" }, 0);
      tl.to(camera.position, { duration: 2.6, y: 120, ease: "power3.inOut" }, 0);
      tl.to(plane.scale, { duration: 2.4, x: 2, ease: "power3.inOut" }, 0);

      if (overlay) {
        tl.to(
          overlay,
          {
            opacity: 1,
            duration: 0.5,
            ease: "power2.inOut",
          },
          1.75
        );
      }
    });

    await runContentAction();

    if (action === "generate" || plan || hasExistingPlan || activePlanId) {
      setShowLanding(false);
      setContentReady(true);
    }

    requestAnimationFrame(() => {
      if (pageRevealRef.current) {
        gsap.fromTo(
          pageRevealRef.current,
          { opacity: 0, y: 32, scale: 0.985 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.82,
            ease: "power3.out",
          }
        );
      }

      if (overlay) {
        gsap.to(overlay, {
          opacity: 0,
          duration: 0.7,
          ease: "power2.out",
          onComplete: () => {
            setTransitioningToContent(false);
            setLandingAction(null);
          },
        });
      } else {
        setTransitioningToContent(false);
        setLandingAction(null);
      }
    });
  };

  const hasPlan = !!plan;
  const canViewSavedPlan = hasExistingPlan && !!activePlanId;

  return (
    <div
      className={`ww ${enter ? "content-enter-active" : "content-enter"}`}
      style={{ "--brand": BRAND }}
    >
      {showLanding ? (
        <div className="find-gyms-page">
          <div className="star-intro-root">
            <div className="three-mount" ref={mountRef} />

            <div
              ref={landingOverlayRef}
              style={{
                position: "fixed",
                inset: 0,
                background: "#0a0a0a",
                opacity: 0,
                pointerEvents: "none",
                zIndex: 8,
              }}
            />

            <div
              className="intro-container"
              ref={introRef}
              style={{
                zIndex: 10,
                position: "relative",
                marginTop: "-60px",
              }}
            >
              <h2 className="fancy-text">Exersearch</h2>
              <h1>
                BUILD YOUR WORKOUT
                <br />
                PLAN
              </h1>

              <div
                style={{
                  display: "flex",
                  gap: "14px",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <div
                  className="button shift-camera-button"
                  onClick={() => animateIntoContent("generate")}
                >
                  <div className="border">
                    <div className="left-plane" />
                    <div className="right-plane" />
                  </div>
                  <div className="text">
                    {landingAction === "generate" || loadingGenerate
                      ? "Generating..."
                      : "Build Plan"}
                  </div>
                </div>

                {canViewSavedPlan && (
                  <div
                    className="button shift-camera-button"
                    onClick={() => animateIntoContent("view")}
                  >
                    <div className="border">
                      <div className="left-plane" />
                      <div className="right-plane" />
                    </div>
                    <div className="text">
                      {landingAction === "view" || loadingPlan ? "Loading..." : "View Plan"}
                    </div>
                  </div>
                )}
              </div>

              {error ? (
                <div style={{ marginTop: 16, color: "#ffb4a2", fontWeight: 700 }}>
                  {error}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div
          ref={pageRevealRef}
          className="ww-page"
          style={{
            opacity: contentReady ? 1 : 0,
            transform: contentReady ? "translateY(0)" : "translateY(12px)",
          }}
        >
          {loadingPlan && !hasPlan ? (
            <section className="ww-loading-screen">
              <div className="ww-loading-screen-inner">Loading your workout plan...</div>
            </section>
          ) : hasPlan ? (
            <>
              <div className="ww-headerbar">
                <div className="ww-container">
                  <header className="ww-header">
                    <div className="ww-header-left">
                      <h1 className="ww-title">My Weekly Workout Plan</h1>

                      <div className="ww-meta">
                        {loadingPlan && <span className="ww-muted">Loading…</span>}

                        {plan?.template && (
                          <span className="ww-pill">
                            {prettyLabel(plan.template.goal)} •{" "}
                            {prettyLabel(plan.template.split_type)} •{" "}
                            {plan.template.days_per_week} days/week
                          </span>
                        )}

                        {plan?.start_date && (
                          <span className="ww-muted">
                            Start: <b>{new Date(plan.start_date).toDateString()}</b>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="ww-header-right">
                      <button
                        className="ww-btn ww-btn-ghost"
                        onClick={() => handleGenerate({})}
                        disabled={loadingGenerate}
                        type="button"
                        title="Generate a fresh plan"
                      >
                        {loadingGenerate ? "Generating..." : "Regenerate"}
                      </button>

                      <button
                        className="ww-btn"
                        onClick={openRecalibrate}
                        type="button"
                        title="Edit preferences + preferred equipment"
                        style={{ marginLeft: 10 }}
                      >
                        Recalibrate Preferences
                      </button>
                    </div>
                  </header>

                  {error ? <div className="ww-header-error">{error}</div> : null}
                </div>
              </div>

              <div className="ww-container ww-body">
                <section className="ww-grid-wrap">
                  <div className="ww-grid ww-grid-top">
                    {topRow.map((day) => (
                      <DayCard
                        key={day.weekday}
                        day={day}
                        onViewDetails={(userPlanDayId) => goToDayDetails(userPlanDayId, day)}
                      />
                    ))}
                  </div>

                  <div className="ww-grid ww-grid-bottom">
                    {bottomRow.map((day) => (
                      <DayCard
                        key={day.weekday}
                        day={day}
                        onViewDetails={(userPlanDayId) => goToDayDetails(userPlanDayId, day)}
                      />
                    ))}
                  </div>
                </section>

                <footer className="ww-footer"></footer>
              </div>
            </>
          ) : (
            <section className="ww-loading-screen">
              <div className="ww-loading-screen-inner">
                {error || "No saved workout plan found."}
              </div>
            </section>
          )}
        </div>
      )}

      {showPrefs
        ? createPortal(
            <PreferencesModal
              loading={prefsLoading}
              saving={prefsSaving}
              error={prefsError}
              prefs={prefs}
              setPrefs={setPrefs}
              equipmentOptions={equipmentOptions}
              preferredEquipmentIds={preferredEquipmentIds}
              setPreferredEquipmentIds={setPreferredEquipmentIds}
              onClose={() => setShowPrefs(false)}
              onSave={saveAndRecalibrate}
            />,
            document.body
          )
        : null}
    </div>
  );
}

function DayCard({ day, onViewDetails }) {
  const isRest = !!day.is_rest || (day.exercises?.length ?? 0) === 0;
  const focusLabel = prettyLabel(isRest ? "rest" : day.focus);
  const setsTotal = countSets(day);
  const list = (day.exercises || []).slice(0, 6);

  const canView = !!day?.user_plan_day_id && !isRest;

  return (
    <article className={`ww-card ${isRest ? "is-rest" : ""}`}>
      <div className="ww-card-head">
        <div className="ww-card-headbg" />

        <div className="ww-card-top">
          <div className="ww-card-day">{day.weekday_name || "Day"}</div>

          <div className="ww-card-chip">
            <span className="ww-card-chip-num">{day.day_number || day.weekday}</span>
            <span className="ww-card-chip-label">{focusLabel}</span>
          </div>
        </div>
      </div>

      <div className="ww-card-body">
        {isRest ? (
          <ul className="ww-list">
            <li>
              <span>Recovery</span> / Mobility
            </li>
            <li>
              <span>Optional</span> Walk 20–30 min
            </li>
            <li>
              <span>Hydrate</span> + sleep
            </li>
          </ul>
        ) : (
          <ul className="ww-list">
            <li className="ww-list-strong">
              <span>{list.length}</span> Exercises shown
            </li>
            <li className="ww-list-strong">
              <span>{setsTotal}</span> Total Sets
            </li>

            <div className="ww-divider" />

            {list.map((ex) => (
              <li
                key={
                  ex.user_plan_exercise_id ||
                  ex.template_day_exercise_id ||
                  ex.exercise_id
                }
                className="ww-ex"
                title={ex.exercise?.name || ""}
              >
                <span className="ww-ex-sets">{ex.sets}×</span>
                <span className="ww-ex-name">
                  {ex.exercise?.name || `Exercise #${ex.exercise_id}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        className={`ww-btn ww-btn-card ${isRest ? "is-rest" : ""}`}
        type="button"
        disabled={!canView}
        onClick={() => {
          if (!canView) return;
          onViewDetails?.(day.user_plan_day_id);
        }}
      >
        {isRest ? "Rest Day" : "View Details"}
      </button>
    </article>
  );
}

function PreferencesModal({
  loading,
  saving,
  error,
  prefs,
  setPrefs,
  equipmentOptions,
  preferredEquipmentIds,
  setPreferredEquipmentIds,
  onClose,
  onSave,
}) {
  const [injuryPick, setInjuryPick] = useState("");

  function addInjuredMuscle() {
    const t = String(injuryPick || "").trim();
    if (!t) return;

    setPrefs((p) => {
      const cur = Array.isArray(p.injuries) ? p.injuries : [];
      const lower = cur.map((x) => String(x).toLowerCase());
      if (lower.includes(t.toLowerCase())) return p;
      return { ...p, injuries: [...cur, t] };
    });

    setInjuryPick("");
  }

  function removeInjury(tag) {
    setPrefs((p) => ({
      ...p,
      injuries: (p.injuries || []).filter(
        (x) => String(x).toLowerCase() !== String(tag).toLowerCase()
      ),
    }));
  }

  const eqList = Array.isArray(equipmentOptions) ? equipmentOptions : [];

  return (
    <div className="ww-modal-backdrop" onClick={onClose}>
      <div
        className="ww-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="ww-modal-head">
          <div>
            <div className="ww-modal-title">Recalibrate Preferences</div>
            <div className="ww-modal-sub">
              Pick your goal, injured muscles to avoid, equipment, then regenerate.
            </div>
          </div>

          <button className="ww-btn ww-btn-ghost" onClick={onClose} type="button">
            Close
          </button>
        </div>

        {loading ? (
          <div className="ww-modal-loading">Loading…</div>
        ) : (
          <>
            {error ? <div className="ww-modal-error">{error}</div> : null}

            <div className="ww-modal-grid">
              <label className="ww-field">
                <span>Goal</span>
                <select
                  value={prefs.goal || ""}
                  onChange={(e) => setPrefs((p) => ({ ...p, goal: e.target.value }))}
                >
                  <option value="" disabled>
                    Select a goal…
                  </option>
                  {GOAL_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {prettyLabel(g)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="ww-field">
                <span>Days / week</span>
                <input
                  type="number"
                  min="1"
                  max="7"
                  value={prefs.workout_days ?? 3}
                  onChange={(e) =>
                    setPrefs((p) => ({
                      ...p,
                      workout_days: Number(e.target.value),
                    }))
                  }
                />
              </label>

              <label className="ww-field">
                <span>Level</span>
                <select
                  value={prefs.workout_level || "intermediate"}
                  onChange={(e) =>
                    setPrefs((p) => ({ ...p, workout_level: e.target.value }))
                  }
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </label>

              <label className="ww-field">
                <span>Session minutes</span>
                <input
                  type="number"
                  min="10"
                  max="240"
                  value={prefs.session_minutes ?? 45}
                  onChange={(e) =>
                    setPrefs((p) => ({
                      ...p,
                      session_minutes: Number(e.target.value),
                    }))
                  }
                />
              </label>

              <label className="ww-field">
                <span>Workout place</span>
                <select
                  value={prefs.workout_place || "gym"}
                  onChange={(e) =>
                    setPrefs((p) => ({ ...p, workout_place: e.target.value }))
                  }
                >
                  <option value="home">Home</option>
                  <option value="gym">Gym</option>
                  <option value="both">Both</option>
                </select>
              </label>

              <label className="ww-field">
                <span>Preferred style</span>
                <select
                  value={prefs.preferred_style || "mixed"}
                  onChange={(e) =>
                    setPrefs((p) => ({ ...p, preferred_style: e.target.value }))
                  }
                >
                  <option value="strength">Strength</option>
                  <option value="hypertrophy">Hypertrophy</option>
                  <option value="endurance">Endurance</option>
                  <option value="hiit">HIIT</option>
                  <option value="mixed">Mixed</option>
                </select>
              </label>

              <div className="ww-field ww-field-wide">
                <span>Injured Muscles (will be avoided)</span>

                <div className="ww-tags">
                  {(prefs.injuries || []).map((t) => (
                    <span key={String(t)} className="ww-tag">
                      {prettyLabel(t)}
                      <button type="button" onClick={() => removeInjury(t)}>
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                <div className="ww-tag-row">
                                  <select
                  className="ww-select-native"
                  value={injuryPick}
                  onChange={(e) => setInjuryPick(e.target.value)}
                  style={{
                    color: "var(--lnd-text-primary)",
                    background: "var(--lnd-bg-secondary)",
                  }}
                >
                  <option value="" style={{ color: "var(--lnd-text-primary)", background: "var(--lnd-bg-secondary)" }}>
                    Select a muscle…
                  </option>
                  {MUSCLE_OPTIONS.map((m) => (
                    <option
                      key={m}
                      value={m}
                      style={{ color: "var(--lnd-text-primary)", background: "var(--lnd-bg-secondary)" }}
                    >
                      {prettyLabel(m)}
                    </option>
                  ))}
                </select>

                  <button
                    className="ww-btn ww-btn-ghost"
                    type="button"
                    onClick={addInjuredMuscle}
                    disabled={!injuryPick}
                  >
                    Add
                  </button>
                </div>

                <div className="ww-muted" style={{ color: "#6b7280", marginTop: 8 }}>
                  Example: If you add “Back”, exercises with primary muscle “back” will be
                  filtered out during generation.
                </div>
              </div>
            </div>

            <div className="ww-modal-section">
              <div className="ww-modal-section-title">Preferred Equipment</div>

              <div className="ww-eq-grid">
                {eqList.map((e) => {
                  const id = Number(e?.equipment_id);
                  if (!id) return null;

                  const name = e?.name || `Equipment #${id}`;
                  const checked = preferredEquipmentIds.map(Number).includes(id);

                  return (
                    <button
                      key={id}
                      type="button"
                      className={`ww-eq-pill ${checked ? "is-on" : ""}`}
                      onClick={() => {
                        setPreferredEquipmentIds((prev) => {
                          const set = new Set(prev.map(Number));
                          if (set.has(id)) set.delete(id);
                          else set.add(id);
                          return Array.from(set);
                        });
                      }}
                      title={name}
                    >
                      {checked ? "✓ " : ""}
                      {prettyLabel(name)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="ww-modal-actions">
              <button
                className="ww-btn ww-btn-ghost"
                onClick={onClose}
                type="button"
                disabled={saving}
              >
                Cancel
              </button>

              <button className="ww-btn" onClick={onSave} type="button" disabled={saving}>
                {saving ? "Saving…" : "Save & Recalibrate"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}