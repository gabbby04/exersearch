// src/pages/admin/AdminPasigGymsMap.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { api } from "../../utils/apiClient";

const MAIN = "#d23f0b";
const MATCH_GREEN = "#22c55e";
const DB_ONLY_ORANGE = "#ff9f1a";
const APP_BLUE = "#3b82f6";
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

const MATCH_RADIUS_METERS = 180;
const NAME_SIM_THRESHOLD = 0.35;

async function fetchPasigBoundaryGeoJSON() {
  const q = encodeURIComponent("Pasig City, National Capital Region, Philippines");
  const url =
    `https://nominatim.openstreetmap.org/search?` +
    `q=${q}&format=geojson&polygon_geojson=1&limit=1`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("Failed to fetch Pasig boundary.");
  const geo = await res.json();
  if (!geo?.features?.length) throw new Error("No boundary found.");
  return geo.features[0];
}

function flattenCoords(geometry) {
  const out = [];
  if (!geometry) return out;

  const { type, coordinates } = geometry;
  if (type === "Polygon") {
    for (const ring of coordinates) {
      for (const pt of ring) out.push(pt);
    }
  } else if (type === "MultiPolygon") {
    for (const poly of coordinates) {
      for (const ring of poly) {
        for (const pt of ring) out.push(pt);
      }
    }
  }

  return out;
}

function getBboxFromFeature(feature) {
  if (Array.isArray(feature?.bbox) && feature.bbox.length === 4) {
    const [west, south, east, north] = feature.bbox;
    return { west, south, east, north };
  }

  const coords = flattenCoords(feature.geometry);
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;

  for (const [lng, lat] of coords) {
    if (lng < west) west = lng;
    if (lat < south) south = lat;
    if (lng > east) east = lng;
    if (lat > north) north = lat;
  }

  return { west, south, east, north };
}

function buildOutsideMaskFeature(pasigFeature) {
  const worldRing = [
    [-180, -90],
    [180, -90],
    [180, 90],
    [-180, 90],
    [-180, -90],
  ];

  const geom = pasigFeature.geometry;
  const holes =
    geom.type === "Polygon"
      ? [geom.coordinates[0]]
      : geom.type === "MultiPolygon"
      ? geom.coordinates.map((p) => p[0])
      : [];

  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [worldRing, ...holes],
    },
  };
}

function pointInRing(point, ring) {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

function pointInPolygon(point, geometry) {
  if (!geometry) return false;

  if (geometry.type === "Polygon") {
    return pointInRing(point, geometry.coordinates[0]);
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((p) => pointInRing(point, p[0]));
  }

  return false;
}

async function fetchGymsOverpass({ south, west, north, east }) {
  const query = `
[out:json][timeout:25];
(
  node["leisure"="fitness_centre"](${south},${west},${north},${east});
  way["leisure"="fitness_centre"](${south},${west},${north},${east});
  relation["leisure"="fitness_centre"](${south},${west},${north},${east});

  node["amenity"="fitness_centre"](${south},${west},${north},${east});
  way["amenity"="fitness_centre"](${south},${west},${north},${east});
  relation["amenity"="fitness_centre"](${south},${west},${north},${east});

  node["amenity"="gym"](${south},${west},${north},${east});
  way["amenity"="gym"](${south},${west},${north},${east});
  relation["amenity"="gym"](${south},${west},${north},${east});
);
out center tags;
`.trim();

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: query,
  });

  const text = await res.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) throw new Error("Failed to fetch gyms from Overpass.");

  const features = (data?.elements || [])
    .map((el) => {
      const lng = el.type === "node" ? el.lon : el.center?.lon;
      const lat = el.type === "node" ? el.lat : el.center?.lat;
      if (typeof lng !== "number" || typeof lat !== "number") return null;

      return {
        type: "Feature",
        properties: {
          osm_id: `${el.type}/${el.id}`,
          name: el.tags?.name || "Fitness Center",
          ...el.tags,
        },
        geometry: { type: "Point", coordinates: [lng, lat] },
      };
    })
    .filter(Boolean);

  return { type: "FeatureCollection", features };
}

async function fetchDbGymsInBbox(bbox) {
  const res = await api.get("/gyms/map", {
    params: {
      south: bbox.south,
      west: bbox.west,
      north: bbox.north,
      east: bbox.east,
    },
  });

  const json = res.data;
  const rows = json?.data || json?.rows || (Array.isArray(json) ? json : []);

  const features = (Array.isArray(rows) ? rows : [])
    .map((g) => {
      const lngRaw = g.longitude ?? g.lng ?? g.long;
      const latRaw = g.latitude ?? g.lat;

      const lng = parseFloat(lngRaw);
      const lat = parseFloat(latRaw);

      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;

      return {
        type: "Feature",
        properties: {
          gym_id: g.gym_id ?? g.id,
          name: g.name || "Gym",
          address: g.address || "",
        },
        geometry: { type: "Point", coordinates: [lng, lat] },
      };
    })
    .filter(Boolean);

  return { type: "FeatureCollection", features };
}

