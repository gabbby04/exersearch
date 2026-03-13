import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import * as THREE from "three";
import { gsap } from "gsap";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import Swal from "sweetalert2";
import "leaflet/dist/leaflet.css";

import "./../owner/OwnerGymsPage.scss";
import "./OwnersGymPage.css";

import {
  fetchAmenities,
  fetchEquipments,
  groupEquipmentsByTypeAndMuscle,
  labelForSelectedKey,
  absoluteUrl,
  prettyCategory,
  parseTargets,
} from "../../utils/findGymsData";

import {
  getUserPreference,
  getUserPreferredEquipments,
  getUserPreferredAmenities,
  getUserProfile,
  saveUserPreferences,
  savePreferredEquipments,
  savePreferredAmenities,
  saveUserProfileLocation,
} from "../../utils/findGymsApi";

import { 
  MapPin,          
  Menu,            
  X,                
  MoreHorizontal    
} from "lucide-react";

const RESULTS_ROUTE = "/home/gym-results";
const MAIN_ORANGE = "#ff8c00";
const RESULTS_CACHE_KEY = "exersearch_results_cache_v1";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function buildBudget(selectedItems) {
  const k = Object.keys(selectedItems).find((x) => x.startsWith("budget:"));
  if (!k) return null;
  const v = Number(k.split(":")[1]);
  return Number.isFinite(v) ? v : null;
}

function buildEquipmentIds(selectedItems) {
  return Object.keys(selectedItems)
    .filter((k) => k.startsWith("equipment:"))
    .map((k) => Number(k.split(":")[1]))
    .filter((n) => Number.isFinite(n));
}

function buildAmenityIds(selectedItems) {
  return Object.keys(selectedItems)
    .filter((k) => k.startsWith("amenity:"))
    .map((k) => Number(k.split(":")[1]))
    .filter((n) => Number.isFinite(n));
}

function getSelectedLocationKey(selectedItems) {
  const k = Object.keys(selectedItems).find((x) => x.startsWith("location:"));
  return k || null;
}

