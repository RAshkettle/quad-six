import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { AppCamera } from "./AppCamera.js"; // Import AppCamera
import { AudioControls } from "./AudioControls.js"; // Import AudioControls
import { Lighting } from "./Lighting.js";
import { Portals } from "./Portals.js"; // Import Portals class
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

// Keyboard controls for camera movement
const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  ArrowUp: false,
  ArrowLeft: false,
  ArrowDown: false,
  ArrowRight: false,
  t: false,
};

const moveSpeed = 0.1;

// Keyboard event listeners
window.addEventListener("keydown", (event) => {
  if (keys.hasOwnProperty(event.key)) {
    keys[event.key] = true;
  }

  // Handle 't' key press for portal toggle (simple approach)
  if (event.key === "t") {
    togglePortalStatus();
  }
});

window.addEventListener("keyup", (event) => {
  if (keys.hasOwnProperty(event.key)) {
    keys[event.key] = false;
  }
});

// Function to update camera position based on keyboard input
function updateCameraMovement() {
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);

  // Get camera direction vectors
  camera.getWorldDirection(forward);
  right.crossVectors(forward, up).normalize();

  // Flatten forward vector to prevent flying
  forward.y = 0;
  forward.normalize();

  // Calculate movement
  const movement = new THREE.Vector3();

  // WASD movement
  if (keys.w || keys.ArrowUp)
    movement.add(forward.clone().multiplyScalar(moveSpeed));
  if (keys.s || keys.ArrowDown)
    movement.add(forward.clone().multiplyScalar(-moveSpeed));
  if (keys.a || keys.ArrowLeft)
    movement.add(right.clone().multiplyScalar(-moveSpeed));
  if (keys.d || keys.ArrowRight)
    movement.add(right.clone().multiplyScalar(moveSpeed));

  // Apply movement to camera and controls target
  camera.position.add(movement);
  controls.target.add(movement);
}

// Function to toggle portal active status (keep 3 active at any time)
function togglePortalStatus() {
  // Get currently active portals
  const activePortals = portals.filter((portal) => portal.userData.active);
  const currentTime = performance.now() * 0.001;

  if (activePortals.length === 3) {
    // If 3 are active, deactivate all and pick 3 new random ones
    portals.forEach((portal) => {
      portal.userData.active = false;
      portal.userData.isDespawning = false;
      portal.visible = false;
      portal.material.uniforms.isOpening.value = 0.0;
      portal.material.uniforms.isDespawning.value = 0.0;
    });

    // Pick 3 random portals to activate
    const shuffled = [...portals].sort(() => 0.5 - Math.random());
    for (let i = 0; i < 3; i++) {
      shuffled[i].userData.active = true;
      shuffled[i].visible = true;
      // Start opening animation
      shuffled[i].userData.openingStartTime = currentTime;
      shuffled[i].userData.activationTime = currentTime;
      shuffled[i].material.uniforms.isOpening.value = 1.0;
      shuffled[i].material.uniforms.openingTime.value = 0.0;
    }

    // Start idle sound when portals become active
    audioControls.startIdleSound();
  } else {
    // If less than 3 are active, activate random ones until we have 3
    const inactivePortals = portals.filter((portal) => !portal.userData.active);
    const needed = 3 - activePortals.length;

    const shuffledInactive = [...inactivePortals].sort(
      () => 0.5 - Math.random()
    );
    for (let i = 0; i < Math.min(needed, shuffledInactive.length); i++) {
      shuffledInactive[i].userData.active = true;
      shuffledInactive[i].visible = true;
      // Start opening animation
      shuffledInactive[i].userData.openingStartTime = currentTime;
      shuffledInactive[i].userData.activationTime = currentTime;
      shuffledInactive[i].material.uniforms.isOpening.value = 1.0;
      shuffledInactive[i].material.uniforms.openingTime.value = 0.0;
    }

    // Start idle sound when portals become active (if not already playing)
    audioControls.startIdleSound();
  }
}

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

  // Update camera movement from keyboard input
  updateCameraMovement();

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