async function fetchOwnerAppsInBbox(bbox) {
  const res = await api.get("/owner-applications/map", {
    params: {
      south: bbox.south,
      west: bbox.west,
      north: bbox.north,
      east: bbox.east,
    },
  });

  const json = res.data;
  const rows = json?.data || (Array.isArray(json) ? json : []);

  const features = (Array.isArray(rows) ? rows : [])
    .map((a) => {
      const lng = parseFloat(a.longitude);
      const lat = parseFloat(a.latitude);

      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;

      return {
        type: "Feature",
        properties: {
          app_id: a.id,
          user_id: a.user_id,
          gym_name: a.gym_name || "Gym Application",
          address: a.address || "",
          status: a.status || "pending",
          created_at: a.created_at || null,
        },
        geometry: { type: "Point", coordinates: [lng, lat] },
      };
    })
    .filter(Boolean);

  return { type: "FeatureCollection", features };
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toRad(d) {
  return (d * Math.PI) / 180;
}

function haversineMeters([lng1, lat1], [lng2, lat2]) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function normName(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(gym|fitness|center|centre|inc|ltd|corp|co|the)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(s) {
  const n = normName(s);
  if (!n) return new Set();
  return new Set(n.split(" ").filter(Boolean));
}

function nameSimilarity(a, b) {
  const A = tokenSet(a);
  const B = tokenSet(b);

  if (!A.size || !B.size) return 0;

  let inter = 0;
  for (const t of A) {
    if (B.has(t)) inter++;
  }

  const union = A.size + B.size - inter;
  return union ? inter / union : 0;
}

function matchOsmToDb(osmFC, dbFC) {
  const db = dbFC.features || [];
  const usedDbIds = new Set();

  const osmMatched = (osmFC.features || []).map((f) => {
    let best = null;

    for (const d of db) {
      const dbId = d.properties?.gym_id;
      if (usedDbIds.has(dbId)) continue;

      const dist = haversineMeters(f.geometry.coordinates, d.geometry.coordinates);
      if (dist > MATCH_RADIUS_METERS) continue;

      const sim = nameSimilarity(f.properties?.name, d.properties?.name);
      const ok = sim >= NAME_SIM_THRESHOLD || dist <= 70;

      if (!ok) continue;
      if (!best || dist < best.dist) {
        best = { dbId, dist, sim };
      }
    }

    if (best) {
      usedDbIds.add(best.dbId);
      return {
        ...f,
        properties: {
          ...f.properties,
          in_db: true,
          matched_gym_id: best.dbId,
          match_dist_m: Math.round(best.dist),
        },
      };
    }

    return {
      ...f,
      properties: {
        ...f.properties,
        in_db: false,
      },
    };
  });

  const dbOnly = db.filter((d) => !usedDbIds.has(d.properties?.gym_id));

  return {
    osm: { type: "FeatureCollection", features: osmMatched },
    dbOnly: { type: "FeatureCollection", features: dbOnly },
    matchedCount: usedDbIds.size,
  };
}

export default function AdminPasigGymsMap() {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const popupRef = useRef(null);
  const navigate = useNavigate();

  const [status, setStatus] = useState("Loading Pasig boundary…");

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const pasigFeature = await fetchPasigBoundaryGeoJSON();
        if (cancelled) return;

        const bbox = getBboxFromFeature(pasigFeature);

        const map = new maplibregl.Map({
          container: containerRef.current,
          style: STYLE_URL,
          bounds: [
            [bbox.west, bbox.south],
            [bbox.east, bbox.north],
          ],
          fitBoundsOptions: { padding: 70, maxZoom: 14 },
        });

        mapRef.current = map;
        map.addControl(new maplibregl.NavigationControl(), "top-right");

        map.setMaxBounds([
          [bbox.west, bbox.south],
          [bbox.east, bbox.north],
        ]);

        map.dragRotate.disable();
        map.touchZoomRotate.disableRotation();

        map.on("load", async () => {
          if (cancelled) return;

          const mask = buildOutsideMaskFeature(pasigFeature);

          map.addSource("pasig-boundary", { type: "geojson", data: pasigFeature });
          map.addSource("pasig-mask", { type: "geojson", data: mask });

          map.addLayer({
            id: "mask-fill",
            type: "fill",
            source: "pasig-mask",
            paint: {
              "fill-color": MAIN,
              "fill-opacity": 0.22,
            },
          });

          map.addLayer({
            id: "pasig-outline",
            type: "line",
            source: "pasig-boundary",
            paint: {
              "line-color": MAIN,
              "line-width": 3,
            },
          });

          setStatus("Fetching OSM gyms + DB gyms + applications…");

          const [gymsFC, dbFC, appsFC] = await Promise.all([
            fetchGymsOverpass(bbox),
            fetchDbGymsInBbox(bbox),
            fetchOwnerAppsInBbox(bbox),
          ]);

          if (cancelled) return;

          const osmInside = {
            type: "FeatureCollection",
            features: gymsFC.features.filter((f) =>
              pointInPolygon(f.geometry.coordinates, pasigFeature.geometry)
            ),
          };

          const { osm, dbOnly, matchedCount } = matchOsmToDb(osmInside, dbFC);

          map.addSource("gyms-osm", { type: "geojson", data: osm });
          map.addSource("gyms-db-only", { type: "geojson", data: dbOnly });
          map.addSource("owner-apps", { type: "geojson", data: appsFC });

          map.addLayer({
            id: "gyms-osm-circles",
            type: "circle",
            source: "gyms-osm",
            paint: {
              "circle-radius": 7,
              "circle-color": [
                "case",
                ["==", ["get", "in_db"], true],
                MATCH_GREEN,
                MAIN,
              ],
              "circle-opacity": 0.95,
              "circle-stroke-width": 3,
              "circle-stroke-color": "#ffffff",
            },
          });

          map.addLayer({
            id: "gyms-db-only-circles",
            type: "circle",
            source: "gyms-db-only",
            paint: {
              "circle-radius": 7,
              "circle-color": DB_ONLY_ORANGE,
              "circle-opacity": 0.95,
              "circle-stroke-width": 3,
              "circle-stroke-color": "#ffffff",
            },
          });

          map.addLayer({
            id: "owner-apps-circles",
            type: "circle",
            source: "owner-apps",
            paint: {
              "circle-radius": 7,
              "circle-color": APP_BLUE,
              "circle-opacity": 0.95,
              "circle-stroke-width": 3,
              "circle-stroke-color": "#ffffff",
            },
          });

          function closePopup() {
            if (popupRef.current) {
              popupRef.current.remove();
              popupRef.current = null;
            }
          }

          function popupHtml(title, lines = [], action = null) {
            const items = lines
              .filter(Boolean)
              .map(
                (l) =>
                  `<div style="margin-top:6px;opacity:.92">${escapeHtml(l)}</div>`
              )
              .join("");

            const btn = action
              ? `<button
                    data-action="${escapeHtml(action.type)}"
                    style="
                      margin-top:10px;
                      width:100%;
                      padding:8px 10px;
                      border-radius:10px;
                      border:0;
                      font-weight:800;
                      cursor:pointer;
                      background:#111827;
                      color:#fff;
                    "
                  >${escapeHtml(action.label)}</button>`
              : "";

            return `
              <div style="min-width:220px">
                <div style="font-weight:900; font-size:14px; margin-bottom:2px;">
                  ${escapeHtml(title)}
                </div>
                ${items}
                ${btn}
              </div>
            `;
          }

          function attachPopupButtonHandler(extra = {}) {
            window.requestAnimationFrame(() => {
              const el = document.querySelector(".maplibregl-popup");
              if (!el) return;

              const btn = el.querySelector("button[data-action]");
              if (!btn) return;

              btn.addEventListener("click", (ev) => {
                ev.preventDefault();
                const type = btn.getAttribute("data-action");

                closePopup();

                if (type === "gym_details" && extra.gymId) {
                  navigate(`/admin/gyms/${extra.gymId}`);
                }

                if (type === "app_details" && extra.appId) {
                  navigate(`/admin/owner-applications/${extra.appId}`);
                }
              });
            });
          }

          map.on("click", "gyms-osm-circles", (e) => {
            const f = e.features?.[0];
            if (!f) return;

            closePopup();

            const [lng, lat] = f.geometry.coordinates;
            const name = f.properties?.name || "Fitness Center";
            const inDb = !!f.properties?.in_db;
            const dist = f.properties?.match_dist_m;
            const gymId = f.properties?.matched_gym_id;

            map.easeTo({
              center: [lng, lat],
              zoom: Math.max(map.getZoom(), 16),
              duration: 800,
            });

            const html = popupHtml(
              name,
              [
                inDb ? "✅ In database (matched)" : "❌ Not in database",
                inDb && dist != null ? `Match distance: ${dist}m` : "",
              ],
              inDb && gymId
                ? { type: "gym_details", label: "View full details" }
                : null
            );

            popupRef.current = new maplibregl.Popup({
              closeButton: true,
              closeOnClick: true,
            })
              .setLngLat([lng, lat])
              .setHTML(html)
              .addTo(map);

            if (inDb && gymId) {
              attachPopupButtonHandler({ gymId });
            }
          });

          map.on("click", "gyms-db-only-circles", (e) => {
            const f = e.features?.[0];
            if (!f) return;

            closePopup();

            const [lng, lat] = f.geometry.coordinates;
            const name = f.properties?.name || "Gym";
            const address = f.properties?.address || "";
            const gymId = f.properties?.gym_id;

            map.easeTo({
              center: [lng, lat],
              zoom: Math.max(map.getZoom(), 16),
              duration: 800,
            });

            const html = popupHtml(
              name,
              [
                address ? `Address: ${address}` : "",
                "🟧 In DB but not found/tagged as gym on OSM (or too far to match)",
              ],
              gymId ? { type: "gym_details", label: "View full details" } : null
            );

            popupRef.current = new maplibregl.Popup({
              closeButton: true,
              closeOnClick: true,
            })
              .setLngLat([lng, lat])
              .setHTML(html)
              .addTo(map);

            if (gymId) {
              attachPopupButtonHandler({ gymId });
            }
          });

          map.on("click", "owner-apps-circles", (e) => {
            const f = e.features?.[0];
            if (!f) return;

            closePopup();

            const [lng, lat] = f.geometry.coordinates;
            const gymName = f.properties?.gym_name || "Gym Application";
            const address = f.properties?.address || "";
            const statusVal = f.properties?.status || "pending";
            const appId = f.properties?.app_id;

            map.easeTo({
              center: [lng, lat],
              zoom: Math.max(map.getZoom(), 16),
              duration: 800,
            });

            const html = popupHtml(
              gymName,
              [
                `📄 Application #${appId ?? "-"}`,
                `Status: ${statusVal}`,
                address ? `Address: ${address}` : "",
              ],
              appId ? { type: "app_details", label: "View application" } : null
            );

            popupRef.current = new maplibregl.Popup({
              closeButton: true,
              closeOnClick: true,
            })
              .setLngLat([lng, lat])
              .setHTML(html)
              .addTo(map);

            if (appId) {
              attachPopupButtonHandler({ appId });
            }
          });

          map.on("mouseenter", "gyms-osm-circles", () => {
            map.getCanvas().style.cursor = "pointer";
          });

          map.on("mouseleave", "gyms-osm-circles", () => {
            map.getCanvas().style.cursor = "";
          });

          map.on("mouseenter", "gyms-db-only-circles", () => {
            map.getCanvas().style.cursor = "pointer";
          });

          map.on("mouseleave", "gyms-db-only-circles", () => {
            map.getCanvas().style.cursor = "";
          });

          map.on("mouseenter", "owner-apps-circles", () => {
            map.getCanvas().style.cursor = "pointer";
          });

          map.on("mouseleave", "owner-apps-circles", () => {
            map.getCanvas().style.cursor = "";
          });

          const allCoords = [
            ...(osm.features || []).map((f) => f.geometry.coordinates),
            ...(dbOnly.features || []).map((f) => f.geometry.coordinates),
            ...(appsFC.features || []).map((f) => f.geometry.coordinates),
          ];

          if (allCoords.length) {
            const b = new maplibregl.LngLatBounds();
            allCoords.forEach((c) => b.extend(c));
            map.fitBounds(b, { padding: 90, maxZoom: 14 });

            setStatus(
              `OSM inside Pasig: ${osmInside.features.length} • Matched: ${matchedCount} • DB-only: ${dbOnly.features.length} • Apps: ${appsFC.features.length}`
            );
          } else {
            setStatus("No gyms found inside Pasig (0).");
          }
        });
      } catch (err) {
        console.error(err);
        setStatus(
          `Error: ${
            err?.response?.data?.message ||
            err?.message ||
            "Request failed."
          }`
        );
      }
    }

    init();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
    };
  }, [navigate]);

  const Legend = () => (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: MATCH_GREEN,
            display: "inline-block",
          }}
        />
        <span>OSM gym + in DB (matched)</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: MAIN,
            display: "inline-block",
          }}
        />
        <span>OSM gym (not in DB)</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: DB_ONLY_ORANGE,
            display: "inline-block",
          }}
        />
        <span>DB gym (not tagged/found on OSM)</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: APP_BLUE,
            display: "inline-block",
          }}
        />
        <span>Owner application</span>
      </div>
    </div>
  );

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      <div
        style={{
          position: "absolute",
          left: 12,
          top: 12,
          padding: "10px 12px",
          borderRadius: 12,
          background: "rgba(0,0,0,0.55)",
          color: "#fff",
          fontSize: 13,
          maxWidth: 500,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Pasig Gyms Map</div>
        <div style={{ opacity: 0.9, marginBottom: 10 }}>{status}</div>
        <Legend />
      </div>
    </div>
  );
}