export default function OwnerGymsPage() {
  const navigate = useNavigate();

  const mountRef = useRef(null);

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

  const introRef = useRef(null);
  const xMarkRef = useRef(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const [selectedItems, setSelectedItems] = useState({});

  const [locationInput, setLocationInput] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [pinLocation, setPinLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([14.5764, 121.0851]);
  const [mapKey, setMapKey] = useState(0);

  const [locationMeta, setLocationMeta] = useState({
    address: "",
    lat: null,
    lng: null,
  });

  const [amenities, setAmenities] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState(null);

  const [prefsLoading, setPrefsLoading] = useState(false);
  const [hasComputedBefore, setHasComputedBefore] = useState(false);

  const [previewEquip, setPreviewEquip] = useState(null);

  const [savingPhase, setSavingPhase] = useState(false);
  const [rankingPhase, setRankingPhase] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showMobileSelections, setShowMobileSelections] = useState(false);

  const sections = ["Location", "Budget", "Amenities", "Gym Types", "Machines", "Free Weights"];

  const sectionData = {
    Budget: [
      { label: "₱500", value: 500 },
      { label: "₱1,000", value: 1000 },
      { label: "₱1,500", value: 1500 },
      { label: "₱2,000 and above", value: 2000 },
    ],
    "Gym Types": [
      "Commercial Gym - Large gym with full equipment",
      "Local Gym - Small neighborhood gym",
      "24-Hour Gym - Open anytime",
      "Budget Gym - Affordable rates",
      "Franchise Gym - Branded gym",
    ],
  };

  const isSelected = (key) => !!selectedItems[key];

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(RESULTS_CACHE_KEY);
      setHasComputedBefore(!!cached);
    } catch {
      setHasComputedBefore(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadAll() {
      setOptionsLoading(true);
      setOptionsError(null);
      setPrefsLoading(true);

      try {
        const [amen, eq] = await Promise.all([fetchAmenities(), fetchEquipments()]);
        if (!mounted) return;
        setAmenities(amen || []);
        setEquipments(eq || []);

        try {
          const [prefRes, eqRes, amRes, profileRes] = await Promise.all([
            getUserPreference(),
            getUserPreferredEquipments(),
            getUserPreferredAmenities(),
            getUserProfile(),
          ]);

          const pref = prefRes?.data ?? null;
          const preferredEquip = Array.isArray(eqRes?.data) ? eqRes.data : [];
          const preferredAmen = Array.isArray(amRes?.data) ? amRes.data : [];
          const profile = profileRes?.user_profile ?? null;

          const nextSelected = {};

          const budget = pref?.budget;
          if (budget !== null && budget !== undefined && budget !== "") {
            const n = Number(budget);
            if (Number.isFinite(n)) nextSelected[`budget:${n}`] = true;
          }

          for (const e of preferredEquip) {
            const id = Number(e?.equipment_id ?? e?.id);
            if (Number.isFinite(id)) nextSelected[`equipment:${id}`] = true;
          }

          for (const a of preferredAmen) {
            const id = Number(a?.amenity_id ?? a?.id);
            if (Number.isFinite(id)) nextSelected[`amenity:${id}`] = true;
          }

          const addr = profile?.address || "";
          const lat = profile?.latitude;
          const lng = profile?.longitude;

          if (addr) {
            nextSelected[`location:${addr}`] = true;
            setLocationInput(addr);
            setLocationMeta({ address: addr, lat: lat ?? null, lng: lng ?? null });
          }

          if (lat != null && lng != null) {
            const la = Number(lat);
            const lo = Number(lng);
            if (Number.isFinite(la) && Number.isFinite(lo)) {
              setPinLocation([la, lo]);
              setMapCenter([la, lo]);
              setMapKey((k) => k + 1);
              setLocationMeta((prev) => ({
                address: prev.address || addr || `${la}, ${lo}`,
                lat: la,
                lng: lo,
              }));
            }
          }

          setSelectedItems(nextSelected);
        } catch (e) {
          console.warn("[OwnerGymsPage] user preference load skipped:", e?.message || e);
        }
      } catch (e) {
        console.error(e);
        if (mounted) setOptionsError(String(e?.message || e));
      } finally {
        if (mounted) {
          setOptionsLoading(false);
          setPrefsLoading(false);
        }
      }
    }

    loadAll();
    return () => {
      mounted = false;
    };
  }, []);

  const grouped = useMemo(() => groupEquipmentsByTypeAndMuscle(equipments), [equipments]);

  useEffect(() => {
    if (!isModalOpen) return;
    if (sections[currentStep] !== "Location") return;

    const t = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 250);

    return () => clearTimeout(t);
  }, [isModalOpen, currentStep]);

  useEffect(() => {
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
            `rgb(${Math.floor(face.color.r)},${Math.floor(face.color.g)},${Math.floor(face.color.b)})`
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
  }, []);

  const closeModal = () => {
    if (savingPhase || rankingPhase) return;
    setIsModalOpen(false);
    setPreviewEquip(null);
    setShowSuggestions(false);

    const camera = cameraRef.current;
    const plane = planeRef.current;
    if (!camera || !plane) return;

    const intro = introRef.current;
    const xMark = xMarkRef.current;

    const tl = gsap.timeline();
    tl.to(xMark, { duration: 0.5, opacity: 0, ease: "power3.inOut" }, 0);
    tl.to(camera.rotation, { duration: 3, x: 0, ease: "power3.inOut" }, 0);
    tl.to(camera.position, { duration: 3, z: 50, ease: "power3.inOut" }, 0);
    tl.to(camera.position, { duration: 2.5, y: 0, ease: "power3.inOut" }, 0);
    tl.to(plane.scale, { duration: 3, x: 1, ease: "power3.inOut" }, 0);
    tl.to(intro, { duration: 0.5, opacity: 1, ease: "power3.in" }, ">-0.2");
  };

  const nextStep = () => {
      if (currentStep < sections.length - 1) {
        setCurrentStep((s) => s + 1);
        setShowMobileSelections(false);
      }
    };

    const prevStep = () => {
      if (currentStep > 0) {
        setCurrentStep((s) => s - 1);
        setShowMobileSelections(false);
      }
    };

  const addSelected = (key) => {
    if (key.startsWith("location:")) {
      setSelectedItems((prev) => {
        const next = {};
        Object.keys(prev).forEach((k) => {
          if (!k.startsWith("location:")) next[k] = true;
        });
        next[key] = true;
        return next;
      });
      return;
    }

    if (key.startsWith("budget:")) {
      setSelectedItems((prev) => {
        const next = {};
        Object.keys(prev).forEach((k) => {
          if (!k.startsWith("budget:")) next[k] = true;
        });
        next[key] = true;
        return next;
      });
      return;
    }

    if (key.startsWith("equipment:") || key.startsWith("amenity:")) {
      setSelectedItems((prev) => {
        const next = { ...prev };
        if (next[key]) delete next[key];
        else next[key] = true;
        return next;
      });
      return;
    }

    setSelectedItems((prev) => ({ ...prev, [key]: true }));
  };

  const removeSelected = (key) => {
    setSelectedItems((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    if (key.startsWith("location:")) {
      setLocationInput("");
      setLocationMeta({ address: "", lat: null, lng: null });
      setPinLocation(null);
      setMapCenter([14.5764, 121.0851]);
      setMapKey((k) => k + 1);
    }
  };

  const handleApply = async () => {
    const budget = buildBudget(selectedItems);
    const equipment_ids = buildEquipmentIds(selectedItems);
    const amenity_ids = buildAmenityIds(selectedItems);
    const locKey = getSelectedLocationKey(selectedItems);
    const address = locKey ? locKey.slice("location:".length) : locationMeta.address || "";

    if (budget === null) {
      await Swal.fire({
        icon: "warning",
        title: "Budget required",
        text: "Please choose a budget first.",
        confirmButtonColor: MAIN_ORANGE,
      });
      return;
    }

    if (!address && (locationMeta?.lat == null || locationMeta?.lng == null)) {
      await Swal.fire({
        icon: "warning",
        title: "Location required",
        text: "Please choose your location first.",
        confirmButtonColor: MAIN_ORANGE,
      });
      return;
    }

    if (!amenity_ids.length) {
      await Swal.fire({
        icon: "warning",
        title: "Amenity required",
        text: "Please choose at least one amenity.",
        confirmButtonColor: MAIN_ORANGE,
      });
      return;
    }

    if (!equipment_ids.length) {
      await Swal.fire({
        icon: "warning",
        title: "Equipment required",
        text: "Please choose at least one equipment option.",
        confirmButtonColor: MAIN_ORANGE,
      });
      return;
    }

    try {
      setSavingPhase(true);
      setRankingPhase(false);
      setProgress(8);

      setProgress(22);
      await saveUserPreferences({ budget });

      setProgress(42);
      await savePreferredEquipments(equipment_ids);

      setProgress(62);
      await savePreferredAmenities(amenity_ids);

      if (address || (locationMeta?.lat != null && locationMeta?.lng != null)) {
        setProgress(78);
        await saveUserProfileLocation({
          address: address || null,
          latitude: locationMeta.lat,
          longitude: locationMeta.lng,
        });
      }

      setProgress(100);

      try {
        sessionStorage.removeItem(RESULTS_CACHE_KEY);
      } catch {}

      setHasComputedBefore(false);
      setSavingPhase(false);
      setRankingPhase(false);
      setProgress(0);

      closeModal();

      navigate(RESULTS_ROUTE, {
        replace: false,
        state: {
          mode: "driving",
          refetch: true,
          updatedAt: Date.now(),
        },
      });
    } catch (e) {
      console.error("Apply failed:", e);

      setSavingPhase(false);
      setRankingPhase(false);
      setProgress(0);

      const apiMessage =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Something went wrong while saving your preferences.";

      let friendlyMessage = apiMessage;

      if (/amenity/i.test(apiMessage)) {
        friendlyMessage = "Please choose at least one amenity.";
      } else if (/equipment/i.test(apiMessage)) {
        friendlyMessage = "Please choose at least one equipment option.";
      } else if (/budget/i.test(apiMessage)) {
        friendlyMessage = "Please choose your budget first.";
      } else if (/location|address|latitude|longitude/i.test(apiMessage)) {
        friendlyMessage = "Please choose your location first.";
      }

      await Swal.fire({
        icon: "error",
        title: "Could not save preferences",
        text: friendlyMessage,
        confirmButtonColor: MAIN_ORANGE,
      });
    }
  };

  const photonSearch = async (q) => {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
      q
    )}&limit=15&lang=en&lon=121.0851&lat=14.5764`;
    const res = await fetch(url);
    const data = await res.json();
    return data;
  };

  const toPasigResults = (features) => {
    return (features || [])
      .filter((f) => {
        const props = f.properties || {};
        return (
          props.city === "Pasig" ||
          props.city === "Pasig City" ||
          props.district === "Pasig" ||
          (props.state && props.state.includes("Metro Manila"))
        );
      })
      .map((f) => ({
        display_name: `${f.properties.name || f.properties.street || ""}, ${
          f.properties.city || "Pasig"
        }, Philippines`,
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
      }));
  };

  const handleLocationInput = async (value) => {
    setLocationInput(value);

    if (value.length > 2) {
      try {
        const data = await photonSearch(value + " Pasig");
        const pasigResults = toPasigResults(data.features || []);
        setLocationSuggestions(pasigResults);
        setShowSuggestions(pasigResults.length > 0);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        setLocationSuggestions([]);
        setShowSuggestions(false);
      }
    } else {
      setLocationSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const applyLocation = ({ address, lat, lon }) => {
    const newLocation = [parseFloat(lat), parseFloat(lon)];
    setPinLocation(newLocation);
    setMapCenter(newLocation);
    setMapKey((k) => k + 1);

    setLocationInput(address);
    setLocationMeta({ address, lat: Number(lat), lng: Number(lon) });

    addSelected(`location:${address}`);
  };

  const selectSuggestion = (suggestion) => {
    setShowSuggestions(false);
    applyLocation({
      address: suggestion.display_name,
      lat: suggestion.lat,
      lon: suggestion.lon,
    });
  };

  const searchLocation = async () => {
    const q = locationInput.trim();
    if (!q) return;

    setShowSuggestions(false);

    try {
      const data = await photonSearch(q + " Pasig");
      const pasigResults = toPasigResults(data.features || []);
      const best = pasigResults[0];

      if (best?.lat && best?.lon) {
        applyLocation({ address: best.display_name, lat: best.lat, lon: best.lon });
      } else {
        setLocationMeta({ address: q, lat: null, lng: null });
        addSelected(`location:${q}`);
      }
    } catch (e) {
      console.error(e);
      setLocationMeta({ address: q, lat: null, lng: null });
      addSelected(`location:${q}`);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      Swal.fire({
        icon: "warning",
        title: "Geolocation unavailable",
        text: "Geolocation is not supported by your browser.",
        confirmButtonColor: MAIN_ORANGE,
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setPinLocation([lat, lng]);
        setMapCenter([lat, lng]);
        setMapKey((k) => k + 1);

        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
          .then((res) => res.json())
          .then((data) => {
            const name = data.display_name || `${lat}, ${lng}`;
            setLocationInput(name);
            setLocationMeta({ address: name, lat, lng });
            addSelected(`location:${name}`);
          })
          .catch(() => {
            const name = `${lat}, ${lng}`;
            setLocationInput(name);
            setLocationMeta({ address: name, lat, lng });
            addSelected(`location:${name}`);
          });
      },
      (error) => {
        Swal.fire({
          icon: "warning",
          title: "Location not available",
          text: "Unable to get your location. Please enter it manually.",
          confirmButtonColor: MAIN_ORANGE,
        });
        console.error(error);
      }
    );
  };

  function LocationMarker() {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;

        setPinLocation([lat, lng]);

        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
          .then((res) => res.json())
          .then((data) => {
            const name = data.display_name || `${lat}, ${lng}`;
            setLocationInput(name);
            setLocationMeta({ address: name, lat, lng });
            addSelected(`location:${name}`);
          })
          .catch(() => {
            const name = `${lat}, ${lng}`;
            setLocationInput(name);
            setLocationMeta({ address: name, lat, lng });
            addSelected(`location:${name}`);
          });
      },
    });

    return pinLocation ? <Marker position={pinLocation} /> : null;
  }

  const prettySelectedLabel = useCallback(
    (key) => labelForSelectedKey(key, amenities, equipments),
    [amenities, equipments]
  );

  const openEquipPreview = (equip) => setPreviewEquip(equip);
  const closeEquipPreview = () => setPreviewEquip(null);

  const renderEquipmentGroups = (entries) => {
    if (optionsLoading) return <p className="fg-loading-text">Loading equipments…</p>;
    if (optionsError) return <p className="fg-error-text">{optionsError}</p>;
    if (!entries || entries.length === 0) return <p className="fg-empty-text">No equipments found.</p>;

    return (
      <div className="fg-stack-14">
        {entries.map(([groupName, list]) => (
          <div key={groupName}>
            <div className="fg-equip-group-title">{groupName}</div>

            <div className="options-grid">
              {list.map((e) => {
                const key = `equipment:${e.equipment_id}`;
                const picked = isSelected(key);

                return (
                  <div
                    key={e.equipment_id}
                    className={`option equip-card ${picked ? "fg-selected" : ""}`}
                    onClick={() => !(savingPhase || rankingPhase) && addSelected(key)}
                  >
                    <div className="equip-topbar">
                      <strong className="equip-title">{e.name}</strong>

                      <button
                        type="button"
                        className="equip-viewBtn equip-viewBtn--dots"
                        title="View details"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          openEquipPreview(e);
                        }}
                      >
                        <MoreHorizontal size={18} />
                      </button>
                    </div>

                    {e.image_url ? (
                      <div className="equip-imgWrap">
                        <img src={absoluteUrl(e.image_url)} alt={e.name} />
                      </div>
                    ) : (
                      <div className="equip-imgPlaceholder">No image</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderLeftPanel = () => {
    const currentSection = sections[currentStep];

    if (currentSection === "Location") {
      return (
        <div className="location-section">
          {prefsLoading ? (
            <p className="fg-location-loading">Loading your saved preferences…</p>
          ) : null}

          <p className="section-title">Set your location:</p>

          <div className="fg-location-search-wrap">
            <div className="fg-location-search-row">
              <input
                type="text"
                className="input-box fg-location-input"
                placeholder="Enter your address in Pasig City"
                value={locationInput}
                onChange={(e) => handleLocationInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") searchLocation();
                }}
                disabled={savingPhase || rankingPhase}
              />

              <button
                className="fg-location-btn"
                onClick={searchLocation}
                disabled={savingPhase || rankingPhase}
              >
                Search
              </button>
            </div>

            {showSuggestions && locationSuggestions.length > 0 && (
              <div className="fg-suggestions">
                {locationSuggestions.map((s, idx) => (
                  <div
                    key={idx}
                    className="fg-suggestion-item"
                    onClick={() => selectSuggestion(s)}
                  >
                    {s.display_name}
                  </div>
                ))}
              </div>
            )}
          </div>

         <button
              className="fg-location-btn fg-location-btn--full"
              onClick={getCurrentLocation}
              disabled={savingPhase || rankingPhase}
            >
              <MapPin size={16} /> Use My Current Location
            </button>

          <div className={`fg-map-wrap ${savingPhase || rankingPhase ? "is-disabled" : ""}`}>
            <MapContainer key={mapKey} center={mapCenter} zoom={16} className="fg-map-container">
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              <LocationMarker />
            </MapContainer>
          </div>

          <p className="fg-location-help">Click anywhere on the map to pin your location</p>
        </div>
      );
    }

    if (currentSection === "Amenities") {
      if (optionsLoading) return <p className="fg-loading-text">Loading amenities…</p>;
      if (optionsError) return <p className="fg-error-text">{optionsError}</p>;

      return (
        <div className={`options-grid ${savingPhase || rankingPhase ? "fg-dimmed" : ""}`}>
          {amenities.map((a) => {
            const key = `amenity:${a.amenity_id}`;
            const picked = isSelected(key);

            return (
              <div
                key={a.amenity_id}
                className={`option ${picked ? "fg-selected" : ""}`}
                onClick={() => !(savingPhase || rankingPhase) && addSelected(key)}
              >
                <strong>{a.name}</strong>
                {a.image_url ? <img src={absoluteUrl(a.image_url)} alt={a.name} /> : null}
              </div>
            );
          })}
          {amenities.length === 0 ? <p className="fg-empty-text">No amenities found.</p> : null}
        </div>
      );
    }

    if (currentSection === "Machines") return renderEquipmentGroups(grouped.machines);
    if (currentSection === "Free Weights") return renderEquipmentGroups(grouped.freeWeights);

    const options = sectionData[currentSection] || [];
    return (
      <div className={`options-grid ${savingPhase || rankingPhase ? "fg-dimmed" : ""}`}>
        {options.map((option, index) => {
          const isObj = typeof option === "object";
          const text = isObj ? option.label : option;

          const key =
            currentSection === "Budget" && isObj
              ? `budget:${option.value}`
              : currentSection === "Gym Types"
              ? `gymtype:${text}`
              : text;

          const picked = isSelected(key);

          return (
            <div
              key={index}
              className={`option ${picked ? "fg-selected" : ""}`}
              onClick={() => !(savingPhase || rankingPhase) && addSelected(key)}
            >
              <strong>{text}</strong>
            </div>
          );
        })}
      </div>
    );
  };

  const handleShiftCamera = () => {
    const camera = cameraRef.current;
    const plane = planeRef.current;

    if (!camera || !plane) return;

    const intro = introRef.current;
    const xMark = xMarkRef.current;

    const tl = gsap.timeline();

    tl.to(intro, { duration: 0.5, opacity: 0, ease: "power3.in" }, 0);
    tl.to(camera.rotation, { duration: 3, x: Math.PI / 2, ease: "power3.inOut" }, 0);
    tl.to(camera.position, { duration: 2.5, z: 20, ease: "power3.inOut" }, 0);
    tl.to(camera.position, { duration: 3, y: 120, ease: "power3.inOut" }, 0);
    tl.to(plane.scale, { duration: 3, x: 2, ease: "power3.inOut" }, 0);

    tl.to(xMark, { duration: 2, opacity: 1, ease: "power3.inOut" }, ">-0.2");
    tl.call(() => {
      setIsModalOpen(true);
      setCurrentStep(0);
    }, [], "<");
  };

  const handleGoToPreviousResults = () => {
    navigate(RESULTS_ROUTE, {
      replace: false,
    });
  };

  const isLastStep = currentStep === sections.length - 1;

  const showOverlay = savingPhase || rankingPhase;
  const overlayTitle = savingPhase ? "Saving preferences…" : "Ranking gyms for you…";
  const overlaySub = savingPhase
    ? "Updating your selections. Please wait."
    : "Crunching data and matching gyms to your preferences.";

  return (
    <div className="find-gyms-page">
      <div className="star-intro-root">
        <div className="three-mount" ref={mountRef} />

        <div className="x-mark" ref={xMarkRef} onClick={closeModal}>
          <div className="container">
            <div className="left" />
            <div className="right" />
          </div>
        </div>

        <div className="intro-container" ref={introRef}>
          <h2 className="fancy-text">Exersearch</h2>
          <h1>
            FIND THE BEST GYM
            <br />
            FOR YOUR GOALS
          </h1>

          <div className="fg-hero-actions">
            <div className="button shift-camera-button" onClick={handleShiftCamera}>
              <div className="border">
                <div className="left-plane" />
                <div className="right-plane" />
              </div>
              <div className="text">Search Now</div>
            </div>

            {hasComputedBefore && (
              <div className="button shift-camera-button" onClick={handleGoToPreviousResults}>
                <div className="border">
                  <div className="left-plane" />
                  <div className="right-plane" />
                </div>
                <div className="text">Previous Result</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fg-modal-bg" onClick={closeModal}>
          <div className="fg-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fg-modal-header">
              <div className="fg-modal-header-top">
                <div className="fg-modal-title-group">
                  <h2>{sections[currentStep]}</h2>
                  <span className="fg-step-badge">{currentStep + 1} of {sections.length}</span>
                  <button
                      className="fg-selections-toggle"
                      onClick={() => setShowMobileSelections(v => !v)}
                    >
                      <Menu size={18} />
                      {Object.keys(selectedItems).length > 0 && (
                        <span className="fg-selections-badge">
                          {Object.keys(selectedItems).length}
                        </span>
                      )}
                    </button>
                </div>
                <button className="fg-modal-close" onClick={closeModal} disabled={showOverlay}>
                <X size={20} />
              </button>
              </div>

              <div className="fg-modal-nav">
                <button
                  className="fg-nav-btn"
                  onClick={prevStep}
                  disabled={currentStep === 0 || showOverlay}
                >
                  <span className="arrow left" />
                </button>

                <div className="fg-progress-track">
                  {sections.map((_, idx) => (
                    <div
                      key={idx}
                      className={`fg-progress-seg ${
                        idx < currentStep ? "is-done" : idx === currentStep ? "is-active" : ""
                      }`}
                    />
                  ))}
                </div>

                {!isLastStep ? (
                  <button
                    className="fg-nav-btn"
                    onClick={nextStep}
                    disabled={showOverlay}
                  >
                    <span className="arrow right" />
                  </button>
                ) : (
                  <button
                    className="fg-apply-btn fg-apply-btn--compact"
                    onClick={handleApply}
                    disabled={showOverlay}
                  >
                    {savingPhase ? "Saving..." : rankingPhase ? "Ranking..." : "Apply"}
                  </button>
                )}
              </div>
            </div>
          <div className="fg-modal-content">
  <div className="fg-left-panel">
    {showMobileSelections && window.innerWidth <= 768 ? (
      <div>
        <h3 style={{fontSize:"10px",fontWeight:900,letterSpacing:"2px",textTransform:"uppercase",color:"var(--brand)",marginBottom:"14px"}}>Selected Preferences</h3>
        {Object.keys(selectedItems).length === 0 ? (
          <p className="fg-empty-message">No items selected yet</p>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
            {Object.keys(selectedItems).map((key, index) => (
              <div key={index} className="fg-selected-item">
                <span>{prettySelectedLabel(key)}</span>
                <button className="fg-remove-btn" onClick={() => !(savingPhase || rankingPhase) && removeSelected(key)} disabled={showOverlay}>
  <X size={14} />
</button>
              </div>
            ))}
          </div>
        )}
      </div>
    ) : renderLeftPanel()}
  </div>

  <div className="fg-right-panel">
    <h3>Selected Preferences</h3>
    <div className="fg-selected-list">
      {Object.keys(selectedItems).length === 0 ? (
        <p className="fg-empty-message">No items selected yet</p>
      ) : (
        Object.keys(selectedItems).map((key, index) => (
          <div key={index} className="fg-selected-item">
            <span>{prettySelectedLabel(key)}</span>
           <button
          className="fg-remove-btn"
          onClick={() => !(savingPhase || rankingPhase) && removeSelected(key)}
          disabled={showOverlay}
        >
          <X size={14} />
        </button>
          </div>
        ))
      )}
    </div>
  </div>
</div>
            {previewEquip && !showOverlay && (
              <div className="fg-equip-preview-bg" onClick={closeEquipPreview}>
                <div className="fg-equip-preview" onClick={(e) => e.stopPropagation()}>
                  <div className="fg-equip-preview-head">
                    <div className="fg-equip-preview-title">{previewEquip.name}</div>
                   <button className="fg-equip-preview-close" onClick={closeEquipPreview}>
              <X size={20} />
            </button>
                  </div>

                  {previewEquip.image_url ? (
                    <div className="fg-equip-preview-imgWrap">
                      <img src={absoluteUrl(previewEquip.image_url)} alt={previewEquip.name} />
                    </div>
                  ) : null}

                  <div className="fg-equip-preview-meta">
                    <div>
                      <strong>Type:</strong> {prettyCategory(previewEquip.category) || "-"}
                    </div>
                    <div>
                      <strong>Difficulty:</strong> {previewEquip.difficulty || "-"}
                    </div>
                    <div>
                      <strong>Target:</strong> {parseTargets(previewEquip.target_muscle_group).join(", ") || "-"}
                    </div>
                  </div>

                  {previewEquip.description ? (
                    <div className="fg-equip-preview-desc">
                      <strong>Description</strong>
                      <div>{previewEquip.description}</div>
                    </div>
                  ) : null}

                  <div className="fg-equip-preview-actions">
                    <button
                      className="fg-equip-preview-select"
                      onClick={() => {
                        addSelected(`equipment:${previewEquip.equipment_id}`);
                        closeEquipPreview();
                      }}
                    >
                      Select this equipment
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showOverlay && (
              <div className="fg-overlay">
                <div className="fg-overlay-card">
                  <div className="fg-overlay-title">{overlayTitle}</div>
                  <div className="fg-overlay-sub">{overlaySub}</div>

                  <div className="fg-overlay-status">
                    <div className="fg-spinner" />
                    <div className="fg-overlay-progress-text">{progress}%</div>
                  </div>

                  <div className="fg-progress-bar">
                    <div className="fg-progress-fill" style={{ width: `${progress}%` }} />
                  </div>

                  <div className="fg-overlay-note">Please don’t close this window.</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}