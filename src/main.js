import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { AlienManager } from "./AlienManager.js"; // Import AlienManager class
import { AppCamera } from "./AppCamera.js"; // Import AppCamera
import { AudioControls } from "./AudioControls.js"; // Import AudioControls
import { DebugControls } from "./DebugControls.js"; // Import DebugControls
import { Lighting } from "./Lighting.js";
import { Player } from "./Player.js"; // Import Player class
import { Portals } from "./Portals.js"; // Import Portals class
import { SpawnTimer } from "./SpawnTimer.js"; // Import SpawnTimer
import { Station } from "./Station.js"; // Import Station class
import "./style.css";
import { UI } from "./UI.js"; // Import UI class

const titleOverlay = document.getElementById("title-overlay");
var requestedSpawn = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x4a2c5a); // Darker purple to match fog color

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
plane.position.y = 0; // Position it below the cube
scene.add(plane);

// Create custom edge fog system
const createEdgeFog = () => {
  const fogMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0.0 },
      fogColor: { value: new THREE.Color(0x4a2c5a) }, // Darker purple fog
      fogDensity: { value: 0.8 },
      edgeDistance: { value: 0.5 }, // Half unit from edge
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      varying vec2 vUv;
      
      void main() {
        vUv = uv;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 fogColor;
      uniform float fogDensity;
      uniform float edgeDistance;
      varying vec3 vWorldPosition;
      varying vec2 vUv;
      
      void main() {
        // Calculate distance from edge of the 30x30 plane
        float planeHalfSize = 15.0;
        float edgeStart = planeHalfSize - edgeDistance;
        
        // Distance from center
        float distFromCenter = length(vec2(vWorldPosition.x, vWorldPosition.z));
        float maxDist = max(abs(vWorldPosition.x), abs(vWorldPosition.z));
        
        // Calculate fog intensity based on distance from edge
        float fogIntensity = 0.0;
        if (maxDist > edgeStart) {
          fogIntensity = (maxDist - edgeStart) / edgeDistance;
          fogIntensity = smoothstep(0.0, 1.0, fogIntensity);
        }
        
        // Add edge softening to prevent hard plane boundaries
        float edgeSoften = 1.0;
        float distFromPlaneEdge = min(
          min(1.0 - abs(vUv.x - 0.5) * 2.0, 1.0 - abs(vUv.y - 0.5) * 2.0),
          1.0
        );
        edgeSoften = smoothstep(0.0, 0.1, distFromPlaneEdge);
        
        // Add some swirling motion
        float swirl = sin(time * 2.0 + vWorldPosition.x * 0.5) * 
                     cos(time * 1.5 + vWorldPosition.z * 0.3) * 0.3 + 0.7;
        
        // Add vertical gradient for more realistic fog
        float heightGradient = 1.0 - smoothstep(0.0, 10.0, vWorldPosition.y);
        
        float finalFogIntensity = fogIntensity * fogDensity * swirl * heightGradient * edgeSoften;
        
        // Ensure smooth blending with background
        if (finalFogIntensity < 0.01) discard;
        
        gl_FragColor = vec4(fogColor, finalFogIntensity);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  // Create fog walls around the edges
  const fogWalls = [];

  // Create vertical fog walls (tall rectangles around the perimeter)
  const wallHeight = 20;
  const wallThickness = 3;

  // North wall
  const northWall = new THREE.PlaneGeometry(30 + wallThickness * 2, wallHeight);
  const northFog = new THREE.Mesh(northWall, fogMaterial);
  northFog.position.set(0, wallHeight / 2, -15 - wallThickness / 2);
  northFog.renderOrder = -1; // Render behind other objects
  scene.add(northFog);
  fogWalls.push(northFog);

  // South wall
  const southWall = new THREE.PlaneGeometry(30 + wallThickness * 2, wallHeight);
  const southFog = new THREE.Mesh(southWall, fogMaterial);
  southFog.position.set(0, wallHeight / 2, 15 + wallThickness / 2);
  southFog.rotation.y = Math.PI;
  southFog.renderOrder = -1;
  scene.add(southFog);
  fogWalls.push(southFog);

  // East wall
  const eastWall = new THREE.PlaneGeometry(30 + wallThickness * 2, wallHeight);
  const eastFog = new THREE.Mesh(eastWall, fogMaterial);
  eastFog.position.set(15 + wallThickness / 2, wallHeight / 2, 0);
  eastFog.rotation.y = -Math.PI / 2;
  eastFog.renderOrder = -1;
  scene.add(eastFog);
  fogWalls.push(eastFog);

  // West wall
  const westWall = new THREE.PlaneGeometry(30 + wallThickness * 2, wallHeight);
  const westFog = new THREE.Mesh(westWall, fogMaterial);
  westFog.position.set(-15 - wallThickness / 2, wallHeight / 2, 0);
  westFog.rotation.y = Math.PI / 2;
  westFog.renderOrder = -1;
  scene.add(westFog);
  fogWalls.push(westFog);

  // Create horizontal fog planes at different heights for layered effect
  for (let i = 0; i < 3; i++) {
    const fogPlane = new THREE.PlaneGeometry(40, 40); // Larger planes for better coverage
    const fog = new THREE.Mesh(fogPlane, fogMaterial);
    fog.rotation.x = -Math.PI / 2;
    fog.position.y = 5 + i * 3;
    fog.renderOrder = -1;
    scene.add(fog);
    fogWalls.push(fog);
  }

  return { fogWalls, fogMaterial };
};

const { fogWalls, fogMaterial } = createEdgeFog();

// Create atmospheric fog particles for extra mystique
const createFogParticles = () => {
  const particleCount = 200;
  const positions = new Float32Array(particleCount * 3);
  const scales = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    // Position particles mostly around the edges
    const angle = Math.random() * Math.PI * 2;
    const distance = 12 + Math.random() * 8; // Between 12 and 20 units from center

    positions[i * 3] = Math.cos(angle) * distance;
    positions[i * 3 + 1] = Math.random() * 15; // Height between 0 and 15
    positions[i * 3 + 2] = Math.sin(angle) * distance;

    scales[i] = Math.random() * 2 + 0.5;
  }

  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3)
  );
  particleGeometry.setAttribute("scale", new THREE.BufferAttribute(scales, 1));

  const particleMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0.0 },
      fogColor: { value: new THREE.Color(0x6a4c93) },
    },
    vertexShader: `
      attribute float scale;
      uniform float time;
      varying float vOpacity;
      
      void main() {
        vec3 pos = position;
        
        // Add slow floating motion
        pos.y += sin(time * 0.5 + position.x * 0.1) * 2.0;
        pos.x += cos(time * 0.3 + position.z * 0.1) * 1.0;
        
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = scale * 50.0 * (1.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
        
        // Calculate opacity based on distance from center
        float distFromCenter = length(vec2(position.x, position.z));
        vOpacity = smoothstep(10.0, 18.0, distFromCenter) * 0.3;
      }
    `,
    fragmentShader: `
      uniform vec3 fogColor;
      varying float vOpacity;
      
      void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;
        
        float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
        gl_FragColor = vec4(fogColor, alpha * vOpacity);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  return { particles, particleMaterial };
};

const { particles, particleMaterial } = createFogParticles();

// Create portals
const portalsInstance = new Portals(scene);
const portals = portalsInstance.getPortals();

// Create spawn timer (10s delay)
const spawnTimer = new SpawnTimer(10);

// Create station
const station = new Station(scene);

// Create player
const player = new Player();

// Create UI
const ui = new UI(player);

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

// Create alien manager
const alienManager = new AlienManager(scene, player, ui, spawnTimer, () =>
  portalsInstance.spawnEnemyPortals(audioControls)
);

// Initialize Debug Controls
const debugControls = new DebugControls(
  portalsInstance,
  audioControls,
  camera,
  player,
  alienManager
);

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

// Set up target position clamping to keep camera on the plane
const planeSize = 15; // Half of the 30x30 plane size
controls.addEventListener("change", () => {
  // Clamp the target position to stay within the plane bounds
  controls.target.x = Math.max(
    -planeSize,
    Math.min(planeSize, controls.target.x)
  );
  controls.target.z = Math.max(
    -planeSize,
    Math.min(planeSize, controls.target.z)
  );
  // Keep target on the ground plane
  controls.target.y = 0;
});

// Initial render
renderer.render(scene, camera);

// Animation loop for smooth controls
let animationFrameId = null;
let lastTime = 0;
let lastCreditTime = 0; // Track time for credit earning
let lastAlienCount = 0; // Track last alien count for wave detection

const animate = () => {
  // Calculate deltaTime using performance.now for consistency
  const currentTime = performance.now() * 0.001;
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;

  // Credit earning system - add 1 credit every 2 seconds
  if (currentTime - lastCreditTime >= 2.0) {
    player.addCredits(1);
    lastCreditTime = currentTime;
  }

  // Update time uniform for shader animation
  planeMaterial.uniforms.time.value = currentTime;

  // Update fog animation
  fogMaterial.uniforms.time.value = currentTime;

  // Update particle animation
  particleMaterial.uniforms.time.value = currentTime;

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
          // ONLY set isOpening to 0 so portal shows normal effect
          portal.material.uniforms.isOpening.value = 0.0;

          // Spawn aliens when portal opening is complete (only once per portal activation)
          if (!portal.userData.aliensSpawned) {
            alienManager.spawnAliensAtPortal(portal.position.clone());
            portal.userData.aliensSpawned = true;
          }
        }
      }

      // Handle despawn animation
      if (portal.material.uniforms.isDespawning.value > 0.5) {
        const despawnTime = currentTime - portal.userData.despawnStartTime;
        portal.material.uniforms.despawnTime.value = despawnTime;
      }
    }
  });

  // Handle portal lifecycle (8-second total duration: 2s opening + 4s normal + 2s despawn)
  let hasActivePortals = false;
  portals.forEach((portal) => {
    if (portal.userData.active && !portal.userData.isDespawning) {
      hasActivePortals = true;
      const totalActiveTime = currentTime - portal.userData.activationTime;

      // Start despawn animation after 8 seconds total (2s opening + 4s normal + 2s despawn)
      if (totalActiveTime >= 8.0) {
        portal.userData.isDespawning = true;
        portal.userData.despawnStartTime = currentTime;
        portal.material.uniforms.isDespawning.value = 1.0;
        portal.material.uniforms.despawnTime.value = 0.0;
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
  station.update(deltaTime);

  // Update alien manager with proper deltaTime
  alienManager.update(deltaTime);

  // Update UI display
  ui.updateDisplay();

  // Update camera movement from keyboard input
  appCamera.updateMovement(controls);

  // Update controls
  controls.update();

  // Render
  renderer.render(scene, camera);

  // Call animate again on the next frame
  animationFrameId = window.requestAnimationFrame(animate);
};

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
    audioControls.resumeAudioContext();
    console.log("Click: scheduling first wave timer");
    spawnTimer.start(() => portalsInstance.spawnEnemyPortals(audioControls));
    if (!animationFrameId) animate();
  },
  { once: true }
); // Ensure this only runs once
