import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import "./style.css";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6a4c93); // Purple sky color

// Environmental lighting for dusk
// Lighter blue ambient light to simulate dusk sky
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // Bright white ambient light
scene.add(ambientLight);

// Directional light to simulate sky glow from the horizon
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3); // Bright white directional light
directionalLight.position.set(-10, 5, 10); // Coming from the horizon
directionalLight.castShadow = false; // Keep it subtle
scene.add(directionalLight);

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

// Create portal effect with converted Shadertoy shader
const portalGeometry = new THREE.PlaneGeometry(4, 4);
const portalMaterial = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0.0 },
    resolution: { value: new THREE.Vector2(512, 512) },
    openingTime: { value: 0.0 }, // Time since portal started opening
    isOpening: { value: 0.0 }, // 1.0 when opening animation is active
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
    uniform vec2 resolution;
    uniform float openingTime;
    uniform float isOpening;
    varying vec2 vUv;
    
    vec2 hash(vec2 p) {
      mat2 m = mat2(15.32, 83.43, 117.38, 289.59);
      return fract(sin(m * p) * 46783.289);
    }
    
    float voronoi(vec2 p) {
      vec2 g = floor(p);
      vec2 f = fract(p);
      
      float distanceFromPointToCloestFeaturePoint = 1.0;
      for(int y = -1; y <= 1; ++y) {
        for(int x = -1; x <= 1; ++x) {
          vec2 latticePoint = vec2(x, y);
          float h = distance(latticePoint + hash(g + latticePoint), f);
          distanceFromPointToCloestFeaturePoint = min(distanceFromPointToCloestFeaturePoint, h);
        }
      }
      
      return 1.0 - sin(distanceFromPointToCloestFeaturePoint);
    }
    
    float portalTexture(vec2 uv) {
      float t = voronoi(uv * 8.0 + vec2(time));
      t *= 1.0 - length(uv * 2.0);
      return t;
    }
    
    float fbm(vec2 uv) {
      float sum = 0.0;
      float amp = 1.0;
      
      for(int i = 0; i < 4; ++i) {
        sum += portalTexture(uv) * amp;
        uv += uv;
        amp *= 0.8;
      }
      
      return sum;
    }
    
    void main() {
      // Convert UV to centered coordinates (-1 to 1)
      vec2 uv = (vUv * 2.0 - 1.0);
      
      // Calculate distance from center for perfect circle
      float distFromCenter = length(uv);
      
      // Create a perfect circular mask with smooth edges
      float circleMask = 1.0 - smoothstep(0.9, 1.0, distFromCenter);
      
      // Only calculate the effect inside the circle to avoid edge artifacts
      if (circleMask <= 0.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
        return;
      }
      
      // Portal opening animation
      if (isOpening > 0.5) {
        float openDuration = 2.0; // 2 second opening animation
        float progress = clamp(openingTime / openDuration, 0.0, 1.0);
        
        if (progress < 1.0) {
          // Phase 1: Bright center explosion (first 0.5 seconds)
          if (progress < 0.25) {
            float centerPhase = progress / 0.25;
            float brightness = (1.0 - centerPhase) * 10.0; // Very bright center
            float radius = centerPhase * 0.3; // Expanding bright core
            
            float centerDist = smoothstep(radius - 0.1, radius, distFromCenter);
            vec3 centerColor = vec3(0.4, 0.8, 1.0) * brightness; // Bright blue-white
            
            float alpha = (1.0 - centerDist) * circleMask * brightness * 0.3;
            gl_FragColor = vec4(centerColor, alpha);
            return;
          }
          
          // Phase 2: Explosion wave (0.25 - 0.75)
          else if (progress < 0.75) {
            float wavePhase = (progress - 0.25) / 0.5;
            float waveRadius = wavePhase * 1.2; // Wave expands outward
            
            // Create explosion wave ring
            float waveDist = abs(distFromCenter - waveRadius);
            float waveIntensity = 1.0 - smoothstep(0.0, 0.2, waveDist);
            waveIntensity *= (1.0 - wavePhase); // Fade as it expands
            
            // Bright explosion color
            vec3 explosionColor = vec3(0.1, 0.6, 1.0) * waveIntensity * 5.0;
            
            float alpha = waveIntensity * circleMask;
            gl_FragColor = vec4(explosionColor, alpha);
            return;
          }
          
          // Phase 3: Portal formation (0.75 - 1.0)
          else {
            float portalPhase = (progress - 0.75) / 0.25;
            
            // Start introducing the portal effect
            float t = pow(fbm(uv * 0.3), 2.0) * portalPhase;
            t *= 1.5;
            
            // Mix explosion remnants with portal
            float explosionRemnant = (1.0 - portalPhase) * 0.5;
            vec3 explosionColor = vec3(0.1, 0.4, 1.0) * explosionRemnant;
            vec3 portalColor = vec3(t * 2.0, t * 4.0, t * 8.0);
            
            vec3 finalColor = mix(explosionColor, portalColor, portalPhase);
            float alpha = (t + explosionRemnant) * circleMask;
            
            gl_FragColor = vec4(finalColor, alpha);
            return;
          }
        }
      }
      
      // Normal portal effect (when not opening or after opening is complete)
      float t = pow(fbm(uv * 0.3), 2.0);
      t *= 1.5;
      
      float alpha = t * circleMask;
      vec3 color = vec3(t * 2.0, t * 4.0, t * 8.0);
      gl_FragColor = vec4(color, alpha);
    }
  `,
  transparent: true,
  side: THREE.DoubleSide,
});

// Create 6 portals evenly spaced along the far edge of the plane
const portals = [];
const planeWidth = 30;
const portalCount = 6;
const portalSpacing = planeWidth / (portalCount + 1); // Space them evenly with gaps at edges
const farEdgeZ = -14.5; // Half unit in from the far edge (-15)

for (let i = 0; i < portalCount; i++) {
  // Create a unique material for each portal to have independent opening animations
  const portalMaterialInstance = portalMaterial.clone();
  const portal = new THREE.Mesh(portalGeometry, portalMaterialInstance);

  // Position from left to right: -12 to +12 (evenly spaced)
  const xPosition = -planeWidth / 2 + portalSpacing * (i + 1);
  portal.position.set(xPosition, 0, farEdgeZ); // Y = 0 to sit on ground plane at Y = -2
  portal.userData = {
    active: false,
    index: i,
    openingStartTime: 0, // When the opening animation started
    activationTime: 0, // When the portal became active (for 8-second lifecycle)
  };
  portal.visible = false; // Start all portals as invisible
  portals.push(portal);
  scene.add(portal);
}

// Function to toggle portal active status (keep 3 active at any time)
function togglePortalStatus() {
  console.log("Toggle function called!");

  // Get currently active portals
  const activePortals = portals.filter((portal) => portal.userData.active);
  console.log("Currently active portals:", activePortals.length);

  const currentTime = performance.now() * 0.001;

  if (activePortals.length === 3) {
    // If 3 are active, deactivate all and pick 3 new random ones
    portals.forEach((portal) => {
      portal.userData.active = false;
      portal.visible = false;
      portal.material.uniforms.isOpening.value = 0.0;
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
    startIdleSound();
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
    startIdleSound();
  }

  console.log(
    "Active portals:",
    portals.filter((p) => p.userData.active).map((p) => p.userData.index)
  );
}

// All portals start inactive - use 't' key to activate 3 random ones

// Sizes
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

// Camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height);
camera.position.z = 3;
scene.add(camera);

// Audio system for portal sounds
const audioLoader = new THREE.AudioLoader();
const listener = new THREE.AudioListener();
camera.add(listener);

// Load portal idle sound
const portalIdleSound = new THREE.Audio(listener);
let isIdleSoundPlaying = false;

audioLoader.load("public/portalIdle.mp3", function (buffer) {
  portalIdleSound.setBuffer(buffer);
  portalIdleSound.setLoop(true);
  portalIdleSound.setVolume(0.5);
});

// Function to start idle sound if not already playing
function startIdleSound() {
  if (!isIdleSoundPlaying && portalIdleSound.buffer) {
    portalIdleSound.play();
    isIdleSoundPlaying = true;
    console.log("Portal idle sound started");
  }
}

// Function to stop idle sound
function stopIdleSound() {
  if (isIdleSoundPlaying) {
    portalIdleSound.stop();
    isIdleSoundPlaying = false;
    console.log("Portal idle sound stopped");
  }
}

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
  console.log("Key pressed:", event.key);

  if (keys.hasOwnProperty(event.key)) {
    keys[event.key] = true;
  }

  // Handle 't' key press for portal toggle (simple approach)
  if (event.key === "t") {
    console.log("T key detected!");
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

renderer.render(scene, camera);

// Animation loop for smooth controls
const animate = () => {
  // Update time uniform for shader animation
  const currentTime = performance.now() * 0.001;
  planeMaterial.uniforms.time.value = currentTime;

  // Update time and opening animation for visible/active portals
  portals.forEach((portal) => {
    if (portal.visible && portal.userData.active) {
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
    }
  });

  // Handle portal lifecycle (8-second duration)
  let hasActivePortals = false;
  portals.forEach((portal) => {
    if (portal.userData.active) {
      hasActivePortals = true;
      const activeTime = currentTime - portal.userData.activationTime;

      // Deactivate portal after 8 seconds
      if (activeTime >= 8.0) {
        portal.userData.active = false;
        portal.visible = false;
        portal.material.uniforms.isOpening.value = 0.0;
        console.log(
          `Portal ${portal.userData.index} deactivated after 8 seconds`
        );
      }
    }
  });

  // Stop idle sound if no portals are active
  if (!hasActivePortals && isIdleSoundPlaying) {
    stopIdleSound();
  }

  // Update camera movement from keyboard input
  updateCameraMovement();

  // Update controls
  controls.update();

  // Render
  renderer.render(scene, camera);

  // Call animate again on the next frame
  window.requestAnimationFrame(animate);
};

animate();

// Handle window resize
window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
