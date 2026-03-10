import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Flame,
  Dumbbell,
  Activity,
  Zap,
  Sprout,
  Award,
  Trophy,
  User,
  Users,
  UserCircle,
  MapPin,
  Loader2,
  Droplets,
  Lock,
  Wifi,
  Car,
  HeartPulse,
  Weight,
  Cog,
  Target,
  Scan,
  Sunrise,
  Sun,
  Moon,
  UtensilsCrossed,
  Leaf,
  Salad,
  Church,
  Milk,
  Wheat,
  Navigation,
  Search,
  Clock,
  Home,
  Building2,
  Layers,
  ShieldAlert,
  BadgeAlert,
} from "lucide-react";
import "./Onboardingstyle.css";

import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../../utils/apiClient";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function ClickToPick({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng);
    },
  });
  return null;
}

function FlyToLocation({ center }) {
  const map = useMap();

  React.useEffect(() => {
    if (!center) return;
    map.flyTo([center.lat, center.lng], map.getZoom(), {
      animate: true,
      duration: 0.8,
    });
  }, [center, map]);

  return null;
}

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);

  const [mapOpen, setMapOpen] = useState(false);
  const pasigCenter = useMemo(() => ({ lat: 14.5547, lng: 121.0437 }), []);

  const [mapSearch, setMapSearch] = useState("");
  const [mapSearchLoading, setMapSearchLoading] = useState(false);
  const [mapSearchError, setMapSearchError] = useState("");
  const [mapCenter, setMapCenter] = useState(pasigCenter);
  const [mapKey, setMapKey] = useState(0);

  const [heightUnit, setHeightUnit] = useState("cm");
  const [weightUnit, setWeightUnit] = useState("kg");

  const [formData, setFormData] = useState({
    fitnessGoal: "",
    fitnessLevel: "",
    age: "",
    gender: "",
    height: "",
    weight: "",
    heightFeet: "",
    heightInches: "",
    weightDisplay: "",

    location: "",
    latitude: null,
    longitude: null,

    gymBudget: "",

    amenities: [],
    equipment: [],

    workoutDays: "",
    workoutTime: "",

    sessionMinutes: "",
    workoutPlace: "",
    preferredStyle: "",
    injuries: [],

    foodBudget: "",
    dietaryRestrictions: [],
  });

  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const AGE_MIN = 13;
  const AGE_MAX = 90;
  const WEIGHT_MIN = 30;
  const WEIGHT_MAX = 250;
  const HEIGHT_MIN = 120;
  const HEIGHT_MAX = 230;

  const KG_TO_LB = 2.2046226218;
  const CM_PER_IN = 2.54;
  const IN_PER_FT = 12;

  const cmToFeetInches = (cmValue) => {
    const cm = Number(cmValue);
    if (!Number.isFinite(cm) || cm <= 0) return { feet: "", inches: "" };

    const totalInches = cm / CM_PER_IN;
    const feet = Math.floor(totalInches / IN_PER_FT);
    const inches = Math.round(totalInches - feet * IN_PER_FT);

    if (inches === 12) {
      return { feet: String(feet + 1), inches: "0" };
    }

    return { feet: String(feet), inches: String(inches) };
  };

  const feetInchesToCm = (feetValue, inchesValue) => {
    const feet = Number(feetValue || 0);
    const inches = Number(inchesValue || 0);

    if (!Number.isFinite(feet) || !Number.isFinite(inches)) return "";
    if (feet < 0 || inches < 0) return "";

    const totalInches = feet * IN_PER_FT + inches;
    if (totalInches <= 0) return "";

    return String(Math.round(totalInches * CM_PER_IN));
  };

  const kgToLb = (kgValue) => {
    const kg = Number(kgValue);
    if (!Number.isFinite(kg) || kg <= 0) return "";
    return (kg * KG_TO_LB).toFixed(1);
  };

  const lbToKg = (lbValue) => {
    const lb = Number(lbValue);
    if (!Number.isFinite(lb) || lb <= 0) return "";
    return String((lb / KG_TO_LB).toFixed(2));
  };

  const switchHeightUnit = (nextUnit) => {
    if (nextUnit === heightUnit) return;

    if (nextUnit === "ftin") {
      const converted = cmToFeetInches(formData.height);
      setFormData((prev) => ({
        ...prev,
        heightFeet: converted.feet,
        heightInches: converted.inches,
      }));
    } else {
      const cm = feetInchesToCm(formData.heightFeet, formData.heightInches);
      setFormData((prev) => ({
        ...prev,
        height: cm || prev.height,
      }));
    }

    setHeightUnit(nextUnit);
  };

  const switchWeightUnit = (nextUnit) => {
    if (nextUnit === weightUnit) return;

    if (nextUnit === "lb") {
      setFormData((prev) => ({
        ...prev,
        weightDisplay: kgToLb(prev.weight),
      }));
    } else {
      const kg = lbToKg(formData.weightDisplay);
      setFormData((prev) => ({
        ...prev,
        weight: kg || prev.weight,
      }));
    }

    setWeightUnit(nextUnit);
  };

  const questions = [
    {
      id: "fitnessGoal",
      type: "single-choice",
      question: "What's your main goal?",
      options: [
        { value: "lose_fat", icon: Flame, label: "Lose Fat" },
        { value: "build_muscle", icon: Dumbbell, label: "Build Muscle" },
        { value: "endurance", icon: Activity, label: "Endurance" },
        { value: "strength", icon: Zap, label: "Strength" },
      ],
    },
    {
      id: "fitnessLevel",
      type: "single-choice",
      question: "Current fitness level?",
      options: [
        { value: "beginner", icon: Sprout, label: "Beginner" },
        { value: "intermediate", icon: Award, label: "Intermediate" },
        { value: "advanced", icon: Trophy, label: "Advanced" },
      ],
    },
    {
      id: "age",
      type: "input",
      question: "How old are you?",
      inputType: "number",
      placeholder: "25",
      unit: "years",
      min: AGE_MIN,
      max: AGE_MAX,
    },
    {
      id: "gender",
      type: "single-choice",
      question: "Gender?",
      options: [
        { value: "male", icon: User, label: "Male" },
        { value: "female", icon: Users, label: "Female" },
        { value: "other", icon: UserCircle, label: "Other" },
      ],
    },
    {
      id: "height",
      type: "input",
      question: "Your height?",
      inputType: "number",
      placeholder: "170",
      unit: "cm",
      min: HEIGHT_MIN,
      max: HEIGHT_MAX,
    },
    {
      id: "weight",
      type: "input",
      question: "Current weight?",
      inputType: "number",
      placeholder: "70",
      unit: "kg",
      min: WEIGHT_MIN,
      max: WEIGHT_MAX,
    },
    {
      id: "location",
      type: "input-autocomplete",
      question: "Where are you in Pasig?",
      inputType: "text",
      placeholder: "Start typing your location...",
    },
    {
      id: "gymBudget",
      type: "single-choice",
      question: "Monthly gym budget?",
      options: [
        { value: "500", label: "₱500" },
        { value: "1000", label: "₱1,000" },
        { value: "1500", label: "₱1,500" },
        { value: "2000", label: "₱2,000" },
        { value: "2500", label: "₱2,500+" },
      ],
    },
    {
      id: "amenities",
      type: "multi-choice",
      question: "Gym amenities needed?",
      options: [
        { value: 31, icon: Droplets, label: "Shower" },
        { value: 30, icon: Lock, label: "Locker Room" },
        { value: 45, icon: Wifi, label: "Free Wi-Fi" },
        { value: 41, icon: Flame, label: "Sauna / Steam" },
        { value: 47, icon: Car, label: "Parking" },
      ],
    },
    {
      id: "equipment",
      type: "multi-choice",
      question: "Equipment you use?",
      options: [
        { value: 6, icon: HeartPulse, label: "Cardio (Bike)" },
        { value: 39, icon: Weight, label: "Free Weights" },
        { value: 8, icon: Cog, label: "Machines (Smith)" },
        { value: 35, icon: Target, label: "Functional (Bands)" },
        { value: 44, icon: Scan, label: "Core (Ab Roller)" },
      ],
    },
    {
      id: "workoutDays",
      type: "single-choice",
      question: "Training days per week?",
      options: [
        { value: "3", label: "3 days" },
        { value: "4", label: "4 days" },
        { value: "5", label: "5 days" },
        { value: "6", label: "6 days" },
        { value: "7", label: "Every day" },
      ],
    },
    {
      id: "sessionMinutes",
      type: "single-choice",
      question: "Minutes per workout session?",
      options: [
        { value: "20", icon: Clock, label: "20 min" },
        { value: "30", icon: Clock, label: "30 min" },
        { value: "45", icon: Clock, label: "45 min" },
        { value: "60", icon: Clock, label: "60 min" },
        { value: "90", icon: Clock, label: "90+ min" },
      ],
    },
    {
      id: "workoutPlace",
      type: "single-choice",
      question: "Where do you usually train?",
      options: [
        { value: "home", icon: Home, label: "Home" },
        { value: "gym", icon: Building2, label: "Gym" },
        { value: "both", icon: Layers, label: "Both" },
      ],
    },
    {
      id: "preferredStyle",
      type: "single-choice",
      question: "Preferred workout style?",
      options: [
        { value: "strength", icon: Dumbbell, label: "Strength" },
        { value: "hypertrophy", icon: Trophy, label: "Muscle/Hypertrophy" },
        { value: "endurance", icon: Activity, label: "Endurance" },
        { value: "hiit", icon: Zap, label: "HIIT" },
        { value: "mixed", icon: Target, label: "Mixed" },
      ],
    },
    {
      id: "injuries",
      type: "multi-choice",
      question: "Any injuries or areas to be careful with?",
      options: [
        { value: "none", icon: ShieldAlert, label: "None" },
        { value: "knee", icon: BadgeAlert, label: "Knee" },
        { value: "lower_back", icon: BadgeAlert, label: "Lower back" },
        { value: "shoulder", icon: BadgeAlert, label: "Shoulder" },
        { value: "wrist", icon: BadgeAlert, label: "Wrist" },
      ],
    },
    {
      id: "workoutTime",
      type: "single-choice",
      question: "Preferred workout time?",
      options: [
        { value: "morning", icon: Sunrise, label: "Morning" },
        { value: "afternoon", icon: Sun, label: "Afternoon" },
        { value: "evening", icon: Moon, label: "Evening" },
      ],
    },
    {
      id: "foodBudget",
      type: "single-choice",
      question: "Daily food budget?",
      options: [
        { value: "200", label: "₱200" },
        { value: "300", label: "₱300" },
        { value: "500", label: "₱500" },
        { value: "1000", label: "₱1000+" },
      ],
    },
    {
      id: "dietaryRestrictions",
      type: "multi-choice",
      question: "Dietary restrictions?",
      options: [
        { value: "None", icon: UtensilsCrossed, label: "None" },
        { value: "Vegan", icon: Leaf, label: "Vegan" },
        { value: "Vegetarian", icon: Salad, label: "Vegetarian" },
        { value: "Halal", icon: Church, label: "Halal" },
        { value: "Lactose", icon: Milk, label: "Lactose Free" },
        { value: "Gluten", icon: Wheat, label: "Gluten Free" },
      ],
    },
  ];

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const isLastQuestion = currentQuestion === questions.length - 1;

  const fetchLocationSuggestions = async (query) => {
    if (query.length < 3) {
      setLocationSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(
          query
        )}&limit=5&lon=${pasigCenter.lng}&lat=${pasigCenter.lat}`
      );
      const data = await response.json();

      const suggestions = (data.features || []).map((feature) => {
        const name = feature.properties?.name || "";
        const city =
          feature.properties?.city || feature.properties?.county || "";
        const display = `${name}, ${city}`.replace(/^, |, $/g, "");
        const coords = feature.geometry?.coordinates;

        return {
          display,
          latitude: Array.isArray(coords) ? coords[1] : null,
          longitude: Array.isArray(coords) ? coords[0] : null,
        };
      });

      setLocationSuggestions(suggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Error fetching locations:", error);
    }
  };

  const handleSingleChoice = (questionId, value) => {
    setFormData((prev) => ({ ...prev, [questionId]: value }));
    setTimeout(() => nextQuestion(), 300);
  };

  const handleMultiChoice = (questionId, value) => {
    setFormData((prev) => {
      const current = Array.isArray(prev[questionId]) ? prev[questionId] : [];

      if (questionId === "injuries") {
        if (value === "none") return { ...prev, injuries: ["none"] };
        const filtered = current.filter((x) => x !== "none");
        const next = filtered.includes(value)
          ? filtered.filter((x) => x !== value)
          : [...filtered, value];
        return { ...prev, injuries: next };
      }

      return {
        ...prev,
        [questionId]: current.includes(value)
          ? current.filter((item) => item !== value)
          : [...current, value],
      };
    });
  };

  const handleInputChange = (questionId, value) => {
    if (questionId === "height") {
      setFormData((prev) => ({ ...prev, height: value }));
      return;
    }

    if (questionId === "weight") {
      setFormData((prev) => ({ ...prev, weight: value }));
      return;
    }

    setFormData((prev) => {
      const next = { ...prev, [questionId]: value };
      if (questionId === "location") {
        next.latitude = null;
        next.longitude = null;
      }
      return next;
    });

    if (questionId === "location") {
      if (inputRef.current) clearTimeout(inputRef.current);
      inputRef.current = setTimeout(() => fetchLocationSuggestions(value), 300);
    }
  };

  const handleHeightFeetChange = (value) => {
    setFormData((prev) => {
      const nextFeet = value;
      const nextCm = feetInchesToCm(nextFeet, prev.heightInches);
      return {
        ...prev,
        heightFeet: nextFeet,
        height: nextCm,
      };
    });
  };

  const handleHeightInchesChange = (value) => {
    setFormData((prev) => {
      const nextInches = value;
      const nextCm = feetInchesToCm(prev.heightFeet, nextInches);
      return {
        ...prev,
        heightInches: nextInches,
        height: nextCm,
      };
    });
  };

  const handleWeightDisplayChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      weightDisplay: value,
      weight: lbToKg(value),
    }));
  };

  const handleLocationSelect = (suggestion) => {
    setFormData((prev) => ({
      ...prev,
      location: suggestion.display,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
    }));
    setShowSuggestions(false);
    setLocationSuggestions([]);
  };

  const reverseGeocode = async (lat, lon) => {
    try {
      const res = await fetch(
        `https://photon.komoot.io/reverse?lon=${lon}&lat=${lat}`
      );
      const data = await res.json();
      const place = data.features?.[0]?.properties;
      if (!place) return null;
      const locationName = `${place.name || ""}, ${
        place.city || place.county || ""
      }`.replace(/^, |, $/g, "");
      return locationName || null;
    } catch (e) {
      console.error("Reverse geocode error:", e);
      return null;
    }
  };

  const requestCurrentLocation = async () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    try {
      if (navigator.permissions?.query) {
        const p = await navigator.permissions.query({ name: "geolocation" });
        if (p.state === "denied") {
          alert(
            "Location permission is blocked in your browser settings. Please enable it and try again."
          );
          return;
        }
      }
    } catch {}

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const name = await reverseGeocode(latitude, longitude);

        setFormData((prev) => ({
          ...prev,
          location: name || prev.location,
          latitude,
          longitude,
        }));

        if (!name) {
          alert(
            "We saved your coordinates, but couldn't detect a readable address. You can type it manually."
          );
        }

        setIsGettingLocation(false);
      },
      (error) => {
        setIsGettingLocation(false);
        console.error("Geolocation error:", error);

        if (error.code === error.PERMISSION_DENIED) {
          alert(
            "Location access denied. Please allow location access when prompted, then try again."
          );
        } else {
          alert("Could not get your location. Please type it manually.");
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const geocodeIfMissing = async () => {
    if (!formData.location) return { latitude: null, longitude: null };
    if (formData.latitude != null && formData.longitude != null) {
      return { latitude: formData.latitude, longitude: formData.longitude };
    }

    try {
      const res = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(
          formData.location
        )}&limit=1&lon=${pasigCenter.lng}&lat=${pasigCenter.lat}`
      );
      const data = await res.json();
      const coords = data.features?.[0]?.geometry?.coordinates;
      if (Array.isArray(coords) && coords.length === 2) {
        return { latitude: coords[1], longitude: coords[0] };
      }
      return { latitude: null, longitude: null };
    } catch (e) {
      console.error("Geocode error:", e);
      return { latitude: null, longitude: null };
    }
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentQuestion((q) => q + 1);
        setIsTransitioning(false);
      }, 300);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentQuestion((q) => q - 1);
        setIsTransitioning(false);
      }, 300);
    }
  };

  const numberInRange = (val, min, max) => {
    if (val === "" || val == null) return false;
    const n = Number(val);
    if (!Number.isFinite(n)) return false;
    return n >= min && n <= max;
  };

  const inputError = useMemo(() => {
    if (currentQ.type !== "input") return "";

    if (currentQ.id === "age") {
      if (formData.age === "") return "";
      return numberInRange(formData.age, AGE_MIN, AGE_MAX)
        ? ""
        : `Age must be between ${AGE_MIN} and ${AGE_MAX}.`;
    }

    if (currentQ.id === "weight") {
      if (weightUnit === "kg") {
        if (formData.weight === "") return "";
      } else {
        if (formData.weightDisplay === "") return "";
      }

      return numberInRange(formData.weight, WEIGHT_MIN, WEIGHT_MAX)
        ? ""
        : `Weight must be between ${WEIGHT_MIN} and ${WEIGHT_MAX} kg.`;
    }

    if (currentQ.id === "height") {
      if (heightUnit === "cm") {
        if (formData.height === "") return "";
      } else {
        if (formData.heightFeet === "" && formData.heightInches === "") return "";
      }

      return numberInRange(formData.height, HEIGHT_MIN, HEIGHT_MAX)
        ? ""
        : `Height must be between ${HEIGHT_MIN} and ${HEIGHT_MAX} cm.`;
    }

    return "";
  }, [currentQ, formData, heightUnit, weightUnit]);

  const canContinue = useMemo(() => {
    if (submitting) return false;

    if (currentQ.type === "input") {
      if (currentQ.id === "age") {
        const v = formData.age;
        if (!v) return false;
        return numberInRange(v, AGE_MIN, AGE_MAX);
      }

      if (currentQ.id === "height") {
        if (heightUnit === "cm") {
          return numberInRange(formData.height, HEIGHT_MIN, HEIGHT_MAX);
        }
        return (
          (formData.heightFeet !== "" || formData.heightInches !== "") &&
          numberInRange(formData.height, HEIGHT_MIN, HEIGHT_MAX)
        );
      }

      if (currentQ.id === "weight") {
        if (weightUnit === "kg") {
          return numberInRange(formData.weight, WEIGHT_MIN, WEIGHT_MAX);
        }
        return (
          String(formData.weightDisplay).trim().length > 0 &&
          numberInRange(formData.weight, WEIGHT_MIN, WEIGHT_MAX)
        );
      }

      const v = formData[currentQ.id];
      return String(v).trim().length > 0;
    }

    if (currentQ.type === "input-autocomplete") return !!formData.location;
    if (currentQ.type === "single-choice") return !!formData[currentQ.id];

    if (currentQ.type === "multi-choice") {
      const arr = formData[currentQ.id];
      return Array.isArray(arr) && arr.length > 0;
    }

    return true;
  }, [currentQ, formData, submitting, heightUnit, weightUnit]);

  const handleSubmit = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please login first.");
      navigate("/login");
      return;
    }

    setSubmitting(true);

    const { latitude, longitude } = await geocodeIfMissing();

    const profilePayload = {
      age: formData.age ? Number(formData.age) : null,
      height: formData.height ? Number(formData.height) : null,
      weight: formData.weight ? Number(formData.weight) : null,
      address: formData.location || null,
      latitude,
      longitude,
      gender: formData.gender || null,
    };

    const injuriesPayload =
      Array.isArray(formData.injuries) && formData.injuries.length
        ? formData.injuries.includes("none")
          ? []
          : formData.injuries
        : [];

    const prefPayload = {
      goal: formData.fitnessGoal || null,
      activity_level: formData.fitnessLevel || null,
      workout_level: formData.fitnessLevel || null,
      budget: formData.gymBudget ? Number(formData.gymBudget) : null,
      workout_days: formData.workoutDays ? Number(formData.workoutDays) : null,
      workout_time: formData.workoutTime || null,
      session_minutes: formData.sessionMinutes
        ? Number(formData.sessionMinutes)
        : null,
      workout_place: formData.workoutPlace || null,
      preferred_style: formData.preferredStyle || null,
      injuries: injuriesPayload,
      food_budget: formData.foodBudget ? Number(formData.foodBudget) : null,
      dietary_restrictions: Array.isArray(formData.dietaryRestrictions)
        ? formData.dietaryRestrictions
        : [],
    };

    try {
      await api.put("/user/profile", profilePayload);

      await api.post("/user/preferences", prefPayload);

      await api.post("/user/preferred-amenities", {
        amenity_ids: formData.amenities,
      });

      await api.post("/user/preferred-equipments", {
        equipment_ids: formData.equipment,
      });

      await api.post("/user/onboarding/complete", {});

      if ((latitude == null || longitude == null) && formData.location) {
        alert(
          "Saved your address, but we could not determine latitude/longitude. You can update it later in profile."
        );
      }

      setShowSuccess(true);
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        (error?.response?.data
          ? JSON.stringify(error.response.data, null, 2)
          : null) ||
        error?.message ||
        "Server error saving onboarding";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRedirectToHome = () => navigate("/home");

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && currentQ.type.includes("input")) {
      if (!canContinue) return;
      if (isLastQuestion) handleSubmit();
      else nextQuestion();
    }
  };

  const handlePickLatLng = async ({ lat, lng }) => {
    const name = await reverseGeocode(lat, lng);
    setFormData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      location: name || prev.location,
    }));
    setMapCenter({ lat, lng });
    setMapKey((k) => k + 1);
  };

  const openMapPicker = () => {
    setMapSearch("");
    setMapSearchError("");
    setMapSearchLoading(false);

    const initial =
      formData.latitude != null && formData.longitude != null
        ? { lat: formData.latitude, lng: formData.longitude }
        : pasigCenter;

    setMapCenter(initial);
    setMapKey((k) => k + 1);
    setMapOpen(true);
  };

  const closeMapPicker = () => setMapOpen(false);

  const handleMapSearch = async () => {
    const q = mapSearch.trim();
    if (!q) return;

    setMapSearchLoading(true);
    setMapSearchError("");

    try {
      const res = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(
          q
        )}&limit=1&lon=${pasigCenter.lng}&lat=${pasigCenter.lat}`
      );
      const data = await res.json();
      const feature = data.features?.[0];
      const coords = feature?.geometry?.coordinates;
      const props = feature?.properties;

      if (!Array.isArray(coords) || coords.length !== 2) {
        setMapSearchError("No results found. Try a more specific place.");
        return;
      }

      const lat = coords[1];
      const lng = coords[0];

      const name =
        `${props?.name || ""}, ${props?.city || props?.county || ""}`.replace(
          /^, |, $/g,
          ""
        ) || null;

      setFormData((prev) => ({
        ...prev,
        latitude: lat,
        longitude: lng,
        location: name || prev.location,
      }));

      setMapCenter({ lat, lng });
      setMapKey((k) => k + 1);
    } catch (e) {
      console.error("Map search error:", e);
      setMapSearchError("Search failed. Please try again.");
    } finally {
      setMapSearchLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="success-screen">
        <div className="success-content">
          <div className="success-icon">✓</div>
          <h1>You're All Set!</h1>
          <p>Your personalized fitness plan is ready</p>
          <button className="success-btn" onClick={handleRedirectToHome}>
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding-minimal">
      <div className="progress-dots">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="top-controls">
        <button
          className="back-btn"
          onClick={prevQuestion}
          disabled={currentQuestion === 0 || submitting}
        >
          ←
        </button>
        <span className="question-counter">
          {currentQuestion + 1}/{questions.length}
        </span>
      </div>

      <div
        className={`question-container ${
          isTransitioning ? "transitioning" : ""
        }`}
      >
        <div className="question-content">
          <h1 className="question-title">{currentQ.question}</h1>

          {currentQ.type === "single-choice" && (
            <div className="choices-container">
              {currentQ.options.map((option) => {
                const IconComponent = option.icon;
                return (
                  <div
                    key={option.value}
                    className={`choice-card ${
                      formData[currentQ.id] === option.value ? "selected" : ""
                    }`}
                    onClick={() =>
                      !submitting &&
                      handleSingleChoice(currentQ.id, option.value)
                    }
                  >
                    {IconComponent && (
                      <div className="choice-icon">
                        <IconComponent size={28} strokeWidth={2.5} />
                      </div>
                    )}
                    <span className="choice-label">{option.label}</span>
                  </div>
                );
              })}
            </div>
          )}

          {currentQ.type === "multi-choice" && (
            <>
              <div className="choices-container multi">
                {currentQ.options.map((option) => {
                  const IconComponent = option.icon;
                  return (
                    <div
                      key={option.value}
                      className={`choice-card multi ${
                        formData[currentQ.id].includes(option.value)
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        !submitting && handleMultiChoice(currentQ.id, option.value)
                      }
                    >
                      {IconComponent && (
                        <div className="choice-icon">
                          <IconComponent size={32} strokeWidth={2.5} />
                        </div>
                      )}
                      <span className="choice-label">{option.label}</span>
                      <div className="checkbox">
                        {formData[currentQ.id].includes(option.value) && "✓"}
                      </div>
                    </div>
                  );
                })}
              </div>

              {!isLastQuestion ? (
                <button
                  className="continue-btn"
                  onClick={nextQuestion}
                  disabled={!canContinue}
                >
                  Continue
                </button>
              ) : (
                <button
                  className="continue-btn"
                  onClick={handleSubmit}
                  disabled={!canContinue}
                >
                  {submitting ? "Saving..." : "Finish"}
                </button>
              )}
            </>
          )}

          {currentQ.type === "input" && (
            <>
              {currentQ.id === "height" ? (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      gap: 10,
                      marginBottom: 14,
                    }}
                  >
                    <button
                      type="button"
                      className={`unit-toggle-btn ${heightUnit === "cm" ? "active" : ""}`}
                      onClick={() => switchHeightUnit("cm")}
                      disabled={submitting}
                    >
                      cm
                    </button>
                    <button
                      type="button"
                      className={`unit-toggle-btn ${heightUnit === "ftin" ? "active" : ""}`}
                      onClick={() => switchHeightUnit("ftin")}
                      disabled={submitting}
                    >
                      ft / in
                    </button>
                  </div>

                  {heightUnit === "cm" ? (
                    <div className="input-wrapper">
                      <input
                        type="number"
                        placeholder="170"
                        value={formData.height}
                        min={HEIGHT_MIN}
                        max={HEIGHT_MAX}
                        onChange={(e) => handleInputChange("height", e.target.value)}
                        onKeyPress={handleKeyPress}
                        autoFocus
                        className="input-field has-unit"
                        disabled={submitting}
                      />
                      <span className="input-unit">cm</span>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 12,
                      }}
                    >
                      <div className="input-wrapper">
                        <input
                          type="number"
                          placeholder="5"
                          value={formData.heightFeet}
                          min={0}
                          onChange={(e) => handleHeightFeetChange(e.target.value)}
                          onKeyPress={handleKeyPress}
                          autoFocus
                          className="input-field has-unit"
                          disabled={submitting}
                        />
                        <span className="input-unit">ft</span>
                      </div>

                      <div className="input-wrapper">
                        <input
                          type="number"
                          placeholder="7"
                          value={formData.heightInches}
                          min={0}
                          max={11}
                          onChange={(e) => handleHeightInchesChange(e.target.value)}
                          onKeyPress={handleKeyPress}
                          className="input-field has-unit"
                          disabled={submitting}
                        />
                        <span className="input-unit">in</span>
                      </div>
                    </div>
                  )}
                </>
              ) : currentQ.id === "weight" ? (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      gap: 10,
                      marginBottom: 14,
                    }}
                  >
                    <button
                      type="button"
                      className={`unit-toggle-btn ${weightUnit === "kg" ? "active" : ""}`}
                      onClick={() => switchWeightUnit("kg")}
                      disabled={submitting}
                    >
                      kg
                    </button>
                    <button
                      type="button"
                      className={`unit-toggle-btn ${weightUnit === "lb" ? "active" : ""}`}
                      onClick={() => switchWeightUnit("lb")}
                      disabled={submitting}
                    >
                      lb
                    </button>
                  </div>

                  <div className="input-wrapper">
                    <input
                      type="number"
                      placeholder={weightUnit === "kg" ? "70" : "154.3"}
                      value={weightUnit === "kg" ? formData.weight : formData.weightDisplay}
                      onChange={(e) =>
                        weightUnit === "kg"
                          ? handleInputChange("weight", e.target.value)
                          : handleWeightDisplayChange(e.target.value)
                      }
                      onKeyPress={handleKeyPress}
                      autoFocus
                      className="input-field has-unit"
                      disabled={submitting}
                    />
                    <span className="input-unit">{weightUnit}</span>
                  </div>
                </>
              ) : (
                <div className="input-wrapper">
                  <input
                    type={currentQ.inputType}
                    placeholder={currentQ.placeholder}
                    value={formData[currentQ.id]}
                    min={currentQ.min}
                    max={currentQ.max}
                    onChange={(e) => handleInputChange(currentQ.id, e.target.value)}
                    onKeyPress={handleKeyPress}
                    autoFocus
                    className={`input-field ${currentQ.unit ? "has-unit" : ""}`}
                    disabled={submitting}
                  />
                  {currentQ.unit && (
                    <span className="input-unit">{currentQ.unit}</span>
                  )}
                </div>
              )}

              {inputError && (
                <div style={{ marginTop: 10, fontSize: 13, opacity: 0.9 }}>
                  {inputError}
                </div>
              )}

              <button
                className="continue-btn"
                onClick={nextQuestion}
                disabled={!canContinue}
              >
                Continue
              </button>
            </>
          )}

          {currentQ.type === "input-autocomplete" && (
            <>
              <div className="location-input-container">
                <div className="input-wrapper" style={{ width: "100%" }}>
                  <input
                    type="text"
                    placeholder={currentQ.placeholder}
                    value={formData[currentQ.id]}
                    onChange={(e) =>
                      handleInputChange(currentQ.id, e.target.value)
                    }
                    onKeyPress={handleKeyPress}
                    autoFocus
                    className="input-field"
                    disabled={submitting}
                  />

                  {showSuggestions && locationSuggestions.length > 0 && (
                    <div className="location-suggestions">
                      {locationSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="location-suggestion"
                          onClick={() =>
                            !submitting && handleLocationSelect(suggestion)
                          }
                        >
                          {suggestion.display}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  className={`get-location-btn ${
                    isGettingLocation ? "loading" : ""
                  }`}
                  onClick={requestCurrentLocation}
                  disabled={isGettingLocation || submitting}
                  title="Use my current location"
                >
                  {isGettingLocation ? (
                    <Loader2 size={24} className="spin-icon" />
                  ) : (
                    <Navigation size={24} />
                  )}
                </button>

                <button
                  className="get-location-btn"
                  onClick={openMapPicker}
                  disabled={submitting}
                  title="Pick location on map"
                  style={{ marginLeft: 10 }}
                >
                  <MapPin size={24} />
                </button>
              </div>

              {!!formData.latitude && !!formData.longitude && (
                <div style={{ marginTop: 10, fontSize: 13, opacity: 0.9 }}>
                  Pin: {formData.latitude.toFixed(6)},{" "}
                  {formData.longitude.toFixed(6)}
                </div>
              )}

              <button
                className="continue-btn"
                onClick={nextQuestion}
                disabled={!canContinue}
              >
                Continue
              </button>
            </>
          )}
        </div>
      </div>

      {mapOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={closeMapPicker}
        >
          <div
            style={{
              width: "min(920px, 100%)",
              height: "min(680px, 100%)",
              background: "#111",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 20px 80px rgba(0,0,0,0.45)",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "12px 14px",
                display: "flex",
                gap: 10,
                alignItems: "center",
                justifyContent: "space-between",
                background: "rgba(255,255,255,0.06)",
              }}
            >
              <div style={{ fontWeight: 800 }}>Pick your location</div>

              <button
                onClick={closeMapPicker}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#fff",
                  borderRadius: 10,
                  padding: "6px 10px",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>

            <div
              style={{
                padding: 12,
                display: "flex",
                gap: 10,
                alignItems: "center",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              <div style={{ position: "relative", flex: 1 }}>
                <input
                  value={mapSearch}
                  onChange={(e) => setMapSearch(e.target.value)}
                  placeholder="Search a place (e.g., Ortigas, Pasig City Hall, Kapitolyo)"
                  style={{
                    width: "100%",
                    padding: "12px 12px 12px 40px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.16)",
                    background: "rgba(255,255,255,0.06)",
                    color: "#fff",
                    outline: "none",
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleMapSearch();
                  }}
                />
                <Search
                  size={18}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    opacity: 0.8,
                  }}
                />
              </div>

              <button
                onClick={handleMapSearch}
                disabled={mapSearchLoading || !mapSearch.trim()}
                style={{
                  background: "#fff",
                  border: "none",
                  borderRadius: 12,
                  padding: "10px 14px",
                  cursor: mapSearchLoading ? "not-allowed" : "pointer",
                  fontWeight: 800,
                  opacity: mapSearchLoading ? 0.7 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                {mapSearchLoading ? "Searching..." : "Search"}
              </button>
            </div>

            {mapSearchError && (
              <div style={{ padding: "0 12px 10px", fontSize: 13, opacity: 0.9 }}>
                {mapSearchError}
              </div>
            )}

            <div style={{ flex: 1 }}>
              <MapContainer
                key={mapKey}
                center={[mapCenter.lat, mapCenter.lng]}
                zoom={14}
                style={{ width: "100%", height: "100%" }}
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <ClickToPick
                  onPick={async (latlng) => {
                    await handlePickLatLng(latlng);
                  }}
                />

                <Marker position={[mapCenter.lat, mapCenter.lng]} />
                <FlyToLocation center={mapCenter} />
              </MapContainer>
            </div>

            <div
              style={{
                padding: 12,
                display: "flex",
                gap: 10,
                alignItems: "center",
                justifyContent: "space-between",
                background: "rgba(255,255,255,0.06)",
              }}
            >
              <div style={{ fontSize: 13, opacity: 0.9 }}>
                Tip: Search first, then click the map to drop the pin.
              </div>

              <button
                onClick={closeMapPicker}
                style={{
                  background: "#fff",
                  border: "none",
                  borderRadius: 12,
                  padding: "10px 14px",
                  cursor: "pointer",
                  fontWeight: 800,
                }}
              >
                Use this location
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}