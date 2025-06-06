import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export class Alien {
  static nextId = 1;

  constructor(scene, position, player, alienManager) {
    this.scene = scene;
    this.id = Alien.nextId++;
    this.model = null;
    this.mixer = null;
    this.movingAction = null;
    this.deathAction = null;
    this.loader = new GLTFLoader();
    this.player = player;
    this.alienManager = alienManager;

    // Movement properties
    this.position = position.clone();
    this.targetPosition = new THREE.Vector3(0, 1.5, 14.5); // Station position - match Station.js
    this.walkSpeed = Math.random() + 1.0; // Random speed between 1.0 and 2.0 units per second
    this.isDying = false;
    this.direction = new THREE.Vector3();

    this.loadAlien();
  }

  loadAlien() {
    this.loader.load(
      "/slime.glb",
      (gltf) => {
        this.model = gltf.scene;

        // Set initial position
        this.model.position.copy(this.position);

        // Scale down if needed (adjust as necessary)
        this.model.scale.setScalar(20);

        // Keep original materials but ensure they receive shadows properly
        this.model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        // Add internal orange light source
        const lightColor = 0xff6600; // Orange color to match pustules
        const light = new THREE.PointLight(lightColor, 130.5, 8); // intensity 1.5, distance 8
        light.position.set(0, 1, 0); // Position slightly above center
        light.castShadow = true;
        light.shadow.mapSize.width = 512;
        light.shadow.mapSize.height = 512;

        // Add the light as a child of the model so it moves with the alien
        this.model.add(light);

        // Store reference to light for potential cleanup
        this.internalLight = light;

        // Setup animations
        if (gltf.animations && gltf.animations.length > 0) {
          this.mixer = new THREE.AnimationMixer(this.model);

          // Find the "moving" animation
          const movingAnimation = gltf.animations.find(
            (animation) => animation.name.toLowerCase() === "moving"
          );

          // Find the "death" animation
          const deathAnimation = gltf.animations.find(
            (animation) => animation.name.toLowerCase() === "death"
          );

          if (movingAnimation) {
            this.movingAction = this.mixer.clipAction(movingAnimation);
            this.movingAction.setLoop(THREE.LoopRepeat, Infinity);
            this.movingAction.clampWhenFinished = false;
            this.movingAction.setEffectiveWeight(1.0);
            this.movingAction.enabled = true;
            this.movingAction.paused = false;
            // Start the animation immediately
            this.movingAction.play();
          } else {
            // Fallback to first animation if no "moving" animation found
            if (gltf.animations.length > 0) {
              this.movingAction = this.mixer.clipAction(gltf.animations[0]);
              this.movingAction.setLoop(THREE.LoopRepeat, Infinity);
              this.movingAction.clampWhenFinished = false;
              this.movingAction.setEffectiveWeight(1.0);
              this.movingAction.enabled = true;
              this.movingAction.paused = false;
              this.movingAction.play();
            }
          }

          if (deathAnimation) {
            this.deathAction = this.mixer.clipAction(deathAnimation);
            this.deathAction.setLoop(THREE.LoopOnce);
            this.deathAction.clampWhenFinished = true;
            this.deathAction.enabled = false;
          }
        }

        // Add to scene
        this.scene.add(this.model);

        // Calculate direction to station immediately
        this.direction
          .subVectors(this.targetPosition, this.position)
          .normalize();
      },
      (progress) => {
        // Add this
      },
      (error) => {
        console.error(`Alien ${this.id}: Error loading alien:`, error); // Modified this
      }
    );
  }

  update(deltaTime) {
    // Update animation mixer if it exists
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }

    // Move toward target unless dying
    if (this.model && !this.isDying) {
      // Move toward target
      const movement = this.direction
        .clone()
        .multiplyScalar(this.walkSpeed * deltaTime);

      this.position.add(movement);
      this.model.position.copy(this.position);
      this.model.position.setY(0.0);

      // Check if reached target (within 2 units of station)
      const distanceToTarget = this.position.distanceTo(this.targetPosition);
      if (distanceToTarget < 2.0) {
        this.reachTarget();
      }
    }
  }

  reachTarget() {
    // Play death sound effect
    const boomSound = new Audio("/boom.mp3");
    boomSound.volume = 0.05;
    boomSound.play();

    // Create bright green acid explosion effect
    this.createAcidExplosion();

    this.isDying = true;

    // Play death animation if available
    if (this.deathAction) {
      // Stop moving animation
      if (this.movingAction) {
        this.movingAction.fadeOut(0.2);
      }

      // Start death animation
      this.deathAction.reset();
      this.deathAction.enabled = true;
      this.deathAction.fadeIn(0.2);
      this.deathAction.play();
    }

    // Apply 2 damage to player
    if (this.player) {
      const oldHealth = this.player.health;
      this.player.takeDamage(2);
    }

    // Destroy after 1 second (time for death animation)
    setTimeout(() => {
      this.destroy();
    }, 1000);
  }

  createAcidExplosion() {
    // Parameters for the acid explosion
    const particleCount = 200;
    const explosionSize = 2.5;
    const duration = 1000; // milliseconds

    // Create particle geometry
    const particles = new THREE.BufferGeometry();

    // Arrays to store particle attributes
    const positions = new Float32Array(particleCount * 3);
    const acidColors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const velocities = []; // Store velocities separately for animation

    // Create random particle positions and velocities
    for (let i = 0; i < particleCount; i++) {
      // Initial positions (slightly randomized around alien center)
      const x = (Math.random() - 0.5) * 0.5;
      const y = (Math.random() - 0.5) * 0.2; // Start near ground level
      const z = (Math.random() - 0.5) * 0.5;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Bright acid green with slight variations
      acidColors[i * 3] = 0.3 + Math.random() * 0.2; // R
      acidColors[i * 3 + 1] = 0.8 + Math.random() * 0.2; // G
      acidColors[i * 3 + 2] = 0.0; // B

      // Random particle sizes
      sizes[i] = 0.1 + Math.random() * 0.3;

      // Store particle velocity vector for animation
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 3.0,
        Math.random() * 5.0 + 2.0, // Stronger upward velocity for burst effect
        (Math.random() - 0.5) * 3.0
      );
      velocities.push(velocity);
    }

    // Add attributes to the geometry
    particles.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particles.setAttribute(
      "acidColor",
      new THREE.BufferAttribute(acidColors, 3)
    );
    particles.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    // Create a shader material for the particles
    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        duration: { value: duration / 1000 },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 acidColor;
        varying vec3 vColor;
        uniform float time;
        uniform float duration;

        void main() {
          vColor = acidColor;

          // Calculate fade based on time
          float fade = 1.0 - (time / duration);

          // Size increases then decreases
          float dynamicSize = size * (1.0 + 2.0 * time) * fade;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = dynamicSize * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;

        void main() {
          // Create circular particle
          float distanceToCenter = length(gl_PointCoord - vec2(0.5));
          if (distanceToCenter > 0.5) discard;

          // Add glow effect
          float glow = 0.5 * (1.0 - distanceToCenter * 2.0);
          vec3 finalColor = vColor + vec3(0.2, 0.5, 0.0) * glow;

          gl_FragColor = vec4(finalColor, 1.0 - distanceToCenter * 1.5);
        }
      `,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      vertexColors: true,
    });

    // Create the particle system
    const particleSystem = new THREE.Points(particles, particleMaterial);

    // Position at the alien's current position
    particleSystem.position.copy(this.position);
    // Slightly above the ground
    particleSystem.position.y = 0.0;

    this.scene.add(particleSystem);

    // Setup animation
    const startTime = performance.now();
    const posArray = particles.attributes.position.array;

    // Animation function for the acid particles
    const animateAcid = () => {
      const elapsedTime = performance.now() - startTime;
      const normalizedTime = elapsedTime / duration;

      if (normalizedTime < 1.0) {
        // Update particle positions based on velocities
        for (let i = 0; i < particleCount; i++) {
          // Apply gravity and update positions
          velocities[i].y -= 0.1; // Gravity effect

          posArray[i * 3] += velocities[i].x * 0.02;
          posArray[i * 3 + 1] += velocities[i].y * 0.02;
          posArray[i * 3 + 2] += velocities[i].z * 0.02;
        }

        // Update the shader time uniform
        particleMaterial.uniforms.time.value = normalizedTime;

        // Flag geometry for update
        particles.attributes.position.needsUpdate = true;

        requestAnimationFrame(animateAcid);
      } else {
        // Clean up when animation is complete
        this.scene.remove(particleSystem);
        particles.dispose();
        particleMaterial.dispose();
      }
    };

    // Start the animation
    animateAcid();
  }

  destroy() {
    if (this.model) {
      this.scene.remove(this.model);
      // Clear model reference so isActive() returns false
      this.model = null;
    }
    if (this.mixer) {
      this.mixer.stopAllAction();
    }
    // Clean up the internal light
    if (this.internalLight) {
      this.internalLight.dispose();
    }

    this.alienManager.notifyOfCreepDeath();
  }

  // Get the current position of the alien
  getPosition() {
    return this.position.clone();
  }

  // Check if the alien is still alive/active
  isActive() {
    return this.model;
  }
}
