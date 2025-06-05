import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { AppCamera } from "./AppCamera.js"; // Import AppCamera
import { AudioControls } from "./AudioControls.js"; // Import AudioControls
import { DebugControls } from "./DebugControls.js"; // Import DebugControls
import { Lighting } from "./Lighting.js";
import { Portals } from "./Portals.js"; // Import Portals class
import { Station } from "./Station.js"; // Import Station class
import "./style.css";

const titleOverlay = document.getElementById("title-overlay");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6a4c93); // Purple sky color

// Setup lighting
const lighting = new Lighting(scene);

// Create a ground plane with hexagonal shader
const planeGeometry = new THREE.PlaneGeometry(30, 30);

// Custom shader material for hexagonal tiling with pulsing purple light
const planeMaterial = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0.0 },
    scale: { value: 80.0 },
    baseColor: { value: new THREE.Color(0x404040) },
    hexColor: { value: new THREE.Color(0x8a4e8a) },
    glowColor: { value: new THREE.Color(0xaa4eaa) },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform float scale;
    uniform vec3 baseColor;
    uniform vec3 hexColor;
    uniform vec3 glowColor;
    varying vec2 vUv;
    
    // Proper hexagonal distance function
    float hexDistance(vec2 p) {
      p = abs(p);
      float c = dot(p, normalize(vec2(1.0, 1.732)));
      c = max(c, p.x);
      return c;
    }
    
    // Convert to hexagonal grid coordinates
    vec2 hexGrid(vec2 p) {
      vec2 q = vec2(p.x * 2.0/3.0, (-p.x/3.0) + p.y * sqrt(3.0)/3.0);
      vec2 pii = floor(q + 0.5);
      vec2 pif = q - pii;
      return vec2(pii.x + pii.y/2.0, pii.y * 3.0/4.0);
    }
    
    void main() {
      vec2 uv = (vUv - 0.5) * scale;
      
      // Transform to hexagonal coordinates
      vec2 r = vec2(1.0, sqrt(3.0));
      vec2 h = r * 0.5;
      
      // Get the hexagonal cell
      vec2 a = mod(uv, r) - h;
      vec2 b = mod(uv - h, r) - h;
      vec2 gv = dot(a, a) < dot(b, b) ? a : b;
      
      // Calculate distance to hexagon edge
      float dist = hexDistance(gv);
      
      // Create thin hexagonal outline
      float hexLine = smoothstep(0.47, 0.5, dist) - smoothstep(0.5, 0.53, dist);
      
      // Pulsing animation for the glow
      float pulse = (sin(time * 2.0) + sin(time * 3.5)) * 0.25 + 0.5;
      float hexPulse = sin(time * 4.0 + length(uv) * 0.5) * 0.5 + 0.5;
      
      // Base color
      vec3 color = baseColor;
      
      // Add hexagon outline with glow
      float glowIntensity = hexPulse * pulse * 0.8 + 0.2;
      vec3 hexGlow = mix(hexColor, glowColor, glowIntensity);
      color = mix(color, hexGlow, hexLine);
      
      // Add subtle inner glow to make hexagons more visible
      float innerGlow = (1.0 - smoothstep(0.2, 0.5, dist)) * 0.1 * pulse;
      color += glowColor * innerGlow;
      
      gl_FragColor = vec4(color, 1.0);
    }
  `,
  side: THREE.DoubleSide,
});

const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2; // Rotate 90 degrees to make it horizontal
plane.position.y = -2; // Position it below the cube
scene.add(plane);

// Create portals
const portalsInstance = new Portals(scene);
const portals = portalsInstance.getPortals();

// Create station
const station = new Station(scene);

// Sizes
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

// Camera
// const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height);
// camera.position.z = 3;
// scene.add(camera);
const appCamera = new AppCamera(sizes, scene);
const camera = appCamera.self; // Keep a direct reference for convenience if needed, or use appCamera.self everywhere

// Initialize AudioControls
const audioControls = new AudioControls(camera);

// Initialize Debug Controls
const debugControls = new DebugControls(portalsInstance, audioControls, camera);

// Canvas
const canvas = document.querySelector("#webgl");

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Add OrbitControls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Clamp the controls so camera cannot go below the ground plane
controls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent going below horizontal (with small buffer)
controls.minDistance = 1; // Minimum zoom distance
controls.maxDistance = 50; // Maximum zoom distance

// Initial render
renderer.render(scene, camera);

// Animation loop for smooth controls
let animationFrameId = null;

const animate = () => {
  // Update time uniform for shader animation
  const currentTime = performance.now() * 0.001;
  planeMaterial.uniforms.time.value = currentTime;

  // Update time and animation for visible portals (active or despawning)
  portals.forEach((portal) => {
    if (portal.visible) {
      portal.material.uniforms.time.value = currentTime;

      // Handle opening animation
      if (portal.material.uniforms.isOpening.value > 0.5) {
        const openingTime = currentTime - portal.userData.openingStartTime;
        portal.material.uniforms.openingTime.value = openingTime;

        // Check if opening animation is complete (2 seconds duration)
        if (openingTime >= 2.0) {
          portal.material.uniforms.isOpening.value = 0.0;
          portal.material.uniforms.openingTime.value = 0.0;
        }
      }

      // Handle despawn animation
      if (portal.material.uniforms.isDespawning.value > 0.5) {
        const despawnTime = currentTime - portal.userData.despawnStartTime;
        portal.material.uniforms.despawnTime.value = despawnTime;
      }
    }
  });

  // Handle portal lifecycle (8-second duration)
  let hasActivePortals = false;
  portals.forEach((portal) => {
    if (portal.userData.active && !portal.userData.isDespawning) {
      hasActivePortals = true;
      const activeTime = currentTime - portal.userData.activationTime;

      // Start despawn animation after 8 seconds
      if (activeTime >= 8.0) {
        portal.userData.isDespawning = true;
        portal.userData.despawnStartTime = currentTime;
        portal.material.uniforms.isDespawning.value = 1.0;
        portal.material.uniforms.despawnTime.value = 0.0;
        portal.material.uniforms.isOpening.value = 0.0; // Stop opening animation if still running
      }
    }

    // Handle despawn animation
    if (portal.userData.isDespawning) {
      const despawnTime = currentTime - portal.userData.despawnStartTime;
      portal.material.uniforms.despawnTime.value = despawnTime;

      // Complete despawn after 2 seconds
      if (despawnTime >= 2.0) {
        portal.userData.active = false;
        portal.userData.isDespawning = false;
        portal.visible = false;
        portal.material.uniforms.isDespawning.value = 0.0;
        portal.material.uniforms.despawnTime.value = 0.0;
      }
    }
  });

  // Stop idle sound if no portals are active
  if (!hasActivePortals && audioControls.IsIdleSoundPlaying) {
    audioControls.stopIdleSound();
  }

  // Update station
  station.update(0.016); // Assuming ~60fps for deltaTime

  // Update camera movement from keyboard input
  appCamera.updateMovement(controls);

  // Update debug controls to reflect camera position changes
  debugControls.updateCameraControllers();

  // Update controls
  controls.update();

  // Render
  renderer.render(scene, camera);

  // Call animate again on the next frame
  animationFrameId = window.requestAnimationFrame(animate);
};

// animate(); // Don't start animation loop immediately

// Handle window resize
window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  // camera.aspect = sizes.width / sizes.height;
  // camera.updateProjectionMatrix();
  appCamera.resize(sizes.width, sizes.height);

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Start scene after user interaction
titleOverlay.addEventListener(
  "click",
  () => {
    titleOverlay.classList.add("hidden");
    audioControls.resumeAudioContext(); // Resume audio context on user gesture
    if (!animationFrameId) {
      // Start animation loop if not already started
      animate();
    }
  },
  { once: true }
); // Ensure this only runs once
