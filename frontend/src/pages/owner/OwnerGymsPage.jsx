// src/pages/owner/OwnerGymsPage.jsx
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { gsap } from "gsap";

import "./OwnerGymsPage.scss";
import GymCarousel from "./GymCarousel";

export default function OwnerGymsPage() {
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

  const [isCarouselOpen, setIsCarouselOpen] = useState(false);

  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return;

    // ---- Three init ----
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
    renderer.setClearColor("#070707", 1.0); // deep black background
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;

    mountEl.appendChild(renderer.domElement);

    // ---- Lights (warm) ----
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

    // ---- Plane ----
    const geometry = new THREE.PlaneGeometry(400, 400, 70, 70);

    geometry.vertices.forEach((v) => {
      v.x += (Math.random() - 0.5) * 4;
      v.y += (Math.random() - 0.5) * 4;
      v.z += (Math.random() - 0.5) * 4;

      v.dx = Math.random() - 0.5;
      v.dy = Math.random() - 0.5;
      v.randomDelay = Math.random() * 5;
    });

    // ---- Gradient palette (top: amber/orange, bottom: near-black) ----
    const TOP = { r: 255, g: 168, b: 60 };   // amber
    const MID = { r: 255, g: 106, b: 0 };    // deep orange
const BOT = { r: 0, g: 0, b: 0 };
    const clamp01 = (n) => Math.max(0, Math.min(1, n));
    const lerp = (a, b, t) => a + (b - a) * t;

    // PlaneGeometry height is 400, centered at 0 => y range ~ [-200..200]
    const yMin = -200;
    const yMax = 200;

    const colorAtT = (t) => {
      // 0..1 where 0 = bottom, 1 = top
      // use 2-stage lerp: BOT->MID->TOP for richer tones
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

    for (let i = 0; i < geometry.faces.length; i++) {
      const face = geometry.faces[i];
      const cy = faceCenterY(face);

      // push the bright part upward like your reference image
      // (so most brightness sits near the top)
      const tLinear = (cy - yMin) / (yMax - yMin); // 0..1
const t = clamp01(Math.pow(tLinear, 2.6));
      const c = colorAtT(t);
      const css = `rgb(${c.r},${c.g},${c.b})`;

      face.color.setStyle(css);

      // store baseColor so raycast "relax" returns to this gradient
      face.baseColor = { ...c };
      face.__t = t;
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

    // move the plane upward a bit so you get the "top bright, bottom dark" feeling
    plane.position.y = 40;

    // tilt slightly so top feels like it’s “hanging”
    plane.rotation.x = -0.12;

    scene.add(plane);
function createStars(amount, yDistance, color = "#ff8c1a") {
  const starGeometry = new THREE.Geometry();

  const starMaterial = new THREE.PointsMaterial({
    color,
    opacity: 0.7,           // brighter
    transparent: true,
    size: 2.2,              // bigger stars
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

    // ---- Render loop ----
    const renderLoop = () => {
      rafRef.current = requestAnimationFrame(renderLoop);

      timerRef.current += 0.01;
      const t = timerRef.current;

      const verts = plane.geometry.vertices;
      for (let i = 0; i < verts.length; i++) {
        verts[i].x -= (Math.sin(t + verts[i].randomDelay) / 40) * verts[i].dx;
        verts[i].y += (Math.sin(t + verts[i].randomDelay) / 40) * verts[i].dy;
      }

      // Raycast (hover glow but still relax back to gradient)
      const raycaster = raycasterRef.current;
      const normalizedMouse = mouseRef.current;

      raycaster.setFromCamera(normalizedMouse, camera);
      const intersects = raycaster.intersectObjects([plane]);

      if (intersects.length > 0) {
        const faceBaseColor = intersects[0].face.baseColor;

        plane.geometry.faces.forEach((face) => {
          // ease back to base gradient per face
          face.color.r *= 255;
          face.color.g *= 255;
          face.color.b *= 255;

          face.color.r += (faceBaseColor.r - face.color.r) * 0.02;
          face.color.g += (faceBaseColor.g - face.color.g) * 0.02;
          face.color.b += (faceBaseColor.b - face.color.b) * 0.02;

          const rInt = Math.floor(face.color.r);
          const gInt = Math.floor(face.color.g);
          const bInt = Math.floor(face.color.b);

          face.color.setStyle(`rgb(${rInt},${gInt},${bInt})`);
        });

        plane.geometry.colorsNeedUpdate = true;

        // hover highlight (bright amber/orange)
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

    // ---- Events ----
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

    // ---- Cleanup ----
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
      } catch {
        // ignore
      }
    };
  }, []);

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
    tl.call(() => setIsCarouselOpen(true), [], "<");
  };

  const handleResetCamera = () => {
    setIsCarouselOpen(false);

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

  return (
    <div className="star-intro-root">
      <div className="three-mount" ref={mountRef} />

      <div className="x-mark" ref={xMarkRef} onClick={handleResetCamera}>
        <div className="container">
          <div className="left" />
          <div className="right" />
        </div>
      </div>

      <div className="intro-container" ref={introRef}>
        <h2 className="fancy-text">Exersearch</h2>
        <h1>
          MANAGE YOUR GYMS <br />
          AND KEEP EVERYTHING ORGANIZED
        </h1>

        <div className="button shift-camera-button" onClick={handleShiftCamera}>
          <div className="border">
            <div className="left-plane" />
            <div className="right-plane" />
          </div>
          <div className="text">View All Gyms</div>
        </div>
      </div>

      <GymCarousel visible={isCarouselOpen} />
    </div>
  );
}